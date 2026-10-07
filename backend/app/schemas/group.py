from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class GroupStatus(str, Enum):
    DRAFT = "Draft"
    ACTIVE = "Active"
    COMPLETED = "Completed"
    RENEWED = "Renewed"
    CLOSED = "Closed"


class GroupBase(BaseModel):
    """Shared attributes for Group."""
    location: str = Field(..., min_length=1, max_length=100)
    group_name: str = Field(..., min_length=1, max_length=255)
    start_date: Optional[date] = None
    funding_source: Optional[str] = "Recycled Collections"
    recycled_sub_type: Optional[str] = "Fully Recycled"
    owner_investment_amount: Optional[Decimal] = Field(default=Decimal("0.00"), ge=0)
    remarks: Optional[str] = None


class GroupCreate(BaseModel):
    """Attributes required to create a new Group."""
    location: str = Field(..., min_length=1, max_length=100)
    scheme_id: UUID
    group_name: Optional[str] = Field(None, min_length=1, max_length=255)
    start_date: Optional[date] = None
    funding_source: Optional[str] = "Recycled Collections"
    recycled_sub_type: Optional[str] = "Fully Recycled"
    owner_investment_amount: Optional[Decimal] = Field(default=Decimal("0.00"), ge=0)
    weekly_installment: Optional[Decimal] = Field(default=None, gt=0)
    status: Optional[GroupStatus] = GroupStatus.ACTIVE
    remarks: Optional[str] = None

    @field_validator("location")
    @classmethod
    def validate_location(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Location cannot be empty or only whitespace")
        return trimmed

    @field_validator("group_name")
    @classmethod
    def validate_group_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Group name cannot be empty or only whitespace")
            return trimmed
        return v

    @field_validator("funding_source")
    @classmethod
    def validate_funding_source(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_sources = {"Initial Investment", "Additional Investment", "Recycled Collections"}
            if v not in valid_sources:
                raise ValueError(f"funding_source must be one of {valid_sources}")
        return v

    @field_validator("recycled_sub_type")
    @classmethod
    def validate_recycled_sub_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_sub_types = {"Fully Recycled", "Recycled + Owner Investment"}
            if v not in valid_sub_types:
                raise ValueError(f"recycled_sub_type must be one of {valid_sub_types}")
        return v


class GroupUpdate(BaseModel):
    """
    Attributes that can be updated for a group.
    Per business rules, scheme_id is immutable once the group is created.
    """
    group_name: Optional[str] = Field(None, min_length=1, max_length=255)
    location: Optional[str] = Field(None, min_length=1, max_length=100)
    start_date: Optional[date] = None
    funding_source: Optional[str] = None
    recycled_sub_type: Optional[str] = None
    owner_investment_amount: Optional[Decimal] = Field(default=None, ge=0)
    weekly_installment: Optional[Decimal] = Field(default=None, gt=0)
    remarks: Optional[str] = None

    model_config = {"extra": "forbid"}

    @field_validator("location")
    @classmethod
    def validate_location(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Location cannot be empty or only whitespace")
            return trimmed
        return v

    @field_validator("group_name")
    @classmethod
    def validate_group_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Group name cannot be empty or only whitespace")
            return trimmed
        return v

    @field_validator("funding_source")
    @classmethod
    def validate_funding_source(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_sources = {"Initial Investment", "Additional Investment", "Recycled Collections"}
            if v not in valid_sources:
                raise ValueError(f"funding_source must be one of {valid_sources}")
        return v

    @field_validator("recycled_sub_type")
    @classmethod
    def validate_recycled_sub_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_sub_types = {"Fully Recycled", "Recycled + Owner Investment"}
            if v not in valid_sub_types:
                raise ValueError(f"recycled_sub_type must be one of {valid_sub_types}")
        return v


class GroupStatusUpdate(BaseModel):
    """Schema for updating the lifecycle status of a group."""
    status: GroupStatus


class GroupSchemeSummary(BaseModel):
    """Scheme information embedded in Group response."""
    id: UUID
    scheme_code: Optional[str] = None  # SCH-0001 — from migration 002
    scheme_name: str
    loan_amount: Decimal
    weekly_installment: Decimal
    total_weeks: int
    note_cost: Decimal
    status: str

    model_config = {"from_attributes": True}


class GroupResponse(BaseModel):
    """
    Schema for returning Group data.
    member_count and total_group_amount are calculated dynamically
    and are NEVER stored in the database.
    """
    id: UUID
    group_code: Optional[str] = None  # GRP-0001 — from migration 002
    scheme_id: UUID
    location: str
    group_name: str
    start_date: Optional[date] = None
    funding_source: Optional[str] = "Recycled Collections"
    recycled_sub_type: Optional[str] = "Fully Recycled"
    owner_investment_amount: Optional[Decimal] = Decimal("0.00")
    status: GroupStatus
    remarks: Optional[str] = None
    member_count: int = 0
    total_group_amount: Decimal = Decimal("0.00")
    weekly_installment: Optional[Decimal] = None
    scheme: Optional[GroupSchemeSummary] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GroupSuggestNameResponse(BaseModel):
    """Response schema for suggested next group name."""
    suggested_name: str
    next_number: int
