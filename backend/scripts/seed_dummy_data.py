import sys
import os
from datetime import datetime, date
from decimal import Decimal

# Add the 'backend' directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal, engine, Base
from app.models.property import Property, TitleDeed
from app.models.ownership import Owner, OwnershipRecord, BeneficiaryAllocation

def seed_data():
    db = SessionLocal()
    
    # 1. Clear existing dummy data (optional but good for clean staging environment)
    print("Clearing old property master data...")
    db.query(BeneficiaryAllocation).delete()
    db.query(OwnershipRecord).delete()
    db.query(TitleDeed).delete()
    db.query(Owner).delete()
    db.query(Property).delete()
    db.commit()

    print("Creating new dummy owners...")
    # 2. Create Owners
    owner1 = Owner(full_name="Ahmad Al Futtaim", owner_type="Individual", email="ahmad@example.com")
    owner2 = Owner(full_name="Gateway Investments LLC", owner_type="Company", email="info@gateway-investments.com", trade_name="Gateway Investments")
    owner3 = Owner(full_name="Sarah Mohammed", owner_type="Individual", email="sarah@example.com")
    db.add_all([owner1, owner2, owner3])
    db.flush() # To get IDs generated

    print("Creating dummy properties, title deeds, and ownership records...")
    # 3. Create Properties and Title Deeds
    props = [
        {
            "code": "PROP-001", "name": "Marina Bay Tower", "type": "Residential",
            "address": "Dubai Marina", "value": 2500000.00
        },
        {
            "code": "PROP-002", "name": "Palm Jumeirah Villa", "type": "Villa",
            "address": "Palm Jumeirah, Frond M", "value": 15000000.00
        },
        {
            "code": "PROP-003", "name": "Downtown Commercial Plaza", "type": "Commercial",
            "address": "Downtown Dubai", "value": 8500000.00
        },
        {
            "code": "PROP-004", "name": "JVC Residential Block", "type": "Residential",
            "address": "Jumeirah Village Circle", "value": 4200000.00
        },
        {
            "code": "PROP-005", "name": "Al Quoz Labour Camp", "type": "Labour Camp",
            "address": "Al Quoz Industrial 2", "value": 6000000.00
        }
    ]

    for p in props:
        prop = Property(
            property_code=p["code"],
            property_name=p["name"],
            property_type=p["type"],
            address_line_1=p["address"],
            emirate="Dubai",
            status="Active"
        )
        db.add(prop)
        db.flush()

        td = TitleDeed(
            property_id=prop.property_id,
            title_deed_number=f"TD-{p['code']}-2026",
            ownership_percentage=100.00,
            legal_owner="Mixed",
            ownership_status="Active"
        )
        db.add(td)
        db.flush()

        # Create Ownership Records & Beneficiaries
        if p["code"] == "PROP-001":
            # 50-50 split between Owner 1 and Owner 2
            or1 = OwnershipRecord(property_id=prop.property_id, owner_id=owner1.owner_id, ownership_type="Co-owner", ownership_percentage=50.0)
            or2 = OwnershipRecord(property_id=prop.property_id, owner_id=owner2.owner_id, ownership_type="Co-owner", ownership_percentage=50.0)
            db.add_all([or1, or2])
            db.flush()
            
            # Beneficiaries
            ba1 = BeneficiaryAllocation(
                ownership_record_id=or1.ownership_id, 
                beneficiary_id=owner1.owner_id, 
                allocation_percentage=100.0, 
                bank_name="Emirates NBD", 
                bank_account_number="123456789", 
                iban="AE12000000000123456789"
            )
            db.add(ba1)

        elif p["code"] == "PROP-002":
            # 100% Owner 3
            or3 = OwnershipRecord(property_id=prop.property_id, owner_id=owner3.owner_id, ownership_type="Legal", ownership_percentage=100.0)
            db.add(or3)
            db.flush()
            
            ba2 = BeneficiaryAllocation(
                ownership_record_id=or3.ownership_id, 
                beneficiary_id=owner3.owner_id, 
                allocation_percentage=100.0, 
                bank_name="Dubai Islamic Bank", 
                bank_account_number="987654321", 
                iban="AE98000000000987654321"
            )
            db.add(ba2)
        else:
            # 100% Gateway Investments
            or2 = OwnershipRecord(property_id=prop.property_id, owner_id=owner2.owner_id, ownership_type="Legal", ownership_percentage=100.0)
            db.add(or2)
            db.flush()
            
            ba3 = BeneficiaryAllocation(
                ownership_record_id=or2.ownership_id, 
                beneficiary_id=owner2.owner_id, 
                allocation_percentage=100.0, 
                bank_name="Mashreq Bank", 
                bank_account_number="555555555", 
                iban="AE55000000000555555555"
            )
            db.add(ba3)

    db.commit()
    print("Database successfully seeded with dummy data for Property Master!")
    db.close()

if __name__ == "__main__":
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    seed_data()
