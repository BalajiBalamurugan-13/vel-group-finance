"""
VEL Finance — Development Database Seeder
=========================================
Development-only script to seed a clean, deterministic test dataset into the
connected Supabase development database using production services and business rules.

SAFETY GUARD:
- Blocked from running if APP_ENV == "production".
- Does not modify or bypass database immutability triggers.

USAGE:
    cd backend
    python scripts/seed_dev_data.py
"""

import sys
import os
from datetime import date, timedelta
from decimal import Decimal

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import get_settings
from app.db.supabase import get_supabase_client
from app.schemas.scheme import SchemeCreate
from app.schemas.group import GroupCreate, GroupStatus, GroupStatusUpdate
from app.schemas.member import MemberCreate
from app.schemas.collection import CollectionCreate
from app.services.scheme_service import SchemeService
from app.services.group_service import GroupService
from app.services.member_service import MemberService
from app.services.collection_service import CollectionService


def run_seed():
    settings = get_settings()
    if settings.APP_ENV.lower() == "production":
        print("ERROR: Refusing to run dev seeder in production environment.")
        sys.exit(1)

    print(f"Connecting to Supabase at: {settings.SUPABASE_URL}")
    db = get_supabase_client()

    scheme_service = SchemeService(db)
    group_service = GroupService(db)
    member_service = MemberService(db)
    collection_service = CollectionService(db)

    print("\n--- Seeding Development Test Data ---")

    # 1. Scheme
    print("1. Creating Scheme (10K Standard)...")
    existing_schemes = scheme_service.get_schemes()
    scheme = next((s for s in existing_schemes if s["scheme_name"] == "10K Standard"), None)
    if not scheme:
        scheme = scheme_service.create_scheme(
            SchemeCreate(
                scheme_name="10K Standard",
                description="Standard 10,000 INR loan scheme over 18 weeks",
                loan_amount=Decimal("10000.00"),
                weekly_installment=Decimal("760.00"),
                total_weeks=18,
                note_cost=Decimal("100.00"),
            )
        )
    print(f"   ✓ Scheme ready: {scheme['scheme_name']} (ID: {scheme['id']})")

    # 2. Active Group (PTM 1)
    print("2. Creating/Verifying Active Group (PTM 1)...")
    existing_groups = group_service.get_groups()
    ptm_group = next((g for g in existing_groups if g["group_name"] == "PTM 1"), None)
    if not ptm_group:
        ptm_group = group_service.create_group(
            GroupCreate(
                scheme_id=scheme["id"],
                location="PTM",
                start_date=date.today() - timedelta(days=14),
                remarks="Primary active group",
            )
        )
        if ptm_group["status"] == "Draft":
            ptm_group = group_service.update_group_status(
                ptm_group["id"], GroupStatusUpdate(status=GroupStatus.ACTIVE)
            )
    print(f"   ✓ Active Group ready: {ptm_group['group_name']} (ID: {ptm_group['id']})")

    # 3. Draft Group (TNK 1)
    print("3. Creating/Verifying Draft Group (TNK 1)...")
    tnk_group = next((g for g in existing_groups if g["group_name"] == "TNK 1"), None)
    if not tnk_group:
        tnk_group = group_service.create_group(
            GroupCreate(
                scheme_id=scheme["id"],
                location="TNK",
                remarks="Draft group for member-blocking testing",
            )
        )
    print(f"   ✓ Draft Group ready: {tnk_group['group_name']} (ID: {tnk_group['id']}, Status: {tnk_group['status']})")

    # 4. Members in PTM 1
    print("4. Creating/Verifying Active Members in PTM 1...")
    existing_members = member_service.get_members(group_id=ptm_group["id"])
    
    # Member 1: Murugan S
    m1 = next((m for m in existing_members if m["member_name"] == "Murugan S"), None)
    if not m1:
        m1 = member_service.create_member(
            MemberCreate(
                group_id=ptm_group["id"],
                member_name="Murugan S",
                phone_number="9876543210",
                address="12, South Street, PTM",
                nominee="Lakshmi M",
                joined_date=date.today() - timedelta(days=14),
            )
        )
    print(f"   ✓ Member 1: {m1['member_name']} (Joined Week {m1.get('joined_week', 1)})")

    # Member 2: Lakshmi M
    m2 = next((m for m in existing_members if m["member_name"] == "Lakshmi M"), None)
    if not m2:
        m2 = member_service.create_member(
            MemberCreate(
                group_id=ptm_group["id"],
                member_name="Lakshmi M",
                phone_number="9876543211",
                address="14, South Street, PTM",
                nominee="Murugan S",
                joined_date=date.today() - timedelta(days=14),
            )
        )
    print(f"   ✓ Member 2: {m2['member_name']} (Joined Week {m2.get('joined_week', 1)})")

    # Member 3: Ramesh K (Late Joiner with shared phone number)
    m3 = next((m for m in existing_members if m["member_name"] == "Ramesh K"), None)
    if not m3:
        m3 = member_service.create_member(
            MemberCreate(
                group_id=ptm_group["id"],
                member_name="Ramesh K",
                phone_number="9876543210",
                address="12, South Street, PTM",
                nominee="Murugan S",
                joined_date=date.today() - timedelta(days=7),
            )
        )
    print(f"   ✓ Member 3 (Late Joiner): {m3['member_name']} (Joined Week {m3.get('joined_week', 2)})")

    # 5. Collections
    print("5. Recording Initial Collections...")
    # Murugan S: Week 1 & Week 2
    try:
        collection_service.record_collection(
            CollectionCreate(
                member_id=m1["id"],
                week_number=1,
                amount_paid=Decimal("760.00"),
                payment_date=date.today() - timedelta(days=7),
                remarks="Historical Week 1 payment",
            )
        )
        print("   ✓ Murugan S Week 1 payment recorded")
    except Exception as e:
        print(f"   - Murugan S Week 1: {e}")

    try:
        collection_service.record_collection(
            CollectionCreate(
                member_id=m1["id"],
                week_number=2,
                amount_paid=Decimal("760.00"),
                payment_date=date.today(),
                remarks="Today's Week 2 payment",
            )
        )
        print("   ✓ Murugan S Week 2 payment recorded")
    except Exception as e:
        print(f"   - Murugan S Week 2: {e}")

    # Lakshmi M: Week 1
    try:
        collection_service.record_collection(
            CollectionCreate(
                member_id=m2["id"],
                week_number=1,
                amount_paid=Decimal("760.00"),
                payment_date=date.today() - timedelta(days=7),
                remarks="Historical Week 1 payment",
            )
        )
        print("   ✓ Lakshmi M Week 1 payment recorded")
    except Exception as e:
        print(f"   - Lakshmi M Week 1: {e}")

    print("\n✓ Seed completed successfully!")
    print("Test environment is ready with Draft group, Active group, Active members, and Collections.")


if __name__ == "__main__":
    run_seed()
