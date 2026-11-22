"""
Finance & Loans Models — Sprint 7
===================================
Covers: loans, loan_instalments, loan_documents, payment_vouchers

Key Relationships (PM Decision):
  Title Deed → Loan → Loan Instalments → PDC Issued (one PDC per instalment)
  Payment Voucher → PDC Issued (mandatory link for all issued PDCs)
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


class Loan(Base):
    """
    Loan master record. Links to a title deed (via property/mortgage data).
    Each loan generates an instalment schedule, each instalment linked to one PDC Issued.
    """
    __tablename__ = "loans"

    loan_id             = Column(String(36), primary_key=True, default=generate_uuid)
    loan_reference      = Column(String(50), nullable=False, unique=True, index=True)

    # Links
    title_deed_id       = Column(String(36), ForeignKey("title_deeds.title_deed_id"), nullable=True)
    property_id         = Column(String(36), ForeignKey("properties.property_id"), nullable=True)
    bank_account_id     = Column(String(36), ForeignKey("bank_accounts.account_id"), nullable=True)

    # Lender details
    lender_name         = Column(String(200), nullable=False)
    loan_type           = Column(String(50), nullable=True)  # Mortgage, Personal, Corporate, Islamic
    currency            = Column(String(10), default="AED")

    # Financials
    principal_amount    = Column(Numeric(16, 2), nullable=False)
    interest_rate       = Column(Numeric(6, 4), nullable=True)  # Annual %
    loan_term_months    = Column(Integer, nullable=True)
    start_date          = Column(Date, nullable=True)
    end_date            = Column(Date, nullable=True)
    outstanding_balance = Column(Numeric(16, 2), nullable=True)
    loan_to_value_ratio = Column(Numeric(6, 2), nullable=True)  # LTV %

    # Status
    status              = Column(String(30), default="Active")
    # Active | Closed | Restructured | Defaulted

    notes               = Column(Text, nullable=True)
    created_by          = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    instalments         = relationship("LoanInstalment", back_populates="loan",
                                       cascade="all, delete-orphan", order_by="LoanInstalment.due_date")
    documents           = relationship("LoanDocument", back_populates="loan",
                                       cascade="all, delete-orphan")


class LoanInstalment(Base):
    """
    Individual instalment in a loan repayment schedule.
    One PDC Issued per instalment (PM requirement).
    """
    __tablename__ = "loan_instalments"

    instalment_id       = Column(String(36), primary_key=True, default=generate_uuid)
    loan_id             = Column(String(36), ForeignKey("loans.loan_id"), nullable=False)

    instalment_number   = Column(Integer, nullable=False)
    due_date            = Column(Date, nullable=False)

    principal_amount    = Column(Numeric(14, 2), nullable=False, default=0)
    interest_amount     = Column(Numeric(14, 2), nullable=False, default=0)
    total_amount        = Column(Numeric(14, 2), nullable=False)  # principal + interest

    # Link to the PDC Issued cheque for this instalment
    pdc_issued_id       = Column(String(36), ForeignKey("pdc_issued.pdc_issued_id"), nullable=True)

    status              = Column(String(30), default="Pending")
    # Pending | Paid | Overdue | Waived

    notes               = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    # Relationships
    loan                = relationship("Loan", back_populates="instalments")


class LoanDocument(Base):
    """Supporting documents for a loan: agreement, mortgage deed, sanction letter, etc."""
    __tablename__ = "loan_documents"

    document_id         = Column(String(36), primary_key=True, default=generate_uuid)
    loan_id             = Column(String(36), ForeignKey("loans.loan_id"), nullable=False)

    document_type       = Column(String(100), nullable=False)
    # Loan Agreement | Mortgage Deed | Sanction Letter | NOC | Other
    document_name       = Column(String(300), nullable=False)
    file_path           = Column(String(500), nullable=True)
    uploaded_by         = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    uploaded_at         = Column(DateTime, default=datetime.utcnow)
    notes               = Column(Text, nullable=True)

    loan                = relationship("Loan", back_populates="documents")


class PaymentVoucher(Base):
    """
    Payment Voucher — mandatory link for all issued PDC cheques.
    The approval chain: Accountant creates → MD approves → PDC Issued linked.
    """
    __tablename__ = "payment_vouchers"

    voucher_id          = Column(String(36), primary_key=True, default=generate_uuid)
    voucher_number      = Column(String(50), nullable=False, unique=True, index=True)

    payee_name          = Column(String(200), nullable=False)
    payee_type          = Column(String(50), nullable=True)
    # Supplier | Contractor | Bank | Loan Provider | Sister Company | Other
    # Payee master record (suppliers table). payee_name is kept as a snapshot.
    payee_id            = Column(String(36), ForeignKey("suppliers.supplier_id"), nullable=True, index=True)
    # Company bank account the payment is issued from (null for Cash).
    bank_account_id     = Column(String(36), ForeignKey("bank_accounts.account_id"), nullable=True, index=True)

    amount              = Column(Numeric(14, 2), nullable=False)
    currency            = Column(String(10), default="AED")
    purpose             = Column(Text, nullable=True)
    payment_method      = Column(String(50), nullable=True)  # Cheque, Transfer, PDC

    # Link references
    expense_id          = Column(String(36), ForeignKey("expenses.expense_id"), nullable=True)
    loan_id             = Column(String(36), ForeignKey("loans.loan_id"), nullable=True)
    property_id         = Column(String(36), ForeignKey("properties.property_id"), nullable=True)

    # Approval
    approval_status     = Column(String(30), default="Pending")
    # Pending | Approved | Rejected | Cancelled
    prepared_by         = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    approved_by         = Column(String(36), ForeignKey("users.user_id"), nullable=True)
    approved_at         = Column(DateTime, nullable=True)
    rejection_reason    = Column(Text, nullable=True)

    attachment_path     = Column(String(500), nullable=True)
    notes               = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    payee               = relationship("Supplier", lazy="joined")
    bank_account        = relationship("BankAccount", lazy="joined")
    expense             = relationship("Expense", back_populates="payment_vouchers")

    @property
    def expense_reference(self):
        return self.expense.expense_reference if self.expense else None

    @property
    def bank_name(self):
        return self.bank_account.bank_name if self.bank_account else None

    @property
    def bank_account_name(self):
        return self.bank_account.account_name if self.bank_account else None

    @property
    def bank_account_number(self):
        return self.bank_account.account_number if self.bank_account else None
