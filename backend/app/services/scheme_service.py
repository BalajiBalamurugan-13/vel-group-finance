import logging
from uuid import UUID

from fastapi import HTTPException
from supabase import Client

from app.schemas.scheme import SchemeCreate, SchemeStatusUpdate, SchemeUpdate

logger = logging.getLogger(__name__)


class SchemeService:
    """
    Service layer for Scheme Management.
    Enforces business logic and interacts with the centralized Supabase client.
    """

    def __init__(self, db: Client):
        self.db = db

    def get_schemes(self) -> list[dict]:
        """
        Get all active schemes.
        Per docs/07_API_SPECIFICATION.md, GET /api/v1/schemes returns active schemes.
        """
        response = (
            self.db.table("schemes")
            .select("*")
            .eq("status", "Active")
            .order("created_at")
            .execute()
        )
        return response.data

    def get_scheme_by_id(self, scheme_id: UUID) -> dict:
        """
        Get a single scheme by ID.
        """
        response = self.db.table("schemes").select("*").eq("id", str(scheme_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Scheme not found")
        return response.data[0]

    def create_scheme(self, data: SchemeCreate) -> dict:
        """
        Create a new scheme.
        Enforces unique scheme name.
        """
        # Check for duplicate scheme name
        existing = (
            self.db.table("schemes")
            .select("id")
            .eq("scheme_name", data.scheme_name)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=409, detail="A scheme with this name already exists"
            )

        # Convert Pydantic model to dict, serializing Decimal to JSON-compatible strings
        insert_data = data.model_dump(mode="json")

        response = self.db.table("schemes").insert(insert_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create scheme")
        return response.data[0]

    def update_scheme(self, scheme_id: UUID, data: SchemeUpdate) -> dict:
        """
        Update scheme details (name and description only).
        Per Scheme Versioning rules, financial fields cannot be modified.
        """
        # Ensure scheme exists
        scheme = self.get_scheme_by_id(scheme_id)

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return scheme

        # If name is being changed, verify uniqueness
        if "scheme_name" in update_data and update_data["scheme_name"] != scheme["scheme_name"]:
            existing = (
                self.db.table("schemes")
                .select("id")
                .eq("scheme_name", update_data["scheme_name"])
                .execute()
            )
            # If a DIFFERENT scheme has this name, raise conflict
            if existing.data and str(existing.data[0]["id"]) != str(scheme_id):
                raise HTTPException(
                    status_code=409, detail="A scheme with this name already exists"
                )

        response = (
            self.db.table("schemes")
            .update(update_data)
            .eq("id", str(scheme_id))
            .execute()
        )
        return response.data[0]

    def update_scheme_status(self, scheme_id: UUID, data: SchemeStatusUpdate) -> dict:
        """
        Update scheme status (Active / Inactive).
        """
        # Ensure scheme exists
        self.get_scheme_by_id(scheme_id)

        update_data = {"status": data.status.value}
        response = (
            self.db.table("schemes")
            .update(update_data)
            .eq("id", str(scheme_id))
            .execute()
        )
        return response.data[0]


def get_scheme_service(db: Client) -> SchemeService:
    """Dependency provider for SchemeService."""
    return SchemeService(db)
