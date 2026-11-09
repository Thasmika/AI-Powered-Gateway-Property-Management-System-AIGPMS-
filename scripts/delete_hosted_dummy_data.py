import os
import sys

# Override DATABASE_URL before anything else to ensure we connect to the hosted DB
os.environ["DATABASE_URL"] = "postgresql://postgres:SuperSecretPassword123!@aigpms-staging-db.cnc80m06mi0f.eu-north-1.rds.amazonaws.com:5432/aigpms_db"

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
import app.models  # Ensure models are loaded

from app.models.pdc import (
    PDCReceivedStatusHistory, PDCReceived, RentalReceiptPaymentLine, RentalReceipt,
    BankAccount, ChequeBook, ChequeLeaf, PDCIssued, PDCIssuedStatusHistory,
    ChequeReturn
)
from app.models.tenant import LeasePaymentSchedule, LeaseVersion, Lease, Tenant

def delete_dummy_data():
    db = SessionLocal()
    try:
        print("Connected to hosted DB. Deleting dummy data...")
        
        # Order matters - delete children first to respect foreign keys
        
        # 1. PDC Received & Receipts
        print("Deleting PDC Received and Receipts...")
        db.query(PDCReceivedStatusHistory).delete()
        db.query(RentalReceiptPaymentLine).delete()
        db.query(ChequeReturn).delete()
        db.query(PDCReceived).delete()
        db.query(RentalReceipt).delete()
        
        # 2. Leases & Tenants
        print("Deleting Leases and Tenants...")
        db.query(LeasePaymentSchedule).delete()
        db.query(LeaseVersion).delete()
        db.query(Lease).delete()
        db.query(Tenant).delete()
        
        # 3. PDC Issued & Banks
        print("Deleting PDC Issued and Bank Accounts...")
        db.query(PDCIssuedStatusHistory).delete()
        db.query(PDCIssued).delete()
        db.query(ChequeLeaf).delete()
        db.query(ChequeBook).delete()
        db.query(BankAccount).delete()
        
        db.commit()
        print("\nSuccessfully deleted operational dummy data (Tenants, Leases, PDCs, Bank Accounts).")
        print("Preserved Properties, Users, Roles, and Master Data.")
    except Exception as e:
        db.rollback()
        print(f"\nError: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_dummy_data()
