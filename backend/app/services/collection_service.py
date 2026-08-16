import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from supabase import Client

from app.schemas.collection import (
    CollectionCreate,
    CollectionResponse,
    GroupWeeklySummary,
    PaymentStatus,
    TodayCollectionSummary,
    WeeklyCollectionSummary,
)

logger = logging.getLogger(__name__)


class CollectionService:
    """
    Service layer for Collections Management.
    Enforces financial rules, cash-flow integrity, immutable transaction records,
    and dynamic calculations (outstanding, remaining weeks, completion percentage).
    """

    def __init__(self, db: Client):
        self.db = db

    def _get_or_create_default_collector_id(
        self, requested_id: Optional[UUID] = None
    ) -> str:
        """
        Resolves a valid collector ID.
        If requested_id is provided, verifies existence.
        If omitted, gets or creates default active collector.
        """
        if requested_id:
            res = (
                self.db.table("collectors")
                .select("id")
                .eq("id", str(requested_id))
                .execute()
            )
            if not res.data:
                raise HTTPException(status_code=404, detail="Collector not found.")
            return str(requested_id)

        # Look for an existing active collector
        res = (
            self.db.table("collectors")
            .select("id")
            .eq("status", "Active")
            .limit(1)
            .execute()
        )
        if res.data:
            return str(res.data[0]["id"])

        # Create default collector for Version 1
        create_res = (
            self.db.table("collectors")
            .insert({
                "collector_name": "Vel Finance Admin",
                "phone_number": "9876543210",
                "status": "Active",
            })
            .execute()
        )
        if not create_res.data:
            raise HTTPException(status_code=500, detail="Failed to initialize collector.")
        return str(create_res.data[0]["id"])

    def record_collection(self, data: CollectionCreate) -> dict:
        """
        Records a weekly installment payment (Cash In).
        Per BR-014 - BR-017, TC-COL-001, TC-COL-004.
        Enforces:
        - Member exists and belongs to an active/completed group (not Draft or Closed).
        - Member is not in Closed status.
        - Week number is within [1, total_weeks] of the scheme.
        - Amount paid is positive.
        - Duplicate payment for (loan_cycle_id, week_number) is prevented (409 Conflict).
        - Original loan transaction remains immutable.
        """
        # 1. Fetch Member
        member_res = (
            self.db.table("members")
            .select("*, group:groups(*, scheme:schemes(*))")
            .eq("id", str(data.member_id))
            .execute()
        )
        if not member_res.data:
            raise HTTPException(status_code=404, detail="Member not found.")

        member = member_res.data[0]
        if member["status"] == "Closed":
            raise HTTPException(
                status_code=400,
                detail="Cannot collect payments for a closed member account.",
            )

        group = member.get("group")
        if not group:
            raise HTTPException(status_code=404, detail="Member group not found.")

        if group["status"] in ("Draft", "Closed"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot collect payment for group in '{group['status']}' status.",
            )

        # 2. Fetch Active Loan Cycle
        cycle_res = (
            self.db.table("loan_cycles")
            .select("*, scheme:schemes(*)")
            .eq("member_id", str(data.member_id))
            .order("cycle_number", desc=True)
            .limit(1)
            .execute()
        )
        if not cycle_res.data:
            raise HTTPException(
                status_code=400,
                detail="No active loan cycle found for this member.",
            )

        loan_cycle = cycle_res.data[0]
        scheme = loan_cycle.get("scheme") or group.get("scheme")
        if not scheme:
            raise HTTPException(status_code=404, detail="Loan scheme not found.")

        total_weeks = int(scheme["total_weeks"])
        weekly_installment = Decimal(str(scheme["weekly_installment"]))

        # 3. Validate Week Number
        if data.week_number < 1 or data.week_number > total_weeks:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid week number {data.week_number}. Maximum week for this scheme is {total_weeks}.",
            )

        # 4. Duplicate Check (Idempotency per TC-COL-004)
        existing_payment = (
            self.db.table("collections")
            .select("id, payment_status")
            .eq("loan_cycle_id", str(loan_cycle["id"]))
            .eq("week_number", data.week_number)
            .eq("payment_status", "Paid")
            .execute()
        )
        if existing_payment.data:
            raise HTTPException(
                status_code=409,
                detail=f"Payment for Week {data.week_number} has already been recorded for this member.",
            )

        # 5. Resolve Collector
        collector_id = self._get_or_create_default_collector_id(data.collector_id)

        # 6. Insert Collection Record (Immutable Cash In)
        payment_date = data.payment_date or date.today()
        insert_data = {
            "loan_cycle_id": str(loan_cycle["id"]),
            "member_id": str(member["id"]),
            "group_id": str(group["id"]),
            "collector_id": collector_id,
            "week_number": data.week_number,
            "payment_date": payment_date.isoformat(),
            "amount_paid": float(data.amount_paid),
            "payment_status": data.payment_status.value,
            "remarks": data.remarks,
        }

        res = self.db.table("collections").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to record collection.")

        new_collection = res.data[0]

        # 7. Check if All Weeks are Completed
        all_paid_res = (
            self.db.table("collections")
            .select("id")
            .eq("loan_cycle_id", str(loan_cycle["id"]))
            .eq("payment_status", "Paid")
            .execute()
        )
        paid_weeks_count = len(all_paid_res.data or [])
        if paid_weeks_count >= total_weeks and member["status"] == "Active":
            # Automatically update member to Completed status
            self.db.table("members").update({"status": "Completed"}).eq(
                "id", str(member["id"])
            ).execute()
            self.db.table("loan_cycles").update({"status": "Completed"}).eq(
                "id", str(loan_cycle["id"])
            ).execute()

        return self._enrich_collection(
            new_collection, member=member, group=group, scheme=scheme
        )

    def get_collections(
        self,
        group_id: Optional[UUID] = None,
        member_id: Optional[UUID] = None,
        collector_id: Optional[UUID] = None,
        payment_date: Optional[date] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> list[dict]:
        """
        Retrieves collection history with optional filters (Date, Group, Member).
        """
        query = (
            self.db.table("collections")
            .select("*, member:members(member_name, phone_number), group:groups(group_name, location), collector:collectors(collector_name), loan_cycle:loan_cycles(scheme:schemes(*))")
        )

        if group_id:
            query = query.eq("group_id", str(group_id))
        if member_id:
            query = query.eq("member_id", str(member_id))
        if collector_id:
            query = query.eq("collector_id", str(collector_id))
        if payment_date:
            query = query.eq("payment_date", payment_date.isoformat())
        if from_date:
            query = query.gte("payment_date", from_date.isoformat())
        if to_date:
            query = query.lte("payment_date", to_date.isoformat())

        query = query.order("payment_date", desc=True).order("created_at", desc=True)
        response = query.execute()

        results = response.data or []
        return [self._enrich_collection_joined(c) for c in results]

    def get_collection_by_id(self, collection_id: UUID) -> dict:
        """
        Retrieves a single collection record with full context and outstanding info.
        """
        response = (
            self.db.table("collections")
            .select("*, member:members(member_name, phone_number), group:groups(group_name, location), collector:collectors(collector_name), loan_cycle:loan_cycles(scheme:schemes(*))")
            .eq("id", str(collection_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Collection record not found.")

        collection = response.data[0]
        return self._enrich_collection_joined(collection)

    def get_today_collections(self, target_date: Optional[date] = None) -> dict:
        """
        Returns summary and list of all collections for today (or specified date).
        """
        today_date = target_date or date.today()
        collections = self.get_collections(payment_date=today_date)

        total_collected = sum(
            (Decimal(str(c.get("amount_paid", 0))) for c in collections),
            Decimal("0.00"),
        )

        return {
            "date": today_date,
            "total_collected": total_collected,
            "collection_count": len(collections),
            "collections": collections,
        }

    def get_weekly_summary(
        self, group_id: Optional[UUID] = None
    ) -> dict:
        """
        Calculates weekly collection summary across groups.
        Per Formula 3, 5, 9, 10.
        """
        # Fetch active groups
        query = self.db.table("groups").select("*, scheme:schemes(*)").eq("status", "Active")
        if group_id:
            query = query.eq("id", str(group_id))

        groups_res = query.execute()
        groups = groups_res.data or []

        groups_summary = []
        overall_expected = Decimal("0.00")
        overall_collected = Decimal("0.00")

        for g in groups:
            scheme = g.get("scheme")
            if not scheme:
                continue

            # Query active members in group
            members_res = (
                self.db.table("members")
                .select("id")
                .eq("group_id", str(g["id"]))
                .eq("status", "Active")
                .execute()
            )
            active_count = len(members_res.data or [])

            weekly_inst = Decimal(str(scheme["weekly_installment"]))
            total_expected = weekly_inst * active_count

            # Query collections for this group
            colls_res = (
                self.db.table("collections")
                .select("amount_paid")
                .eq("group_id", str(g["id"]))
                .eq("payment_status", "Paid")
                .execute()
            )
            total_group_collected = sum(
                (Decimal(str(c["amount_paid"])) for c in (colls_res.data or [])),
                Decimal("0.00"),
            )

            total_pending = max(Decimal("0.00"), total_expected - total_group_collected)
            pct = (
                float((total_group_collected / total_expected) * 100)
                if total_expected > 0
                else 0.0
            )

            overall_expected += total_expected
            overall_collected += total_group_collected

            groups_summary.append({
                "group_id": g["id"],
                "group_name": g["group_name"],
                "location": g["location"],
                "active_members": active_count,
                "weekly_installment": weekly_inst,
                "total_expected": total_expected,
                "total_collected": total_group_collected,
                "total_pending": total_pending,
                "completion_percentage": round(pct, 2),
            })

        overall_pending = max(Decimal("0.00"), overall_expected - overall_collected)

        return {
            "total_expected": overall_expected,
            "total_collected": overall_collected,
            "total_pending": overall_pending,
            "collection_count": len(groups_summary),
            "groups_summary": groups_summary,
        }

    def _enrich_collection(
        self,
        collection: dict,
        member: Optional[dict] = None,
        group: Optional[dict] = None,
        scheme: Optional[dict] = None,
    ) -> dict:
        """Enriches raw collection dict with member, group, and calculated financial values."""
        item = dict(collection)
        if member:
            item["member_name"] = member.get("member_name")
            item["phone_number"] = member.get("phone_number")
        if group:
            item["group_name"] = group.get("group_name")
            item["location"] = group.get("location")
        if scheme:
            weekly_inst = Decimal(str(scheme["weekly_installment"]))
            total_weeks = int(scheme["total_weeks"])
            item["weekly_installment"] = weekly_inst
            item["total_weeks"] = total_weeks

            # Query paid weeks for outstanding calculation
            loan_cycle_id = item.get("loan_cycle_id")
            if loan_cycle_id:
                try:
                    paid_res = (
                        self.db.table("collections")
                        .select("id")
                        .eq("loan_cycle_id", str(loan_cycle_id))
                        .eq("payment_status", "Paid")
                        .execute()
                    )
                    weeks_paid = len(paid_res.data or [])
                except Exception:
                    weeks_paid = 1
            else:
                weeks_paid = 1

            remaining = max(0, total_weeks - weeks_paid)
            item["weeks_paid"] = weeks_paid
            item["remaining_installments"] = remaining
            item["outstanding_amount"] = Decimal(remaining) * weekly_inst
            item["completion_percentage"] = (
                round((weeks_paid / total_weeks) * 100, 2)
                if total_weeks > 0
                else 0.0
            )

        return item

    def _enrich_collection_joined(self, collection: dict) -> dict:
        """Enriches joined Supabase collection row."""
        item = dict(collection)
        member = item.pop("member", None)
        group = item.pop("group", None)
        collector = item.pop("collector", None)
        loan_cycle = item.pop("loan_cycle", None)
        scheme = loan_cycle.get("scheme") if loan_cycle else None

        if member:
            item["member_name"] = member.get("member_name")
            item["phone_number"] = member.get("phone_number")
        if group:
            item["group_name"] = group.get("group_name")
            item["location"] = group.get("location")
        if collector:
            item["collector_name"] = collector.get("collector_name")

        if scheme:
            weekly_inst = Decimal(str(scheme["weekly_installment"]))
            total_weeks = int(scheme["total_weeks"])
            item["weekly_installment"] = weekly_inst
            item["total_weeks"] = total_weeks

        return item


def get_collection_service(db: Client) -> CollectionService:
    """Dependency provider for CollectionService."""
    return CollectionService(db)
