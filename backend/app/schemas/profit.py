"""
VEL Finance — Profit & Loan Risk Schemas
========================================
Schemas for Contractual Profit, Weekly Financial Information, and Loan Risk.
Per 13_Accounting_Profit_Loan_Risk_Model_Specification.md.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProfitSummary(BaseModel):
    """
    Contractual profit and overall financial model metrics.
    Separate from cash-in/cash-out.
    """
    total_owner_investment: Decimal = Decimal("0.00")
    total_initial_investment: Decimal = Decimal("0.00")
    total_additional_investment: Decimal = Decimal("0.00")

    # Loan Capital
    total_loan_capital_deployed: Decimal = Decimal("0.00")
    total_contractual_repayment: Decimal = Decimal("0.00")
    total_contractual_profit: Decimal = Decimal("0.00")

    # Cash Collections
    total_actual_collections: Decimal = Decimal("0.00")
    total_outstanding: Decimal = Decimal("0.00")

    # Principal Recovery (Section 21)
    principal_recovered: Decimal = Decimal("0.00")
    principal_remaining: Decimal = Decimal("0.00")

    # Counts
    total_groups_count: int = 0
    total_members_count: int = 0
    active_loan_cycles_count: int = 0
    groups_by_funding_source: Dict[str, int] = Field(default_factory=dict)


class GroupCreationSummary(BaseModel):
    id: UUID
    group_name: str
    group_code: Optional[str] = None
    location: str
    funding_source: str
    member_count: int = 0
    loan_capital: Decimal = Decimal("0.00")


class WeeklyFinancialBreakdown(BaseModel):
    """
    Summary for a single Sunday-based business week.
    Per Section 23.
    """
    week_number: int
    start_date: date
    end_date: date

    # Investment that week
    initial_investment: Decimal = Decimal("0.00")
    additional_investment: Decimal = Decimal("0.00")
    total_investment: Decimal = Decimal("0.00")

    # Business growth that week
    groups_created_count: int = 0
    groups_created: List[GroupCreationSummary] = []
    members_added_count: int = 0
    loan_capital_deployed: Decimal = Decimal("0.00")
    funding_source_breakdown: Dict[str, int] = Field(default_factory=dict)

    # Collections that week
    expected_collection: Decimal = Decimal("0.00")
    actual_collection: Decimal = Decimal("0.00")
    collection_gap: Decimal = Decimal("0.00")

    # Contractual profit from loans initiated that week
    contractual_profit: Decimal = Decimal("0.00")


class LoanRiskMember(BaseModel):
    """
    Overdue/At-Risk member details for the dedicated Loan Risk page.
    Per Section 18 & 19.
    """
    member_id: UUID
    member_code: Optional[str] = None
    member_name: str
    phone_number: str
    group_id: UUID
    group_code: Optional[str] = None
    group_name: str
    location: str
    scheme_name: str
    loan_amount: Decimal
    weekly_installment: Decimal
    total_weeks: int
    joined_week: int
    expected_weeks_paid: int
    actual_weeks_paid: int
    weeks_overdue: int
    overdue_amount: Decimal
    outstanding_amount: Decimal
    total_paid_amount: Decimal
    last_payment_date: Optional[date] = None
    risk_status: str  # "Current", "Overdue", "At Risk" (NO Loan Loss auto-assigned)


class LoanRiskSummary(BaseModel):
    """
    Overall loan risk summary and list of all members.
    """
    total_members_analyzed: int = 0
    current_count: int = 0
    overdue_count: int = 0
    at_risk_count: int = 0
    total_overdue_amount: Decimal = Decimal("0.00")
    total_outstanding_amount: Decimal = Decimal("0.00")
    members: List[LoanRiskMember] = []
