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

        # 3. Validate Week Number & Sequential Enforcement
        if data.week_number < 1 or data.week_number > total_weeks:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid week number {data.week_number}. Maximum week for this scheme is {total_weeks}.",
            )

        # Enforce sequential payment: Week N requires Week 1..N-1 to be Paid
        if data.week_number > 1:
            prev_paid = (
                self.db.table("collections")
                .select("id")
                .eq("loan_cycle_id", str(loan_cycle["id"]))
                .eq("week_number", data.week_number - 1)
                .eq("payment_status", "Paid")
                .execute()
            )
            if not prev_paid.data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot record payment for Week {data.week_number}. Week {data.week_number - 1} must be paid first.",
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
        Queries base collections and enriches with member, group, collector, scheme.
        Avoids invalid PostgREST nested relationship joins that cause PGRST200 errors.
        """
        query = self.db.table("collections").select(
            "*, collector:collectors(collector_name)"
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
        return self._enrich_collections_batch(results)

    def get_collection_by_id(self, collection_id: UUID) -> dict:
        """
        Retrieves a single collection record with full context and outstanding info.
        """
        response = (
            self.db.table("collections")
            .select("*, collector:collectors(collector_name)")
            .eq("id", str(collection_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Collection record not found.")

        collection = response.data[0]
        enriched = self._enrich_collections_batch([collection])
        return enriched[0]

    def get_today_collections(self, target_date: Optional[date] = None) -> dict:
        """
        Returns summary and list of all collections for today (or specified date).
        Only sums collections matching the specified date.
        """
        today_date = target_date or date.today()
        collections = self.get_collections(payment_date=today_date)

        paid_collections = [
            c for c in collections if c.get("payment_status") == "Paid"
        ]
        total_collected = sum(
            (Decimal(str(c.get("amount_paid", 0))) for c in paid_collections),
            Decimal("0.00"),
        )

        return {
            "date": today_date,
            "total_collected": total_collected,
            "collection_count": len(paid_collections),
            "collections": collections,
        }

    def get_weekly_summary(
        self, group_id: Optional[UUID] = None
    ) -> dict:
        """
        Calculates weekly collection summary across groups.
        Per Formula 3, 5, 9, 10.
        CURRENT WEEK:
        - Weekly Expected = active members × weekly installment
        - Weekly Collected = collections belonging to the current/active week
        - Weekly Pending = max(0, Weekly Expected - Weekly Collected)
        - Weekly Progress = (Weekly Collected / Weekly Expected) × 100

        FULL CYCLE:
        - Total Expected = weekly_installment × total_weeks × active_members
        - Total Collected = sum of all actual Paid collection records
        - Total Pending = max(0, Total Expected - Total Collected)
        - Full Cycle Progress = (Total Collected / Total Expected) × 100
        """
        # Fetch active groups
        query = self.db.table("groups").select("*, scheme:schemes(*)").eq("status", "Active")
        if group_id:
            query = query.eq("id", str(group_id))

        groups_res = query.execute()
        groups = groups_res.data or []

        groups_summary = []
        overall_weekly_expected = Decimal("0.00")
        overall_weekly_collected = Decimal("0.00")
        overall_full_cycle_expected = Decimal("0.00")
        overall_full_cycle_collected = Decimal("0.00")
        total_collections_count = 0

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
            total_weeks = int(scheme["total_weeks"])
            
            # Current Week Expected: active_members * weekly_installment
            weekly_expected = weekly_inst * Decimal(active_count)
            # Full Cycle Expected: active_members * weekly_installment * total_weeks
            full_cycle_expected = weekly_inst * Decimal(total_weeks) * Decimal(active_count)

            # Query all paid collections for this group
            colls_res = (
                self.db.table("collections")
                .select("amount_paid, week_number, payment_date")
                .eq("group_id", str(g["id"]))
                .eq("payment_status", "Paid")
                .execute()
            )
            all_paid = colls_res.data or []
            total_collections_count += len(all_paid)

            full_cycle_collected = sum(
                (Decimal(str(c["amount_paid"])) for c in all_paid),
                Decimal("0.00"),
            )
            full_cycle_pending = max(Decimal("0.00"), full_cycle_expected - full_cycle_collected)
            full_cycle_progress = (
                float((full_cycle_collected / full_cycle_expected) * 100)
                if full_cycle_expected > 0
                else 0.0
            )

            # Compute current active week for the group
            if g.get("start_date"):
                raw_start = g["start_date"]
                group_start = (
                    date.fromisoformat(raw_start)
                    if isinstance(raw_start, str)
                    else raw_start
                )
                current_week = min(total_weeks, max(1, ((date.today() - group_start).days // 7) + 1))
            else:
                current_week = 1

            this_week_paid = [c for c in all_paid if int(c.get("week_number", 0)) == current_week]
            weekly_collected = sum(
                (Decimal(str(c["amount_paid"])) for c in this_week_paid),
                Decimal("0.00"),
            )
            weekly_pending = max(Decimal("0.00"), weekly_expected - weekly_collected)
            weekly_progress = (
                float((weekly_collected / weekly_expected) * 100)
                if weekly_expected > 0
                else 0.0
            )

            overall_weekly_expected += weekly_expected
            overall_weekly_collected += weekly_collected
            overall_full_cycle_expected += full_cycle_expected
            overall_full_cycle_collected += full_cycle_collected

            groups_summary.append({
                "group_id": g["id"],
                "group_name": g["group_name"],
                "location": g["location"],
                "active_members": active_count,
                "weekly_installment": weekly_inst,
                "total_expected": weekly_expected,
                "total_collected": weekly_collected,
                "total_pending": weekly_pending,
                "completion_percentage": round(weekly_progress, 2),
                "full_cycle_expected": full_cycle_expected,
                "full_cycle_collected": full_cycle_collected,
                "full_cycle_pending": full_cycle_pending,
                "full_cycle_progress": round(full_cycle_progress, 2),
            })

        overall_weekly_pending = max(Decimal("0.00"), overall_weekly_expected - overall_weekly_collected)
        overall_full_cycle_pending = max(Decimal("0.00"), overall_full_cycle_expected - overall_full_cycle_collected)

        return {
            "total_expected": overall_weekly_expected,
            "total_collected": overall_weekly_collected,
            "total_pending": overall_weekly_pending,
            "collection_count": total_collections_count,
            "full_cycle_expected": overall_full_cycle_expected,
            "full_cycle_collected": overall_full_cycle_collected,
            "full_cycle_pending": overall_full_cycle_pending,
            "groups_summary": groups_summary,
        }

    def _enrich_collections_batch(self, collections: list[dict]) -> list[dict]:
        """
        Enriches a list of collection records in batch with member, group, and scheme context.
        Uses direct table lookups instead of composite PostgREST resource embeddings.
        """
        if not collections:
            return []

        # Collect distinct IDs
        member_ids = list({str(c["member_id"]) for c in collections if c.get("member_id")})
        group_ids = list({str(c["group_id"]) for c in collections if c.get("group_id")})
        cycle_ids = list({str(c["loan_cycle_id"]) for c in collections if c.get("loan_cycle_id")})

        # Fetch Members
        member_map = {}
        if member_ids:
            try:
                m_res = (
                    self.db.table("members")
                    .select("id, member_name, phone_number")
                    .in_("id", member_ids)
                    .execute()
                )
                member_map = {str(m["id"]): m for m in (m_res.data or [])}
            except Exception:
                pass

        # Fetch Groups & Schemes
        group_map = {}
        if group_ids:
            try:
                g_res = (
                    self.db.table("groups")
                    .select("id, group_name, location, scheme:schemes(*)")
                    .in_("id", group_ids)
                    .execute()
                )
                group_map = {str(g["id"]): g for g in (g_res.data or [])}
            except Exception:
                pass

        # Fetch Paid Counts per Loan Cycle
        paid_counts = {}
        if cycle_ids:
            try:
                p_res = (
                    self.db.table("collections")
                    .select("loan_cycle_id")
                    .in_("loan_cycle_id", cycle_ids)
                    .eq("payment_status", "Paid")
                    .execute()
                )
                for r in (p_res.data or []):
                    cid = str(r["loan_cycle_id"])
                    paid_counts[cid] = paid_counts.get(cid, 0) + 1
            except Exception:
                pass

        enriched = []
        for raw in collections:
            item = dict(raw)
            # Unpack collector
            collector = item.pop("collector", None)
            if collector and isinstance(collector, dict):
                item["collector_name"] = collector.get("collector_name")
            elif "collector_name" not in item:
                item["collector_name"] = None

            # Fallback if member was pre-joined
            member = item.pop("member", None) or member_map.get(str(item.get("member_id")))
            if member:
                item["member_name"] = member.get("member_name")
                item["phone_number"] = member.get("phone_number")

            # Fallback if group was pre-joined
            group = item.pop("group", None) or group_map.get(str(item.get("group_id")))
            scheme = None
            if group:
                item["group_name"] = group.get("group_name")
                item["location"] = group.get("location")
                scheme = group.get("scheme")

            loan_cycle = item.pop("loan_cycle", None)
            if loan_cycle and isinstance(loan_cycle, dict) and not scheme:
                scheme = loan_cycle.get("scheme")

            if scheme:
                weekly_inst = Decimal(str(scheme["weekly_installment"]))
                total_weeks = int(scheme["total_weeks"])
                item["weekly_installment"] = weekly_inst
                item["total_weeks"] = total_weeks

                cid = str(item.get("loan_cycle_id", ""))
                weeks_paid = paid_counts.get(cid, int(item.get("week_number", 1)))
                remaining = max(0, total_weeks - weeks_paid)
                item["weeks_paid"] = weeks_paid
                item["remaining_installments"] = remaining
                item["outstanding_amount"] = Decimal(remaining) * weekly_inst
                item["completion_percentage"] = (
                    round((weeks_paid / total_weeks) * 100, 2)
                    if total_weeks > 0
                    else 0.0
                )

            enriched.append(item)

        return enriched

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
        """Legacy helper delegating to _enrich_collections_batch."""
        return self._enrich_collections_batch([collection])[0]


def get_collection_service(db: Client) -> CollectionService:
    """Dependency provider for CollectionService."""
    return CollectionService(db)
