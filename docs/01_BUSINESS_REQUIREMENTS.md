# VEL Finance - Group Finance
## Business Requirements Document (BRD)

**Version:** 1.0
**Status:** Draft
**Last Updated:** August 2026

---

# 1. Project Overview

VEL Finance - Group Finance is a standalone finance management application designed to manage group-based lending operations.

This application is completely independent of the existing VEL Finance Daily Loan application.

Although both businesses operate under the VEL Finance brand, their business workflows, accounting logic, database, and user interface are different.

The application is designed primarily for internal business operations and will later support customer login and self-service features.

---

# 2. Objectives

The application should help the business owner to:

- Create and manage finance groups
- Manage members inside each group
- Disburse loans
- Collect weekly installments
- Track outstanding payments
- View business reports
- Maintain accurate financial records
- Reduce manual bookkeeping

---

# 3. Users

### Primary User

Business Owner / Collector

(Currently Balaji's father)

Responsibilities

- Create groups
- Add members
- Disburse loans
- Collect weekly payments
- View reports
- Close or renew groups

---

### Future Users

Customers

Future capabilities may include:

- Login
- View payment history
- View remaining installments
- Download digital group card

(Not part of Version 1)

---

# 4. Business Workflow

The business follows this lifecycle.

Create Scheme

↓

Create Group

↓

Add Members

↓

Activate Group

↓

Disburse Loan

↓

Weekly Collections

↓

Complete Group

↓

Renew Group OR Close Group

---

# 5. Scheme

A Scheme defines the financial configuration used while creating a group.

Example

Scheme Name

10K Standard

Loan Per Member

₹10,000

Weeks

18

Weekly Installment

₹760

Note Cost

₹100

Schemes are reusable.

Future schemes may contain different loan amounts and installment values.

---

# 6. Groups

Groups are created based on business location.

Examples

PTM 1

PTM 2

TNK 1

TNK 2

The system should automatically suggest the next group number.

Example

Existing

PTM 1

PTM 2

Suggested

PTM 3

The user may change the suggested value if required.

---

# 7. Group Creation

During group creation the user provides:

- Location
- Scheme
- Group Name (auto suggested)
- Start Date

The system calculates

Loan Per Member

×

Current Member Count

=

Total Group Amount

The Total Group Amount should never be entered manually.

---

# 8. Members

Members belong to exactly one active group.

The business owner can add members after group creation.

Required Information

- Name
- Phone Number
- Address

Optional

- Photo
- ID Proof
- Nominee

---

# 9. Loan Disbursement

All members receive the loan on the same group start date.

For each member

Loan Amount

-

Note Cost

=

Cash Given

Example

Loan Amount

₹10,000

Note Cost

₹100

Cash Given

₹9,900

---

# 10. Weekly Collection

Collections happen every Sunday.

The collector visits members and records weekly payments.

Each scheme defines:

- Weekly Installment
- Total Weeks

Example

₹760

×

18 Weeks

---

# 11. Missed Payments

If a member misses one or more weeks,

they must pay

All missed installments

+

Current week's installment

There is currently no automatic penalty.

---

# 12. Joining an Existing Group

A new member may join an already active group.

When joining

The member:

Receives the configured loan amount.

Pays all missed installments up to the current week.

Example

Current Week

Week 5

Member joins

Immediate Collection

Week 1

+

Week 2

+

Week 3

+

Week 4

+

Week 5

After joining,

the member continues normal weekly payments.

The system automatically updates

Current Member Count

Total Group Amount

Outstanding

Reports

---

# 13. Group Completion

A group is considered completed after

all members complete all installments.

---

# 14. Group Renewal

Completed groups may receive a new loan cycle.

The decision depends on the business owner's approval.

Future cycles may contain larger loan amounts.

Example

₹10,000

↓

₹20,000

↓

₹50,000

↓

₹1,00,000

---

# 15. Group Closure

Groups may also be permanently closed.

Closure is a business decision.

The application should support closing a group while preserving historical records.

---

# 16. Dashboard

The dashboard should provide an overview of:

- Active Groups
- Total Members
- Today's Collection
- Pending Collections
- Collections by Location
- Cash Summary
- Weekly Collection Status

---

# 17. Reports

The application should generate reports for:

- Group-wise Collection
- Member Payment History
- Outstanding Payments
- Completed Groups
- Closed Groups
- Renewed Groups
- Cash Summary

---

# 18. Future Enhancements

Not part of Version 1

- Customer Login
- Digital Group Card
- WhatsApp Notifications
- Online Payments
- Analytics Dashboard
- Multi Collector Support

---

# 19. Core Business Principles

The application should automate calculations and maintain accurate financial records.

Business decisions remain under the control of the business owner.

The software assists decision-making but does not replace it.

---

END OF DOCUMENT