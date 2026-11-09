"""
Loans & Payment Voucher Schemas — Sprint 7
==========================================
Pydantic schemas for:
  - Loan
  - LoanInstalment
  - LoanDocument
  - PaymentVoucher
"""

from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import date, datetime
from decimal import Decimal


# ─────────────────────────────────────────────────────────────────────────────
# Loan Instalment
# ─────────────────────────────────────────────────────────────────────────────

class LoanInstalmentBase(BaseModel):
    instalment_number: int
    due_date: date
    principal_amount: Decimal = Decimal("0")
    interest_amount: Decimal = Decimal("0")
    total_amount: Decimal
    pdc_issued_id: Optional[str] = None
    status: str = "Pending"
    notes: Optional[str] = None


class LoanInstalmentCreate(LoanInstalmentBase):
    pass


class LoanInstalmentUpdate(BaseModel):
    due_date: Optional[date] = None
    principal_amount: Optional[Decimal] = None
    interest_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    pdc_issued_id: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class LoanInstalmentResponse(LoanInstalmentBase):
    model_config = ConfigDict(from_attributes=True)
    instalment_id: str
    loan_id: str
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Loan Document
# ─────────────────────────────────────────────────────────────────────────────

class LoanDocumentCreate(BaseModel):
    document_type: str
    document_name: str
    file_path: Optional[str] = None
    notes: Optional[str] = None


class LoanDocumentResponse(LoanDocumentCreate):
    model_config = ConfigDict(from_attributes=True)
    document_id: str
    loan_id: str
    uploaded_by: Optional[str] = None
    uploaded_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Loan
# ─────────────────────────────────────────────────────────────────────────────

class LoanBase(BaseModel):
    title_deed_id: Optional[str] = None
    property_id: Optional[str] = None
    bank_account_id: Optional[str] = None
    lender_name: str
    loan_type: Optional[str] = None
    currency: str = "AED"
    principal_amount: Decimal
    interest_rate: Optional[Decimal] = None
    loan_term_months: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    outstanding_balance: Optional[Decimal] = None
    loan_to_value_ratio: Optional[Decimal] = None
    status: str = "Active"
    notes: Optional[str] = None


class LoanCreate(LoanBase):
    instalments: Optional[List[LoanInstalmentCreate]] = None


class LoanUpdate(BaseModel):
    lender_name: Optional[str] = None
    loan_type: Optional[str] = None
    interest_rate: Optional[Decimal] = None
    outstanding_balance: Optional[Decimal] = None
    loan_to_value_ratio: Optional[Decimal] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class LoanResponse(LoanBase):
    model_config = ConfigDict(from_attributes=True)
    loan_id: str
    loan_reference: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    instalments: Optional[List[LoanInstalmentResponse]] = None
    documents: Optional[List[LoanDocumentResponse]] = None


# ─────────────────────────────────────────────────────────────────────────────
# Payment Voucher
# ─────────────────────────────────────────────────────────────────────────────

class PaymentVoucherBase(BaseModel):
    payee_name: str
    payee_type: Optional[str] = None
    amount: Decimal
    currency: str = "AED"
    purpose: Optional[str] = None
    payment_method: Optional[str] = None
    expense_id: Optional[str] = None
    loan_id: Optional[str] = None
    property_id: Optional[str] = None
    attachment_path: Optional[str] = None
    notes: Optional[str] = None


class PaymentVoucherCreate(PaymentVoucherBase):
    pass


class PaymentVoucherApproveAction(BaseModel):
    reason: Optional[str] = None


class PaymentVoucherRejectAction(BaseModel):
    reason: str


class PaymentVoucherResponse(PaymentVoucherBase):
    model_config = ConfigDict(from_attributes=True)
    voucher_id: str
    voucher_number: str
    approval_status: str
    prepared_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
