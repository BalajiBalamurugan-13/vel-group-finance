from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from supabase import Client

from app.db.supabase import get_supabase_client
from app.schemas import SuccessResponse
from app.schemas.collection import (
    CollectionCreate,
)
from app.services.collection_service import CollectionService, get_collection_service

router = APIRouter()


def get_service(db: Client = Depends(get_supabase_client)) -> CollectionService:
    return get_collection_service(db)


@router.get("/today", response_model=SuccessResponse)
def get_today_collections(
    target_date: Optional[date] = Query(
        None, description="Optional target date to query collections for (defaults to today)"
    ),
    service: CollectionService = Depends(get_service),
):
    summary = service.get_today_collections(target_date=target_date)
    return SuccessResponse(
        data=summary,
        message="Today's collections retrieved successfully.",
    )


@router.get("/weekly", response_model=SuccessResponse)
def get_weekly_summary(
    group_id: Optional[UUID] = Query(
        None, description="Optional group filter for weekly summary"
    ),
    service: CollectionService = Depends(get_service),
):
    summary = service.get_weekly_summary(group_id=group_id)
    return SuccessResponse(
        data=summary,
        message="Weekly collection summary retrieved successfully.",
    )


@router.get("", response_model=SuccessResponse)
def list_collections(
    group_id: Optional[UUID] = Query(None, description="Filter by group ID"),
    member_id: Optional[UUID] = Query(None, description="Filter by member ID"),
    collector_id: Optional[UUID] = Query(None, description="Filter by collector ID"),
    payment_date: Optional[date] = Query(None, description="Filter by exact payment date"),
    from_date: Optional[date] = Query(None, description="Filter by start date"),
    to_date: Optional[date] = Query(None, description="Filter by end date"),
    service: CollectionService = Depends(get_service),
):
    collections = service.get_collections(
        group_id=group_id,
        member_id=member_id,
        collector_id=collector_id,
        payment_date=payment_date,
        from_date=from_date,
        to_date=to_date,
    )
    return SuccessResponse(
        data=collections,
        message="Collections retrieved successfully.",
    )


@router.post("", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def record_collection(
    data: CollectionCreate,
    service: CollectionService = Depends(get_service),
):
    collection = service.record_collection(data)
    return SuccessResponse(
        data=collection,
        message="Weekly payment recorded successfully.",
    )


@router.get("/{id}", response_model=SuccessResponse)
def get_collection(
    id: UUID,
    service: CollectionService = Depends(get_service),
):
    collection = service.get_collection_by_id(id)
    return SuccessResponse(
        data=collection,
        message="Collection details retrieved successfully.",
    )
