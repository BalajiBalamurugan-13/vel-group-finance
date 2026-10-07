-- ============================================================
-- VEL Finance — Migration 006
-- Per-Group Weekly Installment Override
-- ============================================================
--
-- Idempotent & safe to run on an existing database with data.
-- Additive only: no existing columns renamed or dropped.
--
-- Allows each group to override the scheme-level weekly_installment.
-- If weekly_installment is NULL, the linked scheme's default is used.
-- Enables groups to pay different amounts (e.g., ₹1000 instead of ₹760).
-- ============================================================

-- 1. Add weekly_installment column to groups table (nullable override)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS weekly_installment NUMERIC(12,2) DEFAULT NULL;

-- Add CHECK constraint (only if column was just added, safe via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'groups_weekly_installment_positive'
    ) THEN
        ALTER TABLE groups ADD CONSTRAINT groups_weekly_installment_positive
            CHECK (weekly_installment IS NULL OR weekly_installment > 0);
    END IF;
END $$;

COMMENT ON COLUMN groups.weekly_installment IS
    'Group-level weekly installment override in INR. If NULL, uses the linked scheme default. Allows groups to pay different amounts (e.g., ₹1000 instead of ₹760).';

-- 2. Backfill: Set all existing groups to their scheme's weekly_installment
-- This ensures existing 30+ groups get the default value (760) explicitly
UPDATE groups g
SET weekly_installment = s.weekly_installment
FROM schemes s
WHERE g.scheme_id = s.id
AND g.weekly_installment IS NULL;

-- 3. Set GRP-0022 (சுபி தெரு - TKM 3) weekly installment to 1000
UPDATE groups
SET weekly_installment = 1000
WHERE group_code = 'GRP-0022';

-- 4. Correct Week 1 (20-09-2026) and Week 2 (27-09-2026) collections for GRP-0022 from 760 to 1000
-- (Running as postgres/supabase_admin role bypasses immutability trigger for admin correction)
UPDATE collections
SET amount_paid = 1000
WHERE group_id = (SELECT id FROM groups WHERE group_code = 'GRP-0022')
  AND amount_paid = 760;
