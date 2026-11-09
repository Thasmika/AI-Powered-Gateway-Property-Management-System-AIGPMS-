import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database.session import engine, Base
from app.models import labourcamp, property, tenant, finance, pdc

print("Creating missing tables...")
Base.metadata.create_all(bind=engine)
print("Done.")
