from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.api import deps
from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantOut

router = APIRouter()

@router.get("/", response_model=List[TenantOut])
def list_tenants(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_user)
):
    """
    List all tenants.
    """
    tenants = db.query(Tenant).offset(skip).limit(limit).all()
    return tenants

@router.post("/", response_model=TenantOut, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_in: TenantCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Create a new tenant.
    """
    new_tenant = Tenant(**tenant_in.model_dump())
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant

@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Get a specific tenant by ID.
    """
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@router.put("/{tenant_id}", response_model=TenantOut)
def update_tenant(
    tenant_id: str,
    tenant_in: TenantUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Update a tenant's details.
    """
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    update_data = tenant_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    db.commit()
    db.refresh(tenant)
    return tenant
