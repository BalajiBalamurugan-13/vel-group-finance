from uuid import UUID

from fastapi import APIRouter, Depends, status
from supabase import Client

from app.db.supabase import get_supabase_client
from app.schemas import SuccessResponse
from app.schemas.scheme import SchemeCreate, SchemeResponse, SchemeStatusUpdate, SchemeUpdate
from app.services.scheme_service import SchemeService, get_scheme_service

router = APIRouter()


def get_service(db: Client = Depends(get_supabase_client)) -> SchemeService:
    """Dependency injection for the SchemeService."""
    return get_scheme_service(db)


@router.get("", response_model=SuccessResponse)
async def list_schemes(service: SchemeService = Depends(get_service)):
    """
    Get all active schemes.
    """
    schemes = service.get_schemes()
    return SuccessResponse(message="Schemes retrieved successfully.", data=schemes)


@router.get("/{scheme_id}", response_model=SuccessResponse)
async def get_scheme(scheme_id: UUID, service: SchemeService = Depends(get_service)):
    """
    Get scheme details by ID.
    """
    scheme = service.get_scheme_by_id(scheme_id)
    return SuccessResponse(message="Scheme retrieved successfully.", data=scheme)


@router.post("", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_scheme(data: SchemeCreate, service: SchemeService = Depends(get_service)):
    """
    Create a new scheme.
    """
    scheme = service.create_scheme(data)
    return SuccessResponse(message="Scheme created successfully.", data=scheme)


@router.put("/{scheme_id}", response_model=SuccessResponse)
async def update_scheme(
    scheme_id: UUID, data: SchemeUpdate, service: SchemeService = Depends(get_service)
):
    """
    Update a scheme.
    Only allows updating scheme_name and description. Financial fields are immutable.
    """
    scheme = service.update_scheme(scheme_id, data)
    return SuccessResponse(message="Scheme updated successfully.", data=scheme)


@router.patch("/{scheme_id}/status", response_model=SuccessResponse)
async def update_scheme_status(
    scheme_id: UUID, data: SchemeStatusUpdate, service: SchemeService = Depends(get_service)
):
    """
    Change scheme status.
    """
    scheme = service.update_scheme_status(scheme_id, data)
    return SuccessResponse(message="Scheme status updated successfully.", data=scheme)
