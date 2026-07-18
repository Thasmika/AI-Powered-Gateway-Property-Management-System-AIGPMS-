from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.database.session import get_db
from app.models.property import (
    TitleDeed, PropertyAcquisitionCost, PropertyValuation, Property
)
from app.models.auth import User
from app.schemas.property import (
    TitleDeedCreate, TitleDeedOut, 
    PropertyAcquisitionCostCreate, PropertyAcquisitionCostOut,
    PropertyValuationCreate, PropertyValuationOut
)
from app.api import deps
from app.services.audit import create_audit_log

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# Title Deeds
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[TitleDeedOut])
def list_title_deeds(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """List all title deeds"""
    return db.query(TitleDeed).all()

@router.post("", response_model=TitleDeedOut, status_code=status.HTTP_201_CREATED)
def create_title_deed(
    property_id: str,
    payload: TitleDeedCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Create a new title deed for a property"""
    # Check if property exists
    prop = db.query(Property).filter(Property.property_id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
        
    # Check if title deed already exists for this property
    if db.query(TitleDeed).filter(TitleDeed.property_id == property_id).first():
        raise HTTPException(status_code=400, detail="Title deed already exists for this property")
        
    db_obj = TitleDeed(**payload.model_dump(), property_id=property_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="Create Title Deed",
        module="TitleDeed",
        old_value=None,
        new_value=db_obj.title_deed_number
    )
    return db_obj

@router.get("/{title_deed_id}", response_model=TitleDeedOut)
def get_title_deed(
    title_deed_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Get title deed by ID"""
    db_obj = db.query(TitleDeed).filter(TitleDeed.title_deed_id == title_deed_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Title Deed not found")
    return db_obj


# ─────────────────────────────────────────────────────────────────────────────
# Acquisition Costs
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{title_deed_id}/acquisition-cost", response_model=PropertyAcquisitionCostOut, status_code=status.HTTP_201_CREATED)
def add_acquisition_cost(
    title_deed_id: str,
    payload: PropertyAcquisitionCostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Record acquisition cost for a title deed"""
    td = db.query(TitleDeed).filter(TitleDeed.title_deed_id == title_deed_id).first()
    if not td:
        raise HTTPException(status_code=404, detail="Title Deed not found")
        
    if db.query(PropertyAcquisitionCost).filter(PropertyAcquisitionCost.title_deed_id == title_deed_id).first():
        raise HTTPException(status_code=400, detail="Acquisition cost already recorded for this Title Deed")

    # Validation: total_acquisition_cost = purchase_price + registration_fees + broker_commission + other
    total_cost = (
        (payload.purchase_price or Decimal("0")) + 
        (payload.registration_fees or Decimal("0")) + 
        (payload.broker_commission or Decimal("0")) + 
        (payload.other_acquisition_costs or Decimal("0"))
    )

    db_obj = PropertyAcquisitionCost(
        **payload.model_dump(),
        title_deed_id=title_deed_id,
        total_acquisition_cost=total_cost
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="Record Acquisition Cost",
        module="TitleDeed",
        old_value=None,
        new_value=f"Cost: {total_cost}"
    )
    return db_obj


# ─────────────────────────────────────────────────────────────────────────────
# Valuations (INSERT Only)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{title_deed_id}/valuations", response_model=PropertyValuationOut, status_code=status.HTTP_201_CREATED)
def add_valuation(
    title_deed_id: str,
    payload: PropertyValuationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Add a new valuation record. Valuations are INSERT-only."""
    td = db.query(TitleDeed).filter(TitleDeed.title_deed_id == title_deed_id).first()
    if not td:
        raise HTTPException(status_code=404, detail="Title Deed not found")

    acq_cost = db.query(PropertyAcquisitionCost).filter(PropertyAcquisitionCost.title_deed_id == title_deed_id).first()
    
    appreciation_percentage = None
    if acq_cost and acq_cost.total_acquisition_cost and acq_cost.total_acquisition_cost > 0:
        # ((market_value - total_acquisition_cost) / total_acquisition_cost) * 100
        appreciation_percentage = ((payload.market_value - acq_cost.total_acquisition_cost) / acq_cost.total_acquisition_cost) * 100
        
    db_obj = PropertyValuation(
        **payload.model_dump(),
        property_id=td.property_id,
        appreciation_percentage=appreciation_percentage,
        created_by=current_user.user_id
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    create_audit_log(
        db=db,
        user_id=current_user.user_id,
        action="Add Property Valuation",
        module="TitleDeed",
        old_value=None,
        new_value=f"Market Value: {payload.market_value}"
    )
    
    return db_obj
