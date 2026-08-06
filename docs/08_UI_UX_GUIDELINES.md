# VEL Finance - Group Finance
## UI / UX Guidelines

**Document Version:** 1.1
**Status:** Approved
**Author:** Balaji B & ChatGPT
**Last Updated:** August 2026

---

# Purpose

This document defines the official User Interface (UI) and User Experience (UX) standards for the VEL Finance Group Finance application.

The goal is to build an enterprise-grade financial platform that is fast, intuitive, scalable, and accessible for different types of users.

This application is expected to evolve into a complete financial ecosystem with support for:

- Business Owner
- Office Staff
- Collectors
- Customers
- Branch Management

Therefore, every screen must be designed with future scalability in mind.

---

# Product Vision

VEL Finance Group is not an internal software tool.

It is a professional financial platform.

The application should feel modern, trustworthy and premium.

Users should feel confident while managing money.

Every screen should reduce effort and improve productivity.

---

# User Personas

The application serves different users with different workflows.

The UI must adapt according to their needs.

---

## Persona 1

### Office Staff (Primary Data Entry)

Current User

Balaji's Mother

Primary Device

Desktop / Laptop

Responsibilities

- Create Groups
- Add Members
- Search Customers
- Edit Customer Information
- Manage Schemes
- View Reports
- Daily Administration

Goals

- Fast keyboard input
- Large data tables
- Easy navigation
- Minimal mouse usage
- Bulk information visibility

UX Strategy

Desktop First

---

## Persona 2

### Business Owner / Collector

Current User

Balaji's Father

Primary Device

Mobile

Responsibilities

- View Today's Collection
- Record Weekly Collections
- Search Members
- View Pending Collections
- Check Group Progress
- Business Monitoring

Goals

- One-handed usage
- Minimal typing
- Large buttons
- Quick navigation
- Fast loading

UX Strategy

Mobile First

---

## Persona 3

### Customer (Future)

Primary Device

Mobile

Responsibilities

- Login
- View Loan Information
- View Payment History
- View Remaining Installments
- Download Digital Card
- Receive Notifications

UX Strategy

Customer Mobile Experience

---

# UX Philosophy

Every feature should satisfy three conditions.

1. Easy to Learn

A first-time user should understand the screen without training.

2. Fast to Use

Frequently used actions should require the minimum number of interactions.

3. Difficult to Misuse

The interface should prevent mistakes through good design.

---

# Adaptive Responsive Design

The application is NOT simply responsive.

It follows an Adaptive Responsive Design strategy.

Meaning

The same data

↓

Different layouts

↓

Different user experiences

depending on the device.

---

## Desktop Experience

Optimized for

Office Work

Features

- Multi-column layouts
- Large tables
- Keyboard navigation
- Advanced filtering
- Bulk information
- Side panels
- Rich analytics

Purpose

Fast data entry and administration.

---

## Tablet Experience

Optimized for

Office + Field

Features

- Responsive cards
- Simplified tables
- Touch optimized controls

---

## Mobile Experience

Optimized for

Collectors

Features

- Bottom Navigation
- Card Layouts
- Large Touch Targets
- Quick Actions
- Swipe Actions
- Sticky Buttons

Purpose

Fast field collection.

---

# Navigation

Desktop

Sidebar Navigation

Top Header

Scrollable Content

Desktop should prioritize productivity.

---

Mobile

Bottom Navigation

Dashboard

Groups

Collections

Reports

Settings

Floating Action Button

Used only for high-frequency actions.

---

# Dashboard Strategy

Dashboard should answer the following immediately.

How much money was collected today?

How many collections are pending?

Which groups need attention?

How much outstanding exists?

How much cash is available?

The user should never search for these values.

---

Desktop Dashboard

Summary Cards

Charts

Recent Collections

Pending Members

Collection Trends

Reports

Group Statistics

---

Mobile Dashboard

Today's Collection

Pending Members

Quick Collection Button

Groups

Today's Activity

No unnecessary charts.

Action focused.

---

# Information Hierarchy

Every screen should follow

Primary Information

↓

Secondary Information

↓

Supporting Information

↓

Actions

Users should never struggle to identify important values.

---

# Forms

Desktop

Two-column layout.

Keyboard optimized.

Tab navigation.

Inline validation.

---

Mobile

Single-column layout.

Large inputs.

Large buttons.

Minimal scrolling.

---

# Tables

Desktop

Tables are the primary component.

Features

- Search
- Sort
- Filter
- Pagination
- Sticky Header
- Row Actions

---

Mobile

Tables transform into Cards.

No horizontal scrolling.

Each card should display

- Name
- Status
- Collection
- Outstanding
- Quick Actions

---

# Search Experience

Search should be available across the application.

Searchable

- Groups
- Members
- Phone Numbers
- Locations

Desktop

Global Search

Ctrl + K

Mobile

Large Search Bar

Future

Voice Search

---

# Collection Experience

The Weekly Collection screen is the most important workflow.

Recording a payment should take less than 10 seconds.

The screen should emphasize

- Customer Name
- Current Week
- Outstanding
- Amount Due
- Collect Button

Avoid unnecessary information during collection.

---

# Empty States

Every empty page should guide the user.

Never display blank screens.

Example

No Groups Found

↓

Description

↓

Create Group Button

---

# Loading States

Skeleton loaders must be used.

Avoid blocking the interface.

---

# Error States

Errors should explain

What happened

Why

How to fix it

Never expose technical messages.

---

# Confirmation Dialogs

Use confirmation dialogs only for important financial actions.

Examples

- Close Group
- Renew Group
- Delete Draft
- Edit Financial Information

---

# Notifications

Use toast notifications.

Examples

Group Created

Member Added

Collection Recorded

Scheme Updated

Notifications should automatically disappear.

---

# Accessibility

Support

- Keyboard Navigation
- Screen Readers
- High Contrast
- Proper Labels
- WCAG AA

Minimum touch target

44px

---

# Performance Goals

Dashboard

< 2 Seconds

Search

< 500 ms

Open Group

< 1 Second

Record Collection

< 10 Seconds

---

# Future Customer Experience

Customer Portal should use the same Design System.

Customers should be able to

- Login
- View Loan
- View Collections
- View Outstanding
- View Payment History

without changing the application's visual identity.

---

# UX Principles

The interface should

Reduce clicks.

Reduce typing.

Reduce mistakes.

Increase confidence.

Increase speed.

Every screen must answer

"What is the fastest way for this user to complete their work?"

---

# Success Metrics

Office Staff

Create Group

< 60 Seconds

Add Member

< 30 Seconds

Search Customer

< 5 Seconds

Business Owner

Record Collection

< 10 Seconds

View Today's Pending

< 3 Seconds

Customer (Future)

Login

< 10 Seconds

View Loan

< 5 Seconds

---

# Final Principle

The application should adapt to the user's role and device instead of forcing every user to use the same interface.

Desktop users should experience a productivity-focused workspace.

Mobile users should experience a speed-focused workspace.

Future customers should experience a simple and trustworthy financial portal.

---

END OF DOCUMENT