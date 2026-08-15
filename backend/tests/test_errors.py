import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.main import create_application

app = create_application()

class DummyModel(BaseModel):
    name: str
    age: int

@app.post("/dummy-validation")
async def dummy_validation(data: DummyModel):
    return {"status": "ok"}

@app.get("/dummy-http-exception")
async def dummy_http_exception():
    raise HTTPException(status_code=403, detail="Forbidden action.")

@app.get("/dummy-500")
async def dummy_500():
    raise RuntimeError("Something bad happened internally")

client = TestClient(app)
client_no_raise = TestClient(app, raise_server_exceptions=False)


def test_validation_error_uses_error_response():
    # Send invalid data
    response = client.post("/dummy-validation", json={"name": "Alice"})
    assert response.status_code == 422
    data = response.json()
    
    assert data["success"] is False
    assert data["message"] == "Validation Error"
    assert "errors" in data
    assert isinstance(data["errors"], list)
    assert len(data["errors"]) > 0
    
    first_error = data["errors"][0]
    assert "field" in first_error
    assert "message" in first_error
    assert first_error["field"] == "age"


def test_http_exception_uses_error_response():
    response = client.get("/dummy-http-exception")
    assert response.status_code == 403
    data = response.json()
    
    assert data["success"] is False
    assert data["message"] == "Forbidden action."
    assert "errors" in data
    assert data["errors"] == []


def test_internal_server_error_uses_error_response():
    # To test 500 handler, we must use the client with raise_server_exceptions=False
    response = client_no_raise.get("/dummy-500")
    
    assert response.status_code == 500
    data = response.json()
    
    assert data["success"] is False
    assert data["message"] == "An unexpected error occurred. Please try again later."
    assert data["errors"] == []

