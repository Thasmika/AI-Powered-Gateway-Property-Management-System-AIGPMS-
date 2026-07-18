"""
Ownership & Beneficiary Models
================================
Covers: owners, ownership_records, beneficiary_allocations
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, ForeignKey, DateTime, Text, Numeric, Date, Boolean
)
from sqlalchemy.orm import relationship
from app.database.session import Base


def generate_uuid():
    return str(uuid.uuid4())


class Owner(Base):
    """
    Owner master record — can be a natural person or a legal entity.
    May act as legal owner, beneficial owner, or both.
    """
    __tablename__ = "owners"

    owner_id        = Column(String(36), primary_key=True, default=generate_uuid)
    owner_type      = Column(String(30), nullable=False)   # Individual, Company, Trust, Government
    full_name       = Column(String(200), nullable=False)
    trade_name      = Column(String(200), nullable=True)   # for companies
    id_number       = Column(String(100), nullable=True)   # Emirates ID / Passport / Trade License
    id_type         = Column(String(50), nullable=True)    # Emirates ID, Passport, Trade License
    nationality     = Column(String(100), nullable=True)
    email           = Column(String(150), nullable=True)
    phone           = Column(String(30), nullable=True)
    address         = Column(Text, nullable=True)
    status          = Column(String(20), default="Active")
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ownership_records       = relationship("OwnershipRecord", back_populates="owner")
    beneficiary_allocations = relationship("BeneficiaryAllocation", back_populates="beneficiary")


class OwnershipRecord(Base):
    """
    Links an owner to a property with percentage and dates.
    Supports multiple co-owners with individual shares.
    """
    __tablename__ = "ownership_records"

    ownership_id            = Column(String(36), primary_key=True, default=generate_uuid)
    property_id             = Column(String(36), ForeignKey("properties.property_id"), nullable=False)
    owner_id                = Column(String(36), ForeignKey("owners.owner_id"), nullable=False)
    ownership_type          = Column(String(30), nullable=False)  # Legal, Beneficial, Co-owner
    ownership_percentage    = Column(Numeric(5, 2), nullable=False)  # Must total 100% across co-owners
    effective_from          = Column(Date, nullable=True)
    effective_to            = Column(Date, nullable=True)
    is_current              = Column(Boolean, default=True)
    notes                   = Column(Text, nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow)

    property                = relationship("Property", back_populates="ownership_records")
    owner                   = relationship("Owner", back_populates="ownership_records")
    beneficiary_allocations = relationship("BeneficiaryAllocation", back_populates="ownership_record")


class BeneficiaryAllocation(Base):
    """
    Defines how income (rent) is split among beneficiaries.
    Links to OwnershipRecord and drives financial distribution calculations.
    """
    __tablename__ = "beneficiary_allocations"

    allocation_id           = Column(String(36), primary_key=True, default=generate_uuid)
    ownership_record_id     = Column(String(36), ForeignKey("ownership_records.ownership_id"), nullable=False)
    beneficiary_id          = Column(String(36), ForeignKey("owners.owner_id"), nullable=False)
    allocation_percentage   = Column(Numeric(5, 2), nullable=False)  # Share of rental income
    bank_account_name       = Column(String(200), nullable=True)
    bank_account_number     = Column(String(100), nullable=True)
    bank_name               = Column(String(200), nullable=True)
    iban                    = Column(String(50), nullable=True)
    effective_from          = Column(Date, nullable=True)
    effective_to            = Column(Date, nullable=True)
    is_current              = Column(Boolean, default=True)
    notes                   = Column(Text, nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow)

    ownership_record        = relationship("OwnershipRecord", back_populates="beneficiary_allocations")
    beneficiary             = relationship("Owner", back_populates="beneficiary_allocations")
