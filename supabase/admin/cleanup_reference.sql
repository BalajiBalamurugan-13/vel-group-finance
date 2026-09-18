-- ============================================================
-- VEL Finance — Admin Cleanup Reference
-- ============================================================
-- PURPOSE:
--   This file documents the SAFE DELETION ORDER for business records
--   when you need to remove incorrect test data from Supabase.
--
-- REQUIREMENTS:
--   - You must be the postgres/supabase_admin role (Table Editor satisfies this).
--   - After migration 002, the immutability trigger allows postgres-role deletion.
--   - FK RESTRICT constraints mean you MUST delete children before parents.
--
-- FK DEPENDENCY ORDER (must delete in this sequence):
--   1. collections          (depends on: loan_cycles, members, groups, collectors)
--   2. loan_transactions    (depends on: loan_cycles, members)
--   3. loan_cycles          (depends on: members, groups, schemes)
--   4. members              (depends on: groups)
--   5. groups               (depends on: schemes)
--   6. schemes              (root — no dependencies)
--   7. collectors           (independent — but collections reference it, delete collections first)
--   8. settings             (standalone — delete anytime)
--
-- SAFE ADMIN USAGE:
--   Option A: Delete individual records one by one using Table Editor
--   Option B: Run SQL below using Supabase SQL Editor
--
-- ============================================================
-- QUICKSTART: Delete ALL records for a single member
-- ============================================================
-- Replace 'M-0001' with the actual member_code you want to remove.
-- Run each step in sequence.

-- Step 1: Find the member's UUID (needed for FK-based deletion)
-- SELECT id, member_code, member_name FROM members WHERE member_code = 'M-0001';

-- Step 2: Delete this member's collection records (must come first)
-- DELETE FROM collections WHERE member_id = (SELECT id FROM members WHERE member_code = 'M-0001');

-- Step 3: Delete this member's loan transaction records
-- DELETE FROM loan_transactions WHERE member_id = (SELECT id FROM members WHERE member_code = 'M-0001');

-- Step 4: Delete this member's loan cycles
-- DELETE FROM loan_cycles WHERE member_id = (SELECT id FROM members WHERE member_code = 'M-0001');

-- Step 5: Delete the member record
-- DELETE FROM members WHERE member_code = 'M-0001';

-- ============================================================
-- QUICKSTART: Delete a single collection record (receipt)
-- ============================================================
-- Replace 'RCP-0007' with the actual receipt_code.
-- DELETE FROM collections WHERE receipt_code = 'RCP-0007';

-- ============================================================
-- QUICKSTART: Delete ALL records for a group
-- ============================================================
-- Replace 'GRP-0001' with the actual group_code.
-- WARNING: This removes ALL members, cycles, transactions, collections in the group.

-- DELETE FROM collections   WHERE group_id = (SELECT id FROM groups WHERE group_code = 'GRP-0001');
-- DELETE FROM loan_transactions WHERE member_id IN (SELECT id FROM members WHERE group_id = (SELECT id FROM groups WHERE group_code = 'GRP-0001'));
-- DELETE FROM loan_cycles   WHERE group_id = (SELECT id FROM groups WHERE group_code = 'GRP-0001');
-- DELETE FROM members       WHERE group_id = (SELECT id FROM groups WHERE group_code = 'GRP-0001');
-- DELETE FROM groups        WHERE group_code = 'GRP-0001';

-- ============================================================
-- FULL RESET (development only — removes ALL business data)
-- ============================================================
-- Use when you want to start fresh without rebuilding the schema.
-- Run in this exact FK order and restart identity sequences:
--
-- Option 1: Run supabase/reset_dev_data_only.sql
--
-- Option 2: Step-by-step SQL:
-- DELETE FROM collections;
-- DELETE FROM loan_transactions;
-- DELETE FROM loan_cycles;
-- DELETE FROM members;
-- DELETE FROM groups;
-- DELETE FROM schemes;
-- DELETE FROM collectors;
--
-- RESTART IDENTITY SEQUENCES (so codes start from 0001 again):
-- ALTER TABLE collections       ALTER COLUMN receipt_seq     RESTART WITH 1;
-- ALTER TABLE loan_transactions ALTER COLUMN transaction_seq RESTART WITH 1;
-- ALTER TABLE loan_cycles       ALTER COLUMN cycle_seq       RESTART WITH 1;
-- ALTER TABLE members           ALTER COLUMN member_seq      RESTART WITH 1;
-- ALTER TABLE groups            ALTER COLUMN group_seq       RESTART WITH 1;
-- ALTER TABLE schemes           ALTER COLUMN scheme_seq      RESTART WITH 1;
-- ALTER TABLE collectors        ALTER COLUMN collector_seq   RESTART WITH 1;

-- ============================================================
-- READABLE ADMIN VIEWS (query these in Table Editor for easy lookup)
-- ============================================================
-- SELECT * FROM v_members_readable;
-- SELECT * FROM v_collections_readable ORDER BY receipt_code;
-- SELECT * FROM v_loan_transactions_readable ORDER BY transaction_code;

-- ============================================================
-- VERIFY DELETION WORKED (no orphaned records)
-- ============================================================
-- After deleting a member, verify no orphaned records remain:
-- SELECT COUNT(*) FROM collections    WHERE member_id NOT IN (SELECT id FROM members);
-- SELECT COUNT(*) FROM loan_transactions WHERE member_id NOT IN (SELECT id FROM members);
-- SELECT COUNT(*) FROM loan_cycles    WHERE member_id NOT IN (SELECT id FROM members);
-- All should return 0.
-- ============================================================
