"""
VEL Finance — Profit API Endpoints
==================================
Endpoints for Contractual Profit and Weekly Financial Breakdown:
  GET /api/v1/profit/summary  — Contractual profit, capital deployed, collections, principal recovery
  GET /api/v1/profit/weekly   — Sunday-to-Saturday weekly financial performance
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.db.supabase import get_supabase_client
from app.schemas import SuccessResponse
from app.services.profit_service import ProfitService, get_profit_service

router = APIRouter()


def get_service(db: Client = Depends(get_supabase_client)) -> ProfitService:
    return get_profit_service(db)


@router.get("/summary", response_model=SuccessResponse)
def get_profit_summary(service: ProfitService = Depends(get_service)):
    """
    Returns the comprehensive contractual profit model summary:
    - Owner Investments (Initial, Additional, Total)
    - Loan Capital Deployed & Contractual Profit
    - Actual Collections vs Outstanding
    - Principal Recovery progress
    - Business Growth by funding source
    """
    summary = service.get_profit_summary()
    return SuccessResponse(
        data=summary.model_dump(),
        message="Profit summary retrieved successfully.",
    )


@router.get("/weekly", response_model=SuccessResponse)
def get_weekly_financials(
    max_weeks: Optional[int] = Query(None, ge=1, description="Maximum number of business weeks to return"),
    service: ProfitService = Depends(get_service),
):
    """
    Returns the weekly business performance breakdown for each Sunday-based week.
    """
    breakdown = service.get_weekly_breakdown(max_weeks=max_weeks)
    return SuccessResponse(
        data=[b.model_dump() for b in breakdown],
        message="Weekly financial breakdown retrieved successfully.",
    )
