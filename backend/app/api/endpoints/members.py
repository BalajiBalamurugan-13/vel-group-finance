from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from supabase import Client

from app.db.supabase import get_supabase_client
from app.schemas import SuccessResponse
from app.schemas.member import (
    MemberCreate,
    MemberResponse,
    MemberStatus,
    MemberStatusUpdate,
    MemberUpdate,
)
from app.services.member_service import MemberService, get_member_service

router = APIRouter()


def get_service(db: Client = Depends(get_supabase_client)) -> MemberService:
    """Dependency injection for the MemberService."""
    return get_member_service(db)


@router.get("", response_model=SuccessResponse)
async def list_members(
    group_id: Optional[UUID] = Query(None, description="Filter members by group ID"),
    status: Optional[MemberStatus] = Query(None, description="Filter members by status"),
    search: Optional[str] = Query(None, description="Search members by name or phone"),
    service: MemberService = Depends(get_service),
):
    """
    List all members with optional filters (group_id, status, search).
    """
    members = service.get_members(group_id=group_id, status=status, search=search)
    return SuccessResponse(message="Members retrieved successfully.", data=members)


@router.get("/{member_id}", response_model=SuccessResponse)
async def get_member(
    member_id: UUID,
    service: MemberService = Depends(get_service),
):
    """
    Get detailed information for a single member including active loan cycle.
    """
    member = service.get_member_by_id(member_id)
    return SuccessResponse(message="Member retrieved successfully.", data=member)


@router.post("", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_member(
    data: MemberCreate,
    service: MemberService = Depends(get_service),
):
    """
    Add a member to a group.
    If the group is Active, automatically issues the loan cycle and loan transaction.
    """
    member = service.create_member(data)
    return SuccessResponse(message="Member added successfully.", data=member)


@router.put("/{member_id}", response_model=SuccessResponse)
async def update_member(
    member_id: UUID,
    data: MemberUpdate,
    service: MemberService = Depends(get_service),
):
    """
    Update member details (group_id is immutable).
    """
    member = service.update_member(member_id, data)
    return SuccessResponse(message="Member updated successfully.", data=member)


@router.patch("/{member_id}/status", response_model=SuccessResponse)
async def update_member_status(
    member_id: UUID,
    data: MemberStatusUpdate,
    service: MemberService = Depends(get_service),
):
    """
    Update member lifecycle status (Active -> Completed -> Closed).
    """
    member = service.update_member_status(member_id, data)
    return SuccessResponse(message="Member status updated successfully.", data=member)
