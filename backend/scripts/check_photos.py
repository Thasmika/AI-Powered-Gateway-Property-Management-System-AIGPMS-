import sys
import os

sys.path.insert(0, '/var/www/aigpms/backend')

from app.database.session import SessionLocal
from app.models.property import Property, PropertyUnit

db = SessionLocal()
properties = db.query(Property).all()
for p in properties:
    print(f'Property: {p.property_id}, main_photo: {p.main_photo}')
    for u in p.units:
        print(f'  Unit: {u.unit_id}, photo_1: {u.photo_1}')
