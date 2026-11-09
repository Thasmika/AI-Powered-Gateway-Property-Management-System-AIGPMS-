import requests

# Assuming local dev server is running, or we can use the backend DB directly.
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal
from app.models.pdc import PDCIssued, BankAccount
from app.models.property import Property

db = SessionLocal()

bank = db.query(BankAccount).first()
prop = db.query(Property).first()

if not bank or not prop:
    print("Missing bank or property")
    sys.exit(1)

pdc = PDCIssued(
    pdc_issue_reference="TEST-PDC-001",
    payee_name="Test Supplier",
    payee_type="Supplier",
    related_property_id=prop.property_id,
    cheque_number="123456",
    bank_account_id=bank.account_id,
    cheque_date="2026-08-10",
    cheque_amount=5000.00,
    purpose="Test PDC Creation"
)
db.add(pdc)
try:
    db.commit()
    print("Successfully created test PDC in database!")
except Exception as e:
    db.rollback()
    print(f"Error creating PDC: {e}")
