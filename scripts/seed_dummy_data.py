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
    # db.query(BeneficiaryAllocation).delete()
    # db.query(OwnershipRecord).delete()
    # db.query(PropertyAcquisitionCost).delete()
    # db.query(PropertyValuation).delete()
    # db.query(TitleDeed).delete()
    # db.query(PropertyUnit).delete()
    # db.query(Property).delete()
    # db.query(BeneficialOwner).delete()
    # db.query(LegalOwner).delete()
    db.query(Tenant).delete()
    db.commit()
    log("Done clearing.")


def seed_dummy_data(db: Session):

    # ── 1 to 9. PRESERVED REAL PROPERTY MASTER DATA ──────────────────────────
    log("Fetching real Property Master data instead of seeding dummies...")
    properties = db.query(Property).all()
    if not properties:
        log("No properties found! Please enter real properties in the UI first.")
        fallback_p = Property(
            property_id=gen_id(), property_code="FB-001", property_name="Fallback Property",
            property_type="Apartment", community="Dubai Marina", emirate="Dubai",
            total_units=1, total_area_sqm=Decimal("1000.00"), status="Active"
        )
        fallback_u = PropertyUnit(
            unit_id=gen_id(), property_id=fallback_p.property_id, unit_number="FB-101",
            unit_type="2BR Apartment", status="Vacant"
        )
        db.add_all([fallback_p, fallback_u])
        db.commit()
        properties = [fallback_p]
        units = [fallback_u]
    else:
        units = db.query(PropertyUnit).all()
        if not units:
            log("Properties exist but no units found! Creating fallback unit.")
            fallback_u = PropertyUnit(
                unit_id=gen_id(), property_id=properties[0].property_id, unit_number="FB-101",
                unit_type="2BR Apartment", status="Vacant"
            )
            db.add(fallback_u)
            db.commit()
            units = [fallback_u]

    p1 = properties[0]
    p2 = properties[1] if len(properties) > 1 else properties[0]
    p3 = properties[2] if len(properties) > 2 else properties[0]
    p4 = properties[3] if len(properties) > 3 else properties[0]
    p5 = properties[4] if len(properties) > 4 else properties[0]

    def get_unit(prop_id):
        for u in units:
            if u.property_id == prop_id:
                return u
        return units[0]

    u1 = get_unit(p1.property_id)
    u2 = get_unit(p2.property_id)
    u4 = get_unit(p3.property_id)
    u8 = get_unit(p4.property_id)
    u9 = get_unit(p5.property_id)
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

    today = date.today()
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
