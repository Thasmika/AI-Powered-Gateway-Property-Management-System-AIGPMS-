"""
Finance & Expense Schemas — Sprint 7
=====================================
Pydantic schemas for:
  - CostCentre
  - ExpenseCategory
  - Expense (General + Property)
  - ExpenseAllocation (8 allocation methods)
"""

from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import date, datetime
from decimal import Decimal


# ─────────────────────────────────────────────────────────────────────────────
# Cost Centre
# ─────────────────────────────────────────────────────────────────────────────

class CostCentreBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True


class CostCentreCreate(CostCentreBase):
    pass


class CostCentreUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CostCentreResponse(CostCentreBase):
    model_config = ConfigDict(from_attributes=True)
    cost_centre_id: str
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Expense Category
# ─────────────────────────────────────────────────────────────────────────────

class ExpenseCategoryBase(BaseModel):
    category_code: str
    category_name: str
    expense_class: str = "General"   # General | Property
    description: Optional[str] = None
    is_active: bool = True

    @field_validator("expense_class")
    @classmethod
    def validate_expense_class(cls, v: str) -> str:
        if v not in ("General", "Property"):
            raise ValueError("expense_class must be 'General' or 'Property'")
        return v


class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass


class ExpenseCategoryUpdate(BaseModel):
    category_name: Optional[str] = None
    expense_class: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ExpenseCategoryResponse(ExpenseCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    category_id: str
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Expense Allocation
# ─────────────────────────────────────────────────────────────────────────────

ALLOCATION_METHODS = [
    "100% to Property",
    "Percentage",
    "Fixed Amount",
    "Unit Count",
    "Area",
    "Ownership Share",
    "Cost Centre",
    "Residual",
]


class ExpenseAllocationBase(BaseModel):
    property_id: Optional[str] = None
    cost_centre_id: Optional[str] = None
    allocation_method: str
    allocation_percentage: Optional[Decimal] = None
    allocation_amount: Optional[Decimal] = None
    basis_value: Optional[Decimal] = None
    notes: Optional[str] = None

    @field_validator("allocation_method")
    @classmethod
    def validate_method(cls, v: str) -> str:
        if v not in ALLOCATION_METHODS:
            raise ValueError(f"allocation_method must be one of: {', '.join(ALLOCATION_METHODS)}")
        return v


class ExpenseAllocationCreate(ExpenseAllocationBase):
    pass


class ExpenseAllocationResponse(ExpenseAllocationBase):
    model_config = ConfigDict(from_attributes=True)
    allocation_id: str
    expense_id: str
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Expense
# ─────────────────────────────────────────────────────────────────────────────

class ExpenseBase(BaseModel):
    expense_class: str   # General | Property
    category_id: str
    payee_name: str
    description: Optional[str] = None

    invoice_date: Optional[date] = None
    invoice_number: Optional[str] = None
    amount: Decimal
    tax_amount: Decimal = Decimal("0")
    total_amount: Decimal

    payment_method: Optional[str] = None
    payment_voucher_ref: Optional[str] = None
    pdc_issued_id: Optional[str] = None

    cost_centre_id: Optional[str] = None

    # Property-Related (null for General)
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    maintenance_ticket_id: Optional[str] = None
    lpo_id: Optional[str] = None
    supplier_id: Optional[str] = None

    is_shared: bool = False
    attachment_path: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("expense_class")
    @classmethod
    def validate_expense_class(cls, v: str) -> str:
        if v not in ("General", "Property"):
            raise ValueError("expense_class must be 'General' or 'Property'")
        return v


class ExpenseCreate(ExpenseBase):
    allocations: Optional[List[ExpenseAllocationCreate]] = None


class ExpenseUpdate(BaseModel):
    expense_class: Optional[str] = None
    category_id: Optional[str] = None
    payee_name: Optional[str] = None
    description: Optional[str] = None
    invoice_date: Optional[date] = None
    invoice_number: Optional[str] = None
    amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    payment_method: Optional[str] = None
    payment_voucher_ref: Optional[str] = None
    pdc_issued_id: Optional[str] = None
    cost_centre_id: Optional[str] = None
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    maintenance_ticket_id: Optional[str] = None
    lpo_id: Optional[str] = None
    is_shared: Optional[bool] = None
    attachment_path: Optional[str] = None
    notes: Optional[str] = None
    allocations: Optional[List[ExpenseAllocationCreate]] = None


class ExpenseApprovalAction(BaseModel):
    reason: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)
    expense_id: str
    expense_reference: str
    approval_status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    allocations: Optional[List[ExpenseAllocationResponse]] = None
    # Joined fields
    category_name: Optional[str] = None
    property_name: Optional[str] = None
