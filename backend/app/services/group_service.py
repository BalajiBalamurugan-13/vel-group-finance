import logging
import re
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from supabase import Client

from app.core.business_week import get_business_week
from app.core.finance_calc import (
    get_effective_weekly_installment,
    load_overrides,
    set_group_override,
)
from app.schemas.group import (
    GroupCreate,
    GroupStatus,
    GroupStatusUpdate,
    GroupUpdate,
)
from app.services.dashboard_service import invalidate_dashboard_cache

logger = logging.getLogger(__name__)

# Valid business status transitions per docs/02_BUSINESS_RULES.md (BR-025 to BR-029)
VALID_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "Draft": {"Active", "Closed"},
    "Active": {"Completed", "Closed"},
    "Completed": {"Renewed", "Closed"},
    "Renewed": {"Completed", "Closed"},
    "Closed": set(),  # Terminal state: historical data preserved
}


class GroupService:
    """
    Service layer for Group Management.
    Enforces business logic and interacts with Supabase client.
    """

    def __init__(self, db: Client):
        self.db = db
        from app.core import finance_calc
        if not finance_calc._CACHE_INITIALIZED:
            load_overrides(self.db)

    def suggest_next_group_name(self, location: str) -> dict:
        """
        Suggests the next running group name for a given location.
        Per BR-002: Group Name = Location + Running Number (e.g. PTM 1, PTM 2).
        Calculates max existing integer N and returns N + 1.
        """
        trimmed_location = location.strip()
        if not trimmed_location:
            raise HTTPException(
                status_code=422,
                detail="Location is required to generate a group name.",
            )

        # Query all existing groups
        response = self.db.table("groups").select("group_name").execute()
        existing_groups = response.data or []

        # Match pattern: ^<location>\s+(\d+)$ (case-insensitive for location matching)
        pattern = re.compile(
            rf"^{re.escape(trimmed_location)}\s+(\d+)$", re.IGNORECASE
        )

        numbers: list[int] = []
        for g in existing_groups:
            name = g.get("group_name", "")
            match = pattern.match(name)
            if match:
                try:
                    numbers.append(int(match.group(1)))
                except ValueError:
                    continue

        next_number = max(numbers) + 1 if numbers else 1
        suggested_name = f"{trimmed_location} {next_number}"

        return {
            "suggested_name": suggested_name,
            "next_number": next_number,
        }

    def get_distinct_locations(self) -> list[str]:
        """
        Returns a sorted list of unique locations currently present in the groups table.
        Used to provide autocomplete suggestions when creating or updating groups.
        """
        try:
            response = self.db.table("groups").select("location").execute()
            rows = response.data or []
        except Exception as e:
            logger.error("Failed to query locations for autocomplete: %s", e)
            return []

        seen: set[str] = set()
        locations: list[str] = []
        for r in rows:
            loc = (r.get("location") or "").strip()
            if loc and loc.lower() not in seen:
                seen.add(loc.lower())
                locations.append(loc)
        return sorted(locations, key=lambda s: s.lower())

    def get_groups(
        self,
        status: Optional[GroupStatus] = None,
        location: Optional[str] = None,
        search: Optional[str] = None,
    ) -> list[dict]:
        """
        Get all groups with joined Scheme data and dynamic calculations.
        Supports filtering by status, location, and name search.
        """
        query = self.db.table("groups").select("*, scheme:schemes(*)")

        if status:
            query = query.eq("status", status.value)
        if location:
            query = query.ilike("location", f"%{location.strip()}%")
        if search:
            query = query.ilike("group_name", f"%{search.strip()}%")

        query = query.order("created_at", desc=False)
        response = query.execute()

        groups = response.data or []
        if not groups:
            return groups

        # High performance: bulk-fetch active member counts in 1 single query instead of N individual queries
        group_ids = [str(g["id"]) for g in groups if "id" in g and g["id"]]
        counts_map: dict[str, int] = {}
        if group_ids:
            try:
                m_res = (
                    self.db.table("members")
                    .select("group_id")
                    .in_("group_id", group_ids)
                    .eq("status", "Active")
                    .execute()
                )
                for row in m_res.data or []:
                    gid = str(row.get("group_id") or "")
                    counts_map[gid] = counts_map.get(gid, 0) + 1
            except Exception as e:
                logger.error("Failed to bulk query active members for groups: %s", e)

        for g in groups:
            gid = str(g.get("id") or "")
            self._enrich_dynamic_fields(g, member_count=counts_map.get(gid) if group_ids else None)

        return groups

    def get_group_by_id(self, group_id: UUID) -> dict:
        """
        Get a single group by ID with joined scheme and computed stats.
        """
        response = (
            self.db.table("groups")
            .select("*, scheme:schemes(*)")
            .eq("id", str(group_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Group not found")

        group = response.data[0]
        self._enrich_dynamic_fields(group)
        return group

    def create_group(self, data: GroupCreate) -> dict:
        """
        Create a new group in 'Draft' status.
        Enforces:
        - Scheme must exist and must be 'Active' (cannot create group with Inactive scheme).
        - Group name is auto-generated if omitted.
        - Group name must be unique (HTTP 409 on duplicate).
        """
        # 1. Validate Scheme exists and is Active
        scheme_response = (
            self.db.table("schemes")
            .select("*")
            .eq("id", str(data.scheme_id))
            .execute()
        )
        if not scheme_response.data:
            raise HTTPException(status_code=404, detail="Scheme not found")

        scheme = scheme_response.data[0]
        if scheme["status"] != "Active":
            raise HTTPException(
                status_code=400,
                detail="Cannot create a group using an inactive scheme. Only active schemes can be selected for new groups.",
            )

        # 2. Determine Group Name
        if data.group_name:
            group_name = data.group_name.strip()
        else:
            suggestion = self.suggest_next_group_name(data.location)
            group_name = suggestion["suggested_name"]

        # 3. Check Group Name Uniqueness
        existing = (
            self.db.table("groups")
            .select("id")
            .eq("group_name", group_name)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=409,
                detail=f"A group with the name '{group_name}' already exists.",
            )

        # 4. Insert New Group with requested status (Active by default, or Draft)
        owner_amt = Decimal(str(data.owner_investment_amount or "0.00"))
        desired_status = (
            data.status.value
            if isinstance(data.status, GroupStatus)
            else (data.status or GroupStatus.ACTIVE.value)
        )
        eff_installment = get_effective_weekly_installment(
            {"weekly_installment": data.weekly_installment}, scheme
        )
        insert_data = {
            "location": data.location,
            "scheme_id": str(data.scheme_id),
            "group_name": group_name,
            "start_date": data.start_date.isoformat() if data.start_date else None,
            "funding_source": data.funding_source or "Recycled Collections",
            "recycled_sub_type": data.recycled_sub_type or "Fully Recycled",
            "owner_investment_amount": float(owner_amt),
            "weekly_installment": float(eff_installment),
            "remarks": data.remarks,
            "status": desired_status,
        }

        try:
            response = self.db.table("groups").insert(insert_data).execute()
        except Exception as e:
            err_msg = str(e).lower()
            if "weekly_installment" in err_msg:
                insert_data.pop("weekly_installment", None)
            if "recycled_sub_type" in err_msg or "owner_investment_amount" in err_msg:
                insert_data.pop("recycled_sub_type", None)
                insert_data.pop("owner_investment_amount", None)
                if "funding_source" in err_msg:
                    insert_data.pop("funding_source", None)
                response = self.db.table("groups").insert(insert_data).execute()
            elif "funding_source" in err_msg:
                insert_data.pop("funding_source", None)
                response = self.db.table("groups").insert(insert_data).execute()
            elif "weekly_installment" in err_msg:
                response = self.db.table("groups").insert(insert_data).execute()
            else:
                raise

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create group")

        new_group = response.data[0]
        new_group["scheme"] = scheme
        if eff_installment:
            set_group_override(str(new_group["id"]), eff_installment, self.db)
        self._enrich_dynamic_fields(new_group)

        # 5. Automatically create investment entry if extra owner cash was introduced
        self._sync_group_investment(
            group_id=str(new_group["id"]),
            group_name=group_name,
            funding_source=data.funding_source,
            recycled_sub_type=data.recycled_sub_type,
            owner_investment_amount=owner_amt,
            start_date_val=data.start_date,
        )

        invalidate_dashboard_cache()
        return new_group

    def _sync_group_investment(
        self,
        group_id: str,
        group_name: str,
        funding_source: Optional[str],
        recycled_sub_type: Optional[str],
        owner_investment_amount: Optional[Decimal],
        start_date_val: Optional[date],
    ) -> None:
        """
        Synchronizes the linked investments record for a group.
        If funding_source == 'Recycled Collections' and recycled_sub_type == 'Recycled + Owner Investment'
        and owner_investment_amount > 0:
            Inserts or updates the investments record linked to group_id.
        Else:
            Removes any existing investment linked to this group_id if owner cash is 0 or removed.
        """
        owner_amt = Decimal(str(owner_investment_amount or "0.00"))
        fs = funding_source or "Recycled Collections"
        sub_type = recycled_sub_type or "Fully Recycled"

        try:
            existing = self.db.table("investments").select("id").eq("group_id", str(group_id)).execute()
            existing_data = existing.data if isinstance(getattr(existing, "data", None), list) else []
        except Exception:
            existing_data = []

        if fs == "Recycled Collections" and sub_type == "Recycled + Owner Investment" and owner_amt > Decimal("0.00"):
            inv_date = start_date_val or date.today()
            if get_business_week(inv_date) == 1 or inv_date <= date(2026, 8, 15):
                inv_type = "Initial"
            else:
                inv_type = "Additional"

            inv_payload = {
                "investment_type": inv_type,
                "amount": float(owner_amt),
                "investment_date": inv_date.isoformat(),
                "description": f"Owner cash added for group {group_name} (Recycled + Owner Investment)",
                "group_id": str(group_id),
            }

            try:
                if existing_data:
                    self.db.table("investments").update(inv_payload).eq("id", existing_data[0]["id"]).execute()
                else:
                    self.db.table("investments").insert(inv_payload).execute()
            except Exception as e:
                logger.warning("Could not sync investment record for group %s: %s", group_id, e)
        elif fs == "Additional Investment":
            # Additional Investment group: calculate net capital from active members and group scheme
            try:
                g_res = (
                    self.db.table("groups")
                    .select("scheme:schemes(loan_amount, note_cost), members(id, status)")
                    .eq("id", str(group_id))
                    .execute()
                )
                g_data = g_res.data[0] if (g_res and g_res.data) else {}
                scheme = g_data.get("scheme") or {}
                la = Decimal(str(scheme.get("loan_amount") or "10000.00"))
                nc = Decimal(str(scheme.get("note_cost") or "100.00"))
                net_given = la - nc
                mems = [m for m in (g_data.get("members") or []) if m.get("status") != "Closed"]
                amt = net_given * Decimal(len(mems))
            except Exception:
                amt = Decimal("0.00")

            if amt > Decimal("0.00"):
                inv_date = start_date_val or date.today()
                inv_payload = {
                    "investment_type": "Additional",
                    "amount": float(amt),
                    "investment_date": inv_date.isoformat(),
                    "description": f"Capital deployed for group {group_name} (Additional Investment)",
                    "group_id": str(group_id),
                }
                try:
                    if not existing_data:
                        self.db.table("investments").insert(inv_payload).execute()
                except Exception as e:
                    logger.warning("Could not sync investment record for additional group %s: %s", group_id, e)
        else:
            if existing_data:
                try:
                    self.db.table("investments").delete().eq("id", existing_data[0]["id"]).execute()
                except Exception as e:
                    logger.warning("Could not remove linked investment for group %s: %s", group_id, e)

    def _ensure_active_members_have_cycles(self, group_id: str, group: dict) -> None:
        """
        Self-healing check: If this group is Active, ensures every Active member
        has a loan cycle and loan transaction.
        """
        if group.get("status") != "Active":
            return

        scheme = group.get("scheme")
        if not scheme:
            return

        try:
            m_res = self.db.table("members").select("id, member_name").eq("group_id", str(group_id)).eq("status", "Active").execute()
            active_members = m_res.data or []
            if not active_members:
                return

            c_res = self.db.table("loan_cycles").select("member_id").eq("group_id", str(group_id)).execute()
            cycled_mids = {str(r["member_id"]) for r in (c_res.data or [])}

            loan_amount = Decimal(str(scheme["loan_amount"]))
            note_cost = Decimal(str(scheme.get("note_cost", "0.00")))
            cash_given = loan_amount - note_cost

            raw_start = group.get("start_date")
            start_d = date.fromisoformat(str(raw_start)[:10]) if raw_start else date.today()

            for m in active_members:
                mid = str(m["id"])
                if mid not in cycled_mids:
                    logger.info("Auto-healing missing loan cycle for member %s in group %s", mid, group_id)
                    c_insert = {
                        "member_id": mid,
                        "group_id": str(group_id),
                        "scheme_id": scheme["id"],
                        "cycle_number": 1,
                        "start_date": start_d.isoformat(),
                        "status": "Active",
                    }
                    c_res_new = self.db.table("loan_cycles").insert(c_insert).execute()
                    if c_res_new.data:
                        new_cycle_id = c_res_new.data[0]["id"]
                        tx_insert = {
                            "loan_cycle_id": new_cycle_id,
                            "member_id": mid,
                            "loan_amount": float(loan_amount),
                            "note_cost": float(note_cost),
                            "cash_given": float(cash_given),
                            "disbursement_date": start_d.isoformat(),
                        }
                        self.db.table("loan_transactions").insert(tx_insert).execute()
                        cycled_mids.add(mid)
        except Exception as e:
            logger.warning("Error during active members loan cycle reconciliation: %s", e)

    def update_group(self, group_id: UUID, data: GroupUpdate) -> dict:
        """
        Update group metadata (group_name, location, start_date, remarks).
        Per business rules, scheme_id is immutable.
        """
        # Ensure group exists
        current_group = self.get_group_by_id(group_id)

        update_dict = data.model_dump(exclude_unset=True)
        if not update_dict:
            return current_group

        # If group_name is being modified, verify uniqueness
        if "group_name" in update_dict and update_dict["group_name"] != current_group["group_name"]:
            new_name = update_dict["group_name"].strip()
            existing = (
                self.db.table("groups")
                .select("id")
                .eq("group_name", new_name)
                .execute()
            )
            if existing.data and str(existing.data[0]["id"]) != str(group_id):
                raise HTTPException(
                    status_code=409,
                    detail=f"A group with the name '{new_name}' already exists.",
                )
            update_dict["group_name"] = new_name

        if "start_date" in update_dict and update_dict["start_date"] is not None:
            update_dict["start_date"] = update_dict["start_date"].isoformat()

        if "owner_investment_amount" in update_dict and update_dict["owner_investment_amount"] is not None:
            update_dict["owner_investment_amount"] = float(update_dict["owner_investment_amount"])

        eff_installment_override = None
        if "weekly_installment" in update_dict and update_dict["weekly_installment"] is not None:
            eff_installment_override = Decimal(str(update_dict["weekly_installment"]))
            set_group_override(str(group_id), eff_installment_override, self.db)
            update_dict["weekly_installment"] = float(eff_installment_override)

        try:
            response = (
                self.db.table("groups")
                .update(update_dict)
                .eq("id", str(group_id))
                .execute()
            )
        except Exception as e:
            err_msg = str(e).lower()
            if "weekly_installment" in err_msg:
                update_dict.pop("weekly_installment", None)
            if "recycled_sub_type" in err_msg or "owner_investment_amount" in err_msg or "funding_source" in err_msg:
                update_dict.pop("recycled_sub_type", None)
                update_dict.pop("owner_investment_amount", None)
                update_dict.pop("funding_source", None)
            if not update_dict:
                current_group["weekly_installment"] = eff_installment_override or current_group.get("weekly_installment")
                return current_group
            response = (
                self.db.table("groups")
                .update(update_dict)
                .eq("id", str(group_id))
                .execute()
            )

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update group")

        updated_group = response.data[0]
        updated_group["scheme"] = current_group.get("scheme")
        self._enrich_dynamic_fields(updated_group)
        if eff_installment_override:
            updated_group["weekly_installment"] = eff_installment_override

        # Sync linked investment record
        s_date_str = updated_group.get("start_date")
        s_date = date.fromisoformat(str(s_date_str)[:10]) if s_date_str else None
        self._sync_group_investment(
            group_id=str(group_id),
            group_name=updated_group.get("group_name", current_group["group_name"]),
            funding_source=updated_group.get("funding_source"),
            recycled_sub_type=updated_group.get("recycled_sub_type"),
            owner_investment_amount=Decimal(str(updated_group.get("owner_investment_amount") or "0.00")),
            start_date_val=s_date,
        )
        self._ensure_active_members_have_cycles(str(group_id), updated_group)

        invalidate_dashboard_cache()
        return updated_group

    def update_group_status(self, group_id: UUID, data: GroupStatusUpdate) -> dict:
        """
        Update group status following allowed lifecycle transitions.
        Preserves historical data on closure.

        Draft -> Active transition (BR-026):
        When a Draft group is activated, the system automatically creates Loan Cycles
        and Loan Transactions for every existing Active member that does not already
        have a loan cycle.  This ensures no member is left without a disbursement
        record after activation, which would cause "No active loan cycle found" errors
        when the collector tries to record their first payment.
        """
        current_group = self.get_group_by_id(group_id)
        current_status = current_group["status"]
        new_status = data.status.value

        if current_status == new_status:
            return current_group

        allowed_transitions = VALID_STATUS_TRANSITIONS.get(current_status, set())
        if new_status not in allowed_transitions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from '{current_status}' to '{new_status}'.",
            )

        response = (
            self.db.table("groups")
            .update({"status": new_status})
            .eq("id", str(group_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update group status")

        updated_group = response.data[0]
        updated_group["scheme"] = current_group.get("scheme")

        # On Draft -> Active: create missing loan cycles and disbursement transactions
        if current_status == "Draft" and new_status == "Active":
            self._disburse_loans_for_draft_members(group_id, current_group)

        self._enrich_dynamic_fields(updated_group)
        invalidate_dashboard_cache()
        return updated_group

    def _disburse_loans_for_draft_members(
        self, group_id: UUID, group: dict
    ) -> None:
        """
        Called during Draft -> Active transition.

        For every Active member in this group that does NOT yet have a loan cycle,
        creates:
          - loan_cycles row  (cycle_number=1, status=Active)
          - loan_transactions row  (loan_amount, note_cost, cash_given per scheme)

        Members who already have a cycle (e.g. group was partially activated
        before) are skipped to preserve idempotency.

        ACCOUNTING: This creates the Cash Out (disbursement) records that correspond
        to the loan being handed to each member.  No Cash In records are created
        here.  The collector must record payment collections separately.
        """
        scheme = group.get("scheme")
        if not scheme:
            logger.warning(
                "Group %s has no scheme; skipping loan disbursement on activation.", group_id
            )
            return

        loan_amount = Decimal(str(scheme["loan_amount"]))
        note_cost = Decimal(str(scheme.get("note_cost", "0.00")))
        cash_given = loan_amount - note_cost

        # Use group start_date as disbursement date; fall back to today
        raw_start = group.get("start_date")
        if raw_start:
            disbursement_date = (
                date.fromisoformat(raw_start)
                if isinstance(raw_start, str)
                else raw_start
            )
        else:
            disbursement_date = date.today()

        # Fetch all Active members of this group
        members_res = (
            self.db.table("members")
            .select("id, member_name")
            .eq("group_id", str(group_id))
            .eq("status", "Active")
            .execute()
        )
        members = members_res.data or []
        if not members:
            return

        # Fetch existing loan cycles for this group to avoid double-disbursement
        existing_cycles_res = (
            self.db.table("loan_cycles")
            .select("member_id")
            .eq("group_id", str(group_id))
            .execute()
        )
        already_cycled = {
            str(row["member_id"]) for row in (existing_cycles_res.data or [])
        }

        for member in members:
            member_id = str(member["id"])
            if member_id in already_cycled:
                logger.info(
                    "Member %s already has a loan cycle; skipping on group activation.",
                    member_id,
                )
                continue

            # Create Loan Cycle
            cycle_insert = {
                "member_id": member_id,
                "group_id": str(group_id),
                "scheme_id": scheme["id"],
                "cycle_number": 1,
                "start_date": disbursement_date.isoformat(),
                "status": "Active",
            }
            cycle_res = self.db.table("loan_cycles").insert(cycle_insert).execute()
            if not cycle_res.data:
                logger.error(
                    "Failed to create loan cycle for member %s during group activation.",
                    member_id,
                )
                continue

            cycle = cycle_res.data[0]

            # Create Loan Transaction (Cash Out - Immutable)
            tx_insert = {
                "loan_cycle_id": cycle["id"],
                "member_id": member_id,
                "loan_amount": float(loan_amount),
                "note_cost": float(note_cost),
                "cash_given": float(cash_given),
                "disbursement_date": disbursement_date.isoformat(),
                "remarks": f"Loan disbursement on group activation for {member.get('member_name', '')}",
            }
            tx_res = (
                self.db.table("loan_transactions").insert(tx_insert).execute()
            )
            if not tx_res.data:
                logger.error(
                    "Failed to create loan transaction for member %s during group activation.",
                    member_id,
                )

    def _enrich_dynamic_fields(self, group: dict, member_count: Optional[int] = None) -> None:
        """
        Calculates dynamic values (member_count, total_group_amount).
        Per BR-004: Total Group Amount = Scheme loan amount × active member count.
        NEVER stored in DB table.
        """
        if member_count is not None:
            group["member_count"] = member_count
        elif "id" in group and group["id"]:
            try:
                member_res = (
                    self.db.table("members")
                    .select("id")
                    .eq("group_id", str(group["id"]))
                    .eq("status", "Active")
                    .execute()
                )
                group["member_count"] = len(member_res.data) if member_res.data else 0
            except Exception as e:
                logger.error(
                    "Failed to query active members for group %s: %s",
                    group.get("id"),
                    e,
                )
                group["member_count"] = group.get("member_count", 0) or 0
        else:
            group["member_count"] = group.get("member_count", 0) or 0

        member_cnt = group["member_count"]

        scheme = group.get("scheme")
        if scheme and "loan_amount" in scheme and member_cnt > 0:
            loan_amount = Decimal(str(scheme["loan_amount"]))
            group["total_group_amount"] = loan_amount * member_cnt
        else:
            group["total_group_amount"] = Decimal("0.00")

        if not group.get("funding_source"):
            group["funding_source"] = "Recycled Collections"

        if not group.get("recycled_sub_type"):
            group["recycled_sub_type"] = "Fully Recycled"

        if group.get("owner_investment_amount") is None:
            group["owner_investment_amount"] = Decimal("0.00")
        else:
            group["owner_investment_amount"] = Decimal(str(group["owner_investment_amount"]))

        group["weekly_installment"] = get_effective_weekly_installment(group, scheme, self.db)


def get_group_service(db: Client) -> GroupService:
    """Dependency provider for GroupService."""
    return GroupService(db)
