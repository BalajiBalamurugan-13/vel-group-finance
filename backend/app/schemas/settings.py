from typing import Optional
from pydantic import BaseModel, Field


class PlaceRouteItem(BaseModel):
    id: str
    name: str
    session: str = "morning"  # "morning" or "evening"
    order: int = Field(..., ge=1)
    isCustom: Optional[bool] = False


class PlacesRouteConfigPayload(BaseModel):
    places: list[PlaceRouteItem]
