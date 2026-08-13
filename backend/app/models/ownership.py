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


class LegalOwner(Base):
    """
    Legal Owner master record — can be a natural person or a legal entity.
    """
    __tablename__ = "legal_owners"

    legal_owner_id  = Column(String(36), primary_key=True, default=generate_uuid)
    owner_type      = Column(String(30), nullable=False)   # Individual, Company, Trust, Government
    full_name       = Column(String(200), nullable=False)
    trade_name      = Column(String(200), nullable=True)   # for companies
    id_number       = Column(String(100), nullable=True)   # Emirates ID / Passport / Trade License
    id_type         = Column(String(50), nullable=True)    # Emirates ID, Passport, Trade License
    nationality     = Column(String(100), nullable=True)
    email           = Column(String(150), nullable=True)
    phone           = Column(String(30), nullable=True)
    address         = Column(Text, nullable=True)
    
    # Banking Details
    bank_id             = Column(String(36), ForeignKey("master_banks.bank_id"), nullable=True)
    bank_account_name   = Column(String(200), nullable=True)
    bank_account_number = Column(String(100), nullable=True)

    status          = Column(String(20), default="Active")
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ownership_records       = relationship("OwnershipRecord", back_populates="legal_owner")
    
    # Relationship to Title Deed
    title_deeds = relationship("TitleDeed", back_populates="legal_owner_rel")

    # Relationship to Bank
    bank = relationship("MasterBank", back_populates="legal_owners")


class BeneficialOwner(Base):
    """
    Beneficial Owner master record — can be a natural person or a legal entity.
    """
    __tablename__ = "beneficial_owners"

    beneficial_owner_id = Column(String(36), primary_key=True, default=generate_uuid)
    owner_type          = Column(String(30), nullable=False)   # Individual, Company, Trust, Government
    full_name           = Column(String(200), nullable=False)
    trade_name          = Column(String(200), nullable=True)   # for companies
    id_number           = Column(String(100), nullable=True)   # Emirates ID / Passport / Trade License
    id_type             = Column(String(50), nullable=True)    # Emirates ID, Passport, Trade License
    nationality         = Column(String(100), nullable=True)
    email               = Column(String(150), nullable=True)
    phone               = Column(String(30), nullable=True)
    address             = Column(Text, nullable=True)
    
    # Banking Details
    bank_id             = Column(String(36), ForeignKey("master_banks.bank_id"), nullable=True)
    bank_account_name   = Column(String(200), nullable=True)
    bank_account_number = Column(String(100), nullable=True)

    status              = Column(String(20), default="Active")
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    beneficiary_allocations = relationship("BeneficiaryAllocation", back_populates="beneficial_owner")

    # Relationship to Title Deed
    title_deeds = relationship("TitleDeed", back_populates="beneficial_owner_rel")

    # Relationship to Bank
    bank = relationship("MasterBank", back_populates="beneficial_owners")


class OwnershipRecord(Base):
    """
    Links an owner to a property with percentage and dates.
    Supports multiple co-owners with individual shares.
    """
    __tablename__ = "ownership_records"

    ownership_id            = Column(String(36), primary_key=True, default=generate_uuid)
    property_id             = Column(String(36), ForeignKey("properties.property_id"), nullable=False)
    unit_id                 = Column(String(36), ForeignKey("property_units.unit_id"), nullable=True)
    legal_owner_id          = Column(String(36), ForeignKey("legal_owners.legal_owner_id"), nullable=False)
    ownership_type          = Column(String(30), nullable=False)  # Legal, Co-owner
    ownership_percentage    = Column(Numeric(5, 2), nullable=False)  # Must total 100% across co-owners
    effective_from          = Column(Date, nullable=True)
    effective_to            = Column(Date, nullable=True)
    is_current              = Column(Boolean, default=True)
    notes                   = Column(Text, nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow)

    property                = relationship("Property", back_populates="ownership_records")
    unit                    = relationship("PropertyUnit", back_populates="ownership_records")
    legal_owner             = relationship("LegalOwner", back_populates="ownership_records")
    beneficiary_allocations = relationship("BeneficiaryAllocation", back_populates="ownership_record")


class BeneficiaryAllocation(Base):
    """
    Defines how income (rent) is split among beneficiaries.
    Links to OwnershipRecord and drives financial distribution calculations.
    """
    __tablename__ = "beneficiary_allocations"

    allocation_id           = Column(String(36), primary_key=True, default=generate_uuid)
    ownership_record_id     = Column(String(36), ForeignKey("ownership_records.ownership_id"), nullable=False)
    beneficial_owner_id     = Column(String(36), ForeignKey("beneficial_owners.beneficial_owner_id"), nullable=False)
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
    beneficial_owner        = relationship("BeneficialOwner", back_populates="beneficiary_allocations")
