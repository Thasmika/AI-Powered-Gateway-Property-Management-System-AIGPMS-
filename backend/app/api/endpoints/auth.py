from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.auth import User, Role
from app.schemas.auth import UserLogin, Token, UserOut
from app.core import security
from app.services.audit import create_audit_log
from app.api import deps

router = APIRouter()

@router.post("/login", response_model=Token)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db)
):
    # Find user by email
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not security.verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    if user.status != "Active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive"
        )
    
    # Generate token
    access_token = security.create_access_token(
        subject=user.email,
        role_name=user.role.role_name,
        user_id=user.user_id
    )
    
    # Log audit trail
    create_audit_log(
        db=db,
        user_id=user.user_id,
        action="User Login",
        module="Auth",
        old_value=None,
        new_value=f"User logged in from client"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role_name": user.role.role_name,
        "full_name": user.full_name
    }

@router.get("/me", response_model=UserOut)
def read_current_user(
    current_user: User = Depends(deps.get_current_active_user)
):
    return current_user
