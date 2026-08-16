"""
VEL Finance — Member Management Tests
======================================
Comprehensive tests for Member CRUD, single-active-group constraint,
loan cycle creation, loan transaction disbursement, late-joining calculations,
and group dynamic recalculations.
"""
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.endpoints.members import get_service
from app.main import create_application
from app.schemas.member import (
    MemberCreate,
    MemberStatus,
    MemberStatusUpdate,
    MemberUpdate,
)
from app.services.member_service import MemberService

# ── Mock Fixtures & Data ───────────────────────────────────────────────────────

MOCK_SCHEME_ID = str(uuid4())
MOCK_GROUP_ID = str(uuid4())
MOCK_MEMBER_ID = str(uuid4())
MOCK_CYCLE_ID = str(uuid4())
MOCK_TX_ID = str(uuid4())

MOCK_SCHEME = {
    "id": MOCK_SCHEME_ID,
    "scheme_name": "10K Standard",
    "description": "Standard 10K loan",
    "loan_amount": "10000.00",
    "weekly_installment": "760.00",
    "total_weeks": 18,
    "note_cost": "100.00",
    "status": "Active",
    "created_at": "2026-08-15T12:00:00Z",
    "updated_at": "2026-08-15T12:00:00Z",
}

MOCK_ACTIVE_GROUP = {
    "id": MOCK_GROUP_ID,
    "scheme_id": MOCK_SCHEME_ID,
    "location": "PTM",
    "group_name": "PTM 1",
    "start_date": "2026-08-01",
    "status": "Active",
    "remarks": "Active group",
    "scheme": MOCK_SCHEME,
    "created_at": "2026-08-01T12:00:00Z",
    "updated_at": "2026-08-01T12:00:00Z",
}

MOCK_DRAFT_GROUP = {
    **MOCK_ACTIVE_GROUP,
    "id": str(uuid4()),
    "group_name": "PTM 2",
    "status": "Draft",
}

MOCK_CLOSED_GROUP = {
    **MOCK_ACTIVE_GROUP,
    "id": str(uuid4()),
    "group_name": "PTM 0",
    "status": "Closed",
}

MOCK_MEMBER = {
    "id": MOCK_MEMBER_ID,
    "group_id": MOCK_GROUP_ID,
    "member_name": "Murugan S",
    "phone_number": "9876543210",
    "address": "12, South Street, PTM",
    "photo_url": None,
    "nominee": "Lakshmi M",
    "id_proof": "AADHAAR-1234",
    "joined_week": 1,
    "joined_date": "2026-08-01",
    "status": "Active",
    "remarks": "Initial member",
    "group": MOCK_ACTIVE_GROUP,
    "created_at": "2026-08-01T12:00:00Z",
    "updated_at": "2026-08-01T12:00:00Z",
}


@pytest.fixture
def mock_service():
    return MagicMock(spec=MemberService)


@pytest.fixture
def client(mock_service):
    app = create_application()
    app.dependency_overrides[get_service] = lambda: mock_service
    return TestClient(app)


# ── API Router Tests ───────────────────────────────────────────────────────────

def test_list_members(client, mock_service):
    mock_service.get_members.return_value = [MOCK_MEMBER]
    response = client.get("/api/v1/members")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(response.json()["data"]) == 1
    assert response.json()["data"][0]["member_name"] == "Murugan S"


def test_list_members_with_filters(client, mock_service):
    mock_service.get_members.return_value = [MOCK_MEMBER]
    response = client.get(
        f"/api/v1/members?group_id={MOCK_GROUP_ID}&status=Active&search=Murugan"
    )
    assert response.status_code == 200
    mock_service.get_members.assert_called_once()


def test_get_member_by_id(client, mock_service):
    mock_service.get_member_by_id.return_value = MOCK_MEMBER
    response = client.get(f"/api/v1/members/{MOCK_MEMBER_ID}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["id"] == MOCK_MEMBER_ID


def test_create_member_endpoint(client, mock_service):
    mock_service.create_member.return_value = MOCK_MEMBER
    payload = {
        "group_id": MOCK_GROUP_ID,
        "member_name": "Murugan S",
        "phone_number": "9876543210",
        "address": "12, South Street, PTM",
        "nominee": "Lakshmi M",
    }
    response = client.post("/api/v1/members", json=payload)
    assert response.status_code == 201
    assert response.json()["success"] is True
    assert response.json()["data"]["member_name"] == "Murugan S"


def test_create_member_validation_errors(client, mock_service):
    # Missing required name
    payload = {
        "group_id": MOCK_GROUP_ID,
        "member_name": "   ",
        "phone_number": "9876543210",
        "address": "12, South Street",
    }
    response = client.post("/api/v1/members", json=payload)
    assert response.status_code == 422
    assert response.json()["success"] is False

    # Invalid phone (less than 5 digits)
    payload["member_name"] = "Murugan S"
    payload["phone_number"] = "12"
    response = client.post("/api/v1/members", json=payload)
    assert response.status_code == 422


def test_update_member_endpoint(client, mock_service):
    updated = {**MOCK_MEMBER, "address": "New Address"}
    mock_service.update_member.return_value = updated
    payload = {"address": "New Address"}
    response = client.put(f"/api/v1/members/{MOCK_MEMBER_ID}", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["address"] == "New Address"


def test_update_member_rejects_group_id_mutation(client, mock_service):
    # group_id cannot be modified (forbidden extra)
    payload = {"group_id": str(uuid4())}
    response = client.put(f"/api/v1/members/{MOCK_MEMBER_ID}", json=payload)
    assert response.status_code == 422
    assert response.json()["success"] is False


def test_update_member_status_endpoint(client, mock_service):
    completed = {**MOCK_MEMBER, "status": "Completed"}
    mock_service.update_member_status.return_value = completed
    payload = {"status": "Completed"}
    response = client.patch(f"/api/v1/members/{MOCK_MEMBER_ID}/status", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["status"] == "Completed"


# ── Service Layer Tests (Supabase Mock) ────────────────────────────────────────

@pytest.fixture
def mock_db():
    return MagicMock()


def test_service_calculate_joined_week():
    service = MemberService(MagicMock())
    start = date(2026, 8, 1)

    # Joined on start date -> Week 1
    assert service.calculate_joined_week(start, date(2026, 8, 1), 18) == 1

    # Joined 6 days later (within week 1) -> Week 1
    assert service.calculate_joined_week(start, date(2026, 8, 7), 18) == 1

    # Joined 7 days later (Week 2) -> Week 2
    assert service.calculate_joined_week(start, date(2026, 8, 8), 18) == 2

    # Joined 28 days later (Week 5) -> Week 5
    assert service.calculate_joined_week(start, date(2026, 8, 29), 18) == 5

    # Late joining beyond total weeks -> clamped to total_weeks
    assert service.calculate_joined_week(start, start + timedelta(days=200), 18) == 18


def test_service_calculate_immediate_collection():
    service = MemberService(MagicMock())
    weekly = Decimal("760.00")

    # Week 1
    assert service.calculate_immediate_collection(1, weekly) == Decimal("760.00")

    # Week 5 (Per Formula 6: 5 × 760 = 3,800)
    assert service.calculate_immediate_collection(5, weekly) == Decimal("3800.00")


def test_service_create_member_in_draft_group(mock_db):
    """
    Adding member to Draft group (TC-MEM-001):
    Member record created; NO loan disbursement until activation.
    """
    service = MemberService(mock_db)

    mock_group_exec = MagicMock()
    mock_group_exec.data = [MOCK_DRAFT_GROUP]

    mock_dup_exec = MagicMock()
    mock_dup_exec.data = []

    mock_member_exec = MagicMock()
    mock_member_exec.data = [{**MOCK_MEMBER, "group_id": MOCK_DRAFT_GROUP["id"]}]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_group_exec
        elif table_name == "members":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_dup_exec
            mock_tbl.insert.return_value.execute.return_value = mock_member_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = MemberCreate(
        group_id=MOCK_DRAFT_GROUP["id"],
        member_name="Murugan S",
        phone_number="9876543210",
        address="12, South Street, PTM",
    )
    result = service.create_member(data)
    assert result["member_name"] == "Murugan S"
    assert result["joined_week"] == 1
    assert "current_cycle" not in result or result["current_cycle"] is None


def test_service_create_member_in_active_group_creates_disbursement(mock_db):
    """
    Adding member to Active group (TC-MEM-002 / BR-009 / BR-012):
    Creates Member + Loan Cycle + Loan Transaction (cash_given = loan_amount - note_cost).
    """
    service = MemberService(mock_db)

    mock_group_exec = MagicMock()
    mock_group_exec.data = [MOCK_ACTIVE_GROUP]

    mock_dup_exec = MagicMock()
    mock_dup_exec.data = []

    mock_member_exec = MagicMock()
    mock_member_exec.data = [MOCK_MEMBER]

    mock_cycle_exec = MagicMock()
    mock_cycle_exec.data = [{
        "id": MOCK_CYCLE_ID,
        "member_id": MOCK_MEMBER_ID,
        "group_id": MOCK_GROUP_ID,
        "scheme_id": MOCK_SCHEME_ID,
        "cycle_number": 1,
        "status": "Active",
    }]

    mock_tx_exec = MagicMock()
    mock_tx_exec.data = [{
        "id": MOCK_TX_ID,
        "loan_cycle_id": MOCK_CYCLE_ID,
        "member_id": MOCK_MEMBER_ID,
        "loan_amount": 10000.00,
        "note_cost": 100.00,
        "cash_given": 9900.00,
        "disbursement_date": "2026-08-01",
    }]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_group_exec
        elif table_name == "members":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_dup_exec
            mock_tbl.insert.return_value.execute.return_value = mock_member_exec
        elif table_name == "loan_cycles":
            mock_tbl.insert.return_value.execute.return_value = mock_cycle_exec
        elif table_name == "loan_transactions":
            mock_tbl.insert.return_value.execute.return_value = mock_tx_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = MemberCreate(
        group_id=MOCK_GROUP_ID,
        member_name="Murugan S",
        phone_number="9876543210",
        address="12, South Street, PTM",
        joined_date=date(2026, 8, 1),
    )
    result = service.create_member(data)
    assert result["member_name"] == "Murugan S"
    assert result["cash_given"] == Decimal("9900.00")
    assert result["loan_amount"] == Decimal("10000.00")
    assert result["note_cost"] == Decimal("100.00")
    assert result["current_cycle"]["loan_transaction"]["cash_given"] == 9900.00


def test_service_create_member_late_joining_week_5(mock_db):
    """
    Late joining in Week 5 (BR-020, BR-022, BR-023, TC-MEM-003):
    Calculates joined_week=5 and immediate_collection = 5 × 760 = 3800.
    """
    service = MemberService(mock_db)

    mock_group_exec = MagicMock()
    mock_group_exec.data = [MOCK_ACTIVE_GROUP]  # start_date: 2026-08-01

    mock_dup_exec = MagicMock()
    mock_dup_exec.data = []

    # Joined 28 days later (Week 5)
    week_5_date = date(2026, 8, 29)
    week_5_member = {
        **MOCK_MEMBER,
        "joined_week": 5,
        "joined_date": week_5_date.isoformat(),
    }

    mock_member_exec = MagicMock()
    mock_member_exec.data = [week_5_member]

    mock_cycle_exec = MagicMock()
    mock_cycle_exec.data = [{"id": MOCK_CYCLE_ID, "cycle_number": 1}]

    mock_tx_exec = MagicMock()
    mock_tx_exec.data = [{"id": MOCK_TX_ID, "cash_given": 9900.00}]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_group_exec
        elif table_name == "members":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_dup_exec
            mock_tbl.insert.return_value.execute.return_value = mock_member_exec
        elif table_name == "loan_cycles":
            mock_tbl.insert.return_value.execute.return_value = mock_cycle_exec
        elif table_name == "loan_transactions":
            mock_tbl.insert.return_value.execute.return_value = mock_tx_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = MemberCreate(
        group_id=MOCK_GROUP_ID,
        member_name="Late Joiner",
        phone_number="9876543211",
        address="15, Market Road",
        joined_date=week_5_date,
    )
    result = service.create_member(data)
    assert result["joined_week"] == 5
    assert result["immediate_collection"] == Decimal("3800.00")  # 5 × 760


def test_service_create_member_duplicate_active_phone_rejected(mock_db):
    """
    BR-007: Member belongs to only one active group.
    Returns 409 if phone number is already active in another group.
    """
    service = MemberService(mock_db)

    mock_group_exec = MagicMock()
    mock_group_exec.data = [MOCK_ACTIVE_GROUP]

    mock_dup_exec = MagicMock()
    mock_dup_exec.data = [
        {
            "id": str(uuid4()),
            "status": "Active",
            "group": {"id": str(uuid4()), "status": "Active"},
        }
    ]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_group_exec
        elif table_name == "members":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_dup_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = MemberCreate(
        group_id=MOCK_GROUP_ID,
        member_name="Murugan S",
        phone_number="9876543210",
        address="12, South Street, PTM",
    )
    with pytest.raises(HTTPException) as exc:
        service.create_member(data)

    assert exc.value.status_code == 409
    assert "already active" in exc.value.detail.lower()


def test_service_create_member_closed_group_rejected(mock_db):
    """Cannot add member to a closed group."""
    service = MemberService(mock_db)

    mock_group_exec = MagicMock()
    mock_group_exec.data = [MOCK_CLOSED_GROUP]
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_group_exec

    data = MemberCreate(
        group_id=MOCK_CLOSED_GROUP["id"],
        member_name="Murugan S",
        phone_number="9876543210",
        address="12, South Street",
    )
    with pytest.raises(HTTPException) as exc:
        service.create_member(data)

    assert exc.value.status_code == 400
    assert "closed group" in exc.value.detail.lower()


def test_service_update_member_status_lifecycle(mock_db):
    """Member status: Active -> Completed -> Closed."""
    service = MemberService(mock_db)

    mock_get_exec = MagicMock()
    mock_get_exec.data = [MOCK_MEMBER]

    mock_cycle_exec = MagicMock()
    mock_cycle_exec.data = []

    mock_update_exec = MagicMock()
    mock_update_exec.data = [{**MOCK_MEMBER, "status": "Completed"}]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "members":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_get_exec
            mock_tbl.update.return_value.eq.return_value.execute.return_value = mock_update_exec
        elif table_name == "loan_cycles":
            mock_tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = mock_cycle_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    result = service.update_member_status(
        MOCK_MEMBER_ID, MemberStatusUpdate(status=MemberStatus.COMPLETED)
    )
    assert result["status"] == "Completed"


def test_service_update_member_status_invalid_transition(mock_db):
    """Transition from Closed is blocked (terminal state)."""
    service = MemberService(mock_db)

    closed_member = {**MOCK_MEMBER, "status": "Closed"}
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        closed_member
    ]
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []

    with pytest.raises(HTTPException) as exc:
        service.update_member_status(
            MOCK_MEMBER_ID, MemberStatusUpdate(status=MemberStatus.ACTIVE)
        )

    assert exc.value.status_code == 400
    assert "invalid member status transition" in exc.value.detail.lower()


def test_service_create_member_same_phone_in_closed_group_allowed(mock_db):
    """
    BR-007: If a member's previous group is 'Closed', they are allowed to
    enroll in a new active group with the same phone number.
    """
    service = MemberService(mock_db)

    mock_group_exec = MagicMock()
    mock_group_exec.data = [MOCK_ACTIVE_GROUP]

    # Existing member in a CLOSED group
    mock_dup_exec = MagicMock()
    mock_dup_exec.data = [
        {
            "id": str(uuid4()),
            "status": "Active",
            "group": {"id": str(uuid4()), "status": "Closed"},
        }
    ]

    mock_member_exec = MagicMock()
    mock_member_exec.data = [MOCK_MEMBER]

    mock_cycle_exec = MagicMock()
    mock_cycle_exec.data = [{"id": MOCK_CYCLE_ID, "cycle_number": 1}]

    mock_tx_exec = MagicMock()
    mock_tx_exec.data = [{"id": MOCK_TX_ID, "cash_given": 9900.00}]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_group_exec
        elif table_name == "members":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_dup_exec
            mock_tbl.insert.return_value.execute.return_value = mock_member_exec
        elif table_name == "loan_cycles":
            mock_tbl.insert.return_value.execute.return_value = mock_cycle_exec
        elif table_name == "loan_transactions":
            mock_tbl.insert.return_value.execute.return_value = mock_tx_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = MemberCreate(
        group_id=MOCK_GROUP_ID,
        member_name="Murugan S",
        phone_number="9876543210",
        address="12, South Street, PTM",
    )
    result = service.create_member(data)
    assert result["member_name"] == "Murugan S"
    assert result["cash_given"] == Decimal("9900.00")

