# VEL Finance - Group Finance
## Development Rules

**Document Version:** 1.0
**Status:** Draft
**Author:** Balaji B & ChatGPT
**Last Updated:** August 2026

---

# Purpose

This document defines the engineering standards, architecture principles, coding guidelines, and AI development workflow for the VEL Finance Group Finance application.

Every developer and AI coding assistant must follow this document.

---

# Development Philosophy

The application is designed to be

- Enterprise Ready
- Scalable
- Maintainable
- Secure
- Modular
- Configuration Driven
- Mobile First

The objective is to build a production-quality financial application rather than a prototype.

---

# Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

Libraries

- React Router
- TanStack Query
- React Hook Form
- Zod
- Lucide React
- Framer Motion
- Day.js
- TanStack Table
- Recharts

---

## Backend

- FastAPI
- Python

Libraries

- SQLAlchemy
- Pydantic
- Alembic
- Supabase PostgreSQL

---

## Database

- PostgreSQL (Supabase)

---

# Project Architecture

Frontend

```
src/

app/

components/

features/

hooks/

layouts/

pages/

routes/

services/

types/

utils/

```

Backend

```
app/

api/

core/

db/

models/

schemas/

services/

repositories/

utils/

middleware/

```

Every module should have a clear responsibility.

---

# Architecture Principles

## Single Responsibility

Every component, service, and function should have one responsibility.

---

## Separation of Concerns

UI

↓

API

↓

Business Logic

↓

Database

Each layer should be independent.

---

## Configuration Driven

Business values must never be hardcoded.

Examples

- Loan Amount
- Weekly Installment
- Note Cost
- Weeks

must always come from the selected Scheme.

---

## Reusability

Reusable components should always be preferred.

Never duplicate

- Buttons
- Inputs
- Cards
- Tables
- Dialogs
- API logic

---

## Composition over Duplication

Prefer reusable hooks, utilities, and shared components instead of copying code.

---

# Naming Conventions

Frontend

Components

PascalCase

Example

GroupCard.tsx

Hooks

camelCase

Example

useGroups.ts

Utilities

camelCase

Example

calculateOutstanding.ts

Backend

Files

snake_case

Models

PascalCase

Functions

snake_case

Constants

UPPER_CASE

---

# Folder Rules

Each feature should contain

```
feature/

components/

hooks/

services/

types/

utils/

```

Avoid placing unrelated files together.

---

# State Management

Server State

TanStack Query

Client State

React Context

Local State

useState

Avoid unnecessary global state.

---

# API Rules

- One responsibility per endpoint
- REST naming conventions
- UUID identifiers
- Proper HTTP status codes
- Consistent JSON responses

Business calculations belong in the backend.

Never calculate financial values in React.

---

# Validation Rules

Frontend

React Hook Form

+

Zod

Backend

Pydantic

Every API must validate

- Required fields
- UUIDs
- Dates
- Numbers
- Business Rules

Validation must exist on both frontend and backend.

---

# Error Handling

Never expose raw exceptions.

Return meaningful error messages.

Log unexpected exceptions.

Show user-friendly messages.

---

# Logging

Backend should log

- API Requests
- Errors
- Important Business Events

Examples

Group Created

Member Added

Loan Disbursed

Collection Recorded

Group Closed

---

# Database Rules

Never execute raw SQL unless necessary.

Use repositories/services.

Never duplicate calculated values.

Never bypass business validation.

Use transactions for financial operations.

---

# Financial Rules

Every financial transaction must be atomic.

If one step fails,

the entire transaction must roll back.

Examples

Loan Disbursement

Member Creation

Weekly Collection

Late Joining

---

# Security Rules

Never trust frontend data.

Validate everything.

Sanitize inputs.

Prepare for future authentication.

Never expose internal database IDs unnecessarily.

---

# Performance Rules

Lazy load pages.

Paginate large datasets.

Debounce search.

Optimize queries.

Avoid unnecessary re-renders.

---

# Component Rules

Every component should

- Be reusable
- Accept typed props
- Avoid inline business logic
- Handle loading state
- Handle empty state
- Handle error state

---

# UI Rules

All UI must follow

09_DESIGN_SYSTEM.md

Never introduce new colors or spacing values outside the design system.

---

# Accessibility Rules

Support

- Keyboard Navigation
- Focus Indicators
- Screen Readers
- Proper Labels
- WCAG AA

---

# Code Quality

Use

- TypeScript strict mode
- ESLint
- Prettier

No unused code.

No commented production code.

No console.log in production.

---

# Git Workflow

Main Branch

Protected

Development Branch

Default working branch

Feature Branches

feature/group-management

feature/member-management

feature/collections

feature/dashboard

Every feature should be developed independently.

---

# Commit Convention

Examples

```
feat: add group creation

feat: implement weekly collections

fix: outstanding calculation

refactor: extract collection service

docs: update business rules

```

---

# AI Development Workflow

Every feature must follow this workflow.

Step 1

Read the documentation

- Business Requirements
- Business Rules
- Database Design
- API Specification
- Design System

---

Step 2

Understand the business objective.

---

Step 3

Generate only the requested feature.

Do not modify unrelated modules.

---

Step 4

Maintain existing architecture.

---

Step 5

Validate business rules.

---

Step 6

Review generated code before merging.

---

# AI Prompt Rules

Every AI prompt should include

- Feature Name
- Business Requirement
- Acceptance Criteria
- Related Documentation
- Files Allowed To Modify
- Files Not Allowed To Modify
- Expected Output

Never ask AI to generate an entire application in one prompt.

Generate one feature at a time.

---

# Code Review Checklist

Before approving any feature verify

- Business Logic
- UI Consistency
- API Standards
- Database Integrity
- Error Handling
- Validation
- Mobile Responsiveness
- Accessibility
- Performance

Only after passing the checklist should the feature be merged.

---

# Testing

Every feature should be tested for

- Happy Path
- Validation Errors
- Edge Cases
- Financial Accuracy
- Mobile Layout

---

# Documentation

Every completed feature must update

- API Documentation
- Business Rules (if changed)
- Database Design (if changed)
- Changelog

Documentation and code must remain synchronized.

---

# Future Readiness

The architecture should support

- Customer Portal
- Mobile Application
- Multiple Collectors
- Multiple Branches
- Online Payments
- Notifications
- Analytics
- Role-Based Access
- Multi-language Support

without requiring major redesign.

---

# Non-Negotiable Rules

- Never hardcode business values.
- Never violate documented business rules.
- Never duplicate business logic.
- Never calculate financial values in the frontend.
- Never delete financial history.
- Always keep the application mobile-first.
- Always follow the Design System.
- Always preserve backward compatibility.
- Always prioritize code readability over cleverness.

---

END OF DOCUMENT