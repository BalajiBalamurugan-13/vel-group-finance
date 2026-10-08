"""
Unit tests for ExpenseService and Expense API.
"""
from datetime import date
from decimal import Decimal
import json
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from app.schemas.expense import ExpenseCreate
from app.services.expense_service import ExpenseService
from app.services.dashboard_service import DashboardService


def _mock_db_with_settings(initial_expenses=None):
    db = MagicMock()
    mock_expenses = list(initial_expenses or [])

    mock_row = MagicMock()
    mock_row.data = [{"value": json.dumps(mock_expenses)}] if mock_expenses else []

    def table_router(table_name):
        mock_table = MagicMock()
        mock_query = MagicMock()
        mock_table.select.return_value = mock_query
        mock_table.insert.return_value = mock_query
        mock_table.update.return_value = mock_query
        mock_table.delete.return_value = mock_query

        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.gte.return_value = mock_query
        mock_query.lte.return_value = mock_query

        if table_name == "expenses":
            # Simulate no direct expenses table (falls back to settings)
            mock_query.execute.side_effect = Exception("PGRST205: relation does not exist")
        elif table_name == "settings":
            mock_query.execute.return_value = mock_row

        return mock_table

    db.table.side_effect = table_router
    return db


class TestExpenseService:
    def test_add_and_get_expense(self):
        db = _mock_db_with_settings()
        service = ExpenseService(db)

        # Mock settings write
        saved_settings = {}
        def mock_settings_save(expenses):
            saved_settings["value"] = expenses

        service._save_expenses_to_settings = mock_settings_save
        service._load_expenses_from_settings = lambda: saved_settings.get("value", [])

        rec = service.add_expense(ExpenseCreate(
            amount=Decimal("450.00"),
            note="Petrol & Tea",
            date=date.today(),
            category="Travel",
        ))

        assert rec["amount"] == 450.0
        assert rec["note"] == "Petrol & Tea"
        assert service.get_total_expenses() == Decimal("450.00")

    def test_expense_deducted_from_dashboard_cash(self):
        """
        Verifies that expenses are deducted from Available Cash in DashboardService.
        """
        expenses = [
            {"id": str(uuid4()), "amount": 1000.0, "note": "Printer ink", "date": date.today().isoformat()}
        ]

        db = MagicMock()
        def table_router(table_name):
            t = MagicMock()
            q = MagicMock()
            t.select.return_value = q
            q.select.return_value = q
            q.eq.return_value = q
            q.in_.return_value = q
            q.gte.return_value = q
            q.lte.return_value = q
            q.order.return_value = q
            q.limit.return_value = q

            if table_name == "collections":
                q.execute.return_value = MagicMock(data=[
                    {"amount_paid": 50000.0, "payment_date": date.today().isoformat(), "payment_status": "Paid"}
                ])
            elif table_name == "investments":
                q.execute.return_value = MagicMock(data=[])
            elif table_name == "loan_transactions":
                q.execute.return_value = MagicMock(data=[
                    {"loan_amount": 20000.0, "note_cost": 200.0, "cash_given": 19800.0}
                ])
            elif table_name == "settings":
                q.execute.return_value = MagicMock(data=[
                    {"key": "business_expenses", "value": json.dumps(expenses)}
                ])
            else:
                q.execute.return_value = MagicMock(data=[])
            return t

        db.table.side_effect = table_router
        svc = DashboardService(db)
        summary = svc.get_summary(force_refresh=True)

        assert summary.total_collection == Decimal("50000.00")
        assert summary.total_disbursement == Decimal("19800.00")
        assert summary.total_expenses == Decimal("1000.00")
        # Cash In (50,000) - Cash Out (19,800 loans + 1,000 expenses = 20,800) = 29,200
        assert summary.total_cash_out == Decimal("20800.00")
        assert summary.available_cash == Decimal("29200.00")
