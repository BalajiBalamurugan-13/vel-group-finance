# VEL Finance - Group Finance
## Accounting Rules

**Document Version:** 1.0
**Status:** Draft
**Author:** Balaji B 
**Last Updated:** August 2026

---

# Purpose

This document defines how every financial transaction is recorded and calculated within the VEL Finance Group Finance application.

The objective is to ensure that every rupee entering or leaving the business is properly recorded, traceable, and reflected accurately in reports.

---

# Accounting Principles

The application follows a simple cash-based accounting model.

Every financial activity must generate one or more accounting transactions.

Transactions must never be deleted.

If a mistake occurs, it should be corrected using adjustment transactions instead of deleting historical records.

---

# Transaction Types

The application supports the following financial transaction types.

## 1. Loan Disbursement

Money given to a member.

Cash Flow

Cash Out

Recorded When

A member receives the loan.

---

## 2. Weekly Collection

Weekly installment collected from a member.

Cash Flow

Cash In

Recorded When

Collector receives payment.

---

## 3. Note Cost Deduction

Note Cost is deducted before loan disbursement.

This amount is recorded as business income.

Example

Loan Amount

₹10,000

Note Cost

₹100

Cash Given

₹9,900

Accounting Entry

Cash Out

₹9,900

Income

₹100

---

## 4. Manual Adjustment

Used only for correcting accounting mistakes.

Requires business owner approval.

---

# Loan Disbursement Rules

Whenever a member receives a loan,

the application shall record

Loan Amount

Note Cost

Cash Given

Loan Date

Group

Member

Collector

Example

Loan Amount

₹10,000

Note Cost

₹100

Cash Given

₹9,900

Accounting

Cash Out

₹9,900

---

# Weekly Collection Rules

Every successful payment records

Collection Date

Week Number

Member

Group

Collected Amount

Collector

Payment Status

Cash Flow

Cash In

---

# Late Joining Accounting

When a new member joins an active group,

the application performs two accounting actions.

## Loan

Cash Out

Cash Given

## Collection

Cash In

All missed installments

+

Current Week installment

Both transactions occur on the joining date.

---

# Missed Payment Rules

No accounting transaction is created when a member misses a payment.

Instead,

the installment remains outstanding.

Once payment is received,

the application records the complete collected amount.

---

# Outstanding Calculation

Outstanding is calculated dynamically.

Outstanding

=

Remaining Installments

×

Weekly Installment

Outstanding values must never be manually edited.

---

# Cash Summary

Cash Summary is calculated using transaction history.

Cash In

=

Total Weekly Collections

Cash Out

=

Total Loan Disbursements

Current Cash Position

=

Cash In

−

Cash Out

---

# Profit Recognition

For Version 1,

Expected Profit

=

Total Collection

−

Loan Amount

Note Cost is recognized immediately during loan disbursement.

Future versions may include more advanced accounting if required.

---

# Group Accounting

Every group maintains

Total Members

Total Loan Amount

Total Collected

Outstanding

Completion Percentage

These values are calculated automatically.

---

# Member Accounting

Every member maintains

Loan Amount

Cash Given

Weeks Paid

Remaining Weeks

Outstanding

Total Collected

Current Status

---

# Transaction History

Every financial transaction must include

- Transaction ID
- Transaction Type
- Date & Time
- Group
- Member
- Collector
- Amount
- Remarks (Optional)

Transaction history must remain permanent.

No transaction should be deleted.

---

# Reporting Rules

All reports must be generated from transaction history.

Examples

- Daily Collection Report
- Weekly Collection Report
- Group Summary
- Member Ledger
- Cash Summary
- Outstanding Report

No report should rely on manually entered totals.

---

# Audit Rules

The application must preserve financial history.

If corrections are required,

the application should create adjustment entries instead of deleting records.

This ensures complete auditability.

---

# Future Accounting Scope

Future versions may include

- Expense Tracking
- Bank Account Management
- Cashbook
- Profit & Loss Statement
- Balance Sheet
- Multiple Collectors
- Daily Closing Report

These are not part of Version 1.

---

END OF DOCUMENT