"""
VEL Finance — Health Endpoint Tests
======================================
Tests for the foundation-level health check.

Test scope (foundation milestone only):
    1. FastAPI application can be created and imported.
    2. GET /api/v1/health returns HTTP 200.
    3. Response body matches expected structure: {"status": "ok"}.

Tests do NOT require real Supabase credentials.
The health endpoint is decoupled from database connectivity by design.

Per docs/11_TEST_CASES.md:
    Every feature should be tested for:
    - Happy Path
    - Validation Errors
    - Edge Cases
"""

import pytest
from fastapi.testclient import TestClient

from app.main import create_application


@pytest.fixture(scope="module")
def client():
    """
    Create a FastAPI TestClient for the application.

    Using scope="module" so the app is created once per test module.
    No real Supabase credentials are needed for these tests.
    """
    app = create_application()
    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client


class TestApplicationStartup:
    """Tests that the FastAPI application starts correctly."""

    def test_application_can_be_created(self):
        """FastAPI application factory should return a valid app instance."""
        from fastapi import FastAPI

        app = create_application()
        assert app is not None
        assert isinstance(app, FastAPI)

    def test_application_has_correct_title(self):
        """Application title should match configuration."""
        app = create_application()
        assert "VEL Finance" in app.title


class TestHealthEndpoint:
    """Tests for GET /api/v1/health."""

    def test_health_returns_200(self, client: TestClient):
        """Health endpoint must return HTTP 200."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. "
            f"Body: {response.text}"
        )

    def test_health_returns_json(self, client: TestClient):
        """Health endpoint must return JSON content type."""
        response = client.get("/api/v1/health")
        assert "application/json" in response.headers.get("content-type", "")

    def test_health_response_structure(self, client: TestClient):
        """Health response must contain 'status' field."""
        response = client.get("/api/v1/health")
        data = response.json()
        assert "status" in data, f"Expected 'status' in response, got: {data}"

    def test_health_status_is_ok(self, client: TestClient):
        """Health status must be 'ok'."""
        response = client.get("/api/v1/health")
        data = response.json()
        assert data["status"] == "ok", (
            f"Expected status='ok', got status='{data.get('status')}'"
        )

    def test_health_exact_response(self, client: TestClient):
        """Health response must exactly match documented format: {'status': 'ok'}."""
        response = client.get("/api/v1/health")
        assert response.json() == {"status": "ok"}


class TestAPIVersioning:
    """Tests that API versioning is correctly configured."""

    def test_health_is_under_api_v1(self, client: TestClient):
        """Health endpoint must be accessible at /api/v1/health."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200

    def test_health_without_prefix_returns_404(self, client: TestClient):
        """Health endpoint without /api/v1/ prefix must return 404."""
        response = client.get("/health")
        assert response.status_code == 404, (
            "Endpoint without /api/v1/ prefix should return 404. "
            "All endpoints must be versioned."
        )

    def test_unversioned_api_returns_404(self, client: TestClient):
        """Root path must not serve API responses."""
        response = client.get("/api/health")
        assert response.status_code == 404
