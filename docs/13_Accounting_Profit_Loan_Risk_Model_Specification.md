# VEL Finance — Accounting, Profit & Loan Risk Model Specification

**Status:** Draft for Review  
**Purpose:** Define the accounting/business rules before implementing Profit, Capital/Investment, Weekly Financial Analysis, and Loan Risk/Loss.

---

## 1. Core Principles

1. Accounting correctness is the highest priority.
2. The backend/database is the financial source of truth.
3. Frontend code must not invent financial formulas.
4. Existing accounting behavior must not be changed without review.
5. Normal overdue payments are **not** automatically loan losses.
6. Owner investment and recycled business cash are separate concepts.
7. Contractual Profit and actual cash collection are separate concepts.
8. Unresolved accounting decisions must be marked **TBD**, not invented during implementation.
9. Working financial code should not be unnecessarily refactored.

---

## 2. Current Loan Model

Current example:

- Loan amount: **₹10,000**
- Weekly installment: **₹760**
- Tenure: **18 weeks**
- Total contractual repayment: **₹13,680**

### Formula

```text
Total Contractual Repayment
= Weekly Installment × Total Weeks

= ₹760 × 18
= ₹13,680
```

### Contractual Profit

```text
Contractual Profit
= Total Contractual Repayment − Loan Principal

= ₹13,680 − ₹10,000
= ₹3,680
```

This represents the contractual economics of a successfully completed loan.

---

## 3. Dynamic Loan Model

The accounting engine must not hard-code:

- ₹10,000
- ₹760
- 18 weeks
- Any single future loan amount

The model must work dynamically from the applicable scheme/loan.

Generic model:

```text
Total Contractual Repayment
= Weekly Installment × Total Weeks

Contractual Profit
= Total Contractual Repayment − Loan Principal
```

It must support future loan amounts such as ₹20,000 or ₹30,000 and future scheme variations.

---

## 4. ₹100 Note/Card Cost — Scope Clarification

The ₹100 note/card amount was calculated separately for audit/business understanding.

For the application:

- The customer's loan amount remains the full loan amount.
- Do not expose a ₹9,900 / ₹100 split in the customer loan model.
- Do not add the ₹100 to Profit.
- Do not treat it as customer income.
- Do not give it separate Profit UI treatment.

This audit calculation should not become a core customer-facing accounting concept.

---

## 5. Capital / Investment

### Initial Investment

Initial Investment is owner capital introduced when VEL Finance started.

It must remain separate from:

- Customer collections
- Loan principal
- Profit

The system should support the investment amount and date/week.

### Additional Investment

Additional Investment is further owner money added after the initial investment.

Each addition should be identifiable by:

- Amount
- Date
- Week/period
- Investment type/source

Example:

```text
Initial Investment: ₹X

Additional Investment — Week N: ₹2,00,000

Additional Investment — Later Week: ₹1,00,000
```

### Recycled Collections

Customer collections reused to create new groups are **not additional investment**.

Example:

```text
Week 1:
Collections ≈ ₹50,000

Week 2:
That business cash is reused to create new groups.
```

This is recycled business cash.

The system must distinguish:

```text
Owner Capital
vs.
Recycled Business Cash
```

---

## 6. Group Growth & Capital Deployment

For group growth analysis, the system should eventually identify:

- Group
- Creation date/week
- Member count
- Loan amount per member
- Total loan capital deployed
- Funding source

Funding sources:

1. Initial Investment
2. Additional Investment
3. Recycled Collections

### Important Rule

Capital required to start a group is calculated using the **full loan amount**, not an internal audit split.

Example:

```text
10 members × ₹10,000
= ₹1,00,000 loan capital
```

---

## 7. Loan Economics

Each loan should have:

- Loan Principal
- Weekly Installment
- Total Weeks
- Total Contractual Repayment
- Contractual Profit

Generic model:

```text
Loan Principal = P
Weekly Installment = W
Total Weeks = N

Total Contractual Repayment = W × N

Contractual Profit = (W × N) − P
```

---

## 8. Contractual Profit vs Actual Cash

This distinction is mandatory.

### Contractual Profit

Contractual Profit is based on the customer's agreed repayment schedule.

For the current scheme:

```text
₹760 × 18 = ₹13,680

₹13,680 − ₹10,000 = ₹3,680 contractual profit
```

This does **not** mean ₹3,680 has already been received as cash when the loan is created.

### Actual Collection

Actual Collection is money actually received from customers.

Therefore:

```text
Contractual Profit ≠ Actual Cash Collected
```

Both must remain available as separate concepts.

---

## 9. Principal Recovery Analysis

Principal recovery can be shown as a separate management analysis.

For the current scheme:

```text
Week 13:
₹760 × 13 = ₹9,880

Remaining principal:
₹10,000 − ₹9,880 = ₹120
```

During Week 14, the first ₹120 completes recovery of the original ₹10,000 principal.

The remaining scheduled amount represents contractual margin.

This is a **capital-recovery analysis**, not a replacement for the primary Contractual Profit formula.

Future schemes must calculate this dynamically.

---

## 10. Collections

Collections should distinguish:

### Expected Collection
Amount contractually expected according to the schedule.

### Actual Collection
Amount actually received.

### Outstanding
Amount still due.

### Overdue
An amount that was due previously but has not yet been collected.

### Recovered Overdue
Previously overdue amount that is subsequently collected.

---

## 11. Overdue Payment Rule

A missed payment is **not automatically a Loan Loss**.

Example:

```text
Week 5 missed = ₹760
Week 6 missed = ₹760

Overdue = ₹1,520
```

If the customer pays ₹1,520 later, it is recovered normally.

It remains a collection/recovery issue, not a loss.

The business expects most temporary missed payments to eventually be collected.

---

# 12. Loan Risk / Loan Loss

Loan Loss is intended for the smaller number of genuinely problematic loans.

The risk flow should conceptually be:

```text
Current
   ↓
Overdue / Recovery
   ↓
At Risk
   ↓
Loss Recognized
```

### Current

Customer is paying normally.

### Overdue / Recovery

Customer has missed one or more payments but the business continues collection efforts.

**Not a loss.**

### At Risk

Customer has remained unpaid for a prolonged period and requires special attention.

At Risk does not automatically mean the money is lost.

### Loss Recognized

The business intentionally recognizes an amount as a Loan Loss after determining that the relevant amount is genuinely unrecoverable or should be treated as a loss under the approved business rule.

This must not happen merely because a customer missed a payment.

---

## 13. Loan Risk / Loss Page

A separate page should handle this scenario rather than mixing it into normal Profit.

The page should support:

- Overdue customers
- Total overdue amount
- At-risk customers
- Potential exposure
- Prolonged non-payment
- Recognized loan losses
- Customer/group/loan details
- Weeks overdue
- Last payment date
- Outstanding amount
- Risk status

Illustrative example:

| Customer | Group | Weeks Overdue | Outstanding | Status |
|---|---|---:|---:|---|
| Customer A | Group 12 | 1 | ₹760 | Recovery |
| Customer B | Group 18 | 2 | ₹1,520 | Recovery |
| Customer C | Group 7 | 5 | ₹3,800 | At Risk |
| Customer D | Group 3 | 8 | ₹6,080 | Potential Loss |

These are examples only.

---

## 14. Loss Recognition Rule — TBD

The exact rule for:

```text
Overdue / Recovery
→ At Risk
→ Loss Recognized
```

must be explicitly approved before implementation.

The application must not invent a rule such as:

- Loss after 2 weeks
- Loss after 4 weeks
- Loss after a fixed number of missed payments

unless the business approves it.

---

## 15. Profit and Loan Loss

Maintain these concepts separately:

### Contractual Profit

```text
Total Contractual Repayment − Loan Principal
```

### Recognized Loan Loss

Amount intentionally recognized as unrecoverable.

### Adjusted Profit

Management-level conceptual view:

```text
Adjusted Profit
= Contractual Profit − Recognized Loan Loss
```

This allows problematic loans to be reflected without treating ordinary overdue payments as losses.

Exact reporting treatment remains subject to the final loss-recognition rule.

---

## 16. Weekly Financial View

The system should eventually support weekly analysis.

### Capital

- Initial Investment
- Additional Investment
- Total Owner Capital

### Deployment

- Groups Created
- Members Added
- Loan Capital Deployed
- Funding Source

### Collections

- Expected Collection
- Actual Collection
- Outstanding
- Overdue
- Recovered Overdue

### Profitability

- Contractual Profit
- Recognized Loan Loss
- Adjusted Profit

### Risk

- Overdue Customers
- At-Risk Customers
- Potential Exposure
- Recognized Loss

Capital movement must not be confused with Profit.

---

## 17. Cash vs Profit

Cash movement and Profit remain separate.

Conceptually:

```text
Opening Business Cash
+ Owner Investments
+ Customer Collections
− Loan Disbursements
− Other Approved Business Cash Expenses
= Available Business Cash
```

The existing cash calculation must be reviewed against this model before any change.

No existing cash formula should be silently replaced during Profit implementation.

---

## 18. Financial Data Integrity

The implementation should preserve traceability:

```text
Customer
→ Group
→ Loan Cycle
→ Loan Transaction
→ Collection
→ Risk/Loss Status
```

Where a Loan Loss is recognized, the system should be able to identify:

- Customer
- Group
- Loan
- Relevant outstanding amount
- Amount recognized as loss
- Recognition date
- Status/action
- Optional business reason/note

Recognizing a loss must not erase collection history.

---

## 19. Historical Data Protection

Loss recognition must not:

- Delete the loan
- Delete collections
- Change the original loan amount
- Rewrite historical payment records

A loss should be represented as a separate status/event/financial record according to the final implementation design.

---

## 20. Scalability

The model must work for:

- A few groups
- 20–30 groups
- Hundreds of customers
- Multiple schemes
- Different loan amounts
- Different installments
- Different tenures

No accounting formula should depend on one fixed loan amount or one fixed weekly installment.

---

## 21. Implementation Scope

### Phase 1 — Accounting/Data Review

Before coding:

- Review current database schema
- Review existing backend services
- Identify reusable fields
- Identify missing fields/tables
- Identify existing formulas that conflict with this model
- Identify cash-accounting implications

**No code changes during this phase.**

### Phase 2 — Backend Accounting Model

Implement only approved accounting logic.

Backend/database remains the source of truth.

### Phase 3 — Backend Testing

Test:

- Loan calculations
- Contractual Profit
- Investment tracking
- Group deployment
- Collection behavior
- Overdue behavior
- Risk status
- Loan Loss
- Weekly aggregation

### Phase 4 — Frontend

After backend verification:

- Profit page
- Capital/Investment section
- Weekly financial view
- Loan Risk/Loss page

### Phase 5 — Manual Verification

The user manually tests the application in the browser.

Implementation agents should not be instructed to open browser tabs or perform visual browser testing on the user's behalf.

---

## 22. Non-Negotiable Rules

1. Do not invent accounting formulas.
2. Do not change existing accounting behavior without review.
3. Do not treat overdue payments as automatic losses.
4. Do not treat recycled collections as owner investment.
5. Do not treat the ₹100 audit calculation as customer profit.
6. Do not hard-code ₹10,000, ₹760, or 18 weeks into the accounting engine.
7. Do not mix contractual Profit with actual cash collection.
8. Do not delete or rewrite historical financial records.
9. Do not make frontend-only financial calculations that contradict backend data.
10. Do not unnecessarily refactor working financial code.
11. Do not implement unresolved accounting decisions by assumption.
12. Every financial change must be testable and traceable.

---

## 23. Current Approved Example

```text
Customer Loan Principal: ₹10,000
Weekly Installment: ₹760
Total Weeks: 18

Contractual Repayment:
₹760 × 18 = ₹13,680

Contractual Profit:
₹13,680 − ₹10,000 = ₹3,680
```

Temporary missed payments remain overdue/recovery amounts until recovered or formally recognized as Loan Loss.

The ₹100 note/card calculation is excluded from the customer-facing Profit model.

---

## 24. Final Accounting Philosophy

VEL Finance should answer four separate questions:

### 1. How much owner money have we put into the business?
**Capital / Investment**

### 2. What should our loans generate if customers fulfill their agreements?
**Contractual Profit**

### 3. How much money has actually been collected?
**Collections / Cash**

### 4. Which loans have become genuinely problematic?
**Loan Risk / Loan Loss**

The overall business flow is:

**Capital → Deployment → Contractual Economics → Collections → Risk → Loss**

These concepts must remain separate.

---

## 25. Approval Gate Before Coding

This specification must be reviewed and approved before implementation begins.

Any unresolved accounting rule must remain marked **TBD** and be discussed before code is written.

Once approved, this document becomes the baseline reference for:

- Profit
- Capital/Investment
- Weekly Financial Analysis
- Loan Risk/Loss

implementation in VEL Finance.
