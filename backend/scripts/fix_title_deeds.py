import sys
import os

# Add the parent directory to sys.path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from app.models.property import PropertyUnit, TitleDeed

def fix_title_deeds():
    db = SessionLocal()
    try:
        title_deeds = db.query(TitleDeed).filter(TitleDeed.unit_id != None).all()
        count = 0
        for td in title_deeds:
            if td.unit_number is None or td.property_id is None:
                unit = db.query(PropertyUnit).filter(PropertyUnit.unit_id == td.unit_id).first()
                if unit:
                    td.unit_number = unit.unit_number
                    td.property_id = unit.property_id
                    td.property_type = unit.unit_type
                    td.unit_size = unit.area_sqm
                    count += 1
        db.commit()
        print(f"Fixed {count} title deeds.")
    finally:
        db.close()

if __name__ == "__main__":
    fix_title_deeds()
