"""
VEL Finance — Expense Schemas
=============================
Defines Pydantic models for operational business expenses.
"""
from datetime import date as dt_date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(gt=0, description="Expense amount in INR (> 0)")
    note: str = Field(min_length=1, max_length=500, description="Description or note for the expense")
    date: dt_date = Field(default_factory=dt_date.today, description="Date of the expense")
    category: Optional[str] = Field(default="General", max_length=100, description="Expense category")


class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, description="Expense amount in INR (> 0)")
    note: Optional[str] = Field(None, min_length=1, max_length=500, description="Description or note for the expense")
    date: Optional[dt_date] = Field(None, description="Date of the expense")
    category: Optional[str] = Field(None, max_length=100, description="Expense category")


class ExpenseResponse(BaseModel):
    id: str = Field(description="Unique identifier for the expense")
    amount: Decimal = Field(description="Expense amount in INR")
    note: str = Field(description="Description or note")
    date: dt_date = Field(description="Date of expense")
    category: Optional[str] = Field(default="General")
    created_at: Optional[datetime] = None


class ExpenseSummaryResponse(BaseModel):
    total_expense: Decimal
    today_expense: Decimal
    count: int
    expenses: list[ExpenseResponse]
