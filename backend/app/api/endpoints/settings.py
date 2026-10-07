import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.db.supabase import get_supabase_client
from app.schemas import SuccessResponse
from app.schemas.settings import PlacesRouteConfigPayload, PlaceRouteItem

logger = logging.getLogger(__name__)

router = APIRouter()

SETTINGS_KEY_PLACES_ROUTE = "places_route_config"


@router.get("/places-route", response_model=SuccessResponse)
def get_places_route(db: Client = Depends(get_supabase_client)):
    """
    Get the canonical places and routes configuration from the database.
    Ensures order is synchronized and constant across all devices.
    """
    try:
        res = (
            db.table("settings")
            .select("value")
            .eq("key", SETTINGS_KEY_PLACES_ROUTE)
            .limit(1)
            .execute()
        )
        if res.data and res.data[0].get("value"):
            raw_val = res.data[0]["value"]
            places = json.loads(raw_val)
            return SuccessResponse(
                data=places,
                message="Places route configuration retrieved successfully.",
            )
        return SuccessResponse(
            data=[],
            message="No custom places route configuration found.",
        )
    except Exception as e:
        logger.error("Failed to load places route configuration: %s", e)
        raise HTTPException(status_code=500, detail="Failed to load places route configuration.")


@router.put("/places-route", response_model=SuccessResponse)
def update_places_route(
    payload: PlacesRouteConfigPayload,
    db: Client = Depends(get_supabase_client),
):
    """
    Persist the places and routes ordering in the database.
    Locks the user's customized order permanently.
    """
    try:
        data_to_store = [p.model_dump() for p in payload.places]
        # Re-index strictly by 1..N order
        for idx, item in enumerate(data_to_store):
            item["order"] = idx + 1

        val_str = json.dumps(data_to_store, ensure_ascii=False)

        # Check if row exists
        existing = (
            db.table("settings")
            .select("id")
            .eq("key", SETTINGS_KEY_PLACES_ROUTE)
            .limit(1)
            .execute()
        )

        now_iso = datetime.utcnow().isoformat()
        if existing.data:
            res = (
                db.table("settings")
                .update({"value": val_str, "updated_at": now_iso})
                .eq("key", SETTINGS_KEY_PLACES_ROUTE)
                .execute()
            )
        else:
            res = (
                db.table("settings")
                .insert({
                    "key": SETTINGS_KEY_PLACES_ROUTE,
                    "value": val_str,
                    "description": "Places and routes ordering configuration",
                })
                .execute()
            )

        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to update settings in database.")

        return SuccessResponse(
            data=data_to_store,
            message="Places route configuration saved permanently.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to save places route configuration: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to save places route configuration: {e}")
