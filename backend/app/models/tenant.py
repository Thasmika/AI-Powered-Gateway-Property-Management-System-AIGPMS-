"""
Tenant & Lease Management Models
===================================
Covers: tenants, leases, lease_versions, lease_payment_schedules, lease_documents
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


class Tenant(Base):
    """
    Tenant master record. Linked to one or more leases over time.
    Covers both individual and corporate tenants.
    """
    __tablename__ = "tenants"

    tenant_id           = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_type         = Column(String(30), nullable=False)    # Individual, Company
    full_name           = Column(String(200), nullable=False)
    trade_name          = Column(String(200), nullable=True)    # company trade name
    id_number           = Column(String(100), nullable=True)    # Emirates ID / Passport
    id_type             = Column(String(50), nullable=True)     # Emirates ID, Passport, Trade License
    id_expiry           = Column(Date, nullable=True)
    nationality         = Column(String(100), nullable=True)
    email               = Column(String(150), nullable=True)
    phone               = Column(String(30), nullable=True)
    whatsapp            = Column(String(30), nullable=True)
    address             = Column(Text, nullable=True)
    employer            = Column(String(200), nullable=True)
    emergency_contact   = Column(String(200), nullable=True)
    status              = Column(String(20), default="Active")  # Active, Inactive, Blacklisted
    notes               = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    leases              = relationship("Lease", back_populates="tenant")
    receipts            = relationship("RentalReceipt", back_populates="tenant")


class Lease(Base):
    """
    Lease master record. Each renewal creates a new LeaseVersion, not a new Lease.
    The Lease is the container; LeaseVersion holds the effective terms.
    """
    __tablename__ = "leases"

    lease_id            = Column(String(36), primary_key=True, default=generate_uuid)
    lease_number        = Column(String(50), nullable=False, unique=True, index=True)
    property_id         = Column(String(36), ForeignKey("properties.property_id"), nullable=False)
    unit_id             = Column(String(36), ForeignKey("property_units.unit_id"), nullable=False)
    tenant_id           = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    lease_type          = Column(String(50), nullable=True)    # Residential, Commercial, Labour Camp
    status              = Column(String(30), default="Active") # Active, Expired, Terminated, Renewed
    created_by          = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant              = relationship("Tenant", back_populates="leases")
    unit                = relationship("PropertyUnit", back_populates="leases")
    versions            = relationship("LeaseVersion", back_populates="lease", order_by="LeaseVersion.version_number")
    receipts            = relationship("RentalReceipt", back_populates="lease")
    pdc_received        = relationship("PDCReceived", back_populates="lease")


class LeaseVersion(Base):
    """
    Each contract or renewal creates a new version. Full history is preserved.
    Version 1 = original contract. Version 2 = first renewal. Etc.
    """
    __tablename__ = "lease_versions"

    version_id              = Column(String(36), primary_key=True, default=generate_uuid)
    lease_id                = Column(String(36), ForeignKey("leases.lease_id"), nullable=False)
    version_number          = Column(Integer, nullable=False, default=1)  # 1, 2, 3 …

    # Contract Terms
    contract_start_date     = Column(Date, nullable=False)
    contract_end_date       = Column(Date, nullable=False)
    annual_rent             = Column(Numeric(12, 2), nullable=False)
    currency                = Column(String(10), default="AED")
    payment_frequency       = Column(String(30), nullable=True)   # Monthly, Quarterly, Semi-Annual, Annual
    number_of_cheques       = Column(Integer, nullable=True)      # Typically 4 or 5
    security_deposit        = Column(Numeric(12, 2), default=0)
    agent_commission        = Column(Numeric(12, 2), default=0)
    municipality_fee        = Column(Numeric(12, 2), default=0)
    ejari_number            = Column(String(100), nullable=True)  # Ejari registration reference
    contract_reference      = Column(String(100), nullable=True)

    # Version Control
    is_current_version      = Column(Boolean, default=True)
    superseded_by           = Column(String(36), ForeignKey("lease_versions.version_id"), nullable=True)
    renewal_reason          = Column(Text, nullable=True)
    approved_by             = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    approved_at             = Column(DateTime, nullable=True)
    status                  = Column(String(30), default="Active")  # Draft, Active, Expired, Terminated
    notes                   = Column(Text, nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow)

    lease                   = relationship("Lease", back_populates="versions")
    payment_schedules       = relationship("LeasePaymentSchedule", back_populates="lease_version")
    pdc_received            = relationship("PDCReceived", back_populates="lease_version")
    receipt_lines           = relationship("RentalReceiptPaymentLine", back_populates="lease_version")


class LeasePaymentSchedule(Base):
    """
    Approved payment schedule for a lease version.
    PDC totals are validated against this schedule (PM requirement).
    """
    __tablename__ = "lease_payment_schedules"

    schedule_id         = Column(String(36), primary_key=True, default=generate_uuid)
    lease_version_id    = Column(String(36), ForeignKey("lease_versions.version_id"), nullable=False)
    instalment_number   = Column(Integer, nullable=False)  # 1, 2, 3, 4, 5
    due_date            = Column(Date, nullable=False)
    amount              = Column(Numeric(12, 2), nullable=False)
    period_from         = Column(Date, nullable=True)
    period_to           = Column(Date, nullable=True)
    payment_reference   = Column(String(100), nullable=True)
    status              = Column(String(30), default="Pending")  # Pending, Partially Paid, Paid
    notes               = Column(Text, nullable=True)

    lease_version       = relationship("LeaseVersion", back_populates="payment_schedules")
    pdc_received        = relationship("PDCReceived", back_populates="receivable")


class LeaseDocument(Base):
    """Documents attached to a lease or lease version."""
    __tablename__ = "lease_documents"

    document_id         = Column(String(36), primary_key=True, default=generate_uuid)
    lease_id            = Column(String(36), ForeignKey("leases.lease_id"), nullable=False)
    lease_version_id    = Column(String(36), ForeignKey("lease_versions.version_id"), nullable=True)
    document_type       = Column(String(100), nullable=False)  # Tenancy Contract, Emirates ID, Passport, NOC
    document_name       = Column(String(255), nullable=False)
    file_path           = Column(String(500), nullable=False)
    uploaded_by         = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    upload_date         = Column(DateTime, default=datetime.utcnow)
    expiry_date         = Column(Date, nullable=True)
    notes               = Column(Text, nullable=True)
