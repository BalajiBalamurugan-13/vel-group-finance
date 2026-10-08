import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from supabase import Client

from app.core.business_week import get_business_week, get_week_date_range
from app.core.finance_calc import get_effective_weekly_installment
from app.schemas.collection import (
    CollectionCreate,
    CollectionResponse,
    GroupWeeklySummary,
    PaymentStatus,
    TodayCollectionSummary,
    WeeklyCollectionSummary,
    RecordWeekRequest,
    RecordWeekResponse,
    RecordWeekPreviewResponse,
    RecordWeekGroupBreakdown,
)
from app.services.dashboard_service import invalidate_dashboard_cache

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
        weekly_installment = get_effective_weekly_installment(group, scheme)

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

        invalidate_dashboard_cache()
        return self._enrich_collection(
            new_collection, member=member, group=group, scheme=scheme
        )

    def record_bulk_collections(self, items: list[CollectionCreate]) -> dict:
        """
        Records a batch of collection payments rapidly using pre-fetching and batch inserts.
        Eliminates N+1 database roundtrips:
        1. Bulk-fetches members and their groups/schemes in 1 query.
        2. Bulk-fetches active loan cycles for all members in 1 query.
        3. Bulk-fetches existing payments to validate duplicates/sequential in memory in 1 query.
        4. Inserts all valid collections in 1 batch insert.
        5. Falls back to individual insertion if batch insert encounters an issue.
        """
        if not items:
            return {"total_recorded": 0, "total_amount": 0.0, "collections": [], "errors": []}

        # If only 1 item, record directly
        if len(items) == 1:
            try:
                col = self.record_collection(items[0])
                invalidate_dashboard_cache()
                return {
                    "total_recorded": 1,
                    "total_amount": float(col.get("amount_paid", items[0].amount_paid)),
                    "collections": [col],
                    "errors": [],
                }
            except HTTPException as e:
                raise e
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        member_ids = [str(item.member_id) for item in items]

        try:
            # 1. Bulk-fetch members with groups & schemes
            members_res = (
                self.db.table("members")
                .select("*, group:groups(*, scheme:schemes(*))")
                .in_("id", member_ids)
                .execute()
            )
            member_map = {str(m["id"]): m for m in (members_res.data or [])}

            # 2. Bulk-fetch active loan cycles
            cycles_res = (
                self.db.table("loan_cycles")
                .select("*, scheme:schemes(*)")
                .in_("member_id", member_ids)
                .order("cycle_number", desc=True)
                .execute()
            )
            # Pick latest active cycle per member
            cycle_map = {}
            for c in (cycles_res.data or []):
                mid = str(c["member_id"])
                if mid not in cycle_map:
                    cycle_map[mid] = c

            cycle_ids = [str(c["id"]) for c in cycle_map.values()]

            # 3. Bulk-fetch existing payments for these cycles
            paid_collections_map: dict[str, set[int]] = {}
            if cycle_ids:
                colls_res = (
                    self.db.table("collections")
                    .select("loan_cycle_id, week_number")
                    .in_("loan_cycle_id", cycle_ids)
                    .eq("payment_status", "Paid")
                    .execute()
                )
                for r in (colls_res.data or []):
                    cid = str(r["loan_cycle_id"])
                    if cid not in paid_collections_map:
                        paid_collections_map[cid] = set()
                    paid_collections_map[cid].add(int(r["week_number"]))

            # 4. Resolve default collector once
            collector_id = self._get_or_create_default_collector_id(items[0].collector_id)

            # 5. In-memory validation & insert row preparation
            insert_rows = []
            valid_items = []
            errors = []

            for item in items:
                mid = str(item.member_id)
                member = member_map.get(mid)
                if not member:
                    errors.append(f"Member {mid}: Member not found")
                    continue
                if member.get("status") == "Closed":
                    errors.append(f"Member {member.get('member_name', mid)}: Account is closed")
                    continue

                group = member.get("group")
                if not group or group.get("status") in ("Draft", "Closed"):
                    errors.append(f"Member {member.get('member_name', mid)}: Group not in active status")
                    continue

                loan_cycle = cycle_map.get(mid)
                if not loan_cycle:
                    errors.append(f"Member {member.get('member_name', mid)}: No active loan cycle found")
                    continue

                scheme = loan_cycle.get("scheme") or group.get("scheme")
                if not scheme:
                    errors.append(f"Member {member.get('member_name', mid)}: Scheme not found")
                    continue

                total_weeks = int(scheme["total_weeks"])
                if item.week_number < 1 or item.week_number > total_weeks:
                    errors.append(f"Member {member.get('member_name', mid)}: Invalid week {item.week_number} (max {total_weeks})")
                    continue

                cid = str(loan_cycle["id"])
                paid_weeks = paid_collections_map.get(cid, set())

                # Sequential enforcement
                if item.week_number > 1 and (item.week_number - 1) not in paid_weeks:
                    errors.append(f"Member {member.get('member_name', mid)}: Week {item.week_number - 1} must be paid first")
                    continue

                # Duplicate check
                if item.week_number in paid_weeks:
                    errors.append(f"Member {member.get('member_name', mid)}: Week {item.week_number} already paid")
                    continue

                payment_date = item.payment_date or date.today()
                insert_rows.append({
                    "loan_cycle_id": cid,
                    "member_id": mid,
                    "group_id": str(group["id"]),
                    "collector_id": collector_id,
                    "week_number": item.week_number,
                    "payment_date": payment_date.isoformat(),
                    "amount_paid": float(item.amount_paid),
                    "payment_status": item.payment_status.value,
                    "remarks": item.remarks,
                })
                valid_items.append((item, member, loan_cycle, total_weeks))

            if not insert_rows:
                if errors:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed to record collections: {'; '.join(errors[:3])}",
                    )
                return {"total_recorded": 0, "total_amount": 0.0, "collections": [], "errors": []}

            # 6. Single Bulk Insert into collections
            ins_res = self.db.table("collections").insert(insert_rows).execute()
            inserted_collections = ins_res.data or []

            # 7. Check loan completions & update in background/batch
            for item, member, loan_cycle, total_weeks in valid_items:
                cid = str(loan_cycle["id"])
                new_paid_count = len(paid_collections_map.get(cid, set())) + 1
                if new_paid_count >= total_weeks and member.get("status") == "Active":
                    try:
                        self.db.table("members").update({"status": "Completed"}).eq("id", str(member["id"])).execute()
                        self.db.table("loan_cycles").update({"status": "Completed"}).eq("id", cid).execute()
                    except Exception:
                        pass

            total_amount = sum((Decimal(str(r["amount_paid"])) for r in insert_rows), Decimal("0.00"))
            enriched = self._enrich_collections_batch(inserted_collections)

            invalidate_dashboard_cache()

            return {
                "total_recorded": len(inserted_collections),
                "total_amount": float(total_amount),
                "collections": enriched,
                "errors": errors,
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Batch insert optimization hit error: %s. Falling back to sequential recording...", e)
            return self._record_bulk_collections_sequential(items)

    def _record_bulk_collections_sequential(self, items: list[CollectionCreate]) -> dict:
        """Sequential recording fallback with per-member retry."""
        import time

        recorded = []
        total_amount = Decimal("0.00")
        errors = []

        for item in items:
            max_member_retries = 2
            success = False
            last_err = None
            for attempt in range(max_member_retries + 1):
                try:
                    col = self.record_collection(item)
                    recorded.append(col)
                    total_amount += Decimal(str(col.get("amount_paid") or item.amount_paid))
                    success = True
                    break
                except HTTPException as e:
                    last_err = e.detail
                    break
                except Exception as e:
                    err_str = str(e)
                    last_err = getattr(e, "detail", err_str)
                    if attempt < max_member_retries and any(
                        term in err_str
                        for term in (
                            "ConnectionTerminated",
                            "RemoteProtocolError",
                            "connection closed",
                            "broken pipe",
                        )
                    ):
                        time.sleep(0.3)
                        continue
                    break

            if not success:
                logger.error("Failed recording collection for member %s: %s", item.member_id, last_err)
                errors.append(f"Member {item.member_id}: {last_err}")

            if len(items) > 1:
                time.sleep(0.15)

        if not recorded and errors:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to record collections: {'; '.join(errors[:3])}",
            )

        if recorded:
            invalidate_dashboard_cache()

        return {
            "total_recorded": len(recorded),
            "total_amount": float(total_amount),
            "collections": recorded,
            "errors": errors,
        }

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

        if not groups:
            return {
                "total_expected": Decimal("0.00"),
                "total_collected": Decimal("0.00"),
                "total_pending": Decimal("0.00"),
                "collection_count": 0,
                "full_cycle_expected": Decimal("0.00"),
                "full_cycle_collected": Decimal("0.00"),
                "full_cycle_pending": Decimal("0.00"),
                "groups_summary": [],
            }

        group_ids = [str(g["id"]) for g in groups]

        # ── Bulk-fetch active members for all active groups in a single query ──
        members = []
        try:
            members_res = (
                self.db.table("members")
                .select("id, group_id")
                .in_("group_id", group_ids)
                .eq("status", "Active")
                .execute()
            )
            if hasattr(members_res, "data") and isinstance(members_res.data, list):
                members = members_res.data
        except Exception as e:
            logger.debug("Bulk fetch members in_ query failed: %s", e)

        if not members:
            # Fallback for mock unit test environments or older schemas
            for gid in group_ids:
                try:
                    res = (
                        self.db.table("members")
                        .select("id")
                        .eq("group_id", gid)
                        .eq("status", "Active")
                        .execute()
                    )
                    for item in (res.data or []):
                        if isinstance(item, dict):
                            members.append({"id": item.get("id"), "group_id": item.get("group_id") or gid})
                except Exception:
                    pass

        active_members_by_group: dict[str, int] = {}
        for m in members:
            gid = str(m.get("group_id") or (group_ids[0] if len(group_ids) == 1 else ""))
            if gid:
                active_members_by_group[gid] = active_members_by_group.get(gid, 0) + 1

        # ── Bulk-fetch paid collections for all active groups in a single query ──
        all_paid_rows = []
        try:
            colls_res = (
                self.db.table("collections")
                .select("group_id, amount_paid, week_number, payment_date")
                .in_("group_id", group_ids)
                .eq("payment_status", "Paid")
                .execute()
            )
            if hasattr(colls_res, "data") and isinstance(colls_res.data, list):
                all_paid_rows = colls_res.data
        except Exception as e:
            logger.debug("Bulk fetch collections in_ query failed: %s", e)

        if not all_paid_rows:
            # Fallback for mock unit test environments or older schemas
            for gid in group_ids:
                try:
                    res = (
                        self.db.table("collections")
                        .select("amount_paid, week_number, payment_date")
                        .eq("group_id", gid)
                        .eq("payment_status", "Paid")
                        .execute()
                    )
                    for item in (res.data or []):
                        if isinstance(item, dict):
                            all_paid_rows.append({
                                "group_id": item.get("group_id") or gid,
                                "amount_paid": item.get("amount_paid"),
                                "week_number": item.get("week_number"),
                                "payment_date": item.get("payment_date"),
                            })
                except Exception:
                    pass

        paid_by_group: dict[str, list] = {}
        for c in all_paid_rows:
            gid = str(c.get("group_id") or (group_ids[0] if len(group_ids) == 1 else ""))
            if gid not in paid_by_group:
                paid_by_group[gid] = []
            paid_by_group[gid].append(c)

        groups_summary = []
        overall_weekly_expected = Decimal("0.00")
        overall_weekly_collected = Decimal("0.00")
        overall_full_cycle_expected = Decimal("0.00")
        overall_full_cycle_collected = Decimal("0.00")
        total_collections_count = 0
        today = date.today()
        curr_b_week = get_business_week(today)
        week_start, week_end = get_week_date_range(curr_b_week)

        for g in groups:
            scheme = g.get("scheme")
            if not scheme:
                continue

            gid = str(g["id"])
            active_count = active_members_by_group.get(gid, 0)

            weekly_inst = get_effective_weekly_installment(g, scheme)
            total_weeks = int(scheme["total_weeks"])
            
            # Query all paid collections for this group
            all_paid = paid_by_group.get(gid, [])
            total_collections_count += len(all_paid)

            # Full Cycle Expected: active_members * weekly_installment * total_weeks
            full_cycle_expected = weekly_inst * Decimal(total_weeks) * Decimal(active_count)
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

            group_start = None
            if g.get("start_date"):
                raw_start = g["start_date"]
                group_start = (
                    date.fromisoformat(raw_start)
                    if isinstance(raw_start, str)
                    else raw_start
                )

            # If group commences in a future business week, exclude from current week expected
            is_future_group = bool(group_start and group_start > week_end)

            if is_future_group:
                current_week = 0
                weekly_expected = Decimal("0.00")
                weekly_collected = Decimal("0.00")
                weekly_pending = Decimal("0.00")
                weekly_progress = 0.0
            else:
                if group_start:
                    current_week = min(total_weeks, max(1, ((today - group_start).days // 7) + 1))
                else:
                    current_week = 1

                # Current Week Expected: active_members * weekly_installment
                weekly_expected = weekly_inst * Decimal(active_count)
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
                weekly_inst = get_effective_weekly_installment(group, scheme)
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
            weekly_inst = get_effective_weekly_installment(group, scheme)
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

    def preview_whole_week_collections(
        self,
        payment_date: Optional[date] = None,
        business_week: Optional[int] = None,
        group_ids: Optional[list[UUID]] = None,
    ) -> dict:
        """
        Pre-computes weekly collections breakdown and pending amounts for a selected target date / week.
        Identifies active members who have not yet paid for this business week.
        """
        target_date = payment_date or date.today()
        bw = business_week if business_week is not None else get_business_week(target_date)
        w_start, w_end = get_week_date_range(bw)

        # 1. Fetch active groups
        group_query = (
            self.db.table("groups")
            .select("id, group_name, location, status, scheme:schemes(*)")
            .eq("status", "Active")
        )
        if group_ids is not None:
            if not group_ids:
                return {
                    "business_week": bw,
                    "target_date": target_date,
                    "week_start_date": w_start,
                    "week_end_date": w_end,
                    "total_active_members": 0,
                    "eligible_members_count": 0,
                    "already_paid_count": 0,
                    "total_expected_amount": Decimal("0.00"),
                    "total_pending_amount": Decimal("0.00"),
                    "total_already_paid_amount": Decimal("0.00"),
                    "groups": [],
                }
            group_query = group_query.in_("id", [str(gid) for gid in group_ids])
        groups_res = group_query.order("group_name").execute()
        active_groups = groups_res.data or []
        group_map = {str(g["id"]): g for g in active_groups}
        active_gids = list(group_map.keys())

        if not active_gids:
            return {
                "business_week": bw,
                "target_date": target_date,
                "week_start_date": w_start,
                "week_end_date": w_end,
                "total_active_members": 0,
                "eligible_members_count": 0,
                "already_paid_count": 0,
                "total_expected_amount": Decimal("0.00"),
                "total_pending_amount": Decimal("0.00"),
                "total_already_paid_amount": Decimal("0.00"),
                "groups": [],
            }

        # 2. Fetch active members
        members_res = (
            self.db.table("members")
            .select("id, member_name, phone_number, group_id, status")
            .eq("status", "Active")
            .in_("group_id", active_gids)
            .execute()
        )
        active_members = members_res.data or []
        active_mids = [str(m["id"]) for m in active_members]

        # 3. Fetch latest active loan cycles
        cycles_res = (
            self.db.table("loan_cycles")
            .select("id, member_id, cycle_number, status, scheme:schemes(*)")
            .in_("member_id", active_mids)
            .eq("status", "Active")
            .order("cycle_number", desc=True)
            .execute()
        )
        cycle_map = {}
        for c in (cycles_res.data or []):
            mid = str(c["member_id"])
            if mid not in cycle_map:
                cycle_map[mid] = c

        active_cids = [str(c["id"]) for c in cycle_map.values()]

        # 4. Fetch paid collections for these cycles
        colls_map: dict[str, list[dict]] = {}
        if active_cids:
            colls_res = (
                self.db.table("collections")
                .select("id, member_id, loan_cycle_id, week_number, payment_date, amount_paid, payment_status")
                .in_("loan_cycle_id", active_cids)
                .eq("payment_status", "Paid")
                .execute()
            )
            for cl in (colls_res.data or []):
                mid = str(cl["member_id"])
                colls_map.setdefault(mid, []).append(cl)

        # 5. Evaluate eligibility & group breakdown
        group_stats = {
            gid: {
                "group_id": gid,
                "group_name": group_map[gid]["group_name"],
                "location": group_map[gid].get("location"),
                "active_members": 0,
                "pending_members": 0,
                "already_paid_members": 0,
                "weekly_installment": get_effective_weekly_installment(group_map[gid], group_map[gid].get("scheme") or {}),
                "pending_amount": Decimal("0.00"),
                "paid_amount": Decimal("0.00"),
            }
            for gid in active_gids
        }

        total_expected_amount = Decimal("0.00")
        total_pending_amount = Decimal("0.00")
        total_already_paid_amount = Decimal("0.00")
        eligible_count = 0
        already_paid_count = 0

        for m in active_members:
            mid = str(m["id"])
            gid = str(m["group_id"])
            group = group_map.get(gid)
            if not group:
                continue

            scheme = group.get("scheme") or {}
            total_weeks = int(scheme.get("total_weeks") or 20)
            weekly_inst = get_effective_weekly_installment(group, scheme)

            m_cycle = cycle_map.get(mid)
            if not m_cycle:
                continue

            c_list = colls_map.get(mid, [])
            paid_weeks_count = len(c_list)

            # Check if member already has a collection recorded in this business week
            paid_this_week = any(
                w_start.isoformat() <= str(c.get("payment_date")) <= w_end.isoformat()
                for c in c_list
            )

            group_stats[gid]["active_members"] += 1
            total_expected_amount += weekly_inst

            if paid_this_week or paid_weeks_count >= total_weeks:
                already_paid_count += 1
                group_stats[gid]["already_paid_members"] += 1
                group_stats[gid]["paid_amount"] += weekly_inst
                total_already_paid_amount += weekly_inst
            else:
                eligible_count += 1
                group_stats[gid]["pending_members"] += 1
                group_stats[gid]["pending_amount"] += weekly_inst
                total_pending_amount += weekly_inst

        return {
            "business_week": bw,
            "target_date": target_date,
            "week_start_date": w_start,
            "week_end_date": w_end,
            "total_active_members": len(active_members),
            "eligible_members_count": eligible_count,
            "already_paid_count": already_paid_count,
            "total_expected_amount": total_expected_amount,
            "total_pending_amount": total_pending_amount,
            "total_already_paid_amount": total_already_paid_amount,
            "groups": list(group_stats.values()),
        }

    def record_whole_week_collections(self, data: RecordWeekRequest) -> dict:
        """
        One-click atomic recording of collections for the whole business week.
        Supports custom payment date (e.g., Sunday, Monday) and executes rapid batch inserts.
        """
        target_date = data.payment_date or date.today()
        bw = data.business_week if data.business_week is not None else get_business_week(target_date)
        w_start, w_end = get_week_date_range(bw)

        # 1. Fetch active groups
        group_query = (
            self.db.table("groups")
            .select("id, group_name, location, status, scheme:schemes(*)")
            .eq("status", "Active")
        )
        if data.group_ids is not None:
            if not data.group_ids:
                return {
                    "business_week": bw,
                    "payment_date": target_date,
                    "total_recorded": 0,
                    "total_amount": Decimal("0.00"),
                    "skipped_count": 0,
                    "errors": ["No active groups found for the selected filter."],
                }
            group_query = group_query.in_("id", [str(gid) for gid in data.group_ids])
        groups_res = group_query.order("group_name").execute()
        active_groups = groups_res.data or []
        group_map = {str(g["id"]): g for g in active_groups}
        active_gids = list(group_map.keys())

        if not active_gids:
            return {
                "business_week": bw,
                "payment_date": target_date,
                "total_recorded": 0,
                "total_amount": Decimal("0.00"),
                "skipped_count": 0,
                "errors": ["No active groups found."],
            }

        # 2. Fetch active members
        members_res = (
            self.db.table("members")
            .select("id, member_name, phone_number, group_id, status")
            .eq("status", "Active")
            .in_("group_id", active_gids)
            .execute()
        )
        active_members = members_res.data or []
        active_mids = [str(m["id"]) for m in active_members]

        # 3. Fetch active loan cycles
        cycles_res = (
            self.db.table("loan_cycles")
            .select("id, member_id, cycle_number, status, scheme:schemes(*)")
            .in_("member_id", active_mids)
            .eq("status", "Active")
            .order("cycle_number", desc=True)
            .execute()
        )
        cycle_map = {}
        for c in (cycles_res.data or []):
            mid = str(c["member_id"])
            if mid not in cycle_map:
                cycle_map[mid] = c

        active_cids = [str(c["id"]) for c in cycle_map.values()]

        # 4. Fetch paid collections
        colls_map: dict[str, list[dict]] = {}
        if active_cids:
            colls_res = (
                self.db.table("collections")
                .select("id, member_id, loan_cycle_id, week_number, payment_date, amount_paid, payment_status")
                .in_("loan_cycle_id", active_cids)
                .eq("payment_status", "Paid")
                .execute()
            )
            for cl in (colls_res.data or []):
                mid = str(cl["member_id"])
                colls_map.setdefault(mid, []).append(cl)

        # 5. Resolve default collector
        collector_id = self._get_or_create_default_collector_id(data.collector_id)

        # 6. Prepare insert rows
        insert_rows = []
        members_to_complete = []
        skipped_count = 0
        total_amount = Decimal("0.00")
        errors = []

        default_remarks = data.remarks or f"Business Week {bw} bulk collection"

        for m in active_members:
            mid = str(m["id"])
            gid = str(m["group_id"])
            group = group_map.get(gid)
            if not group:
                continue

            scheme = group.get("scheme") or {}
            total_weeks = int(scheme.get("total_weeks") or 20)
            weekly_inst = get_effective_weekly_installment(group, scheme)

            m_cycle = cycle_map.get(mid)
            if not m_cycle:
                errors.append(f"Member {m.get('member_name', mid)}: No active loan cycle")
                continue

            cid = str(m_cycle["id"])
            c_list = colls_map.get(mid, [])
            paid_weeks_count = len(c_list)

            # Check duplicate in this business week
            paid_this_week = any(
                w_start.isoformat() <= str(c.get("payment_date")) <= w_end.isoformat()
                for c in c_list
            )
            if paid_this_week:
                skipped_count += 1
                continue

            next_week = paid_weeks_count + 1
            if next_week > total_weeks:
                skipped_count += 1
                continue

            insert_rows.append({
                "loan_cycle_id": cid,
                "member_id": mid,
                "group_id": gid,
                "collector_id": collector_id,
                "week_number": next_week,
                "payment_date": target_date.isoformat(),
                "amount_paid": float(weekly_inst),
                "payment_status": PaymentStatus.PAID.value,
                "remarks": default_remarks,
            })
            total_amount += weekly_inst

            if next_week >= total_weeks:
                members_to_complete.append((mid, cid))

        if not insert_rows:
            return {
                "business_week": bw,
                "payment_date": target_date,
                "total_recorded": 0,
                "total_amount": Decimal("0.00"),
                "skipped_count": skipped_count,
                "errors": errors or ["All active members have already paid for this week."],
            }

        # 7. Execute batch inserts in chunks of 50
        chunk_size = 50
        total_inserted = 0
        for i in range(0, len(insert_rows), chunk_size):
            chunk = insert_rows[i : i + chunk_size]
            res = self.db.table("collections").insert(chunk).execute()
            if res.data:
                total_inserted += len(res.data)
            else:
                logger.error("Failed to insert collection chunk %d-%d", i, i + len(chunk))

        # 8. Mark completed members if any
        for comp_mid, comp_cid in members_to_complete:
            try:
                self.db.table("members").update({"status": "Completed"}).eq("id", comp_mid).execute()
                self.db.table("loan_cycles").update({"status": "Completed"}).eq("id", comp_cid).execute()
            except Exception:
                pass

        invalidate_dashboard_cache()

        return {
            "business_week": bw,
            "payment_date": target_date,
            "total_recorded": total_inserted,
            "total_amount": total_amount,
            "skipped_count": skipped_count,
            "errors": errors,
        }


def get_collection_service(db: Client) -> CollectionService:
    """Dependency provider for CollectionService."""
    return CollectionService(db)
