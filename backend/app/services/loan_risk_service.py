"""
VEL Finance — Loan Risk Service
===============================
Service layer for identifying Overdue and At-Risk customer loans.
Per 13_Accounting_Profit_Loan_Risk_Model_Specification.md (Sections 17-20).

Risk Flow:
  Current  (0 weeks overdue)
     ↓
  Overdue  (1-3 weeks overdue)
     ↓
  At Risk  (4+ weeks overdue)
     ↓
  Loan Loss (Not auto-assigned — awaiting future business decision per Section 18)
"""
from datetime import date
from decimal import Decimal
import logging
from typing import List, Optional
from uuid import UUID

from supabase import Client

from app.core.business_week import get_business_week, get_current_business_week
from app.schemas.profit import LoanRiskMember, LoanRiskSummary

logger = logging.getLogger(__name__)


class LoanRiskService:
    def __init__(self, db: Client):
        self.db = db

    def get_loan_risk_analysis(
        self,
        group_id: Optional[UUID] = None,
        risk_status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> LoanRiskSummary:
        """
        Calculates overdue weeks and risk classification for all members with active loans.
        Overdue ≠ Loan Loss (Section 15 & 18).
        """
        today = date.today()
        current_b_week = get_current_business_week()

        # 1. Fetch active members with joined group and scheme
        try:
            m_query = self.db.table("members").select(
                "id, member_code, member_name, phone_number, joined_week, status, group_id, "
                "group:groups(id, group_code, group_name, location, start_date, "
                "scheme:schemes(scheme_name, loan_amount, weekly_installment, total_weeks))"
            ).eq("status", "Active")

            if group_id:
                m_query = m_query.eq("group_id", str(group_id))

            members_res = m_query.execute()
            active_members = members_res.data or []
        except Exception as e:
            logger.error("Failed to query active members for risk analysis: %s", e)
            active_members = []

        if not active_members:
            return LoanRiskSummary()

        member_ids = [str(m["id"]) for m in active_members]

        # 2. Fetch active loan cycles for these members
        try:
            cycles_res = (
                self.db.table("loan_cycles")
                .select("id, member_id, group_id, status")
                .in_("member_id", member_ids)
                .eq("status", "Active")
                .execute()
            )
            cycles = cycles_res.data or []
        except Exception as e:
            logger.error("Failed to query active loan cycles: %s", e)
            cycles = []

        # Map member_id -> cycle_id
        member_cycle_map: dict[str, str] = {
            str(c["member_id"]): str(c["id"]) for c in cycles
        }
        cycle_ids = [cid for cid in member_cycle_map.values() if cid]

        # 3. Bulk fetch all paid collections for these cycles
        cycle_collections: dict[str, list[dict]] = {}
        if cycle_ids:
            try:
                colls_res = (
                    self.db.table("collections")
                    .select("loan_cycle_id, amount_paid, payment_date")
                    .in_("loan_cycle_id", cycle_ids)
                    .eq("payment_status", "Paid")
                    .order("payment_date", desc=True)
                    .execute()
                )
                for col in (colls_res.data or []):
                    c_id = str(col.get("loan_cycle_id"))
                    cycle_collections.setdefault(c_id, []).append(col)
            except Exception as e:
                logger.error("Failed to query collections for risk analysis: %s", e)

        # 3. Analyze each member's loan
        members_risk: List[LoanRiskMember] = []
        current_count = 0
        overdue_count = 0
        at_risk_count = 0
        total_overdue_amount = Decimal("0.00")
        total_outstanding_amount = Decimal("0.00")

        for member in active_members:
            group = member.get("group")
            if not group:
                continue
            scheme = group.get("scheme")
            if not scheme:
                continue

            mid = str(member["id"])
            cid = member_cycle_map.get(mid)
            weekly_installment = Decimal(str(scheme.get("weekly_installment") or "0.00"))
            total_weeks = int(scheme.get("total_weeks") or 18)
            loan_amount = Decimal(str(scheme.get("loan_amount") or "10000.00"))
            joined_week = int(member.get("joined_week") or 1)

            # Expected weeks calculation
            # Based on group's start_date
            group_start_raw = group.get("start_date")
            if group_start_raw:
                if isinstance(group_start_raw, str):
                    g_start = date.fromisoformat(group_start_raw[:10])
                else:
                    g_start = group_start_raw
                g_start_week = get_business_week(g_start)
                elapsed_weeks = (current_b_week - g_start_week) + 1
            else:
                elapsed_weeks = 1

            if elapsed_weeks < 1:
                expected_weeks_paid = 0
            else:
                # Active weeks since member joined
                weeks_since_joined = max(0, elapsed_weeks - (joined_week - 1))
                expected_weeks_paid = min(total_weeks, weeks_since_joined)

            # Actual paid collections
            paid_list = cycle_collections.get(cid, [])
            actual_weeks_paid = len(paid_list)
            total_paid_amount = sum(
                (Decimal(str(p.get("amount_paid") or "0.00")) for p in paid_list),
                Decimal("0.00"),
            )

            # Last payment date
            last_payment_date: Optional[date] = None
            if paid_list and paid_list[0].get("payment_date"):
                p_date_raw = paid_list[0]["payment_date"]
                if isinstance(p_date_raw, str):
                    last_payment_date = date.fromisoformat(p_date_raw[:10])
                else:
                    last_payment_date = p_date_raw

            # Weeks overdue
            weeks_overdue = max(0, expected_weeks_paid - actual_weeks_paid)
            overdue_amt = Decimal(weeks_overdue) * weekly_installment

            # Outstanding = (total_weeks - actual_weeks_paid) * weekly_installment
            remaining_installments = max(0, total_weeks - actual_weeks_paid)
            outstanding_amt = Decimal(remaining_installments) * weekly_installment

            # Determine risk status per Section 18:
            # Current: 0 overdue
            # Overdue: 1 to 3 weeks overdue
            # At Risk: 4+ weeks overdue
            if weeks_overdue == 0:
                status_label = "Current"
                current_count += 1
            elif weeks_overdue <= 3:
                status_label = "Overdue"
                overdue_count += 1
            else:
                status_label = "At Risk"
                at_risk_count += 1

            total_overdue_amount += overdue_amt
            total_outstanding_amount += outstanding_amt

            # Filter matches
            if risk_status and risk_status.lower() != status_label.lower():
                continue

            if search:
                s_term = search.strip().lower()
                m_name = (member.get("member_name") or "").lower()
                m_code = (member.get("member_code") or "").lower()
                g_name = (group.get("group_name") or "").lower()
                if (
                    s_term not in m_name
                    and s_term not in m_code
                    and s_term not in g_name
                ):
                    continue

            members_risk.append(
                LoanRiskMember(
                    member_id=member["id"],
                    member_code=member.get("member_code"),
                    member_name=member["member_name"],
                    phone_number=member.get("phone_number") or "",
                    group_id=group["id"],
                    group_code=group.get("group_code"),
                    group_name=group["group_name"],
                    location=group.get("location") or "",
                    scheme_name=scheme.get("scheme_name") or "",
                    loan_amount=loan_amount,
                    weekly_installment=weekly_installment,
                    total_weeks=total_weeks,
                    joined_week=joined_week,
                    expected_weeks_paid=expected_weeks_paid,
                    actual_weeks_paid=actual_weeks_paid,
                    weeks_overdue=weeks_overdue,
                    overdue_amount=overdue_amt,
                    outstanding_amount=outstanding_amt,
                    total_paid_amount=total_paid_amount,
                    last_payment_date=last_payment_date,
                    risk_status=status_label,
                )
            )

        # Sort: At Risk first, then Overdue (descending weeks overdue), then Current
        status_priority = {"At Risk": 0, "Overdue": 1, "Current": 2}
        members_risk.sort(
            key=lambda m: (status_priority.get(m.risk_status, 9), -m.weeks_overdue, m.member_name)
        )

        return LoanRiskSummary(
            total_members_analyzed=len(cycles),
            current_count=current_count,
            overdue_count=overdue_count,
            at_risk_count=at_risk_count,
            total_overdue_amount=total_overdue_amount,
            total_outstanding_amount=total_outstanding_amount,
            members=members_risk,
        )


def get_loan_risk_service(db: Client) -> LoanRiskService:
    return LoanRiskService(db)
