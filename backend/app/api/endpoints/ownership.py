from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database.session import get_db
from app.models.ownership import LegalOwner, BeneficialOwner, OwnershipRecord, BeneficiaryAllocation
from app.schemas.ownership import (
    LegalOwnerCreate, LegalOwnerUpdate, LegalOwnerResponse,
    BeneficialOwnerCreate, BeneficialOwnerUpdate, BeneficialOwnerResponse,
    OwnershipRecordCreate, OwnershipRecordUpdate, OwnershipRecordResponse,
    BeneficiaryAllocationCreate, BeneficiaryAllocationUpdate, BeneficiaryAllocationResponse
)
from app.api.deps import get_current_active_user

router = APIRouter()

# ----------------- LEGAL OWNERS -----------------

@router.get("/legal-owners", response_model=List[LegalOwnerResponse])
def get_legal_owners(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    return db.query(LegalOwner).all()

@router.post("/legal-owners", response_model=LegalOwnerResponse, status_code=status.HTTP_201_CREATED)
def create_legal_owner(owner_in: LegalOwnerCreate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    new_owner = LegalOwner(**owner_in.model_dump())
    db.add(new_owner)
    db.commit()
    db.refresh(new_owner)
    return new_owner

@router.get("/legal-owners/{legal_owner_id}", response_model=LegalOwnerResponse)
def get_legal_owner(legal_owner_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    owner = db.query(LegalOwner).filter(LegalOwner.legal_owner_id == legal_owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Legal Owner not found")
    return owner

@router.put("/legal-owners/{legal_owner_id}", response_model=LegalOwnerResponse)
def update_legal_owner(legal_owner_id: str, owner_in: LegalOwnerUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    owner = db.query(LegalOwner).filter(LegalOwner.legal_owner_id == legal_owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Legal Owner not found")
    
    update_data = owner_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(owner, field, value)
        
    db.commit()
    db.refresh(owner)
    return owner

# ----------------- BENEFICIAL OWNERS -----------------

@router.get("/beneficial-owners", response_model=List[BeneficialOwnerResponse])
def get_beneficial_owners(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    return db.query(BeneficialOwner).all()

@router.post("/beneficial-owners", response_model=BeneficialOwnerResponse, status_code=status.HTTP_201_CREATED)
def create_beneficial_owner(owner_in: BeneficialOwnerCreate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    new_owner = BeneficialOwner(**owner_in.model_dump())
    db.add(new_owner)
    db.commit()
    db.refresh(new_owner)
    return new_owner

@router.get("/beneficial-owners/{beneficial_owner_id}", response_model=BeneficialOwnerResponse)
def get_beneficial_owner(beneficial_owner_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    owner = db.query(BeneficialOwner).filter(BeneficialOwner.beneficial_owner_id == beneficial_owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Beneficial Owner not found")
    return owner

@router.put("/beneficial-owners/{beneficial_owner_id}", response_model=BeneficialOwnerResponse)
def update_beneficial_owner(beneficial_owner_id: str, owner_in: BeneficialOwnerUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    owner = db.query(BeneficialOwner).filter(BeneficialOwner.beneficial_owner_id == beneficial_owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Beneficial Owner not found")
    
    update_data = owner_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(owner, field, value)
        
    db.commit()
    db.refresh(owner)
    return owner

# ----------------- OWNERSHIP RECORDS -----------------

@router.get("/records", response_model=List[OwnershipRecordResponse])
def get_ownership_records(property_id: str = None, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    query = db.query(OwnershipRecord)
    if property_id:
        query = query.filter(OwnershipRecord.property_id == property_id)
    return query.all()

@router.post("/records", response_model=OwnershipRecordResponse, status_code=status.HTTP_201_CREATED)
def create_ownership_record(record_in: OwnershipRecordCreate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Validate that ownership_percentage does not exceed 100% for this property
    total_existing = db.query(func.sum(OwnershipRecord.ownership_percentage)).filter(
        OwnershipRecord.property_id == record_in.property_id,
        OwnershipRecord.is_current == True
    ).scalar() or 0
    
    if total_existing + record_in.ownership_percentage > 100:
        raise HTTPException(
            status_code=422,
            detail=f"Adding this record exceeds 100% ownership. Current total: {total_existing}%"
        )

    new_record = OwnershipRecord(**record_in.model_dump())
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record

@router.put("/records/{ownership_id}", response_model=OwnershipRecordResponse)
def update_ownership_record(ownership_id: str, record_in: OwnershipRecordUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    record = db.query(OwnershipRecord).filter(OwnershipRecord.ownership_id == ownership_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Ownership record not found")

    update_data = record_in.model_dump(exclude_unset=True)
    
    # If percentage is being updated, re-validate
    if "ownership_percentage" in update_data and record.is_current:
        total_existing = db.query(func.sum(OwnershipRecord.ownership_percentage)).filter(
            OwnershipRecord.property_id == record.property_id,
            OwnershipRecord.is_current == True,
            OwnershipRecord.ownership_id != ownership_id
        ).scalar() or 0
        
        if total_existing + update_data["ownership_percentage"] > 100:
            raise HTTPException(
                status_code=422,
                detail=f"Updating this record exceeds 100% ownership. Current total for other owners: {total_existing}%"
            )

    for field, value in update_data.items():
        setattr(record, field, value)
        
    db.commit()
    db.refresh(record)
    return record


# ----------------- BENEFICIARY ALLOCATIONS -----------------

@router.get("/beneficiaries", response_model=List[BeneficiaryAllocationResponse])
def get_beneficiary_allocations(ownership_record_id: str = None, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    query = db.query(BeneficiaryAllocation)
    if ownership_record_id:
        query = query.filter(BeneficiaryAllocation.ownership_record_id == ownership_record_id)
    return query.all()

@router.post("/beneficiaries", response_model=BeneficiaryAllocationResponse, status_code=status.HTTP_201_CREATED)
def create_beneficiary_allocation(alloc_in: BeneficiaryAllocationCreate, ownership_record_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Validate that allocation_percentage does not exceed 100% for this ownership_record
    total_existing = db.query(func.sum(BeneficiaryAllocation.allocation_percentage)).filter(
        BeneficiaryAllocation.ownership_record_id == ownership_record_id,
        BeneficiaryAllocation.is_current == True
    ).scalar() or 0
    
    if total_existing + alloc_in.allocation_percentage > 100:
        raise HTTPException(
            status_code=422,
            detail=f"Adding this allocation exceeds 100%. Current total: {total_existing}%"
        )

    new_alloc = BeneficiaryAllocation(ownership_record_id=ownership_record_id, **alloc_in.model_dump())
    db.add(new_alloc)
    db.commit()
    db.refresh(new_alloc)
    return new_alloc

@router.put("/beneficiaries/{allocation_id}", response_model=BeneficiaryAllocationResponse)
def update_beneficiary_allocation(allocation_id: str, alloc_in: BeneficiaryAllocationUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    alloc = db.query(BeneficiaryAllocation).filter(BeneficiaryAllocation.allocation_id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Beneficiary allocation not found")

    update_data = alloc_in.model_dump(exclude_unset=True)
    
    # If percentage is being updated, re-validate
    if "allocation_percentage" in update_data and alloc.is_current:
        total_existing = db.query(func.sum(BeneficiaryAllocation.allocation_percentage)).filter(
            BeneficiaryAllocation.ownership_record_id == alloc.ownership_record_id,
            BeneficiaryAllocation.is_current == True,
            BeneficiaryAllocation.allocation_id != allocation_id
        ).scalar() or 0
        
        if total_existing + update_data["allocation_percentage"] > 100:
            raise HTTPException(
                status_code=422,
                detail=f"Updating this allocation exceeds 100%. Current total for other beneficiaries: {total_existing}%"
            )

    for field, value in update_data.items():
        setattr(alloc, field, value)
        
    db.commit()
    db.refresh(alloc)
    return alloc
