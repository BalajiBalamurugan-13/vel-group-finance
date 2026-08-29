from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SchemeStatus(str, Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"


class SchemeBase(BaseModel):
    """Shared attributes for Scheme."""
    scheme_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class SchemeCreate(SchemeBase):
    """Attributes required to create a new Scheme."""
    loan_amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    weekly_installment: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    total_weeks: int = Field(..., gt=0)
    note_cost: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)

    @field_validator("loan_amount", "weekly_installment", "note_cost")
    @classmethod
    def validate_money(cls, v: Decimal) -> Decimal:
        # Quantize to 2 decimal places to ensure strict financial representation
        return v.quantize(Decimal("0.01"))


class SchemeUpdate(BaseModel):
    """
    Attributes that can be updated.
    Per Scheme Versioning rules, financial fields cannot be modified.
    """
    scheme_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None

    model_config = {"extra": "forbid"}


class SchemeStatusUpdate(BaseModel):
    """Schema for patching the status."""
    status: SchemeStatus


class SchemeResponse(SchemeBase):
    """Schema for responses returning Scheme data."""
    id: UUID
    scheme_code: Optional[str] = None  # SCH-0001 — from migration 002
    loan_amount: Decimal
    weekly_installment: Decimal
    total_weeks: int
    note_cost: Decimal
    status: SchemeStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
