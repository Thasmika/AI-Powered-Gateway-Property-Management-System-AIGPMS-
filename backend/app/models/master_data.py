"""
Master Data Models — Module 15
10 lookup/reference tables that feed all downstream module dropdowns.
No hardcoded values anywhere in the system — all reference data lives here.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, DateTime, Numeric, Integer
from sqlalchemy.orm import relationship
from app.database.session import Base


def generate_uuid():
    return str(uuid.uuid4())


# ── 1. Banks ──────────────────────────────────────────────────────────────────

class MasterBank(Base):
    __tablename__ = "master_banks"

    bank_id = Column(String(36), primary_key=True, default=generate_uuid)
    bank_name = Column(String(150), nullable=False, unique=True)
    bank_code = Column(String(20), nullable=True)          # BIC / SWIFT
    country = Column(String(50), default="UAE")
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    legal_owners = relationship("LegalOwner", back_populates="bank")
    beneficial_owners = relationship("BeneficialOwner", back_populates="bank")


# ── 2. Communities / Locations ────────────────────────────────────────────────

class MasterCommunity(Base):
    __tablename__ = "master_communities"

    community_id = Column(String(36), primary_key=True, default=generate_uuid)
    community_name = Column(String(150), nullable=False)
    emirate = Column(String(50), nullable=False)            # Dubai, Abu Dhabi, etc.
    zone = Column(String(100), nullable=True)               # Freehold / Leasehold zone
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── 3. Emirates ───────────────────────────────────────────────────────────────

class MasterEmirate(Base):
    __tablename__ = "master_emirates"

    emirate_id = Column(String(36), primary_key=True, default=generate_uuid)
    emirate_name = Column(String(100), nullable=False, unique=True)
    emirate_code = Column(String(10), nullable=True)        # DXB, AUH, SHJ, etc.
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)


# ── 4. Property Types ─────────────────────────────────────────────────────────

class MasterPropertyType(Base):
    __tablename__ = "master_property_types"

    property_type_id = Column(String(36), primary_key=True, default=generate_uuid)
    type_name = Column(String(100), nullable=False, unique=True)
    # e.g. Apartment, Villa, Townhouse, Commercial, Labour Camp Unit, Land
    type_class = Column(String(50), nullable=True)          # Residential / Commercial / Mixed
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── 5. Expense Categories ─────────────────────────────────────────────────────

class MasterExpenseCategory(Base):
    __tablename__ = "master_expense_categories"

    category_id = Column(String(36), primary_key=True, default=generate_uuid)
    category_name = Column(String(150), nullable=False)
    expense_class = Column(String(20), nullable=False)      # General / Property
    parent_category_id = Column(String(36), nullable=True)  # For sub-categories
    gl_code = Column(String(30), nullable=True)             # General Ledger mapping
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── 6. Maintenance Categories ─────────────────────────────────────────────────

class MasterMaintenanceCategory(Base):
    __tablename__ = "master_maintenance_categories"

    maint_category_id = Column(String(36), primary_key=True, default=generate_uuid)
    category_name = Column(String(150), nullable=False)
    # e.g. Plumbing, Electrical, HVAC, Civil, Painting, General
    default_sla_hours = Column(Integer, nullable=True)      # Default response SLA
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── 7. Payment Methods ────────────────────────────────────────────────────────

class MasterPaymentMethod(Base):
    __tablename__ = "master_payment_methods"

    method_id = Column(String(36), primary_key=True, default=generate_uuid)
    method_name = Column(String(100), nullable=False, unique=True)
    # Cash, Cheque, Bank Transfer, Online Transfer, Direct Debit
    requires_cheque_details = Column(Boolean, default=False)
    requires_bank_details = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── 8. Notification Templates ─────────────────────────────────────────────────

class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    template_id = Column(String(36), primary_key=True, default=generate_uuid)
    template_code = Column(String(50), nullable=False, unique=True)
    # e.g. PDC_DUE_7DAYS, LEASE_EXPIRY_30DAYS, CHEQUE_RETURNED
    template_name = Column(String(150), nullable=False)
    module = Column(String(50), nullable=False)             # PDC, Lease, Maintenance
    subject = Column(String(255), nullable=True)            # Email subject
    body_template = Column(Text, nullable=False)            # Message with {{placeholders}}
    channel = Column(String(20), default="Dashboard")       # Dashboard / Email / WhatsApp
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── 9. AI Prompt Templates ────────────────────────────────────────────────────

class AIPromptTemplate(Base):
    __tablename__ = "ai_prompt_templates"

    prompt_id = Column(String(36), primary_key=True, default=generate_uuid)
    prompt_label = Column(String(200), nullable=False)      # Displayed in UI as suggestion
    prompt_text = Column(Text, nullable=False)              # Full natural-language prompt
    module = Column(String(50), nullable=True)              # PDC, Investment, Expense, General
    is_featured = Column(Boolean, default=False)            # Show in quick-select panel
    sort_order = Column(Integer, default=99)
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── 10. Approval Limits ───────────────────────────────────────────────────────

class ApprovalLimit(Base):
    __tablename__ = "approval_limits"

    limit_id = Column(String(36), primary_key=True, default=generate_uuid)
    module = Column(String(50), nullable=False)             # Expense, PDC Issued, Payment Voucher
    role_name = Column(String(50), nullable=False)          # Accountant, Managing Director
    auto_approve_threshold = Column(Numeric(15, 2), nullable=True)
    # NULL = requires approval for all amounts
    # 0 = can auto-approve anything
    # 50000 = auto-approve up to 50,000 AED
    currency = Column(String(3), default="AED")
    requires_md_above = Column(Numeric(15, 2), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── 11. Suppliers / Payees ────────────────────────────────────────────────────

class Supplier(Base):
    """Master list of suppliers and payees used across expenses and payment vouchers."""
    __tablename__ = "suppliers"

    supplier_id    = Column(String(36), primary_key=True, default=generate_uuid)
    supplier_name  = Column(String(200), nullable=False)
    # Agent | Construction Company | Material Supplier | Government | Utility | Other
    supplier_type  = Column(String(100), nullable=True)
    contact_number = Column(String(50), nullable=True)
    email          = Column(String(150), nullable=True)
    is_active      = Column(Boolean, default=True)
    created_date   = Column(DateTime, default=datetime.utcnow)
    updated_date   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
