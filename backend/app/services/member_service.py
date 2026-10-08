from datetime import date
from decimal import Decimal
import logging
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from supabase import Client

from app.core.finance_calc import get_effective_weekly_installment
from app.schemas.member import (
    MemberCreate,
    MemberStatus,
    MemberStatusUpdate,
    MemberUpdate,
)
from app.services.dashboard_service import invalidate_dashboard_cache

logger = logging.getLogger(__name__)

# Valid member status transitions
VALID_MEMBER_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "Active": {"Completed", "Closed"},
    "Completed": {"Closed"},
    "Closed": set(),  # Terminal state: historical data preserved
}


class MemberService:
    """
    Service layer for Member Management.
    Enforces business rules, loan disbursement, late joining calculations,
    and single-active-group constraints.
    """

    def __init__(self, db: Client):
        self.db = db

    def calculate_joined_week(
        self,
        group_start_date: Optional[date],
        joined_date: date,
        total_weeks: int,
    ) -> int:
        """
        Calculates the week number when a member joins an active group.
        Per docs/05_BUSINESS_FORMULAS.md Formula 6 and 15.
        Week 1 = start of group.
        """
        if not group_start_date or joined_date <= group_start_date:
            return 1

        days_diff = (joined_date - group_start_date).days
        week_num = (days_diff // 7) + 1
        return max(1, min(week_num, total_weeks))

    def calculate_immediate_collection(
        self,
        joined_week: int,
        weekly_installment: Decimal,
    ) -> Decimal:
        """
        Calculates the immediate amount DUE from a late-joining member.
        Per Formula 6: Immediate Collection = Current Week Number x Weekly Installment.

        ACCOUNTING NOTE (per 04_ACCOUNTING_RULES.md cash-based model):
        This returns the amount the collector must physically collect on the joining
        date.  The system does NOT auto-create Paid collection records for this amount.
        The collector must record each week payment through record_collection() once
        cash is actually received.  Auto-inserting Paid rows without physical receipt
        would invent cash-in data and violate the cash-based accounting model.
        """
        return Decimal(joined_week) * weekly_installment

    def get_members(
        self,
        group_id: Optional[UUID] = None,
        status: Optional[MemberStatus] = None,
        search: Optional[str] = None,
    ) -> list[dict]:
        """
        Get all members matching optional filters (group_id, status, search).
        Includes weeks_paid (count of Paid collections) for repayment progress display.
        """
        query = self.db.table("members").select(
            "*, group:groups(*, scheme:schemes(*))"
        )

        if group_id:
            query = query.eq("group_id", str(group_id))
        if status:
            query = query.eq("status", status.value)
        if search:
            query = query.ilike("member_name", f"%{search.strip()}%")

        query = query.order("created_at", desc=False)
        response = query.execute()

        members = response.data or []
        if not members:
            return members

        for m in members:
            self._enrich_member_calculations(m)

        # ── Bulk-fetch repayment progress (weeks_paid / total_paid) ────────────
        # A single query fetches paid collections for all returned members so we
        # never issue one query per member.  This matches the data that
        # MemberDetailsModal computes via useCollections({ member_id }) on the
        # frontend (payment_status == 'Paid', count = weeks_paid).
        member_ids = [str(m["id"]) for m in members]
        try:
            coll_res = (
                self.db.table("collections")
                .select("member_id, amount_paid")
                .in_("member_id", member_ids)
                .eq("payment_status", "Paid")
                .execute()
            )
            paid_rows = coll_res.data or []
        except Exception as e:
            logger.error("Failed to query collections for member progress: %s", e)
            raise HTTPException(status_code=500, detail=f"Database error loading member progress: {e}")

        # Aggregate: {member_id: {weeks_paid, total_paid_amount}}
        progress: dict[str, dict] = {}
        for row in paid_rows:
            mid = str(row["member_id"])
            if mid not in progress:
                progress[mid] = {"weeks_paid": 0, "total_paid_amount": Decimal("0.00")}
            progress[mid]["weeks_paid"] += 1
            progress[mid]["total_paid_amount"] += Decimal(
                str(row.get("amount_paid") or "0.00")
            )

        for m in members:
            mid = str(m["id"])
            weeks_paid = progress.get(mid, {}).get("weeks_paid", 0)
            m["weeks_paid"] = weeks_paid
            m["total_paid_amount"] = float(
                progress.get(mid, {}).get("total_paid_amount", Decimal("0.00"))
            )
            # Authoritative Formula 5: Outstanding = remaining_installments × weekly_installment
            # (Only Active members contribute to outstanding; Completed/Closed = 0.0)
            if m.get("status") == "Active":
                group = m.get("group") or {}
                scheme = group.get("scheme") or {}
                total_wks = int(scheme.get("total_weeks") or 0)
                weekly_inst = get_effective_weekly_installment(group, scheme)
                remaining = max(0, total_wks - weeks_paid)
                m["outstanding_amount"] = float(Decimal(remaining) * weekly_inst)
            else:
                m["outstanding_amount"] = 0.0

        return members

    def get_member_by_id(self, member_id: UUID) -> dict:
        """
        Get single member details with active loan cycle and disbursement info.
        """
        response = (
            self.db.table("members")
            .select("*, group:groups(*, scheme:schemes(*))")
            .eq("id", str(member_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Member not found")

        member = response.data[0]

        # Fetch active loan cycle with loan transaction if available
        cycle_res = (
            self.db.table("loan_cycles")
            .select("*, loan_transactions(*)")
            .eq("member_id", str(member_id))
            .order("cycle_number", desc=True)
            .limit(1)
            .execute()
        )
        if cycle_res.data:
            cycle = cycle_res.data[0]
            txs = cycle.pop("loan_transactions", [])
            cycle["loan_transaction"] = txs[0] if txs else None
            member["current_cycle"] = cycle

        # Fetch paid collections for single member
        try:
            coll_res = (
                self.db.table("collections")
                .select("amount_paid")
                .eq("member_id", str(member_id))
                .eq("payment_status", "Paid")
                .execute()
            )
            paid_rows = coll_res.data or []
            weeks_paid = len(paid_rows)
            total_paid = sum(
                Decimal(str(r.get("amount_paid") or "0.00")) for r in paid_rows
            )
        except Exception:
            weeks_paid = 0
            total_paid = Decimal("0.00")

        member["weeks_paid"] = weeks_paid
        member["total_paid_amount"] = float(total_paid)

        if member.get("status") == "Active":
            group = member.get("group") or {}
            scheme = group.get("scheme") or {}
            total_wks = int(scheme.get("total_weeks") or 0)
            weekly_inst = get_effective_weekly_installment(group, scheme)
            remaining = max(0, total_wks - weeks_paid)
            member["outstanding_amount"] = float(Decimal(remaining) * weekly_inst)
        else:
            member["outstanding_amount"] = 0.0

        self._enrich_member_calculations(member)
        return member

    def create_member(self, data: MemberCreate) -> dict:
        """
        Create a new member and add to target group.

        Lifecycle behaviour (per BR-025, BR-026, BR-009):
        - Draft group: member is added in preparation; NO loan cycle or loan
          transaction is created.  Loan disbursement happens when the group is
          activated (group_service.update_group_status Draft -> Active).
        - Active group: member receives the loan immediately (BR-009).  Loan
          Cycle + Loan Transaction (Cash Out) are created at once.
        - Closed / Completed groups: addition is rejected.

        Late-joining (BR-022, BR-023, Formula 6):
        - immediate_collection is computed and returned as an INFORMATIONAL field
          only.  It represents the amount DUE from the member on the joining date.
        - NO Paid collection records are auto-created.  The collector must manually
          record each week payment through record_collection() once cash is
          physically received.  Auto-inserting Paid rows without physical receipt
          would invent cash-in data and violate the cash-based accounting model
          (04_ACCOUNTING_RULES.md: "Recorded When: Collector receives payment").
        """
        # 1. Fetch Target Group and Scheme
        group_response = (
            self.db.table("groups")
            .select("*, scheme:schemes(*)")
            .eq("id", str(data.group_id))
            .execute()
        )
        if not group_response.data:
            raise HTTPException(status_code=404, detail="Group not found")

        group = group_response.data[0]
        group_status = group["status"]

        # Only Draft and Active groups accept new members.
        # Closed and Completed groups are terminal / read-only states.
        if group_status not in ("Draft", "Active"):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Members can only be added to a Draft or Active group. "
                    f"This group is currently '{group_status}'."
                ),
            )

        scheme = group.get("scheme")
        if not scheme:
            raise HTTPException(
                status_code=400,
                detail="Group does not have a valid scheme assigned.",
            )

        phone_cleaned = data.phone_number.strip()

        # 3. Calculate joined_date and joined_week
        joined_date = data.joined_date or date.today()
        total_weeks = int(scheme.get("total_weeks", 10))

        # joined_week is only meaningful for Active groups (loan already running).
        # For Draft groups every member starts at Week 1 because the group has not
        # started yet and there are no missed weeks.
        if group_status == "Active" and group.get("start_date"):
            raw_start = group["start_date"]
            group_start = (
                date.fromisoformat(raw_start)
                if isinstance(raw_start, str)
                else raw_start
            )
            joined_week = self.calculate_joined_week(
                group_start, joined_date, total_weeks
            )
        else:
            joined_week = 1

        # 4. Insert Member Record
        member_insert = {
            "group_id": str(data.group_id),
            "member_name": data.member_name.strip(),
            "phone_number": phone_cleaned,
            "address": data.address.strip(),
            "photo_url": data.photo_url,
            "nominee": data.nominee,
            "id_proof": data.id_proof,
            "joined_week": joined_week,
            "joined_date": joined_date.isoformat(),
            "status": MemberStatus.ACTIVE.value,
            "remarks": data.remarks,
        }

        member_res = self.db.table("members").insert(member_insert).execute()
        if not member_res.data:
            raise HTTPException(status_code=500, detail="Failed to create member")

        new_member = member_res.data[0]
        new_member["group"] = group

        # 5. Active Group only: Create Loan Cycle and Loan Transaction (Cash Out).
        # Draft group members receive no financial records at creation time.
        # Their loans are disbursed when the group is activated via
        # group_service.update_group_status(Draft -> Active).
        if group_status == "Active":
            loan_amount = Decimal(str(scheme["loan_amount"]))
            note_cost = Decimal(str(scheme.get("note_cost", "0.00")))
            cash_given = loan_amount - note_cost

            # Create Loan Cycle
            cycle_insert = {
                "member_id": new_member["id"],
                "group_id": str(data.group_id),
                "scheme_id": scheme["id"],
                "cycle_number": 1,
                "start_date": joined_date.isoformat(),
                "status": "Active",
            }
            cycle_res = (
                self.db.table("loan_cycles").insert(cycle_insert).execute()
            )
            if not cycle_res.data:
                raise HTTPException(
                    status_code=500, detail="Failed to create loan cycle for new member."
                )
            cycle = cycle_res.data[0]

            # Create Loan Transaction (Immutable Disbursement Record)
            tx_insert = {
                "loan_cycle_id": cycle["id"],
                "member_id": new_member["id"],
                "loan_amount": float(loan_amount),
                "note_cost": float(note_cost),
                "cash_given": float(cash_given),
                "disbursement_date": joined_date.isoformat(),
                "remarks": f"Initial loan disbursement for {data.member_name.strip()}",
            }
            tx_res = (
                self.db.table("loan_transactions")
                .insert(tx_insert)
                .execute()
            )
            if not tx_res.data:
                raise HTTPException(
                    status_code=500, detail="Failed to record loan disbursement transaction."
                )
            cycle["loan_transaction"] = tx_res.data[0]
            new_member["current_cycle"] = cycle

        self._enrich_member_calculations(new_member)
        invalidate_dashboard_cache()
        return new_member

    def update_member(self, member_id: UUID, data: MemberUpdate) -> dict:
        """
        Update member profile (name, phone, address, photo, nominee, id_proof, remarks).
        group_id is immutable.
        """
        # Fast lookup of current member and group info (skips heavy loan_cycles/collections scans)
        cur_res = (
            self.db.table("members")
            .select("id, phone_number, group_id, status, member_name, address, nominee, id_proof, remarks, group:groups(id, group_name, location, status, scheme:schemes(*))")
            .eq("id", str(member_id))
            .execute()
        )
        if not cur_res.data:
            raise HTTPException(status_code=404, detail="Member not found")
        current_member = cur_res.data[0]

        update_dict = data.model_dump(exclude_unset=True)
        if not update_dict:
            return current_member

        # Check phone uniqueness if phone is changing
        if (
            "phone_number" in update_dict
            and update_dict["phone_number"] != current_member.get("phone_number")
        ):
            new_phone = update_dict["phone_number"].strip()
            existing = (
                self.db.table("members")
                .select("id, status, group:groups(id, status)")
                .eq("phone_number", new_phone)
                .eq("status", "Active")
                .execute()
            )
            if existing.data:
                for em in existing.data:
                    if str(em["id"]) != str(member_id):
                        g = em.get("group")
                        if g and g.get("status") in ("Draft", "Active", "Renewed"):
                            raise HTTPException(
                                status_code=409,
                                detail=f"A member with phone number '{new_phone}' is already active in another group.",
                            )
            update_dict["phone_number"] = new_phone

        response = (
            self.db.table("members")
            .update(update_dict)
            .eq("id", str(member_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update member")

        updated_member = response.data[0]
        updated_member["group"] = current_member.get("group")
        return updated_member

    def update_member_status(
        self,
        member_id: UUID,
        data: MemberStatusUpdate,
    ) -> dict:
        """
        Update member lifecycle status (Active -> Completed -> Closed).
        Preserves all historical loan records (financial immutability).

        On Closed transition:
        - Also closes all Active loan cycles for this member so they are
          excluded from total_outstanding on the Dashboard.
        - Does NOT delete any records; only status fields are updated.
        """
        current_member = self.get_member_by_id(member_id)
        current_status = current_member["status"]
        new_status = data.status.value

        if current_status == new_status:
            return current_member

        allowed_transitions = VALID_MEMBER_STATUS_TRANSITIONS.get(
            current_status, set()
        )
        if new_status not in allowed_transitions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid member status transition from '{current_status}' to '{new_status}'.",
            )

        response = (
            self.db.table("members")
            .update({"status": new_status})
            .eq("id", str(member_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(
                status_code=500, detail="Failed to update member status"
            )

        # Cascade: close any Active loan cycles so they no longer inflate
        # total_outstanding on the Dashboard.
        if new_status == "Closed":
            try:
                self.db.table("loan_cycles").update({"status": "Closed"}).eq(
                    "member_id", str(member_id)
                ).eq("status", "Active").execute()
            except Exception as e:
                # Log but do not abort; the member status was already updated.
                logger.error(
                    "Failed to close loan cycles for member %s: %s", member_id, e
                )

        updated = response.data[0]
        updated["group"] = current_member.get("group")
        updated["current_cycle"] = current_member.get("current_cycle")
        self._enrich_member_calculations(updated)
        invalidate_dashboard_cache()
        return updated

    def _enrich_member_calculations(self, member: dict) -> None:
        """
        Calculates dynamic fields for member responses:
        - loan_amount, note_cost, cash_given, weekly_installment
        - immediate_collection for late joiners (INFORMATIONAL - amount due, not paid)
        - weeks_paid / total_paid_amount: defaults to 0 here; get_members() populates
          via a single bulk collection query after all members are fetched.
        """
        # Repayment progress — defaults; overridden by get_members() bulk query
        if "weeks_paid" not in member:
            member["weeks_paid"] = 0
        if "total_paid_amount" not in member:
            member["total_paid_amount"] = 0.0
        if "outstanding_amount" not in member:
            member["outstanding_amount"] = 0.0

        group = member.get("group")
        if group:
            member["group_name"] = group.get("group_name")
            member["location"] = group.get("location")

            scheme = group.get("scheme")
            if scheme:
                member["scheme_name"] = scheme.get("scheme_name")
                loan_amt = Decimal(str(scheme.get("loan_amount", "0.00")))
                note_cst = Decimal(str(scheme.get("note_cost", "0.00")))
                weekly_inst = get_effective_weekly_installment(group, scheme)

                member["loan_amount"] = loan_amt
                member["note_cost"] = note_cst
                member["cash_given"] = loan_amt - note_cst
                member["weekly_installment"] = weekly_inst

                joined_week = int(member.get("joined_week", 1))
                if joined_week > 1:
                    member["immediate_collection"] = (
                        self.calculate_immediate_collection(
                            joined_week, weekly_inst
                        )
                    )
                else:
                    member["immediate_collection"] = weekly_inst


def get_member_service(db: Client) -> MemberService:
    """Dependency provider for MemberService."""
    return MemberService(db)
