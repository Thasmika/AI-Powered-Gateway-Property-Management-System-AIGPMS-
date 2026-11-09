import os
import sys
import logging
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal
from app.models.pdc import PDCReceived

logging.basicConfig(level=logging.INFO)

def check_dates():
    db = SessionLocal()
    try:
        today = datetime.utcnow().date()
        active_received = db.query(PDCReceived).all()
        for pdc in active_received:
            days_until = (pdc.cheque_date - today).days
            print(f"PDC {pdc.cheque_number}, status: {pdc.status}, date: {pdc.cheque_date}, days_until: {days_until}")
    finally:
        db.close()

if __name__ == "__main__":
    check_dates()
