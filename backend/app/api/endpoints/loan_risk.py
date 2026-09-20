"""
VEL Finance — Loan Risk API Endpoint
====================================
Endpoint for identifying overdue and at-risk members:
  GET /api/v1/loan-risk — List and summary of members by risk category
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.db.supabase import get_supabase_client
from app.schemas import SuccessResponse
from app.services.loan_risk_service import LoanRiskService, get_loan_risk_service

router = APIRouter()


def get_service(db: Client = Depends(get_supabase_client)) -> LoanRiskService:
    return get_loan_risk_service(db)


@router.get("", response_model=SuccessResponse)
def get_loan_risk_analysis(
    group_id: Optional[UUID] = Query(None, description="Filter by group ID"),
    risk_status: Optional[str] = Query(None, description="Filter by status: Current, Overdue, At Risk"),
    search: Optional[str] = Query(None, description="Search member name or code"),
    service: LoanRiskService = Depends(get_service),
):
    """
    Returns loan risk analysis for all members with active loans:
    - Current: 0 weeks overdue
    - Overdue: 1 to 3 weeks overdue
    - At Risk: 4+ weeks overdue
    - Does NOT auto-assign Loan Loss per Section 18
    """
    analysis = service.get_loan_risk_analysis(
        group_id=group_id,
        risk_status=risk_status,
        search=search,
    )
    return SuccessResponse(
        data=analysis.model_dump(),
        message="Loan risk analysis retrieved successfully.",
    )
