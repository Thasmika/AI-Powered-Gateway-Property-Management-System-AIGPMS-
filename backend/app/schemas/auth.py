from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role_name: str
    full_name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
    role_name: Optional[str] = None

class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    role_id: str
    role_name: str
    description: Optional[str] = None

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: str
    email: EmailStr
    full_name: str
    status: str
    created_date: datetime
    role: RoleOut

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    audit_id: str
    user_id: str
    action: str
    module: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    timestamp: datetime
