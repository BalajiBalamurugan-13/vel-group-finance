# VEL Finance - Group Finance
## Business Formulas

**Document Version:** 1.0
**Status:** Draft
**Author:** Balaji B & ChatGPT
**Last Updated:** August 2026

---

# Purpose

This document defines all business calculations used within the VEL Finance Group Finance application.

Every calculation performed by the application must follow these formulas.

Business values must never be hardcoded in the application.

---

# Formula 1 - Cash Given to Member

Purpose

Calculate the actual cash handed over to the customer after deducting the Note Cost.

Formula

Cash Given

=

Loan Amount

−

Note Cost

Example

Loan Amount

₹10,000

Note Cost

₹100

Cash Given

₹9,900

---

# Formula 2 - Total Group Amount

Purpose

Calculate the total loan value of a group.

Formula

Total Group Amount

=

Loan Amount Per Member

×

Current Number of Members

Example

Loan Per Member

₹10,000

Members

6

Total Group Amount

₹60,000

---

# Formula 3 - Total Expected Collection Per Member

Purpose

Calculate the total amount expected from one member during the complete scheme.

Formula

Total Expected Collection

=

Weekly Installment

×

Number of Weeks

Example

Weekly Installment

₹760

Weeks

18

Total Collection

₹13,680

---

# Formula 4 - Expected Profit Per Member

Purpose

Calculate the expected profit generated from one member.

Formula

Expected Profit

=

Total Expected Collection

−

Loan Amount

Example

Total Collection

₹13,680

Loan Amount

₹10,000

Expected Profit

₹3,680

---

# Formula 5 - Current Outstanding Per Member

Purpose

Calculate the remaining amount to be collected from a member.

Formula

Outstanding

=

Remaining Installments

×

Weekly Installment

Example

Remaining Weeks

10

Weekly Installment

₹760

Outstanding

₹7,600

---

# Formula 6 - Immediate Collection for Late Joining

Purpose

Calculate how much a newly joined member must pay immediately.

Formula

Immediate Collection

=

(Current Week Number)

×

Weekly Installment

Example

Current Week

5

Weekly Installment

₹760

Immediate Collection

₹3,800

The member continues regular weekly payments from the next week.

---

# Formula 7 - Remaining Installments

Purpose

Calculate the remaining number of installments.

Formula

Remaining Installments

=

Total Weeks

−

Weeks Paid

Example

Total Weeks

18

Weeks Paid

8

Remaining

10

---

# Formula 8 - Collection Completion Percentage

Purpose

Calculate the payment completion percentage of a member.

Formula

Completion %

=

(Weeks Paid ÷ Total Weeks)

×

100

Example

Weeks Paid

9

Total Weeks

18

Completion

50%

---

# Formula 9 - Group Collection Percentage

Purpose

Calculate the overall collection progress of a group.

Formula

Group Collection %

=

(Total Amount Collected ÷ Total Expected Group Collection)

×

100

---

# Formula 10 - Total Expected Group Collection

Purpose

Calculate the total amount expected from an entire group.

Formula

Total Expected Group Collection

=

Total Expected Collection Per Member

×

Current Number of Members

Example

Members

6

Expected Collection Per Member

₹13,680

Expected Group Collection

₹82,080

---

# Formula 11 - Current Cash Position

Purpose

Calculate available business cash.

Formula

Current Cash

=

Total Cash In

−

Total Cash Out

Where

Cash In

=

Weekly Collections

Cash Out

=

Loan Disbursements

---

# Formula 12 - Group Member Count

Purpose

Determine the current number of members.

Formula

Current Members

=

Number of Active Members in the Group

Whenever a new member joins,

the value increases automatically.

---

# Formula 13 - Weeks Paid

Purpose

Calculate completed installments.

Formula

Weeks Paid

=

Number of Successful Weekly Payments

Partial or failed payments are not counted.

---

# Formula 14 - Missed Installments

Purpose

Calculate the number of unpaid weeks.

Formula

Missed Installments

=

Current Week Number

−

Weeks Paid

---

# Formula 15 - Amount Due Today

Purpose

Calculate the amount that must be collected today.

Formula

Amount Due Today

=

(Missed Installments + Current Week)

×

Weekly Installment

Example

Current Week

5

Weeks Paid

3

Missed Installments

2

Weekly Installment

₹760

Amount Due Today

₹2,280

(Weeks 4 + 5 = ₹1,520)

If joining late in Week 5 without previous payments,

Amount Due Today

=

5 × ₹760

=

₹3,800

---

# Formula 16 - Group Total Loan Disbursed

Purpose

Calculate total loans issued within a group.

Formula

Total Loan Disbursed

=

Loan Amount Per Member

×

Current Number of Members

---

# Formula 17 - Total Cash Disbursed

Purpose

Calculate actual cash handed over to members.

Formula

Total Cash Disbursed

=

Cash Given Per Member

×

Current Number of Members

---

# Formula 18 - Total Note Cost Collected

Purpose

Calculate total note cost collected from a group.

Formula

Total Note Cost

=

Note Cost

×

Current Number of Members

---

# Formula 19 - Group Remaining Outstanding

Purpose

Calculate the total outstanding amount for an entire group.

Formula

Group Outstanding

=

Sum of Outstanding Amounts of All Active Members

---

# Formula 20 - Collection Efficiency

Purpose

Measure how efficiently collections are being completed.

Formula

Collection Efficiency

=

(Total Amount Collected ÷ Total Amount Due)

×

100

---

# Notes

1. All formulas are configuration-driven.
2. Loan Amount, Weekly Installment, Weeks, and Note Cost always come from the selected Scheme.
3. No formula should use hardcoded business values.
4. Any future financial product must extend this document before implementation.

---

END OF DOCUMENT