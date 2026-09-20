"""
VEL Finance — Investment Tests
==============================
Tests verifying:
- InvestmentCreate schema validation
- Initial vs Additional investment distinction
- Total owner investment aggregation
- Business week enrichment
"""
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.investment import (
    InvestmentCreate,
    InvestmentResponse,
    InvestmentSummary,
)
from app.services.investment_service import InvestmentService


def test_investment_create_validation():
    """InvestmentCreate enforces type, positive amount, and valid date."""
    # Valid initial investment
    inv = InvestmentCreate(
        investment_type="Initial",
        amount=Decimal("100000.00"),
        investment_date=date(2026, 8, 9),
        description="Starting capital",
    )
    assert inv.investment_type == "Initial"
    assert inv.amount == Decimal("100000.00")

    # Invalid type
    with pytest.raises(ValidationError):
        InvestmentCreate(
            investment_type="Recycled",  # Not an investment type!
            amount=Decimal("50000.00"),
            investment_date=date(2026, 8, 9),
        )

    # Zero or negative amount rejected
    with pytest.raises(ValidationError):
        InvestmentCreate(
            investment_type="Initial",
            amount=Decimal("0.00"),
            investment_date=date(2026, 8, 9),
        )

    with pytest.raises(ValidationError):
        InvestmentCreate(
            investment_type="Initial",
            amount=Decimal("-5000.00"),
            investment_date=date(2026, 8, 9),
        )


def test_investment_response_business_week():
    """InvestmentResponse enriches with business week."""
    resp = InvestmentResponse(
        id=uuid4(),
        investment_code="INV-0001",
        investment_type="Initial",
        amount=Decimal("200000.00"),
        investment_date=date(2026, 8, 9),
        business_week=1,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    assert resp.business_week == 1
    assert resp.investment_code == "INV-0001"


def test_investment_service_summary():
    """InvestmentService computes separate totals for Initial and Additional investments."""
    mock_db = MagicMock()
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_order1 = MagicMock()
    mock_order2 = MagicMock()

    mock_db.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.order.return_value = mock_order1
    mock_order1.order.return_value = mock_order2

    mock_order2.execute.return_value.data = [
        {
            "id": str(uuid4()),
            "investment_code": "INV-0001",
            "investment_type": "Initial",
            "amount": "200000.00",
            "investment_date": "2026-08-09",
            "description": "Seed money",
            "created_at": "2026-08-09T10:00:00Z",
            "updated_at": "2026-08-09T10:00:00Z",
        },
        {
            "id": str(uuid4()),
            "investment_code": "INV-0002",
            "investment_type": "Additional",
            "amount": "100000.00",
            "investment_date": "2026-08-23",
            "description": "Week 3 capital expansion",
            "created_at": "2026-08-23T10:00:00Z",
            "updated_at": "2026-08-23T10:00:00Z",
        },
    ]

    service = InvestmentService(mock_db)
    summary = service.get_summary()

    assert summary["total_initial_investment"] == Decimal("200000.00")
    assert summary["total_additional_investment"] == Decimal("100000.00")
    assert summary["total_owner_investment"] == Decimal("300000.00")
    assert summary["count_initial"] == 1
    assert summary["count_additional"] == 1
    assert len(summary["investments"]) == 2
    assert summary["investments"][0]["business_week"] == 1
    assert summary["investments"][1]["business_week"] == 3


def test_investment_service_derives_initial_investment_when_empty():
    """When no explicit Initial investments exist, derives initial capital from Week 1 groups."""
    mock_db = MagicMock()

    def mock_table(name: str):
        t = MagicMock()
        sel = MagicMock()
        t.select.return_value = sel
        if name == "investments":
            ord1 = MagicMock()
            ord2 = MagicMock()
            sel.order.return_value = ord1
            ord1.order.return_value = ord2
            ord2.execute.return_value.data = []
        elif name == "groups":
            sel.execute.return_value.data = [
                {
                    "id": "g1",
                    "start_date": "2026-08-09",
                    "scheme": {"loan_amount": "10000.00"},
                    "members": [
                        {"id": "m1", "status": "Active"},
                        {"id": "m2", "status": "Active"},
                    ],
                }
            ]
        elif name == "members":
            sel.execute.return_value.data = [
                {"id": "m1", "status": "Active", "group_id": "g1"},
                {"id": "m2", "status": "Active", "group_id": "g1"},
            ]
        else:
            sel.execute.return_value.data = []
        return t

    mock_db.table.side_effect = mock_table

    service = InvestmentService(mock_db)
    summary = service.get_summary()

    # 2 members * 10,000 = 20,000 derived initial investment
    assert summary["total_initial_investment"] == Decimal("20000.00")
    assert summary["total_owner_investment"] == Decimal("20000.00")
    assert len(summary["investments"]) == 1
    assert summary["investments"][0]["investment_type"] == "Initial"
    assert summary["investments"][0]["amount"] == Decimal("20000.00")

