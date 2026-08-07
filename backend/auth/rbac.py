"""
DPDP Shield — Role-Based Access Control
Roles: ADMIN > ANALYST > VIEWER
"""
from enum import Enum
from fastapi import HTTPException, Depends
from .auth import require_auth


class Role(str, Enum):
    ADMIN   = "admin"
    ANALYST = "analyst"
    VIEWER  = "viewer"


ROLE_HIERARCHY = {
    Role.VIEWER:  1,
    Role.ANALYST: 2,
    Role.ADMIN:   3,
}


def require_role(*required_roles: Role):
    """
    FastAPI dependency factory.
    Usage:
        @router.delete("/{id}", dependencies=[Depends(require_role(Role.ADMIN))])
    """
    async def _check(user: dict = Depends(require_auth)):
        user_role  = user.get("role", "viewer")
        user_level = ROLE_HIERARCHY.get(Role(user_role), 0)
        max_required = max(ROLE_HIERARCHY.get(r, 0) for r in required_roles)
        if user_level < max_required:
            raise HTTPException(
                403,
                f"Role '{user_role}' is not authorized. "
                f"Required: {[r.value for r in required_roles]}",
            )
        return user
    return _check
