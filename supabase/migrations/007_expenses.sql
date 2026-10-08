-- ============================================================
-- VEL Finance — Migration 007
-- Business Expenses Tracking
-- ============================================================
--
-- Idempotent & safe to run on an existing database with data.
-- Creates expenses table for tracking operational expenses (e.g. tea, petrol, paper)
-- that deduct from Available Cash on the Dashboard.
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    note        TEXT NOT NULL,
    date        DATE NOT NULL DEFAULT CURRENT_DATE,
    category    VARCHAR(100) DEFAULT 'General',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date);

COMMENT ON TABLE expenses IS 'Operational expenses (travel, print, tea/petrol) deducted from Dashboard Available Cash.';
