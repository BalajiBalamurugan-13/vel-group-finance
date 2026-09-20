"""
VEL Finance — Investment Schemas
================================
Pydantic schemas for Owner Capital / Investments per 13_Accounting_Profit_Loan_Risk_Model_Specification.md.

Distinguishes:
- Initial Investment (Owner starting capital, 9 Aug 2026 / Week 1)
- Additional Investment (Owner capital introduced in later weeks)
"""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class InvestmentType(str):
    INITIAL = "Initial"
    ADDITIONAL = "Additional"


class InvestmentBase(BaseModel):
    investment_type: Literal["Initial", "Additional"]
    amount: Decimal = Field(..., gt=0)
    investment_date: date
    description: Optional[str] = None

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            return trimmed if trimmed else None
        return v


class InvestmentCreate(InvestmentBase):
    pass


class InvestmentResponse(InvestmentBase):
    id: UUID
    investment_code: Optional[str] = None  # INV-0001
    business_week: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InvestmentSummary(BaseModel):
    total_initial_investment: Decimal = Decimal("0.00")
    total_additional_investment: Decimal = Decimal("0.00")
    total_owner_investment: Decimal = Decimal("0.00")
    count_initial: int = 0
    count_additional: int = 0
    investments: List[InvestmentResponse] = []
