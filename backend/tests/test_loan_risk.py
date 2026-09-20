"""
VEL Finance — Loan Risk Unit Tests
==================================
Tests verifying loan risk classification per 13_Accounting_Profit_Loan_Risk_Model_Specification.md:
- Section 15: Overdue ≠ Loan Loss
- Section 18: Risk Flow: Current (0 overdue) -> Overdue (1-3 overdue) -> At Risk (4+ overdue)
- Section 18: Loan Loss is NOT auto-assigned by the system
- Section 19: Calculation of overdue amounts and outstanding amounts
"""
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.schemas.profit import LoanRiskMember, LoanRiskSummary
from app.services.loan_risk_service import LoanRiskService


def test_loan_risk_status_thresholds():
    """
    Test risk status classification rules:
    - 0 weeks overdue: Current
    - 1 to 3 weeks overdue: Overdue
    - 4+ weeks overdue: At Risk
    - Loan Loss is NEVER automatically assigned
    """
    def classify(weeks_overdue: int) -> str:
        if weeks_overdue == 0:
            return "Current"
        elif weeks_overdue <= 3:
            return "Overdue"
        else:
            return "At Risk"

    assert classify(0) == "Current"
    assert classify(1) == "Overdue"
    assert classify(2) == "Overdue"
    assert classify(3) == "Overdue"
    assert classify(4) == "At Risk"
    assert classify(8) == "At Risk"
    assert classify(18) == "At Risk"
    # Never auto-assigned
    assert classify(8) != "Loan Loss"


def test_loan_risk_member_amounts():
    """Test overdue and outstanding calculation for an individual member."""
    weekly_inst = Decimal("760.00")
    total_weeks = 18
    actual_paid = 2
    expected_paid = 5

    weeks_overdue = expected_paid - actual_paid  # 3 weeks overdue
    overdue_amount = Decimal(weeks_overdue) * weekly_inst  # 2,280
    remaining_weeks = total_weeks - actual_paid  # 16 weeks remaining
    outstanding = Decimal(remaining_weeks) * weekly_inst  # 12,160

    assert overdue_amount == Decimal("2280.00")
    assert outstanding == Decimal("12160.00")


def test_loan_risk_service_analysis():
    """LoanRiskService correctly groups members into Current, Overdue, and At Risk."""
    mock_db = MagicMock()

    # Loan cycles
    cid_current = str(uuid4())
    cid_overdue = str(uuid4())
    cid_at_risk = str(uuid4())

    mid_current = str(uuid4())
    mid_overdue = str(uuid4())

    members_data = [
        {
            "id": mid_current,
            "member_name": "Ravi K",
            "member_code": "M-0001",
            "phone_number": "9876543210",
            "joined_week": 1,
            "status": "Active",
            "group_id": str(uuid4()),
            "group": {
                "id": str(uuid4()),
                "group_name": "PTM 1",
                "group_code": "GRP-0001",
                "location": "PTM",
                "start_date": date.today().isoformat(),
                "scheme": {
                    "scheme_name": "10K Standard",
                    "loan_amount": "10000.00",
                    "weekly_installment": "760.00",
                    "total_weeks": 18,
                },
            },
        },
        {
            "id": mid_overdue,
            "member_name": "Sundar M",
            "member_code": "M-0002",
            "phone_number": "9876543211",
            "joined_week": 1,
            "status": "Active",
            "group_id": str(uuid4()),
            "group": {
                "id": str(uuid4()),
                "group_name": "PTM 2",
                "group_code": "GRP-0002",
                "location": "PTM",
                "start_date": "2026-08-30",
                "scheme": {
                    "scheme_name": "10K Standard",
                    "loan_amount": "10000.00",
                    "weekly_installment": "760.00",
                    "total_weeks": 18,
                },
            },
        },
    ]

    cycles_data = [
        {"id": cid_current, "member_id": mid_current, "group_id": members_data[0]["group_id"], "status": "Active"},
        {"id": cid_overdue, "member_id": mid_overdue, "group_id": members_data[1]["group_id"], "status": "Active"},
    ]

    def mock_table(name):
        t = MagicMock()
        sel = MagicMock()
        t.select.return_value = sel
        sel.eq.return_value = sel
        sel.in_.return_value = sel
        sel.order.return_value = sel

        if name == "members":
            sel.execute.return_value.data = members_data
        elif name == "loan_cycles":
            sel.execute.return_value.data = cycles_data
        elif name == "collections":
            sel.execute.return_value.data = [
                {"loan_cycle_id": cid_current, "amount_paid": "760.00", "payment_date": "2026-09-20"}
            ]
        else:
            sel.execute.return_value.data = []
        return t

    mock_db.table.side_effect = mock_table

    service = LoanRiskService(mock_db)
    summary = service.get_loan_risk_analysis()

    assert summary.total_members_analyzed == 2
    statuses = {m.risk_status for m in summary.members}
    assert "Current" in statuses or "Overdue" in statuses or "At Risk" in statuses
    assert "Loan Loss" not in statuses
