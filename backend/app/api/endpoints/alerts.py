from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database.session import get_db
from app.api.deps import get_current_active_user
from app.models.auth import User
from app.models.finance import AlertLog
from app.schemas.alerts import AlertLogResponse

router = APIRouter()

@router.get("/active", response_model=List[AlertLogResponse])
def get_active_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    alerts = db.query(AlertLog).filter(AlertLog.is_dismissed == False).order_by(AlertLog.created_at.desc()).all()
    return alerts

@router.put("/{alert_id}/dismiss", response_model=AlertLogResponse)
def dismiss_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    alert = db.query(AlertLog).filter(AlertLog.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    if not alert.is_dismissed:
        alert.is_dismissed = True
        alert.dismissed_by = current_user.user_id
        alert.dismissed_at = datetime.utcnow()
        db.commit()
        db.refresh(alert)
        
    return alert
