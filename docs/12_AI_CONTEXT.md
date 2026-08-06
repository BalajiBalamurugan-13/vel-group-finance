# VEL Finance - Group Finance
## AI Context

**Document Version:** 1.0
**Status:** Approved
**Author:** Balaji B & ChatGPT
**Last Updated:** August 2026

---

# Purpose

This document provides the minimum required context for any AI assistant working on the VEL Finance Group Finance project.

Before generating any code, reviewing any implementation, or suggesting architectural changes, the AI must understand this document.

This file acts as the project's onboarding guide for AI.

---

# Project Overview

VEL Finance - Group Finance is a standalone financial management application developed under the VEL Finance brand.

It is completely independent from the existing VEL Finance Daily Collection application.

Although both applications belong to the same business, they have different

- Business Logic
- Database
- APIs
- UI
- Accounting
- Workflows

Never assume logic from the Daily Collection application applies here.

---

# Product Vision

The goal is to build an enterprise-grade financial platform.

Version 1 targets internal business usage.

Future versions will support

- Customer Login
- Multiple Collectors
- Multiple Branches
- Notifications
- Analytics
- Online Payments
- Mobile Applications

The architecture must support future expansion without major redesign.

---

# Primary Users

## Office Staff

Primary Device

Desktop / Laptop

Responsibilities

- Create Groups
- Add Members
- Manage Schemes
- View Reports

Focus

Fast data entry.

---

## Business Owner / Collector

Primary Device

Mobile

Responsibilities

- Record Weekly Collections
- View Pending Collections
- Monitor Business

Focus

Speed and simplicity.

---

## Customer (Future)

Primary Device

Mobile

Responsibilities

- View Loan
- View Collections
- View Outstanding
- Download Digital Card

---

# Core Business Workflow

Scheme

↓

Group

↓

Members

↓

Loan Disbursement

↓

Weekly Collections

↓

Group Completion

↓

Renew OR Close

This workflow must never be violated.

---

# Business Principles

- Business rules come before technical implementation.
- Accounting accuracy is mandatory.
- Every financial transaction must be traceable.
- Historical records must never be deleted.
- Business decisions belong to the business owner.
- The application automates calculations but does not replace business judgment.

---

# Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

Libraries

- TanStack Query
- React Hook Form
- Zod
- Lucide React
- Framer Motion
- TanStack Table
- Recharts
- Day.js

---

## Backend

- FastAPI
- Python
- SQLAlchemy
- Pydantic
- Alembic

---

## Database

Supabase PostgreSQL

---

# Architecture Principles

- Configuration Driven
- Modular
- Reusable
- Mobile + Desktop Optimized
- Enterprise Ready
- Feature Based
- Clean Architecture

Business logic belongs in the backend.

Never duplicate business logic.

---

# Financial Principles

Never hardcode

- Loan Amount
- Weekly Installment
- Number of Weeks
- Note Cost

These values always come from the selected Scheme.

Every financial operation must be atomic.

If one financial operation fails,

the entire transaction must roll back.

---

# UI Philosophy

The application uses Adaptive Responsive Design.

Desktop

Optimized for Office Staff.

Mobile

Optimized for Collectors.

Future Customer Portal

Optimized for Customers.

Do not build identical layouts for every device.

Adapt the experience while maintaining a consistent design language.

---

# Design Principles

The UI should feel

- Professional
- Modern
- Trustworthy
- Clean
- Fast

Inspired by

- Stripe
- Linear
- Revolut Business
- Mercury
- Vercel

---

# AI Working Rules

Before generating any code,

read the relevant documentation.

Minimum required documents

- AI_CONTEXT.md
- DEVELOPMENT_RULES.md

Then include only the documents related to the requested feature.

Examples

Creating Dashboard

Read

- UI_UX_GUIDELINES.md
- DESIGN_SYSTEM.md
- API_SPECIFICATION.md

Creating Group Module

Read

- BUSINESS_REQUIREMENTS.md
- BUSINESS_RULES.md
- DATABASE_DESIGN.md
- API_SPECIFICATION.md

Creating Collections

Read

- ACCOUNTING_RULES.md
- BUSINESS_FORMULAS.md
- DATABASE_DESIGN.md
- API_SPECIFICATION.md

---

# AI Development Workflow

Every feature must follow this sequence.

1. Understand the business requirement.
2. Read the relevant documentation.
3. Design before coding.
4. Generate only the requested feature.
5. Do not modify unrelated files.
6. Follow the Design System.
7. Follow Development Rules.
8. Ensure business rules are preserved.
9. Review generated code before completion.

---

# AI Prompt Template

Every implementation request should contain

- Feature Name
- Objective
- Related Documentation
- Business Rules
- Acceptance Criteria
- Files Allowed To Modify
- Files Not Allowed To Modify
- Expected Output

Never ask AI to generate the entire application in one prompt.

Generate one feature at a time.

---

# Coding Standards

- Strict TypeScript
- Reusable Components
- Modular Architecture
- REST APIs
- Backend Calculations
- Mobile + Desktop Support
- Clean Code
- Strong Typing
- Validation on Frontend and Backend

---

# Documentation References

| Document | Purpose |
|----------|---------|
| 01_BUSINESS_REQUIREMENTS.md | Business Workflow |
| 02_BUSINESS_RULES.md | Mandatory Business Rules |
| 03_SCHEME_CONFIGURATION.md | Scheme Definitions |
| 04_ACCOUNTING_RULES.md | Accounting Logic |
| 05_BUSINESS_FORMULAS.md | Business Calculations |
| 06_DATABASE_DESIGN.md | Database Architecture |
| 07_API_SPECIFICATION.md | Backend API Contracts |
| 08_UI_UX_GUIDELINES.md | User Experience Standards |
| 09_DESIGN_SYSTEM.md | UI Component System |
| 10_DEVELOPMENT_RULES.md | Engineering Standards |
| 11_TEST_CASES.md | Validation & QA |

---

# Success Criteria

Every generated feature must

- Follow business rules
- Follow accounting rules
- Follow database architecture
- Follow API contracts
- Follow the Design System
- Be mobile and desktop optimized
- Be production ready
- Be maintainable
- Be scalable

---

# Important Instructions

Never assume business logic.

Never invent financial calculations.

Never hardcode configurable values.

Never delete historical financial records.

Always prioritize maintainability over shortcuts.

If any business requirement is unclear,

ask for clarification before generating code.

---

END OF DOCUMENT