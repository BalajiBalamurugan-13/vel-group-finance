# VEL Finance — Accounting & Profit Model

## 1. Purpose

This document captures the agreed business and accounting logic for the VEL Finance Group Finance application before implementation.

The main purpose is to correctly represent:

* Initial Investment
* Additional Investment
* Business growth through recycled collections
* Loan economics
* Contractual Profit
* Actual Collections
* Outstanding / overdue amounts
* Loan Loss for genuinely problematic loans
* Weekly business performance

Accounting correctness is more important than UI changes.

Do not invent accounting formulas or change existing accounting behavior without reviewing the business logic first.

---

# 2. Business Starting Point

VEL Finance started on:

**9 August 2026**

The amount put into the business on **9 August 2026** is the **Initial Investment**.

This is the starting capital of the business.

The first business week therefore starts on:

**Sunday, 9 August 2026**

---

# 3. Weekly Business Cycle

Customer collections are made on Sundays.

Therefore, the business should follow a Sunday-based weekly cycle.

Example:

| Week   | Sunday           |
| ------ | ---------------- |
| Week 1 | 9 August 2026    |
| Week 2 | 16 August 2026   |
| Week 3 | 23 August 2026   |
| Week 4 | 30 August 2026   |
| Week 5 | 6 September 2026 |

The relevant week should be determined from the date.

This weekly cycle should be used for the business growth and financial analysis.

---

# 4. Initial Investment

The investment made on **9 August 2026** is the Initial Investment.

It belongs to:

**Week 1**

The Initial Investment is the owner's starting money used to start the business.

It must be kept separate from:

* Customer collections
* Recycled business cash
* Profit
* Additional Investment

The application should show the Initial Investment separately.

---

# 5. Additional Investment

If the owner puts more money into the business after the starting investment, it is an **Additional Investment**.

For example:

```text
9 August 2026
Initial Investment

Later week
Additional Investment
```

The additional amount belongs to the date/week in which it was actually added.

It should not be treated as if it existed from the beginning.

The application should therefore be able to show:

* Initial Investment
* Additional Investment
* Date
* Week
* Total investment added over time

---

# 6. Recycled Collections Are Not Investment

Money collected from existing customers and then used to create new groups is **not Additional Investment**.

Example:

```text
Initial Investment
        ↓
Initial Groups
        ↓
Customer Collections
        ↓
Business Cash
        ↓
New Groups
```

The money used for the new groups came from the business's existing collections.

Therefore it is:

**Recycled Business Cash**

and not:

**Additional Investment**

This distinction is important for understanding how the business is growing.

---

# 7. Group Created Date

Every group should have a **Created Date**.

This is important because the group must be connected to the correct financial week.

Example:

| Group   | Created Date | Week   |
| ------- | ------------ | ------ |
| Group 1 | 9 Aug 2026   | Week 1 |
| Group 2 | 9 Aug 2026   | Week 1 |
| Group 3 | 23 Aug 2026  | Week 3 |
| Group 4 | 23 Aug 2026  | Week 3 |

The Created Date will allow the system to determine the relevant business week.

This is also needed to understand how the business expanded over time.

---

# 8. Group Funding Source

When groups are created, we should be able to identify where the money used to create the group came from.

The three relevant categories are:

### 1. Initial Investment

Groups created using the original money put into the business on 9 August.

### 2. Additional Investment

Groups created using money that the owner added later.

### 3. Recycled Collections

Groups created using money collected from existing customers and reused by the business.

These three categories should remain separate.

---

# 9. Group Capital Requirement

When calculating the money required to create a group, use the **full loan amount per customer**.

Current example:

```text
Loan Amount = ₹10,000 per customer
```

If a group has 10 members:

```text
10 × ₹10,000
= ₹1,00,000
```

Therefore, the capital required for the group is ₹1,00,000.

The internal ₹100 note/card calculation should not be used for this calculation.

---

# 10. Current Loan Model

The current loan example is:

* Loan Amount: ₹10,000
* Weekly Payment: ₹760
* Total Weeks: 18

Total contractual repayment:

```text
₹760 × 18
= ₹13,680
```

Therefore:

```text
Contractual Profit
= ₹13,680 − ₹10,000

= ₹3,680
```

This ₹3,680 is the contractual profit of the loan if the customer completes the agreed repayment schedule.

---

# 11. Dynamic Loan Amount

The current loan amount is ₹10,000, but the business may use different loan amounts in the future.

For example:

* ₹20,000
* ₹30,000
* Other amounts

Therefore, the Profit calculation must not be hard-coded to ₹10,000.

The calculation should use the actual loan amount and the applicable weekly repayment and tenure.

General calculation:

```text
Total Contractual Repayment
= Weekly Payment × Number of Weeks

Contractual Profit
= Total Contractual Repayment − Loan Amount
```

---

# 12. ₹100 Note/Card Amount

The ₹100 amount was calculated separately for audit/business understanding.

For the application:

* The customer loan amount remains ₹10,000 in the current example.
* The application should not focus on the ₹9,900 / ₹100 split.
* The ₹100 should not be added to Profit.
* The ₹100 should not be treated as customer income.

The application should focus on the agreed loan amount and repayment model.

This same principle should apply when different loan amounts are used.

---

# 13. Contractual Profit

Profit should not simply mean the amount of cash collected so far.

The business works based on the customer's agreed repayment schedule.

For the current example:

```text
Loan Amount = ₹10,000

₹760 × 18
= ₹13,680 contractual repayment

₹13,680 − ₹10,000
= ₹3,680 contractual profit
```

Therefore, the primary loan Profit calculation is based on the **contractual repayment**.

This should remain separate from actual cash collection.

---

# 14. Actual Collections

Actual Collections represent the money that customers have actually paid.

Example:

If the customer is expected to pay ₹760 but pays ₹760:

```text
Actual Collection = ₹760
```

If the customer does not pay:

```text
Actual Collection = ₹0
```

The missed amount remains outstanding/overdue.

---

# 15. Overdue Payments

A customer missing a payment does not automatically mean the business has suffered a loss.

Example:

```text
Week 1 missed = ₹760
Week 2 missed = ₹760
```

The customer is overdue by:

```text
₹1,520
```

The business will normally continue collection efforts.

If the customer pays the ₹1,520 in a later week, the money has been recovered.

Therefore:

**Overdue ≠ Loan Loss**

This distinction is very important because the business expects most temporarily missed payments to eventually be collected.

---

# 16. Collection Page

The Collections page should allow the business to identify:

* Customers who paid
* Customers who did not pay
* Amount expected
* Amount actually received
* Outstanding amount
* Overdue amount
* Customers who have missed multiple weeks

This is where normal collection mismatches should be visible.

A customer being overdue should not automatically affect the Profit calculation as a Loan Loss.

---

# 17. Loan Risk / Loan Loss

Loan Loss is intended for the **worst-case scenario**.

The business may have many groups and many customers.

For example:

* 30 groups
* Most groups/customers paying normally
* Some customers temporarily missing payments
* A small number of customers continuing to remain unpaid for a long period

The Loan Loss concept is intended for those genuinely problematic cases.

It is not intended for every missed payment.

---

# 18. Loan Risk Flow

The general concept is:

```text
Current
   ↓
Overdue
   ↓
At Risk
   ↓
Loan Loss
```

### Current

Customer is paying normally.

### Overdue

Customer has missed payment(s), but the business is still expecting to collect the money.

### At Risk

Customer has remained unpaid for a longer period and requires special attention.

### Loan Loss

The business determines that the relevant amount has become a genuine loss.

The exact method for deciding when a customer moves into the final Loan Loss category will be decided before implementation.

---

# 19. Separate Loan Risk / Loss Page

The Loan Risk/Loss situation should have a separate page rather than mixing everything into the normal Profit page.

The page should allow the business to see customers such as:

| Customer   | Group    | Weeks Overdue | Outstanding | Status    |
| ---------- | -------- | ------------: | ----------: | --------- |
| Customer A | Group 12 |             1 |        ₹760 | Overdue   |
| Customer B | Group 18 |             2 |      ₹1,520 | Overdue   |
| Customer C | Group 7  |             5 |      ₹3,800 | At Risk   |
| Customer D | Group 3  |             8 |      ₹6,080 | Loan Loss |

These are only examples of how the information can be displayed.

The important information is:

* Customer
* Group
* Outstanding amount
* Weeks overdue
* Last payment
* Risk status
* Loan Loss amount where applicable

---

# 20. Loan Loss and Profit

Normal overdue amounts should not automatically reduce the contractual Profit.

The business should be able to see:

### Contractual Profit

What the loans are expected to generate according to the agreed repayment schedules.

### Loan Loss

The amount that has actually been recognized as a problematic/unrecoverable loan amount.

This allows the business to understand both:

* The normal earning potential of the loan business
* The impact of genuinely problematic customers

---

# 21. Principal Recovery

Principal recovery can also be viewed separately.

For the current ₹10,000 loan:

```text
Week 13:

₹760 × 13
= ₹9,880
```

Remaining principal:

```text
₹10,000 − ₹9,880
= ₹120
```

During Week 14, ₹120 of the scheduled ₹760 completes recovery of the original ₹10,000 principal.

The remaining amount represents the contractual margin.

This is useful for understanding how the deployed loan capital is recovered.

It should remain separate from the main Contractual Profit calculation.

---

# 22. Weekly Investment and Business Growth

The business should be able to see how it grows week by week from the initial investment.

For example:

### Week 1 — 9 August

```text
Initial Investment
        ↓
Initial Groups
        ↓
Loan Capital Deployed
```

### Later Week

```text
Customer Collections
        ↓
Business Cash
        ↓
Reused for New Groups
```

### Later Additional Investment

```text
Additional Investment
        ↓
Additional Owner Capital
        ↓
Used for Business Growth
```

The application should distinguish these sources.

This will allow us to understand:

* How much owner money was initially invested
* How much additional owner money was added
* How many groups were created from that investment
* How many groups were subsequently created from recycled collections
* How much loan capital was deployed over time
* How the business expanded from the original investment

---

# 23. Weekly Financial Information

The weekly financial view should eventually allow us to see the important numbers for each Sunday-based business week.

Relevant information includes:

### Investment

* Initial Investment
* Additional Investment
* Total Owner Investment

### Business Growth

* Groups Created
* Members Added
* Loan Capital Deployed
* Funding Source

### Collections

* Expected Collection
* Actual Collection
* Outstanding
* Overdue

### Profit

* Contractual Profit
* Loan Loss where applicable

The exact UI can be finalized during implementation.

---

# 24. Capital vs Collections

Owner Investment and Customer Collections must remain separate.

For example:

```text
Initial Investment
= Owner Money
```

Whereas:

```text
Customer Collection
= Business-generated cash
```

If that collection is later used to create another group, it remains recycled business cash.

It does not become another owner investment.

---

# 25. Capital vs Profit

Owner Investment is not Profit.

For example:

```text
Owner adds ₹5,00,000
```

This does not mean:

```text
Profit = ₹5,00,000
```

It means:

```text
Owner Capital = ₹5,00,000
```

Profit comes from the economics of the loans and their contractual repayment.

---

# 26. Cash vs Profit

Cash movement and Profit should remain separate.

Customer collections represent actual cash received.

Contractual Profit represents the contractual economics of the loans.

Owner Investment represents money introduced by the owner.

Recycled Collections represent business cash being reused.

These should not be combined into one number and called Profit.

---

# 27. Historical Information

The system should preserve the history of:

* Investment dates
* Group Created Dates
* Loan creation
* Collections
* Overdue amounts
* Loan Risk
* Loan Loss

Historical records should not be deleted simply because a loan later becomes problematic.

The original loan and collection history should remain available.

---

# 28. Scalability

The model must work as the business grows.

Today:

```text
₹10,000 loan
```

Future:

```text
₹20,000
₹30,000
or other loan amounts
```

The same calculations should continue to work.

The business may also grow from a few groups to:

```text
20 groups
25 groups
30 groups
100+ groups
```

The system should continue to distinguish:

* Owner Investment
* Recycled Collections
* Loan Capital
* Contractual Profit
* Collections
* Overdue
* Loan Loss

---

# 29. Implementation Approach

Before implementation, the existing database and backend should be reviewed against this agreed business logic.

The implementation should be done carefully without unnecessary refactoring.

The order should be:

1. Review existing accounting/data structure.
2. Identify what already exists.
3. Identify only the missing pieces.
4. Implement backend/database changes where required.
5. Test the accounting calculations.
6. Implement the frontend views.
7. Manually verify the results.

Backend/database remains the source of truth for financial calculations.

The implementation should not change unrelated working features.

---

# 30. Important Business Rules

The following rules must be preserved:

1. **9 August 2026 is the business starting date.**
2. **9 August 2026 is Week 1.**
3. **Sunday is the beginning of each financial week.**
4. **The investment made on 9 August is Initial Investment.**
5. **Later owner money is Additional Investment.**
6. **Customer collections reused for new groups are Recycled Collections, not Investment.**
7. **Every group should have a Created Date.**
8. **Group creation should be associated with its financial week.**
9. **Group funding source should distinguish Initial Investment, Additional Investment, and Recycled Collections.**
10. **Current customer loan amount is ₹10,000.**
11. **Current weekly payment is ₹760.**
12. **Current tenure is 18 weeks.**
13. **Current contractual repayment is ₹13,680.**
14. **Current contractual loan Profit is ₹3,680.**
15. **Loan formulas must remain dynamic for future loan amounts and schemes.**
16. **The ₹100 internal audit calculation is not part of customer Profit.**
17. **Missed/overdue payments are not automatically Loan Loss.**
18. **Most overdue payments are expected to be recovered later.**
19. **Loan Loss is for genuinely problematic/worst-case loans.**
20. **Loan Risk/Loss should be visible separately from normal Collections.**
21. **Contractual Profit and actual cash collected must remain separate.**
22. **Owner Investment and Profit must remain separate.**
23. **Recycled Collections and Owner Investment must remain separate.**
24. **Do not invent accounting formulas or change existing accounting behavior without review.**
25. **Do not unnecessarily refactor working financial code.**

---

# 31. Final Business Model

The business model can be understood as:

```text
Owner Initial Investment
        ↓
Initial Groups
        ↓
Loans Given
        ↓
Customer Collections
        ↓
Business Cash
        ↓
New Groups Using Recycled Collections
        ↓
Further Business Growth
```

At the same time:

```text
Loan
   ↓
Contractual Repayment
   ↓
Contractual Profit
```

And for problematic customers:

```text
Customer
   ↓
Overdue
   ↓
Long-Term Risk
   ↓
Loan Loss if genuinely required
```

These are separate parts of the business and should remain separate in the application.

---

# 32. Final Check Before Implementation

Before starting implementation, we should verify only the remaining business decisions that have not yet been explicitly agreed.

The implementation should not make assumptions on behalf of the business.

If a required accounting rule is unclear, it should be asked and confirmed before coding.

Once the agreed rules are confirmed, implementation can begin.
