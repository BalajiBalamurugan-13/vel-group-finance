import pytest
from uuid import uuid4
from unittest.mock import MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import create_application
from app.api.endpoints.schemes import get_service
from app.services.scheme_service import SchemeService
from app.schemas.scheme import SchemeCreate, SchemeUpdate, SchemeStatusUpdate, SchemeStatus

# Mock data
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

# ── API Router Tests (Mocking Service) ───────────────────────────────────────

@pytest.fixture
def mock_service():
    return MagicMock(spec=SchemeService)

@pytest.fixture
def client(mock_service):
    app = create_application()
    app.dependency_overrides[get_service] = lambda: mock_service
    return TestClient(app)

def test_list_schemes(client, mock_service):
    mock_service.get_schemes.return_value = [MOCK_SCHEME]
    response = client.get("/api/v1/schemes")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(response.json()["data"]) == 1

def test_get_scheme(client, mock_service):
    mock_service.get_scheme_by_id.return_value = MOCK_SCHEME
    response = client.get(f"/api/v1/schemes/{MOCK_SCHEME_ID}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["scheme_name"] == "10K Standard"

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

def test_update_scheme_success_name(client, mock_service):
    mock_service.update_scheme.return_value = MOCK_SCHEME
    payload = {"scheme_name": "Updated Name"}
    response = client.put(f"/api/v1/schemes/{MOCK_SCHEME_ID}", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_update_scheme_success_description(client, mock_service):
    mock_service.update_scheme.return_value = MOCK_SCHEME
    payload = {"description": "Updated description"}
    response = client.put(f"/api/v1/schemes/{MOCK_SCHEME_ID}", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True

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

def test_update_scheme_status(client, mock_service):
    updated = MOCK_SCHEME.copy()
    updated["status"] = "Inactive"
    mock_service.update_scheme_status.return_value = updated
    
    response = client.patch(f"/api/v1/schemes/{MOCK_SCHEME_ID}/status", json={"status": "Inactive"})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["status"] == "Inactive"


# ── Service Layer Tests (Mocking Supabase Client) ────────────────────────────

@pytest.fixture
def mock_db():
    db = MagicMock()
    # Deep mock for the chain: table().select().eq().execute()
    # We will configure specific returns in the tests
    return db

def test_service_get_schemes(mock_db):
    service = SchemeService(mock_db)
    
    mock_execute = MagicMock()
    mock_execute.data = [MOCK_SCHEME]
    
    # Mock chain: table("schemes").select("*").eq("status", "Active").order("created_at").execute()
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute = MagicMock(return_value=mock_execute)
    
    schemes = service.get_schemes()
    assert len(schemes) == 1
    mock_db.table.assert_called_with("schemes")

def test_service_create_scheme_success(mock_db):
    service = SchemeService(mock_db)
    
    # Check duplicate query
    mock_duplicate_exec = MagicMock()
    mock_duplicate_exec.data = []  # No duplicates
    mock_db.table.return_value.select.return_value.eq.return_value.execute = MagicMock(return_value=mock_duplicate_exec)
    
    # Insert query
    mock_insert_exec = MagicMock()
    mock_insert_exec.data = [MOCK_SCHEME]
    mock_db.table.return_value.insert.return_value.execute = MagicMock(return_value=mock_insert_exec)
    
    schema = SchemeCreate(
        scheme_name="10K Standard",
        loan_amount=10000,
        weekly_installment=1000,
        total_weeks=10
    )
    result = service.create_scheme(schema)
    assert result["id"] == MOCK_SCHEME_ID

def test_service_create_scheme_duplicate(mock_db):
    service = SchemeService(mock_db)
    
    # Check duplicate query
    mock_duplicate_exec = MagicMock()
    mock_duplicate_exec.data = [{"id": str(uuid4())}]  # Found a duplicate!
    mock_db.table.return_value.select.return_value.eq.return_value.execute = MagicMock(return_value=mock_duplicate_exec)
    
    schema = SchemeCreate(
        scheme_name="10K Standard",
        loan_amount=10000,
        weekly_installment=1000,
        total_weeks=10
    )
    
    with pytest.raises(HTTPException) as exc_info:
        service.create_scheme(schema)
    
    assert exc_info.value.status_code == 409
