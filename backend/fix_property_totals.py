import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal
from app.models.property import Property
from app.api.endpoints.properties import recalculate_property_totals

def fix_property_totals():
    db = SessionLocal()
    try:
        properties = db.query(Property).all()
        for prop in properties:
            recalculate_property_totals(db, prop.property_id)
            print(f"Recalculated totals for property {prop.property_code}")
        print("Done recalculating all properties.")
    finally:
        db.close()

if __name__ == "__main__":
    fix_property_totals()
