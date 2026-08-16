import logging
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from fastapi.responses import JSONResponse
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

        Business scenarios:
        - SCENARIO 1: Same name + same financial values + Inactive
            → Raise 409 with code=INACTIVE_SCHEME_REACTIVATABLE so the frontend
              can offer "Reactivate Scheme" without inserting a duplicate row.
        - SCENARIO 2: Same name + different financial values + Inactive
            → Raise 409 with a clear message that a different version exists.
        - SCENARIO 3: Same name + Active
            → Raise 409 "A scheme with this name already exists."
        - SCENARIO 4: Completely new name
            → Insert and return the new scheme row.
        """
        # Fetch any existing scheme with the same name (active OR inactive)
        existing_response = (
            self.db.table("schemes")
            .select("*")
            .eq("scheme_name", data.scheme_name)
            .execute()
        )

        if existing_response.data:
            existing = existing_response.data[0]

            if existing["status"] == "Active":
                # SCENARIO 3 — Active duplicate
                raise HTTPException(
                    status_code=409,
                    detail="A scheme with this name already exists.",
                )

            # Status is Inactive — compare financial values
            if self._financial_values_match(existing, data):
                # SCENARIO 1 — Inactive, identical financial config
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "INACTIVE_SCHEME_REACTIVATABLE",
                        "message": (
                            "An inactive scheme with the same name and financial "
                            "configuration already exists. You can reactivate it."
                        ),
                        "scheme_id": existing["id"],
                    },
                )
            else:
                # SCENARIO 2 — Inactive, different financial config
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "A scheme with this name already exists with different "
                        "financial values. Create a new scheme with a different "
                        "name or version."
                    ),
                )

        # SCENARIO 4 — New scheme, no name conflict
        insert_data = data.model_dump(mode="json")
        response = self.db.table("schemes").insert(insert_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create scheme")
        return response.data[0]

    def _financial_values_match(self, existing: dict, data: SchemeCreate) -> bool:
        """
        Compare financial fields between existing DB row and proposed create data.
        Uses Decimal comparison to avoid floating-point drift.
        """
        def to_decimal(value) -> Decimal:
            return Decimal(str(value)).quantize(Decimal("0.01"))

        return (
            to_decimal(existing["loan_amount"]) == data.loan_amount
            and to_decimal(existing["weekly_installment"]) == data.weekly_installment
            and int(existing["total_weeks"]) == int(data.total_weeks)
            and to_decimal(existing["note_cost"]) == data.note_cost
        )

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
        Used for both deactivation and reactivation.
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
