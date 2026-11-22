"""
Expense Management API — Sprint 7
====================================
Endpoints:
  GET/POST  /api/v1/expenses
  GET/PUT   /api/v1/expenses/{id}
  POST      /api/v1/expenses/{id}/approve
  POST      /api/v1/expenses/{id}/reject
  GET/POST  /api/v1/expenses/categories
  GET/POST  /api/v1/expenses/cost-centres

Business Rules (PM Approved):
  - expense_class must be 'General' or 'Property'
  - Property expenses must have property_id
  - If is_shared = True, allocations must exist and sum to 100%
  - All 8 allocation methods supported
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.database.session import get_db
from app.api.deps import get_current_active_user, require_roles
from app.models.auth import User
from app.models.finance import (
    CostCentre, ExpenseCategory, Expense, ExpenseAllocation
)
from app.models.master_data import MasterExpenseCategory
from app.models.loans import PaymentVoucher
from app.models.maintenance import MaintenanceTicket
from app.schemas.finance import (
    CostCentreCreate, CostCentreUpdate, CostCentreResponse,
    ExpenseCategoryCreate, ExpenseCategoryUpdate, ExpenseCategoryResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseApprovalAction,
    ExpenseAllocationCreate, ExpenseAllocationResponse,
)
from app.schemas.master_data import MasterExpenseCategoryCreate, MasterExpenseCategoryOut

router = APIRouter()


# =============================================================================
# Cost Centres
# =============================================================================

@router.get("/cost-centres", response_model=List[CostCentreResponse], tags=["Expenses"])
def list_cost_centres(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(CostCentre)
    if is_active is not None:
        q = q.filter(CostCentre.is_active == is_active)
    return q.order_by(CostCentre.code).all()


@router.post("/cost-centres", response_model=CostCentreResponse, status_code=201, tags=["Expenses"])
def create_cost_centre(
    data: CostCentreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    existing = db.query(CostCentre).filter(CostCentre.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Cost centre code '{data.code}' already exists")
    cc = CostCentre(**data.model_dump())
    db.add(cc)
    db.commit()
    db.refresh(cc)
    return cc


@router.put("/cost-centres/{cc_id}", response_model=CostCentreResponse, tags=["Expenses"])
def update_cost_centre(
    cc_id: str,
    data: CostCentreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    cc = db.query(CostCentre).filter(CostCentre.cost_centre_id == cc_id).first()
    if not cc:
        raise HTTPException(status_code=404, detail="Cost Centre not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cc, k, v)
    db.commit()
    db.refresh(cc)
    return cc


# =============================================================================
# Expense Categories
# =============================================================================

@router.get("/categories", tags=["Expenses"])
def list_expense_categories(
    expense_class: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Returns expense categories from master_expense_categories."""
    q = db.query(MasterExpenseCategory)
    if expense_class:
        q = q.filter(MasterExpenseCategory.expense_class == expense_class)
    if is_active is not None:
        q = q.filter(MasterExpenseCategory.is_active == is_active)
    results = q.order_by(MasterExpenseCategory.category_name).all()
    return [
        {
            "category_id": r.category_id,
            "category_name": r.category_name,
            "expense_class": r.expense_class,
            "is_active": r.is_active,
        }
        for r in results
    ]


@router.post("/categories", response_model=MasterExpenseCategoryOut, status_code=201, tags=["Expenses"])
def create_expense_category(
    data: MasterExpenseCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    """Quick-add a category from the Expense form. Writes to master_expense_categories."""
    existing = db.query(MasterExpenseCategory).filter(
        MasterExpenseCategory.category_name == data.category_name,
        MasterExpenseCategory.expense_class == data.expense_class,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Category '{data.category_name}' already exists for {data.expense_class} expenses.")
    cat = MasterExpenseCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/categories/{cat_id}", response_model=ExpenseCategoryResponse, tags=["Expenses"])
def update_expense_category(
    cat_id: str,
    data: ExpenseCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    cat = db.query(ExpenseCategory).filter(ExpenseCategory.category_id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Expense Category not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat


# =============================================================================
# Expenses
# =============================================================================

@router.get("", response_model=List[ExpenseResponse], tags=["Expenses"])
def list_expenses(
    expense_class: Optional[str] = Query(None, description="General or Property"),
    category_id: Optional[str] = None,
    property_id: Optional[str] = None,
    approval_status: Optional[str] = None,
    payment_method: Optional[str] = None,
    payment_status: Optional[str] = Query(None, description="Unpaid | Partially Paid | Paid"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Expense)
    if expense_class:
        q = q.filter(Expense.expense_class == expense_class)
    if category_id:
        q = q.filter(Expense.category_id == category_id)
    if property_id:
        q = q.filter(Expense.property_id == property_id)
    if approval_status:
        q = q.filter(Expense.approval_status == approval_status)
    if payment_method:
        q = q.filter(Expense.payment_method == payment_method)
    if date_from:
        q = q.filter(Expense.invoice_date >= date_from)
    if date_to:
        q = q.filter(Expense.invoice_date <= date_to)
    rows = q.order_by(Expense.created_at.desc()).offset(skip).limit(limit).all()
    if payment_status:
        rows = [e for e in rows if e.payment_status == payment_status]
    return rows


@router.post("", response_model=ExpenseResponse, status_code=201, tags=["Expenses"])
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    # Business Rule: Property expense must have property_id
    if data.expense_class == "Property" and not data.property_id:
        raise HTTPException(
            status_code=400,
            detail="Property expenses must have a property_id"
        )

    # Business Rule: Validate allocations if shared
    allocations_data = data.allocations or []
    if data.is_shared and not allocations_data:
        raise HTTPException(
            status_code=400,
            detail="Shared expenses must have at least one allocation row"
        )
    if data.is_shared and allocations_data:
        total_pct = sum(
            float(a.allocation_percentage or 0) for a in allocations_data
            if a.allocation_method in ("Percentage", "100% to Property")
        )
        # Only validate percentage sum for percentage-based methods
        pct_rows = [a for a in allocations_data if a.allocation_method == "Percentage"]
        if pct_rows:
            pct_sum = sum(float(a.allocation_percentage or 0) for a in pct_rows)
            if abs(pct_sum - 100.0) > 0.01:
                raise HTTPException(
                    status_code=400,
                    detail=f"Allocation percentages must sum to 100% (currently {pct_sum:.2f}%)"
                )

    # Generate reference
    # Use the highest existing sequence (not row count) so deletions never cause duplicates.
    max_seq = 0
    for (existing_ref,) in db.query(Expense.expense_reference).all():
        try:
            max_seq = max(max_seq, int(str(existing_ref).rsplit("-", 1)[-1]))
        except (ValueError, TypeError):
            continue
    ref = f"EXP-{datetime.now().strftime('%Y%m')}-{max_seq + 1:04d}"

    # Create expense (exclude allocations from model_dump for direct model creation)
    expense_dict = data.model_dump(exclude={"allocations"})
    # Expenses are issued directly on creation — no separate approval step.
    now = datetime.utcnow()
    expense = Expense(
        **expense_dict,
        expense_reference=ref,
        approval_status="Approved",
        approved_by=current_user.user_id,
        approved_at=now,
        created_by=current_user.user_id,
    )
    db.add(expense)
    db.flush()

    # Add allocations
    for alloc in allocations_data:
        ea = ExpenseAllocation(expense_id=expense.expense_id, **alloc.model_dump())
        db.add(ea)

    db.commit()
    db.refresh(expense)
    return expense


@router.get("/{expense_id}", response_model=ExpenseResponse, tags=["Expenses"])
def get_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse, tags=["Expenses"])
def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    update_dict = data.model_dump(exclude={"allocations"}, exclude_unset=True)
    if "expense_class" in update_dict and update_dict["expense_class"] not in ("General", "Property"):
        raise HTTPException(status_code=400, detail="expense_class must be 'General' or 'Property'")
    new_class = update_dict.get("expense_class", expense.expense_class)
    new_property = update_dict.get("property_id", expense.property_id)
    if new_class == "Property" and not new_property:
        raise HTTPException(status_code=400, detail="Property expenses must have a property_id")
    if data.allocations:
        pct_rows = [a for a in data.allocations if a.allocation_method == "Percentage"]
        if pct_rows:
            pct_sum = sum(float(a.allocation_percentage or 0) for a in pct_rows)
            if abs(pct_sum - 100.0) > 0.01:
                raise HTTPException(
                    status_code=400,
                    detail=f"Allocation percentages must sum to 100% (currently {pct_sum:.2f}%)"
                )

    if "total_amount" in update_dict and update_dict["total_amount"] is not None:
        paid = expense.paid_amount
        if Decimal(str(update_dict["total_amount"])) < paid - Decimal("0.005"):
            raise HTTPException(
                status_code=400,
                detail=f"Total amount cannot be less than the AED {paid:,.2f} already paid by payment vouchers",
            )

    for k, v in update_dict.items():
        setattr(expense, k, v)

    # Replace allocations if provided
    if data.allocations is not None:
        # Remove existing
        db.query(ExpenseAllocation).filter(
            ExpenseAllocation.expense_id == expense_id
        ).delete()
        for alloc in data.allocations:
            ea = ExpenseAllocation(expense_id=expense_id, **alloc.model_dump())
            db.add(ea)

    expense.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=204, tags=["Expenses"])
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Payment vouchers belong to the expense — they must be removed first so no payment is orphaned.
    voucher_count = db.query(PaymentVoucher).filter(PaymentVoucher.expense_id == expense_id).count()
    if voucher_count:
        raise HTTPException(
            status_code=400,
            detail=f"Expense {expense.expense_reference} has {voucher_count} payment voucher(s). "
                   "Delete its payment vouchers first.",
        )
    # Detach other records that reference this expense, then remove its allocations.
    db.query(MaintenanceTicket).filter(MaintenanceTicket.expense_id == expense_id).update(
        {MaintenanceTicket.expense_id: None}, synchronize_session=False
    )
    db.query(ExpenseAllocation).filter(ExpenseAllocation.expense_id == expense_id).delete(
        synchronize_session=False
    )
    db.delete(expense)
    db.commit()
    return None


@router.post("/{expense_id}/approve", response_model=ExpenseResponse, tags=["Expenses"])
def approve_expense(
    expense_id: str,
    action: ExpenseApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Managing Director", "Administrator"])),
):
    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if expense.approval_status != "Pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve expense in status: {expense.approval_status}"
        )
    expense.approval_status = "Approved"
    expense.approved_by = current_user.user_id
    expense.approved_at = datetime.utcnow()
    expense.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(expense)
    return expense


@router.post("/{expense_id}/reject", response_model=ExpenseResponse, tags=["Expenses"])
def reject_expense(
    expense_id: str,
    action: ExpenseApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Managing Director", "Administrator"])),
):
    expense = db.query(Expense).filter(Expense.expense_id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if expense.approval_status != "Pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject expense in status: {expense.approval_status}"
        )
    if not action.reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    expense.approval_status = "Rejected"
    expense.notes = f"Rejected by {current_user.full_name or current_user.username}: {action.reason}"
    expense.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(expense)
    return expense
