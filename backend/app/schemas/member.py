from datetime import date, datetime
from decimal import Decimal
from enum import Enum
import re
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class MemberStatus(str, Enum):
    ACTIVE = "Active"
    COMPLETED = "Completed"
    CLOSED = "Closed"


class MemberBase(BaseModel):
    """Base fields for member information."""
    member_name: str = Field(..., min_length=1, max_length=255)
    phone_number: str = Field(..., min_length=5, max_length=20)
    address: str = Field(..., min_length=1)
    photo_url: Optional[str] = None
    nominee: Optional[str] = Field(None, max_length=255)
    id_proof: Optional[str] = None
    remarks: Optional[str] = None

    @field_validator("member_name", "address")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Field cannot be empty or only whitespace")
        return trimmed

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Phone number cannot be empty or only whitespace")
        if not re.match(r"^\d{10}$", trimmed):
            raise ValueError("Phone number must contain exactly 10 digits (numbers only)")
        return trimmed


class MemberCreate(MemberBase):
    """Attributes required to add a member to a group."""
    group_id: UUID
    joined_date: Optional[date] = None


class MemberUpdate(BaseModel):
    """
    Attributes that can be updated for a member.
    Supports reassigning member to another group (group_id).
    """
    group_id: Optional[UUID] = None
    member_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone_number: Optional[str] = Field(None, min_length=10, max_length=10)
    address: Optional[str] = Field(None, min_length=1)
    photo_url: Optional[str] = None
    nominee: Optional[str] = Field(None, max_length=255)
    id_proof: Optional[str] = None
    remarks: Optional[str] = None

    model_config = {"extra": "forbid"}

    @field_validator("member_name", "address")
    @classmethod
    def validate_non_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Field cannot be empty or only whitespace")
            return trimmed
        return v

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Phone number cannot be empty or only whitespace")
            if not re.match(r"^\d{10}$", trimmed):
                raise ValueError("Phone number must contain exactly 10 digits (numbers only)")
            return trimmed
        return v


class MemberStatusUpdate(BaseModel):
    """Schema for updating member lifecycle status."""
    status: MemberStatus


class LoanTransactionResponse(BaseModel):
    """Loan disbursement transaction details."""
    id: UUID
    loan_cycle_id: UUID
    member_id: UUID
    loan_amount: Decimal
    note_cost: Decimal
    cash_given: Decimal
    disbursement_date: date
    remarks: Optional[str] = None
    created_at: datetime
    transaction_code: Optional[str] = None  # TXN-0001 — from migration 002

    model_config = {"from_attributes": True}


class LoanCycleResponse(BaseModel):
    """Loan cycle summary."""
    id: UUID
    member_id: UUID
    group_id: UUID
    scheme_id: UUID
    cycle_number: int
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    cycle_code: Optional[str] = None  # LC-0001 — from migration 002
    loan_transaction: Optional[LoanTransactionResponse] = None

    model_config = {"from_attributes": True}


class MemberResponse(MemberBase):
    """
    Schema for returning Member data.
    Includes calculated financial summaries derived from Scheme/Group.
    """
    id: UUID
    member_code: Optional[str] = None  # M-0001 — from migration 002
    group_id: UUID
    joined_week: int = 1
    joined_date: Optional[date] = None
    status: MemberStatus
    group_name: Optional[str] = None
    location: Optional[str] = None
    scheme_name: Optional[str] = None
    loan_amount: Optional[Decimal] = None
    note_cost: Optional[Decimal] = None
    cash_given: Optional[Decimal] = None
    weekly_installment: Optional[Decimal] = None
    immediate_collection: Optional[Decimal] = None
    weeks_paid: Optional[int] = 0
    total_paid_amount: Optional[Decimal] = None
    outstanding_amount: Optional[Decimal] = None
    current_cycle: Optional[LoanCycleResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
