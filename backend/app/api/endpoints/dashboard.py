"""
VEL Finance — Dashboard API Endpoint
======================================
GET /api/v1/dashboard — Business overview and financial metrics.

Per docs/07_API_SPECIFICATION.md — Module 7, Dashboard Summary.
Read-only endpoint. No data mutations here.
"""
from fastapi import APIRouter, Depends
from supabase import Client

from app.db.supabase import get_supabase_client
from app.schemas import SuccessResponse
from app.services.dashboard_service import DashboardService, get_dashboard_service

router = APIRouter()


def get_service(db: Client = Depends(get_supabase_client)) -> DashboardService:
    """Dependency injection for DashboardService."""
    return get_dashboard_service(db)


@router.get("", response_model=SuccessResponse)
def get_dashboard(
    service: DashboardService = Depends(get_service),
):
    """
    Returns the complete business dashboard summary:
    - Available cash (Formula 11)
    - Today's collection
    - Total disbursement
    - Total outstanding (Formula 5 / 19)
    - Active groups and members
    - Total groups and members
    - Active groups grouped by location
    - Recent paid collections

    All monetary values are calculated server-side using Decimal arithmetic.
    """
    summary = service.get_summary()
    return SuccessResponse(
        data=summary,
        message="Dashboard summary retrieved successfully.",
    )


@router.get("/migration-status", response_model=SuccessResponse)
def get_migration_status(
    service: DashboardService = Depends(get_service),
):
    """
    Check whether initial customer/group migration has been completed
    and retrieve the current calibration offset.
    """
    status_data = service.get_migration_status_data()
    return SuccessResponse(
        data=status_data,
        message="Migration status retrieved successfully.",
    )


@router.post("/complete-migration", response_model=SuccessResponse)
def complete_migration(
    service: DashboardService = Depends(get_service),
):
    """
    Calibrate Available Cash to exactly ₹0.00 by recording a migration offset
    in settings. Safe, non-destructive, and can be recalibrated.
    """
    result = service.complete_migration()
    return SuccessResponse(
        data=result,
        message=result["message"],
    )

