"""
DPDP Shield — FastAPI Application
Entry point: uvicorn main:app --reload --port 8000
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from config import settings

# ── Core routers ──────────────────────────────────────────────────────────────
from api.routes import upload, analyze, documents, reports, chat, dashboard
from api.routes import scan, export, analytics, audit

# ── Auth router ───────────────────────────────────────────────────────────────
from auth.routes import router as auth_router


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan: startup / shutdown
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Ensure storage directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.REPORTS_DIR, exist_ok=True)

    yield  # ← app runs here

    await engine.dispose()


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DPDP Shield API",
    description=(
        "AI-powered Digital Personal Data Protection (DPDP) Act 2023 "
        "compliance platform. Detect PII, assess risk, generate reports."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — permissive in dev; tighten in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (uploaded documents)
try:
    app.mount("/static", StaticFiles(directory=settings.UPLOAD_DIR), name="static")
except RuntimeError:
    pass  # directory may not exist yet on first run


# ─────────────────────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────────────────────
V1 = "/api/v1"

app.include_router(upload.router,    prefix=f"{V1}/upload",    tags=["Upload"])
app.include_router(scan.router,      prefix=f"{V1}/scan",      tags=["Scan"])
app.include_router(analyze.router,   prefix=f"{V1}/analyze",   tags=["Analyze"])
app.include_router(documents.router, prefix=f"{V1}/documents", tags=["Documents"])
app.include_router(reports.router,   prefix=f"{V1}/reports",   tags=["Reports"])
app.include_router(export.router,     prefix=f"{V1}/export",     tags=["Export"])
app.include_router(chat.router,       prefix=f"{V1}/chat",       tags=["Chat"])
app.include_router(dashboard.router,  prefix=f"{V1}/dashboard",  tags=["Dashboard"])
app.include_router(analytics.router,  prefix=f"{V1}/analytics",  tags=["Analytics"])
app.include_router(audit.router,      prefix=f"{V1}/audit",      tags=["Audit"])
app.include_router(auth_router)


# ─────────────────────────────────────────────────────────────────────────────
# System endpoints
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"], summary="Health check")
async def health_check():
    from sqlalchemy import text
    from ai.summary import gemini_configured
    components: dict = {}

    # Database check
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        components["database"] = "healthy"
    except Exception as e:
        components["database"] = f"error: {str(e)[:60]}"

    # Redis check (optional — skip if not configured)
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url("redis://localhost:6379", socket_timeout=1)
        await r.ping()
        await r.aclose()
        components["redis"] = "healthy"
    except Exception:
        components["redis"] = "unavailable"

    # Gemini AI engine
    key = settings.GEMINI_API_KEY
    if gemini_configured():
        components["gemini"] = "configured"
    elif key == "your-gemini-api-key-here":
        components["gemini"] = "placeholder"
    else:
        components["gemini"] = "missing"

    api_ok = components["database"] == "healthy"
    return {
        "status": "healthy" if api_ok else "degraded",
        "version": "1.0.0",
        "components": components,
    }


@app.get("/", tags=["System"], summary="API info")
async def root():
    return {
        "name":    "DPDP Shield API",
        "version": "1.0.0",
        "docs":    "/docs",
        "health":  "/health",
    }
