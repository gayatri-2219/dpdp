"""
DPDP Shield — Auth Routes
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
"""
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator
from .auth import get_password_hash, verify_password, create_access_token, require_auth
from .rbac import Role

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

# ─── In-memory user store (replace with DB User model in production) ──────────
_users: dict[str, dict] = {}


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "analyst"

    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        valid = {r.value for r in Role}
        if v not in valid:
            raise ValueError(f"Role must be one of: {valid}")
        return v

    @field_validator("password")
    @classmethod
    def min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


def _user_response(user: dict) -> dict:
    return {
        "id":    user["id"],
        "email": user["email"],
        "name":  user["name"],
        "role":  user["role"],
    }


@router.post("/register", summary="Register a new user")
async def register(req: RegisterRequest):
    if req.email in _users:
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    _users[req.email] = {
        "id":              user_id,
        "email":           req.email,
        "name":            req.name,
        "role":            req.role,
        "hashed_password": get_password_hash(req.password),
    }
    token = create_access_token({
        "sub":   user_id,
        "email": req.email,
        "role":  req.role,
        "name":  req.name,
    })
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": _user_response(_users[req.email]),
    }


@router.post("/login", summary="Log in and receive a JWT token")
async def login(req: LoginRequest):
    user = _users.get(req.email)
    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token({
        "sub":   user["id"],
        "email": user["email"],
        "role":  user["role"],
        "name":  user["name"],
    })
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": _user_response(user),
    }


@router.get("/me", summary="Get current authenticated user")
async def me(current_user: dict = Depends(require_auth)):
    return {"user": current_user}


@router.get("/roles", summary="List available roles")
async def list_roles():
    return {"roles": [r.value for r in Role], "hierarchy": "ADMIN > ANALYST > VIEWER"}
