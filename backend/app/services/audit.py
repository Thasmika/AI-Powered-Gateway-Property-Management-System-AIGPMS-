from sqlalchemy.orm import Session
from app.models.auth import AuditLog

def create_audit_log(
    db: Session,
    user_id: str,
    action: str,
    module: str,
    old_value: str = None,
    new_value: str = None
) -> AuditLog:
    db_log = AuditLog(
        user_id=user_id,
        action=action,
        module=module,
        old_value=old_value,
        new_value=new_value
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
