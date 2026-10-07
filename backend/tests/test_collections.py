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

    # Mock collections queries based on week_number parameter
    def mock_collections_select(*args, **kwargs):
        mock_chain = MagicMock()
        def eq_handler(col, val):
            mock_sub = MagicMock()
            def eq_handler_2(col2, val2):
                mock_sub_2 = MagicMock()
                def eq_handler_3(col3, val3):
                    mock_res = MagicMock()
                    if val == str(MOCK_CYCLE_ID) and val2 == 17:  # week 17 sequential check
                        mock_res.execute.return_value.data = [{"id": "week-17-id", "payment_status": "Paid"}]
                    elif val == str(MOCK_CYCLE_ID) and val2 == 18:  # week 18 dup check
                        mock_res.execute.return_value.data = []
                    else:
                        mock_res.execute.return_value.data = []
                    return mock_res
                mock_sub_2.eq.side_effect = eq_handler_3
                mock_sub_2.execute.return_value.data = mock_paid_exec.data
                return mock_sub_2
            mock_sub.eq.side_effect = eq_handler_2
            mock_sub.execute.return_value.data = mock_paid_exec.data
            return mock_sub
        mock_chain.eq.side_effect = eq_handler
        return mock_chain

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
            mock_tbl.select.side_effect = mock_collections_select
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


def test_service_sequential_week_rejected_when_previous_unpaid(mock_db):
    """
    Sequential Week Enforcement:
    Attempting to record Week 2 when Week 1 is unpaid must be rejected with 400.
    """
    service = CollectionService(mock_db)

    mock_member_exec = MagicMock()
    mock_member_exec.data = [MOCK_MEMBER]

    mock_cycle_exec = MagicMock()
    mock_cycle_exec.data = [MOCK_LOAN_CYCLE]

    # Week 1 query returns empty (unpaid)
    mock_prev_paid_exec = MagicMock()
    mock_prev_paid_exec.data = []

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "members":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_member_exec
        elif table_name == "loan_cycles":
            mock_tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = mock_cycle_exec
        elif table_name == "collections":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = mock_prev_paid_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = CollectionCreate(
        member_id=MOCK_MEMBER_ID,
        week_number=2,
        amount_paid=Decimal("760.00"),
    )
    with pytest.raises(HTTPException) as exc:
        service.record_collection(data)

    assert exc.value.status_code == 400
    assert "week 1 must be paid first" in exc.value.detail.lower()


def test_service_sequential_week_accepted_when_previous_paid(mock_db):
    """
    Sequential Week Enforcement:
    Attempting to record Week 2 when Week 1 is paid must succeed.
    """
    service = CollectionService(mock_db)

    mock_member_exec = MagicMock()
    mock_member_exec.data = [MOCK_MEMBER]

    mock_cycle_exec = MagicMock()
    mock_cycle_exec.data = [MOCK_LOAN_CYCLE]

    mock_collector_exec = MagicMock()
    mock_collector_exec.data = [MOCK_COLLECTOR]

    mock_insert_exec = MagicMock()
    mock_insert_exec.data = [{
        "id": MOCK_COLLECTION_ID,
        "loan_cycle_id": MOCK_CYCLE_ID,
        "member_id": MOCK_MEMBER_ID,
        "group_id": MOCK_GROUP_ID,
        "collector_id": MOCK_COLLECTOR_ID,
        "week_number": 2,
        "payment_date": date.today().isoformat(),
        "amount_paid": 760.00,
        "payment_status": "Paid",
        "remarks": None,
        "created_at": "2026-08-16T12:00:00Z",
    }]

    mock_paid_count_exec = MagicMock()
    mock_paid_count_exec.data = [{"id": str(uuid4())}, {"id": str(uuid4())}]

    def mock_collections_select(*args, **kwargs):
        mock_chain = MagicMock()
        def eq_handler(col, val):
            mock_sub = MagicMock()
            def eq_handler_2(col2, val2):
                mock_sub_2 = MagicMock()
                def eq_handler_3(col3, val3):
                    mock_res = MagicMock()
                    if val == str(MOCK_CYCLE_ID) and val2 == 1:  # week 1 sequential check
                        mock_res.execute.return_value.data = [{"id": "week-1-id", "payment_status": "Paid"}]
                    elif val == str(MOCK_CYCLE_ID) and val2 == 2:  # week 2 dup check
                        mock_res.execute.return_value.data = []
                    else:
                        mock_res.execute.return_value.data = []
                    return mock_res
                mock_sub_2.eq.side_effect = eq_handler_3
                mock_sub_2.execute.return_value.data = mock_paid_count_exec.data
                return mock_sub_2
            mock_sub.eq.side_effect = eq_handler_2
            mock_sub.execute.return_value.data = mock_paid_count_exec.data
            return mock_sub
        mock_chain.eq.side_effect = eq_handler
        return mock_chain

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "members":
            mock_tbl.select.return_value.eq.return_value.execute.return_value = mock_member_exec
        elif table_name == "loan_cycles":
            mock_tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = mock_cycle_exec
        elif table_name == "collectors":
            mock_tbl.select.return_value.eq.return_value.limit.return_value.execute.return_value = mock_collector_exec
        elif table_name == "collections":
            mock_tbl.select.side_effect = mock_collections_select
            mock_tbl.insert.return_value.execute.return_value = mock_insert_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = CollectionCreate(
        member_id=MOCK_MEMBER_ID,
        week_number=2,
        amount_paid=Decimal("760.00"),
    )
    result = service.record_collection(data)
    assert result["week_number"] == 2
    assert result["weeks_paid"] == 2
    assert result["remaining_installments"] == 16
    assert result["outstanding_amount"] == Decimal("12160.00")  # 16 × 760


def test_service_late_joiner_records_missed_and_current_sequentially(mock_db):
    """
    Late Joining (BR-022, Formula 6, Formula 15):
    A member joining at Week 2 records Week 1 first, then Week 2.
    """
    service = CollectionService(mock_db)

    late_member = {
        **MOCK_MEMBER,
        "joined_week": 2,
    }

    mock_member_exec = MagicMock()
    mock_member_exec.data = [late_member]

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
        "week_number": 1,
        "payment_date": date.today().isoformat(),
        "amount_paid": 760.00,
        "payment_status": "Paid",
        "remarks": "Late joiner paying Week 1 missed installment",
        "created_at": "2026-08-16T12:00:00Z",
    }]

    mock_paid_count_exec = MagicMock()
    mock_paid_count_exec.data = [{"id": str(uuid4())}]

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
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_paid_count_exec
            mock_tbl.insert.return_value.execute.return_value = mock_insert_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    # 1. First record Week 1 missed installment
    data1 = CollectionCreate(
        member_id=MOCK_MEMBER_ID,
        week_number=1,
        amount_paid=Decimal("760.00"),
        remarks="Late joiner paying Week 1 missed installment",
    )
    res1 = service.record_collection(data1)
    assert res1["week_number"] == 1
    assert res1["weeks_paid"] == 1


def test_service_weekly_summary_current_week_and_full_cycle(mock_db):
    """
    Requirement 4:
    5 active members × ₹760 weekly installment × 18 weeks.
    - Current Weekly Expected = ₹3,800 (5 × 760).
    - Full Cycle Expected = ₹68,400 (5 × 760 × 18).
    - If 1 payment for Week 1 (₹760) is collected:
      Weekly Collected = ₹760, Weekly Pending = ₹3,040, Weekly Progress = 20.0%.
    - Full Cycle Collected = ₹760, Full Cycle Pending = ₹67,640, Full Cycle Progress = 1.11%.
    """
    service = CollectionService(mock_db)

    # 1 active group with start_date = today (Week 1)
    groups = [{
        "id": MOCK_GROUP_ID,
        "group_name": "PTM 1",
        "location": "PTM",
        "start_date": date.today().isoformat(),
        "scheme": {
            "weekly_installment": "760.00",
            "total_weeks": 18,
        },
    }]

    # 5 active members
    active_members = [{"id": str(uuid4())} for _ in range(5)]

    # 1 collected payment for week 1 of 760.00
    colls = [
        {"amount_paid": "760.00", "week_number": 1, "payment_date": date.today().isoformat()},
    ]

    def table_router(table_name):
        mock_tbl = MagicMock()
        if table_name == "groups":
            mock_tbl.select.return_value.eq.return_value.execute.return_value.data = groups
        elif table_name == "members":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = active_members
        elif table_name == "collections":
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = colls
        return mock_tbl

    mock_db.table.side_effect = table_router

    summary = service.get_weekly_summary()
    assert summary["total_expected"] == Decimal("3800.00")       # 5 × 760
    assert summary["total_collected"] == Decimal("760.00")        # 1 × 760
    assert summary["total_pending"] == Decimal("3040.00")         # 3800 - 760
    assert summary["full_cycle_expected"] == Decimal("68400.00")  # 5 × 760 × 18
    assert summary["full_cycle_collected"] == Decimal("760.00")
    assert summary["full_cycle_pending"] == Decimal("67640.00")

    group_s = summary["groups_summary"][0]
    assert group_s["total_expected"] == Decimal("3800.00")
    assert group_s["completion_percentage"] == 20.0
    assert group_s["full_cycle_expected"] == Decimal("68400.00")
    assert group_s["full_cycle_progress"] == 1.11


def test_service_historical_past_payment_accepted(mock_db):
    """
    Requirement 6: Historical / past payments are supported.
    A payment recorded for a past date (e.g. 7 days ago) is saved with that date,
    and does NOT appear in today's collections.
    """
    service = CollectionService(mock_db)

    past_date = date.today() - timedelta(days=7)

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
        "week_number": 1,
        "payment_date": past_date.isoformat(),
        "amount_paid": 760.00,
        "payment_status": "Paid",
        "remarks": "Historical Week 1 payment",
        "created_at": "2026-08-09T12:00:00Z",
    }]

    mock_paid_count_exec = MagicMock()
    mock_paid_count_exec.data = [{"id": str(uuid4())}]

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
            mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_paid_count_exec
            mock_tbl.insert.return_value.execute.return_value = mock_insert_exec
        return mock_tbl

    mock_db.table.side_effect = table_router

    data = CollectionCreate(
        member_id=MOCK_MEMBER_ID,
        week_number=1,
        amount_paid=Decimal("760.00"),
        payment_date=past_date,
        remarks="Historical Week 1 payment",
    )
    result = service.record_collection(data)
    assert result["week_number"] == 1
    assert result["payment_date"] == past_date.isoformat()


def test_preview_record_week_endpoint(client, mock_service):
    """Test GET /record-week/preview endpoint."""
    mock_service.preview_whole_week_collections.return_value = {
        "business_week": 9,
        "target_date": date.today(),
        "week_start_date": date.today() - timedelta(days=3),
        "week_end_date": date.today() + timedelta(days=3),
        "total_active_members": 152,
        "eligible_members_count": 152,
        "already_paid_count": 0,
        "total_expected_amount": Decimal("116240.00"),
        "total_pending_amount": Decimal("116240.00"),
        "total_already_paid_amount": Decimal("0.00"),
        "groups": [],
    }

    response = client.get("/api/v1/collections/record-week/preview")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["business_week"] == 9
    assert data["data"]["eligible_members_count"] == 152
    assert float(data["data"]["total_pending_amount"]) == 116240.0


def test_record_whole_week_endpoint(client, mock_service):
    """Test POST /record-week endpoint."""
    mock_service.record_whole_week_collections.return_value = {
        "business_week": 9,
        "payment_date": date.today(),
        "total_recorded": 152,
        "total_amount": Decimal("116240.00"),
        "skipped_count": 0,
        "errors": [],
    }

    response = client.post(
        "/api/v1/collections/record-week",
        json={"payment_date": date.today().isoformat()},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["data"]["total_recorded"] == 152
    assert float(data["data"]["total_amount"]) == 116240.0


