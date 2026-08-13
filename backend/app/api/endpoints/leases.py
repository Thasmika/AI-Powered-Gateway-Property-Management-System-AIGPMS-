from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database.session import get_db
from app.api import deps
from app.models.tenant import Lease, LeaseVersion, LeasePaymentSchedule
from app.schemas.tenant import (
    LeaseCreate, LeaseOut, LeaseRenewalCreate,
    LeasePaymentScheduleCreate, LeasePaymentScheduleOut
)

router = APIRouter()

@router.get("/", response_model=List[LeaseOut])
def list_leases(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_user)
):
    """
    List all leases with their versions.
    """
    from app.models.property import Property, PropertyUnit
    leases = db.query(Lease).join(Property, Lease.property_id == Property.property_id).join(PropertyUnit, Lease.unit_id == PropertyUnit.unit_id).order_by(Property.property_name.asc(), PropertyUnit.unit_number.asc()).offset(skip).limit(limit).all()
    return leases

@router.post("/", response_model=LeaseOut, status_code=status.HTTP_201_CREATED)
def create_lease(
    lease_in: LeaseCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Create a new lease along with its initial version and payment schedules.
    """
    # Check if lease number already exists
    existing_lease = db.query(Lease).filter(Lease.lease_number == lease_in.lease_number).first()
    if existing_lease:
        raise HTTPException(
            status_code=400,
            detail=f"Lease with reference number {lease_in.lease_number} already exists"
        )

    # Create the Lease container
    new_lease = Lease(
        lease_number=lease_in.lease_number,
        property_id=lease_in.property_id,
        unit_id=lease_in.unit_id,
        tenant_id=lease_in.tenant_id,
        lease_type=lease_in.lease_type,
        status=lease_in.status,
        created_by=current_user.user_id
    )
    db.add(new_lease)
    
    # Update unit status to 'Occupied'
    from app.models.property import PropertyUnit
    if lease_in.unit_id:
        unit = db.query(PropertyUnit).filter(PropertyUnit.unit_id == lease_in.unit_id).first()
        if unit:
            unit.status = "Occupied"

    db.flush() # get lease_id

    # Create the initial LeaseVersion (version_number = 1)
    version_data = lease_in.initial_version.model_dump(exclude={"schedules"})
    new_version = LeaseVersion(
        lease_id=new_lease.lease_id,
        version_number=1,
        is_current_version=True,
        **version_data
    )
    db.add(new_version)
    db.flush() # get version_id

    # Create Payment Schedules if provided
    if lease_in.initial_version.schedules:
        for schedule_in in lease_in.initial_version.schedules:
            new_schedule = LeasePaymentSchedule(
                lease_version_id=new_version.version_id,
                **schedule_in.model_dump()
            )
            db.add(new_schedule)

    # Create Documents if provided
    if getattr(lease_in, "documents", None):
        from app.models.tenant import LeaseDocument
        for doc_in in lease_in.documents:
            new_document = LeaseDocument(
                lease_id=new_lease.lease_id,
                lease_version_id=new_version.version_id,
                uploaded_by=current_user.user_id,
                **doc_in.model_dump()
            )
            db.add(new_document)

    db.commit()
    db.refresh(new_lease)
    return new_lease

@router.get("/{lease_id}", response_model=LeaseOut)
def get_lease(
    lease_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Get lease details by ID.
    """
    lease = db.query(Lease).filter(Lease.lease_id == lease_id).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    return lease

@router.post("/{lease_id}/renew", response_model=LeaseOut)
def renew_lease(
    lease_id: str,
    renewal_in: LeaseRenewalCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Renew a lease by creating a new LeaseVersion, marking the previous version
    as not current, and generating new payment schedules.
    """
    lease = db.query(Lease).filter(Lease.lease_id == lease_id).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    
    # Find current active version
    current_version = db.query(LeaseVersion).filter(
        LeaseVersion.lease_id == lease_id, 
        LeaseVersion.is_current_version == True
    ).first()

    new_version_number = 1
    if current_version:
        current_version.is_current_version = False
        new_version_number = current_version.version_number + 1

    # Create new version
    version_data = renewal_in.new_version.model_dump(exclude={"schedules"})
    new_version = LeaseVersion(
        lease_id=lease_id,
        version_number=new_version_number,
        is_current_version=True,
        superseded_by=current_version.version_id if current_version else None,
        renewal_reason=renewal_in.renewal_reason,
        **version_data
    )
    db.add(new_version)
    db.flush()

    # Create Payment Schedules for the new version
    if renewal_in.new_version.schedules:
        for schedule_in in renewal_in.new_version.schedules:
            new_schedule = LeasePaymentSchedule(
                lease_version_id=new_version.version_id,
                **schedule_in.model_dump()
            )
            db.add(new_schedule)

    db.commit()
    db.refresh(lease)
    return lease

@router.put("/{lease_id}", response_model=LeaseOut)
def update_lease(
    lease_id: str,
    lease_in: LeaseCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Update an existing lease and its current version.
    """
    lease = db.query(Lease).filter(Lease.lease_id == lease_id).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")

    from app.models.property import PropertyUnit

    # Handle unit status if unit_id changed
    if lease.unit_id != lease_in.unit_id:
        if lease.unit_id:
            old_unit = db.query(PropertyUnit).filter(PropertyUnit.unit_id == lease.unit_id).first()
            if old_unit:
                old_unit.status = "Vacant"
        if lease_in.unit_id:
            new_unit = db.query(PropertyUnit).filter(PropertyUnit.unit_id == lease_in.unit_id).first()
            if new_unit:
                new_unit.status = "Occupied"

    # Update Lease fields
    lease.lease_number = lease_in.lease_number
    lease.property_id = lease_in.property_id
    lease.unit_id = lease_in.unit_id
    lease.tenant_id = lease_in.tenant_id
    lease.lease_type = lease_in.lease_type
    lease.status = lease_in.status

    # Update current version
    current_version = db.query(LeaseVersion).filter(
        LeaseVersion.lease_id == lease_id, 
        LeaseVersion.is_current_version == True
    ).first()

    if current_version:
        version_data = lease_in.initial_version.model_dump(exclude={"schedules"})
        for key, value in version_data.items():
            setattr(current_version, key, value)

    # Note: Complex schedule/document updates are skipped for in-place edit 
    # to avoid overwriting payment history unintentionally. Only basic metadata is updated here.

    db.commit()
    db.refresh(lease)
    return lease

@router.delete("/{lease_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lease(
    lease_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Delete a lease and all associated versions, schedules, and documents.
    """
    lease = db.query(Lease).filter(Lease.lease_id == lease_id).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
        
    try:
        from app.models.tenant import LeaseDocument
        
        # 1. Documents
        db.query(LeaseDocument).filter(LeaseDocument.lease_id == lease_id).delete()
        
        # 2. Payment Schedules (by finding all versions first)
        versions = db.query(LeaseVersion).filter(LeaseVersion.lease_id == lease_id).all()
        for version in versions:
            db.query(LeasePaymentSchedule).filter(LeasePaymentSchedule.lease_version_id == version.version_id).delete()
            
        # 3. Versions
        db.query(LeaseVersion).filter(LeaseVersion.lease_id == lease_id).delete()
        
        # 4. Lease
        from app.models.property import PropertyUnit
        if lease.unit_id:
            unit = db.query(PropertyUnit).filter(PropertyUnit.unit_id == lease.unit_id).first()
            if unit:
                unit.status = "Vacant"
                
        db.delete(lease)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete lease because it has dependent records.")
    return None

@router.get("/versions/{version_id}/schedules", response_model=List[LeasePaymentScheduleOut])
def get_payment_schedules(
    version_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Get payment schedules for a specific lease version.
    """
    schedules = db.query(LeasePaymentSchedule).filter(
        LeasePaymentSchedule.lease_version_id == version_id
    ).all()
    return schedules

from app.models.tenant import LeaseDocument
from app.schemas.tenant import LeaseDocumentOut, LeaseDocumentCreate

@router.get("/{lease_id}/documents", response_model=List[LeaseDocumentOut])
def get_lease_documents(
    lease_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Get all documents attached to a lease.
    """
    documents = db.query(LeaseDocument).filter(LeaseDocument.lease_id == lease_id).all()
    return documents

@router.post("/{lease_id}/documents", response_model=LeaseDocumentOut, status_code=status.HTTP_201_CREATED)
def create_lease_document(
    lease_id: str,
    document_in: LeaseDocumentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Upload/attach a document to a lease.
    """
    lease = db.query(Lease).filter(Lease.lease_id == lease_id).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
        
    new_doc = LeaseDocument(
        lease_id=lease_id,
        uploaded_by=current_user.user_id,
        **document_in.model_dump()
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc

@router.delete("/{lease_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lease_document(
    lease_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    doc = db.query(LeaseDocument).filter(
        LeaseDocument.lease_id == lease_id,
        LeaseDocument.document_id == document_id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    db.delete(doc)
    db.commit()
    return None
