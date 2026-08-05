"""
Property Master & Title Deed Models
====================================
Covers: properties, title_deeds, property_acquisition_costs,
        property_valuations, valuation_history, property_documents
"""

import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Column, String, ForeignKey, DateTime, Text,
    Numeric, Boolean, Integer, Date
)
from sqlalchemy.orm import relationship
from app.database.session import Base


def generate_uuid():
    return str(uuid.uuid4())


# ─────────────────────────────────────────────────────────────────────────────
# Property Master
# ─────────────────────────────────────────────────────────────────────────────

class Property(Base):
    """Core property record. Every other module references this."""
    __tablename__ = "properties"

    property_id       = Column(String(36), primary_key=True, default=generate_uuid)
    property_code     = Column(String(50), nullable=False, unique=True, index=True)
    property_name     = Column(String(200), nullable=False)
    property_type     = Column(String(50), nullable=True)   # Apartment, Villa, Labour Camp, Commercial, Land
    building_name     = Column(String(200), nullable=True)
    community         = Column(String(200), nullable=True)
    emirate           = Column(String(100), nullable=True)   # Dubai, Abu Dhabi, Sharjah …
    address_line_1    = Column(String(255), nullable=True)
    address_line_2    = Column(String(255), nullable=True)
    gps_location      = Column(String(100), nullable=True)   # "25.2048, 55.2708"
    total_units       = Column(Integer, nullable=True)
    total_area_sqm    = Column(Numeric(12, 2), nullable=True)
    status            = Column(String(30), default="Active")  # Active, Inactive, Under Construction
    main_photo        = Column(String(500), nullable=True)
    created_by        = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    units             = relationship("PropertyUnit", back_populates="property")
    valuations        = relationship("PropertyValuation", back_populates="property", order_by="PropertyValuation.valuation_date.desc()")
    documents         = relationship("PropertyDocument", back_populates="property")
    ownership_records = relationship("OwnershipRecord", back_populates="property")
    expenses          = relationship("Expense", back_populates="property")


class PropertyUnit(Base):
    """Individual units within a property (e.g., Flat 101, Room 5)."""
    __tablename__ = "property_units"

    unit_id        = Column(String(36), primary_key=True, default=generate_uuid)
    property_id    = Column(String(36), ForeignKey("properties.property_id"), nullable=False)
    unit_number    = Column(String(50), nullable=False)
    unit_type      = Column(String(50), nullable=True)   # Studio, 1BR, 2BR, Room, Bed Space …
    floor_number   = Column(String(20), nullable=True)
    balcony        = Column(String(50), nullable=True)   # With Balcony / Without Balcony
    area_sqm       = Column(Numeric(10, 2), nullable=True)
    plot_number    = Column(String(100), nullable=True)
    makani_number  = Column(String(100), nullable=True)
    status         = Column(String(30), default="Vacant")  # Vacant, Occupied, Under Maintenance
    unit_description = Column(Text, nullable=True)
    photo_1        = Column(String(500), nullable=True)
    photo_2        = Column(String(500), nullable=True)
    photo_3        = Column(String(500), nullable=True)
    photo_4        = Column(String(500), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    property       = relationship("Property", back_populates="units")
    leases         = relationship("Lease", back_populates="unit")
    title_deed     = relationship("TitleDeed", back_populates="unit", uselist=False)
    ownership_records = relationship("OwnershipRecord", back_populates="unit")


# ─────────────────────────────────────────────────────────────────────────────
# Title Deed — Legal Identity of the Property
# ─────────────────────────────────────────────────────────────────────────────

class TitleDeed(Base):
    """
    Title Deed Master Record.
    One-to-one with Property. Acts as the primary legal anchor for all other
    modules (ownership, financing, valuation, leasing, loans, profitability).
    """
    __tablename__ = "title_deeds"

    title_deed_id               = Column(String(36), primary_key=True, default=generate_uuid)
    unit_id                     = Column(String(36), ForeignKey("property_units.unit_id"), nullable=False, unique=True)

    # Legal Identifiers
    title_deed_number           = Column(String(100), nullable=True, index=True)
    municipality_property_number = Column(String(100), nullable=True)
    plot_number                 = Column(String(100), nullable=True)
    unit_number                 = Column(String(50), nullable=True)
    issue_date                  = Column(Date, nullable=True)

    # Ownership
    legal_owner_id              = Column(String(36), ForeignKey("legal_owners.legal_owner_id"), nullable=True)
    beneficial_owner_id         = Column(String(36), ForeignKey("beneficial_owners.beneficial_owner_id"), nullable=True)
    financier                   = Column(String(200), nullable=True)
    ownership_percentage        = Column(Numeric(5, 2), nullable=True)  # e.g. 100.00
    purchase_method             = Column(String(50), nullable=True)     # Cash, Mortgage, Transfer
    ownership_status            = Column(String(50), default="Active")  # Active, Mortgaged, Disputed, Sold

    # Financing / Mortgage
    loan_number                 = Column(String(100), nullable=True)
    mortgage_status             = Column(String(50), nullable=True)     # Clear, Mortgaged, Partial
    mortgage_bank               = Column(String(200), nullable=True)
    outstanding_loan            = Column(Numeric(15, 2), nullable=True)
    loan_to_value_ratio         = Column(Numeric(5, 2), nullable=True)  # LTV %
    mortgage_expiry_date        = Column(Date, nullable=True)

    attachment_path             = Column(String(500), nullable=True)

    created_at                  = Column(DateTime, default=datetime.utcnow)
    updated_at                  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    unit                        = relationship("PropertyUnit", back_populates="title_deed")
    acquisition_costs           = relationship("PropertyAcquisitionCost", back_populates="title_deed", uselist=False)
    legal_owner_rel             = relationship("LegalOwner", back_populates="title_deeds")
    beneficial_owner_rel        = relationship("BeneficialOwner", back_populates="title_deeds")


# ─────────────────────────────────────────────────────────────────────────────
# Acquisition Cost — Permanent Purchase Record
# ─────────────────────────────────────────────────────────────────────────────

class PropertyAcquisitionCost(Base):
    """
    Permanent purchase record. NEVER overwritten.
    Foundation for all ROI and capital appreciation calculations.
    """
    __tablename__ = "property_acquisition_costs"

    acquisition_id              = Column(String(36), primary_key=True, default=generate_uuid)
    title_deed_id               = Column(String(36), ForeignKey("title_deeds.title_deed_id"), nullable=False, unique=True)

    purchase_date               = Column(Date, nullable=True)
    purchase_price              = Column(Numeric(15, 2), nullable=True)
    purchase_currency           = Column(String(10), default="AED")
    seller_name                 = Column(String(200), nullable=True)
    purchase_agreement_number   = Column(String(100), nullable=True)
    title_transfer_date         = Column(Date, nullable=True)
    registration_fees           = Column(Numeric(12, 2), default=0)
    broker_commission           = Column(Numeric(12, 2), default=0)
    other_acquisition_costs     = Column(Numeric(12, 2), default=0)
    # total_acquisition_cost = purchase_price + registration_fees + broker_commission + other
    total_acquisition_cost      = Column(Numeric(15, 2), nullable=True)
    notes                       = Column(Text, nullable=True)

    created_at                  = Column(DateTime, default=datetime.utcnow)

    title_deed                  = relationship("TitleDeed", back_populates="acquisition_costs")


# ─────────────────────────────────────────────────────────────────────────────
# Property Valuation — Historical Record (NEVER Overwritten)
# ─────────────────────────────────────────────────────────────────────────────

class PropertyValuation(Base):
    """
    Each valuation entry creates a NEW record. Old records are never updated.
    This immutable history is essential for AI forecasting and investment audit.
    """
    __tablename__ = "property_valuations"

    valuation_id            = Column(String(36), primary_key=True, default=generate_uuid)
    property_id             = Column(String(36), ForeignKey("properties.property_id"), nullable=False)

    market_value            = Column(Numeric(15, 2), nullable=False)
    valuation_date          = Column(Date, nullable=False)
    valuation_source        = Column(String(100), nullable=True)   # Internal, RERA, Valuer, DLD
    valuation_method        = Column(String(100), nullable=True)   # Comparable Sales, Income Approach
    valuer_name             = Column(String(200), nullable=True)
    # Automatically calculated: ((market_value - total_acquisition_cost) / total_acquisition_cost) * 100
    appreciation_percentage = Column(Numeric(8, 2), nullable=True)
    notes                   = Column(Text, nullable=True)
    created_by              = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow)

    property                = relationship("Property", back_populates="valuations")


# ─────────────────────────────────────────────────────────────────────────────
# Property Document Store
# ─────────────────────────────────────────────────────────────────────────────

class PropertyDocument(Base):
    """
    Stores references to uploaded documents (Title Deed PDF, SPA, Mortgage,
    Floor Plan, NOC, Valuation Reports, Insurance).
    """
    __tablename__ = "property_documents"

    document_id     = Column(String(36), primary_key=True, default=generate_uuid)
    property_id     = Column(String(36), ForeignKey("properties.property_id"), nullable=False)
    document_type   = Column(String(100), nullable=False)  # Title Deed, SPA, Mortgage, Floor Plan, NOC, Valuation, Insurance
    document_name   = Column(String(255), nullable=False)
    file_path       = Column(String(500), nullable=False)   # server path or object storage key
    file_size_kb    = Column(Integer, nullable=True)
    uploaded_by     = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    upload_date     = Column(DateTime, default=datetime.utcnow)
    expiry_date     = Column(Date, nullable=True)           # for insurance, NOC etc.
    notes           = Column(Text, nullable=True)

    property        = relationship("Property", back_populates="documents")
