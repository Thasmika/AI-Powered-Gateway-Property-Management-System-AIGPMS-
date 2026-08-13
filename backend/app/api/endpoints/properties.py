from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.session import get_db
from app.models.property import Property, PropertyUnit, TitleDeed
from app.models.ownership import OwnershipRecord, BeneficiaryAllocation
from app.models.tenant import Lease
from app.models.master_data import MasterBank
from app.models.auth import User
from app.schemas.property import (
    PropertyCreate, PropertyUpdate, PropertyOut, PropertyDetailOut,
    PropertyUnitCreate, PropertyUnitUpdate, PropertyUnitOut
)
from app.api import deps
from app.services.audit import create_audit_log

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# Properties
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[PropertyOut])
def list_properties(
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None,
    current_user: User = Depends(deps.get_current_active_user)
):
    """List properties with optional status filter"""
    query = db.query(Property)
    if status_filter:
        query = query.filter(Property.status == status_filter)
    return query.order_by(Property.property_name.asc()).all()

@router.post("", response_model=PropertyOut, status_code=status.HTTP_201_CREATED)
def create_property(
    payload: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Create a new property"""
    # Check for unique code
    if db.query(Property).filter(Property.property_code == payload.property_code).first():
        raise HTTPException(status_code=400, detail="Property code already exists.")
        
    db_obj = Property(**payload.model_dump(), created_by=current_user.user_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="Create Property",
        module="Property",
        old_value=None,
        new_value=db_obj.property_code
    )
    return db_obj

@router.get("/{property_id}", response_model=PropertyDetailOut)
def get_property(
    property_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Get property by ID, including units and related entities"""
    db_obj = db.query(Property).filter(Property.property_id == property_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Property not found")
        
    for unit in db_obj.units:
        if unit.title_deed:
            unit.legal_owner_id = unit.title_deed.legal_owner_id
            unit.beneficial_owner_id = unit.title_deed.beneficial_owner_id
            
        active_lease = next((l for l in unit.leases if l.status != "Terminated"), None)
        if active_lease:
            unit.tenant_id = active_lease.tenant_id
            
        active_ownership = next((o for o in unit.ownership_records if o.is_current), None)
        if active_ownership:
            allocation = next((a for a in active_ownership.beneficiary_allocations if a.is_current), None)
            if allocation and allocation.bank_name:
                bank = db.query(MasterBank).filter(MasterBank.bank_name == allocation.bank_name).first()
                if bank:
                    unit.bank_id = bank.bank_id
                    
    return db_obj

@router.put("/{property_id}", response_model=PropertyOut)
def update_property(
    property_id: str,
    payload: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Update a property"""
    db_obj = db.query(Property).filter(Property.property_id == property_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Property not found")
        
    # Check if updating code, ensure it's unique
    if payload.property_code and payload.property_code != db_obj.property_code:
        if db.query(Property).filter(Property.property_code == payload.property_code).first():
            raise HTTPException(status_code=400, detail="Property code already exists.")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_obj, key, value)
        
    db.commit()
    db.refresh(db_obj)
    
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="Update Property",
        module="Property",
        old_value=None,
        new_value=f"Updated property {property_id}"
    )
    return db_obj

@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Delete a property if it has no units"""
    db_obj = db.query(Property).filter(Property.property_id == property_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Property not found")
        
    unit_count = db.query(PropertyUnit).filter(PropertyUnit.property_id == property_id).count()
    if unit_count > 0:
        raise HTTPException(
            status_code=400, 
            detail="This property has units therefore you can't delete this property. If you want delete this property, you have to delete units one by one. After that you can delete property name."
        )
        
    db.delete(db_obj)
    db.commit()
    
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="Delete Property",
        module="Property",
        old_value=db_obj.property_code,
        new_value=None
    )
    return None

# ─────────────────────────────────────────────────────────────────────────────
# Property Units
# ─────────────────────────────────────────────────────────────────────────────

def recalculate_property_totals(db: Session, property_id: str):
    from sqlalchemy import func
    prop = db.query(Property).filter(Property.property_id == property_id).first()
    if not prop: return
    
    total_units = db.query(func.count(PropertyUnit.unit_id)).filter(PropertyUnit.property_id == property_id).scalar() or 0
    total_area = db.query(func.sum(PropertyUnit.area_sqm)).filter(PropertyUnit.property_id == property_id).scalar() or 0
    
    # Auto-update property's total_units and total_area_sqm based on actual units added
    prop.total_units = total_units
    prop.total_area_sqm = total_area
    db.commit()

@router.get("/{property_id}/units", response_model=List[PropertyUnitOut])
def list_property_units(
    property_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    units = db.query(PropertyUnit).filter(PropertyUnit.property_id == property_id).all()
    for unit in units:
        if unit.title_deed:
            unit.legal_owner_id = unit.title_deed.legal_owner_id
            unit.beneficial_owner_id = unit.title_deed.beneficial_owner_id
            
        active_lease = next((l for l in unit.leases if l.status != "Terminated"), None)
        if active_lease:
            unit.tenant_id = active_lease.tenant_id
            
        active_ownership = next((o for o in unit.ownership_records if o.is_current), None)
        if active_ownership:
            allocation = next((a for a in active_ownership.beneficiary_allocations if a.is_current), None)
            if allocation and allocation.bank_name:
                bank = db.query(MasterBank).filter(MasterBank.bank_name == allocation.bank_name).first()
                if bank:
                    unit.bank_id = bank.bank_id
    return units

@router.post("/{property_id}/units", response_model=PropertyUnitOut, status_code=status.HTTP_201_CREATED)
def create_property_unit(
    property_id: str,
    payload: PropertyUnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Add a unit to a property"""
    prop = db.query(Property).filter(Property.property_id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
        
    payload_dict = payload.model_dump()
    legal_owner_id = payload_dict.pop("legal_owner_id", None)
    beneficial_owner_id = payload_dict.pop("beneficial_owner_id", None)
    bank_id = payload_dict.pop("bank_id", None)
    tenant_id = payload_dict.pop("tenant_id", None)
        
    db_obj = PropertyUnit(**payload_dict, property_id=property_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # Auto-inherit from Property's Title Deed if not explicitly provided
    if not legal_owner_id:
        property_title_deed = db.query(TitleDeed).filter(TitleDeed.property_id == property_id).first()
        if property_title_deed and property_title_deed.legal_owner_id:
            legal_owner_id = property_title_deed.legal_owner_id
            beneficial_owner_id = property_title_deed.beneficial_owner_id
    
    if legal_owner_id:
        title_deed = TitleDeed(
            property_id=property_id,
            unit_id=db_obj.unit_id,
            unit_number=db_obj.unit_number,
            property_type=db_obj.unit_type,
            unit_size=db_obj.area_sqm,
            legal_owner_id=legal_owner_id,
            beneficial_owner_id=beneficial_owner_id,
            ownership_percentage=100.0,
            ownership_status="Active"
        )
        db.add(title_deed)
        
        ownership_record = OwnershipRecord(
            property_id=property_id,
            unit_id=db_obj.unit_id,
            legal_owner_id=legal_owner_id,
            ownership_type="Freehold",
            ownership_percentage=100.0,
            is_current=True
        )
        db.add(ownership_record)
        db.flush()
        
        if beneficial_owner_id and bank_id:
            bank = db.query(MasterBank).filter(MasterBank.bank_id == bank_id).first()
            if bank:
                allocation = BeneficiaryAllocation(
                    ownership_record_id=ownership_record.ownership_id,
                    beneficial_owner_id=beneficial_owner_id,
                    allocation_percentage=100.0,
                    bank_name=bank.bank_name,
                    is_current=True
                )
                db.add(allocation)
                
    if tenant_id:
        import uuid
        lease_number = f"DRAFT-{uuid.uuid4().hex[:8].upper()}"
        lease = Lease(
            lease_number=lease_number,
            property_id=property_id,
            unit_id=db_obj.unit_id,
            tenant_id=tenant_id,
            status="Draft"
        )
        db.add(lease)
        db.flush()
        
        from datetime import date
        from app.models.tenant import LeaseVersion
        lease_version = LeaseVersion(
            lease_id=lease.lease_id,
            version_number=1,
            contract_start_date=date.today(),
            contract_end_date=date.today(),
            annual_rent=0,
            security_deposit=0,
            status="Draft"
        )
        db.add(lease_version)
        
    db.commit()
    
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="Create Property Unit",
        module="Property",
        old_value=None,
        new_value=f"Added unit {db_obj.unit_number} to {property_id} with cascading details"
    )
    recalculate_property_totals(db, property_id)
    return db_obj

@router.put("/{property_id}/units/{unit_id}", response_model=PropertyUnitOut)
def update_property_unit(
    property_id: str,
    unit_id: str,
    payload: PropertyUnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Update a property unit"""
    db_obj = db.query(PropertyUnit).filter(
        PropertyUnit.property_id == property_id,
        PropertyUnit.unit_id == unit_id
    ).first()
    
    if not db_obj:
        raise HTTPException(status_code=404, detail="Property Unit not found")

    payload_dict = payload.model_dump(exclude_unset=True)
    legal_owner_id = payload_dict.pop("legal_owner_id", None)
    beneficial_owner_id = payload_dict.pop("beneficial_owner_id", None)
    bank_id = payload_dict.pop("bank_id", None)
    tenant_id = payload_dict.pop("tenant_id", None)

    for key, value in payload_dict.items():
        setattr(db_obj, key, value)
        
    # Update cascading relationships
    if legal_owner_id:
        title_deed = db.query(TitleDeed).filter(TitleDeed.unit_id == unit_id).first()
        if title_deed:
            title_deed.legal_owner_id = legal_owner_id
            if beneficial_owner_id:
                title_deed.beneficial_owner_id = beneficial_owner_id
        else:
            title_deed = TitleDeed(
                property_id=property_id,
                unit_id=db_obj.unit_id,
                unit_number=db_obj.unit_number,
                property_type=db_obj.unit_type,
                unit_size=db_obj.area_sqm,
                legal_owner_id=legal_owner_id,
                beneficial_owner_id=beneficial_owner_id,
                ownership_percentage=100.0,
                ownership_status="Active"
            )
            db.add(title_deed)
            
        ownership = db.query(OwnershipRecord).filter(OwnershipRecord.unit_id == unit_id).first()
        if ownership:
            ownership.legal_owner_id = legal_owner_id
        else:
            ownership = OwnershipRecord(
                property_id=property_id,
                unit_id=db_obj.unit_id,
                legal_owner_id=legal_owner_id,
                ownership_type="Freehold",
                ownership_percentage=100.0,
                is_current=True
            )
            db.add(ownership)
        db.flush()
        
        if beneficial_owner_id and bank_id:
            bank = db.query(MasterBank).filter(MasterBank.bank_id == bank_id).first()
            if bank:
                allocation = db.query(BeneficiaryAllocation).filter(BeneficiaryAllocation.ownership_record_id == ownership.ownership_id).first()
                if allocation:
                    allocation.beneficial_owner_id = beneficial_owner_id
                    allocation.bank_name = bank.bank_name
                else:
                    allocation = BeneficiaryAllocation(
                        ownership_record_id=ownership.ownership_id,
                        beneficial_owner_id=beneficial_owner_id,
                        allocation_percentage=100.0,
                        bank_name=bank.bank_name,
                        is_current=True
                    )
                    db.add(allocation)
                    
    if tenant_id:
        lease = db.query(Lease).filter(Lease.unit_id == unit_id, Lease.status != "Terminated").first()
        if lease:
            lease.tenant_id = tenant_id
        else:
            import uuid
            from datetime import date
            from app.models.tenant import LeaseVersion
            lease = Lease(
                lease_number=f"DRAFT-{uuid.uuid4().hex[:8].upper()}",
                property_id=property_id,
                unit_id=db_obj.unit_id,
                tenant_id=tenant_id,
                status="Draft"
            )
            db.add(lease)
            db.flush()
            lease_version = LeaseVersion(
                lease_id=lease.lease_id,
                version_number=1,
                contract_start_date=date.today(),
                contract_end_date=date.today(),
                annual_rent=0,
                security_deposit=0,
                status="Draft"
            )
            db.add(lease_version)

    db.commit()
    db.refresh(db_obj)
    
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="Update Property Unit",
        module="Property",
        old_value=None,
        new_value=f"Updated unit {unit_id}"
    )
    recalculate_property_totals(db, property_id)
    return db_obj

@router.delete("/{property_id}/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property_unit(
    property_id: str,
    unit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Delete a property unit"""
    db_obj = db.query(PropertyUnit).filter(
        PropertyUnit.property_id == property_id,
        PropertyUnit.unit_id == unit_id
    ).first()
    
    if not db_obj:
        raise HTTPException(status_code=404, detail="Property Unit not found")

    try:
        from app.models.tenant import LeaseVersion
        
        # 1. Leases and their versions
        leases = db.query(Lease).filter(Lease.unit_id == unit_id).all()
        for lease in leases:
            db.query(LeaseVersion).filter(LeaseVersion.lease_id == lease.lease_id).delete()
            db.delete(lease)
            
        # 2. Ownership records and allocations
        ownerships = db.query(OwnershipRecord).filter(OwnershipRecord.unit_id == unit_id).all()
        for ownership in ownerships:
            db.query(BeneficiaryAllocation).filter(BeneficiaryAllocation.ownership_record_id == ownership.ownership_id).delete()
            db.delete(ownership)
            
        # 3. Title Deed
        db.query(TitleDeed).filter(TitleDeed.unit_id == unit_id).delete()

        db.delete(db_obj)
        db.commit()
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail="Cannot delete unit because it has dependent records (e.g., active leases, payments, or expenses).")
    
    recalculate_property_totals(db, property_id)
    
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="Delete Property Unit",
        module="Property",
        old_value=unit_id,
        new_value=None
    )
    return None
