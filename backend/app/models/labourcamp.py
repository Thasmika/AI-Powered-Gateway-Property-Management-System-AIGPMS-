"""
Labour Camp Management Models — Module 11 — Sprint 8
======================================================
Tables:
  - labour_camp_units       : Rooms, dorms, bed spaces with capacity
  - camp_residents          : Worker / resident records
  - camp_leases             : Occupancy contracts (no PDC — PM decision)
  - camp_utility_readings   : Meter readings (electricity, water) per unit

PM Note: Labour camp process does NOT require PDC cheques.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, ForeignKey, DateTime, Text,
    Numeric, Boolean, Integer, Date
)
from sqlalchemy.orm import relationship
from app.database.session import Base


def generate_uuid():
    return str(uuid.uuid4())


class LabourCampUnit(Base):
    """
    A physical room, dormitory, or bed space within a labour camp property.

    unit_type: Room | Dormitory | Bed Space | Studio | Other
    """
    __tablename__ = "labour_camp_units"

    unit_id             = Column(String(36), primary_key=True, default=generate_uuid)
    property_id         = Column(String(36), ForeignKey("properties.property_id"), nullable=False)

    unit_number         = Column(String(50), nullable=False)
    unit_type           = Column(String(50), nullable=False, default="Room")
    # e.g. "Floor 2, Block A"
    location_description = Column(String(200), nullable=True)

    # Capacity
    total_capacity      = Column(Integer, nullable=False, default=1)
    current_occupancy   = Column(Integer, nullable=False, default=0)

    # Amenities
    has_attached_bathroom   = Column(Boolean, default=False)
    has_ac                  = Column(Boolean, default=False)

    # Utilities — electricity meter number
    electricity_meter_number    = Column(String(100), nullable=True)
    water_meter_number          = Column(String(100), nullable=True)

    # Status: Available | Occupied | Under Maintenance | Out of Service
    status              = Column(String(40), nullable=False, default="Available", index=True)

    monthly_rent        = Column(Numeric(10, 2), nullable=True)  # Per bed/room per month
    notes               = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    residents           = relationship("CampResident", back_populates="unit")
    leases              = relationship("CampLease", back_populates="unit")
    utility_readings    = relationship("CampUtilityReading", back_populates="unit")


class CampResident(Base):
    """
    Worker / resident record for the labour camp.
    Each resident belongs to a company (employer) and occupies a bed/unit.
    """
    __tablename__ = "camp_residents"

    resident_id         = Column(String(36), primary_key=True, default=generate_uuid)

    # Personal Details
    full_name           = Column(String(200), nullable=False)
    # Passport, Emirates ID
    id_type             = Column(String(50), nullable=False, default="Passport")
    id_number           = Column(String(100), nullable=False, index=True)
    nationality         = Column(String(100), nullable=True)
    date_of_birth       = Column(Date, nullable=True)
    contact_number      = Column(String(30), nullable=True)

    # Employment
    employer_company    = Column(String(200), nullable=True)
    job_title           = Column(String(100), nullable=True)

    # Assigned Unit
    unit_id             = Column(String(36), ForeignKey("labour_camp_units.unit_id"), nullable=True)

    # Status: Active | Vacated | Transferred | Blacklisted
    status              = Column(String(30), nullable=False, default="Active", index=True)

    # Dates
    check_in_date       = Column(Date, nullable=True)
    check_out_date      = Column(Date, nullable=True)

    # Emirates ID expiry for alerts
    emirates_id_expiry  = Column(Date, nullable=True)
    visa_expiry         = Column(Date, nullable=True)
    passport_expiry     = Column(Date, nullable=True)

    notes               = Column(Text, nullable=True)
    created_by          = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    unit                = relationship("LabourCampUnit", back_populates="residents")
    leases              = relationship("CampLease", back_populates="resident")


class CampLease(Base):
    """
    Labour camp occupancy contract / agreement.
    PM Decision: NO PDC — a different payment process applies for labour camp.

    payment_method: Cash | Bank Transfer | Deduction from Salary | Other
    billing_cycle : Monthly | Weekly | Daily | Per Bed
    status        : Active | Expired | Terminated | Pending
    """
    __tablename__ = "camp_leases"

    lease_id            = Column(String(36), primary_key=True, default=generate_uuid)
    lease_reference     = Column(String(50), nullable=False, unique=True, index=True)

    unit_id             = Column(String(36), ForeignKey("labour_camp_units.unit_id"), nullable=False)
    resident_id         = Column(String(36), ForeignKey("camp_residents.resident_id"), nullable=False)

    # Contract Dates
    start_date          = Column(Date, nullable=False)
    end_date            = Column(Date, nullable=True)

    # Financials — NO PDC (PM Rule)
    monthly_rate        = Column(Numeric(10, 2), nullable=False)
    # Monthly | Weekly | Daily | Per Bed
    billing_cycle       = Column(String(30), nullable=False, default="Monthly")
    # Cash | Bank Transfer | Deduction from Salary | Other
    payment_method      = Column(String(50), nullable=False, default="Cash")

    security_deposit    = Column(Numeric(10, 2), nullable=True)
    deposit_paid        = Column(Boolean, default=False)

    # Status: Active | Expired | Terminated | Pending
    status              = Column(String(30), nullable=False, default="Active", index=True)
    termination_reason  = Column(Text, nullable=True)

    notes               = Column(Text, nullable=True)
    created_by          = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    unit                = relationship("LabourCampUnit", back_populates="leases")
    resident            = relationship("CampResident", back_populates="leases")


class CampUtilityReading(Base):
    """
    Utility meter readings per camp unit — electricity and water.
    Used to calculate billing for each unit per billing period.

    utility_type: Electricity | Water | Gas
    """
    __tablename__ = "camp_utility_readings"

    reading_id          = Column(String(36), primary_key=True, default=generate_uuid)
    unit_id             = Column(String(36), ForeignKey("labour_camp_units.unit_id"), nullable=False)

    # Electricity | Water | Gas
    utility_type        = Column(String(30), nullable=False)
    meter_number        = Column(String(100), nullable=True)

    # Readings
    reading_date        = Column(Date, nullable=False)
    previous_reading    = Column(Numeric(12, 3), nullable=True)
    current_reading     = Column(Numeric(12, 3), nullable=False)
    units_consumed      = Column(Numeric(12, 3), nullable=True)   # auto-calculated

    # Billing
    rate_per_unit       = Column(Numeric(8, 4), nullable=True)    # AED per unit
    billed_amount       = Column(Numeric(10, 2), nullable=True)   # auto-calculated
    billing_period_from = Column(Date, nullable=True)
    billing_period_to   = Column(Date, nullable=True)

    is_billed           = Column(Boolean, default=False)
    notes               = Column(Text, nullable=True)
    recorded_by         = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    unit                = relationship("LabourCampUnit", back_populates="utility_readings")


# ─────────────────────────────────────────────────────────────────────────────
# Labour Camp Cash Receipt — Module 11 (Cash Collection)
# Added: Technical Instruction Sheet — Labour Camp Cash Collection / Cash Receipt Entry
# ─────────────────────────────────────────────────────────────────────────────

class LabourCampCashReceipt(Base):
    """
    Header record for a Labour Camp cash collection event.

    The Camp Boss periodically hands collected cash to Head Office.
    Head Office enters ONE receipt that covers MULTIPLE camp lease contracts.

    PM Rules:
      - Cash only — no PDC cheques.
      - total_amount must equal SUM of all line rent_amount_received values.
      - Once Posted, locked — corrections via Reversal with MD/Admin auth only.

    status: Draft | Posted | Cancelled | Reversed
    """
    __tablename__ = "labour_camp_cash_receipts"

    receipt_id          = Column(String(36), primary_key=True, default=generate_uuid)

    # Auto-generated reference: LCCR-YYYY-NNNN
    receipt_number      = Column(String(30), nullable=False, unique=True, index=True)

    receipt_date        = Column(Date, nullable=False)

    # Auto-resolved to the Labour Camp property (filtered by property_type)
    property_id         = Column(String(36), ForeignKey("properties.property_id"), nullable=True)

    # Total cash physically handed over by Camp Boss — must equal SUM of lines
    total_amount        = Column(Numeric(12, 2), nullable=False)

    # Free-text name of the person handing over cash (e.g. "Camp Boss — Ahmed")
    received_from       = Column(String(200), nullable=True)

    remarks             = Column(Text, nullable=True)

    # Draft | Posted | Cancelled | Reversed
    status              = Column(String(20), nullable=False, default="Draft", index=True)

    # Audit
    created_by          = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    posted_by           = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    posted_at           = Column(DateTime, nullable=True)
    cancelled_by        = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    cancelled_at        = Column(DateTime, nullable=True)
    reversal_reason     = Column(Text, nullable=True)

    # Relationships
    lines               = relationship(
        "LabourCampCashReceiptLine",
        back_populates="receipt",
        cascade="all, delete-orphan",
        order_by="LabourCampCashReceiptLine.line_number",
    )


class LabourCampCashReceiptLine(Base):
    """
    Detail line for one Labour Camp cash receipt.

    One line = one CampLease (tenancy contract).
    Duplicate lease_id within the same receipt is blocked at the API layer.

    Key behaviours on POST:
      - contract_monthly_rent is snapshotted from CampLease.monthly_rate
        so historical reports stay accurate if the rate later changes.
      - old_expiry_date is recorded from CampLease.end_date.
      - new_expiry_date = old_expiry_date + 1 calendar month.
      - CampLease.end_date is updated to new_expiry_date.
    """
    __tablename__ = "labour_camp_cash_receipt_lines"

    line_id             = Column(String(36), primary_key=True, default=generate_uuid)

    cash_receipt_id     = Column(
        String(36),
        ForeignKey("labour_camp_cash_receipts.receipt_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    line_number         = Column(Integer, nullable=False)   # 1, 2, 3 …

    # The tenancy contract (Labour Camp lease)
    camp_lease_id       = Column(
        String(36),
        ForeignKey("camp_leases.lease_id"),
        nullable=False,
    )

    # Denormalized for fast reporting — avoids join through camp_leases → unit
    unit_id             = Column(String(36), ForeignKey("labour_camp_units.unit_id"), nullable=True)

    # Snapshot of monthly_rate at the time of receipt entry
    contract_monthly_rent = Column(Numeric(10, 2), nullable=False)

    # Actual cash received against this contract
    rent_amount_received  = Column(Numeric(10, 2), nullable=False)

    # Expiry date audit — recorded when the receipt is Posted
    old_expiry_date     = Column(Date, nullable=True)
    new_expiry_date     = Column(Date, nullable=True)

    remarks             = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    # Relationships
    receipt             = relationship("LabourCampCashReceipt", back_populates="lines")
    lease               = relationship("CampLease")
