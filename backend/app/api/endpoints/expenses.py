"""
VEL Finance — Expenses API Endpoints
====================================
CRUD endpoints for tracking operational business expenses.
Deducts directly from Dashboard Available Cash.
"""
from datetime import date
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.db.supabase import get_supabase_client
from app.schemas import SuccessResponse
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.services.expense_service import ExpenseService

logger = logging.getLogger(__name__)

router = APIRouter()


def get_service(db: Client = Depends(get_supabase_client)) -> ExpenseService:
    return ExpenseService(db)


@router.post("", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def add_expense(
    data: ExpenseCreate,
    service: ExpenseService = Depends(get_service),
):
    """
    Records a new operational expense.
    Deducts immediately from Available Cash on the Dashboard.
    """
    record = service.add_expense(data)
    return SuccessResponse(
        data=record,
        message="Expense recorded successfully and deducted from Available Cash.",
    )


@router.get("", response_model=SuccessResponse)
def get_expenses(
    start_date: Optional[date] = Query(None, description="Filter from start date"),
    end_date: Optional[date] = Query(None, description="Filter up to end date"),
    limit: int = Query(100, ge=1, le=500, description="Max expenses to return"),
    service: ExpenseService = Depends(get_service),
):
    """
    Retrieves recorded business expenses.
    """
    records = service.get_expenses(start_date=start_date, end_date=end_date, limit=limit)
    return SuccessResponse(
        data=records,
        message=f"{len(records)} expenses retrieved successfully.",
    )


@router.get("/summary", response_model=SuccessResponse)
def get_expense_summary(
    date_val: Optional[date] = Query(None, alias="date", description="Target date for today's expense calculation"),
    service: ExpenseService = Depends(get_service),
):
    """
    Retrieves total expense, today's expense, count, and recent list.
    """
    summary = service.get_summary(target_date=date_val)
    return SuccessResponse(
        data=summary,
        message="Expense summary retrieved successfully.",
    )


@router.put("/{id}", response_model=SuccessResponse)
def update_expense(
    id: str,
    data: ExpenseUpdate,
    service: ExpenseService = Depends(get_service),
):
    """
    Updates an expense by ID and recalculates Available Cash.
    """
    record = service.update_expense(id, data)
    return SuccessResponse(
        data=record,
        message="Expense updated successfully. Available Cash updated.",
    )


@router.delete("/{id}", response_model=SuccessResponse)
def delete_expense(
    id: str,
    service: ExpenseService = Depends(get_service),
):
    """
    Deletes an expense by ID and recalculates Available Cash.
    """
    success = service.delete_expense(id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found.")
    return SuccessResponse(
        data={"id": id, "deleted": True},
        message="Expense deleted successfully. Available Cash updated.",
    )
