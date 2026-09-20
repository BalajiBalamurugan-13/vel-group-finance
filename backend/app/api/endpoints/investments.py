"""
VEL Finance — Investments API Endpoint
======================================
Owner capital management endpoints:
  GET  /api/v1/investments         — List all investments with business week
  POST /api/v1/investments         — Record new Initial/Additional investment
  GET  /api/v1/investments/summary — Totals of Initial, Additional, and Total Owner Investment
"""
from fastapi import APIRouter, Depends, status
from supabase import Client

from app.db.supabase import get_supabase_client
from app.schemas import SuccessResponse
from app.schemas.investment import InvestmentCreate, InvestmentResponse, InvestmentSummary
from app.services.investment_service import InvestmentService, get_investment_service

router = APIRouter()


def get_service(db: Client = Depends(get_supabase_client)) -> InvestmentService:
    return get_investment_service(db)


@router.get("", response_model=SuccessResponse)
def get_investments(service: InvestmentService = Depends(get_service)):
    """
    Returns all investments recorded by the owner.
    """
    investments = service.get_investments()
    return SuccessResponse(
        data=investments,
        message="Investments retrieved successfully.",
    )


@router.post("", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def create_investment(
    data: InvestmentCreate,
    service: InvestmentService = Depends(get_service),
):
    """
    Record an owner investment (Initial or Additional).
    """
    investment = service.create_investment(data)
    return SuccessResponse(
        data=investment,
        message=f"{data.investment_type} investment of ₹{data.amount:,.2f} recorded successfully.",
    )


@router.get("/summary", response_model=SuccessResponse)
def get_investment_summary(service: InvestmentService = Depends(get_service)):
    """
    Returns total initial, additional, and combined owner investment.
    """
    summary = service.get_summary()
    return SuccessResponse(
        data=summary,
        message="Investment summary retrieved successfully.",
    )
