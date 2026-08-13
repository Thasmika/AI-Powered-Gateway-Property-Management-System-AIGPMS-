from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.api import deps
from app.models.tenant import Tenant, TenantDocument
from app.schemas.tenant import (
    TenantCreate, TenantUpdate, TenantOut,
    TenantDocumentCreate, TenantDocumentOut,
)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Tenant Master CRUD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[TenantOut])
def list_tenants(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_user)
):
    """List all tenants."""
    tenants = db.query(Tenant).order_by(Tenant.full_name.asc(), Tenant.trade_name.asc()).offset(skip).limit(limit).all()
    return tenants


@router.post("/", response_model=TenantOut, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_in: TenantCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Create a new tenant."""
    new_tenant = Tenant(**tenant_in.model_dump(exclude={"documents"}))
    db.add(new_tenant)
    db.flush()

    # Attach any documents provided inline at creation time
    if tenant_in.documents:
        for doc_in in tenant_in.documents:
            new_doc = TenantDocument(
                tenant_id=new_tenant.tenant_id,
                uploaded_by=current_user.user_id,
                **doc_in.model_dump(),
            )
            db.add(new_doc)

    db.commit()
    db.refresh(new_tenant)
    return new_tenant


@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Get a specific tenant by ID."""
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
    """Update a tenant's details."""
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    update_data = tenant_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    db.commit()
    db.refresh(tenant)
    return tenant


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Delete a tenant by ID."""
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    try:
        db.delete(tenant)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot delete tenant. It may be linked to existing records.",
        )

    return None


# ─────────────────────────────────────────────────────────────────────────────
# Tenant Documents
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{tenant_id}/documents", response_model=List[TenantDocumentOut])
def list_tenant_documents(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user),
):
    """
    List all documents attached to a tenant (most recent first).
    """
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    docs = (
        db.query(TenantDocument)
        .filter(TenantDocument.tenant_id == tenant_id)
        .order_by(TenantDocument.upload_date.desc())
        .all()
    )
    return docs


@router.post(
    "/{tenant_id}/documents",
    response_model=TenantDocumentOut,
    status_code=status.HTTP_201_CREATED,
)
def add_tenant_document(
    tenant_id: str,
    doc_in: TenantDocumentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user),
):
    """
    Attach a document record to a tenant.

    Upload the physical file first via  POST /api/v1/upload/file,
    then pass the returned URL as `file_path` in this request body.
    """
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    new_doc = TenantDocument(
        tenant_id=tenant_id,
        uploaded_by=current_user.user_id,
        **doc_in.model_dump(),
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc


@router.delete(
    "/{tenant_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_tenant_document(
    tenant_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user),
):
    """
    Remove a document record from a tenant profile.
    The physical file on disk is NOT deleted — only the database record.
    """
    doc = db.query(TenantDocument).filter(
        TenantDocument.document_id == document_id,
        TenantDocument.tenant_id == tenant_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(doc)
    db.commit()
    return None
