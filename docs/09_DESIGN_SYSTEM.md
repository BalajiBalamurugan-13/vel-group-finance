# VEL Finance - Group Finance
## Design System

**Document Version:** 1.1
**Status:** Approved
**Author:** Balaji B & ChatGPT
**Last Updated:** August 2026

---

# Purpose

This document defines the official Design System for the VEL Finance Group Finance application.

Every frontend screen, component, layout, animation, and interaction must follow this design system.

The goal is to ensure visual consistency, scalability, accessibility, and enterprise-grade quality across the application.

---

# Design Philosophy

VEL Finance Group is a Financial Management Platform.

The interface should communicate

- Trust
- Simplicity
- Speed
- Professionalism
- Accuracy

Users should immediately feel confident using the application.

The design should be timeless instead of trendy.

---

# Design Inspiration

The visual language should take inspiration from

- Stripe Dashboard
- Linear
- Notion
- Revolut Business
- Mercury
- Ramp
- Vercel

The application should combine their best UX patterns while maintaining its own identity.

---

# Brand Identity

Brand Name

VEL Finance

Product Name

VEL Finance - Group Finance

Brand Personality

- Professional
- Reliable
- Modern
- Clean
- Human
- Financial

---

# Theme Strategy

Default Theme

Light Theme

Future Support

Dark Theme

Theme switching should work using design tokens.

No component should hardcode colors.

---

# Color System

## Primary

Emerald

Purpose

- Primary Buttons
- Active Navigation
- Success Highlights
- Positive Financial Values

---

## Secondary

Slate

Purpose

- Secondary Buttons
- Borders
- Supporting Text

---

## Success

Green

Used for

- Paid
- Completed
- Active

---

## Warning

Amber

Used for

- Pending
- Upcoming
- Attention Required

---

## Error

Red

Used for

- Failed
- Overdue
- Validation Errors

---

## Information

Blue

Used for

- Information
- Neutral Status
- Notifications

---

## Background

Very Light Gray

---

## Surface

Pure White

---

## Border

Soft Gray

---

# Typography

Primary Font

Inter

Fallback

System UI

Hierarchy

Display

Page Title

Section Title

Card Title

Body

Caption

Financial values should use tabular numbers for better alignment.

---

# Grid System

Desktop

12 Columns

Tablet

8 Columns

Mobile

4 Columns

The layout should follow a consistent responsive grid.

---

# Spacing System

Base Unit

8px

Allowed Spacing

4

8

12

16

24

32

40

48

64

80

96

Never use arbitrary spacing values.

---

# Border Radius

Small

8px

Medium

12px

Large

16px

Extra Large

24px

Consistency is more important than style.

---

# Elevation

Small

Cards

Medium

Dropdowns

Large

Dialogs

Avoid heavy shadows.

Prefer subtle elevation.

---

# Icons

Library

Lucide React

Sizes

16

20

24

32

Use outline icons only.

Do not mix icon libraries.

---

# Layout System

Desktop

Sidebar

Header

Main Content

Right Context Panel (Optional)

---

Tablet

Responsive Sidebar

Header

Content

---

Mobile

Sticky Header

Scrollable Content

Bottom Navigation

Floating Action Button (Only where appropriate)

---

# Component Library

The following components should be reusable.

## Buttons

- Primary
- Secondary
- Outline
- Ghost
- Danger
- Icon Button

States

- Default
- Hover
- Active
- Disabled
- Loading

---

## Inputs

- Text Input
- Number Input
- Phone Input
- Textarea
- Select
- Search
- Date Picker
- Checkbox
- Radio
- Toggle

Every input should support

- Label
- Placeholder
- Helper Text
- Error Message

---

## Cards

Card Types

- Stat Card
- Summary Card
- Member Card
- Group Card
- Report Card

Every card should contain

- Header
- Content
- Footer (Optional)

---

## Tables

Desktop Only

Features

- Sorting
- Filtering
- Pagination
- Sticky Header
- Row Actions

Mobile

Convert to cards.

Never allow horizontal scrolling.

---

## Status Components

Use

- Badge
- Chip
- Progress Indicator

Examples

Paid

Pending

Completed

Closed

Overdue

Never rely only on colors.

---

## Dialogs

Dialog Types

- Confirmation
- Form
- Information

Avoid large forms inside dialogs.

---

## Drawers

Use for

- Mobile Forms
- Mobile Filters
- Mobile Details

---

## Toast Notifications

Types

- Success
- Error
- Warning
- Information

Desktop

Top Right

Mobile

Top Center

---

## Skeleton Loaders

Every page must have

- Card Skeleton
- Table Skeleton
- List Skeleton

Avoid blank loading screens.

---

## Empty States

Every empty state should contain

- Illustration
- Title
- Description
- Primary Action

---

## Charts

Use

- Line Chart
- Bar Chart
- Area Chart
- Donut Chart

Avoid

- Pie Charts with many categories
- 3D Charts

---

# Navigation

Desktop

Sidebar Navigation

Header

Breadcrumbs

---

Mobile

Bottom Navigation

Maximum

5 Items

Dashboard

Groups

Collections

Reports

Settings

---

# Responsive Behaviour

Desktop

Designed for productivity.

Supports keyboard-heavy workflows.

---

Tablet

Balanced layout.

Touch-friendly.

---

Mobile

Designed for speed.

Every important action should be reachable within two taps.

---

# Motion

Duration

150ms – 250ms

Allowed

Fade

Slide

Scale

Motion should improve usability.

Never distract users.

---

# Forms

Desktop

Two-column layout.

Mobile

Single-column layout.

Validation should happen immediately.

---

# Financial UI Rules

Positive Amounts

Green

Outstanding

Amber

Overdue

Red

Collection Values

Bold

Important financial numbers should always be visually emphasized.

---

# Dashboard Components

The dashboard should use reusable widgets.

Examples

- Today's Collection
- Active Groups
- Pending Members
- Cash Position
- Weekly Performance
- Recent Collections
- Quick Actions

Widgets should be reusable across dashboards.

---

# Accessibility

Support

- Keyboard Navigation
- Screen Readers
- Focus Indicators
- WCAG AA

Touch Target

Minimum 44px

---

# Frontend Technology Standards

Framework

React

Language

TypeScript

Styling

Tailwind CSS

Icons

Lucide React

Forms

React Hook Form

Validation

Zod

State Management

TanStack Query

Context API

Animations

Framer Motion

Charts

Recharts

Tables

TanStack Table

Date Handling

Day.js

---

# Design Tokens

The application should use centralized design tokens.

Examples

- Colors
- Typography
- Radius
- Shadows
- Spacing
- Animation Duration
- Z-Index

Components must never define these values individually.

---

# Future Ready Design

The design system should support

- Customer Portal
- Mobile Application
- Multiple Branches
- Multiple Collectors
- Notifications
- Analytics
- Online Payments
- Digital Collection Card

without redesigning the UI.

---

# Design Rules

- Always use reusable components.
- Never hardcode colors.
- Never hardcode spacing.
- Follow the design token system.
- Maintain visual consistency.
- Prefer clarity over decoration.
- Mobile and Desktop experiences should be optimized independently while sharing the same design language.

---

# Final Principle

The Design System is the visual foundation of the VEL Finance ecosystem.

Every new screen, feature, and future application must reuse this system to ensure a consistent and professional user experience across all products.

---

END OF DOCUMENT