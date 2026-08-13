from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database.session import get_db
from app.api.deps import get_current_active_user, require_roles
from app.models.auth import User
from app.models.pdc import (
    BankAccount, ChequeBook, ChequeLeaf, PDCIssued, 
    PDCIssuedStatusHistory, AuthorizedSignatory
)
from app.schemas.pdc_issued import (
    BankAccountResponse, ChequeBookCreate, ChequeBookResponse,
    ChequeLeafResponse, PDCIssuedCreate, PDCIssuedResponse,
    PDCIssuedUpdate
)
from app.models.finance import AlertLog
from app.models.property import Property

router = APIRouter()

def _add_status_history(db: Session, pdc_issued_id: str, old_status: str, new_status: str, user_id: str, reason: str = None):
    history = PDCIssuedStatusHistory(
        pdc_issued_id=pdc_issued_id,
        old_status=old_status,
        new_status=new_status,
        change_reason=reason,
        changed_by=user_id
    )
    db.add(history)


# =============================================================================
# Bank Accounts
# =============================================================================

@router.get("/bank-accounts", response_model=List[BankAccountResponse])
def get_bank_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    accounts = db.query(BankAccount).filter(BankAccount.status == "Active").all()
    return accounts


# =============================================================================
# Cheque Books
# =============================================================================

@router.get("/cheque-books", response_model=List[ChequeBookResponse])
def get_cheque_books(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    books = db.query(ChequeBook).all()
    # Let's count leaves manually if needed or just return books
    return books

@router.post("/cheque-books", response_model=ChequeBookResponse)
def create_cheque_book(
    book_in: ChequeBookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify bank account
    bank_account = db.query(BankAccount).filter(BankAccount.account_id == book_in.bank_account_id).first()
    if not bank_account:
        raise HTTPException(status_code=404, detail="Bank Account not found")

    new_book = ChequeBook(**book_in.model_dump())
    db.add(new_book)
    db.flush() # To get cheque_book_id

    # Auto-generate cheque leaves
    try:
        from_num = int(book_in.series_from)
        to_num = int(book_in.series_to)
        
        if from_num > to_num:
            raise ValueError
    except ValueError:
        raise HTTPException(status_code=400, detail="series_from and series_to must be valid integers and from <= to")
    
    # Optional: Pad with zeros to match original string length
    padding_length = len(book_in.series_from)
    
    for i in range(from_num, to_num + 1):
        padded_number = str(i).zfill(padding_length)
        leaf = ChequeLeaf(
            cheque_book_id=new_book.cheque_book_id,
            cheque_number=padded_number,
            status="Available"
        )
        db.add(leaf)

    db.commit()
    db.refresh(new_book)
    return new_book

@router.get("/cheque-books/{book_id}/leaves", response_model=List[ChequeLeafResponse])
def get_cheque_leaves(
    book_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    leaves = db.query(ChequeLeaf).filter(ChequeLeaf.cheque_book_id == book_id).order_by(ChequeLeaf.cheque_number).all()
    return leaves


# =============================================================================
# PDC Issued
# =============================================================================

@router.get("", response_model=List[PDCIssuedResponse])
def get_pdc_issued(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    pdcs = db.query(PDCIssued).order_by(PDCIssued.created_at.desc()).all()
    return pdcs

@router.get("/{pdc_id}", response_model=PDCIssuedResponse)
def get_pdc_issued_detail(
    pdc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    pdc = db.query(PDCIssued).filter(PDCIssued.pdc_issued_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
    return pdc

@router.post("", response_model=PDCIssuedResponse)
def create_pdc_issued(
    pdc_in: PDCIssuedCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Validate leaf availability
    leaf = db.query(ChequeLeaf).filter(
        ChequeLeaf.cheque_number == pdc_in.cheque_number,
        ChequeLeaf.status == "Available"
    ).first()
    
    if not leaf:
        raise HTTPException(status_code=400, detail="Cheque leaf not available or doesn't exist")
        
    # Check if cheque book belongs to the right bank account
    if leaf.cheque_book.bank_account_id != pdc_in.bank_account_id:
        raise HTTPException(status_code=400, detail="Cheque leaf does not belong to selected bank account")
        
    # Check related references (at least one must be provided)
    if not any([pdc_in.related_property_id, pdc_in.related_loan_id, 
                pdc_in.related_lpo_id, pdc_in.related_invoice_id, 
                pdc_in.related_payment_voucher_id]):
        raise HTTPException(status_code=400, detail="PDC must be linked to a property, loan, invoice, LPO, or payment voucher")

    # generate ref
    today = datetime.now()
    count = db.query(PDCIssued).count() + 1
    ref = f"PDC-OUT-{today.strftime('%Y%m')}-{count:04d}"

    new_pdc = PDCIssued(
        **pdc_in.model_dump(),
        pdc_issue_reference=ref,
        status="Draft",
        prepared_by=current_user.user_id
    )
    db.add(new_pdc)
    db.flush()

    # Update leaf
    leaf.status = "Issued"
    leaf.issued_to = new_pdc.pdc_issued_id
    
    # Status history
    _add_status_history(db, new_pdc.pdc_issued_id, None, "Draft", current_user.user_id, "Initial Draft")

    db.commit()
    db.refresh(new_pdc)
    return new_pdc


@router.post("/{pdc_id}/approve", response_model=PDCIssuedResponse)
def approve_pdc_issued(
    pdc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Managing Director"]))
):
    pdc = db.query(PDCIssued).filter(PDCIssued.pdc_issued_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    if pdc.status != "Draft":
        raise HTTPException(status_code=400, detail=f"Cannot approve PDC in status: {pdc.status}")

    pdc.status = "Approved"
    pdc.approved_by = current_user.user_id
    pdc.approved_at = datetime.utcnow()
    
    _add_status_history(db, pdc.pdc_issued_id, "Draft", "Approved", current_user.user_id, "MD Approval")
    
    db.commit()
    db.refresh(pdc)
    return pdc


@router.post("/{pdc_id}/issue", response_model=PDCIssuedResponse)
def issue_pdc(
    pdc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    pdc = db.query(PDCIssued).filter(PDCIssued.pdc_issued_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    if pdc.status != "Approved":
        raise HTTPException(status_code=400, detail="PDC must be approved before issuing")
        
    pdc.status = "Issued"
    pdc.date_issued = datetime.utcnow().date()
    
    _add_status_history(db, pdc.pdc_issued_id, "Approved", "Issued", current_user.user_id, "Issued to payee")
    
    db.commit()
    db.refresh(pdc)
    return pdc


@router.post("/{pdc_id}/clear", response_model=PDCIssuedResponse)
def clear_pdc(
    pdc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    pdc = db.query(PDCIssued).filter(PDCIssued.pdc_issued_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    if pdc.status not in ["Issued", "Due Soon", "Presented"]:
        raise HTTPException(status_code=400, detail=f"Cannot clear PDC in status: {pdc.status}")
        
    old_status = pdc.status
    pdc.status = "Cleared"
    pdc.cleared_at = datetime.utcnow()
    
    _add_status_history(db, pdc.pdc_issued_id, old_status, "Cleared", current_user.user_id, "Cleared by bank")
    
    db.commit()
    db.refresh(pdc)
    return pdc


@router.post("/{pdc_id}/return", response_model=PDCIssuedResponse)
def return_pdc(
    pdc_id: str,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    pdc = db.query(PDCIssued).filter(PDCIssued.pdc_issued_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    if pdc.status not in ["Issued", "Due Soon", "Presented"]:
        raise HTTPException(status_code=400, detail=f"Cannot return PDC in status: {pdc.status}")
        
    old_status = pdc.status
    pdc.status = "Returned"
    
    _add_status_history(db, pdc.pdc_issued_id, old_status, "Returned", current_user.user_id, f"Returned: {reason}")
    
    db.commit()
    db.refresh(pdc)
    return pdc

@router.put("/{pdc_id}", response_model=PDCIssuedResponse)
def update_pdc_issued(
    pdc_id: str,
    update_data: PDCIssuedUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"]))
):
    pdc = db.query(PDCIssued).filter(PDCIssued.pdc_issued_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(pdc, key, value)

    db.commit()
    db.refresh(pdc)
    return pdc

@router.delete("/{pdc_id}")
def delete_pdc_issued(
    pdc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"]))
):
    pdc = db.query(PDCIssued).filter(PDCIssued.pdc_issued_id == pdc_id).first()
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC not found")
        
    db.delete(pdc)
    db.commit()
    return {"ok": True}
