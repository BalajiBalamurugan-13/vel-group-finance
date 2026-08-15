"""
VEL Finance — API Response Schemas
=====================================
Standard response shapes per docs/07_API_SPECIFICATION.md.

Success Response:
    {
        "success": true,
        "message": "Operation completed successfully.",
        "data": {}
    }

Error Response:
    {
        "success": false,
        "message": "Validation failed.",
        "errors": []
    }

All API endpoints must use these schemas for consistent responses.
Business module schemas are added here as each module is implemented.
"""

from typing import Any, List, Optional

from pydantic import BaseModel


class SuccessResponse(BaseModel):
    """Standard success response envelope per 07_API_SPECIFICATION.md."""

    success: bool = True
    message: str = "Operation completed successfully."
    data: Optional[Any] = None

    model_config = {"json_schema_extra": {"example": {"success": True, "message": "Operation completed successfully.", "data": {}}}}


class ErrorDetail(BaseModel):
    """A single validation or business error detail."""

    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    """Standard error response envelope per 07_API_SPECIFICATION.md."""

    success: bool = False
    message: str
    errors: List[ErrorDetail] = []

    model_config = {"json_schema_extra": {"example": {"success": False, "message": "Validation failed.", "errors": [{"field": "loan_amount", "message": "Must be greater than 0."}]}}}


class HealthResponse(BaseModel):
    """Health check response."""

    status: str

    model_config = {"json_schema_extra": {"example": {"status": "ok"}}}
