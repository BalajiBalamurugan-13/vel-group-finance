-- ============================================================
-- VEL Finance — Migration 003
-- Accounting & Profit Model: Investments & Group Funding Source
-- ============================================================
--
-- Idempotent & safe to run on an existing database with data.
-- Additive only: no existing columns renamed or dropped.
--
-- Summary of sections:
--   A. Create investments table (Owner capital tracking)
--   B. Add funding_source column to groups table
--   C. Row Level Security & Indexes
--   D. Trigger for updated_at
--   E. Views updated for investments and groups
-- ============================================================

-- ============================================================
-- SECTION A: INVESTMENTS TABLE
-- ============================================================
--
-- Tracks owner capital introduced into the business.
-- Distinguished strictly from customer collections and recycled cash.
-- ============================================================

CREATE TABLE IF NOT EXISTS investments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_seq  BIGINT GENERATED ALWAYS AS IDENTITY,
    investment_code VARCHAR(20) GENERATED ALWAYS AS ('INV-' || LPAD(investment_seq::TEXT, 4, '0')) STORED UNIQUE,
    investment_type VARCHAR(20) NOT NULL CHECK (investment_type IN ('Initial', 'Additional')),
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    investment_date DATE NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE investments IS
    'Tracks owner capital introduced into the business (Initial on 2026-08-09, Additional in later weeks).';

-- ============================================================
-- SECTION B: GROUP FUNDING SOURCE
-- ============================================================
--
-- Distinguishes whether a group was funded from:
--   1. Initial Investment
--   2. Additional Investment
--   3. Recycled Collections (default for normal business cash)
-- ============================================================

ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS funding_source VARCHAR(30)
        DEFAULT 'Recycled Collections'
        CHECK (funding_source IN ('Initial Investment', 'Additional Investment', 'Recycled Collections'));

COMMENT ON COLUMN groups.funding_source IS
    'Identifies capital source: Initial Investment, Additional Investment, or Recycled Collections.';

-- ============================================================
-- SECTION C: ROW LEVEL SECURITY & INDEXES
-- ============================================================

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_investments_date ON investments (investment_date);
CREATE INDEX IF NOT EXISTS idx_investments_type ON investments (investment_type);
CREATE INDEX IF NOT EXISTS idx_investments_code ON investments (investment_code);
CREATE INDEX IF NOT EXISTS idx_groups_funding_source ON groups (funding_source);

-- ============================================================
-- SECTION D: TRIGGERS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'investments_updated_at'
    ) THEN
        CREATE TRIGGER investments_updated_at
            BEFORE UPDATE ON investments
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================
-- SECTION E: READABLE ADMIN VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_investments_readable AS
SELECT
    id,
    investment_code,
    investment_type,
    amount,
    investment_date,
    description,
    created_at,
    updated_at
FROM investments;

COMMENT ON VIEW v_investments_readable IS
    'Admin view: human-readable owner investment records.';

-- Update v_groups_readable to include funding_source
CREATE OR REPLACE VIEW v_groups_readable AS
SELECT
    g.id,
    g.group_code,
    g.group_name,
    g.location,
    g.start_date,
    g.status,
    g.funding_source,
    g.remarks,
    g.created_at,
    g.updated_at,
    -- Scheme context
    g.scheme_id,
    s.scheme_code,
    s.scheme_name,
    s.loan_amount,
    s.weekly_installment,
    s.total_weeks,
    s.note_cost
FROM groups g
LEFT JOIN schemes s ON g.scheme_id = s.id;

COMMENT ON VIEW v_groups_readable IS
    'Admin view: groups enriched with scheme code, financial parameters, and funding source.';
