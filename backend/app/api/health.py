"""
VEL Finance — Health Check Endpoint
======================================
GET /api/v1/health

Returns the application health status.

Purpose:
    - Verify that the FastAPI application is running and accepting requests.
    - Used by load balancers, monitoring systems, and developer verification.

Scope:
    - This endpoint only verifies FastAPI is running.
    - It does NOT test Supabase connectivity.
    - Supabase connectivity is verified separately when real credentials are set.

Per docs/07_API_SPECIFICATION.md:
    Expected response: HTTP 200 { "status": "ok" }
"""

import logging

from fastapi import APIRouter

from app.schemas import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns application health status. Does not require database connectivity.",
    responses={
        200: {
            "description": "Application is healthy.",
            "content": {"application/json": {"example": {"status": "ok"}}},
        }
    },
)
async def health_check() -> HealthResponse:
    """
    Application health check.

    Returns HTTP 200 with {"status": "ok"} when FastAPI is running.
    Does not test Supabase connectivity — this allows the health endpoint
    to work even before database credentials are configured.
    """
    logger.debug("Health check requested.")
    return HealthResponse(status="ok")
