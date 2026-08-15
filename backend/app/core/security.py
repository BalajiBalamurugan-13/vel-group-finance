"""
VEL Finance — Security Foundation
====================================
Security utilities placeholder.

Version 1 does not implement authentication (per docs/07_API_SPECIFICATION.md):
    "Version 1: Authentication is not required."

This module is a structural placeholder for the future authentication layer.

Future versions will support:
    - User login (office staff / business owner)
    - Customer login
    - Role-based access control (RBAC)
    - JWT token validation
    - Supabase Auth integration

Per docs/10_DEVELOPMENT_RULES.md:
    "Prepare for future authentication."
    "Never expose internal database IDs unnecessarily."

Do NOT add authentication logic here until the authentication milestone.
"""

# Future: from supabase import Client
# Future: from app.core.config import get_settings


def get_current_user():
    """
    Placeholder for future authenticated user extraction.

    Will be implemented as a FastAPI dependency when authentication
    is added in a future milestone.

    Example future usage:
        @router.get("/protected")
        async def protected_route(user = Depends(get_current_user)):
            ...
    """
    # Authentication not implemented in Version 1
    # This will raise NotImplementedError or return a user object
    # when authentication is added.
    pass
