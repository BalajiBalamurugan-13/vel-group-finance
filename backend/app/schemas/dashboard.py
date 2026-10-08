"""
VEL Finance — Dashboard Schemas
================================
Pydantic response models for GET /api/v1/dashboard.

Per docs/07_API_SPECIFICATION.md — Module 7, Dashboard Summary.
All monetary fields use Decimal to preserve financial precision.
No float arithmetic anywhere in these models.
"""
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class GroupLocationSummary(BaseModel):
    """Active group count per business location."""

    location: str
    active_groups: int
    active_members: int


class RecentCollection(BaseModel):
    """
    A single recent paid collection record for dashboard display.
    Per docs/04_ACCOUNTING_RULES.md — Weekly Collection Rules.
    """

    id: str
    receipt_code: Optional[str] = None
    member_id: str
    member_code: Optional[str] = None
    member_name: Optional[str] = None
    group_id: str
    group_code: Optional[str] = None
    group_name: Optional[str] = None
    location: Optional[str] = None
    collector_name: Optional[str] = None
    week_number: int
    amount_paid: Decimal = Field(decimal_places=2)
    payment_date: date
    payment_status: str

    model_config = {}


class DashboardResponse(BaseModel):
    """
    Complete dashboard summary response.

    Financial formulas (docs/05_BUSINESS_FORMULAS.md):
    - Formula 11: Current Cash = Cash In − Cash Out
      Cash In  = Total Paid Collections
      Cash Out = Total Loan Cash Given (cash_given)
    - Formula 5:  Outstanding Per Member = remaining_installments × weekly_installment
    - Formula 19: Group Outstanding = Sum of active members' outstanding

    Per docs/04_ACCOUNTING_RULES.md:
    - Cash In  = Total Weekly Collections
    - Cash Out = Total Loan Disbursements
    """

    # ── Cash Position ─────────────────────────────────────────────────────────
    available_cash: Decimal = Field(
        decimal_places=2,
        description="Total Cash In − Total Loan Cash Given + Migration Offset (Formula 11)",
    )
    total_cash_in: Decimal = Field(
        decimal_places=2,
        description="SUM of all Paid collections + Owner Investments",
    )
    total_cash_out: Decimal = Field(
        decimal_places=2,
        description="SUM of all loan_transactions.cash_given",
    )
    total_investment: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="SUM of all owner capital investments added",
    )
    total_collection: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="SUM of all Paid collections",
    )
    migration_offset: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="Migration calibration offset applied to zero historical balance",
    )
    is_migration_completed: bool = Field(
        default=False,
        description="Whether initial customer/group migration has been completed",
    )

    # ── Today's Activity ──────────────────────────────────────────────────────
    todays_collection: Decimal = Field(
        decimal_places=2,
        description="SUM(amount_paid WHERE payment_date=today AND status=Paid)",
    )
    todays_collection_count: int = Field(
        default=0,
        description="COUNT(collections WHERE payment_date=today AND status=Paid)",
    )

    # ── Weekly Activity (Consolidated) ────────────────────────────────────────
    weekly_expected: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="Expected weekly collection across all active groups",
    )
    weekly_collected: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="Actual weekly collections paid this business week",
    )
    weekly_pending: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="Pending weekly collection across all active groups",
    )
    weekly_progress: float = Field(
        default=0.0,
        description="Weekly collection progress percentage (0 - 100)",
    )

    # ── Loan Totals ───────────────────────────────────────────────────────────
    total_disbursement: Decimal = Field(
        decimal_places=2,
        description="SUM(loan_transactions.cash_given) — actual cash handed to members (net of note cost)",
    )
    total_loan_amount: Decimal = Field(
        decimal_places=2,
        description="SUM(loan_transactions.loan_amount) — gross loan principal issued (Formula 16)",
    )
    total_note_cost: Decimal = Field(
        decimal_places=2,
        description="SUM(loan_transactions.note_cost) — note cost income recognised on disbursement",
    )
    total_outstanding: Decimal = Field(
        decimal_places=2,
        description="SUM over active loan cycles: remaining_installments × weekly_installment (Formula 5/19)",
    )

    # ── Count Metrics ─────────────────────────────────────────────────────────
    active_groups: int = Field(description="COUNT(groups WHERE status=Active)")
    active_members: int = Field(description="COUNT(members WHERE status=Active)")
    total_groups: int = Field(description="COUNT(all groups)")
    total_members: int = Field(description="COUNT(all members)")

    # ── Location Breakdown ────────────────────────────────────────────────────
    groups_by_location: list[GroupLocationSummary] = Field(
        default_factory=list,
        description="Active groups and members grouped by location",
    )

    # ── Recent Collections ────────────────────────────────────────────────────
    recent_collections: list[RecentCollection] = Field(
        default_factory=list,
        description="Latest 10 paid collection records for quick visibility",
    )

    model_config = {}


class MigrationStatusResponse(BaseModel):
    """Status of the pre-migration calibration offset."""
    completed: bool = Field(description="Whether initial migration calibration has been completed")
    completed_at: Optional[str] = Field(default=None, description="Timestamp when migration was completed")
    offset_amount: Decimal = Field(default=Decimal("0.00"), description="Applied migration offset amount")
    current_balance: Decimal = Field(default=Decimal("0.00"), description="Current Available Cash balance")


class CompleteMigrationResponse(BaseModel):
    """Response returned upon completing or recalibrating initial migration."""
    message: str = Field(description="Confirmation message")
    offset_amount: Decimal = Field(description="Calculated migration offset amount to zero balance")
    completed_at: str = Field(description="Timestamp of completion")
