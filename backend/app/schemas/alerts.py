from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class AlertLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    alert_id: str
    alert_type: str
    severity: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    title: str
    message: Optional[str] = None
    is_dismissed: bool
    dismissed_by: Optional[str] = None
    dismissed_at: Optional[datetime] = None
    created_at: datetime
