-- ============================================================
-- VEL Finance — Migration 004
-- Mixed Recycled Funding Source & Investment Linking
-- ============================================================
--
-- Idempotent & safe to run on an existing database with data.
-- Additive only: no existing columns renamed or dropped.
--
-- Supports groups funded by a combination of Recycled Collections
-- and extra Owner Investment (cash from hand).
-- Self-contained: safely ensures prerequisite tables and columns
-- (from Migration 003) exist before applying alterations.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ensure investments table exists (Prerequisite from Migration 003)
-- ------------------------------------------------------------
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

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_investments_date ON investments (investment_date);
CREATE INDEX IF NOT EXISTS idx_investments_type ON investments (investment_type);
CREATE INDEX IF NOT EXISTS idx_investments_code ON investments (investment_code);

-- Trigger for investments.updated_at
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

-- ------------------------------------------------------------
-- 2. Ensure funding_source exists on groups (Prerequisite from Migration 003)
-- ------------------------------------------------------------
ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS funding_source VARCHAR(30)
        DEFAULT 'Recycled Collections'
        CHECK (funding_source IN ('Initial Investment', 'Additional Investment', 'Recycled Collections'));

COMMENT ON COLUMN groups.funding_source IS
    'Identifies capital source: Initial Investment, Additional Investment, or Recycled Collections.';

CREATE INDEX IF NOT EXISTS idx_groups_funding_source ON groups (funding_source);

-- ------------------------------------------------------------
-- 3. Add recycled_sub_type and owner_investment_amount to groups table
-- ------------------------------------------------------------
ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS recycled_sub_type VARCHAR(40)
        DEFAULT 'Fully Recycled'
        CHECK (recycled_sub_type IN ('Fully Recycled', 'Recycled + Owner Investment'));

ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS owner_investment_amount NUMERIC(12,2)
        DEFAULT 0
        CHECK (owner_investment_amount >= 0);

COMMENT ON COLUMN groups.recycled_sub_type IS
    'For Recycled Collections: Fully Recycled or Recycled + Owner Investment.';

COMMENT ON COLUMN groups.owner_investment_amount IS
    'Cash amount added from owner hand for mixed recycled groups.';

CREATE INDEX IF NOT EXISTS idx_groups_recycled_sub_type ON groups (recycled_sub_type);

-- ------------------------------------------------------------
-- 4. Add group_id to investments table for traceability
-- ------------------------------------------------------------
ALTER TABLE investments
    ADD COLUMN IF NOT EXISTS group_id UUID
        REFERENCES groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_investments_group_id ON investments (group_id);

-- ------------------------------------------------------------
-- 5. Update readable admin views
-- ------------------------------------------------------------
-- Drop existing views first to allow column reordering/additions
DROP VIEW IF EXISTS v_investments_readable;

CREATE VIEW v_investments_readable AS
SELECT
    id,
    investment_code,
    investment_type,
    amount,
    investment_date,
    description,
    group_id,
    created_at,
    updated_at
FROM investments;

COMMENT ON VIEW v_investments_readable IS
    'Admin view: human-readable owner investment records with optional group link.';

DROP VIEW IF EXISTS v_groups_readable;

CREATE VIEW v_groups_readable AS
SELECT
    g.id,
    g.group_code,
    g.group_name,
    g.location,
    g.start_date,
    g.status,
    g.funding_source,
    g.recycled_sub_type,
    g.owner_investment_amount,
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
    'Admin view: groups joined with schemes and funding source breakdown.';

-- ------------------------------------------------------------
-- 6. Backfill historical groups: Week 1 groups are Initial Investment
-- ------------------------------------------------------------
UPDATE groups
SET funding_source = 'Initial Investment'
WHERE (start_date <= '2026-08-15' OR start_date IS NULL)
  AND (funding_source = 'Recycled Collections' OR funding_source IS NULL);
