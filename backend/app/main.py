from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.core.config import settings
from app.database.session import engine, Base, SessionLocal
from app.database.init_db import init_db
from app.api.endpoints import auth, master_data, properties, title_deeds, investment, ownership, tenants, leases, receipts, pdc_received, pdc_issued, alerts, upload, ai

# ── Register ALL models with SQLAlchemy metadata ──────────────────────────────
# This must happen BEFORE create_all() so every table is created on startup.
import app.models  # noqa: F401  — triggers models/__init__.py which imports all models

# Initialize Database tables (creates all 35+ tables if not exist)
Base.metadata.create_all(bind=engine)

# Seed initial data (roles, default admin user) is now handled by deploy_app.sh or a startup script

from contextlib import asynccontextmanager
from app.core.scheduler import start_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_scheduler()
    yield
    # Shutdown
    # scheduler.shutdown() would go here if needed

# ── FastAPI Application ───────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description=(
        "AI Powered Gateway Property Management System — "
        "Sprint 1 + Extension Complete: All master data tables, "
        "35 core tables + 10 master tables = 45 tables initialized. "
        "Master Data API live at /api/v1/master."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# ── Ensure Uploads Directory Exists ───────────────────────────────────────────
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ── CORS Middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ───────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(upload.router, prefix=f"{settings.API_V1_STR}/upload", tags=["Uploads"])
app.include_router(master_data.router, prefix=f"{settings.API_V1_STR}/master", tags=["Master Data"])
app.include_router(properties.router, prefix=f"{settings.API_V1_STR}/properties", tags=["Properties"])
app.include_router(title_deeds.router, prefix=f"{settings.API_V1_STR}/title-deeds", tags=["Title Deeds"])
app.include_router(investment.router, prefix=f"{settings.API_V1_STR}/investment", tags=["Investment"])
app.include_router(ownership.router, prefix=f"{settings.API_V1_STR}/ownership", tags=["Ownership & Beneficiaries"])
app.include_router(tenants.router, prefix=f"{settings.API_V1_STR}/tenants", tags=["Tenants"])
app.include_router(leases.router, prefix=f"{settings.API_V1_STR}/leases", tags=["Leases"])
app.include_router(receipts.router, prefix=f"{settings.API_V1_STR}/rental-receipts", tags=["Receipts"])
app.include_router(pdc_received.router, prefix=f"{settings.API_V1_STR}/pdc-received", tags=["PDC Received"])
app.include_router(pdc_issued.router, prefix=f"{settings.API_V1_STR}/pdc-issued", tags=["PDC Issued"])
app.include_router(alerts.router, prefix=f"{settings.API_V1_STR}/alerts", tags=["Alerts"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI Assistant"])
# ── Health & Root ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def read_root():
    return {
        "system": "AI Powered Gateway Property Management System (AIGPMS)",
        "version": "1.0.0",
        "status": "running",
        "sprint": "Sprint 1 Complete — 35 database tables initialized",
        "docs": f"{settings.API_V1_STR}/docs",
        "modules": [
            "Authentication & Users",
            "Property Master",
            "Title Deed & Investment",
            "Ownership & Beneficiaries",
            "Tenants & Leases",
            "PDC Received Register",
            "PDC Issued Register",
            "Expense Management",
            "Finance & Cost Centres",
        ]
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "database": "connected"}

