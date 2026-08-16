"""
VEL Finance — Scheme Management Tests
======================================
Tests for Scheme CRUD, status management, and the inactive scheme reactivation workflow.

Scenarios covered:
 1.  GET /schemes returns active schemes only
 2.  GET /schemes/{id} returns scheme by ID
 3.  POST /schemes with valid data → 201
 4.  POST /schemes with validation errors → 422
 5.  POST /schemes with ACTIVE duplicate name → 409 (simple conflict)
 6.  POST /schemes with INACTIVE duplicate + identical financial values → 409 REACTIVATABLE
 7.  POST /schemes with INACTIVE duplicate + different loan_amount → 409 (non-reactivatable)
 8.  POST /schemes with INACTIVE duplicate + different weekly_installment → 409
 9.  POST /schemes with INACTIVE duplicate + different total_weeks → 409
10.  POST /schemes with INACTIVE duplicate + different note_cost → 409
11.  PUT /schemes/{id} - update name → 200
12.  PUT /schemes/{id} - update description → 200
13.  PUT /schemes/{id} - financial fields rejected → 422
14.  PATCH /schemes/{id}/status - deactivate → 200
15.  PATCH /schemes/{id}/status - reactivate → 200 (reactivation preserves ID)
16.  Reactivation preserves scheme ID and financial values
"""
import pytest
from decimal import Decimal
from uuid import uuid4
from unittest.mock import MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import create_application
from app.api.endpoints.schemes import get_service
from app.services.scheme_service import SchemeService
from app.schemas.scheme import SchemeCreate, SchemeUpdate, SchemeStatusUpdate, SchemeStatus

# ── Mock Data ──────────────────────────────────────────────────────────────────

MOCK_SCHEME_ID = str(uuid4())
MOCK_SCHEME = {
    "id": MOCK_SCHEME_ID,
    "scheme_name": "10K Standard",
    "description": "Standard 10K loan over 10 weeks",
    "loan_amount": "10000.00",
    "weekly_installment": "1000.00",
    "total_weeks": 10,
    "note_cost": "100.00",
    "status": "Active",
    "created_at": "2026-08-15T12:00:00Z",
    "updated_at": "2026-08-15T12:00:00Z",
}

MOCK_INACTIVE_SCHEME = {
    **MOCK_SCHEME,
    "status": "Inactive",
}

# ── API Router Tests (Mocking Service) ─────────────────────────────────────────

@pytest.fixture
def mock_service():
    return MagicMock(spec=SchemeService)

@pytest.fixture
def client(mock_service):
    app = create_application()
    app.dependency_overrides[get_service] = lambda: mock_service
    return TestClient(app)

# 1. GET /schemes
def test_list_schemes(client, mock_service):
    mock_service.get_schemes.return_value = [MOCK_SCHEME]
    response = client.get("/api/v1/schemes")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(response.json()["data"]) == 1

# 2. GET /schemes/{id}
def test_get_scheme(client, mock_service):
    mock_service.get_scheme_by_id.return_value = MOCK_SCHEME
    response = client.get(f"/api/v1/schemes/{MOCK_SCHEME_ID}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["scheme_name"] == "10K Standard"

# 3. POST /schemes - success
def test_create_scheme(client, mock_service):
    mock_service.create_scheme.return_value = MOCK_SCHEME
    payload = {
        "scheme_name": "10K Standard",
        "description": "Test",
        "loan_amount": 10000.00,
        "weekly_installment": 1000.00,
        "total_weeks": 10,
        "note_cost": 100.00
    }
    response = client.post("/api/v1/schemes", json=payload)
    assert response.status_code == 201
    assert response.json()["success"] is True
    assert response.json()["data"]["id"] == MOCK_SCHEME_ID

# 4. POST /schemes - validation errors
def test_create_scheme_validation_errors(client, mock_service):
    # Invalid loan amount (zero)
    payload = {
        "scheme_name": "Bad Scheme",
        "loan_amount": 0,
        "weekly_installment": 1000.00,
        "total_weeks": 10,
        "note_cost": 100.00
    }
    response = client.post("/api/v1/schemes", json=payload)
    assert response.status_code == 422
    assert response.json()["success"] is False

    # Invalid weeks (negative)
    payload["loan_amount"] = 10000.00
    payload["total_weeks"] = -5
    response = client.post("/api/v1/schemes", json=payload)
    assert response.status_code == 422
    assert response.json()["success"] is False

# 5. POST /schemes - active duplicate → simple 409
def test_create_scheme_active_duplicate(client, mock_service):
    mock_service.create_scheme.side_effect = HTTPException(
        status_code=409, detail="A scheme with this name already exists."
    )
    payload = {
        "scheme_name": "10K Standard",
        "loan_amount": 10000.00,
        "weekly_installment": 1000.00,
        "total_weeks": 10,
        "note_cost": 100.00
    }
    response = client.post("/api/v1/schemes", json=payload)
    assert response.status_code == 409
    assert response.json()["success"] is False
    assert "already exists" in response.json()["message"]
    # Must NOT contain reactivation code
    assert response.json().get("code") != "INACTIVE_SCHEME_REACTIVATABLE"

# 6. POST /schemes - inactive + identical financial values → reactivatable 409
def test_create_scheme_inactive_identical_values(client, mock_service):
    reactivation_id = str(uuid4())
    mock_service.create_scheme.side_effect = HTTPException(
        status_code=409,
        detail={
            "code": "INACTIVE_SCHEME_REACTIVATABLE",
            "message": (
                "An inactive scheme with the same name and financial "
                "configuration already exists. You can reactivate it."
            ),
            "scheme_id": reactivation_id,
        },
    )
    payload = {
        "scheme_name": "10K Standard",
        "loan_amount": 10000.00,
        "weekly_installment": 1000.00,
        "total_weeks": 10,
        "note_cost": 100.00
    }
    response = client.post("/api/v1/schemes", json=payload)
    assert response.status_code == 409
    assert response.json()["success"] is False
    assert response.json()["code"] == "INACTIVE_SCHEME_REACTIVATABLE"
    assert response.json()["scheme_id"] == reactivation_id
    assert "reactivate" in response.json()["message"].lower()

# 7-10. POST /schemes - inactive + different financial values → non-reactivatable 409
def _different_financial_409(client, mock_service):
    mock_service.create_scheme.side_effect = HTTPException(
        status_code=409,
        detail=(
            "A scheme with this name already exists with different "
            "financial values. Create a new scheme with a different "
            "name or version."
        ),
    )

def test_create_scheme_inactive_different_loan_amount(client, mock_service):
    mock_service.create_scheme.side_effect = HTTPException(
        status_code=409,
        detail=(
            "A scheme with this name already exists with different "
            "financial values. Create a new scheme with a different "
            "name or version."
        ),
    )
    payload = {
        "scheme_name": "10K Standard",
        "loan_amount": 12000.00,  # Different
        "weekly_installment": 1000.00,
        "total_weeks": 10,
        "note_cost": 100.00
    }
    response = client.post("/api/v1/schemes", json=payload)
    assert response.status_code == 409
    assert response.json()["success"] is False
    assert response.json().get("code") != "INACTIVE_SCHEME_REACTIVATABLE"
    assert "different" in response.json()["message"].lower()

def test_create_scheme_inactive_different_weekly_installment(client, mock_service):
    mock_service.create_scheme.side_effect = HTTPException(
        status_code=409,
        detail=(
            "A scheme with this name already exists with different "
            "financial values. Create a new scheme with a different "
            "name or version."
        ),
    )
    payload = {
        "scheme_name": "10K Standard",
        "loan_amount": 10000.00,
        "weekly_installment": 750.00,  # Different
        "total_weeks": 10,
        "note_cost": 100.00
    }
    response = client.post("/api/v1/schemes", json=payload)
    assert response.status_code == 409
    assert response.json().get("code") != "INACTIVE_SCHEME_REACTIVATABLE"

def test_create_scheme_inactive_different_total_weeks(client, mock_service):
    mock_service.create_scheme.side_effect = HTTPException(
        status_code=409,
        detail=(
            "A scheme with this name already exists with different "
            "financial values. Create a new scheme with a different "
            "name or version."
        ),
    )
    payload = {
        "scheme_name": "10K Standard",
        "loan_amount": 10000.00,
        "weekly_installment": 1000.00,
        "total_weeks": 15,  # Different
        "note_cost": 100.00
    }
    response = client.post("/api/v1/schemes", json=payload)
    assert response.status_code == 409
    assert response.json().get("code") != "INACTIVE_SCHEME_REACTIVATABLE"

def test_create_scheme_inactive_different_note_cost(client, mock_service):
    mock_service.create_scheme.side_effect = HTTPException(
        status_code=409,
        detail=(
            "A scheme with this name already exists with different "
            "financial values. Create a new scheme with a different "
            "name or version."
        ),
    )
    payload = {
        "scheme_name": "10K Standard",
        "loan_amount": 10000.00,
        "weekly_installment": 1000.00,
        "total_weeks": 10,
        "note_cost": 200.00  # Different
    }
    response = client.post("/api/v1/schemes", json=payload)
    assert response.status_code == 409
    assert response.json().get("code") != "INACTIVE_SCHEME_REACTIVATABLE"

# 11. PUT /schemes/{id} - update name
def test_update_scheme_success_name(client, mock_service):
    mock_service.update_scheme.return_value = MOCK_SCHEME
    payload = {"scheme_name": "Updated Name"}
    response = client.put(f"/api/v1/schemes/{MOCK_SCHEME_ID}", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True

# 12. PUT /schemes/{id} - update description
def test_update_scheme_success_description(client, mock_service):
    mock_service.update_scheme.return_value = MOCK_SCHEME
    payload = {"description": "Updated description"}
    response = client.put(f"/api/v1/schemes/{MOCK_SCHEME_ID}", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True

# 13. PUT /schemes/{id} - financial fields are rejected
def test_update_scheme_rejects_financial_fields(client, mock_service):
    # Reject loan_amount
    response = client.put(f"/api/v1/schemes/{MOCK_SCHEME_ID}", json={"loan_amount": 15000})
    assert response.status_code == 422
    assert response.json()["success"] is False

    # Reject weekly_installment
    response = client.put(f"/api/v1/schemes/{MOCK_SCHEME_ID}", json={"weekly_installment": 1500})
    assert response.status_code == 422
    assert response.json()["success"] is False

    # Reject total_weeks
    response = client.put(f"/api/v1/schemes/{MOCK_SCHEME_ID}", json={"total_weeks": 20})
    assert response.status_code == 422
    assert response.json()["success"] is False

    # Reject note_cost
    response = client.put(f"/api/v1/schemes/{MOCK_SCHEME_ID}", json={"note_cost": 200})
    assert response.status_code == 422
    assert response.json()["success"] is False

# 14. PATCH /schemes/{id}/status - deactivate
def test_update_scheme_status_deactivate(client, mock_service):
    updated = MOCK_SCHEME.copy()
    updated["status"] = "Inactive"
    mock_service.update_scheme_status.return_value = updated
    
    response = client.patch(f"/api/v1/schemes/{MOCK_SCHEME_ID}/status", json={"status": "Inactive"})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["status"] == "Inactive"

# 15. PATCH /schemes/{id}/status - reactivate (status → Active)
def test_update_scheme_status_reactivate(client, mock_service):
    reactivated = MOCK_INACTIVE_SCHEME.copy()
    reactivated["status"] = "Active"
    mock_service.update_scheme_status.return_value = reactivated

    response = client.patch(f"/api/v1/schemes/{MOCK_SCHEME_ID}/status", json={"status": "Active"})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["status"] == "Active"

# 16. Reactivation preserves ID and financial values
def test_reactivation_preserves_id_and_financials(client, mock_service):
    """
    When reactivating via PATCH /status, the response must return the same
    scheme ID and the same financial values — unchanged.
    """
    reactivated = MOCK_INACTIVE_SCHEME.copy()
    reactivated["status"] = "Active"
    mock_service.update_scheme_status.return_value = reactivated

    response = client.patch(f"/api/v1/schemes/{MOCK_SCHEME_ID}/status", json={"status": "Active"})
    data = response.json()["data"]
    assert data["id"] == MOCK_SCHEME_ID
    assert data["loan_amount"] == MOCK_SCHEME["loan_amount"]
    assert data["weekly_installment"] == MOCK_SCHEME["weekly_installment"]
    assert data["total_weeks"] == MOCK_SCHEME["total_weeks"]
    assert data["note_cost"] == MOCK_SCHEME["note_cost"]


# ── Service Layer Tests (Mocking Supabase Client) ──────────────────────────────

@pytest.fixture
def mock_db():
    db = MagicMock()
    return db


def test_service_get_schemes(mock_db):
    service = SchemeService(mock_db)
    
    mock_execute = MagicMock()
    mock_execute.data = [MOCK_SCHEME]
    
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute = MagicMock(return_value=mock_execute)
    
    schemes = service.get_schemes()
    assert len(schemes) == 1
    mock_db.table.assert_called_with("schemes")


def test_service_create_scheme_success(mock_db):
    service = SchemeService(mock_db)
    
    # No existing scheme with this name
    mock_name_check = MagicMock()
    mock_name_check.data = []
    mock_db.table.return_value.select.return_value.eq.return_value.execute = MagicMock(return_value=mock_name_check)
    
    # Insert returns the new scheme
    mock_insert_exec = MagicMock()
    mock_insert_exec.data = [MOCK_SCHEME]
    mock_db.table.return_value.insert.return_value.execute = MagicMock(return_value=mock_insert_exec)
    
    schema = SchemeCreate(
        scheme_name="10K Standard",
        loan_amount=10000,
        weekly_installment=1000,
        total_weeks=10,
        note_cost=100,
    )
    result = service.create_scheme(schema)
    assert result["id"] == MOCK_SCHEME_ID


def test_service_create_scheme_active_duplicate(mock_db):
    """Active scheme with same name → 409, simple message."""
    service = SchemeService(mock_db)
    
    mock_name_check = MagicMock()
    mock_name_check.data = [MOCK_SCHEME]  # Active scheme found
    mock_db.table.return_value.select.return_value.eq.return_value.execute = MagicMock(return_value=mock_name_check)
    
    schema = SchemeCreate(
        scheme_name="10K Standard",
        loan_amount=10000,
        weekly_installment=1000,
        total_weeks=10,
        note_cost=100,
    )
    
    with pytest.raises(HTTPException) as exc_info:
        service.create_scheme(schema)
    
    assert exc_info.value.status_code == 409
    assert isinstance(exc_info.value.detail, str)
    assert "already exists" in exc_info.value.detail


def test_service_create_scheme_inactive_identical(mock_db):
    """Inactive scheme with identical financial values → 409 INACTIVE_SCHEME_REACTIVATABLE."""
    service = SchemeService(mock_db)
    
    mock_name_check = MagicMock()
    mock_name_check.data = [MOCK_INACTIVE_SCHEME]
    mock_db.table.return_value.select.return_value.eq.return_value.execute = MagicMock(return_value=mock_name_check)
    
    # Exact same financial values as MOCK_INACTIVE_SCHEME
    schema = SchemeCreate(
        scheme_name="10K Standard",
        loan_amount=Decimal("10000.00"),
        weekly_installment=Decimal("1000.00"),
        total_weeks=10,
        note_cost=Decimal("100.00"),
    )
    
    with pytest.raises(HTTPException) as exc_info:
        service.create_scheme(schema)
    
    assert exc_info.value.status_code == 409
    assert isinstance(exc_info.value.detail, dict)
    assert exc_info.value.detail["code"] == "INACTIVE_SCHEME_REACTIVATABLE"
    assert exc_info.value.detail["scheme_id"] == MOCK_SCHEME_ID


def test_service_create_scheme_inactive_different_loan_amount(mock_db):
    """Inactive scheme with different loan_amount → 409, non-reactivatable."""
    service = SchemeService(mock_db)
    
    mock_name_check = MagicMock()
    mock_name_check.data = [MOCK_INACTIVE_SCHEME]
    mock_db.table.return_value.select.return_value.eq.return_value.execute = MagicMock(return_value=mock_name_check)
    
    schema = SchemeCreate(
        scheme_name="10K Standard",
        loan_amount=Decimal("12000.00"),  # Different
        weekly_installment=Decimal("1000.00"),
        total_weeks=10,
        note_cost=Decimal("100.00"),
    )
    
    with pytest.raises(HTTPException) as exc_info:
        service.create_scheme(schema)
    
    assert exc_info.value.status_code == 409
    assert isinstance(exc_info.value.detail, str)
    assert "different" in exc_info.value.detail.lower()


def test_service_create_scheme_inactive_different_weekly_installment(mock_db):
    """Inactive scheme with different weekly_installment → 409, non-reactivatable."""
    service = SchemeService(mock_db)
    
    mock_name_check = MagicMock()
    mock_name_check.data = [MOCK_INACTIVE_SCHEME]
    mock_db.table.return_value.select.return_value.eq.return_value.execute = MagicMock(return_value=mock_name_check)
    
    schema = SchemeCreate(
        scheme_name="10K Standard",
        loan_amount=Decimal("10000.00"),
        weekly_installment=Decimal("750.00"),  # Different
        total_weeks=10,
        note_cost=Decimal("100.00"),
    )
    
    with pytest.raises(HTTPException) as exc_info:
        service.create_scheme(schema)
    
    assert exc_info.value.status_code == 409
    assert isinstance(exc_info.value.detail, str)


def test_service_create_scheme_inactive_different_total_weeks(mock_db):
    """Inactive scheme with different total_weeks → 409, non-reactivatable."""
    service = SchemeService(mock_db)
    
    mock_name_check = MagicMock()
    mock_name_check.data = [MOCK_INACTIVE_SCHEME]
    mock_db.table.return_value.select.return_value.eq.return_value.execute = MagicMock(return_value=mock_name_check)
    
    schema = SchemeCreate(
        scheme_name="10K Standard",
        loan_amount=Decimal("10000.00"),
        weekly_installment=Decimal("1000.00"),
        total_weeks=15,  # Different
        note_cost=Decimal("100.00"),
    )
    
    with pytest.raises(HTTPException) as exc_info:
        service.create_scheme(schema)
    
    assert exc_info.value.status_code == 409
    assert isinstance(exc_info.value.detail, str)


def test_service_create_scheme_inactive_different_note_cost(mock_db):
    """Inactive scheme with different note_cost → 409, non-reactivatable."""
    service = SchemeService(mock_db)
    
    mock_name_check = MagicMock()
    mock_name_check.data = [MOCK_INACTIVE_SCHEME]
    mock_db.table.return_value.select.return_value.eq.return_value.execute = MagicMock(return_value=mock_name_check)
    
    schema = SchemeCreate(
        scheme_name="10K Standard",
        loan_amount=Decimal("10000.00"),
        weekly_installment=Decimal("1000.00"),
        total_weeks=10,
        note_cost=Decimal("200.00"),  # Different
    )
    
    with pytest.raises(HTTPException) as exc_info:
        service.create_scheme(schema)
    
    assert exc_info.value.status_code == 409
    assert isinstance(exc_info.value.detail, str)


def test_service_financial_values_match(mock_db):
    """Verify _financial_values_match correctly compares decimal values."""
    service = SchemeService(mock_db)

    existing = {
        "loan_amount": "10000.00",
        "weekly_installment": "1000.00",
        "total_weeks": 10,
        "note_cost": "100.00",
    }

    # Exact match
    schema_match = SchemeCreate(
        scheme_name="Test",
        loan_amount=Decimal("10000.00"),
        weekly_installment=Decimal("1000.00"),
        total_weeks=10,
        note_cost=Decimal("100.00"),
    )
    assert service._financial_values_match(existing, schema_match) is True

    # Mismatch on loan_amount
    schema_diff = SchemeCreate(
        scheme_name="Test",
        loan_amount=Decimal("9999.99"),
        weekly_installment=Decimal("1000.00"),
        total_weeks=10,
        note_cost=Decimal("100.00"),
    )
    assert service._financial_values_match(existing, schema_diff) is False
