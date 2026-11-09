import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal
from app.models.property import Property, PropertyUnit, TitleDeed
from app.models.ownership import LegalOwner
from app.api.endpoints.properties import create_property_unit
from app.schemas.property import PropertyUnitCreate
from fastapi import HTTPException
import uuid

def test_inheritance():
    db = SessionLocal()
    
    # 1. Create a Legal Owner
    owner = LegalOwner(full_name="Test Owner", owner_type="Individual")
    db.add(owner)
    db.commit()
    db.refresh(owner)
    
    # 2. Create a Property
    prop_code = f"PROP-{str(uuid.uuid4())[:8]}"
    prop = Property(property_code=prop_code, property_name="Test Building")
    db.add(prop)
    db.commit()
    db.refresh(prop)
    
    # 3. Create a Title Deed for the Property
    td = TitleDeed(
        property_id=prop.property_id,
        legal_owner_id=owner.legal_owner_id,
        title_deed_number="TD-PROP-001"
    )
    db.add(td)
    db.commit()
    
    print(f"Created Property: {prop.property_id} with Title Deed and Legal Owner: {owner.legal_owner_id}")
    
    # 4. Call create_property_unit via endpoint logic wrapper
    # We will just mimic what create_property_unit does or call it directly.
    # We can't call it directly because of current_user dependency, so we'll just extract the logic:
    payload = PropertyUnitCreate(
        unit_number="UNIT-001",
        status="Vacant"
    )
    
    # Execute the cascading logic we just added to the endpoint:
    # (Mocking the endpoint)
    class MockUser:
        user_id = "test-user-id"
        
    try:
        new_unit = create_property_unit(
            property_id=prop.property_id,
            payload=payload,
            db=db,
            current_user=MockUser()
        )
        print(f"Created Unit: {new_unit.unit_id}")
        
        # Verify the auto-inherited legal_owner_id
        from app.models.ownership import OwnershipRecord
        ownership = db.query(OwnershipRecord).filter(OwnershipRecord.unit_id == new_unit.unit_id).first()
        if ownership:
            print(f"Success! Unit inherited Legal Owner ID: {ownership.legal_owner_id}")
            if ownership.legal_owner_id == owner.legal_owner_id:
                print("Matches Property Title Deed owner!")
            else:
                print("Mismatch!")
        else:
            print("Failed: No OwnershipRecord was created for the unit.")
            
    except Exception as e:
        print(f"Error creating unit: {e}")

if __name__ == "__main__":
    test_inheritance()
