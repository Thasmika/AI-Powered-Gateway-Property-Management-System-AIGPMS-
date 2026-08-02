"""
Expense Management Models
===========================
Covers: cost_centres, expense_categories, expenses, expense_allocations,
        cashflow_commitments, system_settings (for configurable alert thresholds)

PM Decision: Two primary expense classes —
  A. General Expenses   — not attributable to one specific property
  B. Property-Related   — directly attributable to a property or unit
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


class CostCentre(Base):
    """Cost centres for grouping expenses (e.g., Head Office, IT, Operations)."""
    __tablename__ = "cost_centres"

    cost_centre_id      = Column(String(36), primary_key=True, default=generate_uuid)
    code                = Column(String(30), nullable=False, unique=True)
    name                = Column(String(200), nullable=False)
    description         = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    expenses            = relationship("Expense", back_populates="cost_centre")
    allocations         = relationship("ExpenseAllocation", back_populates="cost_centre")


class ExpenseCategory(Base):
    """
    Expense category master. Supports two classes:
      - General   (agent commission, software, admin, consultancy …)
      - Property  (repairs, maintenance, service charges, utilities …)
    """
    __tablename__ = "expense_categories"

    category_id         = Column(String(36), primary_key=True, default=generate_uuid)
    category_code       = Column(String(30), nullable=False, unique=True)
    category_name       = Column(String(200), nullable=False)
    # General | Property
    expense_class       = Column(String(30), nullable=False, default="General")
    description         = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    expenses            = relationship("Expense", back_populates="category")


class Expense(Base):
    """
    Expense master record — covers both General and Property-Related expenses.
    Uses expense_class to distinguish between the two types.
    """
    __tablename__ = "expenses"

    expense_id              = Column(String(36), primary_key=True, default=generate_uuid)
    expense_reference       = Column(String(50), nullable=False, unique=True, index=True)
    # General | Property
    expense_class           = Column(String(30), nullable=False)
    category_id             = Column(String(36), ForeignKey("expense_categories.category_id"), nullable=False)

    # Payee / Supplier
    payee_name              = Column(String(200), nullable=False)
    description             = Column(Text, nullable=True)

    # Invoice Details
    invoice_date            = Column(Date, nullable=True)
    invoice_number          = Column(String(100), nullable=True)
    amount                  = Column(Numeric(14, 2), nullable=False)
    tax_amount              = Column(Numeric(12, 2), default=0)
    total_amount            = Column(Numeric(14, 2), nullable=False)  # amount + tax_amount

    # Payment
    payment_method          = Column(String(50), nullable=True)   # Cheque, Transfer, Cash, PDC
    payment_voucher_ref     = Column(String(100), nullable=True)
    pdc_issued_id           = Column(String(36), ForeignKey("pdc_issued.pdc_issued_id"), nullable=True)

    # Approval
    approval_status         = Column(String(30), default="Pending")
    # Pending | Approved | Rejected | On Hold
    approved_by             = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    approved_at             = Column(DateTime, nullable=True)

    # Cost Centre (used when not fully allocated to a single property)
    cost_centre_id          = Column(String(36), ForeignKey("cost_centres.cost_centre_id"), nullable=True)

    # Property-Related fields (nullable for General expenses)
    property_id             = Column(String(36), ForeignKey("properties.property_id"), nullable=True)
    unit_id                 = Column(String(36), ForeignKey("property_units.unit_id"), nullable=True)
    maintenance_ticket_id   = Column(String(36), nullable=True)  # FK to maintenance_tickets (future)
    lpo_id                  = Column(String(36), nullable=True)  # FK to lpos (future)
    supplier_id             = Column(String(36), nullable=True)  # FK to suppliers (future)

    # Allocation flag — True if shared across multiple properties
    is_shared               = Column(Boolean, default=False)

    attachment_path         = Column(String(500), nullable=True)
    notes                   = Column(Text, nullable=True)
    created_by              = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category                = relationship("ExpenseCategory", back_populates="expenses")
    cost_centre             = relationship("CostCentre", back_populates="expenses")
    property                = relationship("Property", back_populates="expenses")
    allocations             = relationship("ExpenseAllocation", back_populates="expense",
                                           cascade="all, delete-orphan")


class ExpenseAllocation(Base):
    """
    Expense allocation — distributes a shared expense across multiple properties.

    PM Approved Allocation Methods:
      - 100%            → direct to one property
      - Percentage      → defined % across properties
      - Fixed Amount    → specific AED amount per property
      - Unit Count      → divide by number of units
      - Area            → divide by floor area
      - Ownership Share → divide by ownership percentage
      - Cost Centre     → no property allocation
      - Residual        → remaining after other allocations
    """
    __tablename__ = "expense_allocations"

    allocation_id           = Column(String(36), primary_key=True, default=generate_uuid)
    expense_id              = Column(String(36), ForeignKey("expenses.expense_id"), nullable=False)
    property_id             = Column(String(36), ForeignKey("properties.property_id"), nullable=True)
    cost_centre_id          = Column(String(36), ForeignKey("cost_centres.cost_centre_id"), nullable=True)

    # Allocation Method: Percentage | Fixed Amount | Unit Count | Area | Ownership Share | Residual | Cost Centre
    allocation_method       = Column(String(50), nullable=False)
    allocation_percentage   = Column(Numeric(6, 3), nullable=True)   # e.g. 33.333
    allocation_amount       = Column(Numeric(14, 2), nullable=True)  # calculated AED amount
    basis_value             = Column(Numeric(10, 2), nullable=True)  # units / sqft / % depending on method
    notes                   = Column(Text, nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow)

    expense                 = relationship("Expense", back_populates="allocations")
    cost_centre             = relationship("CostCentre", back_populates="allocations")


class CashflowCommitment(Base):
    """
    Forward-looking cash commitments for the cash-flow dashboard.
    Aggregates upcoming PDC issued, loan instalments, and expenses.
    """
    __tablename__ = "cashflow_commitments"

    commitment_id       = Column(String(36), primary_key=True, default=generate_uuid)
    commitment_date     = Column(Date, nullable=False)
    commitment_type     = Column(String(50), nullable=False)  # PDC Issued, Loan Instalment, Expense, PDC Incoming
    description         = Column(String(300), nullable=True)
    amount              = Column(Numeric(14, 2), nullable=False)
    currency            = Column(String(10), default="AED")
    direction           = Column(String(10), nullable=False)  # Outgoing | Incoming
    reference_id        = Column(String(36), nullable=True)   # FK to source record
    reference_type      = Column(String(50), nullable=True)   # pdc_issued | pdc_received | loan_instalment | expense
    bank_account_id     = Column(String(36), ForeignKey("bank_accounts.account_id"), nullable=True)
    is_settled          = Column(Boolean, default=False)
    notes               = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)


class SystemSetting(Base):
    """
    Configurable system settings — including PDC alert thresholds.
    Allows admin to change alert days without code deployment.
    """
    __tablename__ = "system_settings"

    setting_id          = Column(String(36), primary_key=True, default=generate_uuid)
    setting_key         = Column(String(100), nullable=False, unique=True)
    setting_value       = Column(Text, nullable=False)
    setting_description = Column(Text, nullable=True)
    setting_type        = Column(String(30), default="String")  # String | Integer | Boolean | JSON
    is_editable         = Column(Boolean, default=True)
    updated_by          = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AlertLog(Base):
    """
    AI Smart Alert Engine — persists every alert fired for the dashboard.
    Supports in-app bell notifications. Phase 1: in-app only.

    alert_type examples:
      PDC_RECEIVED_DUE_30 | PDC_RECEIVED_DUE_14 | PDC_RECEIVED_DUE_7
      PDC_RECEIVED_DUE_3  | PDC_RECEIVED_DUE_TODAY | PDC_RECEIVED_OVERDUE
      PDC_RECEIVED_RETURNED | PDC_RECEIVED_NOT_CLEARED
      PDC_ISSUED_DUE_30  | PDC_ISSUED_DUE_14 | PDC_ISSUED_DUE_7
      PDC_ISSUED_DUE_3   | PDC_ISSUED_DUE_TODAY | PDC_ISSUED_OVERDUE
    """
    __tablename__ = "alert_logs"

    alert_id            = Column(String(36), primary_key=True, default=generate_uuid)
    alert_type          = Column(String(80), nullable=False, index=True)
    # Severity: Info | Warning | Critical
    severity            = Column(String(20), nullable=False, default="Info")
    entity_type         = Column(String(50), nullable=True)   # pdc_received | pdc_issued
    entity_id           = Column(String(36), nullable=True)   # FK value (not enforced — flexible)
    title               = Column(String(200), nullable=False)
    message             = Column(Text, nullable=True)

    # Dismiss tracking
    is_dismissed        = Column(Boolean, default=False)
    dismissed_by        = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    dismissed_at        = Column(DateTime, nullable=True)

    created_at          = Column(DateTime, default=datetime.utcnow, index=True)

