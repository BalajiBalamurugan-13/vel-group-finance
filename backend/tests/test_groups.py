"""
VEL Finance — Group Management Tests
=====================================
Comprehensive tests for Group CRUD, name suggestion, validation,
and lifecycle status transitions.
"""
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.endpoints.groups import get_service
from app.main import create_application
from app.schemas.group import GroupCreate, GroupStatus, GroupStatusUpdate, GroupUpdate
from app.services.group_service import GroupService

# ── Mock Fixtures & Data ───────────────────────────────────────────────────────

MOCK_SCHEME_ID = str(uuid4())
MOCK_GROUP_ID = str(uuid4())

MOCK_ACTIVE_SCHEME = {
    "id": MOCK_SCHEME_ID,
    "scheme_name": "10K Standard",
    "description": "Standard 10K loan",
    "loan_amount": "10000.00",
    "weekly_installment": "1000.00",
    "total_weeks": 10,
    "note_cost": "100.00",
    "status": "Active",
    "created_at": "2026-08-15T12:00:00Z",
    "updated_at": "2026-08-15T12:00:00Z",
}

MOCK_INACTIVE_SCHEME = {
    **MOCK_ACTIVE_SCHEME,
    "id": str(uuid4()),
    "scheme_name": "Old 10K Scheme",
    "status": "Inactive",
}

MOCK_GROUP = {
    "id": MOCK_GROUP_ID,
    "scheme_id": MOCK_SCHEME_ID,
    "location": "PTM",
    "group_name": "PTM 1",
    "start_date": "2026-08-20",
    "status": "Draft",
    "remarks": "Test group",
    "member_count": 0,
    "total_group_amount": Decimal("0.00"),
    "scheme": MOCK_ACTIVE_SCHEME,
    "created_at": "2026-08-16T12:00:00Z",
    "updated_at": "2026-08-16T12:00:00Z",
}


@pytest.fixture
def mock_service():
    return MagicMock(spec=GroupService)


@pytest.fixture
def client(mock_service):
    app = create_application()
    app.dependency_overrides[get_service] = lambda: mock_service
    return TestClient(app)


# ── API Router Tests ───────────────────────────────────────────────────────────

def test_list_groups(client, mock_service):
    mock_service.get_groups.return_value = [MOCK_GROUP]
    response = client.get("/api/v1/groups")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(response.json()["data"]) == 1
    assert response.json()["data"][0]["group_name"] == "PTM 1"


def test_list_groups_with_filters(client, mock_service):
    mock_service.get_groups.return_value = [MOCK_GROUP]
    response = client.get("/api/v1/groups?status=Draft&location=PTM&search=PTM")
    assert response.status_code == 200
    mock_service.get_groups.assert_called_once_with(
        status=GroupStatus.DRAFT, location="PTM", search="PTM"
    )


def test_suggest_group_name_endpoint(client, mock_service):
    mock_service.suggest_next_group_name.return_value = {
        "suggested_name": "PTM 3",
        "next_number": 3,
    }
    response = client.get("/api/v1/groups/suggest-name?location=PTM")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["suggested_name"] == "PTM 3"
    assert response.json()["data"]["next_number"] == 3


def test_get_group_by_id(client, mock_service):
    mock_service.get_group_by_id.return_value = MOCK_GROUP
    response = client.get(f"/api/v1/groups/{MOCK_GROUP_ID}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["id"] == MOCK_GROUP_ID


def test_create_group_endpoint(client, mock_service):
    mock_service.create_group.return_value = MOCK_GROUP
    payload = {
        "location": "PTM",
        "scheme_id": MOCK_SCHEME_ID,
        "group_name": "PTM 1",
        "start_date": "2026-08-20",
        "remarks": "Test group",
    }
    response = client.post("/api/v1/groups", json=payload)
    assert response.status_code == 201
    assert response.json()["success"] is True
    assert response.json()["data"]["group_name"] == "PTM 1"
    assert response.json()["data"]["status"] == "Draft"


def test_create_group_validation_empty_location(client, mock_service):
    payload = {
        "location": "   ",
        "scheme_id": MOCK_SCHEME_ID,
    }
    response = client.post("/api/v1/groups", json=payload)
    assert response.status_code == 422
    assert response.json()["success"] is False


def test_update_group_endpoint(client, mock_service):
    updated = {**MOCK_GROUP, "group_name": "PTM 1 Updated", "remarks": "Updated"}
    mock_service.update_group.return_value = updated
    payload = {
        "group_name": "PTM 1 Updated",
        "remarks": "Updated",
    }
    response = client.put(f"/api/v1/groups/{MOCK_GROUP_ID}", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["group_name"] == "PTM 1 Updated"


def test_update_group_rejects_scheme_id_mutation(client, mock_service):
    # Attempting to modify scheme_id must be rejected (extra forbidden)
    payload = {"scheme_id": str(uuid4())}
    response = client.put(f"/api/v1/groups/{MOCK_GROUP_ID}", json=payload)
    assert response.status_code == 422
    assert response.json()["success"] is False


def test_update_group_status_endpoint(client, mock_service):
    active_group = {**MOCK_GROUP, "status": "Active"}
    mock_service.update_group_status.return_value = active_group
    payload = {"status": "Active"}
    response = client.patch(f"/api/v1/groups/{MOCK_GROUP_ID}/status", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["status"] == "Active"


# ── Service Layer Tests (Supabase Mock) ────────────────────────────────────────

@pytest.fixture
def mock_db():
    return MagicMock()


def test_service_suggest_next_group_name_new_location(mock_db):
    """If no groups exist for location, suggests '<LOC> 1'."""
    service = GroupService(mock_db)
    mock_exec = MagicMock()
    mock_exec.data = []
    mock_db.table.return_value.select.return_value.execute = MagicMock(
        return_value=mock_exec
    )

    result = service.suggest_next_group_name("TNK")
    assert result["suggested_name"] == "TNK 1"
    assert result["next_number"] == 1


def test_service_suggest_next_group_name_increments(mock_db):
    """Calculates max existing integer and returns N + 1."""
    service = GroupService(mock_db)
    mock_exec = MagicMock()
    mock_exec.data = [
        {"group_name": "PTM 1"},
        {"group_name": "PTM 2"},
        {"group_name": "TNK 1"},
        {"group_name": "PTM 4"},  # Non-contiguous
    ]
    mock_db.table.return_value.select.return_value.execute = MagicMock(
        return_value=mock_exec
    )

    result = service.suggest_next_group_name("PTM")
    assert result["suggested_name"] == "PTM 5"
    assert result["next_number"] == 5


def test_service_suggest_next_group_name_case_insensitive(mock_db):
    """Preserves user location casing while matching existing case-insensitively."""
    service = GroupService(mock_db)
    mock_exec = MagicMock()
    mock_exec.data = [
        {"group_name": "ptm 1"},
        {"group_name": "PTM 2"},
    ]
    mock_db.table.return_value.select.return_value.execute = MagicMock(
        return_value=mock_exec
    )

    result = service.suggest_next_group_name("PTM")
    assert result["suggested_name"] == "PTM 3"
    assert result["next_number"] == 3


def test_service_create_group_success(mock_db):
    """Group creation in Draft status with Active scheme."""
    service = GroupService(mock_db)

    # 1. Scheme check -> Active scheme found
    mock_scheme_exec = MagicMock()
    mock_scheme_exec.data = [MOCK_ACTIVE_SCHEME]

    # 2. Duplicate check -> None
    mock_dup_exec = MagicMock()
    mock_dup_exec.data = []

    # 3. Insert -> Created row
    mock_insert_exec = MagicMock()
    mock_insert_exec.data = [MOCK_GROUP]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "schemes":
            mock_tbl.select.return_value.eq.return_value.execute = MagicMock(
                return_value=mock_scheme_exec
            )
        elif table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute = MagicMock(
                return_value=mock_dup_exec
            )
            mock_tbl.insert.return_value.execute = MagicMock(
                return_value=mock_insert_exec
            )
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = GroupCreate(
        location="PTM",
        scheme_id=MOCK_SCHEME_ID,
        group_name="PTM 1",
        start_date=date(2026, 8, 20),
    )
    result = service.create_group(data)
    assert result["id"] == MOCK_GROUP_ID
    assert result["status"] == "Draft"
    assert result["member_count"] == 0
    assert result["total_group_amount"] == Decimal("0.00")


def test_service_create_group_rejects_inactive_scheme(mock_db):
    """Creating a group using an Inactive scheme must be rejected."""
    service = GroupService(mock_db)

    mock_scheme_exec = MagicMock()
    mock_scheme_exec.data = [MOCK_INACTIVE_SCHEME]
    mock_db.table.return_value.select.return_value.eq.return_value.execute = (
        MagicMock(return_value=mock_scheme_exec)
    )

    data = GroupCreate(
        location="PTM",
        scheme_id=MOCK_INACTIVE_SCHEME["id"],
        group_name="PTM 1",
    )

    with pytest.raises(HTTPException) as exc:
        service.create_group(data)

    assert exc.value.status_code == 400
    assert "inactive scheme" in exc.value.detail.lower()


def test_service_create_group_rejects_nonexistent_scheme(mock_db):
    """Creating a group with unknown scheme ID returns 404."""
    service = GroupService(mock_db)

    mock_scheme_exec = MagicMock()
    mock_scheme_exec.data = []
    mock_db.table.return_value.select.return_value.eq.return_value.execute = (
        MagicMock(return_value=mock_scheme_exec)
    )

    data = GroupCreate(
        location="PTM",
        scheme_id=uuid4(),
    )

    with pytest.raises(HTTPException) as exc:
        service.create_group(data)

    assert exc.value.status_code == 404
    assert "scheme not found" in exc.value.detail.lower()


def test_service_create_group_duplicate_name_409(mock_db):
    """Duplicate group_name returns 409 Conflict."""
    service = GroupService(mock_db)

    mock_scheme_exec = MagicMock()
    mock_scheme_exec.data = [MOCK_ACTIVE_SCHEME]

    mock_dup_exec = MagicMock()
    mock_dup_exec.data = [{"id": str(uuid4())}]  # Duplicate found

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "schemes":
            mock_tbl.select.return_value.eq.return_value.execute = MagicMock(
                return_value=mock_scheme_exec
            )
        elif table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute = MagicMock(
                return_value=mock_dup_exec
            )
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = GroupCreate(
        location="PTM",
        scheme_id=MOCK_SCHEME_ID,
        group_name="PTM 1",
    )

    with pytest.raises(HTTPException) as exc:
        service.create_group(data)

    assert exc.value.status_code == 409
    assert "already exists" in exc.value.detail.lower()


def test_service_update_group_duplicate_name_409(mock_db):
    """Updating a group to another group's name returns 409."""
    service = GroupService(mock_db)

    other_group_id = str(uuid4())

    mock_get_exec = MagicMock()
    mock_get_exec.data = [MOCK_GROUP]

    mock_dup_exec = MagicMock()
    mock_dup_exec.data = [{"id": other_group_id}]

    mock_groups_table = MagicMock()
    mock_groups_table.select.return_value.eq.return_value.execute.side_effect = [
        mock_get_exec,
        mock_dup_exec,
    ]

    mock_db.table.return_value = mock_groups_table

    update_data = GroupUpdate(group_name="PTM 2")
    with pytest.raises(HTTPException) as exc:
        service.update_group(MOCK_GROUP_ID, update_data)

    assert exc.value.status_code == 409


def test_service_status_lifecycle_transitions(mock_db):
    """
    Valid lifecycle transitions:
    Draft -> Active -> Completed -> Closed
    Draft -> Closed
    """
    service = GroupService(mock_db)

    # 1. Draft -> Active: allowed
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {**MOCK_GROUP, "status": "Draft"}
    ]
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {**MOCK_GROUP, "status": "Active"}
    ]
    res = service.update_group_status(
        MOCK_GROUP_ID, GroupStatusUpdate(status=GroupStatus.ACTIVE)
    )
    assert res["status"] == "Active"

    # 2. Active -> Completed: allowed
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {**MOCK_GROUP, "status": "Active"}
    ]
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {**MOCK_GROUP, "status": "Completed"}
    ]
    res = service.update_group_status(
        MOCK_GROUP_ID, GroupStatusUpdate(status=GroupStatus.COMPLETED)
    )
    assert res["status"] == "Completed"

    # 3. Completed -> Closed: allowed
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {**MOCK_GROUP, "status": "Completed"}
    ]
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {**MOCK_GROUP, "status": "Closed"}
    ]
    res = service.update_group_status(
        MOCK_GROUP_ID, GroupStatusUpdate(status=GroupStatus.CLOSED)
    )
    assert res["status"] == "Closed"


def test_service_status_invalid_transition_rejected(mock_db):
    """Invalid transition (e.g. Draft -> Completed) is rejected with 400."""
    service = GroupService(mock_db)

    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {**MOCK_GROUP, "status": "Draft"}
    ]

    with pytest.raises(HTTPException) as exc:
        service.update_group_status(
            MOCK_GROUP_ID, GroupStatusUpdate(status=GroupStatus.COMPLETED)
        )

    assert exc.value.status_code == 400
    assert "invalid status transition" in exc.value.detail.lower()


def test_service_status_closed_is_terminal(mock_db):
    """Transitioning out of Closed status is blocked."""
    service = GroupService(mock_db)

    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {**MOCK_GROUP, "status": "Closed"}
    ]

    with pytest.raises(HTTPException) as exc:
        service.update_group_status(
            MOCK_GROUP_ID, GroupStatusUpdate(status=GroupStatus.ACTIVE)
        )

    assert exc.value.status_code == 400
    assert "invalid status transition" in exc.value.detail.lower()


def test_existing_group_with_inactive_scheme_remains_functional(mock_db):
    """
    An existing group whose Scheme was later marked Inactive
    must still be retrieved and updated without error.
    """
    service = GroupService(mock_db)

    group_with_inactive_scheme = {
        **MOCK_GROUP,
        "scheme_id": MOCK_INACTIVE_SCHEME["id"],
        "scheme": MOCK_INACTIVE_SCHEME,
    }

    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        group_with_inactive_scheme
    ]

    group = service.get_group_by_id(MOCK_GROUP_ID)
    assert group["id"] == MOCK_GROUP_ID
    assert group["scheme"]["status"] == "Inactive"
