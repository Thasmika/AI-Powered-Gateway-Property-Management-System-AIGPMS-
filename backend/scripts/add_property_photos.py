import sys
import os

sys.path.insert(0, '/var/www/aigpms/backend')

from app.database.session import SessionLocal
from app.models.property import Property, PropertyUnit

db = SessionLocal()
try:
    properties = db.query(Property).order_by(Property.created_at).limit(2).all()
    properties[0].main_photo = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80'
    if len(properties) > 1:
        properties[1].main_photo = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80'
    db.commit()
    print('Successfully added main photo to the first 2 properties.')
except Exception as e:
    print(f'Error: {e}')
finally:
    db.close()
