from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from decimal import Decimal

# ─────────────────────────────────────────────────────────────────────────────
# Authorized Signatory
# ─────────────────────────────────────────────────────────────────────────────
class AuthorizedSignatoryBase(BaseModel):
    user_id: str
    signatory_name: str
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: bool = True
    signature_limit: Optional[Decimal] = None
    notes: Optional[str] = None

class AuthorizedSignatoryCreate(AuthorizedSignatoryBase):
    bank_account_id: str

class AuthorizedSignatoryResponse(AuthorizedSignatoryBase):
    model_config = ConfigDict(from_attributes=True)
    signatory_id: str
    bank_account_id: str
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Bank Account
# ─────────────────────────────────────────────────────────────────────────────
class BankAccountBase(BaseModel):
    account_name: str
    bank_name: str
    account_number: str
    iban: Optional[str] = None
    currency: str = "AED"
    branch: Optional[str] = None
    status: str = "Active"
    notes: Optional[str] = None

class BankAccountCreate(BankAccountBase):
    pass

class BankAccountResponse(BankAccountBase):
    model_config = ConfigDict(from_attributes=True)
    account_id: str
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Cheque Leaf
# ─────────────────────────────────────────────────────────────────────────────
class ChequeLeafBase(BaseModel):
    cheque_number: str
    status: str = "Available"
    notes: Optional[str] = None

class ChequeLeafResponse(ChequeLeafBase):
    model_config = ConfigDict(from_attributes=True)
    leaf_id: str
    cheque_book_id: str
    issued_to: Optional[str] = None

class ChequeLeafUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Cheque Book
# ─────────────────────────────────────────────────────────────────────────────
class ChequeBookBase(BaseModel):
    cheque_book_number: str
    series_from: str
    series_to: str
    received_date: Optional[date] = None
    status: str = "Active"
    notes: Optional[str] = None

class ChequeBookCreate(ChequeBookBase):
    bank_account_id: str

class ChequeBookResponse(ChequeBookBase):
    model_config = ConfigDict(from_attributes=True)
    cheque_book_id: str
    bank_account_id: str
    created_at: datetime
    leaves_count: Optional[int] = None # Custom field if needed
    leaves: Optional[List[ChequeLeafResponse]] = None


# ─────────────────────────────────────────────────────────────────────────────
# PDC Issued Status History
# ─────────────────────────────────────────────────────────────────────────────
class PDCIssuedStatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    history_id: str
    pdc_issued_id: str
    old_status: Optional[str] = None
    new_status: str
    change_reason: Optional[str] = None
    changed_by: Optional[str] = None
    changed_at: datetime
    notes: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# PDC Issued
# ─────────────────────────────────────────────────────────────────────────────
class PDCIssuedBase(BaseModel):
    payee_name: str
    payee_type: Optional[str] = None
    related_property_id: Optional[str] = None
    related_loan_id: Optional[str] = None
    related_lpo_id: Optional[str] = None
    related_invoice_id: Optional[str] = None
    related_payment_voucher_id: Optional[str] = None
    
    cheque_number: str
    bank_account_id: str
    cheque_date: date
    cheque_amount: Decimal
    purpose: Optional[str] = None
    
    date_issued: Optional[date] = None
    handover_date: Optional[date] = None
    acknowledged_by: Optional[str] = None
    
    attachment_path: Optional[str] = None
    remarks: Optional[str] = None

class PDCIssuedCreate(PDCIssuedBase):
    pass

class PDCIssuedUpdate(BaseModel):
    # Only allow updating certain fields if still draft or pending approval
    payee_name: Optional[str] = None
    payee_type: Optional[str] = None
    related_property_id: Optional[str] = None
    related_loan_id: Optional[str] = None
    related_lpo_id: Optional[str] = None
    related_invoice_id: Optional[str] = None
    related_payment_voucher_id: Optional[str] = None
    
    cheque_date: Optional[date] = None
    cheque_amount: Optional[Decimal] = None
    purpose: Optional[str] = None
    
    date_issued: Optional[date] = None
    handover_date: Optional[date] = None
    acknowledged_by: Optional[str] = None
    
    attachment_path: Optional[str] = None
    remarks: Optional[str] = None

class PDCIssuedResponse(PDCIssuedBase):
    model_config = ConfigDict(from_attributes=True)
    pdc_issued_id: str
    pdc_issue_reference: str
    prepared_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    status: str
    cleared_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    status_history: Optional[List[PDCIssuedStatusHistoryResponse]] = None
