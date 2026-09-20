"""
VEL Finance — Business Week Unit Tests
======================================
Tests verifying business week calculation rules per 13_Accounting_Profit_Loan_Risk_Model_Specification.md:
- Week 1 begins on Sunday, 9 August 2026.
- Each business week runs Sunday to Saturday.
- Dates before 9 August 2026 return Week 1.
"""
from datetime import date
import pytest

from app.core.business_week import (
    BUSINESS_START_DATE,
    get_business_week,
    get_week_start_date,
    get_week_end_date,
    get_week_date_range,
)


def test_business_start_date():
    """Business start date must be Sunday, 9 August 2026."""
    assert BUSINESS_START_DATE == date(2026, 8, 9)
    # Sunday is weekday() == 6 in Python
    assert BUSINESS_START_DATE.weekday() == 6


def test_business_week_1():
    """9 August 2026 to 15 August 2026 must be Week 1."""
    assert get_business_week(date(2026, 8, 9)) == 1   # Sunday
    assert get_business_week(date(2026, 8, 10)) == 1  # Monday
    assert get_business_week(date(2026, 8, 12)) == 1  # Wednesday
    assert get_business_week(date(2026, 8, 15)) == 1  # Saturday


def test_business_week_2():
    """16 August 2026 to 22 August 2026 must be Week 2."""
    assert get_business_week(date(2026, 8, 16)) == 2  # Sunday
    assert get_business_week(date(2026, 8, 17)) == 2  # Monday
    assert get_business_week(date(2026, 8, 22)) == 2  # Saturday


def test_business_week_3():
    """23 August 2026 to 29 August 2026 must be Week 3."""
    assert get_business_week(date(2026, 8, 23)) == 3  # Sunday
    assert get_business_week(date(2026, 8, 29)) == 3  # Saturday


def test_dates_before_start_date():
    """Dates prior to 9 August 2026 default to Week 1."""
    assert get_business_week(date(2026, 8, 1)) == 1
    assert get_business_week(date(2025, 1, 1)) == 1


def test_week_start_and_end_dates():
    """get_week_start_date and get_week_end_date return correct Sunday-Saturday bounds."""
    # Week 1
    assert get_week_start_date(1) == date(2026, 8, 9)
    assert get_week_end_date(1) == date(2026, 8, 15)
    assert get_week_start_date(1).weekday() == 6  # Sunday
    assert get_week_end_date(1).weekday() == 5    # Saturday

    # Week 2
    assert get_week_start_date(2) == date(2026, 8, 16)
    assert get_week_end_date(2) == date(2026, 8, 22)

    # Week 5
    assert get_week_start_date(5) == date(2026, 9, 6)
    assert get_week_end_date(5) == date(2026, 9, 12)


def test_get_week_date_range():
    """get_week_date_range returns tuple of (Sunday, Saturday)."""
    start, end = get_week_date_range(4)
    assert start == date(2026, 8, 30)
    assert end == date(2026, 9, 5)
    assert (end - start).days == 6
