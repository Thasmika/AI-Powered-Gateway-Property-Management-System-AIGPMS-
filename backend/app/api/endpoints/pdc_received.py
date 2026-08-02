from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database.session import get_db
from app.api.deps import get_current_active_user, require_roles
from app.models.auth import User
from app.models.pdc import (
    PDCReceived, PDCReceivedStatusHistory, ChequeReturn, ChequeReplacement
)
from app.schemas.pdc import (
    PDCReceivedResponse, PDCStatusUpdate, ChequeReturnCreate, ChequeReplacementCreate
)

router = APIRouter()

def generate_pdc_reference(db: Session) -> str:
    count = db.query(PDCReceived).count()
    return f"PDC-RX-{count + 1:05d}"

def log_status_change(db: Session, pdc: PDCReceived, new_status: str, reason: str, user_id: str, notes: str = None):
    history = PDCReceivedStatusHistory(
        pdc_received_id=pdc.pdc_received_id,
        old_status=pdc.status,
        new_status=new_status,
        change_reason=reason,
        changed_by=user_id,
        notes=notes
    )
    db.add(history)
    pdc.status = new_status
    db.flush()

@router.get("/", response_model=List[PDCReceivedResponse])
def get_pdc_register(
    skip: int = 0, limit: int = 100, 
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(PDCReceived)
    if status_filter:
        query = query.filter(PDCReceived.status == status_filter)
        
    return query.order_by(PDCReceived.cheque_date.asc()).offset(skip).limit(limit).all()


@router.get("/{pdc_id}", response_model=PDCReceivedResponse)
def get_pdc_detail(
    pdc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    pdc = db.query(PDCReceived).filter(PDCReceived.pdc_received_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
    return pdc


@router.post("/{pdc_id}/deposit", response_model=PDCReceivedResponse)
def deposit_pdc(
    pdc_id: str,
    update_data: PDCStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director"]))
):
    pdc = db.query(PDCReceived).filter(PDCReceived.pdc_received_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    if pdc.status not in ["Received", "Due Soon", "Held"]:
        raise HTTPException(status_code=400, detail=f"Cannot deposit PDC with status {pdc.status}")
        
    pdc.deposited_at = datetime.utcnow()
    if update_data.deposit_bank_account:
        pdc.deposit_bank_account = update_data.deposit_bank_account
        
    log_status_change(db, pdc, "Deposited", update_data.reason or "Deposited to bank", current_user.user_id, update_data.notes)
    
    db.commit()
    db.refresh(pdc)
    return pdc


@router.post("/{pdc_id}/clear", response_model=PDCReceivedResponse)
def clear_pdc(
    pdc_id: str,
    update_data: PDCStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director"]))
):
    pdc = db.query(PDCReceived).filter(PDCReceived.pdc_received_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    if pdc.status != "Deposited":
        raise HTTPException(status_code=400, detail="PDC must be Deposited before it can be Cleared")
        
    pdc.cleared_at = datetime.utcnow()
    
    log_status_change(db, pdc, "Cleared", update_data.reason or "Cleared by bank", current_user.user_id, update_data.notes)
    
    db.commit()
    db.refresh(pdc)
    return pdc


@router.post("/{pdc_id}/return", response_model=PDCReceivedResponse)
def return_pdc(
    pdc_id: str,
    return_data: ChequeReturnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director"]))
):
    pdc = db.query(PDCReceived).filter(PDCReceived.pdc_received_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    if pdc.status not in ["Deposited", "Cleared"]:
        raise HTTPException(status_code=400, detail="PDC must be Deposited or Cleared to be Returned")
        
    # Create Return Record
    ret = ChequeReturn(
        pdc_received_id=pdc.pdc_received_id,
        return_date=return_data.return_date,
        return_reason=return_data.return_reason,
        bank_charges=return_data.bank_charges,
        follow_up_action=return_data.follow_up_action,
        notes=return_data.notes
    )
    db.add(ret)
    
    log_status_change(db, pdc, "Returned", return_data.return_reason or "Returned by bank", current_user.user_id, return_data.notes)
    
    db.commit()
    db.refresh(pdc)
    return pdc


@router.post("/{pdc_id}/replace", response_model=PDCReceivedResponse)
def replace_pdc(
    pdc_id: str,
    replace_data: ChequeReplacementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director"]))
):
    old_pdc = db.query(PDCReceived).filter(PDCReceived.pdc_received_id == pdc_id).first()
    if not old_pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    if old_pdc.status not in ["Returned", "Held", "Received"]:
        raise HTTPException(status_code=400, detail=f"Cannot replace PDC with status {old_pdc.status}")
        
    # Create NEW PDC
    new_pdc = PDCReceived(
        pdc_receipt_reference=generate_pdc_reference(db),
        property_id=old_pdc.property_id,
        unit_id=old_pdc.unit_id,
        tenant_id=old_pdc.tenant_id,
        lease_id=old_pdc.lease_id,
        lease_version_id=old_pdc.lease_version_id,
        receivable_id=old_pdc.receivable_id,
        beneficiary_allocation_ref=old_pdc.beneficiary_allocation_ref,
        cheque_number=replace_data.cheque_number,
        bank_name=replace_data.bank_name,
        account_holder=replace_data.account_holder or old_pdc.account_holder,
        cheque_date=replace_data.cheque_date,
        cheque_amount=replace_data.cheque_amount,
        rental_period_from=old_pdc.rental_period_from,
        rental_period_to=old_pdc.rental_period_to,
        date_received=replace_data.replacement_date or datetime.utcnow().date(),
        received_by=current_user.user_id,
        attachment_path=replace_data.attachment_path,
        remarks=f"Replacement for {old_pdc.cheque_number}",
        status="Received"
    )
    db.add(new_pdc)
    db.flush()
    
    # Create Replacement Record linking the two
    replacement = ChequeReplacement(
        original_pdc_id=old_pdc.pdc_received_id,
        replacement_pdc_id=new_pdc.pdc_received_id,
        replacement_reason=replace_data.replacement_reason,
        replaced_by=current_user.user_id,
        replacement_date=replace_data.replacement_date or datetime.utcnow().date(),
        notes=replace_data.notes
    )
    db.add(replacement)
    
    # Mark old PDC as Replaced
    log_status_change(db, old_pdc, "Replaced", replace_data.replacement_reason, current_user.user_id, replace_data.notes)
    
    # Log creation of new PDC
    log_status_change(db, new_pdc, "Received", "Cheque Replacement", current_user.user_id)
    
    db.commit()
    db.refresh(old_pdc)
    return old_pdc
