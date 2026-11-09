import os
import sys

# Add the parent directory to sys.path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.session import SessionLocal
from app.models.property import Property

def seed_properties():
    db = SessionLocal()
    try:
        # Check if properties already exist
        if db.query(Property).count() > 0:
            print("Properties already seeded.")
            return

        print("Seeding 5 dummy properties...")
        
        properties = [
            Property(
                property_code="PRP-001",
                property_name="Burj Khalifa Residence",
                property_type="Apartment",
                community="Downtown Dubai",
                emirate="Dubai",
                status="Active"
            ),
            Property(
                property_code="PRP-002",
                property_name="Palm Jumeirah Luxury Villa",
                property_type="Villa",
                community="Palm Jumeirah",
                emirate="Dubai",
                status="Active"
            ),
            Property(
                property_code="PRP-003",
                property_name="Al Quoz Staff Accommodation",
                property_type="Labour Camp",
                community="Al Quoz",
                emirate="Dubai",
                status="Active"
            ),
            Property(
                property_code="PRP-004",
                property_name="Marina Commercial Tower",
                property_type="Commercial",
                community="Dubai Marina",
                emirate="Dubai",
                status="Active"
            ),
            Property(
                property_code="PRP-005",
                property_name="JLT Office Complex",
                property_type="Commercial",
                community="Jumeirah Lake Towers",
                emirate="Dubai",
                status="Under Construction"
            )
        ]
        
        db.add_all(properties)
        db.commit()
        print("Successfully seeded 5 properties!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding properties: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_properties()
