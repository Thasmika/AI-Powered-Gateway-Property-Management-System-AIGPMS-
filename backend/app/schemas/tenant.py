from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

# ---------------------------------------------------------
# Tenant Schemas
# ---------------------------------------------------------
class TenantBase(BaseModel):
    tenant_type: str = Field(..., description="Individual or Company")
    full_name: str
    trade_name: Optional[str] = None
    id_number: Optional[str] = None
    id_type: Optional[str] = None
    id_expiry: Optional[date] = None
    nationality: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    address: Optional[str] = None
    employer: Optional[str] = None
    emergency_contact: Optional[str] = None
    status: Optional[str] = "Active"
    notes: Optional[str] = None

class TenantCreate(TenantBase):
    pass

class TenantUpdate(BaseModel):
    full_name: Optional[str] = None
    trade_name: Optional[str] = None
    id_number: Optional[str] = None
    id_type: Optional[str] = None
    id_expiry: Optional[date] = None
    nationality: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    address: Optional[str] = None
    employer: Optional[str] = None
    emergency_contact: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class TenantOut(TenantBase):
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ---------------------------------------------------------
# Lease Payment Schedule Schemas
# ---------------------------------------------------------
class LeasePaymentScheduleBase(BaseModel):
    instalment_number: int
    due_date: date
    amount: Decimal
    period_from: Optional[date] = None
    period_to: Optional[date] = None
    payment_reference: Optional[str] = None
    status: Optional[str] = "Pending"
    notes: Optional[str] = None

class LeasePaymentScheduleCreate(LeasePaymentScheduleBase):
    pass

class LeasePaymentScheduleUpdate(BaseModel):
    due_date: Optional[date] = None
    amount: Optional[Decimal] = None
    period_from: Optional[date] = None
    period_to: Optional[date] = None
    payment_reference: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class LeasePaymentScheduleOut(LeasePaymentScheduleBase):
    schedule_id: str
    lease_version_id: str

    class Config:
        from_attributes = True

# ---------------------------------------------------------
# Lease Document Schemas
# ---------------------------------------------------------
class LeaseDocumentBase(BaseModel):
    document_type: str
    document_name: str
    file_path: str
    expiry_date: Optional[date] = None
    notes: Optional[str] = None

class LeaseDocumentCreate(LeaseDocumentBase):
    pass

class LeaseDocumentOut(LeaseDocumentBase):
    document_id: str
    lease_id: str
    lease_version_id: Optional[str] = None
    uploaded_by: Optional[str] = None
    upload_date: datetime

    class Config:
        from_attributes = True

# ---------------------------------------------------------
# Lease Version Schemas
# ---------------------------------------------------------
class LeaseVersionBase(BaseModel):
    contract_start_date: date
    contract_end_date: date
    annual_rent: Decimal
    currency: Optional[str] = "AED"
    payment_frequency: Optional[str] = None
    number_of_cheques: Optional[int] = None
    security_deposit: Optional[Decimal] = 0
    agent_commission: Optional[Decimal] = 0
    municipality_fee: Optional[Decimal] = 0
    ejari_number: Optional[str] = None
    contract_reference: Optional[str] = None
    status: Optional[str] = "Active"
    notes: Optional[str] = None

class LeaseVersionCreate(LeaseVersionBase):
    # Optional payment schedules can be provided upon creation
    schedules: Optional[List[LeasePaymentScheduleCreate]] = None

class LeaseVersionUpdate(BaseModel):
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    annual_rent: Optional[Decimal] = None
    currency: Optional[str] = None
    payment_frequency: Optional[str] = None
    number_of_cheques: Optional[int] = None
    security_deposit: Optional[Decimal] = None
    agent_commission: Optional[Decimal] = None
    municipality_fee: Optional[Decimal] = None
    ejari_number: Optional[str] = None
    contract_reference: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    is_current_version: Optional[bool] = None

class LeaseVersionOut(LeaseVersionBase):
    version_id: str
    lease_id: str
    version_number: int
    is_current_version: bool
    superseded_by: Optional[str] = None
    renewal_reason: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    
    payment_schedules: List[LeasePaymentScheduleOut] = []

    class Config:
        from_attributes = True

# ---------------------------------------------------------
# Lease Schemas
# ---------------------------------------------------------
class LeaseBase(BaseModel):
    property_id: str
    unit_id: str
    tenant_id: str
    lease_type: Optional[str] = None
    status: Optional[str] = "Active"

class LeaseCreate(LeaseBase):
    lease_number: str
    initial_version: LeaseVersionCreate

class LeaseUpdate(BaseModel):
    lease_type: Optional[str] = None
    status: Optional[str] = None

class LeaseOut(LeaseBase):
    lease_id: str
    lease_number: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    versions: List[LeaseVersionOut] = []

    class Config:
        from_attributes = True

class LeaseRenewalCreate(BaseModel):
    renewal_reason: Optional[str] = None
    new_version: LeaseVersionCreate
