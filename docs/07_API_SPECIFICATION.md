# VEL Finance - Group Finance
## API Specification

**Document Version:** 1.0
**Status:** Draft
**Author:** Balaji B & ChatGPT
**Last Updated:** August 2026

---

# Purpose

This document defines all REST APIs required for the VEL Finance Group Finance application.

The APIs follow REST principles and communicate using JSON.

Every endpoint returns a standard response format and follows consistent validation and error handling.

---

# API Response Format

## Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

---

## Error Response

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}
```

---

# Authentication

Version 1

Authentication is not required.

Future versions will support

- User Login
- Customer Login
- Role Based Access

---

# Module 1 - Schemes

## Get All Schemes

GET

/api/v1/schemes

Purpose

Returns all active schemes.

---

## Get Scheme Details

GET

/api/v1/schemes/{id}

---

## Create Scheme

POST

/api/v1/schemes

---

## Update Scheme

PUT

/api/v1/schemes/{id}

---

## Change Scheme Status

PATCH

/api/v1/schemes/{id}/status

---

# Module 2 - Groups

## Get Groups

GET

/api/v1/groups

Supports

- Status Filter
- Location Filter
- Search

---

## Get Group Details

GET

/api/v1/groups/{id}

Returns

- Group Information
- Scheme
- Members
- Collection Summary
- Loan Summary

---

## Create Group

POST

/api/v1/groups

Input

- Location
- Scheme ID
- Start Date

System Automatically

- Suggests Group Name
- Creates Group

---

## Update Group

PUT

/api/v1/groups/{id}

---

## Change Group Status

PATCH

/api/v1/groups/{id}/status

Allowed Status

- Draft
- Active
- Completed
- Renewed
- Closed

---

# Module 3 - Members

## Get Members

GET

/api/v1/members

Supports

- Search
- Group Filter
- Status Filter

---

## Get Member Details

GET

/api/v1/members/{id}

Returns

- Member Information
- Loan Details
- Collection History
- Outstanding

---

## Add Member

POST

/api/v1/members

System Automatically

- Creates Loan Cycle
- Creates Loan Transaction
- Updates Group Summary
- Calculates Immediate Collection (if joining late)

---

## Update Member

PUT

/api/v1/members/{id}

---

## Change Member Status

PATCH

/api/v1/members/{id}/status

---

# Module 4 - Loan Cycles

## Get Loan Cycles

GET

/api/v1/loan-cycles

---

## Get Loan Cycle

GET

/api/v1/loan-cycles/{id}

---

## Create Loan Cycle

POST

/api/v1/loan-cycles

Used during

- Group Renewal

---

# Module 5 - Loan Transactions

## Get Loan Transactions

GET

/api/v1/loan-transactions

---

## Loan Transaction Details

GET

/api/v1/loan-transactions/{id}

---

# Module 6 - Collections

## Today's Collection

GET

/api/v1/collections/today

---

## Weekly Collection Summary

GET

/api/v1/collections/weekly

---

## Collection History

GET

/api/v1/collections

Supports

- Date Filter
- Group Filter
- Member Filter

---

## Collect Weekly Payment

POST

/api/v1/collections

Input

- Member
- Week Number
- Amount Paid
- Collector

System Automatically

- Records Collection
- Updates Outstanding
- Updates Dashboard
- Updates Reports

---

## Collection Details

GET

/api/v1/collections/{id}

---

# Module 7 - Dashboard

## Dashboard Summary

GET

/api/v1/dashboard

Returns

- Active Groups
- Active Members
- Today's Collection
- Pending Collections
- Cash Summary
- Collections by Location

---

## Dashboard Statistics

GET

/api/v1/dashboard/statistics

---

# Module 8 - Reports

## Group Report

GET

/api/v1/reports/groups

---

## Member Report

GET

/api/v1/reports/members

---

## Collection Report

GET

/api/v1/reports/collections

---

## Outstanding Report

GET

/api/v1/reports/outstanding

---

## Cash Summary Report

GET

/api/v1/reports/cash-summary

---

# Module 9 - Collectors

## Get Collectors

GET

/api/v1/collectors

---

## Create Collector

POST

/api/v1/collectors

---

## Update Collector

PUT

/api/v1/collectors/{id}

---

# Module 10 - Settings

## Get Settings

GET

/api/v1/settings

---

## Update Settings

PUT

/api/v1/settings

---

# Validation Rules

The backend must validate

- Required fields
- Invalid UUIDs
- Invalid dates
- Invalid status values
- Duplicate group names
- Duplicate schemes
- Invalid week numbers
- Negative amounts

Validation errors must return HTTP 400.

---

# HTTP Status Codes

| Status | Meaning |
|---------|---------|
| 200 | Success |
| 201 | Resource Created |
| 400 | Validation Error |
| 404 | Resource Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

---

# API Versioning

All APIs must include versioning.

Current Version

/api/v1/

Future versions

/api/v2/

/api/v3/

---

# Design Principles

- RESTful APIs
- JSON Request/Response
- UUID Primary Keys
- Configuration Driven
- Idempotent Updates
- Consistent Error Responses
- No Business Logic in Frontend
- All calculations performed by Backend

---

END OF DOCUMENT