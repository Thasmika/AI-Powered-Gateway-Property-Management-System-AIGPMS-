from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, date

class LegalOwnerBase(BaseModel):
    owner_type: str = Field(..., max_length=30)
    full_name: str = Field(..., max_length=200)
    trade_name: Optional[str] = Field(None, max_length=200)
    id_number: Optional[str] = Field(None, max_length=100)
    id_type: Optional[str] = Field(None, max_length=50)
    nationality: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = None
    status: Optional[str] = "Active"

class LegalOwnerCreate(LegalOwnerBase):
    pass

class LegalOwnerUpdate(BaseModel):
    owner_type: Optional[str] = Field(None, max_length=30)
    full_name: Optional[str] = Field(None, max_length=200)
    trade_name: Optional[str] = Field(None, max_length=200)
    id_number: Optional[str] = Field(None, max_length=100)
    id_type: Optional[str] = Field(None, max_length=50)
    nationality: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = None
    status: Optional[str] = None

class LegalOwnerInDBBase(LegalOwnerBase):
    legal_owner_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LegalOwnerResponse(LegalOwnerInDBBase):
    pass


class BeneficialOwnerBase(BaseModel):
    owner_type: str = Field(..., max_length=30)
    full_name: str = Field(..., max_length=200)
    trade_name: Optional[str] = Field(None, max_length=200)
    id_number: Optional[str] = Field(None, max_length=100)
    id_type: Optional[str] = Field(None, max_length=50)
    nationality: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = None
    status: Optional[str] = "Active"

class BeneficialOwnerCreate(BeneficialOwnerBase):
    pass

class BeneficialOwnerUpdate(BaseModel):
    owner_type: Optional[str] = Field(None, max_length=30)
    full_name: Optional[str] = Field(None, max_length=200)
    trade_name: Optional[str] = Field(None, max_length=200)
    id_number: Optional[str] = Field(None, max_length=100)
    id_type: Optional[str] = Field(None, max_length=50)
    nationality: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = None
    status: Optional[str] = None

class BeneficialOwnerInDBBase(BeneficialOwnerBase):
    beneficial_owner_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BeneficialOwnerResponse(BeneficialOwnerInDBBase):
    pass

class BeneficiaryAllocationBase(BaseModel):
    beneficial_owner_id: Optional[str] = None
    allocation_percentage: Decimal = Field(...)
    bank_account_name: Optional[str] = Field(None, max_length=200)
    bank_account_number: Optional[str] = Field(None, max_length=100)
    bank_name: Optional[str] = Field(None, max_length=200)
    iban: Optional[str] = Field(None, max_length=50)
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_current: Optional[bool] = True
    notes: Optional[str] = None

class BeneficiaryAllocationCreate(BeneficiaryAllocationBase):
    pass

class BeneficiaryAllocationUpdate(BaseModel):
    beneficial_owner_id: Optional[str] = None
    allocation_percentage: Optional[Decimal] = Field(None)
    bank_account_name: Optional[str] = Field(None, max_length=200)
    bank_account_number: Optional[str] = Field(None, max_length=100)
    bank_name: Optional[str] = Field(None, max_length=200)
    iban: Optional[str] = Field(None, max_length=50)
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_current: Optional[bool] = None
    notes: Optional[str] = None

class BeneficiaryAllocationInDBBase(BeneficiaryAllocationBase):
    allocation_id: str
    ownership_record_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class BeneficiaryAllocationResponse(BeneficiaryAllocationInDBBase):
    beneficial_owner: Optional[BeneficialOwnerResponse] = None

class OwnershipRecordBase(BaseModel):
    property_id: str
    legal_owner_id: Optional[str] = None
    ownership_type: str = Field(..., max_length=30)
    ownership_percentage: Decimal = Field(...)
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_current: Optional[bool] = True
    notes: Optional[str] = None

class OwnershipRecordCreate(OwnershipRecordBase):
    pass

class OwnershipRecordUpdate(BaseModel):
    ownership_type: Optional[str] = Field(None, max_length=30)
    ownership_percentage: Optional[Decimal] = Field(None)
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_current: Optional[bool] = None
    notes: Optional[str] = None

class OwnershipRecordInDBBase(OwnershipRecordBase):
    ownership_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class OwnershipRecordResponse(OwnershipRecordInDBBase):
    legal_owner: Optional[LegalOwnerResponse] = None
    beneficiary_allocations: List[BeneficiaryAllocationResponse] = []
