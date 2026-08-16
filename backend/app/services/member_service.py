from datetime import date
from decimal import Decimal
import logging
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from supabase import Client

from app.schemas.member import (
    MemberCreate,
    MemberStatus,
    MemberStatusUpdate,
    MemberUpdate,
)

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
        Per docs/05_BUSINESS_FORMULAS.md Formula 6 & 15.
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
        Calculates immediate collection for late-joining members.
        Per Formula 6: Immediate Collection = Current Week Number × Weekly Installment.
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

        query = query.order("created_at", desc=True)
        response = query.execute()

        members = response.data or []
        for m in members:
            self._enrich_member_calculations(m)

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

        self._enrich_member_calculations(member)
        return member

    def create_member(self, data: MemberCreate) -> dict:
        """
        Create a new member and add to target group.
        - Enforces BR-007 (one active group per member phone).
        - If group is 'Active', creates Loan Cycle and Loan Transaction immediately (BR-009, BR-021).
        - Computes joined_week and immediate_collection for late joiners (BR-022, BR-023).
        """
        # 1. Fetch Target Group & Scheme
        group_response = (
            self.db.table("groups")
            .select("*, scheme:schemes(*)")
            .eq("id", str(data.group_id))
            .execute()
        )
        if not group_response.data:
            raise HTTPException(status_code=404, detail="Group not found")

        group = group_response.data[0]
        if group["status"] == "Closed":
            raise HTTPException(
                status_code=400, detail="Cannot add member to a closed group."
            )

        scheme = group.get("scheme")
        if not scheme:
            raise HTTPException(
                status_code=400,
                detail="Group does not have a valid scheme assigned.",
            )

        # 2. Enforce BR-007: Single Active Group Constraint (by phone_number)
        phone_cleaned = data.phone_number.strip()
        existing_active = (
            self.db.table("members")
            .select("id, status, group:groups(id, status)")
            .eq("phone_number", phone_cleaned)
            .eq("status", "Active")
            .execute()
        )
        if existing_active.data:
            # Check if any of the existing active records belong to an active/draft group
            for em in existing_active.data:
                g = em.get("group")
                if g and g.get("status") in ("Draft", "Active", "Renewed"):
                    raise HTTPException(
                        status_code=409,
                        detail=f"A member with phone number '{phone_cleaned}' is already active in another group.",
                    )

        # 3. Calculate joined_date and joined_week
        joined_date = data.joined_date or date.today()
        total_weeks = int(scheme.get("total_weeks", 10))

        if group["status"] == "Active" and group.get("start_date"):
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

        # 5. Active Group: Create Loan Cycle & Loan Transaction (Cash Out)
        if group["status"] == "Active":
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
        return new_member

    def update_member(self, member_id: UUID, data: MemberUpdate) -> dict:
        """
        Update member profile (name, phone, address, photo, nominee, id_proof, remarks).
        group_id is immutable.
        """
        current_member = self.get_member_by_id(member_id)

        update_dict = data.model_dump(exclude_unset=True)
        if not update_dict:
            return current_member

        # Check phone uniqueness if phone is changing
        if (
            "phone_number" in update_dict
            and update_dict["phone_number"] != current_member["phone_number"]
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
        updated_member["current_cycle"] = current_member.get("current_cycle")
        self._enrich_member_calculations(updated_member)
        return updated_member

    def update_member_status(
        self,
        member_id: UUID,
        data: MemberStatusUpdate,
    ) -> dict:
        """
        Update member lifecycle status (Active -> Completed -> Closed).
        Preserves all historical loan records.
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

        updated = response.data[0]
        updated["group"] = current_member.get("group")
        updated["current_cycle"] = current_member.get("current_cycle")
        self._enrich_member_calculations(updated)
        return updated

    def _enrich_member_calculations(self, member: dict) -> None:
        """
        Calculates dynamic fields for member responses:
        - loan_amount, note_cost, cash_given, weekly_installment
        - immediate_collection for late joiners
        """
        group = member.get("group")
        if group:
            member["group_name"] = group.get("group_name")
            member["location"] = group.get("location")

            scheme = group.get("scheme")
            if scheme:
                member["scheme_name"] = scheme.get("scheme_name")
                loan_amt = Decimal(str(scheme.get("loan_amount", "0.00")))
                note_cst = Decimal(str(scheme.get("note_cost", "0.00")))
                weekly_inst = Decimal(str(scheme.get("weekly_installment", "0.00")))

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
