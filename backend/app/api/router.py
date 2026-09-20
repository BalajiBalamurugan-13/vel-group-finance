"""
VEL Finance — API v1 Router
==============================
Central router for all /api/v1/ endpoints.

Current routes (Foundation Milestone):
    GET  /api/v1/health  — Application health check

Future routes (to be added per 07_API_SPECIFICATION.md):
    /api/v1/schemes          — Scheme management
    /api/v1/groups           — Group management
    /api/v1/members          — Member management
    /api/v1/loan-cycles      — Loan cycle management
    /api/v1/loan-transactions — Loan disbursement records
    /api/v1/collections      — Weekly payment recording
    /api/v1/collectors       — Collector management
    /api/v1/dashboard        — Dashboard statistics
    /api/v1/reports          — Business reports
    /api/v1/settings         — Application configuration

Add each module's router as its milestone is implemented:
    from app.api.v1.schemes import router as schemes_router
    api_router.include_router(schemes_router, prefix="/schemes")

Per docs/10_DEVELOPMENT_RULES.md:
    "One responsibility per endpoint."
    "REST naming conventions."
"""

from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.endpoints.schemes import router as schemes_router
from app.api.endpoints.groups import router as groups_router
from app.api.endpoints.members import router as members_router
from app.api.endpoints.collections import router as collections_router
from app.api.endpoints.dashboard import router as dashboard_router
from app.api.endpoints.investments import router as investments_router
from app.api.endpoints.profit import router as profit_router
from app.api.endpoints.loan_risk import router as loan_risk_router

api_router = APIRouter(prefix="/api/v1")

# ── Active Routes ──────────────────────────────────────────────────────────────
api_router.include_router(health_router)
api_router.include_router(schemes_router, prefix="/schemes", tags=["Schemes"])
api_router.include_router(groups_router, prefix="/groups", tags=["Groups"])
api_router.include_router(members_router, prefix="/members", tags=["Members"])
api_router.include_router(collections_router, prefix="/collections", tags=["Collections"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(investments_router, prefix="/investments", tags=["Investments"])
api_router.include_router(profit_router, prefix="/profit", tags=["Profit"])
api_router.include_router(loan_risk_router, prefix="/loan-risk", tags=["Loan Risk"])

# ── Future Module Routes (add as each milestone is implemented) ────────────────

# from app.api.groups import router as groups_router
# api_router.include_router(groups_router, prefix="/groups", tags=["Groups"])

# from app.api.members import router as members_router
# api_router.include_router(members_router, prefix="/members", tags=["Members"])

# from app.api.loan_cycles import router as loan_cycles_router
# api_router.include_router(loan_cycles_router, prefix="/loan-cycles", tags=["Loan Cycles"])

# from app.api.loan_transactions import router as loan_transactions_router
# api_router.include_router(loan_transactions_router, prefix="/loan-transactions", tags=["Loan Transactions"])

# from app.api.collections import router as collections_router
# api_router.include_router(collections_router, prefix="/collections", tags=["Collections"])

# from app.api.collectors import router as collectors_router
# api_router.include_router(collectors_router, prefix="/collectors", tags=["Collectors"])

# from app.api.reports import router as reports_router
# api_router.include_router(reports_router, prefix="/reports", tags=["Reports"])  # Future milestone

# from app.api.settings import router as settings_router
# api_router.include_router(settings_router, prefix="/settings", tags=["Settings"])
