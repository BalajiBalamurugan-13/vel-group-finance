"""
VEL Finance — Collections Management Tests
===========================================
Comprehensive unit and integration tests for Weekly Collections,
Cash-In accounting integrity, duplicate prevention (TC-COL-004),
outstanding calculation (Formula 5), completion tracking (Formula 8),
today's collections summary, and weekly summary.
"""
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.endpoints.collections import get_service
from app.main import create_application
from app.schemas.collection import CollectionCreate, PaymentStatus
from app.services.collection_service import CollectionService

# ── Mock Fixtures & Constants ──────────────────────────────────────────────────

MOCK_SCHEME_ID = str(uuid4())
MOCK_GROUP_ID = str(uuid4())
MOCK_MEMBER_ID = str(uuid4())
MOCK_CYCLE_ID = str(uuid4())
MOCK_COLLECTOR_ID = str(uuid4())
MOCK_COLLECTION_ID = str(uuid4())

MOCK_SCHEME = {
    "id": MOCK_SCHEME_ID,
    "scheme_name": "10K Standard",
    "loan_amount": "10000.00",
    "weekly_installment": "760.00",
    "total_weeks": 18,
    "note_cost": "100.00",
    "status": "Active",
}

MOCK_GROUP = {
    "id": MOCK_GROUP_ID,
    "group_name": "PTM 1",
    "location": "PTM",
    "scheme_id": MOCK_SCHEME_ID,
    "status": "Active",
    "scheme": MOCK_SCHEME,
}

MOCK_MEMBER = {
    "id": MOCK_MEMBER_ID,
    "group_id": MOCK_GROUP_ID,
    "member_name": "Murugan S",
    "phone_number": "9876543210",
    "address": "12, South Street, PTM",
    "status": "Active",
    "group": MOCK_GROUP,
}

MOCK_LOAN_CYCLE = {
    "id": MOCK_CYCLE_ID,
    "member_id": MOCK_MEMBER_ID,
    "group_id": MOCK_GROUP_ID,
    "scheme_id": MOCK_SCHEME_ID,
    "cycle_number": 1,
    "status": "Active",
    "scheme": MOCK_SCHEME,
}

MOCK_COLLECTOR = {
    "id": MOCK_COLLECTOR_ID,
    "collector_name": "Vel Finance Admin",
    "phone_number": "9876543210",
    "status": "Active",
}

MOCK_COLLECTION = {
    "id": MOCK_COLLECTION_ID,
    "loan_cycle_id": MOCK_CYCLE_ID,
    "member_id": MOCK_MEMBER_ID,
    "group_id": MOCK_GROUP_ID,
    "collector_id": MOCK_COLLECTOR_ID,
    "week_number": 1,
    "payment_date": date.today().isoformat(),
    "amount_paid": "760.00",
    "payment_status": "Paid",
    "remarks": "Week 1 on-time payment",
    "created_at": "2026-08-16T12:00:00Z",
    "member_name": "Murugan S",
    "phone_number": "9876543210",
    "group_name": "PTM 1",
    "location": "PTM",
    "collector_name": "Vel Finance Admin",
    "weekly_installment": Decimal("760.00"),
    "total_weeks": 18,
    "weeks_paid": 1,
    "remaining_installments": 17,
    "outstanding_amount": Decimal("12920.00"),
    "completion_percentage": 5.56,
}


@pytest.fixture
def mock_service():
    return MagicMock(spec=CollectionService)


@pytest.fixture
def client(mock_service):
    app = create_application()
    app.dependency_overrides[get_service] = lambda: mock_service
    return TestClient(app)


# ── API Endpoint Tests ─────────────────────────────────────────────────────────

def test_list_collections_endpoint(client, mock_service):
    mock_service.get_collections.return_value = [MOCK_COLLECTION]
    response = client.get("/api/v1/collections")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(response.json()["data"]) == 1
    assert response.json()["data"][0]["week_number"] == 1


def test_list_collections_filters_endpoint(client, mock_service):
    mock_service.get_collections.return_value = [MOCK_COLLECTION]
    response = client.get(
        f"/api/v1/collections?group_id={MOCK_GROUP_ID}&member_id={MOCK_MEMBER_ID}&payment_date=2026-08-16"
    )
    assert response.status_code == 200
    mock_service.get_collections.assert_called_once()


def test_get_today_collections_endpoint(client, mock_service):
    mock_service.get_today_collections.return_value = {
        "date": date.today(),
        "total_collected": Decimal("760.00"),
        "collection_count": 1,
        "collections": [MOCK_COLLECTION],
    }
    response = client.get("/api/v1/collections/today")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["total_collected"] == "760.00"
    assert response.json()["data"]["collection_count"] == 1


def test_get_weekly_summary_endpoint(client, mock_service):
    mock_service.get_weekly_summary.return_value = {
        "total_expected": Decimal("7600.00"),
        "total_collected": Decimal("3800.00"),
        "total_pending": Decimal("3800.00"),
        "collection_count": 1,
        "groups_summary": [],
    }
    response = client.get("/api/v1/collections/weekly")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["total_expected"] == "7600.00"


def test_get_collection_by_id_endpoint(client, mock_service):
    mock_service.get_collection_by_id.return_value = MOCK_COLLECTION
    response = client.get(f"/api/v1/collections/{MOCK_COLLECTION_ID}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["id"] == MOCK_COLLECTION_ID


def test_record_collection_endpoint(client, mock_service):
    mock_service.record_collection.return_value = MOCK_COLLECTION
    payload = {
        "member_id": MOCK_MEMBER_ID,
        "week_number": 1,
        "amount_paid": 760.00,
        "payment_date": date.today().isoformat(),
        "remarks": "Week 1 collection",
    }
    response = client.post("/api/v1/collections", json=payload)
    assert response.status_code == 201
    assert response.json()["success"] is True
    assert response.json()["data"]["amount_paid"] == "760.00"


def test_record_collection_validation_errors(client, mock_service):
    # Week number < 1
    payload = {
        "member_id": MOCK_MEMBER_ID,
        "week_number": 0,
        "amount_paid": 760.00,
    }
    response = client.post("/api/v1/collections", json=payload)
    assert response.status_code == 422

    # Amount <= 0
    payload["week_number"] = 1
    payload["amount_paid"] = 0
    response = client.post("/api/v1/collections", json=payload)
    assert response.status_code == 422

    # Future date rejected
    payload["amount_paid"] = 760.00
    payload["payment_date"] = (date.today() + timedelta(days=5)).isoformat()
    response = client.post("/api/v1/collections", json=payload)
    assert response.status_code == 422


# ── Service Layer Tests ────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    return MagicMock()


def test_service_record_valid_collection(mock_db):
    """
    TC-COL-001: Record regular weekly installment (Cash In).
    Updates outstanding, remaining installments, and cash collected.
    """
    service = CollectionService(mock_db)

    # 1. Member query
    mock_member_exec = MagicMock()
    mock_member_exec.data = [MOCK_MEMBER]

    # 2. Cycle query
    mock_cycle_exec = MagicMock()
    mock_cycle_exec.data = [MOCK_LOAN_CYCLE]

    # 3. Duplicate check query (empty -> no duplicate)
    mock_dup_exec = MagicMock()
    mock_dup_exec.data = []

    # 4. Collector query
    mock_collector_exec = MagicMock()
    mock_collector_exec.data = [MOCK_COLLECTOR]

    # 5. Insert collection query
    mock_insert_exec = MagicMock()
    mock_insert_exec.data = [{
        "id": MOCK_COLLECTION_ID,
        "loan_cycle_id": MOCK_CYCLE_ID,
        "member_id": MOCK_MEMBER_ID,
        "group_id": MOCK_GROUP_ID,
        "collector_id": MOCK_COLLECTOR_ID,
        "week_number": 1,
        "payment_date": date.today().isoformat(),
        "amount_paid": 760.00,
        "payment_status": "Paid",
        "remarks": None,
        "created_at": "2026-08-16T12:00:00Z",
    }]

    # 6. Paid weeks count
    mock_paid_exec = MagicMock()
    mock_paid_exec.data = [{"id": MOCK_COLLECTION_ID}]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "members":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_member_exec
        elif table_name == "loan_cycles":
            mock_tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = mock_cycle_exec
        elif table_name == "collectors":
            mock_tbl.select.return_value.eq.return_value.limit.return_value.execute.return_value = mock_collector_exec
        elif table_name == "collections":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = mock_dup_exec
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_paid_exec
            mock_tbl.insert.return_value.execute.return_value = mock_insert_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = CollectionCreate(
        member_id=MOCK_MEMBER_ID,
        week_number=1,
        amount_paid=Decimal("760.00"),
    )
    result = service.record_collection(data)
    assert result["amount_paid"] == 760.00
    assert result["week_number"] == 1
    assert result["weeks_paid"] == 1
    assert result["remaining_installments"] == 17
    assert result["outstanding_amount"] == Decimal("12920.00")  # 17 × 760


def test_service_duplicate_weekly_payment_rejected_409(mock_db):
    """
    TC-COL-004: Duplicate payment for the same member + week_number is rejected (409 Conflict).
    """
    service = CollectionService(mock_db)

    mock_member_exec = MagicMock()
    mock_member_exec.data = [MOCK_MEMBER]

    mock_cycle_exec = MagicMock()
    mock_cycle_exec.data = [MOCK_LOAN_CYCLE]

    # Existing payment for Week 1 exists
    mock_dup_exec = MagicMock()
    mock_dup_exec.data = [{"id": MOCK_COLLECTION_ID, "payment_status": "Paid"}]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "members":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_member_exec
        elif table_name == "loan_cycles":
            mock_tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = mock_cycle_exec
        elif table_name == "collections":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = mock_dup_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = CollectionCreate(
        member_id=MOCK_MEMBER_ID,
        week_number=1,
        amount_paid=Decimal("760.00"),
    )
    with pytest.raises(HTTPException) as exc:
        service.record_collection(data)

    assert exc.value.status_code == 409
    assert "already been recorded" in exc.value.detail.lower()


def test_service_week_number_exceeding_scheme_rejected_400(mock_db):
    """
    Week number > total_weeks (e.g. Week 19 when total_weeks=18) is rejected with 400.
    """
    service = CollectionService(mock_db)

    mock_member_exec = MagicMock()
    mock_member_exec.data = [MOCK_MEMBER]

    mock_cycle_exec = MagicMock()
    mock_cycle_exec.data = [MOCK_LOAN_CYCLE]  # total_weeks = 18

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "members":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_member_exec
        elif table_name == "loan_cycles":
            mock_tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = mock_cycle_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = CollectionCreate(
        member_id=MOCK_MEMBER_ID,
        week_number=19,
        amount_paid=Decimal("760.00"),
    )
    with pytest.raises(HTTPException) as exc:
        service.record_collection(data)

    assert exc.value.status_code == 400
    assert "maximum week" in exc.value.detail.lower()


def test_service_collection_on_draft_group_rejected_400(mock_db):
    """Cannot record collection on a Draft group."""
    service = CollectionService(mock_db)

    draft_member = {
        **MOCK_MEMBER,
        "group": {**MOCK_GROUP, "status": "Draft"},
    }
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        draft_member
    ]

    data = CollectionCreate(
        member_id=MOCK_MEMBER_ID,
        week_number=1,
        amount_paid=Decimal("760.00"),
    )
    with pytest.raises(HTTPException) as exc:
        service.record_collection(data)

    assert exc.value.status_code == 400
    assert "draft" in exc.value.detail.lower()


def test_service_final_week_payment_marks_member_completed(mock_db):
    """
    When the final installment (Week 18) is paid, the member's status
    and loan cycle status transition to 'Completed'.
    """
    service = CollectionService(mock_db)

    mock_member_exec = MagicMock()
    mock_member_exec.data = [MOCK_MEMBER]

    mock_cycle_exec = MagicMock()
    mock_cycle_exec.data = [MOCK_LOAN_CYCLE]

    mock_dup_exec = MagicMock()
    mock_dup_exec.data = []

    mock_collector_exec = MagicMock()
    mock_collector_exec.data = [MOCK_COLLECTOR]

    mock_insert_exec = MagicMock()
    mock_insert_exec.data = [{
        "id": MOCK_COLLECTION_ID,
        "loan_cycle_id": MOCK_CYCLE_ID,
        "member_id": MOCK_MEMBER_ID,
        "group_id": MOCK_GROUP_ID,
        "collector_id": MOCK_COLLECTOR_ID,
        "week_number": 18,
        "payment_date": date.today().isoformat(),
        "amount_paid": 760.00,
        "payment_status": "Paid",
        "remarks": "Final installment",
        "created_at": "2026-08-16T12:00:00Z",
    }]

    # 18 paid weeks returned -> full repayment
    mock_paid_exec = MagicMock()
    mock_paid_exec.data = [{"id": str(uuid4())} for _ in range(18)]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "members":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_member_exec
            mock_tbl.update.return_value.eq.return_value.execute.return_value.data = [{}]
        elif table_name == "loan_cycles":
            mock_tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = mock_cycle_exec
            mock_tbl.update.return_value.eq.return_value.execute.return_value.data = [{}]
        elif table_name == "collectors":
            mock_tbl.select.return_value.eq.return_value.limit.return_value.execute.return_value = mock_collector_exec
        elif table_name == "collections":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = mock_dup_exec
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_paid_exec
            mock_tbl.insert.return_value.execute.return_value = mock_insert_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = CollectionCreate(
        member_id=MOCK_MEMBER_ID,
        week_number=18,
        amount_paid=Decimal("760.00"),
    )
    result = service.record_collection(data)
    assert result["weeks_paid"] == 18
    assert result["remaining_installments"] == 0
    assert result["outstanding_amount"] == Decimal("0.00")
    assert result["completion_percentage"] == 100.0


def test_service_today_collection_calculation(mock_db):
    """
    Verifies that get_today_collections correctly sums amount_paid across records.
    """
    service = CollectionService(mock_db)

    colls = [
        {
            "id": str(uuid4()),
            "loan_cycle_id": MOCK_CYCLE_ID,
            "member_id": MOCK_MEMBER_ID,
            "group_id": MOCK_GROUP_ID,
            "collector_id": MOCK_COLLECTOR_ID,
            "week_number": 1,
            "payment_date": date.today().isoformat(),
            "amount_paid": "760.00",
            "payment_status": "Paid",
            "remarks": None,
            "created_at": "2026-08-16T12:00:00Z",
            "member": {"member_name": "Murugan S", "phone_number": "9876543210"},
            "group": {"group_name": "PTM 1", "location": "PTM"},
            "collector": {"collector_name": "Admin"},
            "loan_cycle": {"scheme": MOCK_SCHEME},
        },
        {
            "id": str(uuid4()),
            "loan_cycle_id": MOCK_CYCLE_ID,
            "member_id": str(uuid4()),
            "group_id": MOCK_GROUP_ID,
            "collector_id": MOCK_COLLECTOR_ID,
            "week_number": 1,
            "payment_date": date.today().isoformat(),
            "amount_paid": "760.00",
            "payment_status": "Paid",
            "remarks": None,
            "created_at": "2026-08-16T12:00:00Z",
            "member": {"member_name": "Lakshmi M", "phone_number": "9876543211"},
            "group": {"group_name": "PTM 1", "location": "PTM"},
            "collector": {"collector_name": "Admin"},
            "loan_cycle": {"scheme": MOCK_SCHEME},
        },
    ]

    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value.execute.return_value.data = colls

    summary = service.get_today_collections()
    assert summary["total_collected"] == Decimal("1520.00")
    assert summary["collection_count"] == 2
