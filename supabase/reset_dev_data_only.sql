-- ============================================================
-- VEL Finance — Development Data Reset & Sequence Restart
-- ============================================================
-- PURPOSE:
--   Safely clears all application business data and restarts all
--   identity sequences so that a fresh development or testing run
--   starts cleanly with codes:
--     - Schemes:           SCH-0001
--     - Groups:            GRP-0001
--     - Members:           M-0001
--     - Collectors:        COL-0001
--     - Loan Cycles:       LC-0001
--     - Loan Transactions: TXN-0001
--     - Collections:       RCP-0001
--
-- PRESERVED:
--   - Schema structure, tables, columns, indexes, constraints
--   - Financial immutability triggers (prevent_financial_record_mutation)
--   - Generated code definitions (GENERATED ALWAYS AS IDENTITY / STORED)
--   - RLS policies and admin views
--
-- USAGE INSTRUCTIONS:
--   Run this script in the Supabase SQL Editor as the postgres /
--   supabase_admin role.
--   DO NOT run this in production!
-- ============================================================

DO $$
BEGIN
    -- Optional safety check: prevent accidental production reset if environment flag is configured
    IF current_setting('app.settings.environment', true) = 'production' THEN
        RAISE EXCEPTION 'CANNOT RUN DATA RESET IN PRODUCTION ENVIRONMENT!';
    END IF;
END $$;

-- ── 1. CLEAR BUSINESS DATA (Strict Foreign Key Order) ──────────
-- Children must be deleted before parents to satisfy RESTRICT FKs:
DELETE FROM collections;
DELETE FROM loan_transactions;
DELETE FROM loan_cycles;
DELETE FROM members;
DELETE FROM groups;
DELETE FROM schemes;
DELETE FROM collectors;

-- ── 2. RESTART IDENTITY SEQUENCES (Reset all to 1) ─────────────
-- Resets the GENERATED ALWAYS AS IDENTITY sequence generators
-- so the very next inserted record produces 0001.

ALTER TABLE collections       ALTER COLUMN receipt_seq     RESTART WITH 1;
ALTER TABLE loan_transactions ALTER COLUMN transaction_seq RESTART WITH 1;
ALTER TABLE loan_cycles       ALTER COLUMN cycle_seq       RESTART WITH 1;
ALTER TABLE members           ALTER COLUMN member_seq      RESTART WITH 1;
ALTER TABLE groups            ALTER COLUMN group_seq       RESTART WITH 1;
ALTER TABLE schemes           ALTER COLUMN scheme_seq      RESTART WITH 1;
ALTER TABLE collectors        ALTER COLUMN collector_seq   RESTART WITH 1;

-- ── 3. VERIFY CLEAN STATE ──────────────────────────────────────
DO $$
DECLARE
    cnt_coll  BIGINT;
    cnt_txn   BIGINT;
    cnt_cyc   BIGINT;
    cnt_mem   BIGINT;
    cnt_grp   BIGINT;
    cnt_sch   BIGINT;
    cnt_col   BIGINT;
BEGIN
    SELECT count(*) INTO cnt_coll FROM collections;
    SELECT count(*) INTO cnt_txn  FROM loan_transactions;
    SELECT count(*) INTO cnt_cyc  FROM loan_cycles;
    SELECT count(*) INTO cnt_mem  FROM members;
    SELECT count(*) INTO cnt_grp  FROM groups;
    SELECT count(*) INTO cnt_sch  FROM schemes;
    SELECT count(*) INTO cnt_col  FROM collectors;

    IF (cnt_coll + cnt_txn + cnt_cyc + cnt_mem + cnt_grp + cnt_sch + cnt_col) = 0 THEN
        RAISE NOTICE 'SUCCESS: All business tables cleared and identity sequences reset to 1.';
    ELSE
        RAISE EXCEPTION 'RESET FAILED: Some tables still contain data.';
    END IF;
END $$;
