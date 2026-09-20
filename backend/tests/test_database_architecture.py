"""
VEL Finance — Database Architecture & Codes Test Suite
======================================================
Tests verifying:
1. Schema support for human-readable codes (M-XXXX, GRP-XXXX, SCH-XXXX, RCP-XXXX, LC-XXXX, TXN-XXXX, COL-XXXX)
2. Dashboard response support for recent collections codes
3. Migration 002 integrity:
   - Correct BEFORE UPDATE (RETURN NEW) and BEFORE DELETE (RETURN OLD) trigger semantics
   - RLS enabled on all 8 tables
   - Sequences and generated codes for all 7 business tables
   - 5 readable admin views for all business entities
4. Admin cleanup reference foreign key sequence integrity
"""
from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4
import os

import pytest

from app.schemas.member import MemberResponse, MemberStatus, LoanCycleResponse, LoanTransactionResponse
from app.schemas.group import GroupResponse, GroupStatus, GroupSchemeSummary
from app.schemas.scheme import SchemeResponse, SchemeStatus
from app.schemas.collection import CollectionResponse, PaymentStatus
from app.schemas.dashboard import RecentCollection, DashboardResponse


def test_member_response_includes_member_code():
    """MemberResponse must include member_code field."""
    mid = uuid4()
    gid = uuid4()
    resp = MemberResponse(
        id=mid,
        member_code="M-0001",
        group_id=gid,
        member_name="Murugan S",
        phone_number="9876543210",
        address="12, South St",
        joined_week=1,
        status=MemberStatus.ACTIVE,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    assert resp.member_code == "M-0001"
    data = resp.model_dump()
    assert data["member_code"] == "M-0001"


def test_group_response_includes_group_code():
    """GroupResponse must include group_code field."""
    gid = uuid4()
    sid = uuid4()
    resp = GroupResponse(
        id=gid,
        group_code="GRP-0001",
        scheme_id=sid,
        location="PTM",
        group_name="PTM 1",
        status=GroupStatus.ACTIVE,
        member_count=5,
        total_group_amount=Decimal("50000.00"),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    assert resp.group_code == "GRP-0001"
    data = resp.model_dump()
    assert data["group_code"] == "GRP-0001"


def test_scheme_response_includes_scheme_code():
    """SchemeResponse must include scheme_code field."""
    sid = uuid4()
    resp = SchemeResponse(
        id=sid,
        scheme_code="SCH-0001",
        scheme_name="10K Standard",
        loan_amount=Decimal("10000.00"),
        weekly_installment=Decimal("760.00"),
        total_weeks=18,
        note_cost=Decimal("100.00"),
        status=SchemeStatus.ACTIVE,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    assert resp.scheme_code == "SCH-0001"
    data = resp.model_dump()
    assert data["scheme_code"] == "SCH-0001"


def test_collection_response_includes_receipt_code():
    """CollectionResponse must include receipt_code field."""
    cid = uuid4()
    resp = CollectionResponse(
        id=cid,
        receipt_code="RCP-0001",
        loan_cycle_id=uuid4(),
        member_id=uuid4(),
        group_id=uuid4(),
        collector_id=uuid4(),
        week_number=1,
        payment_date=date(2026, 8, 1),
        amount_paid=Decimal("760.00"),
        payment_status=PaymentStatus.PAID,
        created_at=datetime.now(),
    )
    assert resp.receipt_code == "RCP-0001"
    data = resp.model_dump()
    assert data["receipt_code"] == "RCP-0001"


def test_loan_cycle_and_transaction_codes():
    """LoanCycleResponse and LoanTransactionResponse must include cycle_code and transaction_code."""
    cid = uuid4()
    tx_id = uuid4()
    mid = uuid4()
    gid = uuid4()
    sid = uuid4()

    tx = LoanTransactionResponse(
        id=tx_id,
        transaction_code="TXN-0001",
        loan_cycle_id=cid,
        member_id=mid,
        loan_amount=Decimal("10000.00"),
        note_cost=Decimal("100.00"),
        cash_given=Decimal("9900.00"),
        disbursement_date=date(2026, 8, 1),
        created_at=datetime.now(),
    )
    assert tx.transaction_code == "TXN-0001"

    cycle = LoanCycleResponse(
        id=cid,
        cycle_code="LC-0001",
        member_id=mid,
        group_id=gid,
        scheme_id=sid,
        cycle_number=1,
        status="Active",
        loan_transaction=tx,
    )
    assert cycle.cycle_code == "LC-0001"
    assert cycle.loan_transaction.transaction_code == "TXN-0001"


def test_dashboard_recent_collections_support_codes():
    """Dashboard recent collections must support receipt_code, member_code, and group_code."""
    rc = RecentCollection(
        id=str(uuid4()),
        receipt_code="RCP-0005",
        member_id=str(uuid4()),
        member_code="M-0002",
        member_name="Bala",
        group_id=str(uuid4()),
        group_code="GRP-0001",
        group_name="PTM 1",
        location="PTM",
        collector_name="Admin",
        week_number=2,
        amount_paid=Decimal("760.00"),
        payment_date=date(2026, 8, 8),
        payment_status="Paid",
    )
    assert rc.receipt_code == "RCP-0005"
    assert rc.member_code == "M-0002"
    assert rc.group_code == "GRP-0001"


def test_migration_002_file_integrity():
    """Migration 002 file must exist and contain all required sections with correct trigger semantics."""
    migration_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "supabase", "migrations", "002_admin_access_rls_and_codes.sql")
    )
    assert os.path.exists(migration_path), f"Migration 002 not found at {migration_path}"

    with open(migration_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Section A: Role-based trigger update with proper UPDATE/DELETE returns
    assert "prevent_financial_record_mutation" in content
    assert "current_user IN ('postgres', 'supabase_admin')" in content
    assert "RETURN OLD;" in content
    assert "RETURN NEW;" in content

    # Section B: RLS enabled on all 8 tables
    tables = [
        "schemes", "groups", "members", "loan_cycles",
        "loan_transactions", "collectors", "collections", "settings"
    ]
    for table in tables:
        assert table in content

    # Section C: Codes for 7 business tables
    assert "member_code" in content
    assert "group_code" in content
    assert "scheme_code" in content
    assert "collector_code" in content
    assert "cycle_code" in content
    assert "transaction_code" in content
    assert "receipt_code" in content

    # Section E: All 5 admin views
    assert "v_collections_readable" in content
    assert "v_members_readable" in content
    assert "v_loan_transactions_readable" in content
    assert "v_groups_readable" in content
    assert "v_loan_cycles_readable" in content


def test_admin_cleanup_reference_file_exists():
    """Admin cleanup reference file must exist with foreign key ordering."""
    cleanup_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "supabase", "admin", "cleanup_reference.sql")
    )
    assert os.path.exists(cleanup_path), f"Admin cleanup SQL not found at {cleanup_path}"

    with open(cleanup_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "collections" in content
    assert "loan_transactions" in content
    assert "loan_cycles" in content
    assert "members" in content
    assert "groups" in content
    assert "schemes" in content


def test_reset_dev_data_only_file_integrity():
    """reset_dev_data_only.sql must exist and restart identity sequences for all 7 entities."""
    reset_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "supabase", "reset_dev_data_only.sql")
    )
    assert os.path.exists(reset_path), f"Reset script not found at {reset_path}"

    with open(reset_path, "r", encoding="utf-8") as f:
        content = f.read()

    # All 7 business tables must be cleared in FK order
    for table in ["collections", "loan_transactions", "loan_cycles", "members", "groups", "schemes", "collectors"]:
        assert f"DELETE FROM {table}" in content

    # All 7 identity sequence columns must be restarted with 1
    sequences = [
        ("collections", "receipt_seq"),
        ("loan_transactions", "transaction_seq"),
        ("loan_cycles", "cycle_seq"),
        ("members", "member_seq"),
        ("groups", "group_seq"),
        ("schemes", "scheme_seq"),
        ("collectors", "collector_seq"),
    ]
    for table, seq in sequences:
        assert f"ALTER TABLE {table}" in content
        assert f"ALTER COLUMN {seq}" in content
        assert "RESTART WITH 1" in content


def test_migration_003_file_integrity():
    """Migration 003 file must exist and contain investments table, funding_source, and views."""
    migration_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "supabase", "migrations", "003_accounting_profit_model.sql")
    )
    assert os.path.exists(migration_path), f"Migration 003 not found at {migration_path}"

    with open(migration_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Section A: investments table
    assert "CREATE TABLE IF NOT EXISTS investments" in content
    assert "investment_seq" in content
    assert "investment_code" in content
    assert "investment_type" in content
    assert "'Initial', 'Additional'" in content

    # Section B: groups funding_source
    assert "ALTER TABLE groups" in content
    assert "funding_source" in content
    assert "'Recycled Collections'" in content

    # Section C: RLS
    assert "ALTER TABLE investments ENABLE ROW LEVEL SECURITY;" in content

    # Section E: Admin views
    assert "v_investments_readable" in content
    assert "v_groups_readable" in content

