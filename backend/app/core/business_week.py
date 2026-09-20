"""
VEL Finance — Business Week Utility
====================================
Calculates business week cycles per 13_Accounting_Profit_Loan_Risk_Model_Specification.md.

Business Rules:
- Business started on: Sunday, 9 August 2026 (Week 1).
- Customer collections are made on Sundays.
- Each business week runs Sunday through Saturday:
    - Week 1: 2026-08-09 (Sun) to 2026-08-15 (Sat)
    - Week 2: 2026-08-16 (Sun) to 2026-08-22 (Sat)
    - Week 3: 2026-08-23 (Sun) to 2026-08-29 (Sat)
    - Week 4: 2026-08-30 (Sun) to 2026-09-05 (Sat)
    - Week 5: 2026-09-06 (Sun) to 2026-09-12 (Sat)
    - Week 6: 2026-09-13 (Sun) to 2026-09-19 (Sat)
    - Week 7: 2026-09-20 (Sun) to 2026-09-26 (Sat)
"""
from datetime import date, datetime, timedelta
from typing import Tuple, Union

# Single source of truth for business start date
BUSINESS_START_DATE: date = date(2026, 8, 9)


def get_business_week(target_date: Union[date, datetime, str]) -> int:
    """
    Returns the 1-indexed business week number for a given calendar date.
    Accepts date, datetime, or ISO date string.
    
    Dates before BUSINESS_START_DATE (2026-08-09) return 1 as the minimum baseline week.
    Sunday to Saturday forms one business week.
    """
    if isinstance(target_date, str):
        target_date = date.fromisoformat(target_date[:10])
    elif isinstance(target_date, datetime):
        target_date = target_date.date()

    if target_date < BUSINESS_START_DATE:
        return 1
    days_diff = (target_date - BUSINESS_START_DATE).days
    return (days_diff // 7) + 1


def get_week_start_date(week_number: int) -> date:
    """
    Returns the Sunday start date for a given business week number.
    Week 1 -> 2026-08-09
    Week 2 -> 2026-08-16
    """
    if week_number < 1:
        return BUSINESS_START_DATE
    return BUSINESS_START_DATE + timedelta(weeks=week_number - 1)


def get_week_end_date(week_number: int) -> date:
    """
    Returns the Saturday end date for a given business week number.
    Week 1 -> 2026-08-15
    Week 2 -> 2026-08-22
    """
    return get_week_start_date(week_number) + timedelta(days=6)


def get_week_date_range(week_number: int) -> Tuple[date, date]:
    """
    Returns (start_date, end_date) as (Sunday, Saturday) for the business week.
    """
    return get_week_start_date(week_number), get_week_end_date(week_number)


def get_current_business_week() -> int:
    """
    Returns the business week number for today's date.
    """
    return get_business_week(date.today())
