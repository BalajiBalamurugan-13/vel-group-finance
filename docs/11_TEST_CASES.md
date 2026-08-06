# VEL Finance - Group Finance
## Test Cases

**Document Version:** 1.0
**Status:** Approved
**Author:** Balaji B & ChatGPT
**Last Updated:** August 2026

---

# Purpose

This document defines the business, functional, API, UI, accounting, and edge case test scenarios for the VEL Finance Group Finance application.

Every feature must be validated against these test cases before it is considered complete.

The purpose of this document is to ensure:

- Business logic correctness
- Accounting accuracy
- UI consistency
- API reliability
- Data integrity
- Future maintainability

---

# Testing Strategy

Every feature should be tested using the following categories.

- Business Test Cases
- Functional Test Cases
- Accounting Test Cases
- API Test Cases
- UI Test Cases
- Validation Test Cases
- Edge Cases
- Performance Tests

---

# Module 1 - Scheme Management

## TC-SCH-001

Scenario

Create a new scheme.

Expected Result

- Scheme created successfully.
- Scheme available while creating groups.

---

## TC-SCH-002

Scenario

Deactivate a scheme.

Expected Result

- Existing groups remain unaffected.
- Scheme unavailable for new groups.

---

## TC-SCH-003

Scenario

Attempt to create duplicate scheme.

Expected Result

Validation error displayed.

---

# Module 2 - Group Management

## TC-GRP-001

Scenario

Create a new group.

Expected Result

- Group created successfully.
- Group name auto-generated.
- Group status = Draft.

---

## TC-GRP-002

Scenario

Create group with invalid data.

Expected Result

Validation errors displayed.

---

## TC-GRP-003

Scenario

Activate group.

Expected Result

Group status changes to Active.

---

## TC-GRP-004

Scenario

Close group.

Expected Result

- Group becomes Closed.
- Historical data preserved.

---

## TC-GRP-005

Scenario

Renew completed group.

Expected Result

- New loan cycle created.
- Previous cycle remains unchanged.

---

# Module 3 - Member Management

## TC-MEM-001

Scenario

Add member to Draft group.

Expected Result

Member added successfully.

---

## TC-MEM-002

Scenario

Add member to Active group.

Expected Result

- Loan created.
- Loan transaction recorded.
- Group statistics updated.

---

## TC-MEM-003

Scenario

Late member joins in Week 5.

Expected Result

- Loan disbursed.
- Missed installments calculated.
- Current week's installment included.
- Immediate amount collected correctly.

---

## TC-MEM-004

Scenario

Search member.

Expected Result

Member returned instantly.

---

# Module 4 - Loan Management

## TC-LOAN-001

Scenario

Loan disbursement.

Expected Result

- Cash Given calculated.
- Note Cost deducted.
- Loan transaction created.

---

## TC-LOAN-002

Scenario

Verify Cash Given.

Expected Result

Cash Given = Loan Amount − Note Cost.

---

# Module 5 - Collections

## TC-COL-001

Scenario

Record weekly payment.

Expected Result

- Collection recorded.
- Outstanding updated.
- Dashboard updated.

---

## TC-COL-002

Scenario

Member misses one week.

Expected Result

Outstanding increases.

---

## TC-COL-003

Scenario

Member pays missed + current installment.

Expected Result

Outstanding reduced correctly.

---

## TC-COL-004

Scenario

Duplicate collection.

Expected Result

System prevents duplicate entry.

---

# Module 6 - Dashboard

## TC-DASH-001

Scenario

Open dashboard.

Expected Result

Dashboard loads successfully.

---

## TC-DASH-002

Scenario

Verify Today's Collection.

Expected Result

Matches collection transactions.

---

## TC-DASH-003

Scenario

Verify Pending Collections.

Expected Result

Pending values calculated correctly.

---

# Module 7 - Reports

## TC-REP-001

Scenario

Generate Group Report.

Expected Result

Correct data displayed.

---

## TC-REP-002

Scenario

Generate Member Ledger.

Expected Result

Collection history matches transactions.

---

## TC-REP-003

Scenario

Outstanding Report.

Expected Result

Outstanding values calculated correctly.

---

# Accounting Tests

## TC-ACC-001

Loan Disbursement

Verify

Cash Out recorded correctly.

---

## TC-ACC-002

Weekly Collection

Verify

Cash In recorded correctly.

---

## TC-ACC-003

Late Joining

Verify

Cash Out

+

Immediate Collection

recorded on same day.

---

## TC-ACC-004

Outstanding

Verify

Outstanding calculated dynamically.

---

# Formula Validation

Verify

- Cash Given
- Total Group Amount
- Outstanding
- Expected Profit
- Completion %
- Total Collections

All values must match the formulas defined in

05_BUSINESS_FORMULAS.md

---

# API Tests

Every API should verify

- Success Response
- Validation Errors
- Invalid UUID
- Missing Resource
- Unauthorized Access (Future)

---

# UI Tests

Verify

- Desktop Layout
- Tablet Layout
- Mobile Layout
- Adaptive Layout
- Loading State
- Empty State
- Error State

---

# Responsive Tests

Desktop

1920px

1440px

Laptop

1366px

Tablet

1024px

768px

Mobile

430px

390px

375px

320px

All layouts must remain usable.

---

# Browser Tests

- Chrome
- Edge
- Firefox
- Safari

---

# Performance Tests

Dashboard

< 2 Seconds

Group List

< 1 Second

Member Search

< 500 ms

Collection Save

< 2 Seconds

---

# Accessibility Tests

Verify

- Keyboard Navigation
- Screen Reader Labels
- Focus Indicators
- Color Contrast
- Touch Targets

---

# Regression Tests

Whenever a feature changes,

verify

- Dashboard
- Collections
- Reports
- Accounting
- Group Calculations

continue to work correctly.

---

# Future Tests

Future versions should include

- Customer Login
- Notifications
- Online Payments
- Multi Collector
- Multi Branch

---

END OF DOCUMENT