from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

# ─────────────────────────────────────────────────────────────────────────────
# RentalReceiptPaymentLine Schemas
# ─────────────────────────────────────────────────────────────────────────────
class RentalReceiptPaymentLineBase(BaseModel):
    instrument_type: str = Field(..., description="PDC | Current-Dated Cheque | Cash | Bank Transfer | Card | Other")
    amount: Decimal = Field(..., gt=0)
    
    cheque_number: Optional[str] = None
    bank_name: Optional[str] = None
    account_holder: Optional[str] = None
    instrument_date: Optional[date] = None
    
    rental_period_from: Optional[date] = None
    rental_period_to: Optional[date] = None
    receivable_id: Optional[str] = None
    
    attachment_path: Optional[str] = None
    remarks: Optional[str] = None

class RentalReceiptPaymentLineCreate(RentalReceiptPaymentLineBase):
    pass

class RentalReceiptPaymentLineResponse(RentalReceiptPaymentLineBase):
    payment_line_id: str
    receipt_id: str
    lease_version_id: Optional[str] = None
    line_number: int
    pdc_received_id: Optional[str] = None
    line_status: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────────────────────────────────────
# RentalReceipt Schemas
# ─────────────────────────────────────────────────────────────────────────────
class RentalReceiptBase(BaseModel):
    receipt_date: date
    tenant_id: Optional[str] = None
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    lease_id: str
    lease_version_id: str
    payment_purpose: Optional[str] = None
    currency: str = "AED"
    total_amount: Decimal = Field(..., gt=0)
    remarks: Optional[str] = None
    attachment_path: Optional[str] = None

class RentalReceiptCreate(RentalReceiptBase):
    payment_lines: List[RentalReceiptPaymentLineCreate]

class RentalReceiptResponse(RentalReceiptBase):
    receipt_id: str
    receipt_number: str
    receipt_status: str
    received_by: Optional[str] = None
    posted_at: Optional[datetime] = None
    posted_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    payment_lines: List[RentalReceiptPaymentLineResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────────────────────────────────────
# PDCReceived Status History Schema
# ─────────────────────────────────────────────────────────────────────────────
class PDCReceivedStatusHistoryResponse(BaseModel):
    history_id: str
    pdc_received_id: str
    old_status: Optional[str] = None
    new_status: str
    change_reason: Optional[str] = None
    changed_by: Optional[str] = None
    changed_at: datetime
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────────────────────────────────────
# PDCReceived Schemas
# ─────────────────────────────────────────────────────────────────────────────
class PDCReceivedResponse(BaseModel):
    pdc_received_id: str
    pdc_receipt_reference: str
    
    property_id: str
    unit_id: Optional[str] = None
    tenant_id: str
    lease_id: str
    lease_version_id: str
    receivable_id: Optional[str] = None
    beneficiary_allocation_ref: Optional[str] = None
    
    cheque_number: str
    bank_name: str
    account_holder: Optional[str] = None
    cheque_date: date
    cheque_amount: Decimal
    rental_period_from: Optional[date] = None
    rental_period_to: Optional[date] = None
    
    date_received: date
    received_by: Optional[str] = None
    current_cheque_location: Optional[str] = None
    deposit_bank_account: Optional[str] = None
    attachment_path: Optional[str] = None
    remarks: Optional[str] = None
    status: str
    
    deposited_at: Optional[datetime] = None
    cleared_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    status_history: List[PDCReceivedStatusHistoryResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────────────────────────────────────────────────
# PDC Action Schemas
# ─────────────────────────────────────────────────────────────────────────────
class PDCStatusUpdate(BaseModel):
    reason: Optional[str] = None
    notes: Optional[str] = None
    deposit_bank_account: Optional[str] = None  # for deposit action

class PDCReceivedUpdate(BaseModel):
    cheque_number: Optional[str] = None
    bank_name: Optional[str] = None
    account_holder: Optional[str] = None
    cheque_date: Optional[date] = None
    cheque_amount: Optional[Decimal] = None
    rental_period_from: Optional[date] = None
    rental_period_to: Optional[date] = None
    remarks: Optional[str] = None
    status: Optional[str] = None

class ChequeReturnCreate(BaseModel):
    return_date: date
    return_reason: Optional[str] = None
    bank_charges: Decimal = Decimal("0.00")
    follow_up_action: Optional[str] = None
    notes: Optional[str] = None

class ChequeReplacementCreate(BaseModel):
    replacement_reason: str
    replacement_date: Optional[date] = None
    notes: Optional[str] = None
    # Details for the NEW cheque being provided as replacement
    cheque_number: str
    bank_name: str
    account_holder: Optional[str] = None
    cheque_date: date
    cheque_amount: Decimal
    attachment_path: Optional[str] = None
