import os
import sys
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal
from app.models.pdc import BankAccount, ChequeBook, ChequeLeaf, PDCIssued, PDCIssuedStatusHistory
from app.models.property import Property
from app.models.auth import User

def seed_dummy_pdc():
    db = SessionLocal()
    try:
        # Check if dummy data already exists
        if db.query(BankAccount).filter(BankAccount.account_number == "DUMMY-NBD-1234").first():
            print("Dummy data already exists.")
            return

        # 1. Create Bank Accounts
        print("Creating dummy Bank Accounts...")
        bank1 = BankAccount(
            account_name="Main Operating Account",
            bank_name="Emirates NBD",
            account_number="DUMMY-NBD-1234",
            iban="AE123456789012345678901",
            currency="AED",
            branch="Dubai Main",
            status="Active"
        )
        bank2 = BankAccount(
            account_name="Reserve Account",
            bank_name="ADCB",
            account_number="DUMMY-ADCB-9876",
            iban="AE987654321098765432109",
            currency="AED",
            branch="Abu Dhabi Main",
            status="Active"
        )
        db.add_all([bank1, bank2])
        db.commit()
        db.refresh(bank1)
        db.refresh(bank2)

        # 2. Create Cheque Books & Leaves
        print("Creating dummy Cheque Books...")
        book1 = ChequeBook(
            bank_account_id=bank1.account_id,
            cheque_book_number="CB-NBD-001",
            series_from="000001",
            series_to="000050",
            received_date=datetime.now().date(),
            status="Active"
        )
        book2 = ChequeBook(
            bank_account_id=bank2.account_id,
            cheque_book_number="CB-ADCB-001",
            series_from="100001",
            series_to="100050",
            received_date=datetime.now().date(),
            status="Active"
        )
        db.add_all([book1, book2])
        db.commit()
        db.refresh(book1)
        db.refresh(book2)

        # Add leaves for Book 1
        for i in range(1, 51):
            leaf = ChequeLeaf(
                cheque_book_id=book1.cheque_book_id,
                cheque_number=str(i).zfill(6),
                status="Available"
            )
            db.add(leaf)
            
        # Add leaves for Book 2
        for i in range(100001, 100051):
            leaf = ChequeLeaf(
                cheque_book_id=book2.cheque_book_id,
                cheque_number=str(i),
                status="Available"
            )
            db.add(leaf)
        db.commit()

        # Get a user and property to link (fallback to None if not exist)
        admin_user = db.query(User).first()
        user_id = admin_user.user_id if admin_user else None
        
        prop = db.query(Property).first()
        prop_id = prop.property_id if prop else None

        # 3. Create Issued PDCs
        print("Creating dummy Issued PDCs...")
        pdc1 = PDCIssued(
            pdc_issue_reference="PDC-OUT-202308-0001",
            payee_name="Al Futtaim Facilities Management",
            payee_type="Contractor",
            related_property_id=prop_id,
            cheque_number="000001",
            bank_account_id=bank1.account_id,
            cheque_date=datetime.now().date() + timedelta(days=7),
            cheque_amount=25000.00,
            purpose="Monthly Maintenance Contract",
            status="Draft",
            prepared_by=user_id
        )
        pdc2 = PDCIssued(
            pdc_issue_reference="PDC-OUT-202308-0002",
            payee_name="Dubai Electricity and Water Authority (DEWA)",
            payee_type="Supplier",
            related_property_id=prop_id,
            cheque_number="000002",
            bank_account_id=bank1.account_id,
            cheque_date=datetime.now().date() + timedelta(days=15),
            cheque_amount=15500.00,
            purpose="Monthly Utilities - Main Building",
            status="Approved",
            prepared_by=user_id,
            approved_by=user_id,
            approved_at=datetime.utcnow()
        )
        pdc3 = PDCIssued(
            pdc_issue_reference="PDC-OUT-202308-0003",
            payee_name="Emirates NBD Loan Dept",
            payee_type="Bank",
            related_property_id=prop_id,
            cheque_number="100001",
            bank_account_id=bank2.account_id,
            cheque_date=datetime.now().date() + timedelta(days=30),
            cheque_amount=150000.00,
            purpose="Quarterly Loan Installment",
            status="Issued",
            prepared_by=user_id,
            approved_by=user_id,
            approved_at=datetime.utcnow(),
            date_issued=datetime.utcnow().date()
        )
        pdc4 = PDCIssued(
            pdc_issue_reference="PDC-OUT-202308-0004",
            payee_name="CleanCo Cleaning Services",
            payee_type="Contractor",
            related_property_id=prop_id,
            cheque_number="100002",
            bank_account_id=bank2.account_id,
            cheque_date=datetime.now().date() - timedelta(days=5),
            cheque_amount=8500.00,
            purpose="Deep Cleaning Service",
            status="Cleared",
            prepared_by=user_id,
            approved_by=user_id,
            approved_at=datetime.utcnow(),
            date_issued=(datetime.utcnow() - timedelta(days=10)).date(),
            cleared_at=datetime.utcnow()
        )
        db.add_all([pdc1, pdc2, pdc3, pdc4])
        
        # Mark leaves as used
        for cnum in ["000001", "000002"]:
            leaf = db.query(ChequeLeaf).filter(ChequeLeaf.cheque_book_id == book1.cheque_book_id, ChequeLeaf.cheque_number == cnum).first()
            if leaf:
                leaf.status = "Issued"
        for cnum in ["100001", "100002"]:
            leaf = db.query(ChequeLeaf).filter(ChequeLeaf.cheque_book_id == book2.cheque_book_id, ChequeLeaf.cheque_number == cnum).first()
            if leaf:
                leaf.status = "Issued"

        db.commit()
        print("Dummy data seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding dummy data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_dummy_pdc()
