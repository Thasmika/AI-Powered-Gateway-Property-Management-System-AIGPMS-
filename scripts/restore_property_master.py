import sys
import os
from datetime import date
from decimal import Decimal
import uuid

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.property import Property, PropertyUnit, TitleDeed, PropertyValuation, PropertyAcquisitionCost
from app.models.ownership import LegalOwner, BeneficialOwner, OwnershipRecord, BeneficiaryAllocation

def gen_id():
    return str(uuid.uuid4())

def log(msg):
    print(f"  [Restore] {msg}")

def restore_property_master(db: Session):
    log("Restoring realistic Property Master data...")

    # ── 1. Legal Owners ──────────────────────────────────────────────────────
    log("Re-creating Legal Owners...")
    lo1 = LegalOwner(
        legal_owner_id=gen_id(), owner_type="Individual",
        full_name="Sheikh Mohammed Al-Rashidi", id_number="784-1975-1234567-1",
        id_type="Emirates ID", nationality="Emirati",
        email="m.alrashidi@gateway.ae", phone="+971 50 123 4567",
        address="Villa 12, Emirates Hills, Dubai, UAE", status="Active"
    )
    lo2 = LegalOwner(
        legal_owner_id=gen_id(), owner_type="Company",
        full_name="Gateway Real Estate Holdings LLC", trade_name="Gateway Holdings",
        id_number="TL-2018-DXB-98765", id_type="Trade License",
        nationality="UAE", email="info@gateway.ae", phone="+971 4 567 8901",
        address="Office 2401, Burj Khalifa, Downtown Dubai", status="Active"
    )
    lo3 = LegalOwner(
        legal_owner_id=gen_id(), owner_type="Individual",
        full_name="Fatima Khalid Al-Mansoori", id_number="784-1982-9876543-2",
        id_type="Emirates ID", nationality="Emirati",
        email="f.almansoori@gmail.com", phone="+971 55 987 6543",
        address="Al Reem Island, Abu Dhabi, UAE", status="Active"
    )
    db.add_all([lo1, lo2, lo3])
    db.commit()

    # ── 2. Beneficial Owners ─────────────────────────────────────────────────
    log("Re-creating Beneficial Owners...")
    bo1 = BeneficialOwner(
        beneficial_owner_id=gen_id(), owner_type="Individual",
        full_name="Sheikh Mohammed Al-Rashidi", id_number="784-1975-1234567-1",
        id_type="Emirates ID", nationality="Emirati",
        email="m.alrashidi@gateway.ae", phone="+971 50 123 4567", status="Active"
    )
    bo2 = BeneficialOwner(
        beneficial_owner_id=gen_id(), owner_type="Company",
        full_name="Gateway Real Estate Holdings LLC", trade_name="Gateway Holdings",
        id_number="TL-2018-DXB-98765", id_type="Trade License",
        nationality="UAE", email="finance@gateway.ae", phone="+971 4 567 8901", status="Active"
    )
    bo3 = BeneficialOwner(
        beneficial_owner_id=gen_id(), owner_type="Individual",
        full_name="Fatima Khalid Al-Mansoori", id_number="784-1982-9876543-2",
        id_type="Emirates ID", nationality="Emirati",
        email="f.almansoori@gmail.com", phone="+971 55 987 6543", status="Active"
    )
    db.add_all([bo1, bo2, bo3])
    db.commit()

    # ── 3. Properties ────────────────────────────────────────────────────────
    log("Re-creating Properties...")
    p1 = Property(
        property_id=gen_id(), property_code="PROP-001", property_name="Marina Heights Tower",
        property_type="Apartment", building_name="Marina Heights", community="Dubai Marina",
        emirate="Dubai", address_line_1="Plot 15, Marina Walk", address_line_2="Dubai Marina",
        gps_location="25.0819, 55.1367", total_units=12, total_area_sqm=Decimal("18500.00"), status="Active"
    )
    p2 = Property(
        property_id=gen_id(), property_code="PROP-002", property_name="Business Bay Office Suite",
        property_type="Office", building_name="Aspect Tower", community="Business Bay",
        emirate="Dubai", address_line_1="Marasi Drive, Business Bay", address_line_2="Dubai",
        gps_location="25.1865, 55.2617", total_units=3, total_area_sqm=Decimal("4200.00"), status="Active"
    )
    p3 = Property(
        property_id=gen_id(), property_code="PROP-003", property_name="JVC Villa Complex",
        property_type="Villa", building_name="Jasmine Villas", community="Jumeirah Village Circle (JVC)",
        emirate="Dubai", address_line_1="District 12, JVC", address_line_2="Dubai",
        gps_location="25.0567, 55.2134", total_units=4, total_area_sqm=Decimal("12800.00"), status="Active"
    )
    p4 = Property(
        property_id=gen_id(), property_code="PROP-004", property_name="Al Quoz Industrial Warehouse",
        property_type="Warehouse", building_name=None, community="Al Quoz Industrial",
        emirate="Dubai", address_line_1="Street 10, Al Quoz Industrial Area 3", address_line_2="Dubai",
        gps_location="25.1322, 55.2456", total_units=1, total_area_sqm=Decimal("8000.00"), status="Active"
    )
    p5 = Property(
        property_id=gen_id(), property_code="PROP-005", property_name="Yas Island Labour Camp",
        property_type="Labour Camp", building_name="Gateway Camp Block A", community="Yas Island",
        emirate="Abu Dhabi", address_line_1="Yas Industrial Zone, Plot 7", address_line_2="Abu Dhabi",
        gps_location="24.4965, 54.6087", total_units=50, total_area_sqm=Decimal("25000.00"), status="Active"
    )
    db.add_all([p1, p2, p3, p4, p5])
    db.commit()

    # ── 4. Property Units ────────────────────────────────────────────────────
    log("Re-creating Property Units...")
    u1 = PropertyUnit(unit_id=gen_id(), property_id=p1.property_id, unit_number="101", unit_type="2BR Apartment", floor_number="1", area_sqm=Decimal("1450.00"), status="Vacant")
    u2 = PropertyUnit(unit_id=gen_id(), property_id=p1.property_id, unit_number="201", unit_type="3BR Apartment", floor_number="2", area_sqm=Decimal("1850.00"), status="Vacant")
    u4 = PropertyUnit(unit_id=gen_id(), property_id=p2.property_id, unit_number="A-04", unit_type="Office", floor_number="4", area_sqm=Decimal("1200.00"), status="Vacant")
    u6 = PropertyUnit(unit_id=gen_id(), property_id=p3.property_id, unit_number="V-01", unit_type="4BR Villa", floor_number="G", area_sqm=Decimal("3200.00"), status="Vacant")
    u8 = PropertyUnit(unit_id=gen_id(), property_id=p4.property_id, unit_number="WH-01", unit_type="Warehouse", floor_number="G", area_sqm=Decimal("8000.00"), status="Vacant")
    u9 = PropertyUnit(unit_id=gen_id(), property_id=p5.property_id, unit_number="BLK-A", unit_type="Labour Camp Block", floor_number="G", area_sqm=Decimal("25000.00"), status="Vacant")
    db.add_all([u1, u2, u4, u6, u8, u9])
    db.commit()

    # ── 5. Title Deeds ───────────────────────────────────────────────────────
    log("Re-creating Title Deeds...")
    td1 = TitleDeed(
        title_deed_id=gen_id(), unit_id=u1.unit_id, title_deed_number="TD-DXB-2019-001245",
        plot_number="PLT-15-MRN", unit_number="101", legal_owner_id=lo1.legal_owner_id,
        beneficial_owner_id=bo1.beneficial_owner_id, ownership_percentage=Decimal("100.00"),
        purchase_method="Mortgage", ownership_status="Mortgaged", loan_number="LN-ENBD-2019-44521",
        mortgage_status="Mortgaged", mortgage_bank="Emirates NBD", outstanding_loan=Decimal("1250000.00"),
        loan_to_value_ratio=Decimal("62.50"), mortgage_expiry_date=date(2029, 6, 30)
    )
    td2 = TitleDeed(
        title_deed_id=gen_id(), unit_id=u4.unit_id, title_deed_number="TD-DXB-2021-009871",
        plot_number="PLT-BB-07", unit_number="A-04", legal_owner_id=lo2.legal_owner_id,
        beneficial_owner_id=bo2.beneficial_owner_id, ownership_percentage=Decimal("100.00"),
        purchase_method="Cash", ownership_status="Active", mortgage_status="Clear"
    )
    db.add_all([td1, td2])
    db.commit()

    # ── 6. Acquisition Costs ─────────────────────────────────────────────────
    log("Re-creating Acquisition Costs...")
    ac1 = PropertyAcquisitionCost(
        acquisition_id=gen_id(), title_deed_id=td1.title_deed_id, purchase_date=date(2019, 6, 15),
        purchase_price=Decimal("1800000.00"), purchase_currency="AED", seller_name="Dubai Properties LLC",
        purchase_agreement_number="SPA-DP-2019-0112", title_transfer_date=date(2019, 7, 1),
        registration_fees=Decimal("72000.00"), broker_commission=Decimal("54000.00"),
        other_acquisition_costs=Decimal("15000.00"), total_acquisition_cost=Decimal("1941000.00")
    )
    db.add_all([ac1])
    db.commit()
    
    # ── 7. Valuations ────────────────────────────────────────────────────────
    log("Re-creating Valuations...")
    v1 = PropertyValuation(
        valuation_id=gen_id(), property_id=p1.property_id, market_value=Decimal("3800000.00"),
        valuation_date=date(2022, 12, 31), valuation_source="RERA", valuation_method="Comparable Sales",
        valuer_name="JLL UAE", appreciation_percentage=Decimal("15.8")
    )
    db.add_all([v1])
    db.commit()

    log("Successfully restored Property Master data!")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        # Avoid duplicate inserts
        if db.query(Property).count() > 0:
            log("Properties already exist in the database! Deleting existing fallback or dummy properties...")
            # We only delete fallback properties to avoid destroying REAL real data again.
            db.query(PropertyUnit).filter(PropertyUnit.unit_number == 'FB-101').delete()
            db.query(Property).filter(Property.property_code == 'FB-001').delete()
            db.commit()
            
        restore_property_master(db)
    except Exception as e:
        log(f"Error restoring property master: {e}")
        db.rollback()
    finally:
        db.close()
