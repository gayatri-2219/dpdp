"""
DPDP Shield — Auth Module
JWT-based authentication + RBAC for ADMIN / ANALYST / VIEWER roles.
"""
from .auth import (
    create_access_token,
    verify_token,
    get_password_hash,
    verify_password,
    get_current_user,
    require_auth,
)
from .rbac import Role, require_role

__all__ = [
    "create_access_token", "verify_token",
    "get_password_hash", "verify_password",
    "get_current_user", "require_auth",
    "Role", "require_role",
]
