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
    from uuid import uuid4

    service = GroupService(mock_db)

    # 1. Draft -> Active: allowed
    # This now also triggers _disburse_loans_for_draft_members, so we need to
    # mock the members query (returns empty = no members to disburse) and the
    # existing loan_cycles query.
    def draft_to_active_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = [
                {**MOCK_GROUP, "status": "Draft"}
            ]
            mock_tbl.update.return_value.eq.return_value.execute.return_value.data = [
                {**MOCK_GROUP, "status": "Active"}
            ]
        elif table_name == "members":
            # _enrich_dynamic_fields: active count
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
            # _disburse_loans_for_draft_members: get members
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = []
        elif table_name == "loan_cycles":
            # No existing cycles
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = []
        return mock_tbl

    mock_db.table.side_effect = draft_to_active_router
    res = service.update_group_status(
        MOCK_GROUP_ID, GroupStatusUpdate(status=GroupStatus.ACTIVE)
    )
    assert res["status"] == "Active"

    # 2. Active -> Completed: allowed (no disbursement logic for non-Draft transitions)
    mock_db.table.side_effect = None
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


def test_group_enrich_dynamic_fields_zero_members(mock_db):
    """Group with zero active members has member_count=0, total_group_amount=0.00."""
    service = GroupService(mock_db)

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = [MOCK_GROUP]
        elif table_name == "members":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        return mock_tbl

    mock_db.table.side_effect = table_router

    group = service.get_group_by_id(MOCK_GROUP_ID)
    assert group["member_count"] == 0
    assert group["total_group_amount"] == Decimal("0.00")


def test_group_enrich_dynamic_fields_one_active_member(mock_db):
    """Group with 1 active member has member_count=1, total_group_amount=10,000."""
    service = GroupService(mock_db)

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = [MOCK_GROUP]
        elif table_name == "members":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {"id": str(uuid4())}
            ]
        return mock_tbl

    mock_db.table.side_effect = table_router

    group = service.get_group_by_id(MOCK_GROUP_ID)
    assert group["member_count"] == 1
    assert group["total_group_amount"] == Decimal("10000.00")


def test_group_enrich_dynamic_fields_two_active_members(mock_db):
    """Group with 2 active members has member_count=2, total_group_amount=20,000 (BR-004)."""
    service = GroupService(mock_db)

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = [MOCK_GROUP]
        elif table_name == "members":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {"id": str(uuid4())},
                {"id": str(uuid4())},
            ]
        return mock_tbl

    mock_db.table.side_effect = table_router

    group = service.get_group_by_id(MOCK_GROUP_ID)
    assert group["member_count"] == 2
    assert group["total_group_amount"] == Decimal("20000.00")


def test_group_enrich_dynamic_fields_excludes_completed_and_closed_members(mock_db):
    """
    Only Active members are counted towards member_count and total_group_amount.
    Query filters eq('status', 'Active').
    """
    service = GroupService(mock_db)

    mock_members_query = MagicMock()
    mock_members_query.execute.return_value.data = [{"id": str(uuid4())}]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = [MOCK_GROUP]
        elif table_name == "members":
            mock_tbl.select.return_value.eq.return_value.eq.return_value = mock_members_query
        return mock_tbl

    mock_db.table.side_effect = table_router

    group = service.get_group_by_id(MOCK_GROUP_ID)
    assert group["member_count"] == 1
    assert group["total_group_amount"] == Decimal("10000.00")


def test_draft_to_active_creates_loan_cycles_for_existing_members(mock_db):
    """
    BR-026 / TC-GRP-003:
    When a Draft group transitions to Active, loan cycles and loan transactions
    must be created for every existing Active member without a cycle.
    This prevents the "No active loan cycle found" error during first collection.
    """
    from uuid import uuid4
    service = GroupService(mock_db)

    draft_group = {**MOCK_GROUP, "status": "Draft"}
    member_id_1 = str(uuid4())
    member_id_2 = str(uuid4())

    cycles_inserted = []
    txs_inserted = []
    members_queried = []

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = [draft_group]
            mock_tbl.update.return_value.eq.return_value.execute.return_value.data = [
                {**draft_group, "status": "Active"}
            ]
        elif table_name == "members":
            # Both _enrich and _disburse call members; return 2 members for all paths
            two_members = [
                {"id": member_id_1, "member_name": "Member A"},
                {"id": member_id_2, "member_name": "Member B"},
            ]
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = two_members
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = two_members
        elif table_name == "loan_cycles":
            # No existing cycles
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = []
            def do_insert(data):
                cycles_inserted.append(data)
                return MagicMock(data=[{"id": str(uuid4())}])
            mock_tbl.insert.side_effect = do_insert
        elif table_name == "loan_transactions":
            def do_tx_insert(data):
                txs_inserted.append(data)
                return MagicMock(data=[{"id": str(uuid4())}])
            mock_tbl.insert.side_effect = do_tx_insert
        return mock_tbl

    mock_db.table.side_effect = table_router

    result = service.update_group_status(
        MOCK_GROUP_ID, GroupStatusUpdate(status=GroupStatus.ACTIVE)
    )
    assert result["status"] == "Active"
    assert len(cycles_inserted) == 2, f"Expected 2 loan cycles, got {len(cycles_inserted)}"
    assert len(txs_inserted) == 2, f"Expected 2 loan transactions, got {len(txs_inserted)}"


def test_draft_to_active_skips_members_with_existing_cycles(mock_db):
    """
    Idempotency: members who already have a loan cycle must be skipped
    during Draft -> Active activation to prevent double-disbursement.
    """
    from uuid import uuid4
    service = GroupService(mock_db)

    draft_group = {**MOCK_GROUP, "status": "Draft"}
    member_id = str(uuid4())
    existing_cycle_id = str(uuid4())

    inserted_tables = []

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = [draft_group]
            mock_tbl.update.return_value.eq.return_value.execute.return_value.data = [
                {**draft_group, "status": "Active"}
            ]
        elif table_name == "members":
            one_member = [{"id": member_id, "member_name": "Already Cycled"}]
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = one_member
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = one_member
        elif table_name == "loan_cycles":
            # This member already has a cycle
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = [
                {"member_id": member_id}
            ]
            def track_insert(data):
                inserted_tables.append("loan_cycles")
                return MagicMock(data=[{"id": str(uuid4())}])
            mock_tbl.insert.side_effect = track_insert
        elif table_name == "loan_transactions":
            def track_tx(data):
                inserted_tables.append("loan_transactions")
                return MagicMock(data=[{"id": str(uuid4())}])
            mock_tbl.insert.side_effect = track_tx
        return mock_tbl

    mock_db.table.side_effect = table_router

    result = service.update_group_status(
        MOCK_GROUP_ID, GroupStatusUpdate(status=GroupStatus.ACTIVE)
    )
    assert result["status"] == "Active"
    assert "loan_cycles" not in inserted_tables, "Should not create duplicate loan cycle"
    assert "loan_transactions" not in inserted_tables, "Should not create duplicate loan transaction"


def test_create_group_recycled_with_owner_investment(mock_db):
    """
    When creating a group with Recycled Collections and Recycled + Owner Investment,
    an investment record must automatically be created in the investments table.
    """
    service = GroupService(mock_db)

    # 1. Scheme lookup
    scheme_mock = MagicMock()
    scheme_mock.select.return_value.eq.return_value.execute.return_value.data = [MOCK_ACTIVE_SCHEME]

    # 2. Existing group lookup (empty)
    name_check_mock = MagicMock()
    name_check_mock.select.return_value.eq.return_value.execute.return_value.data = []

    # 3. Group insert mock
    new_group_data = {
        "id": MOCK_GROUP_ID,
        "scheme_id": MOCK_SCHEME_ID,
        "location": "PTM",
        "group_name": "PTM 2",
        "start_date": "2026-08-23",
        "funding_source": "Recycled Collections",
        "recycled_sub_type": "Recycled + Owner Investment",
        "owner_investment_amount": 90000.00,
        "status": "Draft",
        "remarks": None,
    }
    group_insert_mock = MagicMock()
    group_insert_mock.insert.return_value.execute.return_value.data = [new_group_data]

    # 4. Investment insert mock
    captured_investments = []
    inv_mock = MagicMock()
    def track_inv(data):
        captured_investments.append(data)
        return MagicMock(execute=MagicMock(return_value=MagicMock(data=[{"id": str(uuid4()), **data}])))
    inv_mock.insert.side_effect = track_inv

    # 5. Members count mock (empty)
    members_mock = MagicMock()
    members_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

    def router(table_name):
        if table_name == "schemes":
            return scheme_mock
        elif table_name == "groups":
            # Can be select or insert
            m = MagicMock()
            m.select.return_value.eq.return_value.execute.return_value.data = []
            m.insert.return_value.execute.return_value.data = [new_group_data]
            return m
        elif table_name == "investments":
            return inv_mock
        elif table_name == "members":
            return members_mock
        return MagicMock()

    mock_db.table.side_effect = router

    group_in = GroupCreate(
        location="PTM",
        scheme_id=MOCK_SCHEME_ID,
        group_name="PTM 2",
        start_date=date(2026, 8, 23),
        funding_source="Recycled Collections",
        recycled_sub_type="Recycled + Owner Investment",
        owner_investment_amount=Decimal("90000.00"),
    )

    created = service.create_group(group_in)
    assert created["group_name"] == "PTM 2"
    assert created["funding_source"] == "Recycled Collections"
    assert created["recycled_sub_type"] == "Recycled + Owner Investment"
    assert created["owner_investment_amount"] == Decimal("90000.00")

    # Verify investment record was auto-created
    assert len(captured_investments) == 1
    inv = captured_investments[0]
    assert inv["amount"] == 90000.00
    assert inv["investment_type"] == "Additional"  # Week 3 (23 Aug) -> Additional
    assert "PTM 2" in inv["description"]
    assert inv["group_id"] == MOCK_GROUP_ID


def test_list_locations_endpoint(client, mock_service):
    """GET /api/v1/groups/locations returns distinct locations list."""
    mock_service.get_distinct_locations.return_value = ["PTM", "TNK", "VLM"]
    response = client.get("/api/v1/groups/locations")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"] == ["PTM", "TNK", "VLM"]


def test_get_distinct_locations_service(mock_db):
    """Service returns deduplicated, sorted, non-empty locations."""
    groups_mock = MagicMock()
    groups_mock.select.return_value.execute.return_value = MagicMock(
        data=[
            {"location": "PTM"},
            {"location": "TNK"},
            {"location": "ptm"},
            {"location": "  VLM  "},
            {"location": ""},
            {"location": None},
        ]
    )
    mock_db.table.return_value = groups_mock

    service = GroupService(mock_db)
    locations = service.get_distinct_locations()
    assert locations == ["PTM", "TNK", "VLM"]


def test_effective_weekly_installment_helper():
    """Validates get_effective_weekly_installment resolution priority."""
    from app.core.finance_calc import get_effective_weekly_installment, DEFAULT_WEEKLY_INSTALLMENT

    # 1. Group override takes highest precedence
    assert get_effective_weekly_installment({"weekly_installment": 1000}, {"weekly_installment": 760}) == Decimal("1000")
    # 2. Scheme fallback when group has none
    assert get_effective_weekly_installment({"weekly_installment": None}, {"weekly_installment": 760}) == Decimal("760")
    # 3. Embedded scheme in group dict
    assert get_effective_weekly_installment({"scheme": {"weekly_installment": 800}}) == Decimal("800")
    # 4. Default fallback
    assert get_effective_weekly_installment(None, None) == DEFAULT_WEEKLY_INSTALLMENT


