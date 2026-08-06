# VEL Finance - Group Finance
## Database Design

**Document Version:** 1.0
**Status:** Draft
**Author:** Balaji B & ChatGPT
**Last Updated:** August 2026

---

# Purpose

This document defines the database architecture for the VEL Finance Group Finance application.

The database is designed to:

- Maintain complete financial history
- Prevent duplicate or inconsistent data
- Support configurable business schemes
- Support future business expansion
- Preserve accounting accuracy
- Maintain full audit history

The application uses **PostgreSQL (Supabase)**.

---

# Database Design Principles

The database follows the following principles.

- Configuration-driven business logic
- No hardcoded financial values
- Historical data must never be lost
- Every financial transaction must be traceable
- No duplicated calculated values
- Soft delete wherever applicable
- Future-ready architecture

---

# High Level Entity Relationship

```
Schemes
    │
    ▼
Groups
    │
    ├──────────────┐
    ▼              ▼
Members       Loan Cycles
    │              │
    │              ▼
    │       Loan Transactions
    │
    ▼
Collections
    │
    ▼
Collectors

Settings
```

---

# Table 1 - schemes

## Purpose

Stores reusable financial schemes.

Every finance group must be created using a scheme.

---

## Columns

- id (UUID)
- scheme_name
- description
- loan_amount
- weekly_installment
- total_weeks
- note_cost
- status (Active / Inactive)
- created_at
- updated_at

---

## Relationships

One Scheme

↓

Many Groups

---

# Table 2 - groups

## Purpose

Represents one finance group.

Example

- PTM 1
- PTM 2
- TNK 1

---

## Columns

- id (UUID)
- scheme_id (FK)
- location
- group_name
- start_date
- status
- remarks
- created_at
- updated_at

---

## Status

- Draft
- Active
- Completed
- Renewed
- Closed

---

## Important Design Decision

The following values are **NOT STORED** inside this table.

- Member Count
- Total Group Amount

Reason:

Both values are calculated dynamically from active members.

This avoids inconsistent data.

---

# Table 3 - members

## Purpose

Stores customer information.

---

## Columns

- id (UUID)
- group_id (FK)
- member_name
- phone_number
- address
- photo_url
- nominee
- id_proof
- joined_week
- joined_date
- status
- remarks
- created_at
- updated_at

---

## Status

- Active
- Completed
- Closed

---

## Relationships

One Group

↓

Many Members

---

# Table 4 - loan_cycles

## Purpose

Stores every loan cycle of a member.

A member may receive multiple loans over time if the group is renewed.

Example

Cycle 1

₹10,000

↓

Cycle 2

₹20,000

↓

Cycle 3

₹50,000

Instead of replacing previous loans,

every new loan creates a new Loan Cycle.

This preserves complete financial history.

---

## Columns

- id (UUID)
- member_id (FK)
- group_id (FK)
- scheme_id (FK)
- cycle_number
- status
- start_date
- end_date
- created_at
- updated_at

---

## Relationships

One Member

↓

Many Loan Cycles

---

# Table 5 - loan_transactions

## Purpose

Stores loan disbursement details.

One loan transaction belongs to one Loan Cycle.

---

## Columns

- id (UUID)
- loan_cycle_id (FK)
- member_id (FK)
- loan_amount
- note_cost
- cash_given
- disbursement_date
- remarks
- created_at

---

## Cash Flow

Cash Out

---

# Table 6 - collectors

## Purpose

Stores collectors responsible for weekly collections.

Although Version 1 has only one collector (business owner),

the architecture supports multiple collectors.

---

## Columns

- id (UUID)
- collector_name
- phone_number
- status
- created_at
- updated_at

---

## Status

- Active
- Inactive

---

# Table 7 - collections

## Purpose

Stores every weekly installment collected.

---

## Columns

- id (UUID)
- loan_cycle_id (FK)
- member_id (FK)
- group_id (FK)
- collector_id (FK)
- week_number
- payment_date
- amount_paid
- payment_status
- remarks
- created_at

---

## Payment Status

- Paid
- Pending
- Partial (Future)
- Waived (Future)

---

## Cash Flow

Cash In

---

# Table 8 - settings

## Purpose

Stores application configuration.

Examples

- Business Name
- Currency
- Default Language
- Default Collector
- Application Preferences

---

# Calculated Values

The following values are **always calculated dynamically**.

They must never be stored inside the database.

- Current Member Count
- Total Group Amount
- Total Loan Disbursed
- Total Cash Given
- Total Collections
- Outstanding Amount
- Remaining Installments
- Completion Percentage
- Expected Profit
- Current Cash Position

---

# Foreign Key Relationships

```
schemes.id
        │
        ▼
groups.scheme_id

groups.id
        │
        ▼
members.group_id

members.id
        │
        ▼
loan_cycles.member_id

loan_cycles.id
        │
        ▼
loan_transactions.loan_cycle_id

loan_cycles.id
        │
        ▼
collections.loan_cycle_id

collectors.id
        │
        ▼
collections.collector_id
```

---

# Recommended Indexes

## groups

- group_name
- location
- status

---

## members

- member_name
- phone_number
- group_id

---

## loan_cycles

- member_id
- group_id
- status

---

## collections

- payment_date
- week_number
- member_id
- collector_id

---

## loan_transactions

- disbursement_date
- member_id

---

# Audit Fields

Every business table must contain

- created_at
- updated_at

Future Version

- created_by
- updated_by

---

# Soft Delete Strategy

Financial records must never be physically deleted.

Business entities should use

- status

or

- is_active

instead of DELETE operations.

This preserves complete accounting history.

---

# Data Integrity Rules

- Every Group belongs to one Scheme.
- Every Member belongs to one Group.
- Every Loan Cycle belongs to one Member.
- Every Loan Transaction belongs to one Loan Cycle.
- Every Collection belongs to one Loan Cycle.
- Every Collection belongs to one Collector.
- Loan Amount always comes from the selected Scheme.
- Weekly Installment always comes from the selected Scheme.
- Note Cost always comes from the selected Scheme.
- Calculated values must never be manually edited.
- Historical financial records must never be overwritten.

---

# Future Database Expansion

The architecture supports future tables without redesign.

Possible additions

- users
- roles
- permissions
- customer_accounts
- customer_login
- notifications
- expenses
- cashbook
- audit_logs
- attachments
- digital_cards
- payment_receipts

---

# Database Summary

| Table | Purpose |
|--------|---------|
| schemes | Reusable finance schemes |
| groups | Finance groups |
| members | Customer information |
| loan_cycles | Loan renewal history |
| loan_transactions | Loan disbursement records |
| collectors | Collection agents |
| collections | Weekly installment records |
| settings | Application configuration |

---

END OF DOCUMENT