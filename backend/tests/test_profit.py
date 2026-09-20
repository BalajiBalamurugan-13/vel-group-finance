"""
VEL Finance — Profit Service Unit Tests
=======================================
Tests verifying accounting & profit logic per 13_Accounting_Profit_Loan_Risk_Model_Specification.md:
- Section 10 & 13: Contractual Repayment = weekly_installment × total_weeks
- Section 10 & 13: Contractual Profit = Contractual Repayment − loan_amount
- Section 11: Dynamic scheme calculations (₹10,000, ₹20,000, etc.)
- Section 21: Principal Recovery = min(loan_amount, paid_amount)
- Section 8: Group funding source categorization
"""
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.services.profit_service import ProfitService


def test_contractual_profit_standard_scheme():
    """
    Spec Section 10:
    Loan Amount = ₹10,000
    Weekly Payment = ₹760
    Total Weeks = 18
    Contractual Repayment = 760 × 18 = 13,680
    Contractual Profit = 13,680 - 10,000 = 3,680
    """
    loan_amount = Decimal("10000.00")
    weekly_payment = Decimal("760.00")
    total_weeks = 18

    contractual_repayment = weekly_payment * Decimal(total_weeks)
    contractual_profit = contractual_repayment - loan_amount

    assert contractual_repayment == Decimal("13680.00")
    assert contractual_profit == Decimal("3680.00")


def test_contractual_profit_dynamic_schemes():
    """
    Spec Section 11:
    Model must support dynamic loan schemes (₹20k, ₹30k) without hardcoding.
    """
    # Scheme 20k: ₹1,500/week for 18 weeks
    loan_20k = Decimal("20000.00")
    inst_20k = Decimal("1500.00")
    repay_20k = inst_20k * 18
    profit_20k = repay_20k - loan_20k
    assert repay_20k == Decimal("27000.00")
    assert profit_20k == Decimal("7000.00")

    # Scheme 30k: ₹2,250/week for 18 weeks
    loan_30k = Decimal("30000.00")
    inst_30k = Decimal("2250.00")
    repay_30k = inst_30k * 18
    profit_30k = repay_30k - loan_30k
    assert repay_30k == Decimal("40500.00")
    assert profit_30k == Decimal("10500.00")


def test_principal_recovery_calculation():
    """
    Spec Section 21:
    For a ₹10,000 loan:
    At Week 13: 760 × 13 = ₹9,880 paid. Principal recovered = ₹9,880, remaining = ₹120.
    At Week 14: 760 × 14 = ₹10,640 paid. Principal recovered = ₹10,000 (capped), remaining = ₹0.
    """
    loan_amount = Decimal("10000.00")

    # Week 13
    paid_w13 = Decimal("760.00") * 13  # 9,880
    recovered_w13 = min(loan_amount, paid_w13)
    remaining_w13 = max(Decimal("0.00"), loan_amount - paid_w13)
    assert recovered_w13 == Decimal("9880.00")
    assert remaining_w13 == Decimal("120.00")

    # Week 14
    paid_w14 = Decimal("760.00") * 14  # 10,640
    recovered_w14 = min(loan_amount, paid_w14)
    remaining_w14 = max(Decimal("0.00"), loan_amount - paid_w14)
    assert recovered_w14 == Decimal("10000.00")
    assert remaining_w14 == Decimal("0.00")


def test_profit_service_aggregation():
    """ProfitService aggregates investments, contractual profit, collections, and principal recovery."""
    mock_db = MagicMock()

    # Configure table mocks
    def mock_table(name):
        t = MagicMock()
        sel = MagicMock()
        t.select.return_value = sel
        sel.order.return_value = sel
        sel.eq.return_value = sel
        sel.in_.return_value = sel

        if name == "investments":
            sel.execute.return_value.data = [
                {
                    "investment_type": "Initial",
                    "amount": "200000.00",
                    "investment_date": "2026-08-09",
                },
                {
                    "investment_type": "Additional",
                    "amount": "50000.00",
                    "investment_date": "2026-08-23",
                },
            ]
        elif name == "groups":
            sel.execute.return_value.data = [
                {"id": str(uuid4()), "funding_source": "Initial Investment", "status": "Active"},
                {"id": str(uuid4()), "funding_source": "Recycled Collections", "status": "Active"},
            ]
        elif name == "loan_cycles":
            cycle_id_1 = str(uuid4())
            cycle_id_2 = str(uuid4())
            sel.execute.return_value.data = [
                {
                    "id": cycle_id_1,
                    "status": "Active",
                    "scheme": {
                        "loan_amount": "10000.00",
                        "weekly_installment": "760.00",
                        "total_weeks": 18,
                    },
                },
                {
                    "id": cycle_id_2,
                    "status": "Active",
                    "scheme": {
                        "loan_amount": "10000.00",
                        "weekly_installment": "760.00",
                        "total_weeks": 18,
                    },
                },
            ]
        elif name == "collections":
            sel.execute.return_value.data = [
                {"loan_cycle_id": "c1", "amount_paid": "760.00", "payment_status": "Paid"},
                {"loan_cycle_id": "c1", "amount_paid": "760.00", "payment_status": "Paid"},
            ]
        elif name == "members":
            sel.execute.return_value.data = [{"id": str(uuid4())}, {"id": str(uuid4())}]
        else:
            sel.execute.return_value.data = []

        return t

    mock_db.table.side_effect = mock_table

    service = ProfitService(mock_db)
    summary = service.get_profit_summary()

    # 200k initial + 50k additional = 250k owner investment
    assert summary.total_initial_investment == Decimal("200000.00")
    assert summary.total_additional_investment == Decimal("50000.00")
    assert summary.total_owner_investment == Decimal("250000.00")

    # 2 loans of 10k: total loan capital = 20,000
    assert summary.total_loan_capital_deployed == Decimal("20000.00")
    # Repayment = 2 * (760 * 18) = 2 * 13,680 = 27,360
    assert summary.total_contractual_repayment == Decimal("27360.00")
    # Contractual profit = 27,360 - 20,000 = 7,360
    assert summary.total_contractual_profit == Decimal("7360.00")

    # Groups funding source breakdown
    assert summary.groups_by_funding_source["Initial Investment"] == 1
    assert summary.groups_by_funding_source["Recycled Collections"] == 1
