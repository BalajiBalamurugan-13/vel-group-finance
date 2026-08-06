# VEL Finance - Group Finance
## Scheme Configuration

**Document Version:** 1.0
**Status:** Draft
**Author:** Balaji B 
**Last Updated:** August 2026

---

# Purpose

This document defines how loan schemes are configured and managed within the VEL Finance Group Finance application.

A Scheme contains all financial parameters required to create finance groups.

The application must always use Scheme values instead of hardcoded values.

---

# What is a Scheme?

A Scheme is a reusable finance configuration.

Instead of manually entering loan details every time, the business owner selects a predefined scheme while creating a group.

Example

Scheme Name

10K Standard

Loan Per Member

₹10,000

Weekly Installment

₹760

Duration

18 Weeks

Note Cost

₹100

---

# Scheme Structure

Every Scheme contains the following information.

## Basic Information

- Scheme Name
- Description (Optional)
- Status (Active / Inactive)

---

## Financial Configuration

- Loan Amount Per Member
- Weekly Installment
- Number of Weeks
- Note Cost

---

## System Calculated Values

The following values are calculated automatically.

Cash Given

Loan Amount

-

Note Cost

Total Collection

Weekly Installment

×

Number of Weeks

Expected Profit

Total Collection

-

Loan Amount

---

# Scheme Usage

During Group Creation

Business Owner selects

↓

Scheme

↓

System loads

- Loan Amount
- Weekly Installment
- Weeks
- Note Cost

The user cannot manually change these values while creating the group.

---

# Multiple Schemes

The application must support multiple schemes.

Example

| Scheme | Loan | Weekly | Weeks | Note Cost |
|---------|------|---------|--------|-----------|
| 10K Standard | ₹10,000 | ₹760 | 18 | ₹100 |
| 20K Standard | Future | Future | Future | Future |
| 50K Standard | Future | Future | Future | Future |

---

# Scheme Status

Every scheme has one of the following statuses.

Active

Can be selected while creating groups.

Inactive

Cannot be selected for new groups.

Existing groups continue using the scheme originally assigned.

---

# Scheme Versioning

If financial values change,

a new Scheme should be created instead of modifying an existing one.

Example

10K Standard v1

↓

10K Standard v2

Existing groups continue using Version 1.

New groups use Version 2.

This preserves historical accuracy.

---

# Business Rules

- Scheme values cannot be hardcoded.
- Groups always inherit values from the selected Scheme.
- Changing a Scheme must not affect existing Groups.
- Every Group references exactly one Scheme.
- One Scheme can be used by multiple Groups.

---

# Future Scope

Future Scheme enhancements may include

- Processing Fee
- Insurance Amount
- Late Payment Charges
- Bonus Discount
- Custom Interest Models

These features are not part of Version 1.

---

END OF DOCUMENT