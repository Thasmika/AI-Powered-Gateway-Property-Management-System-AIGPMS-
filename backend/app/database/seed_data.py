"""
Seed Data — UAE-specific master data
Populates all 10 master tables with initial reference data.
Run once on first deployment or when tables are empty.
"""

from sqlalchemy.orm import Session
from app.models.master_data import (
    MasterBank, MasterEmirate, MasterCommunity, MasterPropertyType,
    MasterExpenseCategory, MasterMaintenanceCategory, MasterPaymentMethod,
    NotificationTemplate, AIPromptTemplate, ApprovalLimit,
)


# ─────────────────────────────────────────────────────────────────────────────
# UAE Banks
# ─────────────────────────────────────────────────────────────────────────────

UAE_BANKS = [
    {"bank_name": "Emirates NBD", "bank_code": "EBILAEAD", "country": "UAE"},
    {"bank_name": "Abu Dhabi Commercial Bank (ADCB)", "bank_code": "ADCBAEAA", "country": "UAE"},
    {"bank_name": "First Abu Dhabi Bank (FAB)", "bank_code": "NBADAEAA", "country": "UAE"},
    {"bank_name": "Dubai Islamic Bank (DIB)", "bank_code": "DUIBAEAD", "country": "UAE"},
    {"bank_name": "Mashreq Bank", "bank_code": "BOMLAEAD", "country": "UAE"},
    {"bank_name": "RAK Bank (RAKBANK)", "bank_code": "NRAKAEAK", "country": "UAE"},
    {"bank_name": "Abu Dhabi Islamic Bank (ADIB)", "bank_code": "ADIBAEAA", "country": "UAE"},
    {"bank_name": "Commercial Bank of Dubai (CBD)", "bank_code": "CBDUAEAD", "country": "UAE"},
    {"bank_name": "Sharjah Islamic Bank (SIB)", "bank_code": "SIBCAEAS", "country": "UAE"},
    {"bank_name": "Emirates Islamic Bank", "bank_code": "MEFLAEADEIS", "country": "UAE"},
    {"bank_name": "National Bank of Fujairah (NBF)", "bank_code": "NBFUAEFJ", "country": "UAE"},
    {"bank_name": "United Arab Bank (UAB)", "bank_code": "UARBAEASH", "country": "UAE"},
    {"bank_name": "Ajman Bank", "bank_code": "AJMBAEAD", "country": "UAE"},
    {"bank_name": "Bank of Sharjah", "bank_code": "BOSHAEASH", "country": "UAE"},
    {"bank_name": "Invest Bank", "bank_code": "INBKAEASH", "country": "UAE"},
    {"bank_name": "Citibank UAE", "bank_code": "CITIAEAD", "country": "UAE"},
    {"bank_name": "HSBC UAE", "bank_code": "BBMEAEAD", "country": "UAE"},
    {"bank_name": "Standard Chartered UAE", "bank_code": "SCBLAEAD", "country": "UAE"},
    {"bank_name": "Barclays UAE", "bank_code": "BARCAEAD", "country": "UAE"},
    {"bank_name": "Other Bank", "bank_code": None, "country": "UAE"},
]

# ─────────────────────────────────────────────────────────────────────────────
# UAE Emirates
# ─────────────────────────────────────────────────────────────────────────────

UAE_EMIRATES = [
    {"emirate_name": "Abu Dhabi", "emirate_code": "AUH"},
    {"emirate_name": "Dubai", "emirate_code": "DXB"},
    {"emirate_name": "Sharjah", "emirate_code": "SHJ"},
    {"emirate_name": "Ajman", "emirate_code": "AJM"},
    {"emirate_name": "Umm Al Quwain", "emirate_code": "UAQ"},
    {"emirate_name": "Ras Al Khaimah", "emirate_code": "RAK"},
    {"emirate_name": "Fujairah", "emirate_code": "FUJ"},
]

# ─────────────────────────────────────────────────────────────────────────────
# Dubai Communities (key ones)
# ─────────────────────────────────────────────────────────────────────────────

DUBAI_COMMUNITIES = [
    {"community_name": "Downtown Dubai", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Dubai Marina", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Jumeirah Lake Towers (JLT)", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Business Bay", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Arabian Ranches", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Palm Jumeirah", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "DIFC", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Dubai Silicon Oasis (DSO)", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Dubai Investment Park (DIP)", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Jumeirah Village Circle (JVC)", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Al Barsha", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Deira", "emirate": "Dubai", "zone": "Leasehold"},
    {"community_name": "Bur Dubai", "emirate": "Dubai", "zone": "Leasehold"},
    {"community_name": "Al Quoz", "emirate": "Dubai", "zone": "Leasehold"},
    {"community_name": "Mirdif", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Jumeirah", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Al Barari", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "DAMAC Hills", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Mohammed Bin Rashid City (MBR)", "emirate": "Dubai", "zone": "Freehold"},
    {"community_name": "Bluewaters Island", "emirate": "Dubai", "zone": "Freehold"},
    # Abu Dhabi
    {"community_name": "Al Reem Island", "emirate": "Abu Dhabi", "zone": "Freehold"},
    {"community_name": "Yas Island", "emirate": "Abu Dhabi", "zone": "Freehold"},
    {"community_name": "Saadiyat Island", "emirate": "Abu Dhabi", "zone": "Freehold"},
    {"community_name": "Al Khalidiyah", "emirate": "Abu Dhabi", "zone": "Leasehold"},
    {"community_name": "Corniche Area", "emirate": "Abu Dhabi", "zone": "Leasehold"},
    # Labour / Industrial (for camp properties)
    {"community_name": "Al Quoz Industrial", "emirate": "Dubai", "zone": "Leasehold"},
    {"community_name": "Jebel Ali Industrial", "emirate": "Dubai", "zone": "Leasehold"},
    {"community_name": "Sharjah Industrial Area", "emirate": "Sharjah", "zone": "Leasehold"},
]

# ─────────────────────────────────────────────────────────────────────────────
# Property Types
# ─────────────────────────────────────────────────────────────────────────────

PROPERTY_TYPES = [
    {"type_name": "Apartment", "type_class": "Residential"},
    {"type_name": "Studio Apartment", "type_class": "Residential"},
    {"type_name": "Villa", "type_class": "Residential"},
    {"type_name": "Townhouse", "type_class": "Residential"},
    {"type_name": "Penthouse", "type_class": "Residential"},
    {"type_name": "Duplex", "type_class": "Residential"},
    {"type_name": "Office", "type_class": "Commercial"},
    {"type_name": "Retail / Shop", "type_class": "Commercial"},
    {"type_name": "Warehouse", "type_class": "Commercial"},
    {"type_name": "Labour Camp", "type_class": "Commercial"},
    {"type_name": "Land / Plot", "type_class": "Residential"},
    {"type_name": "Mixed Use Building", "type_class": "Mixed"},
    {"type_name": "Hotel Apartment", "type_class": "Commercial"},
    {"type_name": "Showroom", "type_class": "Commercial"},
]

# ─────────────────────────────────────────────────────────────────────────────
# Expense Categories (General + Property)
# ─────────────────────────────────────────────────────────────────────────────

EXPENSE_CATEGORIES = [
    # General
    {"category_name": "Office Rent", "expense_class": "General"},
    {"category_name": "Staff Salaries", "expense_class": "General"},
    {"category_name": "Staff Visa & PRO Fees", "expense_class": "General"},
    {"category_name": "Office Utilities", "expense_class": "General"},
    {"category_name": "Office Supplies & Stationery", "expense_class": "General"},
    {"category_name": "Bank Charges", "expense_class": "General"},
    {"category_name": "Legal & Professional Fees", "expense_class": "General"},
    {"category_name": "Insurance (General)", "expense_class": "General"},
    {"category_name": "Marketing & Advertising", "expense_class": "General"},
    {"category_name": "Travel & Entertainment", "expense_class": "General"},
    {"category_name": "IT & Software Subscriptions", "expense_class": "General"},
    {"category_name": "Miscellaneous General Expenses", "expense_class": "General"},
    # Property
    {"category_name": "Property Maintenance", "expense_class": "Property"},
    {"category_name": "DEWA (Electricity & Water)", "expense_class": "Property"},
    {"category_name": "Chiller / District Cooling", "expense_class": "Property"},
    {"category_name": "Service Charges (Owners Association)", "expense_class": "Property"},
    {"category_name": "Ejari Registration Fee", "expense_class": "Property"},
    {"category_name": "Property Insurance", "expense_class": "Property"},
    {"category_name": "Real Estate Agent Commission", "expense_class": "Property"},
    {"category_name": "Mortgage / Loan Interest", "expense_class": "Property"},
    {"category_name": "Renovation & Fit-Out", "expense_class": "Property"},
    {"category_name": "Cleaning Services", "expense_class": "Property"},
    {"category_name": "Pest Control", "expense_class": "Property"},
    {"category_name": "Security Services", "expense_class": "Property"},
    {"category_name": "Landscaping", "expense_class": "Property"},
    {"category_name": "Lift / Elevator Maintenance", "expense_class": "Property"},
    {"category_name": "AC Maintenance", "expense_class": "Property"},
    {"category_name": "Painting & Plastering", "expense_class": "Property"},
    {"category_name": "Plumbing", "expense_class": "Property"},
    {"category_name": "Electrical Repairs", "expense_class": "Property"},
    {"category_name": "Civil Works", "expense_class": "Property"},
    {"category_name": "Miscellaneous Property Expenses", "expense_class": "Property"},
]

# ─────────────────────────────────────────────────────────────────────────────
# Maintenance Categories
# ─────────────────────────────────────────────────────────────────────────────

MAINTENANCE_CATEGORIES = [
    {"category_name": "Plumbing", "default_sla_hours": 4},
    {"category_name": "Electrical", "default_sla_hours": 4},
    {"category_name": "HVAC / AC", "default_sla_hours": 8},
    {"category_name": "Civil / Structural", "default_sla_hours": 48},
    {"category_name": "Painting", "default_sla_hours": 72},
    {"category_name": "Carpentry / Joinery", "default_sla_hours": 24},
    {"category_name": "Cleaning", "default_sla_hours": 8},
    {"category_name": "Pest Control", "default_sla_hours": 24},
    {"category_name": "Lift / Elevator", "default_sla_hours": 2},
    {"category_name": "Swimming Pool", "default_sla_hours": 24},
    {"category_name": "Security Systems", "default_sla_hours": 4},
    {"category_name": "Landscaping", "default_sla_hours": 48},
    {"category_name": "General / Other", "default_sla_hours": 24},
]

# ─────────────────────────────────────────────────────────────────────────────
# Payment Methods
# ─────────────────────────────────────────────────────────────────────────────

PAYMENT_METHODS = [
    {"method_name": "Cheque (PDC)", "requires_cheque_details": True, "requires_bank_details": False},
    {"method_name": "Cash", "requires_cheque_details": False, "requires_bank_details": False},
    {"method_name": "Bank Transfer (TT)", "requires_cheque_details": False, "requires_bank_details": True},
    {"method_name": "Online Transfer", "requires_cheque_details": False, "requires_bank_details": True},
    {"method_name": "Direct Debit", "requires_cheque_details": False, "requires_bank_details": True},
    {"method_name": "Credit Card", "requires_cheque_details": False, "requires_bank_details": False},
    {"method_name": "Demand Draft", "requires_cheque_details": True, "requires_bank_details": False},
    {"method_name": "Manager's Cheque", "requires_cheque_details": True, "requires_bank_details": False},
]

# ─────────────────────────────────────────────────────────────────────────────
# Notification Templates
# ─────────────────────────────────────────────────────────────────────────────

NOTIFICATION_TEMPLATES = [
    {
        "template_code": "PDC_DUE_30DAYS",
        "template_name": "PDC Due in 30 Days",
        "module": "PDC",
        "subject": "PDC Alert: Cheque due in 30 days",
        "body_template": "Cheque {{cheque_number}} from {{tenant_name}} for AED {{amount}} is due on {{cheque_date}}. Property: {{property_name}}.",
        "channel": "Dashboard",
    },
    {
        "template_code": "PDC_DUE_14DAYS",
        "template_name": "PDC Due in 14 Days",
        "module": "PDC",
        "subject": "PDC Alert: Cheque due in 14 days",
        "body_template": "Cheque {{cheque_number}} from {{tenant_name}} for AED {{amount}} is due in 14 days on {{cheque_date}}.",
        "channel": "Dashboard",
    },
    {
        "template_code": "PDC_DUE_7DAYS",
        "template_name": "PDC Due in 7 Days",
        "module": "PDC",
        "subject": "URGENT: PDC due in 7 days",
        "body_template": "URGENT: Cheque {{cheque_number}} from {{tenant_name}} for AED {{amount}} is due in 7 days.",
        "channel": "Dashboard",
    },
    {
        "template_code": "PDC_DUE_3DAYS",
        "template_name": "PDC Due in 3 Days",
        "module": "PDC",
        "subject": "URGENT: PDC due in 3 days",
        "body_template": "URGENT: Cheque {{cheque_number}} for AED {{amount}} due on {{cheque_date}}. Please deposit immediately.",
        "channel": "Dashboard",
    },
    {
        "template_code": "PDC_DUE_TODAY",
        "template_name": "PDC Due Today",
        "module": "PDC",
        "subject": "ACTION REQUIRED: PDC due today",
        "body_template": "Cheque {{cheque_number}} for AED {{amount}} is due TODAY. Deposit now.",
        "channel": "Dashboard",
    },
    {
        "template_code": "PDC_OVERDUE",
        "template_name": "PDC Overdue - Not Cleared",
        "module": "PDC",
        "subject": "OVERDUE: PDC not cleared",
        "body_template": "Cheque {{cheque_number}} for AED {{amount}} was due on {{cheque_date}} and has NOT been cleared. Immediate action required.",
        "channel": "Dashboard",
    },
    {
        "template_code": "PDC_RETURNED",
        "template_name": "Cheque Returned",
        "module": "PDC",
        "subject": "Cheque Returned by Bank",
        "body_template": "Cheque {{cheque_number}} from {{tenant_name}} for AED {{amount}} has been returned. Reason: {{return_reason}}.",
        "channel": "Dashboard",
    },
    {
        "template_code": "LEASE_EXPIRY_90DAYS",
        "template_name": "Lease Expiring in 90 Days",
        "module": "Lease",
        "subject": "Lease Expiry Notice: 90 days",
        "body_template": "Lease for {{tenant_name}} at {{property_name}} — Unit {{unit_number}} expires on {{lease_end_date}} (90 days).",
        "channel": "Dashboard",
    },
    {
        "template_code": "LEASE_EXPIRY_30DAYS",
        "template_name": "Lease Expiring in 30 Days",
        "module": "Lease",
        "subject": "URGENT: Lease expires in 30 days",
        "body_template": "Lease for {{tenant_name}} at {{property_name}} expires in 30 days. Renewal status: {{renewal_status}}.",
        "channel": "Dashboard",
    },
    {
        "template_code": "ISSUED_PDC_DUE_7DAYS",
        "template_name": "Issued PDC Due in 7 Days",
        "module": "PDC Issued",
        "subject": "Issued Cheque Due in 7 Days",
        "body_template": "Issued cheque {{cheque_number}} to {{payee_name}} for AED {{amount}} is due in 7 days on {{cheque_date}}.",
        "channel": "Dashboard",
    },
    {
        "template_code": "DOCUMENT_EXPIRY_30DAYS",
        "template_name": "Document Expiring in 30 Days",
        "module": "Documents",
        "subject": "Document Expiry Alert",
        "body_template": "Document '{{document_name}}' linked to {{entity_name}} expires on {{expiry_date}} (30 days remaining).",
        "channel": "Dashboard",
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# AI Prompt Templates (PM's 15 required queries)
# ─────────────────────────────────────────────────────────────────────────────

AI_PROMPTS = [
    {"prompt_label": "Cheques due this week", "prompt_text": "Which tenant cheques are due this week?", "module": "PDC", "is_featured": True, "sort_order": 1},
    {"prompt_label": "PDCs not deposited", "prompt_text": "Which PDCs have not been deposited?", "module": "PDC", "is_featured": True, "sort_order": 2},
    {"prompt_label": "Returned cheques (last 6 months)", "prompt_text": "Show returned cheques for the last 6 months", "module": "PDC", "is_featured": True, "sort_order": 3},
    {"prompt_label": "Leases with insufficient cheque coverage", "prompt_text": "Which leases have insufficient cheque coverage?", "module": "PDC", "is_featured": True, "sort_order": 4},
    {"prompt_label": "Expected PDC collection next month", "prompt_text": "What is the expected PDC collection for next month?", "module": "PDC", "is_featured": True, "sort_order": 5},
    {"prompt_label": "Issued PDCs due next month", "prompt_text": "How much in issued PDCs is due next month?", "module": "PDC Issued", "is_featured": True, "sort_order": 6},
    {"prompt_label": "Bank account with highest cheque commitment", "prompt_text": "Which bank account has the highest upcoming cheque commitment?", "module": "PDC Issued", "is_featured": False, "sort_order": 7},
    {"prompt_label": "PDCs issued to financial institutions", "prompt_text": "Show all PDCs issued to financial institutions", "module": "PDC Issued", "is_featured": False, "sort_order": 8},
    {"prompt_label": "Issued cheques linked to loans", "prompt_text": "Which issued cheques are linked to property loans?", "module": "PDC Issued", "is_featured": False, "sort_order": 9},
    {"prompt_label": "Highest capital appreciation properties", "prompt_text": "Which properties have the highest capital appreciation?", "module": "Investment", "is_featured": True, "sort_order": 10},
    {"prompt_label": "Total portfolio value today", "prompt_text": "What is our total real estate portfolio value today?", "module": "Investment", "is_featured": True, "sort_order": 11},
    {"prompt_label": "Rental yield vs capital appreciation", "prompt_text": "Compare rental yield versus capital appreciation", "module": "Investment", "is_featured": True, "sort_order": 12},
    {"prompt_label": "Underperforming properties", "prompt_text": "Which properties are underperforming?", "module": "Investment", "is_featured": False, "sort_order": 13},
    {"prompt_label": "Best properties to retain (5-year view)", "prompt_text": "Which investments should be retained for another five years?", "module": "Investment", "is_featured": False, "sort_order": 14},
    {"prompt_label": "Loans near preferred LTV ratio", "prompt_text": "Which loans are close to exceeding our preferred loan-to-value ratio?", "module": "Investment", "is_featured": False, "sort_order": 15},
]

# ─────────────────────────────────────────────────────────────────────────────
# Default Approval Limits
# ─────────────────────────────────────────────────────────────────────────────

APPROVAL_LIMITS = [
    # Expense approvals
    {"module": "Expense", "role_name": "Accountant", "auto_approve_threshold": 5000.00, "requires_md_above": 5000.00, "notes": "Accountant can approve expenses up to AED 5,000. Above that requires MD."},
    {"module": "Expense", "role_name": "Managing Director", "auto_approve_threshold": None, "requires_md_above": None, "notes": "MD approves all amounts."},
    # PDC Issued approvals
    {"module": "PDC Issued", "role_name": "Accountant", "auto_approve_threshold": 0.00, "requires_md_above": 0.00, "notes": "All issued cheques require MD approval. Accountant prepares only."},
    {"module": "PDC Issued", "role_name": "Managing Director", "auto_approve_threshold": None, "requires_md_above": None, "notes": "MD approves all issued cheques."},
    # Payment Voucher approvals
    {"module": "Payment Voucher", "role_name": "Accountant", "auto_approve_threshold": 5000.00, "requires_md_above": 5000.00, "notes": "Accountant can authorize payment vouchers up to AED 5,000."},
    {"module": "Payment Voucher", "role_name": "Managing Director", "auto_approve_threshold": None, "requires_md_above": None, "notes": "MD approves all payment vouchers."},
]


# ─────────────────────────────────────────────────────────────────────────────
# MAIN SEED FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

def seed_master_data(db: Session) -> None:
    """Idempotent seed — skips records that already exist."""

    print("  [Seed] Seeding UAE Banks...")
    for data in UAE_BANKS:
        if not db.query(MasterBank).filter(MasterBank.bank_name == data["bank_name"]).first():
            db.add(MasterBank(**data))
    db.commit()

    print("  [Seed] Seeding Emirates...")
    for data in UAE_EMIRATES:
        if not db.query(MasterEmirate).filter(MasterEmirate.emirate_name == data["emirate_name"]).first():
            db.add(MasterEmirate(**data))
    db.commit()

    print("  [Seed] Seeding Communities...")
    for data in DUBAI_COMMUNITIES:
        if not db.query(MasterCommunity).filter(
            MasterCommunity.community_name == data["community_name"],
            MasterCommunity.emirate == data["emirate"]
        ).first():
            db.add(MasterCommunity(**data))
    db.commit()

    print("  [Seed] Seeding Property Types...")
    for data in PROPERTY_TYPES:
        if not db.query(MasterPropertyType).filter(MasterPropertyType.type_name == data["type_name"]).first():
            db.add(MasterPropertyType(**data))
    db.commit()

    print("  [Seed] Seeding Expense Categories...")
    for data in EXPENSE_CATEGORIES:
        if not db.query(MasterExpenseCategory).filter(
            MasterExpenseCategory.category_name == data["category_name"],
            MasterExpenseCategory.expense_class == data["expense_class"]
        ).first():
            db.add(MasterExpenseCategory(**data))
    db.commit()

    print("  [Seed] Seeding Maintenance Categories...")
    for data in MAINTENANCE_CATEGORIES:
        if not db.query(MasterMaintenanceCategory).filter(
            MasterMaintenanceCategory.category_name == data["category_name"]).first():
            db.add(MasterMaintenanceCategory(**data))
    db.commit()

    print("  [Seed] Seeding Payment Methods...")
    for data in PAYMENT_METHODS:
        if not db.query(MasterPaymentMethod).filter(
            MasterPaymentMethod.method_name == data["method_name"]).first():
            db.add(MasterPaymentMethod(**data))
    db.commit()

    print("  [Seed] Seeding Notification Templates...")
    for data in NOTIFICATION_TEMPLATES:
        if not db.query(NotificationTemplate).filter(
            NotificationTemplate.template_code == data["template_code"]).first():
            db.add(NotificationTemplate(**data))
    db.commit()

    print("  [Seed] Seeding AI Prompt Templates...")
    for data in AI_PROMPTS:
        if not db.query(AIPromptTemplate).filter(
            AIPromptTemplate.prompt_label == data["prompt_label"]).first():
            db.add(AIPromptTemplate(**data))
    db.commit()

    print("  [Seed] Seeding Approval Limits...")
    for data in APPROVAL_LIMITS:
        if not db.query(ApprovalLimit).filter(
            ApprovalLimit.module == data["module"],
            ApprovalLimit.role_name == data["role_name"]
        ).first():
            db.add(ApprovalLimit(**data))
    db.commit()

    print("  [Seed] DONE: Master data seeding complete.")
