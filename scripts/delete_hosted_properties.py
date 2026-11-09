import os
import sys
from sqlalchemy.exc import ProgrammingError

# Override DATABASE_URL before anything else to ensure we connect to the hosted DB
os.environ["DATABASE_URL"] = "postgresql://postgres:SuperSecretPassword123!@aigpms-staging-db.cnc80m06mi0f.eu-north-1.rds.amazonaws.com:5432/aigpms_db"

sys.path.insert(0, '/var/www/aigpms/backend')

from app.database.session import SessionLocal
import app.models

def delete_table_if_exists(db, model):
    try:
        db.execute(model.__table__.delete())
        db.commit()
        print(f"Deleted data from {model.__tablename__}")
    except ProgrammingError as e:
        db.rollback()
        print(f"Table {model.__tablename__} does not exist or error: {e}")
    except Exception as e:
        db.rollback()
        print(f"Error on {model.__tablename__}: {e}")

def delete_property_master():
    db = SessionLocal()
    try:
        print("Connected to hosted DB. Deleting property dummy data...")
        
        # We try to delete in order of dependencies (child to parent)
        
        models_to_delete = []
        
        # Ownership tables
        if hasattr(app.models, 'ownership'):
            if hasattr(app.models.ownership, 'BeneficiaryAllocation'):
                models_to_delete.append(app.models.ownership.BeneficiaryAllocation)
            if hasattr(app.models.ownership, 'OwnershipRecord'):
                models_to_delete.append(app.models.ownership.OwnershipRecord)
            if hasattr(app.models.ownership, 'BeneficialOwner'):
                models_to_delete.append(app.models.ownership.BeneficialOwner)
            if hasattr(app.models.ownership, 'LegalOwner'):
                models_to_delete.append(app.models.ownership.LegalOwner)
            if hasattr(app.models.ownership, 'Owner'):
                models_to_delete.append(app.models.ownership.Owner)
                
        # Property tables
        if hasattr(app.models, 'property'):
            if hasattr(app.models.property, 'PropertyDocument'):
                models_to_delete.append(app.models.property.PropertyDocument)
            if hasattr(app.models.property, 'PropertyAcquisitionCost'):
                models_to_delete.append(app.models.property.PropertyAcquisitionCost)
            if hasattr(app.models.property, 'PropertyValuation'):
                models_to_delete.append(app.models.property.PropertyValuation)
            if hasattr(app.models.property, 'TitleDeed'):
                models_to_delete.append(app.models.property.TitleDeed)
            if hasattr(app.models.property, 'PropertyUnit'):
                models_to_delete.append(app.models.property.PropertyUnit)
            if hasattr(app.models.property, 'Property'):
                models_to_delete.append(app.models.property.Property)

        for model in models_to_delete:
            delete_table_if_exists(db, model)
            
        print("Finished deleting property master data.")
    finally:
        db.close()

if __name__ == "__main__":
    delete_property_master()
