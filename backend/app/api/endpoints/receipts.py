from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
import uuid
import re

from app.database.session import get_db
from app.api.deps import get_current_active_user, require_roles
from app.models.auth import User
from app.models.pdc import (
    RentalReceipt, RentalReceiptPaymentLine, PDCReceived, PDCReceivedStatusHistory
)
from app.models.tenant import Lease, LeaseVersion
from app.schemas.pdc import RentalReceiptCreate, RentalReceiptResponse

router = APIRouter()

def generate_receipt_number(db: Session) -> str:
    """Generate a unique receipt number by finding the current MAX sequence number."""
    year = datetime.utcnow().year
    prefix = f"REC-{year}-"
    # Find the highest existing sequence number for this year
    latest = db.query(func.max(RentalReceipt.receipt_number)).filter(
        RentalReceipt.receipt_number.like(f"{prefix}%")
    ).scalar()
    if latest:
        try:
            seq = int(latest.replace(prefix, "")) + 1
        except (ValueError, AttributeError):
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"

def generate_pdc_reference(db: Session) -> str:
    """Generate a unique PDC reference by finding the current MAX sequence number."""
    prefix = "PDC-RX-"
    # Find the highest existing sequence number across ALL pdc_received records
    latest = db.query(func.max(PDCReceived.pdc_receipt_reference)).filter(
        PDCReceived.pdc_receipt_reference.like(f"{prefix}%")
    ).scalar()
    if latest:
        try:
            seq = int(latest.replace(prefix, "")) + 1
        except (ValueError, AttributeError):
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:05d}"

@router.post("/", response_model=RentalReceiptResponse, status_code=status.HTTP_201_CREATED)
def create_receipt(
    receipt_in: RentalReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator", "Camp Supervisor"]))
):
    # 1. Validation: Sum of lines must equal header total (rounded to 2 decimal places)
    from decimal import Decimal as D, ROUND_HALF_UP
    total_lines_sum = sum(line.amount for line in receipt_in.payment_lines)
    total_header = receipt_in.total_amount
    diff = abs(total_lines_sum - total_header)
    if diff > D("0.01"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Receipt total ({total_header}) does not match sum of payment lines ({total_lines_sum}). Difference: {diff}"
        )
    # Normalise header total to match lines sum to avoid any downstream mismatch
    receipt_in.total_amount = total_lines_sum
        
    # 1b. Validation & Population: Resolve from Lease
    lease = db.query(Lease).filter(Lease.lease_id == receipt_in.lease_id).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
        
    lease_version = db.query(LeaseVersion).filter(LeaseVersion.version_id == receipt_in.lease_version_id).first()
    if not lease_version:
        raise HTTPException(status_code=404, detail="Lease version not found")
        
    if not receipt_in.tenant_id:
        receipt_in.tenant_id = lease.tenant_id
    if not receipt_in.property_id:
        receipt_in.property_id = lease.property_id
    if not receipt_in.unit_id:
        receipt_in.unit_id = lease.unit_id
        
    if lease_version.currency != receipt_in.currency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Receipt currency ({receipt_in.currency}) must match lease currency ({lease_version.currency})."
        )
    
    # 2. Validation: No duplicate cheques in this receipt
    cheque_numbers = [
        line.cheque_number for line in receipt_in.payment_lines 
        if line.instrument_type == "PDC" or line.instrument_type == "Current-Dated Cheque"
    ]
    if len(cheque_numbers) != len(set(cheque_numbers)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate cheque numbers found in payment lines."
        )
        
    # 3. Create Receipt Header
    db_receipt = RentalReceipt(
        receipt_number=generate_receipt_number(db),
        receipt_date=receipt_in.receipt_date,
        tenant_id=receipt_in.tenant_id,
        property_id=receipt_in.property_id,
        unit_id=receipt_in.unit_id,
        lease_id=receipt_in.lease_id,
        lease_version_id=receipt_in.lease_version_id,
        payment_purpose=receipt_in.payment_purpose,
        currency=receipt_in.currency,
        total_amount=receipt_in.total_amount,
        receipt_status="Draft",
        received_by=current_user.user_id,
        remarks=receipt_in.remarks,
        attachment_path=receipt_in.attachment_path
    )
    db.add(db_receipt)
    db.flush()
    
    # 4. Create Payment Lines and corresponding PDCReceived records
    for idx, line_in in enumerate(receipt_in.payment_lines, start=1):
        if line_in.amount <= 0:
            raise HTTPException(status_code=400, detail="Cheque amount must be greater than zero.")
            
        # Create line
        db_line = RentalReceiptPaymentLine(
            receipt_id=db_receipt.receipt_id,
            lease_version_id=receipt_in.lease_version_id,
            line_number=idx,
            instrument_type=line_in.instrument_type,
            amount=line_in.amount,
            cheque_number=line_in.cheque_number,
            bank_name=line_in.bank_name,
            account_holder=line_in.account_holder,
            instrument_date=line_in.instrument_date,
            rental_period_from=line_in.rental_period_from,
            rental_period_to=line_in.rental_period_to,
            receivable_id=line_in.receivable_id,
            attachment_path=line_in.attachment_path,
            remarks=line_in.remarks
        )
        db.add(db_line)
        db.flush()
        
        # If it's a cheque, auto-create PDCReceived
        is_cheque = line_in.instrument_type in ["PDC", "Current-Dated Cheque"]
        if is_cheque:
            if not line_in.cheque_number or not line_in.bank_name or not line_in.instrument_date:
                raise HTTPException(status_code=400, detail="Cheque number, bank name, and date are required for cheques.")
                
            today = datetime.utcnow().date()
            days_until = (line_in.instrument_date - today).days
            initial_status = "Due Soon" if days_until <= 7 else "Received"

            db_pdc = PDCReceived(
                pdc_receipt_reference=generate_pdc_reference(db),
                property_id=receipt_in.property_id,
                unit_id=receipt_in.unit_id,
                tenant_id=receipt_in.tenant_id,
                lease_id=receipt_in.lease_id,
                lease_version_id=receipt_in.lease_version_id,
                receivable_id=line_in.receivable_id,
                cheque_number=line_in.cheque_number,
                bank_name=line_in.bank_name,
                account_holder=line_in.account_holder,
                cheque_date=line_in.instrument_date,
                cheque_amount=line_in.amount,
                rental_period_from=line_in.rental_period_from,
                rental_period_to=line_in.rental_period_to,
                date_received=receipt_in.receipt_date,
                received_by=current_user.user_id,
                status=initial_status
            )
            db.add(db_pdc)
            db.flush()
            
            # Link line to PDC
            db_line.pdc_received_id = db_pdc.pdc_received_id
            
            # Create Status History
            db_history = PDCReceivedStatusHistory(
                pdc_received_id=db_pdc.pdc_received_id,
                old_status=None,
                new_status=initial_status,
                change_reason="Receipt Created",
                changed_by=current_user.user_id
            )
            db.add(db_history)

    db.commit()
    db.refresh(db_receipt)
    return db_receipt


@router.get("/", response_model=List[RentalReceiptResponse])
def get_receipts(
    skip: int = 0, limit: int = 5000, 
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(RentalReceipt)
    if status_filter:
        query = query.filter(RentalReceipt.receipt_status == status_filter)
    
    return query.order_by(RentalReceipt.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{receipt_id}", response_model=RentalReceiptResponse)
def get_receipt(
    receipt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    receipt = db.query(RentalReceipt).filter(RentalReceipt.receipt_id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.post("/{receipt_id}/post", response_model=RentalReceiptResponse)
def post_receipt(
    receipt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator", "Camp Supervisor"]))
):
    receipt = db.query(RentalReceipt).filter(RentalReceipt.receipt_id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
        
    if receipt.receipt_status == "Posted":
        raise HTTPException(status_code=400, detail="Receipt is already posted.")
        
    if not receipt.tenant_id or not receipt.property_id or not receipt.lease_id:
        raise HTTPException(status_code=400, detail="Cannot post receipt: Missing mandatory fields (tenant, property, or lease).")
        
    receipt.receipt_status = "Posted"
    receipt.posted_at = datetime.utcnow()
    receipt.posted_by = current_user.user_id
    
    # NEW: If the property is a Labour Camp, extend the tenancy contract expiry by 1 calendar month
    from app.models.property import Property
    from app.models.tenant import Lease, LeaseVersion
    import calendar

    prop = db.query(Property).filter(Property.property_id == receipt.property_id).first()
    if prop and prop.property_type == "Labour Camp":
        lease = db.query(Lease).filter(Lease.lease_id == receipt.lease_id).first()
        if lease:
            current_version = db.query(LeaseVersion).filter(
                LeaseVersion.lease_id == lease.lease_id,
                LeaseVersion.is_current_version == True
            ).first()
            if current_version:
                d = current_version.contract_end_date if current_version.contract_end_date else receipt.receipt_date
                if d:
                    month = d.month
                    year = d.year
                    day = d.day
                    if month == 12:
                        month = 1
                        year += 1
                    else:
                        month += 1
                    max_day = calendar.monthrange(year, month)[1]
                    if day > max_day:
                        day = max_day
                    new_expiry = d.replace(year=year, month=month, day=day)
                    
                    current_version.contract_end_date = new_expiry
                    
                    if lease.status == "Expired":
                        lease.status = "Active"
                        current_version.status = "Active"
                        
    db.commit()
    db.refresh(receipt)
    return receipt


@router.post("/{receipt_id}/reverse", response_model=RentalReceiptResponse)
def reverse_receipt(
    receipt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Managing Director", "Administrator"]))
):
    receipt = db.query(RentalReceipt).filter(RentalReceipt.receipt_id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
        
    if receipt.receipt_status != "Posted":
        raise HTTPException(status_code=400, detail="Only posted receipts can be reversed.")
        
    receipt.receipt_status = "Reversed"
    
    # Cancel all linked PDCs
    pdcs = db.query(PDCReceived).join(RentalReceiptPaymentLine, PDCReceived.pdc_received_id == RentalReceiptPaymentLine.pdc_received_id).filter(
        RentalReceiptPaymentLine.receipt_id == receipt_id
    ).all()
    
    for pdc in pdcs:
        history = PDCReceivedStatusHistory(
            pdc_received_id=pdc.pdc_received_id,
            old_status=pdc.status,
            new_status="Cancelled",
            change_reason="Receipt Reversed",
            changed_by=current_user.user_id,
            notes=f"Reversed via receipt {receipt.receipt_number}"
        )
        db.add(history)
        pdc.status = "Cancelled"
        
    db.commit()
    db.refresh(receipt)
    return receipt

