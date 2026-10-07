"""
Unit tests for Settings API endpoints.
"""
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
import pytest

from app.main import create_application
from app.db.supabase import get_supabase_client


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def client(mock_db):
    app = create_application()
    app.dependency_overrides[get_supabase_client] = lambda: mock_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_get_places_route_empty(client, mock_db):
    mock_exec = MagicMock()
    mock_exec.data = []
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = mock_exec

    response = client.get("/api/v1/settings/places-route")
    assert response.status_code == 200
    assert response.json()["data"] == []


def test_get_places_route_with_data(client, mock_db):
    mock_exec = MagicMock()
    mock_exec.data = [{"value": '[{"id": "place-1", "name": "Place 1", "session": "morning", "order": 1}]'}]
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = mock_exec

    response = client.get("/api/v1/settings/places-route")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == "place-1"


def test_update_places_route(client, mock_db):
    # Check existing returns found
    mock_existing = MagicMock()
    mock_existing.data = [{"id": "some-id"}]
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = mock_existing

    # Update returns updated
    mock_update = MagicMock()
    mock_update.data = [{"id": "some-id", "value": "..."}]
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_update

    payload = {
        "places": [
            {"id": "place-1", "name": "Place 1", "session": "morning", "order": 1},
            {"id": "place-2", "name": "Place 2", "session": "evening", "order": 2},
        ]
    }
    response = client.put("/api/v1/settings/places-route", json=payload)
    assert response.status_code == 200
    assert len(response.json()["data"]) == 2
