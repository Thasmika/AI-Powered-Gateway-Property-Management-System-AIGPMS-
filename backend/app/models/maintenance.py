"""
Maintenance Management Models — Module 09 — Sprint 8
======================================================
Tables:
  - maintenance_categories  : Category master (Plumbing, Electrical, HVAC, etc.)
  - maintenance_tickets     : Work orders / maintenance requests
  - maintenance_assignments : Staff assignments per ticket
  - maintenance_documents   : Photos, LPOs, invoices linked to a ticket

Ticket Lifecycle (PM Approved):
  Open → Assigned → In Progress → Pending Parts/LPO → Completed → Verified → Closed
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


class MaintenanceCategory(Base):
    """
    Maintenance category master.
    Examples: Plumbing, Electrical, HVAC, Civil/Structural, Painting,
              Appliances, Cleaning, Pest Control, General Handyman
    """
    __tablename__ = "maintenance_categories"

    category_id     = Column(String(36), primary_key=True, default=generate_uuid)
    category_code   = Column(String(30), nullable=False, unique=True, index=True)
    category_name   = Column(String(200), nullable=False)
    description     = Column(Text, nullable=True)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    tickets         = relationship("MaintenanceTicket", back_populates="category")


class MaintenanceTicket(Base):
    """
    Maintenance work order / request.

    Priority levels: Low | Medium | High | Critical (Urgent)
    Ticket Lifecycle: Open → Assigned → In Progress → Pending Parts/LPO
                      → Completed → Verified → Closed
    """
    __tablename__ = "maintenance_tickets"

    ticket_id           = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_number       = Column(String(50), nullable=False, unique=True, index=True)

    # Location
    property_id         = Column(String(36), ForeignKey("properties.property_id"), nullable=False)
    unit_id             = Column(String(36), ForeignKey("property_units.unit_id"), nullable=True)

    # Classification
    category_id         = Column(String(36), ForeignKey("maintenance_categories.category_id"), nullable=False)
    # Low | Medium | High | Critical
    priority            = Column(String(20), nullable=False, default="Medium")

    # Description
    title               = Column(String(300), nullable=False)
    description         = Column(Text, nullable=True)

    # Tenant / Requester
    tenant_id           = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    reported_by         = Column(String(200), nullable=True)    # Free-text name if not a tenant
    reported_date       = Column(Date, nullable=False, default=datetime.utcnow)

    # Status lifecycle
    # Open | Assigned | In Progress | Pending Parts/LPO | Completed | Verified | Closed | Cancelled
    status              = Column(String(40), nullable=False, default="Open", index=True)

    # Dates
    target_completion_date  = Column(Date, nullable=True)
    actual_completion_date  = Column(Date, nullable=True)
    closed_date             = Column(Date, nullable=True)

    # Supplier / Contractor
    supplier_name       = Column(String(200), nullable=True)
    lpo_number          = Column(String(100), nullable=True)    # LPO reference
    lpo_amount          = Column(Numeric(12, 2), nullable=True)

    # Cost — linked to expense module
    estimated_cost      = Column(Numeric(12, 2), nullable=True)
    actual_cost         = Column(Numeric(12, 2), nullable=True)
    # FK to expenses.expense_id — populated once expense is raised for this ticket
    expense_id          = Column(String(36), ForeignKey("expenses.expense_id"), nullable=True)

    # Remarks
    resolution_notes    = Column(Text, nullable=True)
    internal_notes      = Column(Text, nullable=True)

    # Audit
    created_by          = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category            = relationship("MaintenanceCategory", back_populates="tickets")
    assignments         = relationship("MaintenanceAssignment", back_populates="ticket",
                                       cascade="all, delete-orphan")
    documents           = relationship("MaintenanceDocument", back_populates="ticket",
                                       cascade="all, delete-orphan")


class MaintenanceAssignment(Base):
    """
    Staff assignments per ticket. Multiple technicians may be assigned.
    Tracks start and end times for each assignment.
    """
    __tablename__ = "maintenance_assignments"

    assignment_id       = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id           = Column(String(36), ForeignKey("maintenance_tickets.ticket_id"), nullable=False)

    # Assigned user (maintenance staff)
    assigned_to_user_id = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    # If external / contractor — free text
    assigned_to_name    = Column(String(200), nullable=True)

    assigned_by         = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    assigned_at         = Column(DateTime, default=datetime.utcnow)

    # Work tracking
    started_at          = Column(DateTime, nullable=True)
    completed_at        = Column(DateTime, nullable=True)

    # Active / Reassigned / Completed / Cancelled
    assignment_status   = Column(String(30), default="Active")
    notes               = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    ticket              = relationship("MaintenanceTicket", back_populates="assignments")


class MaintenanceDocument(Base):
    """
    Documents / photos / invoices linked to a maintenance ticket.
    Document types: Photo | LPO | Invoice | Before Photo | After Photo | Other
    """
    __tablename__ = "maintenance_documents"

    document_id         = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id           = Column(String(36), ForeignKey("maintenance_tickets.ticket_id"), nullable=False)

    # Photo | LPO | Invoice | Before Photo | After Photo | Report | Other
    document_type       = Column(String(50), nullable=False)
    file_name           = Column(String(300), nullable=False)
    file_path           = Column(String(500), nullable=False)
    file_size_bytes     = Column(Integer, nullable=True)
    mime_type           = Column(String(100), nullable=True)
    description         = Column(String(300), nullable=True)

    uploaded_by         = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    uploaded_at         = Column(DateTime, default=datetime.utcnow)

    ticket              = relationship("MaintenanceTicket", back_populates="documents")
