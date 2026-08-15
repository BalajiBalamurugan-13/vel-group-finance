"""
VEL Finance — Centralized Supabase Client
==========================================
Single Supabase client instance for the entire backend.

Architecture rules:
- ONE client, shared across all services.
- Client is NOT created inside individual routes or handlers.
- All services receive the client via dependency injection.
- Credentials are NEVER hardcoded — read exclusively from settings.

Per docs/10_DEVELOPMENT_RULES.md:
    "Never execute raw SQL unless necessary. Use repositories/services."

Per docs/12_AI_CONTEXT.md:
    "This application is completely independent from the Daily Collection application.
     Never connect to that application's Supabase project."

IMPORTANT:
    This client uses the SERVICE ROLE KEY which bypasses Row Level Security.
    It must NEVER be exposed to the frontend or any client-side code.
    The service role key grants full database access.
"""

import logging
from functools import lru_cache
from typing import Optional

from supabase import Client, create_client

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache()
def get_supabase_client() -> Client:
    """
    Return the cached Supabase client instance.

    Uses lru_cache to create the client only once for the application lifetime.
    The client is shared across all service calls.

    Raises:
        ValueError: If SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.

    Usage in FastAPI routes (via dependency injection):
        from fastapi import Depends
        from app.db.supabase import get_supabase_client

        @router.get("/example")
        async def example(db: Client = Depends(get_supabase_client)):
            ...
    """
    settings = get_settings()

    if not settings.SUPABASE_URL:
        raise ValueError(
            "SUPABASE_URL is not configured. "
            "Create backend/.env from backend/.env.example and set SUPABASE_URL."
        )

    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError(
            "SUPABASE_SERVICE_ROLE_KEY is not configured. "
            "Create backend/.env from backend/.env.example and set SUPABASE_SERVICE_ROLE_KEY."
        )

    logger.info("Initializing Supabase client for URL: %s", settings.SUPABASE_URL[:30] + "...")

    # Service role bypasses RLS — appropriate for backend-only usage
    # Do NOT expose this client to any frontend code
    client = create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY,
    )

    logger.info("Supabase client initialized successfully.")
    return client


def get_optional_supabase_client() -> Optional[Client]:
    """
    Return Supabase client if configured, or None if credentials are missing.

    Used for health checks and startup validation where a missing Supabase
    configuration should not crash the application.

    The health endpoint uses FastAPI's own health, not Supabase connectivity,
    so this graceful fallback is appropriate.
    """
    settings = get_settings()

    if not settings.supabase_configured:
        logger.warning(
            "Supabase credentials not configured. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env"
        )
        return None

    try:
        return get_supabase_client()
    except Exception as exc:
        logger.error("Failed to initialize Supabase client: %s", str(exc))
        return None
