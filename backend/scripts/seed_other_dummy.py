import sys
import os
from datetime import date, timedelta
from decimal import Decimal
import uuid

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.pdc import BankAccount, ChequeBook, ChequeLeaf, PDCIssued, AuthorizedSignatory
from app.models.property import Property

def gen_id():
    return str(uuid.uuid4())

def log(msg):
    print(f"  [Seed Other] {msg}")

def seed_other_dummy(db: Session):
    log("Seeding other dummy data (Bank Accounts, Cheque Books, PDC Issued)...")

    properties = db.query(Property).all()
    prop_id = properties[0].property_id if properties else None

    # ── 1. Bank Accounts ─────────────────────────────────────────────────────
    log("Seeding Bank Accounts...")
    banks = [
        {"name": "Corporate Main Account", "bank": "Emirates NBD", "acc": "ENBD-100010001", "curr": "AED"},
        {"name": "Expense Account", "bank": "ADCB", "acc": "ADCB-200020002", "curr": "AED"},
        {"name": "Property Maintenance", "bank": "First Abu Dhabi Bank", "acc": "FAB-300030003", "curr": "AED"},
        {"name": "Dividend Account", "bank": "Dubai Islamic Bank", "acc": "DIB-400040004", "curr": "AED"},
        {"name": "Escrow Account", "bank": "Mashreq Bank", "acc": "MASH-500050005", "curr": "AED"}
    ]
    
    bank_records = []
    for b in banks:
        ba = BankAccount(
            account_id=gen_id(), account_name=b["name"], bank_name=b["bank"],
            account_number=b["acc"], iban=f"AE00{b['acc']}", currency=b["curr"],
            branch="Main Branch", status="Active"
        )
        db.add(ba)
        bank_records.append(ba)
    db.commit()

    # ── 2. Cheque Books ──────────────────────────────────────────────────────
    log("Seeding Cheque Books...")
    chequebooks = []
    
    cb_data = [
        {"ba": bank_records[0], "num": "CB-ENBD-01", "start": 1000, "end": 1050},
        {"ba": bank_records[1], "num": "CB-ADCB-01", "start": 2000, "end": 2025},
        {"ba": bank_records[2], "num": "CB-FAB-01", "start": 3000, "end": 3050},
        {"ba": bank_records[3], "num": "CB-DIB-01", "start": 4000, "end": 4025},
        {"ba": bank_records[4], "num": "CB-MASH-01", "start": 5000, "end": 5050},
    ]

    for cb in cb_data:
        c = ChequeBook(
            cheque_book_id=gen_id(), bank_account_id=cb["ba"].account_id,
            cheque_book_number=cb["num"], series_from=str(cb["start"]), series_to=str(cb["end"]),
            received_date=date.today() - timedelta(days=30), status="Active"
        )
        db.add(c)
        db.flush()
        
        # Add a few leaves
        for i in range(cb["start"], cb["start"] + 10):
            leaf = ChequeLeaf(
                leaf_id=gen_id(), cheque_book_id=c.cheque_book_id,
                cheque_number=str(i), status="Available"
            )
            db.add(leaf)
        
        chequebooks.append(c)
    db.commit()

    # ── 3. PDC Issued ────────────────────────────────────────────────────────
    log("Seeding PDC Issued...")
    pdc_issued_data = [
        {"payee": "Maintenance Co LLC", "type": "Contractor", "amount": "15000.00", "purpose": "AC Repair", "date": date.today() + timedelta(days=15), "ba": bank_records[0]},
        {"payee": "Security Services LLC", "type": "Supplier", "amount": "8000.00", "purpose": "Monthly Security", "date": date.today() + timedelta(days=10), "ba": bank_records[1]},
        {"payee": "Cleaning Co", "type": "Contractor", "amount": "4500.00", "purpose": "Deep Cleaning", "date": date.today() + timedelta(days=5), "ba": bank_records[2]},
        {"payee": "Insurance Co", "type": "Supplier", "amount": "12000.00", "purpose": "Property Insurance", "date": date.today() + timedelta(days=30), "ba": bank_records[0]},
        {"payee": "Elevator Maintenance", "type": "Contractor", "amount": "6500.00", "purpose": "Annual AMC", "date": date.today() + timedelta(days=45), "ba": bank_records[1]}
    ]

    for i, p in enumerate(pdc_issued_data):
        pi = PDCIssued(
            pdc_issued_id=gen_id(), pdc_issue_reference=f"PDC-ISS-{2024}-{i+1:04d}",
            payee_name=p["payee"], payee_type=p["type"], related_property_id=prop_id,
            cheque_number=f"CHQ-ISS-{i+100}", bank_account_id=p["ba"].account_id,
            cheque_date=p["date"], cheque_amount=Decimal(p["amount"]),
            purpose=p["purpose"], date_issued=date.today(), status="Issued"
        )
        db.add(pi)
    
    db.commit()

    log("Successfully seeded Bank Accounts, Cheque Books, and PDC Issued!")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        # Check if they already exist
        if db.query(BankAccount).count() > 0:
            log("Bank accounts already exist, skipping to avoid duplicates.")
        else:
            seed_other_dummy(db)
    except Exception as e:
        log(f"Error seeding other dummy data: {e}")
        db.rollback()
    finally:
        db.close()
