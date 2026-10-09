from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class PaymentStatus(str, Enum):
    PAID = "Paid"
    PENDING = "Pending"
    PARTIAL = "Partial"
    WAIVED = "Waived"


class CollectionBase(BaseModel):
    """Base fields for weekly collection payment."""
    week_number: int = Field(..., ge=1)
    amount_paid: Decimal = Field(..., gt=0)
    payment_date: Optional[date] = None
    payment_status: PaymentStatus = PaymentStatus.PAID
    remarks: Optional[str] = None

    @field_validator("payment_date")
    @classmethod
    def validate_payment_date(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise ValueError("Payment date cannot be in the future.")
        return v


class CollectionCreate(CollectionBase):
    """Attributes required to record a weekly payment."""
    member_id: UUID
    collector_id: Optional[UUID] = None


class CollectionUpdate(BaseModel):
    """Attributes that can be updated for an existing weekly collection record."""
    amount_paid: Optional[Decimal] = Field(None, gt=0)
    payment_date: Optional[date] = None
    week_number: Optional[int] = Field(None, ge=1)
    payment_status: Optional[PaymentStatus] = None
    remarks: Optional[str] = None

    @field_validator("payment_date")
    @classmethod
    def validate_payment_date(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise ValueError("Payment date cannot be in the future.")
        return v


class BulkCollectionCreate(BaseModel):
    """Schema for recording a batch of collection payments (e.g. for an entire group)."""
    items: list[CollectionCreate] = Field(..., min_length=1)


class BulkCollectionResponse(BaseModel):
    """Response returned after recording a batch of collections."""
    total_recorded: int
    total_amount: Decimal
    collections: list[dict] = []
    errors: list[str] = []



class CollectionResponse(BaseModel):
    """Schema for returning Collection data with joined financial context."""
    id: UUID
    receipt_code: Optional[str] = None  # RCP-0001 — from migration 002
    loan_cycle_id: UUID
    member_id: UUID
    group_id: UUID
    collector_id: UUID
    week_number: int
    payment_date: date
    amount_paid: Decimal
    payment_status: PaymentStatus
    remarks: Optional[str] = None
    created_at: datetime

    # Contextual fields
    member_name: Optional[str] = None
    phone_number: Optional[str] = None
    group_name: Optional[str] = None
    location: Optional[str] = None
    collector_name: Optional[str] = None
    weekly_installment: Optional[Decimal] = None
    total_weeks: Optional[int] = None
    weeks_paid: Optional[int] = None
    remaining_installments: Optional[int] = None
    outstanding_amount: Optional[Decimal] = None
    completion_percentage: Optional[float] = None

    model_config = {"from_attributes": True}


class TodayCollectionSummary(BaseModel):
    """Summary of collections recorded today."""
    date: date
    total_collected: Decimal = Decimal("0.00")
    collection_count: int = 0
    collections: list[CollectionResponse] = []


class GroupWeeklySummary(BaseModel):
    """Weekly collection status for a single group."""
    group_id: UUID
    group_name: str
    location: str
    active_members: int
    weekly_installment: Decimal
    total_expected: Decimal
    total_collected: Decimal
    total_pending: Decimal
    completion_percentage: float
    full_cycle_expected: Optional[Decimal] = None
    full_cycle_collected: Optional[Decimal] = None
    full_cycle_pending: Optional[Decimal] = None
    full_cycle_progress: Optional[float] = None


class WeeklyCollectionSummary(BaseModel):
    """Summary of collections for the active week across groups."""
    total_expected: Decimal = Decimal("0.00")
    total_collected: Decimal = Decimal("0.00")
    total_pending: Decimal = Decimal("0.00")
    collection_count: int = 0
    full_cycle_expected: Optional[Decimal] = None
    full_cycle_collected: Optional[Decimal] = None
    full_cycle_pending: Optional[Decimal] = None
    groups_summary: list[GroupWeeklySummary] = []


class RecordWeekGroupBreakdown(BaseModel):
    group_id: UUID
    group_name: str
    location: Optional[str] = None
    active_members: int
    pending_members: int
    already_paid_members: int
    weekly_installment: Decimal
    pending_amount: Decimal


class RecordWeekPreviewResponse(BaseModel):
    business_week: int
    target_date: date
    week_start_date: date
    week_end_date: date
    total_active_members: int
    eligible_members_count: int
    already_paid_count: int
    total_expected_amount: Decimal
    total_pending_amount: Decimal
    total_already_paid_amount: Decimal
    groups: list[RecordWeekGroupBreakdown] = []


class RecordWeekRequest(BaseModel):
    payment_date: Optional[date] = None
    business_week: Optional[int] = None
    collector_id: Optional[UUID] = None
    group_ids: Optional[list[UUID]] = None
    remarks: Optional[str] = None


class RecordWeekResponse(BaseModel):
    business_week: int
    payment_date: date
    total_recorded: int
    total_amount: Decimal
    skipped_count: int
    errors: list[str] = []
