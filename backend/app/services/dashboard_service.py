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
from datetime import date
from decimal import Decimal
from typing import Optional

from supabase import Client

from app.schemas.dashboard import DashboardResponse, GroupLocationSummary, RecentCollection

logger = logging.getLogger(__name__)

RECENT_COLLECTIONS_LIMIT = 10


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

    def get_summary(self) -> DashboardResponse:
        """
        Build and return the complete dashboard summary.
        Each sub-method isolates a logical concern and handles its own
        failures gracefully so one bad table never breaks the whole dashboard.
        """
        today = date.today()

        # ── Monetary totals ───────────────────────────────────────────────────
        total_cash_in = self._get_total_cash_in()
        total_cash_out = self._get_total_cash_out()
        available_cash = total_cash_in - total_cash_out  # Formula 11
        todays_collection = self._get_todays_collection(today)
        total_disbursement = total_cash_out  # cash_given = actual cash handed to members
        total_loan_amount = self._get_total_loan_amount()  # loan principal (before note deduction)
        total_note_cost = self._get_total_note_cost()      # note cost collected upfront as income
        total_outstanding = self._get_total_outstanding()

        # ── Count metrics ─────────────────────────────────────────────────────
        active_groups, total_groups = self._get_group_counts()
        active_members, total_members = self._get_member_counts()

        # ── Location breakdown (active groups only) ───────────────────────────
        groups_by_location = self._get_groups_by_location()

        # ── Recent collections ────────────────────────────────────────────────
        recent_collections = self._get_recent_collections()

        return DashboardResponse(
            available_cash=available_cash,
            total_cash_in=total_cash_in,
            total_cash_out=total_cash_out,
            todays_collection=todays_collection,
            total_disbursement=total_disbursement,
            total_loan_amount=total_loan_amount,
            total_note_cost=total_note_cost,
            total_outstanding=total_outstanding,
            active_groups=active_groups,
            active_members=active_members,
            total_groups=total_groups,
            total_members=total_members,
            groups_by_location=groups_by_location,
            recent_collections=recent_collections,
        )

    # ── Private helpers ───────────────────────────────────────────────────────

    def _get_total_cash_in(self) -> Decimal:
        """
        Formula 11 (Cash In component):
        Cash In = SUM(collections.amount_paid WHERE payment_status = 'Paid')

        Per docs/04_ACCOUNTING_RULES.md — Cash Summary:
        "Cash In = Total Weekly Collections"
        """
        try:
            res = (
                self.db.table("collections")
                .select("amount_paid")
                .eq("payment_status", "Paid")
                .execute()
            )
            return sum(
                (Decimal(str(row["amount_paid"])) for row in (res.data or [])),
                Decimal("0.00"),
            )
        except Exception:
            logger.exception("Failed to compute total_cash_in")
            return Decimal("0.00")

    def _get_total_cash_out(self) -> Decimal:
        """
        Formula 11 (Cash Out component) + Formula 17:
        Cash Out = SUM(loan_transactions.cash_given)

        Per docs/04_ACCOUNTING_RULES.md — Cash Summary:
        "Cash Out = Total Loan Disbursements"

        Per docs/05_BUSINESS_FORMULAS.md — Formula 17:
        "Total Cash Disbursed = Cash Given Per Member × Current Number of Members"
        (We use the actual sum of recorded transactions, not a formula recalculation.)
        """
        try:
            res = (
                self.db.table("loan_transactions")
                .select("cash_given")
                .execute()
            )
            return sum(
                (Decimal(str(row["cash_given"])) for row in (res.data or [])),
                Decimal("0.00"),
            )
        except Exception:
            logger.exception("Failed to compute total_cash_out")
            return Decimal("0.00")

    def _get_todays_collection(self, today: date) -> Decimal:
        """
        Today's Collection:
        SUM(collections.amount_paid WHERE payment_date = today AND payment_status = 'Paid')
        """
        try:
            res = (
                self.db.table("collections")
                .select("amount_paid")
                .eq("payment_date", today.isoformat())
                .eq("payment_status", "Paid")
                .execute()
            )
            return sum(
                (Decimal(str(row["amount_paid"])) for row in (res.data or [])),
                Decimal("0.00"),
            )
        except Exception:
            logger.exception("Failed to compute todays_collection")
            return Decimal("0.00")


    def _get_total_loan_amount(self) -> Decimal:
        """
        Formula 16 / Dashboard accounting:
        Total Loan Amount = SUM(loan_transactions.loan_amount)

        This is the PRINCIPAL issued to members (e.g. 10,000 per member).
        It differs from total_cash_out which is SUM(cash_given) = loan_amount - note_cost.

        Per docs/04_ACCOUNTING_RULES.md:
          Loan Amount 10,000 | Note Cost 100 | Cash Given 9,900
          => The business ISSUED 10,000 in loan principal, though only 9,900 left the vault.
        """
        try:
            res = (
                self.db.table("loan_transactions")
                .select("loan_amount")
                .execute()
            )
            return sum(
                (Decimal(str(row["loan_amount"])) for row in (res.data or [])),
                Decimal("0.00"),
            )
        except Exception:
            logger.exception("Failed to compute total_loan_amount")
            return Decimal("0.00")

    def _get_total_note_cost(self) -> Decimal:
        """
        Total Note Cost = SUM(loan_transactions.note_cost)

        Note cost is deducted before disbursement and recognised immediately
        as business income (per 04_ACCOUNTING_RULES.md - Note Cost Deduction).
        """
        try:
            res = (
                self.db.table("loan_transactions")
                .select("note_cost")
                .execute()
            )
            return sum(
                (Decimal(str(row["note_cost"])) for row in (res.data or [])),
                Decimal("0.00"),
            )
        except Exception:
            logger.exception("Failed to compute total_note_cost")
            return Decimal("0.00")

    def _get_total_outstanding(self) -> Decimal:
        """
        Formula 5 (Per Member):  Outstanding = remaining_installments × weekly_installment
        Formula 19 (Group):      Group Outstanding = Sum of Outstanding for all active members
        Dashboard:               Total Outstanding = Sum of Group Outstanding for all active groups

        Algorithm:
        1. Fetch all active loan_cycles (members with status Active).
        2. For each cycle, get scheme (weekly_installment, total_weeks).
        3. Count paid collections for that cycle.
        4. remaining = total_weeks − paid_count
        5. outstanding = remaining × weekly_installment

        Only Active loan cycles contribute to outstanding.
        Completed/Closed cycles have zero remaining.

        Per docs/04_ACCOUNTING_RULES.md:
        "Outstanding is calculated dynamically.
         Outstanding = Remaining Installments × Weekly Installment"
        """
        try:
            # Fetch active loan cycles with their scheme data
            cycles_res = (
                self.db.table("loan_cycles")
                .select("id, member_id, scheme_id, status, scheme:schemes(weekly_installment, total_weeks)")
                .eq("status", "Active")
                .execute()
            )
            cycles = cycles_res.data or []
            if not cycles:
                return Decimal("0.00")

            # Bulk fetch paid collection counts for all these cycles
            cycle_ids = [str(c["id"]) for c in cycles]
            paid_res = (
                self.db.table("collections")
                .select("loan_cycle_id")
                .in_("loan_cycle_id", cycle_ids)
                .eq("payment_status", "Paid")
                .execute()
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
        except Exception:
            logger.exception("Failed to compute total_outstanding")
            return Decimal("0.00")

    def _get_group_counts(self) -> tuple[int, int]:
        """Returns (active_groups, total_groups)."""
        try:
            res = self.db.table("groups").select("status").execute()
            all_groups = res.data or []
            active = sum(1 for g in all_groups if g.get("status") == "Active")
            return active, len(all_groups)
        except Exception:
            logger.exception("Failed to get group counts")
            return 0, 0

    def _get_member_counts(self) -> tuple[int, int]:
        """Returns (active_members, total_members)."""
        try:
            res = self.db.table("members").select("status").execute()
            all_members = res.data or []
            active = sum(1 for m in all_members if m.get("status") == "Active")
            return active, len(all_members)
        except Exception:
            logger.exception("Failed to get member counts")
            return 0, 0

    def _get_groups_by_location(self) -> list[GroupLocationSummary]:
        """
        Active groups grouped by location with their active member counts.
        Only Active groups are included per the dashboard spec.
        """
        try:
            # Fetch all active groups
            groups_res = (
                self.db.table("groups")
                .select("id, location")
                .eq("status", "Active")
                .execute()
            )
            groups = groups_res.data or []
            if not groups:
                return []

            # Fetch active members grouped by group_id
            group_ids = [str(g["id"]) for g in groups]
            members_res = (
                self.db.table("members")
                .select("group_id")
                .in_("group_id", group_ids)
                .eq("status", "Active")
                .execute()
            )
            # Build member count per group
            member_count_by_group: dict[str, int] = {}
            for m in (members_res.data or []):
                gid = str(m["group_id"])
                member_count_by_group[gid] = member_count_by_group.get(gid, 0) + 1

            # Aggregate by location
            location_map: dict[str, dict] = {}
            for g in groups:
                loc = (g.get("location") or "Unknown").strip() or "Unknown"
                if loc not in location_map:
                    location_map[loc] = {"active_groups": 0, "active_members": 0}
                location_map[loc]["active_groups"] += 1
                location_map[loc]["active_members"] += member_count_by_group.get(
                    str(g["id"]), 0
                )

            return [
                GroupLocationSummary(
                    location=loc,
                    active_groups=data["active_groups"],
                    active_members=data["active_members"],
                )
                for loc, data in sorted(location_map.items())
            ]
        except Exception:
            logger.exception("Failed to get groups by location")
            return []

    def _get_recent_collections(self) -> list[RecentCollection]:
        """
        Returns the latest RECENT_COLLECTIONS_LIMIT paid collection records
        enriched with member name, group name, location, and collector name.
        """
        try:
            # Fetch latest paid collections
            res = (
                self.db.table("collections")
                .select("id, receipt_code, member_id, group_id, loan_cycle_id, week_number, amount_paid, payment_date, payment_status, collector:collectors(collector_name)")
                .eq("payment_status", "Paid")
                .order("payment_date", desc=True)
                .order("created_at", desc=True)
                .limit(RECENT_COLLECTIONS_LIMIT)
                .execute()
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
                m_res = (
                    self.db.table("members")
                    .select("id, member_name, member_code")
                    .in_("id", member_ids)
                    .execute()
                )
                member_map = {str(m["id"]): m for m in (m_res.data or [])}

            # Fetch groups
            group_map: dict[str, dict] = {}
            if group_ids:
                g_res = (
                    self.db.table("groups")
                    .select("id, group_name, location, group_code")
                    .in_("id", group_ids)
                    .execute()
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
                        id=str(row["id"]),
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
                        amount_paid=Decimal(str(row["amount_paid"])),
                        payment_date=date.fromisoformat(str(row["payment_date"])),
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
