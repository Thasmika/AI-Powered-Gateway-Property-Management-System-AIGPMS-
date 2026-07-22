from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, date

class OwnerBase(BaseModel):
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

class OwnerCreate(OwnerBase):
    pass

class OwnerUpdate(BaseModel):
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

class OwnerInDBBase(OwnerBase):
    owner_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OwnerResponse(OwnerInDBBase):
    pass

class BeneficiaryAllocationBase(BaseModel):
    beneficiary_id: str
    allocation_percentage: Decimal = Field(..., max_digits=5, decimal_places=2)
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
    beneficiary_id: Optional[str] = None
    allocation_percentage: Optional[Decimal] = Field(None, max_digits=5, decimal_places=2)
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
    beneficiary: OwnerResponse

class OwnershipRecordBase(BaseModel):
    property_id: str
    owner_id: str
    ownership_type: str = Field(..., max_length=30)
    ownership_percentage: Decimal = Field(..., max_digits=5, decimal_places=2)
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_current: Optional[bool] = True
    notes: Optional[str] = None

class OwnershipRecordCreate(OwnershipRecordBase):
    pass

class OwnershipRecordUpdate(BaseModel):
    ownership_type: Optional[str] = Field(None, max_length=30)
    ownership_percentage: Optional[Decimal] = Field(None, max_digits=5, decimal_places=2)
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
    owner: OwnerResponse
    beneficiary_allocations: List[BeneficiaryAllocationResponse] = []
