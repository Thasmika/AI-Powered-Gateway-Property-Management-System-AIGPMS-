"""
Labour Camp Management Schemas — Module 11 — Sprint 8
======================================================
Pydantic v2 request/response schemas for:
  - LabourCampUnit
  - CampResident
  - CampLease
  - CampUtilityReading
"""

from __future__ import annotations
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Labour Camp Unit
# ─────────────────────────────────────────────────────────────────────────────

class LabourCampUnitCreate(BaseModel):
    property_id: str
    unit_number: str = Field(..., max_length=50)
    unit_type: str = Field("Room", max_length=50)
    location_description: Optional[str] = Field(None, max_length=200)
    total_capacity: int = Field(1, ge=1)
    has_attached_bathroom: bool = False
    has_ac: bool = False
    electricity_meter_number: Optional[str] = Field(None, max_length=100)
    water_meter_number: Optional[str] = Field(None, max_length=100)
    monthly_rent: Optional[Decimal] = None
    notes: Optional[str] = None


class LabourCampUnitUpdate(BaseModel):
    unit_number: Optional[str] = Field(None, max_length=50)
    unit_type: Optional[str] = Field(None, max_length=50)
    location_description: Optional[str] = Field(None, max_length=200)
    total_capacity: Optional[int] = Field(None, ge=1)
    has_attached_bathroom: Optional[bool] = None
    has_ac: Optional[bool] = None
    electricity_meter_number: Optional[str] = Field(None, max_length=100)
    water_meter_number: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = None
    monthly_rent: Optional[Decimal] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class LabourCampUnitOut(BaseModel):
    unit_id: str
    property_id: str
    unit_number: str
    unit_type: str
    location_description: Optional[str]
    total_capacity: int
    current_occupancy: int
    has_attached_bathroom: Optional[bool] = False
    has_ac: Optional[bool] = False
    electricity_meter_number: Optional[str]
    water_meter_number: Optional[str]
    status: str
    monthly_rent: Optional[Decimal]
    notes: Optional[str]
    is_active: Optional[bool] = True
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Camp Resident
# ─────────────────────────────────────────────────────────────────────────────

class CampResidentCreate(BaseModel):
    full_name: str = Field(..., max_length=200)
    id_type: str = Field("Passport", max_length=50)
    id_number: str = Field(..., max_length=100)
    nationality: Optional[str] = Field(None, max_length=100)
    date_of_birth: Optional[date] = None
    contact_number: Optional[str] = Field(None, max_length=30)
    employer_company: Optional[str] = Field(None, max_length=200)
    job_title: Optional[str] = Field(None, max_length=100)
    unit_id: Optional[str] = None
    check_in_date: Optional[date] = None
    emirates_id_expiry: Optional[date] = None
    visa_expiry: Optional[date] = None
    passport_expiry: Optional[date] = None
    notes: Optional[str] = None


class CampResidentUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=200)
    contact_number: Optional[str] = Field(None, max_length=30)
    employer_company: Optional[str] = Field(None, max_length=200)
    job_title: Optional[str] = Field(None, max_length=100)
    unit_id: Optional[str] = None
    status: Optional[str] = None
    check_out_date: Optional[date] = None
    emirates_id_expiry: Optional[date] = None
    visa_expiry: Optional[date] = None
    passport_expiry: Optional[date] = None
    notes: Optional[str] = None


class CampResidentOut(BaseModel):
    resident_id: str
    full_name: str
    id_type: str
    id_number: str
    nationality: Optional[str]
    date_of_birth: Optional[date]
    contact_number: Optional[str]
    employer_company: Optional[str]
    job_title: Optional[str]
    unit_id: Optional[str]
    status: str
    check_in_date: Optional[date]
    check_out_date: Optional[date]
    emirates_id_expiry: Optional[date]
    visa_expiry: Optional[date]
    passport_expiry: Optional[date]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Camp Lease
# ─────────────────────────────────────────────────────────────────────────────

class CampLeaseCreate(BaseModel):
    unit_id: str
    resident_id: str
    start_date: date
    end_date: Optional[date] = None
    monthly_rate: Decimal = Field(..., gt=0)
    billing_cycle: str = Field("Monthly", max_length=30)
    payment_method: str = Field("Cash", max_length=50)
    security_deposit: Optional[Decimal] = None
    deposit_paid: bool = False
    notes: Optional[str] = None


class CampLeaseUpdate(BaseModel):
    end_date: Optional[date] = None
    monthly_rate: Optional[Decimal] = Field(None, gt=0)
    billing_cycle: Optional[str] = None
    payment_method: Optional[str] = None
    security_deposit: Optional[Decimal] = None
    deposit_paid: Optional[bool] = None
    status: Optional[str] = None
    termination_reason: Optional[str] = None
    notes: Optional[str] = None


class CampLeaseOut(BaseModel):
    lease_id: str
    lease_reference: str
    unit_id: str
    resident_id: str
    start_date: date
    end_date: Optional[date]
    monthly_rate: Decimal
    billing_cycle: str
    payment_method: str
    security_deposit: Optional[Decimal]
    deposit_paid: Optional[bool] = False
    status: str
    termination_reason: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Camp Utility Reading
# ─────────────────────────────────────────────────────────────────────────────

class CampUtilityReadingCreate(BaseModel):
    unit_id: str
    utility_type: str = Field(..., pattern="^(Electricity|Water|Gas)$")
    meter_number: Optional[str] = Field(None, max_length=100)
    reading_date: date
    previous_reading: Optional[Decimal] = None
    current_reading: Decimal = Field(..., ge=0)
    rate_per_unit: Optional[Decimal] = None
    billing_period_from: Optional[date] = None
    billing_period_to: Optional[date] = None
    notes: Optional[str] = None


class CampUtilityReadingOut(BaseModel):
    reading_id: str
    unit_id: str
    utility_type: str
    meter_number: Optional[str]
    reading_date: date
    previous_reading: Optional[Decimal]
    current_reading: Decimal
    units_consumed: Optional[Decimal]
    rate_per_unit: Optional[Decimal]
    billed_amount: Optional[Decimal]
    billing_period_from: Optional[date]
    billing_period_to: Optional[date]
    is_billed: Optional[bool] = False
    notes: Optional[str]
    recorded_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Occupancy Summary (for dashboard)
# ─────────────────────────────────────────────────────────────────────────────

class CampOccupancySummary(BaseModel):
    total_units: int
    total_capacity: int
    current_occupancy: int
    available_beds: int
    occupancy_rate_pct: float
    units_available: int
    units_occupied: int
    units_under_maintenance: int


# ─────────────────────────────────────────────────────────────────────────────
# Labour Camp Cash Receipt — Cash Collection (Module 11)
# Technical Instruction Sheet approved — August 2026
# ─────────────────────────────────────────────────────────────────────────────

class CampLeaseForReceiptOut(BaseModel):
    """Lightweight lease record returned by the combo box endpoint.
    The combo box shows lease_reference as the 'Tenancy Contract No.'
    and auto-populates monthly_rate and end_date when a contract is selected.
    """
    lease_id: str
    lease_reference: str          # e.g. CL-2026-0001
    unit_id: str
    unit_number: str              # Room / unit label, joined from labour_camp_units
    resident_name: str            # Full name, joined from camp_residents
    monthly_rate: Decimal
    end_date: Optional[date]      # Current expiry date shown for verification
    status: str

    class Config:
        from_attributes = True


class LabourCampCashReceiptLineCreate(BaseModel):
    """One detail line in a Labour Camp cash receipt creation request."""
    camp_lease_id: str
    rent_amount_received: Decimal = Field(..., gt=0, description="Actual cash collected for this contract")
    remarks: Optional[str] = None


class LabourCampCashReceiptCreate(BaseModel):
    """Request body for creating a Labour Camp cash receipt (Draft)."""
    receipt_date: date
    total_amount: Decimal = Field(..., gt=0, description="Total cash handed over by Camp Boss")
    received_from: Optional[str] = Field(None, max_length=200, description="Camp Boss name / identifier")
    remarks: Optional[str] = None
    lines: List[LabourCampCashReceiptLineCreate] = Field(..., min_length=1)


class LabourCampCashReceiptLineOut(BaseModel):
    """Detail line in a cash receipt response — includes denormalized lease info."""
    line_id: str
    cash_receipt_id: str
    line_number: int
    camp_lease_id: str
    unit_id: Optional[str]
    contract_monthly_rent: Decimal
    rent_amount_received: Decimal
    old_expiry_date: Optional[date]
    new_expiry_date: Optional[date]
    remarks: Optional[str]
    created_at: datetime

    # Populated by endpoint from related objects (not stored as columns)
    lease_reference: Optional[str] = None
    unit_number: Optional[str] = None
    resident_name: Optional[str] = None

    class Config:
        from_attributes = True


class LabourCampCashReceiptOut(BaseModel):
    """Full receipt response including all detail lines."""
    receipt_id: str
    receipt_number: str
    receipt_date: date
    property_id: Optional[str]
    total_amount: Decimal
    received_from: Optional[str]
    remarks: Optional[str]
    status: str
    created_by: Optional[str]
    created_at: datetime
    posted_by: Optional[str]
    posted_at: Optional[datetime]
    cancelled_by: Optional[str]
    cancelled_at: Optional[datetime]
    reversal_reason: Optional[str]
    lines: List[LabourCampCashReceiptLineOut] = []

    # Computed — returned by endpoint for convenience
    grid_total: Optional[Decimal] = None

    class Config:
        from_attributes = True


class LabourCampCashReceiptListItem(BaseModel):
    """Summary row for the receipt list/register view."""
    receipt_id: str
    receipt_number: str
    receipt_date: date
    total_amount: Decimal
    received_from: Optional[str]
    status: str
    line_count: int
    created_by: Optional[str]
    created_at: datetime
    posted_by: Optional[str]
    posted_at: Optional[datetime]

    class Config:
        from_attributes = True

