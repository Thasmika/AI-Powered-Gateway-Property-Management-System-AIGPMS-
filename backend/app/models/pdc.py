"""
PDC (Post-Dated Cheque) Models — Received & Issued
====================================================
Covers:
  PDC Received: rental_receipts, rental_receipt_payment_lines,
                pdc_received, pdc_received_status_history,
                cheque_replacements, cheque_returns

  PDC Issued:   cheque_books, cheque_leaves, pdc_issued,
                pdc_issued_status_history, authorized_signatories

Architecture Rule (PM Approved):
  - PDCs are INDEPENDENT financial instruments, NOT text fields inside receipts
  - Each cheque has its own lifecycle, status history, alerts, and replacements
  - One receipt header → many payment lines → one pdc_received record per cheque
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


# ─────────────────────────────────────────────────────────────────────────────
# PDC RECEIVED MODULE
# ─────────────────────────────────────────────────────────────────────────────

class RentalReceipt(Base):
    """
    Receipt Header — one per collection event (e.g., 1 receipt for 5 PDCs at
    lease signing). Immutable once Posted; corrections via Reversal only.
    """
    __tablename__ = "rental_receipts"

    receipt_id          = Column(String(36), primary_key=True, default=generate_uuid)
    receipt_number      = Column(String(50), nullable=False, unique=True, index=True)
    receipt_date        = Column(Date, nullable=False)
    tenant_id           = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    property_id         = Column(String(36), ForeignKey("properties.property_id"), nullable=False)
    unit_id             = Column(String(36), ForeignKey("property_units.unit_id"), nullable=True)
    lease_id            = Column(String(36), ForeignKey("leases.lease_id"), nullable=False)
    lease_version_id    = Column(String(36), ForeignKey("lease_versions.version_id"), nullable=False)
    payment_purpose     = Column(String(200), nullable=True)   # New Tenancy, Renewal, Partial, etc.
    currency            = Column(String(10), default="AED")
    # total_amount auto-validated == sum of payment_lines
    total_amount        = Column(Numeric(14, 2), nullable=False)
    receipt_status      = Column(String(30), default="Draft")
    # Statuses: Draft | Pending Verification | Posted | Partially Allocated |
    #           Fully Allocated | Reversed | Cancelled
    received_by         = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    remarks             = Column(Text, nullable=True)
    attachment_path     = Column(String(500), nullable=True)
    posted_at           = Column(DateTime, nullable=True)
    posted_by           = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant              = relationship("Tenant", back_populates="receipts")
    lease               = relationship("Lease", back_populates="receipts")
    payment_lines       = relationship("RentalReceiptPaymentLine", back_populates="receipt",
                                       cascade="all, delete-orphan")


class RentalReceiptPaymentLine(Base):
    """
    Detail grid — one row per payment instrument.
    A single receipt can have multiple cheque rows (PM requirement).
    Each cheque row creates / links to a separate pdc_received record.
    """
    __tablename__ = "rental_receipt_payment_lines"

    payment_line_id     = Column(String(36), primary_key=True, default=generate_uuid)
    receipt_id          = Column(String(36), ForeignKey("rental_receipts.receipt_id"), nullable=False)
    lease_version_id    = Column(String(36), ForeignKey("lease_versions.version_id"), nullable=True)
    line_number         = Column(Integer, nullable=False)  # auto-generated sequence
    # Instrument Type: PDC | Current-Dated Cheque | Cash | Bank Transfer | Card | Other
    instrument_type     = Column(String(50), nullable=False)
    amount              = Column(Numeric(14, 2), nullable=False)

    # Cheque fields (mandatory when instrument_type is cheque-based)
    cheque_number       = Column(String(100), nullable=True)
    bank_name           = Column(String(200), nullable=True)
    account_holder      = Column(String(200), nullable=True)
    instrument_date     = Column(Date, nullable=True)   # cheque date

    # Rental period this instrument covers
    rental_period_from  = Column(Date, nullable=True)
    rental_period_to    = Column(Date, nullable=True)

    # Links
    receivable_id       = Column(String(36), ForeignKey("lease_payment_schedules.schedule_id"), nullable=True)
    pdc_received_id     = Column(String(36), ForeignKey("pdc_received.pdc_received_id"), nullable=True)

    attachment_path     = Column(String(500), nullable=True)   # cheque image
    line_status         = Column(String(30), default="Active") # Active, Cancelled
    remarks             = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    receipt             = relationship("RentalReceipt", back_populates="payment_lines")
    lease_version       = relationship("LeaseVersion", back_populates="receipt_lines")
    pdc_received        = relationship("PDCReceived", back_populates="receipt_line", foreign_keys=[pdc_received_id])


class PDCReceived(Base):
    """
    PDC Received Register — Each cheque is an independent financial instrument.
    Never merged with or embedded in receipts.
    """
    __tablename__ = "pdc_received"

    pdc_received_id             = Column(String(36), primary_key=True, default=generate_uuid)
    pdc_receipt_reference       = Column(String(50), nullable=False, unique=True, index=True)

    # Links
    property_id                 = Column(String(36), ForeignKey("properties.property_id"), nullable=False)
    unit_id                     = Column(String(36), ForeignKey("property_units.unit_id"), nullable=True)
    tenant_id                   = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    lease_id                    = Column(String(36), ForeignKey("leases.lease_id"), nullable=False)
    lease_version_id            = Column(String(36), ForeignKey("lease_versions.version_id"), nullable=False)
    receivable_id               = Column(String(36), ForeignKey("lease_payment_schedules.schedule_id"), nullable=True)
    beneficiary_allocation_ref  = Column(String(100), nullable=True)

    # Cheque Details
    cheque_number               = Column(String(100), nullable=False)
    bank_name                   = Column(String(200), nullable=False)
    account_holder              = Column(String(200), nullable=True)
    cheque_date                 = Column(Date, nullable=False)
    cheque_amount               = Column(Numeric(14, 2), nullable=False)
    rental_period_from          = Column(Date, nullable=True)
    rental_period_to            = Column(Date, nullable=True)

    # Physical Handling
    date_received               = Column(Date, nullable=False)
    received_by                 = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    current_cheque_location     = Column(String(200), nullable=True)  # Safe, Bank, Finance Office
    deposit_bank_account        = Column(String(200), nullable=True)

    # Scan / Image
    attachment_path             = Column(String(500), nullable=True)
    remarks                     = Column(Text, nullable=True)

    # Status: Received | Held | Due Soon | Submitted to Bank | Deposited |
    #         Cleared | Returned | Replaced | Cancelled | On Hold | Partially Settled
    status                      = Column(String(30), default="Received")

    # Alert flags (set by alert engine)
    alert_30_sent               = Column(Boolean, default=False)
    alert_14_sent               = Column(Boolean, default=False)
    alert_7_sent                = Column(Boolean, default=False)
    alert_3_sent                = Column(Boolean, default=False)
    alert_due_sent              = Column(Boolean, default=False)
    alert_overdue_sent          = Column(Boolean, default=False)

    deposited_at                = Column(DateTime, nullable=True)
    cleared_at                  = Column(DateTime, nullable=True)
    created_at                  = Column(DateTime, default=datetime.utcnow)
    updated_at                  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lease                       = relationship("Lease", back_populates="pdc_received")
    lease_version               = relationship("LeaseVersion", back_populates="pdc_received")
    receivable                  = relationship("LeasePaymentSchedule", back_populates="pdc_received")
    receipt_line                = relationship("RentalReceiptPaymentLine", back_populates="pdc_received",
                                               foreign_keys="RentalReceiptPaymentLine.pdc_received_id")
    status_history              = relationship("PDCReceivedStatusHistory", back_populates="pdc_received", cascade="all, delete-orphan")
    replacement                 = relationship("ChequeReplacement", back_populates="original_pdc",
                                               foreign_keys="ChequeReplacement.original_pdc_id", cascade="all, delete-orphan")
    return_event                = relationship("ChequeReturn", back_populates="pdc_received", uselist=False, cascade="all, delete-orphan")


class PDCReceivedStatusHistory(Base):
    """Immutable status change log for every received PDC."""
    __tablename__ = "pdc_received_status_history"

    history_id          = Column(String(36), primary_key=True, default=generate_uuid)
    pdc_received_id     = Column(String(36), ForeignKey("pdc_received.pdc_received_id"), nullable=False)
    old_status          = Column(String(30), nullable=True)
    new_status          = Column(String(30), nullable=False)
    change_reason       = Column(Text, nullable=True)   # mandatory for Replaced / Cancelled
    changed_by          = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    changed_at          = Column(DateTime, default=datetime.utcnow)
    notes               = Column(Text, nullable=True)

    pdc_received        = relationship("PDCReceived", back_populates="status_history")


class ChequeReplacement(Base):
    """
    Tracks the link between an original cheque and its replacement.
    Both records are preserved — history is never deleted.
    """
    __tablename__ = "cheque_replacements"

    replacement_id          = Column(String(36), primary_key=True, default=generate_uuid)
    original_pdc_id         = Column(String(36), ForeignKey("pdc_received.pdc_received_id"), nullable=False)
    replacement_pdc_id      = Column(String(36), ForeignKey("pdc_received.pdc_received_id"), nullable=True)
    replacement_reason      = Column(Text, nullable=False)  # mandatory
    replaced_by             = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    replacement_date        = Column(Date, nullable=True)
    notes                   = Column(Text, nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow)

    original_pdc            = relationship("PDCReceived", back_populates="replacement",
                                           foreign_keys=[original_pdc_id])


class ChequeReturn(Base):
    """Return event for a received cheque — records charges and follow-up."""
    __tablename__ = "cheque_returns"

    return_id               = Column(String(36), primary_key=True, default=generate_uuid)
    pdc_received_id         = Column(String(36), ForeignKey("pdc_received.pdc_received_id"), nullable=False)
    return_date             = Column(Date, nullable=False)
    return_reason           = Column(String(200), nullable=True)  # Insufficient Funds, Sig Mismatch …
    bank_charges            = Column(Numeric(10, 2), default=0)
    follow_up_action        = Column(Text, nullable=True)
    follow_up_by            = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    resolved                = Column(Boolean, default=False)
    notes                   = Column(Text, nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow)

    pdc_received            = relationship("PDCReceived", back_populates="return_event")


# ─────────────────────────────────────────────────────────────────────────────
# PDC ISSUED MODULE
# ─────────────────────────────────────────────────────────────────────────────

class BankAccount(Base):
    """Company bank accounts used to issue cheques."""
    __tablename__ = "bank_accounts"

    account_id          = Column(String(36), primary_key=True, default=generate_uuid)
    account_name        = Column(String(200), nullable=False)
    bank_name           = Column(String(200), nullable=False)
    account_number      = Column(String(100), nullable=False, unique=True)
    iban                = Column(String(50), nullable=True)
    currency            = Column(String(10), default="AED")
    branch              = Column(String(200), nullable=True)
    status              = Column(String(20), default="Active")
    notes               = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    cheque_books        = relationship("ChequeBook", back_populates="bank_account")
    pdc_issued          = relationship("PDCIssued", back_populates="bank_account")


class ChequeBook(Base):
    """Cheque book register — tracks each cheque book per bank account."""
    __tablename__ = "cheque_books"

    cheque_book_id      = Column(String(36), primary_key=True, default=generate_uuid)
    bank_account_id     = Column(String(36), ForeignKey("bank_accounts.account_id"), nullable=False)
    cheque_book_number  = Column(String(100), nullable=False)
    series_from         = Column(String(50), nullable=False)   # first cheque number in book
    series_to           = Column(String(50), nullable=False)   # last cheque number in book
    received_date       = Column(Date, nullable=True)
    status              = Column(String(30), default="Active")  # Active, Exhausted, Cancelled
    notes               = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    bank_account        = relationship("BankAccount", back_populates="cheque_books")
    leaves              = relationship("ChequeLeaf", back_populates="cheque_book")


class ChequeLeaf(Base):
    """Individual cheque leaves within a cheque book."""
    __tablename__ = "cheque_leaves"

    leaf_id             = Column(String(36), primary_key=True, default=generate_uuid)
    cheque_book_id      = Column(String(36), ForeignKey("cheque_books.cheque_book_id"), nullable=False)
    cheque_number       = Column(String(50), nullable=False, index=True)
    # Status: Available | Issued | Cancelled | Damaged
    status              = Column(String(30), default="Available")
    issued_to           = Column(String(36), ForeignKey("pdc_issued.pdc_issued_id"), nullable=True)
    notes               = Column(Text, nullable=True)

    cheque_book         = relationship("ChequeBook", back_populates="leaves")


class PDCIssued(Base):
    """
    PDC Issued Register — company cheques issued to suppliers,
    contractors, financial institutions, loan providers, etc.
    """
    __tablename__ = "pdc_issued"

    pdc_issued_id               = Column(String(36), primary_key=True, default=generate_uuid)
    pdc_issue_reference         = Column(String(50), nullable=False, unique=True, index=True)

    # Payee
    payee_name                  = Column(String(200), nullable=False)
    payee_type                  = Column(String(50), nullable=True)  # Supplier, Contractor, Sister Co, Bank, Loan Provider

    # Links — at least one must be present (validated in API)
    related_property_id         = Column(String(36), ForeignKey("properties.property_id"), nullable=True)
    related_loan_id             = Column(String(36), nullable=True)          # FK to loans (future)
    related_lpo_id              = Column(String(36), nullable=True)          # FK to lpos (future)
    related_invoice_id          = Column(String(36), nullable=True)          # FK to invoices (future)
    related_payment_voucher_id  = Column(String(36), nullable=True)          # FK to payment_vouchers (future)

    # Cheque Details
    cheque_number               = Column(String(100), nullable=False)
    bank_account_id             = Column(String(36), ForeignKey("bank_accounts.account_id"), nullable=False)
    cheque_date                 = Column(Date, nullable=False)
    cheque_amount               = Column(Numeric(14, 2), nullable=False)
    purpose                     = Column(String(300), nullable=True)

    # Workflow
    date_issued                 = Column(Date, nullable=True)
    prepared_by                 = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    approved_by                 = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    approved_at                 = Column(DateTime, nullable=True)
    handover_date               = Column(Date, nullable=True)
    acknowledged_by             = Column(String(200), nullable=True)  # payee representative name

    attachment_path             = Column(String(500), nullable=True)
    remarks                     = Column(Text, nullable=True)

    # Status: Draft | Pending Approval | Approved | Issued | Held by Payee |
    #         Due Soon | Presented | Cleared | Returned | Replaced | Cancelled | Stopped | On Hold
    status                      = Column(String(30), default="Draft")

    # Alert flags
    alert_30_sent               = Column(Boolean, default=False)
    alert_14_sent               = Column(Boolean, default=False)
    alert_7_sent                = Column(Boolean, default=False)
    alert_3_sent                = Column(Boolean, default=False)
    alert_due_sent              = Column(Boolean, default=False)
    alert_uncleared_sent        = Column(Boolean, default=False)

    cleared_at                  = Column(DateTime, nullable=True)
    created_at                  = Column(DateTime, default=datetime.utcnow)
    updated_at                  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bank_account                = relationship("BankAccount", back_populates="pdc_issued")
    status_history              = relationship("PDCIssuedStatusHistory", back_populates="pdc_issued", cascade="all, delete-orphan")


class PDCIssuedStatusHistory(Base):
    """Immutable status change log for every issued PDC."""
    __tablename__ = "pdc_issued_status_history"

    history_id          = Column(String(36), primary_key=True, default=generate_uuid)
    pdc_issued_id       = Column(String(36), ForeignKey("pdc_issued.pdc_issued_id"), nullable=False)
    old_status          = Column(String(30), nullable=True)
    new_status          = Column(String(30), nullable=False)
    change_reason       = Column(Text, nullable=True)
    changed_by          = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    changed_at          = Column(DateTime, default=datetime.utcnow)
    notes               = Column(Text, nullable=True)

    pdc_issued          = relationship("PDCIssued", back_populates="status_history")


class AuthorizedSignatory(Base):
    """Who is authorized to sign cheques on each bank account."""
    __tablename__ = "authorized_signatories"

    signatory_id        = Column(String(36), primary_key=True, default=generate_uuid)
    bank_account_id     = Column(String(36), ForeignKey("bank_accounts.account_id"), nullable=False)
    user_id             = Column(String(36), ForeignKey("users.user_id"), nullable=False)
    signatory_name      = Column(String(200), nullable=False)
    effective_from      = Column(Date, nullable=True)
    effective_to        = Column(Date, nullable=True)
    is_active           = Column(Boolean, default=True)
    signature_limit     = Column(Numeric(14, 2), nullable=True)  # max cheque value they can authorize
    notes               = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
