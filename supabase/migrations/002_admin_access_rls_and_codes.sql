-- ============================================================
-- VEL Finance — Migration 002
-- Database Architecture: Admin Access + RLS + Human-Readable Codes
-- ============================================================
--
-- Idempotent & safe to run on an existing database with data.
-- Additive only: no existing columns renamed or dropped.
-- UUID primary keys and all foreign key relationships remain intact.
--
-- Summary of sections:
--   A. Immutability trigger update (admin UPDATE/DELETE allowed)
--   B. Row Level Security on 8 tables (deny-by-default for anon, service_role bypasses)
--   C. Human-readable business identifiers for 7 business tables
--   D. Explicit B-tree indexes on all code columns
--   E. Comprehensive readable admin views for all business entities
-- ============================================================


-- ============================================================
-- SECTION A: FINANCIAL RECORD IMMUTABILITY — ADMIN EXEMPTION
-- ============================================================
--
-- UPDATE vs DELETE trigger return semantics in PostgreSQL:
--   - For BEFORE UPDATE: must RETURN NEW to allow the update with new values.
--   - For BEFORE DELETE: must RETURN OLD to allow the deletion of the row.
--
-- Postgres/supabase_admin roles are the database administrators.
-- All application-level operations (FastAPI, anon, authenticated)
-- remain strictly blocked from modifying financial records.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_financial_record_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow database administrators (postgres, supabase_admin) to correct records.
    IF current_user IN ('postgres', 'supabase_admin') THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSIF TG_OP = 'UPDATE' THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Application-level enforcement: block mutations
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'Financial records are immutable and cannot be deleted. '
            'Per docs/04_ACCOUNTING_RULES.md: correct mistakes using adjustment transactions. '
            'Database administrators (postgres role) can delete records directly in Supabase.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION
            'Financial records are immutable and cannot be updated. '
            'Per docs/04_ACCOUNTING_RULES.md: correct mistakes using adjustment transactions. '
            'Database administrators (postgres role) can update records directly in Supabase.';
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: Existing triggers in migration 001 reference prevent_financial_record_mutation()
-- by name. Replacing the function updates the trigger behavior immediately.


-- ============================================================
-- SECTION B: ROW LEVEL SECURITY
-- ============================================================
--
-- Architecture: Frontend -> FastAPI (service_role) -> Supabase
--
-- Enabling RLS without anon policies creates a default-deny state
-- for anonymous/public requests, eliminating Supabase security warnings.
-- FastAPI uses the service_role key, which bypasses RLS by platform guarantee.
-- ============================================================

ALTER TABLE schemes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_cycles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings          ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION C: HUMAN-READABLE BUSINESS IDENTIFIERS
-- ============================================================
--
-- Codes are generated via BIGINT identity sequences and STORED
-- computed columns. They are:
--   - Stable: sequence numbers are never re-used or shifted.
--   - Unique: database-enforced UNIQUE constraint.
--   - Concurrency-safe: atomic database sequences.
--   - Idempotent: safe to run multiple times.
-- ============================================================

-- ── 1. members (M-0001, M-0002, ...) ────────────────────────
ALTER TABLE members
    ADD COLUMN IF NOT EXISTS member_seq  BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE members
    ADD COLUMN IF NOT EXISTS member_code TEXT
        GENERATED ALWAYS AS ('M-' || LPAD(member_seq::TEXT, 4, '0')) STORED;
ALTER TABLE members
    DROP CONSTRAINT IF EXISTS members_member_code_unique;
ALTER TABLE members
    ADD CONSTRAINT members_member_code_unique UNIQUE (member_code);
COMMENT ON COLUMN members.member_code IS 'Stable human-readable identifier. M-0001, M-0002, etc.';


-- ── 2. groups (GRP-0001, GRP-0002, ...) ─────────────────────
ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS group_seq  BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS group_code TEXT
        GENERATED ALWAYS AS ('GRP-' || LPAD(group_seq::TEXT, 4, '0')) STORED;
ALTER TABLE groups
    DROP CONSTRAINT IF EXISTS groups_group_code_unique;
ALTER TABLE groups
    ADD CONSTRAINT groups_group_code_unique UNIQUE (group_code);
COMMENT ON COLUMN groups.group_code IS 'Stable human-readable identifier. GRP-0001, GRP-0002, etc.';


-- ── 3. schemes (SCH-0001, SCH-0002, ...) ───────────────────
ALTER TABLE schemes
    ADD COLUMN IF NOT EXISTS scheme_seq  BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE schemes
    ADD COLUMN IF NOT EXISTS scheme_code TEXT
        GENERATED ALWAYS AS ('SCH-' || LPAD(scheme_seq::TEXT, 4, '0')) STORED;
ALTER TABLE schemes
    DROP CONSTRAINT IF EXISTS schemes_scheme_code_unique;
ALTER TABLE schemes
    ADD CONSTRAINT schemes_scheme_code_unique UNIQUE (scheme_code);
COMMENT ON COLUMN schemes.scheme_code IS 'Stable human-readable identifier. SCH-0001, SCH-0002, etc.';


-- ── 4. collectors (COL-0001, COL-0002, ...) ─────────────────
ALTER TABLE collectors
    ADD COLUMN IF NOT EXISTS collector_seq  BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE collectors
    ADD COLUMN IF NOT EXISTS collector_code TEXT
        GENERATED ALWAYS AS ('COL-' || LPAD(collector_seq::TEXT, 4, '0')) STORED;
ALTER TABLE collectors
    DROP CONSTRAINT IF EXISTS collectors_collector_code_unique;
ALTER TABLE collectors
    ADD CONSTRAINT collectors_collector_code_unique UNIQUE (collector_code);
COMMENT ON COLUMN collectors.collector_code IS 'Stable human-readable identifier. COL-0001, COL-0002, etc.';


-- ── 5. loan_cycles (LC-0001, LC-0002, ...) ──────────────────
ALTER TABLE loan_cycles
    ADD COLUMN IF NOT EXISTS cycle_seq  BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE loan_cycles
    ADD COLUMN IF NOT EXISTS cycle_code TEXT
        GENERATED ALWAYS AS ('LC-' || LPAD(cycle_seq::TEXT, 4, '0')) STORED;
ALTER TABLE loan_cycles
    DROP CONSTRAINT IF EXISTS loan_cycles_cycle_code_unique;
ALTER TABLE loan_cycles
    ADD CONSTRAINT loan_cycles_cycle_code_unique UNIQUE (cycle_code);
COMMENT ON COLUMN loan_cycles.cycle_code IS 'Stable human-readable identifier. LC-0001, LC-0002, etc.';


-- ── 6. loan_transactions (TXN-0001, TXN-0002, ...) ──────────
ALTER TABLE loan_transactions
    ADD COLUMN IF NOT EXISTS transaction_seq  BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE loan_transactions
    ADD COLUMN IF NOT EXISTS transaction_code TEXT
        GENERATED ALWAYS AS ('TXN-' || LPAD(transaction_seq::TEXT, 4, '0')) STORED;
ALTER TABLE loan_transactions
    DROP CONSTRAINT IF EXISTS loan_transactions_transaction_code_unique;
ALTER TABLE loan_transactions
    ADD CONSTRAINT loan_transactions_transaction_code_unique UNIQUE (transaction_code);
COMMENT ON COLUMN loan_transactions.transaction_code IS 'Stable disbursement identifier. TXN-0001, TXN-0002, etc.';


-- ── 7. collections (RCP-0001, RCP-0002, ...) ────────────────
ALTER TABLE collections
    ADD COLUMN IF NOT EXISTS receipt_seq  BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE collections
    ADD COLUMN IF NOT EXISTS receipt_code TEXT
        GENERATED ALWAYS AS ('RCP-' || LPAD(receipt_seq::TEXT, 4, '0')) STORED;
ALTER TABLE collections
    DROP CONSTRAINT IF EXISTS collections_receipt_code_unique;
ALTER TABLE collections
    ADD CONSTRAINT collections_receipt_code_unique UNIQUE (receipt_code);
COMMENT ON COLUMN collections.receipt_code IS 'Stable receipt identifier. RCP-0001, RCP-0002, etc.';


-- ============================================================
-- SECTION D: INDEXES ON CODE COLUMNS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_members_member_code           ON members (member_code);
CREATE INDEX IF NOT EXISTS idx_groups_group_code             ON groups (group_code);
CREATE INDEX IF NOT EXISTS idx_schemes_scheme_code           ON schemes (scheme_code);
CREATE INDEX IF NOT EXISTS idx_collectors_collector_code     ON collectors (collector_code);
CREATE INDEX IF NOT EXISTS idx_loan_cycles_cycle_code        ON loan_cycles (cycle_code);
CREATE INDEX IF NOT EXISTS idx_loan_transactions_txn_code    ON loan_transactions (transaction_code);
CREATE INDEX IF NOT EXISTS idx_collections_receipt_code      ON collections (receipt_code);


-- ============================================================
-- SECTION E: READABLE ADMIN VIEWS FOR ALL BUSINESS ENTITIES
-- ============================================================

-- ── View 1: Collections with human-readable context ─────────
CREATE OR REPLACE VIEW v_collections_readable AS
SELECT
    c.id,
    c.receipt_code,
    c.week_number,
    c.amount_paid,
    c.payment_status,
    c.payment_date,
    c.remarks,
    c.created_at,
    -- Member context
    c.member_id,
    m.member_code,
    m.member_name,
    m.phone_number,
    -- Group context
    c.group_id,
    g.group_code,
    g.group_name,
    g.location,
    -- Loan cycle context
    c.loan_cycle_id,
    lc.cycle_code,
    lc.cycle_number,
    -- Collector context
    c.collector_id,
    col.collector_code,
    col.collector_name
FROM collections c
LEFT JOIN members     m   ON c.member_id      = m.id
LEFT JOIN groups      g   ON c.group_id       = g.id
LEFT JOIN loan_cycles lc  ON c.loan_cycle_id  = lc.id
LEFT JOIN collectors  col ON c.collector_id   = col.id;

COMMENT ON VIEW v_collections_readable IS
    'Admin view: collections enriched with codes, member name, group name, collector.';


-- ── View 2: Members with group context ──────────────────────
CREATE OR REPLACE VIEW v_members_readable AS
SELECT
    m.id,
    m.member_code,
    m.member_name,
    m.phone_number,
    m.address,
    m.joined_week,
    m.joined_date,
    m.status,
    m.remarks,
    m.created_at,
    m.updated_at,
    -- Group context
    m.group_id,
    g.group_code,
    g.group_name,
    g.location,
    g.status AS group_status
FROM members m
LEFT JOIN groups g ON m.group_id = g.id;

COMMENT ON VIEW v_members_readable IS
    'Admin view: members enriched with group code and name.';


-- ── View 3: Loan transactions with member and group context ──
CREATE OR REPLACE VIEW v_loan_transactions_readable AS
SELECT
    lt.id,
    lt.transaction_code,
    lt.loan_amount,
    lt.note_cost,
    lt.cash_given,
    lt.disbursement_date,
    lt.remarks,
    lt.created_at,
    -- Member context
    lt.member_id,
    m.member_code,
    m.member_name,
    -- Loan cycle context
    lt.loan_cycle_id,
    lc.cycle_code,
    lc.cycle_number,
    -- Group context
    lc.group_id,
    g.group_code,
    g.group_name
FROM loan_transactions lt
LEFT JOIN members     m  ON lt.member_id     = m.id
LEFT JOIN loan_cycles lc ON lt.loan_cycle_id = lc.id
LEFT JOIN groups      g  ON lc.group_id      = g.id;

COMMENT ON VIEW v_loan_transactions_readable IS
    'Admin view: loan disbursement transactions enriched with codes.';


-- ── View 4: Groups with scheme context ──────────────────────
CREATE OR REPLACE VIEW v_groups_readable AS
SELECT
    g.id,
    g.group_code,
    g.group_name,
    g.location,
    g.start_date,
    g.status,
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
    'Admin view: groups enriched with scheme code and financial parameters.';


-- ── View 5: Loan cycles with member, group & scheme context ─
CREATE OR REPLACE VIEW v_loan_cycles_readable AS
SELECT
    lc.id,
    lc.cycle_code,
    lc.cycle_number,
    lc.status,
    lc.start_date,
    lc.end_date,
    lc.created_at,
    lc.updated_at,
    -- Member context
    lc.member_id,
    m.member_code,
    m.member_name,
    -- Group context
    lc.group_id,
    g.group_code,
    g.group_name,
    g.location,
    -- Scheme context
    lc.scheme_id,
    s.scheme_code,
    s.scheme_name,
    s.loan_amount,
    s.weekly_installment,
    s.total_weeks
FROM loan_cycles lc
LEFT JOIN members m ON lc.member_id = m.id
LEFT JOIN groups  g ON lc.group_id  = g.id
LEFT JOIN schemes s ON lc.scheme_id = s.id;

COMMENT ON VIEW v_loan_cycles_readable IS
    'Admin view: loan cycles enriched with member, group, and scheme codes.';


-- ============================================================
-- END OF MIGRATION 002
-- ============================================================
