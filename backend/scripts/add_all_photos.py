import sys
import os

sys.path.insert(0, '/var/www/aigpms/backend')

from app.database.session import SessionLocal
from app.models.property import Property, PropertyUnit

db = SessionLocal()
try:
    properties = db.query(Property).all()
    for p in properties:
        p.main_photo = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80'
        for u in p.units:
            u.photo_1 = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'
            u.photo_2 = 'https://images.unsplash.com/photo-1502672260266-1c1cd2cb444c?w=800&q=80'
            u.photo_3 = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
            u.photo_4 = 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80'
    db.commit()
    print('Successfully added main photo and unit photos to ALL properties.')
except Exception as e:
    print(f'Error: {e}')
finally:
    db.close()
