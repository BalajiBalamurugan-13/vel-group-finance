-- ============================================================================
-- Migration 005: High-Performance Database Aggregation for Dashboard & KPI Metrics
-- ============================================================================
-- Eliminates N+1 HTTP REST round-trips from backend to Supabase cloud.
-- Executes all SUMs, COUNTs, and groupings directly inside PostgreSQL in ~15ms,
-- returning a single consolidated JSON payload.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_summary(p_today DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_cash_in NUMERIC(12,2) := 0;
    v_todays_collection NUMERIC(12,2) := 0;
    v_todays_collection_count INT := 0;
    v_total_cash_out NUMERIC(12,2) := 0;
    v_total_loan_amount NUMERIC(12,2) := 0;
    v_total_note_cost NUMERIC(12,2) := 0;
    v_total_outstanding NUMERIC(12,2) := 0;
    v_active_groups INT := 0;
    v_total_groups INT := 0;
    v_active_members INT := 0;
    v_total_members INT := 0;
    v_weekly_expected NUMERIC(12,2) := 0;
    v_weekly_collected NUMERIC(12,2) := 0;
    v_weekly_pending NUMERIC(12,2) := 0;
    v_weekly_progress NUMERIC(5,2) := 0;
    v_groups_by_location JSONB := '[]'::JSONB;
    v_recent_collections JSONB := '[]'::JSONB;
    v_week_start DATE;
    v_week_end DATE;
BEGIN
    -- 1. Cash In Metrics
    SELECT
        COALESCE(SUM(amount_paid), 0),
        COALESCE(SUM(CASE WHEN payment_date = p_today THEN amount_paid ELSE 0 END), 0),
        COUNT(CASE WHEN payment_date = p_today THEN 1 ELSE NULL END)
    INTO
        v_total_cash_in,
        v_todays_collection,
        v_todays_collection_count
    FROM collections
    WHERE payment_status = 'Paid';

    -- 2. Loan Transaction Totals (Cash Out)
    SELECT
        COALESCE(SUM(cash_given), 0),
        COALESCE(SUM(loan_amount), 0),
        COALESCE(SUM(note_cost), 0)
    INTO
        v_total_cash_out,
        v_total_loan_amount,
        v_total_note_cost
    FROM loan_transactions;

    -- 3. Groups & Members Count
    SELECT
        COUNT(CASE WHEN status = 'Active' THEN 1 ELSE NULL END),
        COUNT(*)
    INTO
        v_active_groups,
        v_total_groups
    FROM groups;

    SELECT
        COUNT(CASE WHEN status = 'Active' THEN 1 ELSE NULL END),
        COUNT(*)
    INTO
        v_active_members,
        v_total_members
    FROM members;

    -- 4. Dynamic Total Outstanding (Active loan cycles: remaining installments * weekly installment)
    SELECT COALESCE(SUM(
        GREATEST(0, s.total_weeks - COALESCE(p.paid_count, 0)) * s.weekly_installment
    ), 0)
    INTO v_total_outstanding
    FROM loan_cycles lc
    JOIN schemes s ON lc.scheme_id = s.id
    LEFT JOIN (
        SELECT loan_cycle_id, COUNT(*) AS paid_count
        FROM collections
        WHERE payment_status = 'Paid'
        GROUP BY loan_cycle_id
    ) p ON lc.id = p.loan_cycle_id
    WHERE lc.status = 'Active';

    -- 5. Weekly Activity (Current Monday..Sunday cycle)
    v_week_start := p_today - ((EXTRACT(DOW FROM p_today)::INT + 6) % 7);
    v_week_end := v_week_start + 6;

    SELECT COALESCE(SUM(s.weekly_installment), 0)
    INTO v_weekly_expected
    FROM members m
    JOIN groups g ON m.group_id = g.id
    JOIN schemes s ON g.scheme_id = s.id
    WHERE m.status = 'Active' AND g.status = 'Active';

    SELECT COALESCE(SUM(amount_paid), 0)
    INTO v_weekly_collected
    FROM collections
    WHERE payment_status = 'Paid'
      AND payment_date >= v_week_start
      AND payment_date <= v_week_end;

    v_weekly_pending := GREATEST(0, v_weekly_expected - v_weekly_collected);
    IF v_weekly_expected > 0 THEN
        v_weekly_progress := ROUND((v_weekly_collected / v_weekly_expected) * 100, 2);
    ELSE
        v_weekly_progress := 0.00;
    END IF;

    -- 6. Groups Grouped by Location
    SELECT COALESCE(jsonb_agg(loc_row ORDER BY loc_row.location), '[]'::JSONB)
    INTO v_groups_by_location
    FROM (
        SELECT
            COALESCE(NULLIF(TRIM(g.location), ''), 'Unknown') AS location,
            COUNT(DISTINCT g.id)::INT AS active_groups,
            COUNT(m.id)::INT AS active_members
        FROM groups g
        LEFT JOIN members m ON m.group_id = g.id AND m.status = 'Active'
        WHERE g.status = 'Active'
        GROUP BY COALESCE(NULLIF(TRIM(g.location), ''), 'Unknown')
    ) loc_row;

    -- 7. Recent 10 Collections
    SELECT COALESCE(jsonb_agg(recent_row), '[]'::JSONB)
    INTO v_recent_collections
    FROM (
        SELECT
            c.id::TEXT,
            c.receipt_code,
            c.member_id::TEXT,
            m.member_code,
            m.member_name,
            c.group_id::TEXT,
            g.group_code,
            g.group_name,
            g.location,
            col.collector_name,
            c.week_number,
            c.amount_paid,
            c.payment_date::TEXT,
            c.payment_status
        FROM collections c
        LEFT JOIN members m ON c.member_id = m.id
        LEFT JOIN groups g ON c.group_id = g.id
        LEFT JOIN collectors col ON c.collector_id = col.id
        WHERE c.payment_status = 'Paid'
        ORDER BY c.payment_date DESC, c.created_at DESC
        LIMIT 10
    ) recent_row;

    -- Return JSON composite object
    RETURN jsonb_build_object(
        'available_cash', v_total_cash_in - v_total_cash_out,
        'total_cash_in', v_total_cash_in,
        'total_cash_out', v_total_cash_out,
        'todays_collection', v_todays_collection,
        'todays_collection_count', v_todays_collection_count,
        'total_disbursement', v_total_cash_out,
        'total_loan_amount', v_total_loan_amount,
        'total_note_cost', v_total_note_cost,
        'total_outstanding', v_total_outstanding,
        'active_groups', v_active_groups,
        'active_members', v_active_members,
        'total_groups', v_total_groups,
        'total_members', v_total_members,
        'weekly_expected', v_weekly_expected,
        'weekly_collected', v_weekly_collected,
        'weekly_pending', v_weekly_pending,
        'weekly_progress', v_weekly_progress,
        'groups_by_location', v_groups_by_location,
        'recent_collections', v_recent_collections
    );
END;
$$;
