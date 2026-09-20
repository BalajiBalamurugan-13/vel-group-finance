"""
VEL Finance — Profit Service
============================
Service layer for Contractual Profit and Weekly Financial Information.
Per 13_Accounting_Profit_Loan_Risk_Model_Specification.md.
"""
from datetime import date, datetime
from decimal import Decimal
import logging
from typing import Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.core.business_week import (
    get_business_week,
    get_current_business_week,
    get_week_start_date,
    get_week_end_date,
)
from app.services.investment_service import InvestmentService
from app.schemas.profit import (
    GroupCreationSummary,
    ProfitSummary,
    WeeklyFinancialBreakdown,
)

logger = logging.getLogger(__name__)


class ProfitService:
    def __init__(self, db: Client):
        self.db = db
        self.investment_service = InvestmentService(db)

    def get_profit_summary(self) -> ProfitSummary:
        """
        Aggregates contractual profit and business performance metrics.
        Distinguishes Owner Investment, Recycled Collections, Loan Economics,
        and Cash Collections.
        """
        # 1. Owner Investments (Sections 4 & 5)
        inv_summary = self.investment_service.get_summary()
        total_initial = inv_summary["total_initial_investment"]
        total_additional = inv_summary["total_additional_investment"]
        total_owner = inv_summary["total_owner_investment"]

        # 2. Groups & Funding Source Breakdown (Section 8)
        try:
            groups_res = self.db.table("groups").select("id, start_date, created_at, funding_source, status").execute()
            groups_data = groups_res.data or []
        except Exception:
            try:
                groups_res = self.db.table("groups").select("id, start_date, created_at, status").execute()
                groups_data = groups_res.data or []
            except Exception:
                groups_data = []

        total_groups_count = len(groups_data)
        funding_sources: Dict[str, int] = {
            "Initial Investment": 0,
            "Additional Investment": 0,
            "Recycled Collections": 0,
        }
        for g in groups_data:
            fs = g.get("funding_source")
            if not fs:
                # Per Section 8: Groups starting in Week 1 (9 Aug 2026) were created with Initial Investment
                s_date = g.get("start_date") or g.get("created_at")
                if s_date:
                    try:
                        d = date.fromisoformat(str(s_date)[:10])
                        if get_business_week(d) == 1 or d <= date(2026, 8, 15):
                            fs = "Initial Investment"
                        else:
                            fs = "Recycled Collections"
                    except Exception:
                        fs = "Initial Investment"
                else:
                    fs = "Initial Investment"
            funding_sources[fs] = funding_sources.get(fs, 0) + 1

        # 3. Loan Cycles & Contractual Profit (Sections 10, 11, 13)
        # Contractual Repayment = weekly_installment × total_weeks
        # Contractual Profit = Contractual Repayment − loan_amount
        try:
            cycles_res = (
                self.db.table("loan_cycles")
                .select(
                    "id, member_id, group_id, status, "
                    "scheme:schemes(loan_amount, weekly_installment, total_weeks)"
                )
                .execute()
            )
            cycles_data = cycles_res.data or []
        except Exception:
            cycles_data = []

        total_loan_capital_deployed = Decimal("0.00")
        total_contractual_repayment = Decimal("0.00")
        total_contractual_profit = Decimal("0.00")
        active_cycles_count = 0

        # Cycle ID to loan amount & scheme info mapping
        cycle_info: Dict[str, dict] = {}

        for c in cycles_data:
            scheme = c.get("scheme")
            if not scheme:
                continue
            cid = str(c["id"])
            loan_amt = Decimal(str(scheme.get("loan_amount") or "0.00"))
            installment = Decimal(str(scheme.get("weekly_installment") or "0.00"))
            weeks = int(scheme.get("total_weeks") or 0)
            repayment = installment * Decimal(weeks)
            profit = repayment - loan_amt

            cycle_info[cid] = {
                "loan_amount": loan_amt,
                "weekly_installment": installment,
                "total_weeks": weeks,
                "status": c.get("status"),
            }

            total_loan_capital_deployed += loan_amt
            total_contractual_repayment += repayment
            total_contractual_profit += profit

            if c.get("status") == "Active":
                active_cycles_count += 1

        # 4. Actual Collections & Principal Recovery (Sections 14 & 21)
        try:
            collections_res = (
                self.db.table("collections")
                .select("loan_cycle_id, amount_paid, payment_status")
                .eq("payment_status", "Paid")
                .execute()
            )
            collections_data = collections_res.data or []
        except Exception:
            collections_data = []

        total_actual_collections = Decimal("0.00")
        cycle_paid_amounts: Dict[str, Decimal] = {}
        cycle_paid_counts: Dict[str, int] = {}

        for col in collections_data:
            cid = str(col.get("loan_cycle_id"))
            amt = Decimal(str(col.get("amount_paid") or "0.00"))
            total_actual_collections += amt

            cycle_paid_amounts[cid] = cycle_paid_amounts.get(cid, Decimal("0.00")) + amt
            cycle_paid_counts[cid] = cycle_paid_counts.get(cid, 0) + 1

        # Calculate Total Outstanding for active cycles (remaining weeks × weekly_installment)
        total_outstanding = Decimal("0.00")
        for cid, info in cycle_info.items():
            if info["status"] == "Active":
                paid_count = cycle_paid_counts.get(cid, 0)
                remaining_weeks = max(0, info["total_weeks"] - paid_count)
                total_outstanding += Decimal(remaining_weeks) * info["weekly_installment"]

        # Calculate Principal Recovery per Section 21
        principal_recovered = Decimal("0.00")
        for cid, info in cycle_info.items():
            paid_amount = cycle_paid_amounts.get(cid, Decimal("0.00"))
            principal = info["loan_amount"]
            principal_recovered += min(principal, paid_amount)

        principal_remaining = max(
            Decimal("0.00"), total_loan_capital_deployed - principal_recovered
        )

        # 5. Members count — derive from already-fetched cycles data
        # (avoids an extra SELECT id FROM members round-trip)
        unique_member_ids = {str(c.get("member_id")) for c in cycles_data if c.get("member_id")}
        total_members_count = len(unique_member_ids)

        return ProfitSummary(
            total_owner_investment=total_owner,
            total_initial_investment=total_initial,
            total_additional_investment=total_additional,
            total_loan_capital_deployed=total_loan_capital_deployed,
            total_contractual_repayment=total_contractual_repayment,
            total_contractual_profit=total_contractual_profit,
            total_actual_collections=total_actual_collections,
            total_outstanding=total_outstanding,
            principal_recovered=principal_recovered,
            principal_remaining=principal_remaining,
            total_groups_count=total_groups_count,
            total_members_count=total_members_count,
            active_loan_cycles_count=active_cycles_count,
            groups_by_funding_source=funding_sources,
        )

    def get_weekly_breakdown(self, max_weeks: Optional[int] = None) -> List[WeeklyFinancialBreakdown]:
        """
        Returns weekly financial performance for each Sunday-based business week.
        Per Section 23.
        """
        current_week = get_current_business_week()
        limit_week = max_weeks if (max_weeks and max_weeks > 0) else max(current_week, 1)

        # 1. Fetch all investments
        investments = self.investment_service.get_investments()
        inv_by_week: Dict[int, List[dict]] = {}
        for inv in investments:
            w = inv["business_week"]
            inv_by_week.setdefault(w, []).append(inv)

        # 2. Fetch all groups with schemes and members
        try:
            groups_res = (
                self.db.table("groups")
                .select("*, scheme:schemes(*), members(id, status)")
                .execute()
            )
            groups = groups_res.data or []
        except Exception:
            groups = []

        groups_by_week: Dict[int, List[dict]] = {}
        for g in groups:
            # Map group to business week by start_date or created_at
            raw_date = g.get("start_date") or g.get("created_at")
            if raw_date:
                if isinstance(raw_date, str):
                    d = date.fromisoformat(raw_date[:10])
                else:
                    d = raw_date
                w = get_business_week(d)
            else:
                w = 1
            groups_by_week.setdefault(w, []).append(g)

        # 3. Fetch all members
        try:
            members_res = self.db.table("members").select("id, joined_week, created_at").execute()
            members = members_res.data or []
        except Exception:
            members = []

        members_by_week: Dict[int, int] = {}
        for m in members:
            jw = m.get("joined_week")
            if jw and isinstance(jw, int) and jw > 0:
                members_by_week[jw] = members_by_week.get(jw, 0) + 1
            elif m.get("created_at"):
                d = date.fromisoformat(str(m["created_at"])[:10])
                w = get_business_week(d)
                members_by_week[w] = members_by_week.get(w, 0) + 1

        # 4. Fetch collections
        try:
            colls_res = (
                self.db.table("collections")
                .select("amount_paid, payment_date, week_number, payment_status")
                .execute()
            )
            collections = colls_res.data or []
        except Exception:
            collections = []

        actual_collections_by_week: Dict[int, Decimal] = {}
        for c in collections:
            if c.get("payment_status") == "Paid":
                amt = Decimal(str(c.get("amount_paid") or "0.00"))
                # If collection has payment_date, map via business week
                p_date = c.get("payment_date")
                if p_date:
                    d = date.fromisoformat(str(p_date)[:10])
                    w = get_business_week(d)
                else:
                    w = int(c.get("week_number") or 1)
                actual_collections_by_week[w] = (
                    actual_collections_by_week.get(w, Decimal("0.00")) + amt
                )

        # 5. Fetch loan cycles with scheme for loan capital and contractual profit
        try:
            cycles_res = (
                self.db.table("loan_cycles")
                .select("id, start_date, created_at, scheme:schemes(loan_amount, weekly_installment, total_weeks)")
                .execute()
            )
            cycles = cycles_res.data or []
        except Exception:
            cycles = []

        capital_by_week: Dict[int, Decimal] = {}
        profit_by_week: Dict[int, Decimal] = {}
        expected_coll_by_week: Dict[int, Decimal] = {}

        for c in cycles:
            scheme = c.get("scheme")
            if not scheme:
                continue
            loan_amt = Decimal(str(scheme.get("loan_amount") or "0.00"))
            installment = Decimal(str(scheme.get("weekly_installment") or "0.00"))
            total_weeks = int(scheme.get("total_weeks") or 0)
            contractual_repayment = installment * Decimal(total_weeks)
            contractual_profit = contractual_repayment - loan_amt

            # Map loan cycle to business week based on start_date (or created_at)
            date_raw = c.get("start_date") or c.get("created_at")
            if date_raw:
                d = date.fromisoformat(str(date_raw)[:10])
                w = get_business_week(d)
            else:
                w = 1

            capital_by_week[w] = capital_by_week.get(w, Decimal("0.00")) + loan_amt
            profit_by_week[w] = profit_by_week.get(w, Decimal("0.00")) + contractual_profit

            # Every active week of this loan adds to expected collections for that week
            for wk_offset in range(total_weeks):
                active_week = w + wk_offset
                expected_coll_by_week[active_week] = (
                    expected_coll_by_week.get(active_week, Decimal("0.00")) + installment
                )

        # Build list for weeks 1 through limit_week
        breakdown: List[WeeklyFinancialBreakdown] = []

        for w in range(1, limit_week + 1):
            w_start = get_week_start_date(w)
            w_end = get_week_end_date(w)

            # Investments
            week_invs = inv_by_week.get(w, [])
            init_inv = sum(
                (inv["amount"] for inv in week_invs if inv["investment_type"] == "Initial"),
                Decimal("0.00"),
            )
            if w == 1 and init_inv == Decimal("0.00"):
                init_inv = inv_summary["total_initial_investment"]

            add_inv = sum(
                (inv["amount"] for inv in week_invs if inv["investment_type"] == "Additional"),
                Decimal("0.00"),
            )
            tot_inv = init_inv + add_inv

            # Groups created this week
            week_groups = groups_by_week.get(w, [])
            groups_created_summaries: List[GroupCreationSummary] = []
            funding_breakdown: Dict[str, int] = {}

            for g in week_groups:
                fs = g.get("funding_source")
                if not fs:
                    s_date = g.get("start_date") or g.get("created_at")
                    if s_date:
                        try:
                            d = date.fromisoformat(str(s_date)[:10])
                            if get_business_week(d) == 1 or d <= date(2026, 8, 15):
                                fs = "Initial Investment"
                            else:
                                fs = "Recycled Collections"
                        except Exception:
                            fs = "Initial Investment"
                    else:
                        fs = "Initial Investment"
                funding_breakdown[fs] = funding_breakdown.get(fs, 0) + 1

                # Active member count
                members_list = g.get("members") or []
                active_m_count = sum(1 for m in members_list if m.get("status") == "Active")

                scheme = g.get("scheme") or {}
                scheme_loan_amt = Decimal(str(scheme.get("loan_amount") or "10000.00"))
                # Section 9: Group Capital Requirement = full loan amount × member count
                group_loan_capital = scheme_loan_amt * Decimal(active_m_count)

                groups_created_summaries.append(
                    GroupCreationSummary(
                        id=g["id"],
                        group_name=g["group_name"],
                        group_code=g.get("group_code"),
                        location=g.get("location") or "",
                        funding_source=fs,
                        member_count=active_m_count,
                        loan_capital=group_loan_capital,
                    )
                )

            # Collections
            expected_c = expected_coll_by_week.get(w, Decimal("0.00"))
            actual_c = actual_collections_by_week.get(w, Decimal("0.00"))
            collection_gap = max(Decimal("0.00"), expected_c - actual_c)

            breakdown.append(
                WeeklyFinancialBreakdown(
                    week_number=w,
                    start_date=w_start,
                    end_date=w_end,
                    initial_investment=init_inv,
                    additional_investment=add_inv,
                    total_investment=tot_inv,
                    groups_created_count=len(week_groups),
                    groups_created=groups_created_summaries,
                    members_added_count=members_by_week.get(w, 0),
                    loan_capital_deployed=capital_by_week.get(w, Decimal("0.00")),
                    funding_source_breakdown=funding_breakdown,
                    expected_collection=expected_c,
                    actual_collection=actual_c,
                    collection_gap=collection_gap,
                    contractual_profit=profit_by_week.get(w, Decimal("0.00")),
                )
            )

        return breakdown


def get_profit_service(db: Client) -> ProfitService:
    return ProfitService(db)
