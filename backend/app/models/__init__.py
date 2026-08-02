"""
Models Package — Import all models here so SQLAlchemy registers them
with the metadata before create_all() or Alembic migrations run.
"""

# Authentication & User Management
from app.models.auth import Role, User, AuditLog  # noqa: F401

# Property Master & Title Deed
from app.models.property import (  # noqa: F401
    Property,
    PropertyUnit,
    TitleDeed,
    PropertyAcquisitionCost,
    PropertyValuation,
    PropertyDocument,
)

# Ownership & Beneficiaries
from app.models.ownership import (  # noqa: F401
    LegalOwner,
    BeneficialOwner,
    OwnershipRecord,
    BeneficiaryAllocation,
)

# Tenants & Leases
from app.models.tenant import (  # noqa: F401
    Tenant,
    Lease,
    LeaseVersion,
    LeasePaymentSchedule,
    LeaseDocument,
)

# PDC Received & Issued
from app.models.pdc import (  # noqa: F401
    RentalReceipt,
    RentalReceiptPaymentLine,
    PDCReceived,
    PDCReceivedStatusHistory,
    ChequeReplacement,
    ChequeReturn,
    BankAccount,
    ChequeBook,
    ChequeLeaf,
    PDCIssued,
    PDCIssuedStatusHistory,
    AuthorizedSignatory,
)

# Finance, Expenses & Settings
from app.models.finance import (  # noqa: F401
    CostCentre,
    ExpenseCategory,
    Expense,
    ExpenseAllocation,
    CashflowCommitment,
    SystemSetting,
)

# Master Data & Configuration (Module 15)
from app.models.master_data import (  # noqa: F401
    MasterBank,
    MasterCommunity,
    MasterEmirate,
    MasterPropertyType,
    MasterExpenseCategory,
    MasterMaintenanceCategory,
    MasterPaymentMethod,
    NotificationTemplate,
    AIPromptTemplate,
    ApprovalLimit,
)
