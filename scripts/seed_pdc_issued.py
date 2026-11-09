import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, datetime, timedelta
from decimal import Decimal
import uuid

from sqlalchemy.orm import Session
from app.database.session import engine, Base, SessionLocal
from app.models.pdc import BankAccount, ChequeBook, ChequeLeaf, PDCIssued, PDCIssuedStatusHistory
from app.models.auth import User

def gen_id():
    return str(uuid.uuid4())

def seed_pdc_issued_data(db: Session):
    print("Seeding Bank Accounts, Cheque Books, Leaves, and PDC Issued...")

    admin_user = db.query(User).filter(User.email == "admin@aigpms.com").first()
    admin_id = admin_user.user_id if admin_user else None

    # Bank Account 1
    ba1 = BankAccount(
        account_id=gen_id(),
        account_name="Main Operating Account",
        bank_name="Emirates NBD",
        account_number="ENBD-0001234567",
        iban="AE120260000000000000123",
        currency="AED",
        branch="Jumeirah Branch",
        status="Active"
    )

    # Bank Account 2
    ba2 = BankAccount(
        account_id=gen_id(),
        account_name="Reserve Account",
        bank_name="ADCB",
        account_number="ADCB-0009876543",
        iban="AE340260000000000000987",
        currency="AED",
        branch="Main Branch",
        status="Active"
    )

    db.add_all([ba1, ba2])
    db.commit()
    db.refresh(ba1)
    db.refresh(ba2)

    # Cheque Book for BA1
    cb1 = ChequeBook(
        cheque_book_id=gen_id(),
        bank_account_id=ba1.account_id,
        cheque_book_number="CB-ENBD-2024-1",
        series_from="100001",
        series_to="100050",
        received_date=date(2024, 1, 15),
        status="Active"
    )
    db.add(cb1)
    db.commit()
    db.refresh(cb1)

    # Generate Leaves for CB1
    leaves = []
    for i in range(1, 51):
        leaves.append(ChequeLeaf(
            leaf_id=gen_id(),
            cheque_book_id=cb1.cheque_book_id,
            cheque_number=f"{100000 + i}",
            status="Available"
        ))
    db.add_all(leaves)
    db.commit()

    # Issue some PDCs
    pdc1 = PDCIssued(
        pdc_issued_id=gen_id(),
        pdc_issue_reference="PDC-ISS-2024-001",
        payee_name="Maintenance Co LLC",
        payee_type="Supplier",
        cheque_number="100001",
        bank_account_id=ba1.account_id,
        cheque_date=date.today() + timedelta(days=10),
        cheque_amount=Decimal("5000.00"),
        purpose="Monthly Maintenance Retainer",
        status="Issued",
        prepared_by=admin_id,
        approved_by=admin_id,
        date_issued=date.today(),
        handover_date=date.today()
    )

    pdc2 = PDCIssued(
        pdc_issued_id=gen_id(),
        pdc_issue_reference="PDC-ISS-2024-002",
        payee_name="Cleaning Services L.L.C",
        payee_type="Contractor",
        cheque_number="100002",
        bank_account_id=ba1.account_id,
        cheque_date=date.today() - timedelta(days=5), # overdue
        cheque_amount=Decimal("2500.00"),
        purpose="Deep Cleaning Service",
        status="Cleared",
        prepared_by=admin_id,
        approved_by=admin_id,
        date_issued=date.today() - timedelta(days=15),
        handover_date=date.today() - timedelta(days=15),
        cleared_at=datetime.utcnow() - timedelta(days=2)
    )

    pdc3 = PDCIssued(
        pdc_issued_id=gen_id(),
        pdc_issue_reference="PDC-ISS-2024-003",
        payee_name="Dubai Electricity and Water Authority (DEWA)",
        payee_type="Utility",
        cheque_number="100003",
        bank_account_id=ba1.account_id,
        cheque_date=date.today() + timedelta(days=45),
        cheque_amount=Decimal("12000.00"),
        purpose="Utility Deposit",
        status="Approved",
        prepared_by=admin_id,
        approved_by=admin_id
    )

    db.add_all([pdc1, pdc2, pdc3])
    db.commit()

    # Update leaves to reflect issued PDCs
    leaf1 = db.query(ChequeLeaf).filter_by(cheque_book_id=cb1.cheque_book_id, cheque_number="100001").first()
    leaf2 = db.query(ChequeLeaf).filter_by(cheque_book_id=cb1.cheque_book_id, cheque_number="100002").first()
    leaf3 = db.query(ChequeLeaf).filter_by(cheque_book_id=cb1.cheque_book_id, cheque_number="100003").first()
    if leaf1:
        leaf1.status = "Issued"
        leaf1.issued_to = pdc1.pdc_issued_id
    if leaf2:
        leaf2.status = "Issued"
        leaf2.issued_to = pdc2.pdc_issued_id
    if leaf3:
        leaf3.status = "Issued"
        leaf3.issued_to = pdc3.pdc_issued_id
    db.commit()
    print("Seeding Complete!")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_pdc_issued_data(db)
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()
