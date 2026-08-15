-- ============================================================
-- VEL Finance — Group Finance
-- Migration: 001_initial_schema.sql
-- ============================================================
-- Purpose   : Create the complete initial database schema
-- Source    : docs/06_DATABASE_DESIGN.md (authoritative)
-- Cross-ref : docs/02_BUSINESS_RULES.md
--             docs/03_SCHEME_CONFIGURATION.md
--             docs/04_ACCOUNTING_RULES.md
--             docs/05_BUSINESS_FORMULAS.md
-- Created   : August 2026
-- Revised   : August 2026 — Integrity corrections
-- ============================================================
--
-- IMPORTANT BEFORE APPLYING:
--   1. Review this migration carefully before running.
--   2. Apply to local Supabase first: supabase db reset
--   3. Only apply to the VEL Finance Group Finance Supabase project.
--   4. NEVER apply to the Daily Collection Supabase project.
--
-- HOW TO APPLY:
--   Local  : supabase db reset (applies all migrations from scratch)
--   Remote : supabase db push  (after supabase link --project-ref <ref>)
--
-- MONETARY COLUMNS:
--   All monetary values use NUMERIC(12,2).
--   This supports amounts up to ₹9,999,999,999.99.
--   Floating-point types (FLOAT, DOUBLE) are NOT used for money.
--   Per docs/06_DATABASE_DESIGN.md financial data type guidance.
--
-- CALCULATED VALUES (NEVER STORED):
--   Per docs/06_DATABASE_DESIGN.md and docs/02_BUSINESS_RULES.md (BR-004):
--   - Member Count           → COUNT(active members)
--   - Total Group Amount     → loan_amount × member_count
--   - Total Loan Disbursed   → SUM(loan_transactions.loan_amount)
--   - Total Cash Given       → SUM(loan_transactions.cash_given)
--   - Total Collections      → SUM(collections.amount_paid)
--   - Outstanding Amount     → remaining_installments × weekly_installment
--   - Completion Percentage  → (weeks_paid / total_weeks) × 100
--   - Expected Profit        → total_collection - loan_amount
--   - Current Cash Position  → cash_in - cash_out
--   These must NEVER be stored as database columns.
--
-- ROW LEVEL SECURITY:
--   RLS is NOT configured in this migration.
--   Per task specification Part 7: "authentication and final user roles
--   are not yet defined — do NOT invent a complex authorization system."
--   RLS policies will be added in the authentication milestone.
--   The Supabase service role key (used by the backend) bypasses RLS.
-- ============================================================


-- ============================================================
-- TABLE 1: schemes
-- ============================================================
-- Purpose : Reusable financial scheme configurations.
--           Every group must be created using a scheme.
--           One scheme → many groups.
--
-- Per docs/03_SCHEME_CONFIGURATION.md:
--   "A Scheme contains all financial parameters required to
--    create finance groups. The application must always use
--    Scheme values instead of hardcoded values."
--
-- Per docs/03_SCHEME_CONFIGURATION.md "Scheme Versioning":
--   "If financial values change, a new Scheme should be created
--    instead of modifying an existing one."
--   This means schemes are immutable-by-convention: when financial
--   parameters change, a new scheme is created. Existing groups/cycles
--   retain their scheme_id and therefore their original financial config.
--
-- Per docs/02_BUSINESS_RULES.md (BR-003, BR-035):
--   "A group is created using one predefined scheme."
--   "Loan configuration must always come from the selected scheme."
-- ============================================================

CREATE TABLE IF NOT EXISTS schemes (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),

    scheme_name         VARCHAR(255)    NOT NULL,
    description         TEXT,

    loan_amount         NUMERIC(12, 2)  NOT NULL CHECK (loan_amount > 0),
    weekly_installment  NUMERIC(12, 2)  NOT NULL CHECK (weekly_installment > 0),
    total_weeks         INTEGER         NOT NULL CHECK (total_weeks > 0),
    note_cost           NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (note_cost >= 0),

    status              VARCHAR(20)     NOT NULL DEFAULT 'Active'
                            CHECK (status IN ('Active', 'Inactive')),

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT schemes_pkey PRIMARY KEY (id),
    CONSTRAINT schemes_scheme_name_unique UNIQUE (scheme_name)
);

COMMENT ON TABLE schemes IS 'Reusable financial scheme configurations. Every group references one scheme.';
COMMENT ON COLUMN schemes.loan_amount IS 'Loan amount per member in INR. Always positive.';
COMMENT ON COLUMN schemes.weekly_installment IS 'Weekly repayment amount per member in INR. Always positive.';
COMMENT ON COLUMN schemes.total_weeks IS 'Total number of weekly installments for this scheme.';
COMMENT ON COLUMN schemes.note_cost IS 'Amount deducted from loan before disbursement. Recognized as income. Per docs/04_ACCOUNTING_RULES.md.';
COMMENT ON COLUMN schemes.status IS 'Active schemes can be selected for new groups. Inactive schemes remain for historical reference.';


-- ============================================================
-- TABLE 2: groups
-- ============================================================
-- Purpose : Finance groups (e.g., PTM 1, PTM 2, TNK 1).
--           One group → one scheme.
--           One group → many members.
-- ============================================================

CREATE TABLE IF NOT EXISTS groups (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),

    scheme_id   UUID            NOT NULL,

    location    VARCHAR(100)    NOT NULL,
    group_name  VARCHAR(255)    NOT NULL,
    start_date  DATE,
    remarks     TEXT,

    status      VARCHAR(20)     NOT NULL DEFAULT 'Draft'
                    CHECK (status IN ('Draft', 'Active', 'Completed', 'Renewed', 'Closed')),

    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT groups_pkey PRIMARY KEY (id),
    CONSTRAINT groups_group_name_unique UNIQUE (group_name),

    CONSTRAINT groups_scheme_id_fkey
        FOREIGN KEY (scheme_id) REFERENCES schemes (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

COMMENT ON TABLE groups IS 'Finance groups (e.g., PTM 1, TNK 2). Each group uses one scheme. Member count and total amount are computed dynamically.';
COMMENT ON COLUMN groups.location IS 'Business location identifier (e.g., PTM, TNK). Per BR-001.';
COMMENT ON COLUMN groups.group_name IS 'Unique group name = location + number (e.g., PTM 1). Per BR-002.';
COMMENT ON COLUMN groups.status IS 'Group lifecycle: Draft → Active → Completed → Renewed or Closed.';


-- ============================================================
-- TABLE 3: members
-- ============================================================
-- Purpose : Customer information for group finance members.
--           One member → one active group.
--           One member → many loan cycles (via renewals).
-- ============================================================

CREATE TABLE IF NOT EXISTS members (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),

    group_id    UUID            NOT NULL,

    member_name VARCHAR(255)    NOT NULL,
    phone_number VARCHAR(20)    NOT NULL,
    address     TEXT            NOT NULL,

    photo_url   TEXT,
    nominee     VARCHAR(255),
    id_proof    TEXT,

    joined_week INTEGER         NOT NULL DEFAULT 1 CHECK (joined_week >= 1),
    joined_date DATE,

    status      VARCHAR(20)     NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active', 'Completed', 'Closed')),

    remarks     TEXT,

    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT members_pkey PRIMARY KEY (id),

    -- UNIQUE constraint required for composite FK from loan_cycles
    CONSTRAINT members_id_group_id_unique UNIQUE (id, group_id),

    CONSTRAINT members_group_id_fkey
        FOREIGN KEY (group_id) REFERENCES groups (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

COMMENT ON TABLE members IS 'Customer information for group finance members. Member count and amounts are computed from this table.';
COMMENT ON COLUMN members.joined_week IS 'The week number when member joined. Week 1 = start of group. Used for late joining calculations per Formula 6.';
COMMENT ON COLUMN members.phone_number IS 'Required per BR-008.';
COMMENT ON COLUMN members.address IS 'Required per BR-008.';
COMMENT ON COLUMN members.photo_url IS 'Optional per BR-008. Stored as URL (Supabase Storage).';
COMMENT ON COLUMN members.nominee IS 'Optional per BR-008.';
COMMENT ON COLUMN members.id_proof IS 'Optional per BR-008. Stored as URL or text reference.';


-- ============================================================
-- TABLE 4: loan_cycles
-- ============================================================
-- Purpose : Records each loan cycle for a member.
--           A member may have multiple loan cycles (group renewals).
--           New cycles preserve full financial history.
-- ============================================================

CREATE TABLE IF NOT EXISTS loan_cycles (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),

    member_id       UUID            NOT NULL,
    group_id        UUID            NOT NULL,
    scheme_id       UUID            NOT NULL,

    cycle_number    INTEGER         NOT NULL DEFAULT 1 CHECK (cycle_number >= 1),

    start_date      DATE,
    end_date        DATE,

    status          VARCHAR(20)     NOT NULL DEFAULT 'Active'
                        CHECK (status IN ('Active', 'Completed', 'Closed')),

    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT loan_cycles_pkey PRIMARY KEY (id),

    -- A member cannot have two active cycles with the same cycle number in the same group
    CONSTRAINT loan_cycles_member_cycle_unique
        UNIQUE (member_id, group_id, cycle_number),

    -- UNIQUE constraints required for downstream composite FKs
    CONSTRAINT loan_cycles_id_member_id_unique UNIQUE (id, member_id),
    CONSTRAINT loan_cycles_id_member_id_group_id_unique UNIQUE (id, member_id, group_id),

    -- Composite FK: Ensures member belongs to the specified group
    CONSTRAINT loan_cycles_member_group_fkey
        FOREIGN KEY (member_id, group_id) REFERENCES members (id, group_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT loan_cycles_scheme_id_fkey
        FOREIGN KEY (scheme_id) REFERENCES schemes (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

COMMENT ON TABLE loan_cycles IS 'Loan cycles per member. New cycle created per group renewal to preserve full financial history.';
COMMENT ON COLUMN loan_cycles.cycle_number IS 'Cycle 1 = initial loan, 2 = first renewal, etc.';
COMMENT ON COLUMN loan_cycles.scheme_id IS 'Denormalized for historical accuracy — preserves scheme config at time of cycle creation.';


-- ============================================================
-- TABLE 5: loan_transactions
-- ============================================================
-- Purpose : Records loan disbursement details.
--           One loan transaction per loan cycle (typically).
--           Cash flow: Cash Out.
-- ============================================================

CREATE TABLE IF NOT EXISTS loan_transactions (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),

    loan_cycle_id       UUID            NOT NULL,
    member_id           UUID            NOT NULL,

    loan_amount         NUMERIC(12, 2)  NOT NULL CHECK (loan_amount > 0),
    note_cost           NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (note_cost >= 0),
    cash_given          NUMERIC(12, 2)  NOT NULL,

    disbursement_date   DATE            NOT NULL DEFAULT CURRENT_DATE,

    remarks             TEXT,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT loan_transactions_pkey PRIMARY KEY (id),

    CONSTRAINT loan_transactions_cash_given_nonnegative_check
        CHECK (cash_given >= 0),

    CONSTRAINT loan_transactions_cash_given_formula_check
        CHECK (cash_given = loan_amount - note_cost),

    -- Composite FK: Ensures member belongs to the referenced loan cycle
    CONSTRAINT loan_transactions_cycle_member_fkey
        FOREIGN KEY (loan_cycle_id, member_id) REFERENCES loan_cycles (id, member_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

COMMENT ON TABLE loan_transactions IS 'Loan disbursement records. Cash flow: OUT. Immutable after creation per accounting rules.';
COMMENT ON COLUMN loan_transactions.cash_given IS 'Actual cash handed to member = loan_amount - note_cost. Per Formula 1. Computed by backend; stored for audit.';
COMMENT ON COLUMN loan_transactions.note_cost IS 'Business income deducted before disbursement. Per docs/04_ACCOUNTING_RULES.md Note Cost Deduction.';


-- ============================================================
-- TABLE 6: collectors
-- ============================================================
-- Purpose : Stores collectors responsible for weekly collections.
-- ============================================================

CREATE TABLE IF NOT EXISTS collectors (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),

    collector_name  VARCHAR(255)    NOT NULL,
    phone_number    VARCHAR(20),

    status          VARCHAR(20)     NOT NULL DEFAULT 'Active'
                        CHECK (status IN ('Active', 'Inactive')),

    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT collectors_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE collectors IS 'Collection agents. Version 1 has one (business owner). Architecture ready for multiple collectors.';


-- ============================================================
-- TABLE 7: collections
-- ============================================================
-- Purpose : Records every weekly installment payment.
--           Cash flow: Cash In.
-- ============================================================

CREATE TABLE IF NOT EXISTS collections (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),

    loan_cycle_id   UUID            NOT NULL,
    member_id       UUID            NOT NULL,
    group_id        UUID            NOT NULL,
    collector_id    UUID            NOT NULL,

    week_number     INTEGER         NOT NULL CHECK (week_number >= 1),
    payment_date    DATE            NOT NULL DEFAULT CURRENT_DATE,

    amount_paid     NUMERIC(12, 2)  NOT NULL CHECK (amount_paid > 0),

    payment_status  VARCHAR(20)     NOT NULL DEFAULT 'Paid'
                        CHECK (payment_status IN ('Paid', 'Pending', 'Partial', 'Waived')),

    remarks         TEXT,

    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT collections_pkey PRIMARY KEY (id),

    -- Composite FK: Ensures member and group belong to the referenced loan cycle
    CONSTRAINT collections_cycle_member_group_fkey
        FOREIGN KEY (loan_cycle_id, member_id, group_id) REFERENCES loan_cycles (id, member_id, group_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT collections_collector_id_fkey
        FOREIGN KEY (collector_id) REFERENCES collectors (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

COMMENT ON TABLE collections IS 'Weekly installment payment records. Cash flow: IN. Immutable after creation per accounting rules.';
COMMENT ON COLUMN collections.week_number IS 'The installment week number (1 to total_weeks). Per BR-017.';
COMMENT ON COLUMN collections.payment_status IS 'Paid = received. Pending = not yet received. Partial/Waived = future status values.';


-- ============================================================
-- TABLE 8: settings
-- ============================================================
-- Purpose : Application configuration (key-value store).
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),

    key         VARCHAR(100)    NOT NULL,
    value       TEXT,
    description TEXT,

    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT settings_pkey PRIMARY KEY (id),
    CONSTRAINT settings_key_unique UNIQUE (key)
);

COMMENT ON TABLE settings IS 'Application configuration store (key-value). Examples: business_name, currency, default_collector_id.';


-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_groups_group_name  ON groups (group_name);
CREATE INDEX IF NOT EXISTS idx_groups_location    ON groups (location);
CREATE INDEX IF NOT EXISTS idx_groups_status      ON groups (status);
CREATE INDEX IF NOT EXISTS idx_groups_scheme_id   ON groups (scheme_id);

CREATE INDEX IF NOT EXISTS idx_members_member_name   ON members (member_name);
CREATE INDEX IF NOT EXISTS idx_members_phone_number  ON members (phone_number);
CREATE INDEX IF NOT EXISTS idx_members_group_id      ON members (group_id);
CREATE INDEX IF NOT EXISTS idx_members_status        ON members (status);

CREATE INDEX IF NOT EXISTS idx_loan_cycles_member_id  ON loan_cycles (member_id);
CREATE INDEX IF NOT EXISTS idx_loan_cycles_group_id   ON loan_cycles (group_id);
CREATE INDEX IF NOT EXISTS idx_loan_cycles_status     ON loan_cycles (status);

CREATE INDEX IF NOT EXISTS idx_loan_transactions_disbursement_date  ON loan_transactions (disbursement_date);
CREATE INDEX IF NOT EXISTS idx_loan_transactions_member_id          ON loan_transactions (member_id);
CREATE INDEX IF NOT EXISTS idx_loan_transactions_loan_cycle_id      ON loan_transactions (loan_cycle_id);

CREATE INDEX IF NOT EXISTS idx_collections_payment_date   ON collections (payment_date);
CREATE INDEX IF NOT EXISTS idx_collections_week_number    ON collections (week_number);
CREATE INDEX IF NOT EXISTS idx_collections_member_id      ON collections (member_id);
CREATE INDEX IF NOT EXISTS idx_collections_collector_id   ON collections (collector_id);
CREATE INDEX IF NOT EXISTS idx_collections_group_id       ON collections (group_id);
CREATE INDEX IF NOT EXISTS idx_collections_loan_cycle_id  ON collections (loan_cycle_id);
CREATE INDEX IF NOT EXISTS idx_collections_payment_status ON collections (payment_status);


-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schemes_updated_at BEFORE UPDATE ON schemes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER loan_cycles_updated_at BEFORE UPDATE ON loan_cycles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER collectors_updated_at BEFORE UPDATE ON collectors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- FINANCIAL RECORD IMMUTABILITY TRIGGERS
-- ============================================================
-- Per docs/04_ACCOUNTING_RULES.md:
--   "Transactions must never be deleted."
--   "If a mistake occurs, correct using adjustment transactions."
-- Both UPDATE and DELETE are blocked on financial records.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_financial_record_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Financial records are immutable and cannot be deleted. Per docs/04_ACCOUNTING_RULES.md: correct mistakes using adjustment transactions.';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Financial records are immutable and cannot be updated. Per docs/04_ACCOUNTING_RULES.md: correct mistakes using adjustment transactions.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loan_transactions_immutable_update BEFORE UPDATE ON loan_transactions FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_mutation();
CREATE TRIGGER loan_transactions_immutable_delete BEFORE DELETE ON loan_transactions FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_mutation();

CREATE TRIGGER collections_immutable_update BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_mutation();
CREATE TRIGGER collections_immutable_delete BEFORE DELETE ON collections FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_mutation();


-- ============================================================
-- ROW LEVEL SECURITY (PLACEHOLDER)
-- ============================================================
-- RLS is NOT enabled in this migration.
--
-- Per task specification (Part 7):
--   "If authentication and final user roles are not yet defined,
--    DO NOT invent a complex authorization system."
--
-- When authentication is implemented in a future milestone, add:
--   ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY ... ON schemes ...;
--   (repeat for all tables)
--
-- The Supabase service role key used by the backend bypasses RLS,
-- so business operations will work correctly without RLS policies.


-- ============================================================
-- END OF MIGRATION 001
-- ============================================================
-- Tables created:
--   1. schemes          — Reusable financial configurations
--   2. groups           — Finance groups (Dynamic: member count, total amount)
--   3. members          — Customer information
--   4. loan_cycles      — Loan history (one per loan per renewal)
--   5. loan_transactions — Loan disbursement records (Cash Out)
--   6. collectors       — Collection agents
--   7. collections      — Weekly payment records (Cash In)
--   8. settings         — Application configuration
--
-- Calculated values NOT stored (per BR-004, 06_DATABASE_DESIGN.md):
--   - Member Count, Total Group Amount, Total Loan Disbursed,
--     Total Cash Given, Total Collections, Outstanding Amount,
--     Completion Percentage, Expected Profit, Current Cash Position
--
-- Next step for developer:
--   Review this file → supabase link --project-ref <ref> → supabase db push
-- ============================================================
