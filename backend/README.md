# VEL Finance — Group Finance Backend

FastAPI backend for the VEL Finance Group Finance application.

---

## Technology Stack

| Technology | Version |
|-----------|---------|
| Python | 3.11+ |
| FastAPI | 0.115+ |
| Uvicorn | 0.30+ |
| Pydantic v2 | 2.9+ |
| Pydantic Settings | 2.6+ |
| Supabase Python | 2.7+ |
| pytest | 8.3+ |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              ← FastAPI application factory
│   ├── core/
│   │   ├── config.py        ← Pydantic Settings (env vars)
│   │   └── security.py      ← Future auth placeholder
│   ├── db/
│   │   └── supabase.py      ← Centralized Supabase client
│   ├── api/
│   │   ├── router.py        ← API v1 router
│   │   └── health.py        ← GET /api/v1/health
│   ├── schemas/
│   │   └── __init__.py      ← Response schemas
│   ├── services/            ← Future business services
│   └── utils/               ← Shared utilities
├── tests/
│   └── test_health.py       ← Health endpoint tests
├── requirements.txt
├── .env.example             ← Template for environment variables
└── README.md
```

---

## Setup

### 1. Python Version

Requires **Python 3.11+**.

```bash
python --version
# Python 3.11.x
```

### 2. Virtual Environment

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate (Windows CMD)
.\.venv\Scripts\activate.bat

# Activate (macOS/Linux)
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Create Environment File

Copy the example file and fill in real values:

```bash
copy .env.example .env
```

Open `backend/.env` and set:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
APP_ENV=development
DEBUG=false
CORS_ORIGINS=http://localhost:5173
```

> **IMPORTANT**: Use the VEL Finance Group Finance Supabase project credentials.
> NEVER use the Daily Collection application's Supabase credentials here.
> NEVER commit `backend/.env` to version control.

### 5. Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | **Yes** | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Service role key (never expose to frontend) |
| `APP_ENV` | No | `development` or `production` (default: development) |
| `DEBUG` | No | Debug mode (default: false) |
| `CORS_ORIGINS` | No | Comma-separated frontend origins (default: http://localhost:5173) |

---

## Running FastAPI Locally

```bash
# From the backend/ directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or from the repository root:

```bash
uvicorn backend.app.main:app --reload --port 8000
```

The API will be available at:

- **API Base**: http://localhost:8000/api/v1/
- **Health**: http://localhost:8000/api/v1/health
- **API Docs**: http://localhost:8000/docs (development only)
- **ReDoc**: http://localhost:8000/redoc (development only)

---

## Health Endpoint

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:

```json
{"status": "ok"}
```

The health endpoint verifies FastAPI is running.
It does **not** test Supabase connectivity.

---

## Running Tests

```bash
# From the backend/ directory
pytest tests/ -v

# Run with output visible
pytest tests/ -v -s

# Run specific test file
pytest tests/test_health.py -v
```

Tests do **not** require real Supabase credentials.

Expected output:

```
tests/test_health.py::TestApplicationStartup::test_application_can_be_created PASSED
tests/test_health.py::TestApplicationStartup::test_application_has_correct_title PASSED
tests/test_health.py::TestHealthEndpoint::test_health_returns_200 PASSED
tests/test_health.py::TestHealthEndpoint::test_health_returns_json PASSED
tests/test_health.py::TestHealthEndpoint::test_health_response_structure PASSED
tests/test_health.py::TestHealthEndpoint::test_health_status_is_ok PASSED
tests/test_health.py::TestHealthEndpoint::test_health_exact_response PASSED
tests/test_health.py::TestAPIVersioning::test_health_is_under_api_v1 PASSED
tests/test_health.py::TestAPIVersioning::test_health_without_prefix_returns_404 PASSED
tests/test_health.py::TestAPIVersioning::test_unversioned_api_returns_404 PASSED
```

---

## Database Migration

Database schema is managed by the Supabase CLI.

### Migration Files

```
supabase/
└── migrations/
    └── 001_initial_schema.sql   ← Initial schema (8 tables)
```

### Review Before Applying

**ALWAYS review the migration before applying it to the remote Supabase project.**

```bash
# Read the migration file
cat ../supabase/migrations/001_initial_schema.sql
```

### Apply Locally (Supabase CLI)

Requires [Supabase CLI](https://supabase.com/docs/guides/cli) installed.

```bash
# From repository root
supabase start             # Start local Supabase instance
supabase db reset          # Apply all migrations from scratch
```

### Link to Remote Project

```bash
# From repository root
supabase login
supabase link --project-ref your-project-ref

# Push migration to remote (AFTER human review)
supabase db push
```

> **IMPORTANT**: Never push to the remote Supabase project without reviewing the migration first.
> This foundation migration creates all 8 tables. Applying it is irreversible without manual intervention.

### Tables Created by Migration 001

| Table | Purpose |
|-------|---------|
| `schemes` | Reusable loan configurations |
| `groups` | Finance groups |
| `members` | Customer information |
| `loan_cycles` | Loan renewal history |
| `loan_transactions` | Loan disbursement records |
| `collectors` | Collection agents |
| `collections` | Weekly payment records |
| `settings` | Application configuration |

---

## API Endpoints (Foundation Milestone)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Application health check |

Future endpoints (implemented in subsequent milestones):

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/v1/schemes` | Scheme management |
| GET/POST | `/api/v1/groups` | Group management |
| GET/POST | `/api/v1/members` | Member management |
| GET/POST | `/api/v1/collections` | Weekly payment recording |
| GET/POST | `/api/v1/collectors` | Collector management |
| GET | `/api/v1/dashboard` | Dashboard statistics |
| GET | `/api/v1/reports/*` | Business reports |

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — never expose to frontend
- `backend/.env` is gitignored — never commit it
- CORS is restricted to configured origins — no wildcard in production
- API docs (`/docs`, `/redoc`) are disabled in production (`APP_ENV=production`)
- Secrets are never logged

---

## Architecture Notes

This backend uses the **Supabase Python client** for database operations.

The documented tech stack (docs/10_DEVELOPMENT_RULES.md) also lists SQLAlchemy and Alembic.
These will be added as business modules are implemented.
Database migrations for this project use the **Supabase CLI** (not Alembic).
