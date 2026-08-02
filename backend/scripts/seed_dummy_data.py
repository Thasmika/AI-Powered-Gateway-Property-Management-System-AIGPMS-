"""
AIGPMS — Comprehensive Dummy Data Seeder
==========================================
Populates the database with realistic UAE property management demo data:
  - 5 Properties across Dubai & Abu Dhabi
  - 3 Legal Owners + 3 Beneficial Owners
  - 5 Ownership Records + Beneficiary Allocations
  - 6 Tenants (Individual + Company)
  - 5 Active Leases + Versions + Payment Schedules
  - 5 Rental Receipts (Posted) with PDC lines
  - 15+ PDC Received records with status history
  - Property Valuations (2 per property)

Run from backend/ directory:
    .venv\\Scripts\\python.exe scripts/seed_dummy_data.py
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, datetime, timedelta
from decimal import Decimal
import uuid

from sqlalchemy.orm import Session
from app.database.session import engine, Base, SessionLocal
from app.database.init_db import init_db

# Import all models
import app.models  # noqa — triggers __init__ registration

from app.models.property import (
    Property, PropertyUnit, TitleDeed,
    PropertyAcquisitionCost, PropertyValuation, PropertyDocument
)
from app.models.ownership import (
    LegalOwner, BeneficialOwner,
    OwnershipRecord, BeneficiaryAllocation
)
from app.models.tenant import (
    Tenant, Lease, LeaseVersion,
    LeasePaymentSchedule
)
from app.models.pdc import (
    RentalReceipt, RentalReceiptPaymentLine,
    PDCReceived, PDCReceivedStatusHistory, ChequeReturn
)
from app.models.master_data import MasterBank
from app.core.config import settings

def create_dummy_pdf(filepath):
    if not filepath:
        return
    # Remove leading /uploads/ if present
    if filepath.startswith("/uploads/"):
        relative_path = filepath[9:]
    else:
        relative_path = filepath
    
    full_path = os.path.join(settings.UPLOAD_DIR, relative_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    # minimal valid PDF
    content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 55\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Dummy PDF File) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000259 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n363\n%%EOF\n"
    with open(full_path, "wb") as f:
        f.write(content)

def gen_id():
    return str(uuid.uuid4())


def log(msg):
    print(f"  [Seed] {msg}")


def clear_business_data(db: Session):
    """Remove all existing business data (preserves users, roles, master data)."""
    log("Clearing existing business data...")
    # Order matters — delete children first
    db.query(PDCReceivedStatusHistory).delete()
    db.query(PDCReceived).delete()
    db.query(RentalReceiptPaymentLine).delete()
    db.query(RentalReceipt).delete()
    db.query(LeasePaymentSchedule).delete()
    db.query(LeaseVersion).delete()
    db.query(Lease).delete()
    db.query(BeneficiaryAllocation).delete()
    db.query(OwnershipRecord).delete()
    db.query(PropertyAcquisitionCost).delete()
    db.query(PropertyValuation).delete()
    db.query(TitleDeed).delete()
    db.query(PropertyUnit).delete()
    db.query(Property).delete()
    db.query(BeneficialOwner).delete()
    db.query(LegalOwner).delete()
    db.query(Tenant).delete()
    db.commit()
    log("Done clearing.")


def seed_dummy_data(db: Session):

    # ── 1. Legal Owners ──────────────────────────────────────────────────────

    log("Seeding Legal Owners...")
    lo1 = LegalOwner(
        legal_owner_id=gen_id(),
        owner_type="Individual",
        full_name="Sheikh Mohammed Al-Rashidi",
        id_number="784-1975-1234567-1",
        id_type="Emirates ID",
        nationality="Emirati",
        email="m.alrashidi@gateway.ae",
        phone="+971 50 123 4567",
        address="Villa 12, Emirates Hills, Dubai, UAE",
        status="Active"
    )
    lo2 = LegalOwner(
        legal_owner_id=gen_id(),
        owner_type="Company",
        full_name="Gateway Real Estate Holdings LLC",
        trade_name="Gateway Holdings",
        id_number="TL-2018-DXB-98765",
        id_type="Trade License",
        nationality="UAE",
        email="info@gateway.ae",
        phone="+971 4 567 8901",
        address="Office 2401, Burj Khalifa, Downtown Dubai",
        status="Active"
    )
    lo3 = LegalOwner(
        legal_owner_id=gen_id(),
        owner_type="Individual",
        full_name="Fatima Khalid Al-Mansoori",
        id_number="784-1982-9876543-2",
        id_type="Emirates ID",
        nationality="Emirati",
        email="f.almansoori@gmail.com",
        phone="+971 55 987 6543",
        address="Al Reem Island, Abu Dhabi, UAE",
        status="Active"
    )
    db.add_all([lo1, lo2, lo3])
    db.commit()

    # ── 2. Beneficial Owners ─────────────────────────────────────────────────

    log("Seeding Beneficial Owners...")
    bo1 = BeneficialOwner(
        beneficial_owner_id=gen_id(),
        owner_type="Individual",
        full_name="Sheikh Mohammed Al-Rashidi",
        id_number="784-1975-1234567-1",
        id_type="Emirates ID",
        nationality="Emirati",
        email="m.alrashidi@gateway.ae",
        phone="+971 50 123 4567",
        status="Active"
    )
    bo2 = BeneficialOwner(
        beneficial_owner_id=gen_id(),
        owner_type="Company",
        full_name="Gateway Real Estate Holdings LLC",
        trade_name="Gateway Holdings",
        id_number="TL-2018-DXB-98765",
        id_type="Trade License",
        nationality="UAE",
        email="finance@gateway.ae",
        phone="+971 4 567 8901",
        status="Active"
    )
    bo3 = BeneficialOwner(
        beneficial_owner_id=gen_id(),
        owner_type="Individual",
        full_name="Fatima Khalid Al-Mansoori",
        id_number="784-1982-9876543-2",
        id_type="Emirates ID",
        nationality="Emirati",
        email="f.almansoori@gmail.com",
        phone="+971 55 987 6543",
        status="Active"
    )
    db.add_all([bo1, bo2, bo3])
    db.commit()

    # ── 3. Properties ────────────────────────────────────────────────────────

    log("Seeding Properties...")

    p1 = Property(
        property_id=gen_id(),
        property_code="PROP-001",
        property_name="Marina Heights Tower",
        property_type="Apartment",
        building_name="Marina Heights",
        community="Dubai Marina",
        emirate="Dubai",
        address_line_1="Plot 15, Marina Walk",
        address_line_2="Dubai Marina",
        gps_location="25.0819, 55.1367",
        total_units=12,
        total_area_sqft=Decimal("18500.00"),
        status="Active"
    )
    p2 = Property(
        property_id=gen_id(),
        property_code="PROP-002",
        property_name="Business Bay Office Suite",
        property_type="Office",
        building_name="Aspect Tower",
        community="Business Bay",
        emirate="Dubai",
        address_line_1="Marasi Drive, Business Bay",
        address_line_2="Dubai",
        gps_location="25.1865, 55.2617",
        total_units=3,
        total_area_sqft=Decimal("4200.00"),
        status="Active"
    )
    p3 = Property(
        property_id=gen_id(),
        property_code="PROP-003",
        property_name="JVC Villa Complex",
        property_type="Villa",
        building_name="Jasmine Villas",
        community="Jumeirah Village Circle (JVC)",
        emirate="Dubai",
        address_line_1="District 12, JVC",
        address_line_2="Dubai",
        gps_location="25.0567, 55.2134",
        total_units=4,
        total_area_sqft=Decimal("12800.00"),
        status="Active"
    )
    p4 = Property(
        property_id=gen_id(),
        property_code="PROP-004",
        property_name="Al Quoz Industrial Warehouse",
        property_type="Warehouse",
        building_name=None,
        community="Al Quoz Industrial",
        emirate="Dubai",
        address_line_1="Street 10, Al Quoz Industrial Area 3",
        address_line_2="Dubai",
        gps_location="25.1322, 55.2456",
        total_units=1,
        total_area_sqft=Decimal("8000.00"),
        status="Active"
    )
    p5 = Property(
        property_id=gen_id(),
        property_code="PROP-005",
        property_name="Yas Island Labour Camp",
        property_type="Labour Camp",
        building_name="Gateway Camp Block A",
        community="Yas Island",
        emirate="Abu Dhabi",
        address_line_1="Yas Industrial Zone, Plot 7",
        address_line_2="Abu Dhabi",
        gps_location="24.4965, 54.6087",
        total_units=50,
        total_area_sqft=Decimal("25000.00"),
        status="Active"
    )
    db.add_all([p1, p2, p3, p4, p5])
    db.commit()

    log("Seeding Property Documents...")
    doc1 = PropertyDocument(
        document_id=gen_id(),
        property_id=p1.property_id,
        document_type="Floor Plan",
        document_name="Marina Heights 2BR Floor Plan.pdf",
        file_path="/uploads/properties/floor_plan_marina.pdf",
        file_size_kb=1500
    )
    create_dummy_pdf(doc1.file_path)
    
    doc2 = PropertyDocument(
        document_id=gen_id(),
        property_id=p2.property_id,
        document_type="Insurance",
        document_name="Business Bay Office Insurance.pdf",
        file_path="/uploads/properties/insurance_bb.pdf",
        file_size_kb=2400
    )
    create_dummy_pdf(doc2.file_path)
    db.add_all([doc1, doc2])
    db.commit()

    # ── 4. Property Units ────────────────────────────────────────────────────

    log("Seeding Property Units...")

    # Marina Heights — 3 sample units
    u1 = PropertyUnit(unit_id=gen_id(), property_id=p1.property_id, unit_number="101", unit_type="2BR Apartment", floor_number="1", area_sqft=Decimal("1450.00"), status="Occupied")
    u2 = PropertyUnit(unit_id=gen_id(), property_id=p1.property_id, unit_number="201", unit_type="3BR Apartment", floor_number="2", area_sqft=Decimal("1850.00"), status="Occupied")
    u3 = PropertyUnit(unit_id=gen_id(), property_id=p1.property_id, unit_number="301", unit_type="Studio", floor_number="3", area_sqft=Decimal("650.00"), status="Vacant")

    # Business Bay — 2 units
    u4 = PropertyUnit(unit_id=gen_id(), property_id=p2.property_id, unit_number="A-04", unit_type="Office", floor_number="4", area_sqft=Decimal("1200.00"), status="Occupied")
    u5 = PropertyUnit(unit_id=gen_id(), property_id=p2.property_id, unit_number="A-05", unit_type="Office", floor_number="4", area_sqft=Decimal("980.00"), status="Vacant")

    # JVC Villas — 2 units
    u6 = PropertyUnit(unit_id=gen_id(), property_id=p3.property_id, unit_number="V-01", unit_type="4BR Villa", floor_number="G", area_sqft=Decimal("3200.00"), status="Occupied")
    u7 = PropertyUnit(unit_id=gen_id(), property_id=p3.property_id, unit_number="V-02", unit_type="3BR Villa", floor_number="G", area_sqft=Decimal("2800.00"), status="Occupied")

    # Warehouse — 1 unit
    u8 = PropertyUnit(unit_id=gen_id(), property_id=p4.property_id, unit_number="WH-01", unit_type="Warehouse", floor_number="G", area_sqft=Decimal("8000.00"), status="Occupied")

    # Labour Camp — 1 block unit
    u9 = PropertyUnit(unit_id=gen_id(), property_id=p5.property_id, unit_number="BLK-A", unit_type="Labour Camp Block", floor_number="G", area_sqft=Decimal("25000.00"), status="Occupied")

    units = [u1, u2, u3, u4, u5, u6, u7, u8, u9]
    db.add_all(units)
    db.commit()

    # ── 5. Title Deeds ───────────────────────────────────────────────────────

    log("Seeding Title Deeds...")

    td1 = TitleDeed(
        title_deed_id=gen_id(), unit_id=u1.unit_id,
        title_deed_number="TD-DXB-2019-001245",
        municipality_property_number="MUN-15-0112",
        plot_number="PLT-15-MRN", unit_number="101",
        legal_owner_id=lo1.legal_owner_id,
        beneficial_owner_id=bo1.beneficial_owner_id,
        ownership_percentage=Decimal("100.00"),
        purchase_method="Mortgage",
        ownership_status="Mortgaged",
        loan_number="LN-ENBD-2019-44521",
        mortgage_status="Mortgaged",
        mortgage_bank="Emirates NBD",
        outstanding_loan=Decimal("1250000.00"),
        loan_to_value_ratio=Decimal("62.50"),
        mortgage_expiry_date=date(2029, 6, 30)
    )
    td2 = TitleDeed(
        title_deed_id=gen_id(), unit_id=u2.unit_id,
        title_deed_number="TD-DXB-2020-005512",
        plot_number="PLT-15-MRN", unit_number="201",
        legal_owner_id=lo2.legal_owner_id,
        beneficial_owner_id=bo2.beneficial_owner_id,
        ownership_percentage=Decimal("100.00"),
        purchase_method="Cash",
        ownership_status="Active",
        mortgage_status="Clear"
    )
    td3 = TitleDeed(
        title_deed_id=gen_id(), unit_id=u4.unit_id,
        title_deed_number="TD-DXB-2021-009871",
        plot_number="PLT-BB-07", unit_number="A-04",
        legal_owner_id=lo2.legal_owner_id,
        beneficial_owner_id=bo2.beneficial_owner_id,
        ownership_percentage=Decimal("100.00"),
        purchase_method="Cash",
        ownership_status="Active",
        mortgage_status="Clear"
    )
    td4 = TitleDeed(
        title_deed_id=gen_id(), unit_id=u6.unit_id,
        title_deed_number="TD-DXB-2022-017654",
        plot_number="PLT-JVC-12", unit_number="V-01",
        legal_owner_id=lo3.legal_owner_id,
        beneficial_owner_id=bo3.beneficial_owner_id,
        ownership_percentage=Decimal("100.00"),
        purchase_method="Mortgage",
        ownership_status="Mortgaged",
        mortgage_bank="Abu Dhabi Islamic Bank (ADIB)",
        outstanding_loan=Decimal("980000.00"),
        loan_to_value_ratio=Decimal("55.00"),
        mortgage_expiry_date=date(2032, 3, 15)
    )
    td5 = TitleDeed(
        title_deed_id=gen_id(), unit_id=u8.unit_id,
        title_deed_number="TD-DXB-2018-002341",
        plot_number="PLT-AQ-10", unit_number="WH-01",
        legal_owner_id=lo2.legal_owner_id,
        beneficial_owner_id=bo2.beneficial_owner_id,
        ownership_percentage=Decimal("100.00"),
        purchase_method="Cash",
        ownership_status="Active",
        mortgage_status="Clear"
    )
    db.add_all([td1, td2, td3, td4, td5])
    db.commit()

    # ── 6. Acquisition Costs ─────────────────────────────────────────────────

    log("Seeding Acquisition Costs...")

    ac1 = PropertyAcquisitionCost(
        acquisition_id=gen_id(), title_deed_id=td1.title_deed_id,
        purchase_date=date(2019, 6, 15),
        purchase_price=Decimal("1800000.00"),
        purchase_currency="AED",
        seller_name="Dubai Properties LLC",
        purchase_agreement_number="SPA-DP-2019-0112",
        title_transfer_date=date(2019, 7, 1),
        registration_fees=Decimal("72000.00"),
        broker_commission=Decimal("54000.00"),
        other_acquisition_costs=Decimal("15000.00"),
        total_acquisition_cost=Decimal("1941000.00"),
        notes="Marina Heights Unit 101 — SPA signed June 2019"
    )
    ac2 = PropertyAcquisitionCost(
        acquisition_id=gen_id(), title_deed_id=td2.title_deed_id,
        purchase_date=date(2020, 3, 10),
        purchase_price=Decimal("2400000.00"),
        purchase_currency="AED",
        seller_name="Emaar Properties",
        purchase_agreement_number="SPA-EM-2020-0551",
        title_transfer_date=date(2020, 4, 5),
        registration_fees=Decimal("96000.00"),
        broker_commission=Decimal("72000.00"),
        other_acquisition_costs=Decimal("18000.00"),
        total_acquisition_cost=Decimal("2586000.00"),
        notes="Marina Heights Unit 201 — Full cash purchase"
    )
    ac3 = PropertyAcquisitionCost(
        acquisition_id=gen_id(), title_deed_id=td3.title_deed_id,
        purchase_date=date(2021, 9, 20),
        purchase_price=Decimal("1200000.00"),
        purchase_currency="AED",
        seller_name="Business Bay Developers",
        purchase_agreement_number="SPA-BBD-2021-0987",
        title_transfer_date=date(2021, 10, 12),
        registration_fees=Decimal("48000.00"),
        broker_commission=Decimal("36000.00"),
        other_acquisition_costs=Decimal("8000.00"),
        total_acquisition_cost=Decimal("1292000.00"),
        notes="Business Bay Office A-04"
    )
    ac4 = PropertyAcquisitionCost(
        acquisition_id=gen_id(), title_deed_id=td4.title_deed_id,
        purchase_date=date(2022, 1, 5),
        purchase_price=Decimal("3200000.00"),
        purchase_currency="AED",
        seller_name="Nakheel Properties",
        purchase_agreement_number="SPA-NK-2022-0176",
        title_transfer_date=date(2022, 2, 20),
        registration_fees=Decimal("128000.00"),
        broker_commission=Decimal("96000.00"),
        other_acquisition_costs=Decimal("22000.00"),
        total_acquisition_cost=Decimal("3446000.00"),
        notes="JVC Villa V-01 — Mortgage through ADIB"
    )
    ac5 = PropertyAcquisitionCost(
        acquisition_id=gen_id(), title_deed_id=td5.title_deed_id,
        purchase_date=date(2018, 4, 1),
        purchase_price=Decimal("2800000.00"),
        purchase_currency="AED",
        seller_name="TECOM Investments",
        purchase_agreement_number="SPA-TC-2018-0234",
        title_transfer_date=date(2018, 5, 15),
        registration_fees=Decimal("112000.00"),
        broker_commission=Decimal("84000.00"),
        other_acquisition_costs=Decimal("25000.00"),
        total_acquisition_cost=Decimal("3021000.00"),
        notes="Al Quoz Industrial Warehouse"
    )
    db.add_all([ac1, ac2, ac3, ac4, ac5])
    db.commit()

    # ── 7. Property Valuations ───────────────────────────────────────────────

    log("Seeding Property Valuations...")

    today = date.today()

    valuations = [
        # P1 Marina Heights — 2 valuations
        PropertyValuation(valuation_id=gen_id(), property_id=p1.property_id, market_value=Decimal("3800000.00"), valuation_date=date(2022, 12, 31), valuation_source="RERA", valuation_method="Comparable Sales", valuer_name="JLL UAE", appreciation_percentage=Decimal("15.8"), notes="Annual valuation 2022"),
        PropertyValuation(valuation_id=gen_id(), property_id=p1.property_id, market_value=Decimal("4350000.00"), valuation_date=date(2023, 12, 31), valuation_source="RERA", valuation_method="Comparable Sales", valuer_name="CBRE UAE", appreciation_percentage=Decimal("24.1"), notes="Annual valuation 2023"),
        # P2 Business Bay
        PropertyValuation(valuation_id=gen_id(), property_id=p2.property_id, market_value=Decimal("2600000.00"), valuation_date=date(2022, 12, 31), valuation_source="Internal", valuation_method="Income Approach", valuer_name="Knight Frank", appreciation_percentage=Decimal("18.2"), notes="Annual valuation 2022"),
        PropertyValuation(valuation_id=gen_id(), property_id=p2.property_id, market_value=Decimal("2950000.00"), valuation_date=date(2023, 12, 31), valuation_source="RERA", valuation_method="Comparable Sales", valuer_name="Savills UAE", appreciation_percentage=Decimal("22.9"), notes="Annual valuation 2023"),
        # P3 JVC Villa
        PropertyValuation(valuation_id=gen_id(), property_id=p3.property_id, market_value=Decimal("4100000.00"), valuation_date=date(2023, 6, 30), valuation_source="RERA", valuation_method="Comparable Sales", valuer_name="Asteco", appreciation_percentage=Decimal("19.0"), notes="Mid-year valuation 2023"),
        PropertyValuation(valuation_id=gen_id(), property_id=p3.property_id, market_value=Decimal("4600000.00"), valuation_date=date(2024, 1, 15), valuation_source="Internal", valuation_method="Comparable Sales", valuer_name="Asteco", appreciation_percentage=Decimal("33.5"), notes="Annual valuation 2024"),
        # P4 Warehouse
        PropertyValuation(valuation_id=gen_id(), property_id=p4.property_id, market_value=Decimal("3500000.00"), valuation_date=date(2023, 3, 31), valuation_source="Internal", valuation_method="Income Approach", valuer_name="Internal Estimate", appreciation_percentage=Decimal("15.8"), notes="Quarterly estimate"),
        PropertyValuation(valuation_id=gen_id(), property_id=p4.property_id, market_value=Decimal("3750000.00"), valuation_date=date(2024, 3, 31), valuation_source="Internal", valuation_method="Income Approach", valuer_name="Internal Estimate", appreciation_percentage=Decimal("24.1"), notes="Annual estimate 2024"),
        # P5 Labour Camp
        PropertyValuation(valuation_id=gen_id(), property_id=p5.property_id, market_value=Decimal("4200000.00"), valuation_date=date(2023, 12, 31), valuation_source="Internal", valuation_method="Income Approach", valuer_name="Internal Estimate", appreciation_percentage=Decimal("8.5"), notes="Annual estimate 2023"),
    ]
    db.add_all(valuations)
    db.commit()

    # ── 8. Ownership Records ─────────────────────────────────────────────────

    log("Seeding Ownership Records...")

    or1 = OwnershipRecord(
        ownership_id=gen_id(), property_id=p1.property_id, unit_id=u1.unit_id,
        legal_owner_id=lo1.legal_owner_id, ownership_type="Legal",
        ownership_percentage=Decimal("100.00"), effective_from=date(2019, 7, 1), is_current=True
    )
    or2 = OwnershipRecord(
        ownership_id=gen_id(), property_id=p1.property_id, unit_id=u2.unit_id,
        legal_owner_id=lo2.legal_owner_id, ownership_type="Legal",
        ownership_percentage=Decimal("100.00"), effective_from=date(2020, 4, 5), is_current=True
    )
    or3 = OwnershipRecord(
        ownership_id=gen_id(), property_id=p2.property_id, unit_id=u4.unit_id,
        legal_owner_id=lo2.legal_owner_id, ownership_type="Legal",
        ownership_percentage=Decimal("100.00"), effective_from=date(2021, 10, 12), is_current=True
    )
    or4 = OwnershipRecord(
        ownership_id=gen_id(), property_id=p3.property_id, unit_id=u6.unit_id,
        legal_owner_id=lo3.legal_owner_id, ownership_type="Legal",
        ownership_percentage=Decimal("100.00"), effective_from=date(2022, 2, 20), is_current=True
    )
    or5 = OwnershipRecord(
        ownership_id=gen_id(), property_id=p4.property_id, unit_id=u8.unit_id,
        legal_owner_id=lo2.legal_owner_id, ownership_type="Legal",
        ownership_percentage=Decimal("100.00"), effective_from=date(2018, 5, 15), is_current=True
    )
    db.add_all([or1, or2, or3, or4, or5])
    db.commit()

    # ── 9. Beneficiary Allocations ───────────────────────────────────────────

    log("Seeding Beneficiary Allocations...")

    ba1 = BeneficiaryAllocation(
        allocation_id=gen_id(), ownership_record_id=or1.ownership_id,
        beneficial_owner_id=bo1.beneficial_owner_id,
        allocation_percentage=Decimal("100.00"),
        bank_account_name="Sheikh Mohammed Al-Rashidi",
        bank_name="Emirates NBD",
        iban="AE070260001015643421001",
        effective_from=date(2019, 7, 1), is_current=True
    )
    ba2 = BeneficiaryAllocation(
        allocation_id=gen_id(), ownership_record_id=or2.ownership_id,
        beneficial_owner_id=bo2.beneficial_owner_id,
        allocation_percentage=Decimal("100.00"),
        bank_account_name="Gateway Real Estate Holdings LLC",
        bank_name="First Abu Dhabi Bank (FAB)",
        iban="AE330350001020100369862",
        effective_from=date(2020, 4, 5), is_current=True
    )
    ba3 = BeneficiaryAllocation(
        allocation_id=gen_id(), ownership_record_id=or3.ownership_id,
        beneficial_owner_id=bo2.beneficial_owner_id,
        allocation_percentage=Decimal("100.00"),
        bank_account_name="Gateway Real Estate Holdings LLC",
        bank_name="First Abu Dhabi Bank (FAB)",
        iban="AE330350001020100369862",
        effective_from=date(2021, 10, 12), is_current=True
    )
    ba4 = BeneficiaryAllocation(
        allocation_id=gen_id(), ownership_record_id=or4.ownership_id,
        beneficial_owner_id=bo3.beneficial_owner_id,
        allocation_percentage=Decimal("100.00"),
        bank_account_name="Fatima Khalid Al-Mansoori",
        bank_name="Abu Dhabi Islamic Bank (ADIB)",
        iban="AE920500000000203456781",
        effective_from=date(2022, 2, 20), is_current=True
    )
    ba5 = BeneficiaryAllocation(
        allocation_id=gen_id(), ownership_record_id=or5.ownership_id,
        beneficial_owner_id=bo2.beneficial_owner_id,
        allocation_percentage=Decimal("100.00"),
        bank_account_name="Gateway Real Estate Holdings LLC",
        bank_name="First Abu Dhabi Bank (FAB)",
        iban="AE330350001020100369862",
        effective_from=date(2018, 5, 15), is_current=True
    )
    db.add_all([ba1, ba2, ba3, ba4, ba5])
    db.commit()

    # ── 10. Tenants ──────────────────────────────────────────────────────────

    log("Seeding Tenants...")

    t1 = Tenant(tenant_id=gen_id(), tenant_type="Individual", full_name="Ahmed Hassan Al-Zaabi",
                id_number="784-1988-4567891-3", id_type="Emirates ID",
                id_expiry=date(2026, 11, 30), nationality="Emirati",
                email="ahmed.alzaabi@email.ae", phone="+971 50 234 5678",
                whatsapp="+971 50 234 5678", employer="Dubai Municipality",
                status="Active")

    t2 = Tenant(tenant_id=gen_id(), tenant_type="Individual", full_name="Priya Sharma",
                id_number="A7654321", id_type="Passport",
                id_expiry=date(2027, 8, 15), nationality="Indian",
                email="priya.sharma@techcorp.ae", phone="+971 55 345 6789",
                whatsapp="+971 55 345 6789", employer="TechCorp DMCC",
                status="Active")

    t3 = Tenant(tenant_id=gen_id(), tenant_type="Company", full_name="Apex Consulting FZE",
                trade_name="Apex Consulting",
                id_number="TL-2020-FZE-11234", id_type="Trade License",
                id_expiry=date(2025, 12, 31), nationality="UAE",
                email="admin@apexconsulting.ae", phone="+971 4 678 9012",
                status="Active")

    t4 = Tenant(tenant_id=gen_id(), tenant_type="Individual", full_name="James McCarthy",
                id_number="P8901234", id_type="Passport",
                id_expiry=date(2026, 5, 20), nationality="Irish",
                email="j.mccarthy@irishair.ae", phone="+971 56 456 7890",
                employer="Emirates Airlines", status="Active")

    t5 = Tenant(tenant_id=gen_id(), tenant_type="Company", full_name="Gulf Logistics LLC",
                trade_name="Gulf Logistics",
                id_number="TL-2016-LLC-44512", id_type="Trade License",
                id_expiry=date(2025, 8, 31), nationality="UAE",
                email="ops@gulflogistics.ae", phone="+971 4 789 0123",
                status="Active")

    t6 = Tenant(tenant_id=gen_id(), tenant_type="Company", full_name="Al Baraka Construction WLL",
                trade_name="Al Baraka",
                id_number="TL-2014-WLL-87654", id_type="Trade License",
                id_expiry=date(2025, 10, 31), nationality="UAE",
                email="camp@albaraka.ae", phone="+971 2 890 1234",
                status="Active")

    db.add_all([t1, t2, t3, t4, t5, t6])
    db.commit()

    # Get the admin user id for created_by
    from app.models.auth import User
    admin_user = db.query(User).filter(User.email == "admin@aigpms.com").first()
    admin_id = admin_user.user_id if admin_user else None

    # ── 11. Leases ───────────────────────────────────────────────────────────

    log("Seeding Leases & Versions...")

    # Lease 1 — Ahmed in Marina Heights 101
    l1 = Lease(lease_id=gen_id(), lease_number="LEASE-2024-001",
               property_id=p1.property_id, unit_id=u1.unit_id,
               tenant_id=t1.tenant_id, lease_type="Residential",
               status="Active", created_by=admin_id)
    db.add(l1); db.flush()
    lv1 = LeaseVersion(
        version_id=gen_id(), lease_id=l1.lease_id, version_number=1,
        contract_start_date=date(2024, 1, 1), contract_end_date=date(2024, 12, 31),
        annual_rent=Decimal("120000.00"), currency="AED",
        payment_frequency="Quarterly", number_of_cheques=4,
        security_deposit=Decimal("10000.00"), agent_commission=Decimal("6000.00"),
        municipality_fee=Decimal("7200.00"),
        ejari_number="EJARI-DXB-2024-001112",
        contract_reference="CTR-2024-001", is_current_version=True, status="Active"
    )
    db.add(lv1); db.flush()

    # Lease 2 — Priya in Marina Heights 201
    l2 = Lease(lease_id=gen_id(), lease_number="LEASE-2024-002",
               property_id=p1.property_id, unit_id=u2.unit_id,
               tenant_id=t2.tenant_id, lease_type="Residential",
               status="Active", created_by=admin_id)
    db.add(l2); db.flush()
    lv2 = LeaseVersion(
        version_id=gen_id(), lease_id=l2.lease_id, version_number=1,
        contract_start_date=date(2024, 3, 1), contract_end_date=date(2025, 2, 28),
        annual_rent=Decimal("160000.00"), currency="AED",
        payment_frequency="Quarterly", number_of_cheques=4,
        security_deposit=Decimal("13333.00"), agent_commission=Decimal("8000.00"),
        municipality_fee=Decimal("9600.00"),
        ejari_number="EJARI-DXB-2024-002341",
        contract_reference="CTR-2024-002", is_current_version=True, status="Active"
    )
    db.add(lv2); db.flush()

    # Lease 3 — Apex Consulting in Business Bay Office
    l3 = Lease(lease_id=gen_id(), lease_number="LEASE-2024-003",
               property_id=p2.property_id, unit_id=u4.unit_id,
               tenant_id=t3.tenant_id, lease_type="Commercial",
               status="Active", created_by=admin_id)
    db.add(l3); db.flush()
    lv3 = LeaseVersion(
        version_id=gen_id(), lease_id=l3.lease_id, version_number=1,
        contract_start_date=date(2024, 4, 1), contract_end_date=date(2025, 3, 31),
        annual_rent=Decimal("220000.00"), currency="AED",
        payment_frequency="Semi-Annual", number_of_cheques=2,
        security_deposit=Decimal("36667.00"), agent_commission=Decimal("11000.00"),
        municipality_fee=Decimal("13200.00"),
        ejari_number="EJARI-DXB-2024-003560",
        contract_reference="CTR-2024-003", is_current_version=True, status="Active"
    )
    db.add(lv3); db.flush()

    # Lease 4 — Gulf Logistics in Warehouse
    l4 = Lease(lease_id=gen_id(), lease_number="LEASE-2024-004",
               property_id=p4.property_id, unit_id=u8.unit_id,
               tenant_id=t5.tenant_id, lease_type="Commercial",
               status="Active", created_by=admin_id)
    db.add(l4); db.flush()
    lv4 = LeaseVersion(
        version_id=gen_id(), lease_id=l4.lease_id, version_number=2,
        contract_start_date=date(2024, 6, 1), contract_end_date=date(2025, 5, 31),
        annual_rent=Decimal("480000.00"), currency="AED",
        payment_frequency="Semi-Annual", number_of_cheques=2,
        security_deposit=Decimal("80000.00"), agent_commission=Decimal("24000.00"),
        municipality_fee=Decimal("28800.00"),
        ejari_number="EJARI-DXB-2024-004112",
        contract_reference="CTR-2024-004", is_current_version=True, status="Active",
        renewal_reason="Annual renewal — revised rent by 8%"
    )
    db.add(lv4); db.flush()

    # Lease 5 — Al Baraka Construction in Labour Camp
    l5 = Lease(lease_id=gen_id(), lease_number="LEASE-2024-005",
               property_id=p5.property_id, unit_id=u9.unit_id,
               tenant_id=t6.tenant_id, lease_type="Labour Camp",
               status="Active", created_by=admin_id)
    db.add(l5); db.flush()
    lv5 = LeaseVersion(
        version_id=gen_id(), lease_id=l5.lease_id, version_number=1,
        contract_start_date=date(2024, 1, 1), contract_end_date=date(2024, 12, 31),
        annual_rent=Decimal("360000.00"), currency="AED",
        payment_frequency="Quarterly", number_of_cheques=4,
        security_deposit=Decimal("90000.00"),
        ejari_number="EJARI-AUH-2024-005222",
        contract_reference="CTR-2024-005", is_current_version=True, status="Active"
    )
    db.add(lv5); db.flush()
    db.commit()

    # ── 12. Payment Schedules ────────────────────────────────────────────────

    log("Seeding Lease Payment Schedules...")

    # Lease 1 — 4 quarterly cheques (AED 30,000 each)
    q1_dates = [date(2024, 1, 1), date(2024, 4, 1), date(2024, 7, 1), date(2024, 10, 1)]
    sched_l1 = []
    for i, d in enumerate(q1_dates):
        sched_l1.append(LeasePaymentSchedule(
            schedule_id=gen_id(), lease_version_id=lv1.version_id,
            instalment_number=i+1, due_date=d, amount=Decimal("30000.00"),
            period_from=d, period_to=date(d.year, d.month + 2 if d.month <= 10 else 12, 28),
            status="Paid" if d < today else "Pending"
        ))

    # Lease 2 — 4 quarterly cheques (AED 40,000 each)
    q2_dates = [date(2024, 3, 1), date(2024, 6, 1), date(2024, 9, 1), date(2024, 12, 1)]
    sched_l2 = []
    for i, d in enumerate(q2_dates):
        sched_l2.append(LeasePaymentSchedule(
            schedule_id=gen_id(), lease_version_id=lv2.version_id,
            instalment_number=i+1, due_date=d, amount=Decimal("40000.00"),
            period_from=d, period_to=date(d.year, d.month + 2 if d.month <= 10 else 12, 28),
            status="Paid" if d < today else "Pending"
        ))

    # Lease 3 — 2 semi-annual cheques (AED 110,000 each)
    q3_dates = [date(2024, 4, 1), date(2024, 10, 1)]
    sched_l3 = []
    for i, d in enumerate(q3_dates):
        sched_l3.append(LeasePaymentSchedule(
            schedule_id=gen_id(), lease_version_id=lv3.version_id,
            instalment_number=i+1, due_date=d, amount=Decimal("110000.00"),
            period_from=d, period_to=date(d.year, d.month + 5 if d.month <= 7 else 12, 28),
            status="Paid" if d < today else "Pending"
        ))

    # Lease 4 — 2 semi-annual cheques (AED 240,000 each)
    q4_dates = [date(2024, 6, 1), date(2024, 12, 1)]
    sched_l4 = []
    for i, d in enumerate(q4_dates):
        sched_l4.append(LeasePaymentSchedule(
            schedule_id=gen_id(), lease_version_id=lv4.version_id,
            instalment_number=i+1, due_date=d, amount=Decimal("240000.00"),
            period_from=d, period_to=date(d.year, d.month + 5 if d.month <= 7 else 12, 28),
            status="Paid" if d < today else "Pending"
        ))

    # Lease 5 — 4 quarterly cheques (AED 90,000 each)
    q5_dates = [date(2024, 1, 1), date(2024, 4, 1), date(2024, 7, 1), date(2024, 10, 1)]
    sched_l5 = []
    for i, d in enumerate(q5_dates):
        sched_l5.append(LeasePaymentSchedule(
            schedule_id=gen_id(), lease_version_id=lv5.version_id,
            instalment_number=i+1, due_date=d, amount=Decimal("90000.00"),
            period_from=d, period_to=date(d.year, d.month + 2 if d.month <= 10 else 12, 28),
            status="Paid" if d < today else "Pending"
        ))

    all_scheds = sched_l1 + sched_l2 + sched_l3 + sched_l4 + sched_l5
    db.add_all(all_scheds)
    db.commit()

    # ── 13. Rental Receipts + PDC Received ───────────────────────────────────

    log("Seeding Rental Receipts & PDC Records...")

    # Get a reference bank
    bank = db.query(MasterBank).filter(MasterBank.bank_name.like("%Emirates NBD%")).first()
    bank_adcb = db.query(MasterBank).filter(MasterBank.bank_name.like("%ADCB%")).first()
    bank_fab = db.query(MasterBank).filter(MasterBank.bank_name.like("%First Abu Dhabi%")).first()
    bank_name = bank.bank_name if bank else "Emirates NBD"
    bank_adcb_name = bank_adcb.bank_name if bank_adcb else "ADCB"
    bank_fab_name = bank_fab.bank_name if bank_fab else "FAB"

    accountant = db.query(User).filter(User.email == "accountant@aigpms.com").first()
    accountant_id = accountant.user_id if accountant else admin_id

    def make_receipt_and_pdcs(
        receipt_number, receipt_date, tenant, prop, unit, lease, lease_version,
        payment_purpose, cheques, received_by_id
    ):
        """Helper to create a receipt with PDC lines."""
        total = sum(c["amount"] for c in cheques)
        receipt = RentalReceipt(
            receipt_id=gen_id(),
            receipt_number=receipt_number,
            receipt_date=receipt_date,
            tenant_id=tenant.tenant_id,
            property_id=prop.property_id,
            unit_id=unit.unit_id,
            lease_id=lease.lease_id,
            lease_version_id=lease_version.version_id,
            payment_purpose=payment_purpose,
            currency="AED",
            total_amount=Decimal(str(total)),
            receipt_status="Posted",
            received_by=received_by_id,
            posted_at=datetime.utcnow(),
            posted_by=received_by_id,
            remarks=f"Rental receipt for {payment_purpose}",
            attachment_path=f"/uploads/receipts/{receipt_number}.pdf"
        )
        create_dummy_pdf(receipt.attachment_path)
        db.add(receipt)
        db.flush()

        pdc_records = []
        for i, c in enumerate(cheques):
            pdc_attachment_path = c.get("attachment_path", f"/uploads/pdcs/{c['cheque_number']}.pdf")
            create_dummy_pdf(pdc_attachment_path)
            
            pdc = PDCReceived(
                pdc_received_id=gen_id(),
                pdc_receipt_reference=f"{receipt_number}-{i+1:02d}",
                tenant_id=tenant.tenant_id,
                property_id=prop.property_id,
                unit_id=unit.unit_id,
                lease_id=lease.lease_id,
                lease_version_id=lease_version.version_id,
                cheque_number=c["cheque_number"],
                bank_name=c["bank_name"],
                account_holder=c.get("account_holder", tenant.full_name),
                cheque_amount=Decimal(str(c["amount"])),
                cheque_date=c["cheque_date"],
                rental_period_from=c.get("period_from"),
                rental_period_to=c.get("period_to"),
                status=c.get("status", "Cleared"),
                date_received=receipt_date,
                remarks=f"Cheque {i+1} of {len(cheques)}",
                attachment_path=pdc_attachment_path
            )
            db.add(pdc)
            db.flush()

            # Status history
            db.add(PDCReceivedStatusHistory(
                history_id=gen_id(), pdc_received_id=pdc.pdc_received_id,
                old_status=None, new_status="Received", changed_by=received_by_id,
                changed_at=datetime.utcnow() - timedelta(days=30),
                notes="Initial receipt"
            ))
            if pdc.status in ("Deposited", "Cleared", "Returned"):
                db.add(PDCReceivedStatusHistory(
                    history_id=gen_id(), pdc_received_id=pdc.pdc_received_id,
                    old_status="Received", new_status="Deposited", changed_by=received_by_id,
                    changed_at=datetime.utcnow() - timedelta(days=5),
                    notes="Deposited to bank"
                ))
            if pdc.status == "Cleared":
                db.add(PDCReceivedStatusHistory(
                    history_id=gen_id(), pdc_received_id=pdc.pdc_received_id,
                    old_status="Deposited", new_status="Cleared", changed_by=received_by_id,
                    changed_at=datetime.utcnow() - timedelta(days=2),
                    notes="Confirmed cleared by bank"
                ))

            # Payment line
            pl = RentalReceiptPaymentLine(
                payment_line_id=gen_id(),
                receipt_id=receipt.receipt_id,
                lease_version_id=lease_version.version_id,
                line_number=i+1,
                instrument_type="PDC",
                amount=Decimal(str(c["amount"])),
                cheque_number=c["cheque_number"],
                bank_name=c["bank_name"],
                account_holder=c.get("account_holder", tenant.full_name),
                instrument_date=c["cheque_date"],
                rental_period_from=c.get("period_from"),
                rental_period_to=c.get("period_to"),
                pdc_received_id=pdc.pdc_received_id,
                attachment_path=pdc.attachment_path
            )
            db.add(pl)
            pdc_records.append(pdc)

        db.commit()
        return receipt, pdc_records

    # Receipt 1 — Ahmed, Lease 1, Q1+Q2+Q3+Q4 (all 4 cheques at signing)
    r1, _ = make_receipt_and_pdcs(
        "RCP-2024-0001", date(2024, 1, 1),
        t1, p1, u1, l1, lv1, "New Tenancy — Full Year",
        [
            {"cheque_number": "ENBD-100001", "bank_name": bank_name, "amount": 30000,
             "cheque_date": date(2024, 1, 1), "period_from": date(2024, 1, 1), "period_to": date(2024, 3, 31), "status": "Cleared"},
            {"cheque_number": "ENBD-100002", "bank_name": bank_name, "amount": 30000,
             "cheque_date": date(2024, 4, 1), "period_from": date(2024, 4, 1), "period_to": date(2024, 6, 30), "status": "Cleared"},
            {"cheque_number": "ENBD-100003", "bank_name": bank_name, "amount": 30000,
             "cheque_date": date(2024, 7, 1), "period_from": date(2024, 7, 1), "period_to": date(2024, 9, 30), "status": "Cleared"},
            {"cheque_number": "ENBD-100004", "bank_name": bank_name, "amount": 30000,
             "cheque_date": date(2024, 10, 1), "period_from": date(2024, 10, 1), "period_to": date(2024, 12, 31), "status": "Received"},
        ],
        accountant_id
    )

    # Receipt 2 — Priya, Lease 2, Q1+Q2 (first 2 cheques)
    r2, _ = make_receipt_and_pdcs(
        "RCP-2024-0002", date(2024, 3, 1),
        t2, p1, u2, l2, lv2, "New Tenancy — First Half",
        [
            {"cheque_number": "ADCB-220101", "bank_name": bank_adcb_name, "amount": 40000,
             "cheque_date": date(2024, 3, 1), "period_from": date(2024, 3, 1), "period_to": date(2024, 5, 31), "status": "Cleared"},
            {"cheque_number": "ADCB-220102", "bank_name": bank_adcb_name, "amount": 40000,
             "cheque_date": date(2024, 6, 1), "period_from": date(2024, 6, 1), "period_to": date(2024, 8, 31), "status": "Deposited"},
        ],
        accountant_id
    )

    # Receipt 3 — Priya, Lease 2, Q3+Q4 (second half)
    r3, _ = make_receipt_and_pdcs(
        "RCP-2024-0003", date(2024, 3, 1),
        t2, p1, u2, l2, lv2, "New Tenancy — Second Half",
        [
            {"cheque_number": "ADCB-220103", "bank_name": bank_adcb_name, "amount": 40000,
             "cheque_date": date(2024, 9, 1), "period_from": date(2024, 9, 1), "period_to": date(2024, 11, 30), "status": "Received"},
            {"cheque_number": "ADCB-220104", "bank_name": bank_adcb_name, "amount": 40000,
             "cheque_date": date(2024, 12, 1), "period_from": date(2024, 12, 1), "period_to": date(2025, 2, 28), "status": "Received"},
        ],
        accountant_id
    )

    # Receipt 4 — Apex Consulting, Lease 3, 2 cheques
    r4, _ = make_receipt_and_pdcs(
        "RCP-2024-0004", date(2024, 4, 1),
        t3, p2, u4, l3, lv3, "Commercial Tenancy",
        [
            {"cheque_number": "FAB-330401", "bank_name": bank_fab_name, "amount": 110000,
             "cheque_date": date(2024, 4, 1), "period_from": date(2024, 4, 1), "period_to": date(2024, 9, 30), "status": "Cleared"},
            {"cheque_number": "FAB-330402", "bank_name": bank_fab_name, "amount": 110000,
             "cheque_date": date(2024, 10, 1), "period_from": date(2024, 10, 1), "period_to": date(2025, 3, 31), "status": "Received"},
        ],
        accountant_id
    )

    # Receipt 5 — Gulf Logistics, Lease 4, 2 cheques (one RETURNED)
    r5, pdcs5 = make_receipt_and_pdcs(
        "RCP-2024-0005", date(2024, 6, 1),
        t5, p4, u8, l4, lv4, "Warehouse Tenancy",
        [
            {"cheque_number": "ENBD-550601", "bank_name": bank_name, "amount": 240000,
             "cheque_date": date(2024, 6, 1), "period_from": date(2024, 6, 1), "period_to": date(2024, 11, 30), "status": "Cleared"},
            {"cheque_number": "ENBD-550602", "bank_name": bank_name, "amount": 240000,
             "cheque_date": date(2024, 12, 1), "period_from": date(2024, 12, 1), "period_to": date(2025, 5, 31), "status": "Returned"},
        ],
        accountant_id
    )

    # Update the returned cheque's history and create ChequeReturn record
    returned_pdc = db.query(PDCReceived).filter(
        PDCReceived.cheque_number == "ENBD-550602"
    ).first()
    if returned_pdc:
        db.add(PDCReceivedStatusHistory(
            history_id=gen_id(), pdc_received_id=returned_pdc.pdc_received_id,
            old_status="Deposited", new_status="Returned", changed_by=accountant_id,
            changed_at=datetime.utcnow() - timedelta(days=1),
            notes="Cheque returned — insufficient funds"
        ))
        # Create a proper ChequeReturn record (fields live here, not on PDCReceived)
        db.add(ChequeReturn(
            return_id=gen_id(),
            pdc_received_id=returned_pdc.pdc_received_id,
            return_date=date.today() - timedelta(days=1),
            return_reason="Insufficient funds",
            bank_charges=Decimal("200.00"),
            follow_up_action="Contact tenant for replacement cheque",
            resolved=False
        ))
    db.commit()

    log("All dummy data seeded successfully!")
    log("")
    log("Summary:")
    log(f"  Properties  : {db.query(Property).count()}")
    log(f"  Units       : {db.query(PropertyUnit).count()}")
    log(f"  Title Deeds : {db.query(TitleDeed).count()}")
    log(f"  Legal Owners: {db.query(LegalOwner).count()}")
    log(f"  Tenants     : {db.query(Tenant).count()}")
    log(f"  Leases      : {db.query(Lease).count()}")
    log(f"  Receipts    : {db.query(RentalReceipt).count()}")
    log(f"  PDC Records : {db.query(PDCReceived).count()}")
    log(f"  Valuations  : {db.query(PropertyValuation).count()}")


if __name__ == "__main__":
    print("\n*** AIGPMS - Dummy Data Seeder ***")
    print("=" * 50)

    # Ensure all tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Seed roles/users/master data first
        print("[Step 1] Initializing base data (roles, users, master data)...")
        init_db(db)

        # Then seed business dummy data
        print("[Step 2] Seeding business dummy data...")
        clear_business_data(db)
        seed_dummy_data(db)

        print("\n[DONE] Open http://localhost:5173 and log in to see the data.")
        print("   MD login:         md@aigpms.com / MDPass123!")
        print("   Accountant login: accountant@aigpms.com / AccountantPass123!")
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
