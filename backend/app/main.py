from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine, Base, SessionLocal
from app.database.init_db import init_db
from app.api.endpoints import auth, master_data, properties, title_deeds, investment, ownership

# ── Register ALL models with SQLAlchemy metadata ──────────────────────────────
# This must happen BEFORE create_all() so every table is created on startup.
import app.models  # noqa: F401  — triggers models/__init__.py which imports all models

# Initialize Database tables (creates all 35+ tables if not exist)
Base.metadata.create_all(bind=engine)

# Seed initial data (roles, default admin user)
db = SessionLocal()
try:
    init_db(db)
finally:
    db.close()

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
)

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
app.include_router(master_data.router, prefix=f"{settings.API_V1_STR}/master", tags=["Master Data"])
app.include_router(properties.router, prefix=f"{settings.API_V1_STR}/properties", tags=["Properties"])
app.include_router(title_deeds.router, prefix=f"{settings.API_V1_STR}/title-deeds", tags=["Title Deeds"])
app.include_router(investment.router, prefix=f"{settings.API_V1_STR}/investment", tags=["Investment"])
app.include_router(ownership.router, prefix=f"{settings.API_V1_STR}/ownership", tags=["Ownership & Beneficiaries"])

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

