/**
 * VEL Finance — Expenses Types
 * ==============================
 * Types mirroring backend Expense schemas.
 */

export interface Expense {
  id: string;
  amount: number | string;
  note: string;
  date: string;
  category?: string;
  created_at?: string;
}

export interface ExpenseCreatePayload {
  amount: number;
  note: string;
  date: string;
  category?: string;
}

export interface ExpenseSummary {
  total_expense: number | string;
  today_expense: number | string;
  count: number;
  expenses: Expense[];
}
