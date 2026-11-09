import os
import sys
from sqlalchemy.exc import ProgrammingError, OperationalError

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
import app.models

def delete_table_if_exists(db, model):
    try:
        db.execute(model.__table__.delete())
        db.commit()
        print(f"Deleted data from {model.__tablename__}")
    except (ProgrammingError, OperationalError) as e:
        db.rollback()
        print(f"Skipped {model.__tablename__}: does not exist or error.")
    except Exception as e:
        db.rollback()
        print(f"Error on {model.__tablename__}: {e}")

def delete_local_dummy_data():
    db = SessionLocal()
    try:
        print("Connected to LOCAL DB. Deleting all dummy data...")
        
        models_to_delete = []

        # 1. PDC Received & Receipts
        models_to_delete.extend([
            app.models.pdc.PDCReceivedStatusHistory,
            app.models.pdc.RentalReceiptPaymentLine,
            app.models.pdc.ChequeReturn,
            app.models.pdc.PDCReceived,
            app.models.pdc.RentalReceipt
        ])

        # 2. Leases & Tenants
        models_to_delete.extend([
            app.models.tenant.LeasePaymentSchedule,
            app.models.tenant.LeaseVersion,
            app.models.tenant.Lease,
            app.models.tenant.Tenant
        ])

        # 3. PDC Issued & Banks
        models_to_delete.extend([
            app.models.pdc.PDCIssuedStatusHistory,
            app.models.pdc.PDCIssued,
            app.models.pdc.ChequeLeaf,
            app.models.pdc.ChequeBook,
            app.models.pdc.BankAccount
        ])

        # 4. Ownership tables
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
                
        # 5. Property tables
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
            
        print("Successfully deleted all local dummy data.")
        print("Preserved Users, Roles, and Master Data.")
    finally:
        db.close()

if __name__ == "__main__":
    delete_local_dummy_data()
