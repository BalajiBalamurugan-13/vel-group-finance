"""
VEL Finance — Group Finance Backend
=====================================
Environment configuration via Pydantic Settings.

All settings are loaded from environment variables (backend/.env in development).
Never hardcode values here. Never commit backend/.env.

Per docs/10_DEVELOPMENT_RULES.md:
- Configuration must be environment-driven
- Business values must never be hardcoded

Per docs/07_API_SPECIFICATION.md:
- API versioning at /api/v1/
"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings.

    Loaded from environment variables. In development, place these in:
        backend/.env

    Required variables:
        SUPABASE_URL              — Your Supabase project URL
        SUPABASE_SERVICE_ROLE_KEY — Service role key (server-side only, never expose to frontend)

    Optional variables with defaults:
        APP_ENV       — Application environment (default: development)
        DEBUG         — Enable debug mode (default: False)
        CORS_ORIGINS  — Comma-separated allowed origins (default: http://localhost:5173)
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    DEBUG: bool = False
    APP_NAME: str = "VEL Finance - Group Finance API"
    APP_VERSION: str = "1.0.0"

    # ── Supabase ───────────────────────────────────────────────────────────────
    # Both are required for the Supabase client.
    # The application will raise a clear error if these are missing.
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # ── CORS ───────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins.
    # In development: http://localhost:5173 (Vite frontend)
    # In production: set to the actual deployed frontend URL(s).
    # Never use "*" in production.
    CORS_ORIGINS: str = "http://localhost:5173"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str) -> str:
        """Accept comma-separated string as-is; split happens in get_cors_origins()."""
        return v

    def get_cors_origins(self) -> List[str]:
        """Return CORS origins as a list."""
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if self.is_development:
            for port in ["5173", "5174", "5175", "5176", "3000"]:
                for host in ["localhost", "127.0.0.1"]:
                    origin = f"http://{host}:{port}"
                    if origin not in origins:
                        origins.append(origin)
        return origins

    @property
    def is_development(self) -> bool:
        return self.APP_ENV.lower() in ("development", "dev", "local")

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() in ("production", "prod")

    @property
    def supabase_configured(self) -> bool:
        """True only if both Supabase credentials are provided."""
        return bool(self.SUPABASE_URL and self.SUPABASE_SERVICE_ROLE_KEY)


@lru_cache()
def get_settings() -> Settings:
    """
    Return cached Settings instance.

    Using lru_cache ensures we only read environment variables once.
    FastAPI dependency injection: `settings: Settings = Depends(get_settings)`
    """
    return Settings()
