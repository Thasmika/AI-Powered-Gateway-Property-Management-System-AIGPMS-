"""
Finance & Loans API — Sprint 7
================================
Endpoints:
  GET/POST   /api/v1/loans
  GET/PUT    /api/v1/loans/{id}
  GET/POST   /api/v1/loans/{id}/instalments
  PUT        /api/v1/loans/{id}/instalments/{inst_id}
  GET/POST   /api/v1/payment-vouchers
  GET/PUT/DELETE /api/v1/payment-vouchers/{id}
  POST       /api/v1/payment-vouchers/{id}/approve
  POST       /api/v1/payment-vouchers/{id}/reject
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.database.session import get_db
from app.api.deps import get_current_active_user, require_roles
from app.models.auth import User
from app.models.loans import Loan, LoanInstalment, LoanDocument, PaymentVoucher
from app.models.pdc import PDCIssued, BankAccount
from app.models.master_data import Supplier
from app.models.finance import Expense
from app.schemas.loans import (
    LoanCreate, LoanUpdate, LoanResponse,
    LoanInstalmentCreate, LoanInstalmentUpdate, LoanInstalmentResponse,
    LoanDocumentCreate, LoanDocumentResponse,
    PaymentVoucherCreate, PaymentVoucherUpdate, PaymentVoucherResponse,
    PaymentVoucherApproveAction, PaymentVoucherRejectAction,
)

router = APIRouter()


def _resolve_voucher_links(db: Session, fields: dict) -> None:
    """Validate payee/bank FKs and keep payee_name in sync with the payee master record."""
    if fields.get("payee_id"):
        payee = db.query(Supplier).filter(Supplier.supplier_id == fields["payee_id"]).first()
        if not payee:
            raise HTTPException(status_code=400, detail="Selected payee not found")
        fields["payee_name"] = payee.supplier_name
    if fields.get("bank_account_id"):
        if not db.query(BankAccount).filter(BankAccount.account_id == fields["bank_account_id"]).first():
            raise HTTPException(status_code=400, detail="Selected bank account not found")
    method = fields.get("payment_method")
    if "bank_account_id" in fields and not fields.get("bank_account_id") and method and method != "Cash":
        raise HTTPException(status_code=400, detail="Bank account is required unless payment method is Cash")


def _check_expense_link(db: Session, expense_id: Optional[str], amount, exclude_voucher_id: Optional[str] = None,
                        fields: Optional[dict] = None) -> None:
    """A voucher linked to an expense must not push total payments above the expense total."""
    if not expense_id:
        return
    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=400, detail="Linked expense not found")
    if fields is not None and not fields.get("property_id") and expense.property_id:
        fields["property_id"] = expense.property_id
    other_paid = sum(
        (Decimal(pv.amount or 0) for pv in expense.payment_vouchers
         if pv.voucher_id != exclude_voucher_id and pv.approval_status not in Expense.VOID_VOUCHER_STATUSES),
        Decimal("0"),
    )
    remaining = Decimal(expense.total_amount or 0) - other_paid
    if Decimal(str(amount or 0)) > remaining + Decimal("0.005"):
        raise HTTPException(
            status_code=400,
            detail=f"Amount exceeds the balance of expense {expense.expense_reference} "
                   f"(balance AED {remaining:,.2f} of AED {Decimal(expense.total_amount or 0):,.2f})",
        )

# =============================================================================
# Payment Vouchers
# =============================================================================

@router.get("/payment-vouchers", response_model=List[PaymentVoucherResponse], tags=["Finance & Loans"])
def list_payment_vouchers(
    approval_status: Optional[str] = None,
    payee_type: Optional[str] = None,
    property_id: Optional[str] = None,
    bank_account_id: Optional[str] = None,
    payee_id: Optional[str] = None,
    expense_id: Optional[str] = None,
    unlinked: Optional[bool] = Query(None, description="true = only vouchers not linked to an expense"),
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(PaymentVoucher)
    if expense_id:
        q = q.filter(PaymentVoucher.expense_id == expense_id)
    if unlinked is True:
        q = q.filter(PaymentVoucher.expense_id.is_(None))
    elif unlinked is False:
        q = q.filter(PaymentVoucher.expense_id.isnot(None))
    if approval_status:
        q = q.filter(PaymentVoucher.approval_status == approval_status)
    if payee_type:
        q = q.filter(PaymentVoucher.payee_type == payee_type)
    if property_id:
        q = q.filter(PaymentVoucher.property_id == property_id)
    if bank_account_id:
        q = q.filter(PaymentVoucher.bank_account_id == bank_account_id)
    if payee_id:
        q = q.filter(PaymentVoucher.payee_id == payee_id)
    return q.order_by(PaymentVoucher.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/payment-vouchers", response_model=PaymentVoucherResponse, status_code=201, tags=["Finance & Loans"])
def create_payment_voucher(
    data: PaymentVoucherCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    # Use the highest existing sequence (not row count) so deletions never cause duplicates.
    max_seq = 0
    for (existing_no,) in db.query(PaymentVoucher.voucher_number).all():
        try:
            max_seq = max(max_seq, int(str(existing_no).rsplit("-", 1)[-1]))
        except (ValueError, TypeError):
            continue
    voucher_no = f"PV-{datetime.now().strftime('%Y%m')}-{max_seq + 1:04d}"
    fields = data.model_dump()
    _resolve_voucher_links(db, fields)
    if fields.get("amount") is None or fields["amount"] <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    _check_expense_link(db, fields.get("expense_id"), fields["amount"], fields=fields)
    # Vouchers are issued directly on creation — no separate approval step.
    pv = PaymentVoucher(
        **fields,
        voucher_number=voucher_no,
        approval_status="Approved",
        prepared_by=current_user.user_id,
        approved_by=current_user.user_id,
        approved_at=datetime.utcnow(),
    )
    db.add(pv)
    db.commit()
    db.refresh(pv)
    return pv


@router.put("/payment-vouchers/{voucher_id}", response_model=PaymentVoucherResponse, tags=["Finance & Loans"])
def update_payment_voucher(
    voucher_id: str,
    data: PaymentVoucherUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    pv = db.query(PaymentVoucher).filter(PaymentVoucher.voucher_id == voucher_id).first()
    if not pv:
        raise HTTPException(status_code=404, detail="Payment Voucher not found")
    updates = data.model_dump(exclude_unset=True)
    if "bank_account_id" in updates:
        updates.setdefault("payment_method", pv.payment_method)
    _resolve_voucher_links(db, updates)
    if "payee_name" in updates and not (updates["payee_name"] or "").strip():
        raise HTTPException(status_code=400, detail="Payee name is required")
    if "amount" in updates and (updates["amount"] is None or updates["amount"] <= 0):
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if "expense_id" in updates or "amount" in updates:
        _check_expense_link(
            db,
            updates.get("expense_id", pv.expense_id),
            updates.get("amount", pv.amount),
            exclude_voucher_id=pv.voucher_id,
            fields=updates if updates.get("expense_id") and updates["expense_id"] != pv.expense_id else None,
        )
    for k, v in updates.items():
        setattr(pv, k, v)
    pv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pv)
    return pv


@router.delete("/payment-vouchers/{voucher_id}", status_code=204, tags=["Finance & Loans"])
def delete_payment_voucher(
    voucher_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    pv = db.query(PaymentVoucher).filter(PaymentVoucher.voucher_id == voucher_id).first()
    if not pv:
        raise HTTPException(status_code=404, detail="Payment Voucher not found")
    # Unlink any issued PDCs that point to this voucher.
    db.query(PDCIssued).filter(PDCIssued.related_payment_voucher_id == voucher_id).update(
        {PDCIssued.related_payment_voucher_id: None}, synchronize_session=False
    )
    db.delete(pv)
    db.commit()
    return None


@router.get("/payment-vouchers/{voucher_id}", response_model=PaymentVoucherResponse, tags=["Finance & Loans"])
def get_payment_voucher(
    voucher_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pv = db.query(PaymentVoucher).filter(PaymentVoucher.voucher_id == voucher_id).first()
    if not pv:
        raise HTTPException(status_code=404, detail="Payment Voucher not found")
    return pv


@router.post("/payment-vouchers/{voucher_id}/approve", response_model=PaymentVoucherResponse, tags=["Finance & Loans"])
def approve_payment_voucher(
    voucher_id: str,
    action: PaymentVoucherApproveAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Managing Director", "Administrator"])),
):
    pv = db.query(PaymentVoucher).filter(PaymentVoucher.voucher_id == voucher_id).first()
    if not pv:
        raise HTTPException(status_code=404, detail="Payment Voucher not found")
    if pv.approval_status != "Pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve voucher in status: {pv.approval_status}")
    pv.approval_status = "Approved"
    pv.approved_by = current_user.user_id
    pv.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(pv)
    return pv


@router.post("/payment-vouchers/{voucher_id}/reject", response_model=PaymentVoucherResponse, tags=["Finance & Loans"])
def reject_payment_voucher(
    voucher_id: str,
    action: PaymentVoucherRejectAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Managing Director", "Administrator"])),
):
    pv = db.query(PaymentVoucher).filter(PaymentVoucher.voucher_id == voucher_id).first()
    if not pv:
        raise HTTPException(status_code=404, detail="Payment Voucher not found")
    if pv.approval_status != "Pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject voucher in status: {pv.approval_status}")
    pv.approval_status = "Rejected"
    pv.rejection_reason = action.reason
    db.commit()
    db.refresh(pv)
    return pv



# =============================================================================
# Loans
# =============================================================================

@router.get("", response_model=List[LoanResponse], tags=["Finance & Loans"])
def list_loans(
    status: Optional[str] = None,
    property_id: Optional[str] = None,
    title_deed_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Loan)
    if status:
        q = q.filter(Loan.status == status)
    if property_id:
        q = q.filter(Loan.property_id == property_id)
    if title_deed_id:
        q = q.filter(Loan.title_deed_id == title_deed_id)
    return q.order_by(Loan.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=LoanResponse, status_code=201, tags=["Finance & Loans"])
def create_loan(
    data: LoanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    count = db.query(Loan).count() + 1
    ref = f"LOAN-{datetime.now().strftime('%Y%m')}-{count:04d}"

    instalments_data = data.instalments or []
    loan_dict = data.model_dump(exclude={"instalments"})
    loan = Loan(
        **loan_dict,
        loan_reference=ref,
        outstanding_balance=loan_dict.get("outstanding_balance") or loan_dict.get("principal_amount"),
        created_by=current_user.user_id,
    )
    db.add(loan)
    db.flush()

    for inst in instalments_data:
        li = LoanInstalment(loan_id=loan.loan_id, **inst.model_dump())
        db.add(li)

    db.commit()
    db.refresh(loan)
    return loan


@router.get("/{loan_id}", response_model=LoanResponse, tags=["Finance & Loans"])
def get_loan(
    loan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan


@router.put("/{loan_id}", response_model=LoanResponse, tags=["Finance & Loans"])
def update_loan(
    loan_id: str,
    data: LoanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(loan, k, v)
    loan.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(loan)
    return loan


# =============================================================================
# Loan Instalments
# =============================================================================

@router.get("/{loan_id}/instalments", response_model=List[LoanInstalmentResponse], tags=["Finance & Loans"])
def get_instalments(
    loan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return db.query(LoanInstalment).filter(
        LoanInstalment.loan_id == loan_id
    ).order_by(LoanInstalment.instalment_number).all()


@router.post("/{loan_id}/instalments", response_model=LoanInstalmentResponse, status_code=201, tags=["Finance & Loans"])
def add_instalment(
    loan_id: str,
    data: LoanInstalmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    inst = LoanInstalment(loan_id=loan_id, **data.model_dump())
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst


@router.put("/{loan_id}/instalments/{inst_id}", response_model=LoanInstalmentResponse, tags=["Finance & Loans"])
def update_instalment(
    loan_id: str,
    inst_id: str,
    data: LoanInstalmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    inst = db.query(LoanInstalment).filter(
        LoanInstalment.instalment_id == inst_id,
        LoanInstalment.loan_id == loan_id
    ).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instalment not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(inst, k, v)
    db.commit()
    db.refresh(inst)
    return inst


