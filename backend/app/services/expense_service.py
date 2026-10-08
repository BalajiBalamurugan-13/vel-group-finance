"""
VEL Finance — Expense Service
=============================
Handles tracking of business expenses (e.g., travel, paper, tea/petrol).
Expenses directly deduct from operational Available Cash on the Dashboard.
Matches the behavior in Vel Finance DL.
"""
from datetime import date, datetime, timezone
from decimal import Decimal
import json
import logging
from typing import Optional
from uuid import UUID, uuid4

from supabase import Client

from app.schemas.expense import ExpenseCreate
from app.services.dashboard_service import invalidate_dashboard_cache

logger = logging.getLogger(__name__)

SETTINGS_KEY_EXPENSES = "business_expenses"


class ExpenseService:
    def __init__(self, db: Client):
        self.db = db

    def _load_expenses_from_settings(self) -> list[dict]:
        """Loads expenses stored in the settings table."""
        try:
            res = (
                self.db.table("settings")
                .select("value")
                .eq("key", SETTINGS_KEY_EXPENSES)
                .limit(1)
                .execute()
            )
            if res.data and res.data[0].get("value"):
                return json.loads(res.data[0]["value"])
            return []
        except Exception as e:
            logger.error("Failed to load expenses from settings: %s", e)
            return []

    def _save_expenses_to_settings(self, expenses: list[dict]) -> None:
        """Saves expenses into the settings table."""
        val_str = json.dumps(expenses, ensure_ascii=False)
        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            existing = (
                self.db.table("settings")
                .select("id")
                .eq("key", SETTINGS_KEY_EXPENSES)
                .limit(1)
                .execute()
            )
            if existing.data:
                self.db.table("settings").update({
                    "value": val_str,
                    "updated_at": now_iso,
                }).eq("key", SETTINGS_KEY_EXPENSES).execute()
            else:
                self.db.table("settings").insert({
                    "key": SETTINGS_KEY_EXPENSES,
                    "value": val_str,
                    "description": "Business expenses list",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }).execute()
        except Exception as e:
            logger.error("Failed to save expenses to settings: %s", e)
            raise

    def add_expense(self, data: ExpenseCreate) -> dict:
        """
        Adds a new expense.
        Invalidates dashboard cache so available cash updates immediately.
        """
        expense_id = str(uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        date_str = data.date.isoformat() if hasattr(data.date, "isoformat") else str(data.date)[:10]

        record = {
            "id": expense_id,
            "amount": float(data.amount),
            "note": data.note.strip(),
            "date": date_str,
            "category": data.category or "General",
            "created_at": now_iso,
        }

        # Attempt inserting into 'expenses' table if it exists
        saved_via_table = False
        try:
            res = self.db.table("expenses").insert({
                "id": expense_id,
                "amount": float(data.amount),
                "note": data.note.strip(),
                "date": date_str,
                "category": data.category or "General",
                "created_at": now_iso,
            }).execute()
            if res.data:
                saved_via_table = True
        except Exception as e:
            logger.debug("Expenses table not used, falling back to settings table: %s", e)

        if not saved_via_table:
            # Fallback to persistent settings table
            expenses = self._load_expenses_from_settings()
            expenses.insert(0, record)
            self._save_expenses_to_settings(expenses)

        # Invalidate dashboard cache immediately
        invalidate_dashboard_cache()
        logger.info("Added expense: %s, amount: %s", record["note"], record["amount"])
        return record

    def get_expenses(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
    ) -> list[dict]:
        """
        Retrieves expenses, ordered newest first.
        """
        # Try expenses table first
        try:
            q = self.db.table("expenses").select("*").order("date", desc=True).limit(limit)
            if start_date:
                q = q.gte("date", start_date.isoformat())
            if end_date:
                q = q.lte("date", end_date.isoformat())
            res = q.execute()
            if res.data:
                return res.data
        except Exception:
            pass

        # Fallback to settings
        expenses = self._load_expenses_from_settings()
        filtered = expenses
        if start_date:
            s_str = start_date.isoformat()
            filtered = [e for e in filtered if str(e.get("date", "")) >= s_str]
        if end_date:
            e_str = end_date.isoformat()
            filtered = [e for e in filtered if str(e.get("date", "")) <= e_str]

        # Sort descending by date and created_at
        filtered.sort(key=lambda x: (str(x.get("date", "")), str(x.get("created_at", ""))), reverse=True)
        return filtered[:limit]

    def delete_expense(self, expense_id: str) -> bool:
        """
        Deletes an expense by ID.
        """
        deleted = False
        # Try expenses table
        try:
            res = self.db.table("expenses").delete().eq("id", expense_id).execute()
            if res.data:
                deleted = True
        except Exception:
            pass

        # Also remove from settings
        expenses = self._load_expenses_from_settings()
        new_list = [e for e in expenses if str(e.get("id")) != str(expense_id)]
        if len(new_list) < len(expenses):
            self._save_expenses_to_settings(new_list)
            deleted = True

        if deleted:
            invalidate_dashboard_cache()
        return deleted

    def get_total_expenses(self) -> Decimal:
        """
        Calculates the grand total of all expenses.
        Used by DashboardService.
        """
        # Try expenses table
        try:
            res = self.db.table("expenses").select("amount").execute()
            if res.data is not None:
                tot = Decimal("0.00")
                for r in res.data:
                    amt = r.get("amount")
                    if amt is not None:
                        tot += Decimal(str(amt))
                return tot
        except Exception:
            pass

        expenses = self._load_expenses_from_settings()
        tot = Decimal("0.00")
        for e in expenses:
            amt = e.get("amount")
            if amt is not None:
                tot += Decimal(str(amt))
        return tot

    def get_summary(self, target_date: Optional[date] = None) -> dict:
        """
        Returns full expense summary with total, today's expense, and list.
        """
        today_val = (target_date or date.today()).isoformat()
        expenses = self.get_expenses(limit=200)

        total_expense = Decimal("0.00")
        today_expense = Decimal("0.00")

        for e in expenses:
            amt = Decimal(str(e.get("amount") or 0))
            total_expense += amt
            if str(e.get("date", ""))[:10] == today_val:
                today_expense += amt

        return {
            "total_expense": total_expense,
            "today_expense": today_expense,
            "count": len(expenses),
            "expenses": expenses,
        }
