import logging
import re
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from supabase import Client

from app.schemas.group import (
    GroupCreate,
    GroupStatus,
    GroupStatusUpdate,
    GroupUpdate,
)

logger = logging.getLogger(__name__)

# Valid business status transitions per docs/02_BUSINESS_RULES.md (BR-025 to BR-029)
VALID_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "Draft": {"Active", "Closed"},
    "Active": {"Completed", "Closed"},
    "Completed": {"Renewed", "Closed"},
    "Renewed": {"Completed", "Closed"},
    "Closed": set(),  # Terminal state: historical data preserved
}


class GroupService:
    """
    Service layer for Group Management.
    Enforces business logic and interacts with Supabase client.
    """

    def __init__(self, db: Client):
        self.db = db

    def suggest_next_group_name(self, location: str) -> dict:
        """
        Suggests the next running group name for a given location.
        Per BR-002: Group Name = Location + Running Number (e.g. PTM 1, PTM 2).
        Calculates max existing integer N and returns N + 1.
        """
        trimmed_location = location.strip()
        if not trimmed_location:
            raise HTTPException(
                status_code=422,
                detail="Location is required to generate a group name.",
            )

        # Query all existing groups
        response = self.db.table("groups").select("group_name").execute()
        existing_groups = response.data or []

        # Match pattern: ^<location>\s+(\d+)$ (case-insensitive for location matching)
        pattern = re.compile(
            rf"^{re.escape(trimmed_location)}\s+(\d+)$", re.IGNORECASE
        )

        numbers: list[int] = []
        for g in existing_groups:
            name = g.get("group_name", "")
            match = pattern.match(name)
            if match:
                try:
                    numbers.append(int(match.group(1)))
                except ValueError:
                    continue

        next_number = max(numbers) + 1 if numbers else 1
        suggested_name = f"{trimmed_location} {next_number}"

        return {
            "suggested_name": suggested_name,
            "next_number": next_number,
        }

    def get_groups(
        self,
        status: Optional[GroupStatus] = None,
        location: Optional[str] = None,
        search: Optional[str] = None,
    ) -> list[dict]:
        """
        Get all groups with joined Scheme data and dynamic calculations.
        Supports filtering by status, location, and name search.
        """
        query = self.db.table("groups").select("*, scheme:schemes(*)")

        if status:
            query = query.eq("status", status.value)
        if location:
            query = query.ilike("location", f"%{location.strip()}%")
        if search:
            query = query.ilike("group_name", f"%{search.strip()}%")

        query = query.order("created_at", desc=True)
        response = query.execute()

        groups = response.data or []
        for g in groups:
            self._enrich_dynamic_fields(g)

        return groups

    def get_group_by_id(self, group_id: UUID) -> dict:
        """
        Get a single group by ID with joined scheme and computed stats.
        """
        response = (
            self.db.table("groups")
            .select("*, scheme:schemes(*)")
            .eq("id", str(group_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Group not found")

        group = response.data[0]
        self._enrich_dynamic_fields(group)
        return group

    def create_group(self, data: GroupCreate) -> dict:
        """
        Create a new group in 'Draft' status.
        Enforces:
        - Scheme must exist and must be 'Active' (cannot create group with Inactive scheme).
        - Group name is auto-generated if omitted.
        - Group name must be unique (HTTP 409 on duplicate).
        """
        # 1. Validate Scheme exists and is Active
        scheme_response = (
            self.db.table("schemes")
            .select("*")
            .eq("id", str(data.scheme_id))
            .execute()
        )
        if not scheme_response.data:
            raise HTTPException(status_code=404, detail="Scheme not found")

        scheme = scheme_response.data[0]
        if scheme["status"] != "Active":
            raise HTTPException(
                status_code=400,
                detail="Cannot create a group using an inactive scheme. Only active schemes can be selected for new groups.",
            )

        # 2. Determine Group Name
        if data.group_name:
            group_name = data.group_name.strip()
        else:
            suggestion = self.suggest_next_group_name(data.location)
            group_name = suggestion["suggested_name"]

        # 3. Check Group Name Uniqueness
        existing = (
            self.db.table("groups")
            .select("id")
            .eq("group_name", group_name)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=409,
                detail=f"A group with the name '{group_name}' already exists.",
            )

        # 4. Insert New Group in Draft status
        insert_data = {
            "location": data.location,
            "scheme_id": str(data.scheme_id),
            "group_name": group_name,
            "start_date": data.start_date.isoformat() if data.start_date else None,
            "remarks": data.remarks,
            "status": GroupStatus.DRAFT.value,
        }

        response = self.db.table("groups").insert(insert_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create group")

        new_group = response.data[0]
        new_group["scheme"] = scheme
        self._enrich_dynamic_fields(new_group)
        return new_group

    def update_group(self, group_id: UUID, data: GroupUpdate) -> dict:
        """
        Update group metadata (group_name, location, start_date, remarks).
        Per business rules, scheme_id is immutable.
        """
        # Ensure group exists
        current_group = self.get_group_by_id(group_id)

        update_dict = data.model_dump(exclude_unset=True)
        if not update_dict:
            return current_group

        # If group_name is being modified, verify uniqueness
        if "group_name" in update_dict and update_dict["group_name"] != current_group["group_name"]:
            new_name = update_dict["group_name"].strip()
            existing = (
                self.db.table("groups")
                .select("id")
                .eq("group_name", new_name)
                .execute()
            )
            if existing.data and str(existing.data[0]["id"]) != str(group_id):
                raise HTTPException(
                    status_code=409,
                    detail=f"A group with the name '{new_name}' already exists.",
                )
            update_dict["group_name"] = new_name

        if "start_date" in update_dict and update_dict["start_date"] is not None:
            update_dict["start_date"] = update_dict["start_date"].isoformat()

        response = (
            self.db.table("groups")
            .update(update_dict)
            .eq("id", str(group_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update group")

        updated_group = response.data[0]
        updated_group["scheme"] = current_group.get("scheme")
        self._enrich_dynamic_fields(updated_group)
        return updated_group

    def update_group_status(self, group_id: UUID, data: GroupStatusUpdate) -> dict:
        """
        Update group status following allowed lifecycle transitions.
        Preserves historical data on closure.
        """
        current_group = self.get_group_by_id(group_id)
        current_status = current_group["status"]
        new_status = data.status.value

        if current_status == new_status:
            return current_group

        allowed_transitions = VALID_STATUS_TRANSITIONS.get(current_status, set())
        if new_status not in allowed_transitions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from '{current_status}' to '{new_status}'.",
            )

        response = (
            self.db.table("groups")
            .update({"status": new_status})
            .eq("id", str(group_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update group status")

        updated_group = response.data[0]
        updated_group["scheme"] = current_group.get("scheme")
        self._enrich_dynamic_fields(updated_group)
        return updated_group

    def _enrich_dynamic_fields(self, group: dict) -> None:
        """
        Calculates dynamic values (member_count, total_group_amount).
        Per BR-004: Total Group Amount = Scheme loan amount × active member count.
        NEVER stored in DB table.
        """
        # In Phase 4, Member Management is not yet implemented.
        # member_count = 0, total_group_amount = 0.00.
        # When members are implemented in Phase 5, this will query active members.
        member_count = group.get("member_count", 0)
        group["member_count"] = member_count

        scheme = group.get("scheme")
        if scheme and "loan_amount" in scheme and member_count > 0:
            loan_amount = Decimal(str(scheme["loan_amount"]))
            group["total_group_amount"] = loan_amount * member_count
        else:
            group["total_group_amount"] = Decimal("0.00")


def get_group_service(db: Client) -> GroupService:
    """Dependency provider for GroupService."""
    return GroupService(db)
