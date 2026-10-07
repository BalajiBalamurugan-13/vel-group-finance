"""
VEL Finance — Financial Calculation Helpers
=============================================
Centralized utilities for financial rules, defaults, and overrides.
"""

from decimal import Decimal
import logging
from typing import Any, Mapping, Optional

logger = logging.getLogger(__name__)

DEFAULT_WEEKLY_INSTALLMENT = Decimal("760.00")

_OVERRIDE_CACHE: dict[str, Decimal] = {}
_CACHE_INITIALIZED: bool = False


def _get_db():
    try:
        from app.db.supabase import get_optional_supabase_client
        return get_optional_supabase_client()
    except Exception:
        return None


def load_overrides(db: Optional[Any] = None) -> dict[str, Decimal]:
    """
    Loads all group-specific weekly installment overrides from the settings table.
    Caches results in memory for high-performance zero-overhead lookups.
    """
    global _OVERRIDE_CACHE, _CACHE_INITIALIZED
    client = db or _get_db()
    if not client:
        return _OVERRIDE_CACHE
    try:
        res = client.table("settings").select("key, value").like("key", "group_weekly_installment:%").execute()
        for row in res.data or []:
            key = row.get("key", "")
            val = row.get("value")
            gid = key.split("group_weekly_installment:")[-1]
            if gid and val:
                try:
                    _OVERRIDE_CACHE[gid] = Decimal(str(val))
                except Exception:
                    pass
        _CACHE_INITIALIZED = True
    except Exception as e:
        logger.warning("Could not load group installment overrides from settings: %s", e)
    return _OVERRIDE_CACHE


def get_group_override(group_id: str, db: Optional[Any] = None) -> Optional[Decimal]:
    """
    Returns the stored weekly installment override for a group_id, or None if none set.
    """
    global _CACHE_INITIALIZED
    gid = str(group_id)
    if not _CACHE_INITIALIZED:
        load_overrides(db)
    return _OVERRIDE_CACHE.get(gid)


def set_group_override(group_id: str, installment: Decimal, db: Optional[Any] = None) -> None:
    """
    Persists a group-specific weekly installment override to the settings table
    and updates the in-memory cache.
    """
    global _OVERRIDE_CACHE
    gid = str(group_id)
    dec = Decimal(str(installment))
    _OVERRIDE_CACHE[gid] = dec

    client = db or _get_db()
    if client:
        try:
            client.table("settings").upsert({
                "key": f"group_weekly_installment:{gid}",
                "value": str(float(dec)),
            }).execute()
        except Exception as e:
            logger.warning("Could not persist group installment override in settings: %s", e)


def get_effective_weekly_installment(
    group: Optional[Mapping[str, Any]] = None,
    scheme: Optional[Mapping[str, Any]] = None,
    db: Optional[Any] = None,
) -> Decimal:
    """
    Returns the effective weekly installment for a group.

    Resolution Priority:
    1. group['weekly_installment'] (if explicitly set in dict/DB column and > 0)
    2. Overrides stored in settings table / in-memory cache for group['id']
    3. scheme['weekly_installment'] (if scheme is passed and > 0)
    4. group['scheme']['weekly_installment'] (if scheme is embedded in group)
    5. DEFAULT_WEEKLY_INSTALLMENT (Decimal('760.00'))
    """
    if group:
        group_val = group.get("weekly_installment")
        if group_val is not None:
            try:
                dec = Decimal(str(group_val))
                if dec > Decimal("0.00"):
                    return dec
            except (ValueError, TypeError):
                pass

        gid = str(group.get("id") or "")
        if gid:
            override = get_group_override(gid, db)
            if override is not None and override > Decimal("0.00"):
                return override

        if scheme is None and isinstance(group.get("scheme"), (dict, Mapping)):
            scheme = group["scheme"]

    if scheme:
        scheme_val = scheme.get("weekly_installment")
        if scheme_val is not None:
            try:
                dec = Decimal(str(scheme_val))
                if dec > Decimal("0.00"):
                    return dec
            except (ValueError, TypeError):
                pass

    return DEFAULT_WEEKLY_INSTALLMENT
