# VEL Finance - Group Finance
## Business Rules

**Document Version:** 1.0
**Status:** Draft
**Author:** Balaji B 
**Last Updated:** August 2026

---

# Purpose

This document defines all mandatory business rules for the VEL Finance Group Finance application.

Every module in the application must comply with these rules unless explicitly approved by the business owner.

---

# Group Rules

## BR-001

A group belongs to one business location.

Examples

- PTM
- TNK
- ABC

---

## BR-002

Every group name consists of

Location + Running Number

Example

PTM 1

PTM 2

PTM 3

The system should automatically suggest the next available group number.

---

## BR-003

A group is created using one predefined scheme.

A scheme determines

- Loan Amount Per Member
- Weekly Installment
- Number of Weeks
- Note Cost

---

## BR-004

The Total Group Amount is always calculated by the system.

Formula

Total Group Amount

=

Loan Per Member

×

Current Number of Members

Manual editing is not allowed.

---

## BR-005

Groups may contain any number of members.

There is no fixed minimum or maximum enforced by the application.

The business owner decides the group size.

---

## BR-006

Groups remain editable even after becoming active.

Members may be added later if approved by the business owner.

---

# Member Rules

## BR-007

A member belongs to only one active group.

---

## BR-008

Required member information

- Name
- Phone Number
- Address

Optional

- Photo
- Nominee
- ID Proof

---

## BR-009

A member receives the loan immediately after being added to an active group.

---

## BR-010

When a new member is added to an active group,

the application shall automatically

- Increase Member Count
- Recalculate Total Group Amount
- Update reports
- Update dashboard statistics

---

# Loan Rules

## BR-011

Loan Amount is determined by the selected scheme.

---

## BR-012

Cash Given

=

Loan Amount

−

Note Cost

---

## BR-013

The application shall never allow manual editing of Cash Given.

It is always system calculated.

---

# Weekly Collection Rules

## BR-014

Weekly collections happen every Sunday.

---

## BR-015

Weekly installment amount is defined by the selected scheme.

---

## BR-016

The number of installments is defined by the selected scheme.

---

## BR-017

Each payment must be recorded with

- Date
- Week Number
- Amount Paid
- Collector
- Payment Status

---

# Missed Payment Rules

## BR-018

If a member misses one or more weeks,

the application shall calculate

Missed Installments

+

Current Week Installment

---

## BR-019

There is no automatic penalty calculation.

Any penalty is a manual business decision.

---

# Late Joining Rules

## BR-020

New members may join an already active group.

---

## BR-021

When joining,

the member receives the configured loan amount.

---

## BR-022

The member must pay every missed installment from Week 1 up to the current week.

---

## BR-023

The application automatically calculates

Immediate Collection

=

Missed Installments

+

Current Week Installment

---

## BR-024

After joining,

the member continues the remaining weekly payments normally.

---

# Group Lifecycle Rules

## BR-025

A group starts in Draft status.

---

## BR-026

A group becomes Active once loan disbursement begins.

---

## BR-027

A group becomes Completed only after all members complete every installment.

---

## BR-028

Completed groups may be renewed.

Renewal is a business decision.

---

## BR-029

Groups may be permanently closed.

Closing a group shall never delete historical data.

---

# Dashboard Rules

## BR-030

Dashboard shall display

- Active Groups
- Active Members
- Today's Collection
- Pending Collections
- Collections by Location
- Cash Summary

---

# Reporting Rules

## BR-031

Reports shall always be generated from transaction history.

Calculated values should never be stored separately.

---

## BR-032

Historical reports shall remain unchanged after group closure.

---

# Business Authority Rules

## BR-033

Business decisions belong to the business owner.

The application shall provide calculations and recommendations.

The final decision always belongs to the business owner.

Examples

- Add member
- Renew group
- Close group
- Select scheme
- Increase loan amount

---

# Data Integrity Rules

## BR-034

System calculated values cannot be manually edited.

Examples

- Total Group Amount
- Cash Given
- Outstanding
- Remaining Installments

---

## BR-035

Business rules must never be hardcoded.

Loan configuration must always come from the selected scheme.

---

# Future Rules

## BR-036

Future versions may support

- Customer Login
- Online Payments
- Multiple Collectors
- Digital Collection Card

These features must not affect existing business rules.

---

# Open Questions

The following items require future discussion.

- Can members leave a group before completion?
- Should note cost differ between schemes?
- Can a scheme be edited after groups already use it?
- Should group reopening be allowed after closure?

---

END OF DOCUMENT