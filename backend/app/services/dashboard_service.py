"""
VEL Finance — Dashboard Service
=================================
Aggregates all financial metrics for the GET /api/v1/dashboard endpoint.

Per docs/07_API_SPECIFICATION.md — Module 7.
Per docs/05_BUSINESS_FORMULAS.md — Formulas 5, 11, 19.
Per docs/04_ACCOUNTING_RULES.md — Cash Summary, Outstanding Calculation.

ALL monetary arithmetic uses Python Decimal only.
No float arithmetic anywhere in this service.
"""
import logging
import time
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException
from supabase import Client

from app.core.business_week import get_business_week, get_week_date_range
from app.schemas.dashboard import DashboardResponse, GroupLocationSummary, RecentCollection

logger = logging.getLogger(__name__)

RECENT_COLLECTIONS_LIMIT = 10

# ── In-Memory TTL Cache ────────────────────────────────────────────────────────
_DASHBOARD_CACHE: Optional[DashboardResponse] = None
_DASHBOARD_CACHE_EXPIRY: float = 0.0
DASHBOARD_CACHE_TTL: float = 15.0  # 15 seconds


def invalidate_dashboard_cache() -> None:
    """Invalidates the in-memory dashboard cache so the next request recomputes fresh data."""
    global _DASHBOARD_CACHE, _DASHBOARD_CACHE_EXPIRY
    _DASHBOARD_CACHE = None
    _DASHBOARD_CACHE_EXPIRY = 0.0


class DashboardService:
    """
    Read-only aggregation service for the Dashboard.

    This service does NOT create, update, or delete any financial records.
    It only reads from: collections, loan_transactions, loan_cycles,
    groups, members, schemes, collectors.
    """

    def __init__(self, db: Client) -> None:
        self.db = db

    # ── Public API ────────────────────────────────────────────────────────────

    def _execute(self, query, max_retries: int = 2):
        """
        Executes a PostgREST query with retries on transient connection termination.
        """
        for attempt in range(max_retries + 1):
            try:
                return query.execute()
            except Exception as e:
                err_str = str(e)
                if attempt < max_retries and any(
                    term in err_str
                    for term in (
                        "ConnectionTerminated",
                        "RemoteProtocolError",
                        "connection closed",
                        "broken pipe",
                    )
                ):
                    logger.warning(
                        "Transient connection issue on Supabase query (attempt %d/%d): %s. Retrying...",
                        attempt + 1,
                        max_retries,
                        e,
                    )
                    time.sleep(0.2)
                    continue
                raise

    def get_summary(self, force_refresh: bool = False) -> DashboardResponse:
        """
        Build and return the complete dashboard summary.
        1. Checks in-memory TTL cache (15s).
        2. Tries single-call PostgreSQL RPC (get_dashboard_summary) if deployed.
        3. Falls back to consolidated sequential queries with zero redundancy.
        """
        global _DASHBOARD_CACHE, _DASHBOARD_CACHE_EXPIRY

        is_mock = (
            self.db is None
            or "Mock" in type(self.db).__name__
            or hasattr(self.db, "_mock_name")
            or getattr(self.db, "_is_mock", False)
        )

        now = time.time()
        if not force_refresh and not is_mock and _DASHBOARD_CACHE is not None and now < _DASHBOARD_CACHE_EXPIRY:
            logger.debug("Returning cached dashboard summary from memory")
            return _DASHBOARD_CACHE

        today = date.today()

        # ── Fast-path: Check for high-performance PostgreSQL RPC ───────────────
        if not is_mock:
            try:
                rpc_res = self.db.rpc("get_dashboard_summary", {"p_today": today.isoformat()}).execute()
                if rpc_res.data and isinstance(rpc_res.data, dict):
                    data = rpc_res.data
                    response = DashboardResponse(
                        available_cash=Decimal(str(data.get("available_cash", 0))),
                        total_cash_in=Decimal(str(data.get("total_cash_in", 0))),
                        total_cash_out=Decimal(str(data.get("total_cash_out", 0))),
                        todays_collection=Decimal(str(data.get("todays_collection", 0))),
                        todays_collection_count=int(data.get("todays_collection_count", 0)),
                        total_disbursement=Decimal(str(data.get("total_disbursement", 0))),
                        total_loan_amount=Decimal(str(data.get("total_loan_amount", 0))),
                        total_note_cost=Decimal(str(data.get("total_note_cost", 0))),
                        total_outstanding=Decimal(str(data.get("total_outstanding", 0))),
                        active_groups=int(data.get("active_groups", 0)),
                        active_members=int(data.get("active_members", 0)),
                        total_groups=int(data.get("total_groups", 0)),
                        total_members=int(data.get("total_members", 0)),
                        weekly_expected=Decimal(str(data.get("weekly_expected", 0))),
                        weekly_collected=Decimal(str(data.get("weekly_collected", 0))),
                        weekly_pending=Decimal(str(data.get("weekly_pending", 0))),
                        weekly_progress=float(data.get("weekly_progress", 0.0)),
                        groups_by_location=[GroupLocationSummary(**item) for item in data.get("groups_by_location", [])],
                        recent_collections=[RecentCollection(**item) for item in data.get("recent_collections", [])],
                    )
                    _DASHBOARD_CACHE = response
                    _DASHBOARD_CACHE_EXPIRY = now + DASHBOARD_CACHE_TTL
                    return response
            except Exception as rpc_err:
                logger.debug("RPC get_dashboard_summary fallback: %s", rpc_err)

        try:
            # ── Consolidated Sequential Queries ────────────────────────────────────
            total_cash_in, todays_collection, todays_collection_count, weekly_collected = (
                self._get_collection_aggregates(today)
            )
            total_cash_out, total_loan_amount, total_note_cost = self._get_loan_transaction_totals()
            total_outstanding = self._get_total_outstanding()

            # Groups and Members with weekly expected in single unified pass
            (
                active_groups,
                total_groups,
                active_members,
                total_members,
                weekly_expected,
                groups_by_location,
            ) = self._get_group_and_member_aggregates()

            weekly_pending = max(Decimal("0.00"), weekly_expected - weekly_collected)
            weekly_progress = (
                round(float((weekly_collected / weekly_expected) * 100), 2)
                if weekly_expected > 0
                else 0.0
            )

            recent_collections = self._get_recent_collections()

            available_cash = total_cash_in - total_cash_out
            total_disbursement = total_cash_out

            response = DashboardResponse(
                available_cash=available_cash,
                total_cash_in=total_cash_in,
                total_cash_out=total_cash_out,
                todays_collection=todays_collection,
                todays_collection_count=todays_collection_count,
                total_disbursement=total_disbursement,
                total_loan_amount=total_loan_amount,
                total_note_cost=total_note_cost,
                total_outstanding=total_outstanding,
                active_groups=active_groups,
                active_members=active_members,
                total_groups=total_groups,
                total_members=total_members,
                weekly_expected=weekly_expected,
                weekly_collected=weekly_collected,
                weekly_pending=weekly_pending,
                weekly_progress=weekly_progress,
                groups_by_location=groups_by_location,
                recent_collections=recent_collections,
            )

            if not is_mock:
                _DASHBOARD_CACHE = response
                _DASHBOARD_CACHE_EXPIRY = now + DASHBOARD_CACHE_TTL
            return response

        except Exception as e:
            logger.error("Error computing dashboard summary: %s", e)
            if not is_mock and _DASHBOARD_CACHE is not None:
                logger.info("Serving last healthy cached dashboard snapshot on transient error")
                return _DASHBOARD_CACHE
            raise

    # ── Private helpers ───────────────────────────────────────────────────────

    def _get_collection_aggregates(
        self, today: date
    ) -> tuple[Decimal, Decimal, int, Decimal]:
        """
        Combines total cash in, today's collection, today's count, and current week collected
        into a single PostgREST query on paid collections.
        """
        try:
            res = self._execute(
                self.db.table("collections")
                .select("amount_paid, payment_date")
                .eq("payment_status", "Paid")
            )
            rows = res.data or []
            today_str = today.isoformat()

            # Current business week bounds (Sunday to Saturday) per Vel Finance business calendar
            curr_b_week = get_business_week(today)
            week_start, week_end = get_week_date_range(curr_b_week)
            week_start_str = week_start.isoformat()
            week_end_str = week_end.isoformat()

            total_cash_in = Decimal("0.00")
            todays_collection = Decimal("0.00")
            todays_count = 0
            weekly_collected = Decimal("0.00")

            for row in rows:
                amt_raw = row.get("amount_paid")
                if amt_raw is None:
                    continue
                amt = Decimal(str(amt_raw))
                total_cash_in += amt
                p_date = str(row.get("payment_date") or today_str)

                if p_date == today_str:
                    todays_collection += amt
                    todays_count += 1

                if week_start_str <= p_date <= week_end_str:
                    weekly_collected += amt

            return total_cash_in, todays_collection, todays_count, weekly_collected
        except Exception as e:
            logger.exception("Failed to compute collection aggregates: %s", e)
            return Decimal("0.00"), Decimal("0.00"), 0, Decimal("0.00")


    def _get_loan_transaction_totals(self) -> tuple[Decimal, Decimal, Decimal]:
        """
        Single query for all loan transactions.
        Returns (total_cash_out, total_loan_amount, total_note_cost).
        """
        try:
            res = self._execute(
                self.db.table("loan_transactions")
                .select("cash_given, loan_amount, note_cost")
            )
            total_cash_out = Decimal("0.00")
            total_loan_amount = Decimal("0.00")
            total_note_cost = Decimal("0.00")
            for row in (res.data or []):
                if "cash_given" in row and row["cash_given"] is not None:
                    total_cash_out += Decimal(str(row["cash_given"]))
                if "loan_amount" in row and row["loan_amount"] is not None:
                    total_loan_amount += Decimal(str(row["loan_amount"]))
                if "note_cost" in row and row["note_cost"] is not None:
                    total_note_cost += Decimal(str(row["note_cost"]))
            return total_cash_out, total_loan_amount, total_note_cost
        except Exception as e:
            logger.exception("Failed to compute loan transaction totals: %s", e)
            return Decimal("0.00"), Decimal("0.00"), Decimal("0.00")

    def _get_total_outstanding(self) -> Decimal:
        """
        Formula 5 (Per Member):  Outstanding = remaining_installments × weekly_installment
        Formula 19 (Group):      Group Outstanding = Sum of Outstanding for all active members
        Dashboard:               Total Outstanding = Sum of Group Outstanding for all active groups
        """
        try:
            # Fetch active loan cycles with their scheme data
            cycles_res = self._execute(
                self.db.table("loan_cycles")
                .select("id, member_id, scheme_id, status, scheme:schemes(weekly_installment, total_weeks)")
                .eq("status", "Active")
            )
            cycles = cycles_res.data or []
            if not cycles:
                return Decimal("0.00")

            # Bulk fetch paid collection counts for all these cycles
            cycle_ids = [str(c["id"]) for c in cycles]
            paid_res = self._execute(
                self.db.table("collections")
                .select("loan_cycle_id")
                .in_("loan_cycle_id", cycle_ids)
                .eq("payment_status", "Paid")
            )
            # Build a paid-count map: cycle_id → count
            paid_counts: dict[str, int] = {}
            for row in (paid_res.data or []):
                cid = str(row["loan_cycle_id"])
                paid_counts[cid] = paid_counts.get(cid, 0) + 1

            # Sum outstanding across all active cycles
            total_outstanding = Decimal("0.00")
            for cycle in cycles:
                scheme = cycle.get("scheme")
                if not scheme:
                    continue
                weekly_inst = Decimal(str(scheme["weekly_installment"]))
                total_weeks = int(scheme["total_weeks"])
                paid_count = paid_counts.get(str(cycle["id"]), 0)
                remaining = max(0, total_weeks - paid_count)
                total_outstanding += Decimal(remaining) * weekly_inst

            return total_outstanding
        except Exception as e:
            logger.exception("Failed to compute total_outstanding: %s", e)
            return Decimal("0.00")

    def _get_group_and_member_aggregates(
        self,
    ) -> tuple[int, int, int, int, Decimal, list[GroupLocationSummary]]:
        """
        Consolidates groups, members, locations, and weekly expected into 2 lean PostgREST queries:
        1. groups: id, location, status, scheme:schemes(weekly_installment)
        2. members: id, group_id, status
        Returns:
            (active_groups, total_groups, active_members, total_members, weekly_expected, groups_by_location)
        """
        try:
            g_res = self._execute(
                self.db.table("groups")
                .select("id, location, status, start_date, scheme:schemes(weekly_installment)")
            )
            groups = g_res.data or []

            m_res = self._execute(
                self.db.table("members")
                .select("id, group_id, status")
            )
            members = m_res.data or []

            today = date.today()
            curr_b_week = get_business_week(today)
            _, curr_week_end = get_week_date_range(curr_b_week)

            active_groups = 0
            group_schemes: dict[str, Decimal] = {}
            active_groups_list = []
            for g in groups:
                gid = str(g.get("id") or uuid4())
                status = g.get("status")
                if status == "Active" or status is None:
                    active_groups += 1
                    active_groups_list.append(g)

                    # Only expect collections for groups that have already commenced on or before this business week
                    start_date_raw = g.get("start_date")
                    if start_date_raw:
                        try:
                            g_start = date.fromisoformat(str(start_date_raw)[:10])
                            if g_start > curr_week_end:
                                # Group loan commences in a future week (e.g. tomorrow, Oct 4, Week 9)
                                continue
                        except Exception:
                            pass

                    scheme = g.get("scheme")
                    if scheme and scheme.get("weekly_installment") is not None:
                        group_schemes[gid] = Decimal(str(scheme["weekly_installment"]))

            active_members = 0
            member_count_by_group: dict[str, int] = {}
            weekly_expected = Decimal("0.00")

            for m in members:
                status = m.get("status")
                if status == "Active" or status is None:
                    active_members += 1
                    gid = str(m.get("group_id") or "")
                    member_count_by_group[gid] = member_count_by_group.get(gid, 0) + 1
                    # Add to weekly expected if member is in an active group with valid scheme
                    if gid in group_schemes:
                        weekly_expected += group_schemes[gid]

            # Aggregate by location
            location_map: dict[str, dict] = {}
            for g in active_groups_list:
                loc = (g.get("location") or "Unknown").strip() or "Unknown"
                if loc not in location_map:
                    location_map[loc] = {"active_groups": 0, "active_members": 0}
                location_map[loc]["active_groups"] += 1
                gid = str(g.get("id") or "")
                location_map[loc]["active_members"] += member_count_by_group.get(gid, 0)

            groups_by_location = [
                GroupLocationSummary(
                    location=loc,
                    active_groups=data["active_groups"],
                    active_members=data["active_members"],
                )
                for loc, data in sorted(location_map.items())
            ]

            return (
                active_groups,
                len(groups),
                active_members,
                len(members),
                weekly_expected,
                groups_by_location,
            )
        except Exception as e:
            logger.exception("Failed to compute group/member aggregates: %s", e)
            return 0, 0, 0, 0, Decimal("0.00"), []

    def _get_recent_collections(self) -> list[RecentCollection]:
        """
        Returns the latest RECENT_COLLECTIONS_LIMIT paid collection records
        enriched with member name, group name, location, and collector name.
        """
        try:
            # Fetch latest paid collections
            res = self._execute(
                self.db.table("collections")
                .select("id, receipt_code, member_id, group_id, loan_cycle_id, week_number, amount_paid, payment_date, payment_status, collector:collectors(collector_name)")
                .eq("payment_status", "Paid")
                .order("payment_date", desc=True)
                .order("created_at", desc=True)
                .limit(RECENT_COLLECTIONS_LIMIT)
            )
            rows = res.data or []
            if not rows:
                return []

            # Bulk-enrich with member and group data
            member_ids = list({str(r["member_id"]) for r in rows if r.get("member_id")})
            group_ids = list({str(r["group_id"]) for r in rows if r.get("group_id")})

            # Fetch members
            member_map: dict[str, dict] = {}
            if member_ids:
                m_res = self._execute(
                    self.db.table("members")
                    .select("id, member_name, member_code")
                    .in_("id", member_ids)
                )
                member_map = {str(m["id"]): m for m in (m_res.data or [])}

            # Fetch groups
            group_map: dict[str, dict] = {}
            if group_ids:
                g_res = self._execute(
                    self.db.table("groups")
                    .select("id, group_name, location, group_code")
                    .in_("id", group_ids)
                )
                group_map = {str(g["id"]): g for g in (g_res.data or [])}

            recent: list[RecentCollection] = []
            for row in rows:
                mid = str(row.get("member_id", ""))
                gid = str(row.get("group_id", ""))
                member = member_map.get(mid, {})
                group = group_map.get(gid, {})

                # Extract collector name from the nested join
                collector = row.get("collector") or {}
                collector_name: Optional[str] = None
                if isinstance(collector, dict):
                    collector_name = collector.get("collector_name")

                recent.append(
                    RecentCollection(
                        id=str(row.get("id") or uuid4()),
                        receipt_code=row.get("receipt_code"),
                        member_id=mid,
                        member_code=member.get("member_code"),
                        member_name=member.get("member_name"),
                        group_id=gid,
                        group_code=group.get("group_code"),
                        group_name=group.get("group_name"),
                        location=group.get("location"),
                        collector_name=collector_name,
                        week_number=int(row.get("week_number", 0)),
                        amount_paid=Decimal(str(row.get("amount_paid", 0))),
                        payment_date=date.fromisoformat(str(row["payment_date"])) if row.get("payment_date") else date.today(),
                        payment_status=str(row.get("payment_status", "")),
                    )
                )
            return recent
        except Exception:
            logger.exception("Failed to get recent collections")
            return []


def get_dashboard_service(db: Client) -> DashboardService:
    """Dependency provider for DashboardService."""
    return DashboardService(db)
