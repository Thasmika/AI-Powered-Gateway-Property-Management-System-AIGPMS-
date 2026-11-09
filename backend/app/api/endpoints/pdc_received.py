from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

from app.database.session import get_db
from app.api.deps import get_current_active_user, require_roles
from app.models.auth import User
from app.models.pdc import (
    PDCReceived, PDCReceivedStatusHistory, ChequeReturn, ChequeReplacement
)
from app.schemas.pdc import (
    PDCReceivedResponse, PDCStatusUpdate, ChequeReturnCreate, ChequeReplacementCreate, PDCReceivedUpdate
)
from pydantic import BaseModel

class PDCAttachmentUpdate(BaseModel):
    attachment_path: str


router = APIRouter()

def generate_pdc_reference(db: Session) -> str:
    """Generate a unique PDC reference by finding the current MAX sequence number."""
    prefix = "PDC-RX-"
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

# ── Summary stats endpoint (always full picture, unaffected by filters) ──────
@router.get("/stats", response_model=dict)
def get_pdc_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Returns aggregate counts and total value across ALL PDC records.
    Used by the KPI strip so summary cards are always accurate regardless
    of what filter the user has applied to the table.
    """
    from datetime import timedelta
    today = datetime.utcnow().date()
    due_soon_date = today + timedelta(days=14)
    active_statuses = ["Received", "Held", "Due Soon", "Overdue"]

    all_pdcs = db.query(PDCReceived).all()

    stats = {
        "total": 0,
        "received_held": 0,
        "due_soon": 0,
        "overdue": 0,
        "deposited": 0,
        "cleared": 0,
        "returned": 0,
        "total_value": 0.0,
        "cleared_value": 0.0,
    }

    for pdc in all_pdcs:
        stats["total"] += 1
        
        # Safely parse amount
        amt = 0.0
        if pdc.cheque_amount is not None:
            try:
                amt_str = str(pdc.cheque_amount).replace(',', '').strip()
                amt = float(amt_str or 0)
            except (ValueError, TypeError):
                amt = 0.0
                
        stats["total_value"] += amt

        # Dynamically resolve effective status
        eff_status = pdc.status
        if pdc.status in active_statuses and pdc.cheque_date:
            try:
                # Ensure cheque_date is a date object (SQLite may return it as a string)
                c_date = pdc.cheque_date
                if isinstance(c_date, str):
                    from datetime import datetime as dt_parser
                    c_date = dt_parser.strptime(c_date, "%Y-%m-%d").date()

                if c_date < today:
                    eff_status = "Overdue"
                elif c_date <= due_soon_date:
                    eff_status = "Due Soon"
                else:
                    eff_status = "Received"
            except Exception:
                pass  # Fallback to stored status if date parsing fails

        if eff_status in ("Received", "Held"):
            stats["received_held"] += 1
        elif eff_status == "Due Soon":
            stats["due_soon"] += 1
        elif eff_status == "Overdue":
            stats["overdue"] += 1
        elif eff_status == "Deposited":
            stats["deposited"] += 1
        elif eff_status == "Cleared":
            stats["cleared"] += 1
            stats["cleared_value"] += amt
        elif eff_status == "Returned":
            stats["returned"] += 1

    return stats


@router.get("/", response_model=List[PDCReceivedResponse])
def get_pdc_register(
    skip: int = 0,
    limit: int = 5000,
    status_filter: str = None,
    show_all: bool = False,          # explicit opt-in to see everything
    tenant_id: str = None,
    lease_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Returns PDC records.

    Default behaviour (no params): returns only ACTIVE cheques
    (Overdue, Due Soon, Received, Held, Returned) — sorted with
    most urgent first.  Deposited / Cleared / Replaced cheques are
    excluded by default because over time they dominate the list.

    To see Deposited / Cleared records, either:
      - Pass status_filter=Deposited  (or Cleared)
      - Pass show_all=true
    """
    query = db.query(PDCReceived)
    today = datetime.utcnow().date()
    from datetime import timedelta
    due_soon_date = today + timedelta(days=14)

    # Statuses that are considered "active" (need attention)
    active_statuses = ["Received", "Held", "Due Soon", "Overdue"]
    # Statuses hidden by default (historical / completed)
    hidden_statuses = ["Deposited", "Cleared", "Replaced", "Cancelled"]

    if status_filter == "Overdue":
        query = query.filter(
            PDCReceived.status.in_(active_statuses),
            PDCReceived.cheque_date < today
        )
    elif status_filter == "Due Soon":
        query = query.filter(
            PDCReceived.status.in_(active_statuses),
            PDCReceived.cheque_date >= today,
            PDCReceived.cheque_date <= due_soon_date
        )
    elif status_filter == "Received":
        query = query.filter(
            PDCReceived.status == "Received",
            PDCReceived.cheque_date > due_soon_date
        )
    elif status_filter:
        # Specific filter selected by user (e.g. Deposited, Cleared)
        query = query.filter(PDCReceived.status == status_filter)
    elif not show_all:
        # ── DEFAULT: exclude completed/historical cheques ─────────────────
        # Show Returned as well — those need follow-up action
        query = query.filter(PDCReceived.status.notin_(hidden_statuses))

    if tenant_id:
        query = query.filter(PDCReceived.tenant_id == tenant_id)
    if lease_id:
        query = query.filter(PDCReceived.lease_id == lease_id)

    pdcs = query.order_by(PDCReceived.cheque_date.asc()).offset(skip).limit(limit).all()

    # ── Dynamically resolve effective status ─────────────────────────────
    # Safety net: if a cheque date was postponed the stored status may be
    # stale. Always surface the correct status based on today's date.
    for pdc in pdcs:
        if pdc.status in active_statuses and pdc.cheque_date:
            if pdc.cheque_date < today:
                pdc.status = "Overdue"
            elif pdc.cheque_date <= due_soon_date:
                pdc.status = "Due Soon"
            else:
                pdc.status = "Received"

    return pdcs


@router.get("/{pdc_id}", response_model=PDCReceivedResponse)
def get_pdc_detail(
    pdc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    pdc = db.query(PDCReceived).filter(PDCReceived.pdc_received_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
    # Dynamically recompute status on detail view too
    active_statuses = ["Received", "Held", "Due Soon", "Overdue"]
    today = datetime.utcnow().date()
    from datetime import timedelta
    due_soon_date = today + timedelta(days=14)
    if pdc.status in active_statuses and pdc.cheque_date:
        if pdc.cheque_date < today:
            pdc.status = "Overdue"
        elif pdc.cheque_date <= due_soon_date:
            pdc.status = "Due Soon"
        else:
            pdc.status = "Received"  # date is safely in the future
    return pdc


@router.patch("/{pdc_id}/attachment", response_model=PDCReceivedResponse)
def update_pdc_attachment(
    pdc_id: str,
    update_data: PDCAttachmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    pdc = db.query(PDCReceived).filter(PDCReceived.pdc_received_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    pdc.attachment_path = update_data.attachment_path
    db.commit()
    db.refresh(pdc)
    return pdc


@router.post("/{pdc_id}/deposit", response_model=PDCReceivedResponse)
def deposit_pdc(
    pdc_id: str,
    update_data: PDCStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"]))
):
    pdc = db.query(PDCReceived).filter(PDCReceived.pdc_received_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    if pdc.status not in ["Received", "Due Soon", "Held", "Overdue"]:
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
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"]))
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
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"]))
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
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"]))
):
    old_pdc = db.query(PDCReceived).filter(PDCReceived.pdc_received_id == pdc_id).first()
    if not old_pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    if old_pdc.status not in ["Returned", "Held", "Received"]:
        raise HTTPException(status_code=400, detail=f"Cannot replace PDC with status {old_pdc.status}")
        
    today = datetime.utcnow().date()
    days_until = (replace_data.cheque_date - today).days
    initial_status = "Due Soon" if days_until <= 14 else "Received"

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
        date_received=replace_data.replacement_date or today,
        received_by=current_user.user_id,
        attachment_path=replace_data.attachment_path,
        remarks=f"Replacement for {old_pdc.cheque_number}",
        status=initial_status
    )
    db.add(new_pdc)
    db.flush()
    
    # Create Replacement Record linking the two
    replacement = ChequeReplacement(
        original_pdc_id=old_pdc.pdc_received_id,
        replacement_pdc_id=new_pdc.pdc_received_id,
        replacement_reason=replace_data.replacement_reason,
        replaced_by=current_user.user_id,
        replacement_date=replace_data.replacement_date or today,
        notes=replace_data.notes
    )
    db.add(replacement)
    
    # Mark old PDC as Replaced
    log_status_change(db, old_pdc, "Replaced", replace_data.replacement_reason, current_user.user_id, replace_data.notes)
    
    # Log creation of new PDC
    log_status_change(db, new_pdc, initial_status, "Cheque Replacement", current_user.user_id)
    
    db.commit()
    db.refresh(old_pdc)
    return old_pdc

@router.put("/{pdc_id}", response_model=PDCReceivedResponse)
def update_pdc(
    pdc_id: str,
    update_data: PDCReceivedUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"]))
):
    pdc = db.query(PDCReceived).filter(PDCReceived.pdc_received_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")

    update_dict = update_data.model_dump(exclude_unset=True)

    # Statuses that are driven by cheque_date — can be auto-recalculated
    active_statuses = ["Received", "Held", "Due Soon", "Overdue"]

    status_changed = False
    old_status = pdc.status

    for key, value in update_dict.items():
        if key == 'status' and value != pdc.status:
            status_changed = True
        setattr(pdc, key, value)

    # ── KEY FIX ────────────────────────────────────────────────────────────
    # When cheque_date is updated (e.g. client requests postponement), the
    # status stored in DB may be stale ("Overdue" for an old date).  We must
    # recalculate the correct status based on the NEW date and persist it so
    # the register does not keep showing the PDC as Overdue after postponement.
    if 'cheque_date' in update_dict and pdc.cheque_date and old_status in active_statuses:
        from datetime import timedelta
        today = datetime.utcnow().date()
        due_soon_date = today + timedelta(days=14)

        if pdc.cheque_date < today:
            recalculated_status = "Overdue"
        elif pdc.cheque_date <= due_soon_date:
            recalculated_status = "Due Soon"
        else:
            recalculated_status = "Received"

        if recalculated_status != old_status:
            log_status_change(
                db, pdc, recalculated_status,
                f"Auto-recalculated after cheque date changed to {pdc.cheque_date}",
                current_user.user_id
            )
            status_changed = False  # already handled by log_status_change above
    # ───────────────────────────────────────────────────────────────────────

    if status_changed:
        log_status_change(db, pdc, pdc.status, "Manual Status Update", current_user.user_id, "Updated via edit form")

    db.commit()
    db.refresh(pdc)
    return pdc

@router.delete("/{pdc_id}")
def delete_pdc(
    pdc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"]))
):
    pdc = db.query(PDCReceived).filter(PDCReceived.pdc_received_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    db.delete(pdc)
    db.commit()
    return {"ok": True}
