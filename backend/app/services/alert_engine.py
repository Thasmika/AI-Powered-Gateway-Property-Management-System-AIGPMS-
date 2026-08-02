import logging
import json
from datetime import datetime
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.pdc import PDCReceived, PDCIssued
from app.models.finance import AlertLog, SystemSetting

logger = logging.getLogger(__name__)

def get_alert_thresholds(db: Session) -> list:
    """Read PDC alert thresholds from system_settings, fallback to defaults."""
    setting = db.query(SystemSetting).filter(SystemSetting.setting_key == "pdc_alert_thresholds_days").first()
    if setting and setting.setting_value:
        try:
            return json.loads(setting.setting_value)
        except:
            pass
    return [30, 14, 7, 3, 0]

def create_alert(db: Session, alert_type: str, severity: str, title: str, 
                 entity_type: str, entity_id: str, message: str = ""):
    """Helper to create and persist an AlertLog."""
    # Check if a similar alert for this entity already exists and is not dismissed
    existing = db.query(AlertLog).filter(
        AlertLog.entity_id == entity_id,
        AlertLog.alert_type == alert_type,
        AlertLog.is_dismissed == False
    ).first()
    
    if existing:
        return # Skip duplicate active alert
        
    alert = AlertLog(
        alert_type=alert_type,
        severity=severity,
        entity_type=entity_type,
        entity_id=entity_id,
        title=title,
        message=message
    )
    db.add(alert)
    db.flush()

def run_alert_engine():
    """Main alert engine task for PDC Received and PDC Issued."""
    logger.info("Starting AI Smart Alert Engine...")
    db: Session = SessionLocal()
    try:
        thresholds = get_alert_thresholds(db)
        today = datetime.utcnow().date()
        
        # 1. PDC Received Alerts
        active_received = db.query(PDCReceived).filter(
            PDCReceived.status.in_(["Received", "Due Soon", "Held", "Submitted to Bank"])
        ).all()
        
        for pdc in active_received:
            days_until = (pdc.cheque_date - today).days
            
            if days_until in thresholds and days_until > 0:
                create_alert(
                    db, 
                    alert_type=f"PDC_RECEIVED_DUE_{days_until}", 
                    severity="Info" if days_until > 7 else "Warning",
                    title=f"Incoming PDC Due in {days_until} Days",
                    entity_type="pdc_received",
                    entity_id=pdc.pdc_received_id,
                    message=f"Cheque {pdc.cheque_number} for AED {pdc.cheque_amount} is due."
                )
                if days_until <= 7 and pdc.status != "Due Soon" and pdc.status != "Submitted to Bank":
                    pdc.status = "Due Soon"
                    
            elif days_until == 0:
                create_alert(
                    db, 
                    alert_type="PDC_RECEIVED_DUE_TODAY", 
                    severity="Warning",
                    title="Incoming PDC Due TODAY",
                    entity_type="pdc_received",
                    entity_id=pdc.pdc_received_id,
                    message=f"Cheque {pdc.cheque_number} for AED {pdc.cheque_amount} is due today."
                )
                
            elif days_until < 0:
                create_alert(
                    db, 
                    alert_type="PDC_RECEIVED_OVERDUE", 
                    severity="Critical",
                    title="Incoming PDC Overdue",
                    entity_type="pdc_received",
                    entity_id=pdc.pdc_received_id,
                    message=f"Cheque {pdc.cheque_number} is overdue by {abs(days_until)} days and not cleared."
                )

        # 2. PDC Issued Alerts
        active_issued = db.query(PDCIssued).filter(
            PDCIssued.status.in_(["Approved", "Issued", "Held by Payee", "Due Soon", "Presented"])
        ).all()
        
        for pdc in active_issued:
            days_until = (pdc.cheque_date - today).days
            
            if days_until in thresholds and days_until > 0:
                create_alert(
                    db, 
                    alert_type=f"PDC_ISSUED_DUE_{days_until}", 
                    severity="Info" if days_until > 7 else "Warning",
                    title=f"Issued PDC Due in {days_until} Days",
                    entity_type="pdc_issued",
                    entity_id=pdc.pdc_issued_id,
                    message=f"Cheque {pdc.cheque_number} for AED {pdc.cheque_amount} is due."
                )
                if days_until <= 7 and pdc.status in ["Approved", "Issued", "Held by Payee"]:
                    pdc.status = "Due Soon"
                    
            elif days_until == 0:
                create_alert(
                    db, 
                    alert_type="PDC_ISSUED_DUE_TODAY", 
                    severity="Warning",
                    title="Issued PDC Due TODAY",
                    entity_type="pdc_issued",
                    entity_id=pdc.pdc_issued_id,
                    message=f"Cheque {pdc.cheque_number} for AED {pdc.cheque_amount} is due today."
                )
                
            elif days_until < 0:
                create_alert(
                    db, 
                    alert_type="PDC_ISSUED_OVERDUE", 
                    severity="Critical",
                    title="Issued PDC Overdue/Uncleared",
                    entity_type="pdc_issued",
                    entity_id=pdc.pdc_issued_id,
                    message=f"Cheque {pdc.cheque_number} is overdue by {abs(days_until)} days."
                )
                
        db.commit()
        logger.info("Alert Engine run completed successfully.")
    except Exception as e:
        logger.error(f"Error in Alert Engine: {str(e)}")
        db.rollback()
    finally:
        db.close()
