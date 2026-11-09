import os
import sys
import logging
from datetime import datetime

# Set up path to allow importing from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal
from app.models.pdc import PDCReceived, PDCIssued

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_pdc_status():
    db = SessionLocal()
    try:
        today = datetime.utcnow().date()
        
        # 1. Fix PDC Received
        active_received = db.query(PDCReceived).filter(
            PDCReceived.status.in_(["Received", "Held"])
        ).all()
        
        count = 0
        for pdc in active_received:
            days_until = (pdc.cheque_date - today).days
            if days_until <= 14:
                logger.info(f"Updating PDCReceived {pdc.cheque_number} (due in {days_until} days) to 'Due Soon'")
                pdc.status = "Due Soon"
                count += 1
                
        # 2. Fix PDC Issued
        active_issued = db.query(PDCIssued).filter(
            PDCIssued.status.in_(["Approved", "Issued", "Held by Payee"])
        ).all()
        
        for pdc in active_issued:
            days_until = (pdc.cheque_date - today).days
            if days_until <= 14:
                logger.info(f"Updating PDCIssued {pdc.cheque_number} (due in {days_until} days) to 'Due Soon'")
                pdc.status = "Due Soon"
                count += 1
                
        db.commit()
        logger.info(f"Successfully migrated {count} PDCs to 'Due Soon'.")
    except Exception as e:
        logger.error(f"Failed to migrate: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_pdc_status()
