from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from supabase import Client

from app.db.supabase import get_supabase_client
from app.schemas import SuccessResponse
from app.schemas.group import (
    GroupCreate,
    GroupStatus,
    GroupStatusUpdate,
    GroupUpdate,
)
from app.services.group_service import GroupService, get_group_service

router = APIRouter()


def get_service(db: Client = Depends(get_supabase_client)) -> GroupService:
    """Dependency injection for the GroupService."""
    return get_group_service(db)


@router.get("", response_model=SuccessResponse)
async def list_groups(
    status: Optional[GroupStatus] = Query(None, description="Filter groups by status"),
    location: Optional[str] = Query(None, description="Filter groups by location"),
    search: Optional[str] = Query(None, description="Search groups by name"),
    service: GroupService = Depends(get_service),
):
    """
    List all groups with optional filters (status, location, search).
    """
    groups = service.get_groups(status=status, location=location, search=search)
    return SuccessResponse(message="Groups retrieved successfully.", data=groups)


@router.get("/suggest-name", response_model=SuccessResponse)
async def suggest_group_name(
    location: str = Query(..., min_length=1, description="Location to generate running group name for"),
    service: GroupService = Depends(get_service),
):
    """
    Suggests next available group name for a given location (e.g. 'PTM 3').
    Helper endpoint for UI form pre-filling.
    """
    suggestion = service.suggest_next_group_name(location=location)
    return SuccessResponse(message="Suggested group name generated.", data=suggestion)


@router.get("/{group_id}", response_model=SuccessResponse)
async def get_group(
    group_id: UUID,
    service: GroupService = Depends(get_service),
):
    """
    Get detailed information for a single group.
    """
    group = service.get_group_by_id(group_id)
    return SuccessResponse(message="Group retrieved successfully.", data=group)


@router.post("", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    data: GroupCreate,
    service: GroupService = Depends(get_service),
):
    """
    Create a new finance group in Draft status.
    Requires an Active scheme. Auto-generates group_name if omitted.
    """
    group = service.create_group(data)
    return SuccessResponse(message="Group created successfully.", data=group)


@router.put("/{group_id}", response_model=SuccessResponse)
async def update_group(
    group_id: UUID,
    data: GroupUpdate,
    service: GroupService = Depends(get_service),
):
    """
    Update group metadata. Scheme ID cannot be modified.
    """
    group = service.update_group(group_id, data)
    return SuccessResponse(message="Group updated successfully.", data=group)


@router.patch("/{group_id}/status", response_model=SuccessResponse)
async def update_group_status(
    group_id: UUID,
    data: GroupStatusUpdate,
    service: GroupService = Depends(get_service),
):
    """
    Update group lifecycle status (Draft -> Active -> Completed -> Closed).
    """
    group = service.update_group_status(group_id, data)
    return SuccessResponse(message="Group status updated successfully.", data=group)
