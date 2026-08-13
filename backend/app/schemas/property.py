from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, date
from typing import Optional, List
from decimal import Decimal

# ─────────────────────────────────────────────────────────────────────────────
# PropertyUnit
# ─────────────────────────────────────────────────────────────────────────────

class PropertyUnitBase(BaseModel):
    unit_number: str
    unit_type: Optional[str] = None
    floor_number: Optional[str] = None
    balcony: Optional[str] = None
    area_sqm: Optional[Decimal] = None
    plot_number: Optional[str] = None
    makani_number: Optional[str] = None
    status: Optional[str] = "Vacant"
    unit_description: Optional[str] = None
    photo_1: Optional[str] = None
    photo_2: Optional[str] = None
    photo_3: Optional[str] = None
    photo_4: Optional[str] = None

class PropertyUnitCreate(PropertyUnitBase):
    legal_owner_id: Optional[str] = None
    beneficial_owner_id: Optional[str] = None
    bank_id: Optional[str] = None
    tenant_id: Optional[str] = None

class PropertyUnitUpdate(BaseModel):
    unit_number: Optional[str] = None
    unit_type: Optional[str] = None
    floor_number: Optional[str] = None
    balcony: Optional[str] = None
    area_sqm: Optional[Decimal] = None
    plot_number: Optional[str] = None
    makani_number: Optional[str] = None
    status: Optional[str] = None
    unit_description: Optional[str] = None
    photo_1: Optional[str] = None
    photo_2: Optional[str] = None
    photo_3: Optional[str] = None
    photo_4: Optional[str] = None

class PropertyUnitOut(PropertyUnitBase):
    model_config = ConfigDict(from_attributes=True)
    unit_id: str
    property_id: str
    created_at: datetime
    title_deed: Optional['TitleDeedOut'] = None
    legal_owner_id: Optional[str] = None
    beneficial_owner_id: Optional[str] = None
    bank_id: Optional[str] = None
    tenant_id: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Property Document
# ─────────────────────────────────────────────────────────────────────────────

class PropertyDocumentBase(BaseModel):
    document_type: str
    document_name: str
    file_path: str
    file_size_kb: Optional[int] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None

class PropertyDocumentCreate(PropertyDocumentBase):
    pass

class PropertyDocumentOut(PropertyDocumentBase):
    model_config = ConfigDict(from_attributes=True)
    document_id: str
    property_id: str
    uploaded_by: Optional[str] = None
    upload_date: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Property Valuation
# ─────────────────────────────────────────────────────────────────────────────

class PropertyValuationBase(BaseModel):
    market_value: Decimal
    valuation_date: date
    valuation_source: Optional[str] = None
    valuation_method: Optional[str] = None
    valuer_name: Optional[str] = None
    notes: Optional[str] = None

class PropertyValuationCreate(PropertyValuationBase):
    pass

class PropertyValuationOut(PropertyValuationBase):
    model_config = ConfigDict(from_attributes=True)
    valuation_id: str
    property_id: str
    appreciation_percentage: Optional[Decimal] = None
    created_by: Optional[str] = None
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Property Acquisition Cost
# ─────────────────────────────────────────────────────────────────────────────

class PropertyAcquisitionCostBase(BaseModel):
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    purchase_currency: Optional[str] = "AED"
    seller_name: Optional[str] = None
    purchase_agreement_number: Optional[str] = None
    title_transfer_date: Optional[date] = None
    registration_fees: Optional[Decimal] = Decimal("0")
    broker_commission: Optional[Decimal] = Decimal("0")
    other_acquisition_costs: Optional[Decimal] = Decimal("0")
    notes: Optional[str] = None

class PropertyAcquisitionCostCreate(PropertyAcquisitionCostBase):
    pass

class PropertyAcquisitionCostUpdate(BaseModel):
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    purchase_currency: Optional[str] = None
    seller_name: Optional[str] = None
    purchase_agreement_number: Optional[str] = None
    title_transfer_date: Optional[date] = None
    registration_fees: Optional[Decimal] = None
    broker_commission: Optional[Decimal] = None
    other_acquisition_costs: Optional[Decimal] = None
    notes: Optional[str] = None

class PropertyAcquisitionCostOut(PropertyAcquisitionCostBase):
    model_config = ConfigDict(from_attributes=True)
    acquisition_id: str
    title_deed_id: str
    total_acquisition_cost: Optional[Decimal] = None
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Title Deed
# ─────────────────────────────────────────────────────────────────────────────

class TitleDeedBase(BaseModel):
    title_deed_number: Optional[str] = None
    municipality_property_number: Optional[str] = None
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    plot_number: Optional[str] = None
    unit_number: Optional[str] = None
    property_type: Optional[str] = None
    unit_size: Optional[Decimal] = None
    unit_size_measure: Optional[str] = None
    floor_number: Optional[str] = None
    building_number: Optional[str] = None
    building_name: Optional[str] = None
    community: Optional[str] = None
    emirate: Optional[str] = None
    issue_date: Optional[date] = None
    legal_owner_id: Optional[str] = None
    beneficial_owner_id: Optional[str] = None
    financier: Optional[str] = None
    ownership_percentage: Optional[Decimal] = None
    purchase_method: Optional[str] = None
    purchased_from: Optional[str] = None
    ownership_status: Optional[str] = "Active"
    loan_number: Optional[str] = None
    mortgage_status: Optional[str] = None
    mortgage_bank: Optional[str] = None
    outstanding_loan: Optional[Decimal] = None
    loan_to_value_ratio: Optional[Decimal] = None
    mortgage_expiry_date: Optional[date] = None
    notes: Optional[str] = None
    attachment_path: Optional[str] = None

class TitleDeedCreate(TitleDeedBase):
    pass

class TitleDeedUpdate(TitleDeedBase):
    pass

class TitleDeedOut(TitleDeedBase):
    model_config = ConfigDict(from_attributes=True)
    title_deed_id: str
    unit_id: str
    created_at: datetime
    updated_at: datetime
    legal_owner: Optional[str] = None
    beneficial_owner: Optional[str] = None
    
    # Nested representation if preloaded
    acquisition_costs: Optional[PropertyAcquisitionCostOut] = None


# ─────────────────────────────────────────────────────────────────────────────
# Property Master
# ─────────────────────────────────────────────────────────────────────────────

class PropertyBase(BaseModel):
    property_code: str
    property_name: str
    property_type: Optional[str] = None
    building_name: Optional[str] = None
    community: Optional[str] = None
    emirate: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    gps_location: Optional[str] = None
    total_units: Optional[int] = None
    total_area_sqm: Optional[Decimal] = None
    status: Optional[str] = "Active"
    main_photo: Optional[str] = None

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    property_code: Optional[str] = None
    property_name: Optional[str] = None
    property_type: Optional[str] = None
    building_name: Optional[str] = None
    community: Optional[str] = None
    emirate: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    gps_location: Optional[str] = None
    total_units: Optional[int] = None
    total_area_sqm: Optional[Decimal] = None
    status: Optional[str] = None
    main_photo: Optional[str] = None

class PropertyOut(PropertyBase):
    model_config = ConfigDict(from_attributes=True)
    property_id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    units: List[PropertyUnitOut] = []

class PropertyDetailOut(PropertyOut):
    """Includes nested units, documents, etc. for full detail view."""
    units: List[PropertyUnitOut] = []
    documents: List[PropertyDocumentOut] = []
    valuations: List[PropertyValuationOut] = []

