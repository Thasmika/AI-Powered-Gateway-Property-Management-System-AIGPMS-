from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.session import get_db
from app.models.property import Property, PropertyUnit
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
    return query.all()

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

# ─────────────────────────────────────────────────────────────────────────────
# Property Units
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{property_id}/units", response_model=List[PropertyUnitOut])
def list_property_units(
    property_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """List units for a given property"""
    return db.query(PropertyUnit).filter(PropertyUnit.property_id == property_id).all()

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
        
    db_obj = PropertyUnit(**payload.model_dump(), property_id=property_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="Create Property Unit",
        module="Property",
        old_value=None,
        new_value=f"Added unit {db_obj.unit_number} to {property_id}"
    )
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

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_obj, key, value)
        
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
    return db_obj
