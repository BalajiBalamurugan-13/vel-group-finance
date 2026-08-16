"""
VEL Finance — Group Finance Backend
=====================================
FastAPI Application Entry Point

Architecture:
    React + Vite (Frontend)
        │ HTTP/JSON
        ▼
    FastAPI /api/v1   ←── This file
        │
        ▼
    Service Layer
        │
        ▼
    Centralized Supabase Client
        │
        ▼
    Supabase PostgreSQL

Per docs/10_DEVELOPMENT_RULES.md:
    - Modular architecture
    - Separation of concerns
    - Clean error handling
    - Production-ready logging

Per docs/07_API_SPECIFICATION.md:
    - All APIs versioned at /api/v1/
    - JSON request/response
    - Consistent error format
"""

import logging
import sys

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings

# ── Logging Setup ──────────────────────────────────────────────────────────────
# Basic logging configuration. In production, wire this to your log aggregator.
# Never log: passwords, API keys, Supabase service role key, secrets.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


# ── Application Lifespan ───────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.

    Startup:
        - Log environment info
        - Validate Supabase configuration (warn if missing, don't crash)
        - Application is ready to serve requests

    Shutdown:
        - Log shutdown
        - Clean up resources if needed
    """
    settings = get_settings()

    logger.info("=" * 60)
    logger.info("VEL Finance — Group Finance API starting up")
    logger.info("Environment : %s", settings.APP_ENV)
    logger.info("Version     : %s", settings.APP_VERSION)
    logger.info("Debug       : %s", settings.DEBUG)

    if settings.supabase_configured:
        logger.info("Supabase    : Configured ✓")
    else:
        logger.warning(
            "Supabase    : NOT configured — set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in backend/.env"
        )
        logger.warning(
            "The application will start but database operations will fail "
            "until credentials are provided."
        )

    logger.info("CORS Origins: %s", settings.get_cors_origins())
    logger.info("=" * 60)

    yield  # Application runs here

    logger.info("VEL Finance — Group Finance API shutting down.")


# ── Application Factory ────────────────────────────────────────────────────────
def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Separated into a factory function to support testing (TestClient
    can import this function and create a fresh instance per test).
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "VEL Finance — Group Finance Backend API\n\n"
            "Enterprise-grade financial management for group loan operations.\n\n"
            "**Documentation**: See docs/ directory for business rules and API specifications."
        ),
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        openapi_url="/openapi.json" if settings.is_development else None,
        lifespan=lifespan,
    )

    # ── CORS Middleware ────────────────────────────────────────────────────────
    # IMPORTANT: Never use allow_origins=["*"] in production.
    # Configured via CORS_ORIGINS environment variable.
    cors_origins = settings.get_cors_origins()

    if settings.is_production and "*" in cors_origins:
        logger.error(
            "SECURITY: Wildcard CORS origin '*' detected in production. "
            "Set CORS_ORIGINS to the actual frontend URL."
        )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # ── Global Exception Handlers ──────────────────────────────────────────────
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        """
        Handles Pydantic validation errors.
        Returns ErrorResponse format per 07_API_SPECIFICATION.md.
        """
        errors = []
        for error in exc.errors():
            # Create a dot-separated field name from the location tuple
            # e.g. ("body", "scheme_name") -> "scheme_name"
            loc = error.get("loc", [])
            field = ".".join(str(x) for x in loc if str(x) not in ("body", "query", "path"))
            if not field and loc:
                field = str(loc[-1])
            errors.append({"field": field, "message": error.get("msg")})

        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": "Validation Error",
                "errors": errors,
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        """
        Handles explicit HTTP exceptions.
        Returns ErrorResponse format per 07_API_SPECIFICATION.md.

        When exc.detail is a dict (used for structured business errors such as
        INACTIVE_SCHEME_REACTIVATABLE), its keys are merged into the response body
        so the frontend receives a typed, machine-readable error payload.
        """
        if isinstance(exc.detail, dict):
            # Structured detail: merge dict keys into the response
            content = {
                "success": False,
                "errors": [],
                **exc.detail,
            }
        else:
            content = {
                "success": False,
                "message": str(exc.detail),
                "errors": [],
            }
        return JSONResponse(status_code=exc.status_code, content=content)


    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """
        Catch-all exception handler.

        Returns structured JSON error response.
        Never exposes: stack traces, credentials, internal implementation details.

        Per docs/10_DEVELOPMENT_RULES.md:
            "Never expose raw exceptions."
            "Return meaningful error messages."
            "Log unexpected exceptions."
        """
        logger.error(
            "Unhandled exception on %s %s: %s",
            request.method,
            request.url.path,
            str(exc),
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An unexpected error occurred. Please try again later.",
                "errors": [],
            },
        )

    # ── API Router ─────────────────────────────────────────────────────────────
    app.include_router(api_router)

    return app


# ── Application Instance ───────────────────────────────────────────────────────
app = create_application()
