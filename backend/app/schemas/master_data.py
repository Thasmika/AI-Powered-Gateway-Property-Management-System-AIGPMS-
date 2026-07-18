"""
Master Data Schemas — Module 15
Pydantic request / response schemas for all 10 master lookup tables.
"""

from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# 1. Master Bank
# ─────────────────────────────────────────────────────────────────────────────

class MasterBankCreate(BaseModel):
    bank_name: str = Field(..., max_length=150)
    bank_code: Optional[str] = Field(None, max_length=20)
    country: str = Field("UAE", max_length=50)
    is_active: bool = True

class MasterBankUpdate(BaseModel):
    bank_name: Optional[str] = Field(None, max_length=150)
    bank_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

class MasterBankOut(BaseModel):
    bank_id: str
    bank_name: str
    bank_code: Optional[str]
    country: str
    is_active: bool
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# 2. Master Community
# ─────────────────────────────────────────────────────────────────────────────

class MasterCommunityCreate(BaseModel):
    community_name: str = Field(..., max_length=150)
    emirate: str = Field(..., max_length=50)
    zone: Optional[str] = Field(None, max_length=100)
    is_active: bool = True

class MasterCommunityUpdate(BaseModel):
    community_name: Optional[str] = Field(None, max_length=150)
    emirate: Optional[str] = Field(None, max_length=50)
    zone: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

class MasterCommunityOut(BaseModel):
    community_id: str
    community_name: str
    emirate: str
    zone: Optional[str]
    is_active: bool
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# 3. Master Emirate
# ─────────────────────────────────────────────────────────────────────────────

class MasterEmirateCreate(BaseModel):
    emirate_name: str = Field(..., max_length=100)
    emirate_code: Optional[str] = Field(None, max_length=10)
    is_active: bool = True

class MasterEmirateUpdate(BaseModel):
    emirate_name: Optional[str] = Field(None, max_length=100)
    emirate_code: Optional[str] = Field(None, max_length=10)
    is_active: Optional[bool] = None

class MasterEmirateOut(BaseModel):
    emirate_id: str
    emirate_name: str
    emirate_code: Optional[str]
    is_active: bool
    created_date: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# 4. Master Property Type
# ─────────────────────────────────────────────────────────────────────────────

class MasterPropertyTypeCreate(BaseModel):
    type_name: str = Field(..., max_length=100)
    type_class: Optional[str] = Field(None, max_length=50)
    is_active: bool = True

class MasterPropertyTypeUpdate(BaseModel):
    type_name: Optional[str] = Field(None, max_length=100)
    type_class: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

class MasterPropertyTypeOut(BaseModel):
    property_type_id: str
    type_name: str
    type_class: Optional[str]
    is_active: bool
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# 5. Master Expense Category
# ─────────────────────────────────────────────────────────────────────────────

class MasterExpenseCategoryCreate(BaseModel):
    category_name: str = Field(..., max_length=150)
    expense_class: str = Field(..., pattern="^(General|Property)$")
    parent_category_id: Optional[str] = None
    gl_code: Optional[str] = Field(None, max_length=30)
    is_active: bool = True

class MasterExpenseCategoryUpdate(BaseModel):
    category_name: Optional[str] = Field(None, max_length=150)
    expense_class: Optional[str] = Field(None, pattern="^(General|Property)$")
    parent_category_id: Optional[str] = None
    gl_code: Optional[str] = Field(None, max_length=30)
    is_active: Optional[bool] = None

class MasterExpenseCategoryOut(BaseModel):
    category_id: str
    category_name: str
    expense_class: str
    parent_category_id: Optional[str]
    gl_code: Optional[str]
    is_active: bool
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# 6. Master Maintenance Category
# ─────────────────────────────────────────────────────────────────────────────

class MasterMaintenanceCategoryCreate(BaseModel):
    category_name: str = Field(..., max_length=150)
    default_sla_hours: Optional[int] = None
    is_active: bool = True

class MasterMaintenanceCategoryUpdate(BaseModel):
    category_name: Optional[str] = Field(None, max_length=150)
    default_sla_hours: Optional[int] = None
    is_active: Optional[bool] = None

class MasterMaintenanceCategoryOut(BaseModel):
    maint_category_id: str
    category_name: str
    default_sla_hours: Optional[int]
    is_active: bool
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# 7. Master Payment Method
# ─────────────────────────────────────────────────────────────────────────────

class MasterPaymentMethodCreate(BaseModel):
    method_name: str = Field(..., max_length=100)
    requires_cheque_details: bool = False
    requires_bank_details: bool = False
    is_active: bool = True

class MasterPaymentMethodUpdate(BaseModel):
    method_name: Optional[str] = Field(None, max_length=100)
    requires_cheque_details: Optional[bool] = None
    requires_bank_details: Optional[bool] = None
    is_active: Optional[bool] = None

class MasterPaymentMethodOut(BaseModel):
    method_id: str
    method_name: str
    requires_cheque_details: bool
    requires_bank_details: bool
    is_active: bool
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# 8. Notification Template
# ─────────────────────────────────────────────────────────────────────────────

class NotificationTemplateCreate(BaseModel):
    template_code: str = Field(..., max_length=50)
    template_name: str = Field(..., max_length=150)
    module: str = Field(..., max_length=50)
    subject: Optional[str] = Field(None, max_length=255)
    body_template: str
    channel: str = Field("Dashboard", max_length=20)
    is_active: bool = True

class NotificationTemplateUpdate(BaseModel):
    template_name: Optional[str] = Field(None, max_length=150)
    subject: Optional[str] = Field(None, max_length=255)
    body_template: Optional[str] = None
    channel: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None

class NotificationTemplateOut(BaseModel):
    template_id: str
    template_code: str
    template_name: str
    module: str
    subject: Optional[str]
    body_template: str
    channel: str
    is_active: bool
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# 9. AI Prompt Template
# ─────────────────────────────────────────────────────────────────────────────

class AIPromptTemplateCreate(BaseModel):
    prompt_label: str = Field(..., max_length=200)
    prompt_text: str
    module: Optional[str] = Field(None, max_length=50)
    is_featured: bool = False
    sort_order: int = 99
    is_active: bool = True

class AIPromptTemplateUpdate(BaseModel):
    prompt_label: Optional[str] = Field(None, max_length=200)
    prompt_text: Optional[str] = None
    module: Optional[str] = Field(None, max_length=50)
    is_featured: Optional[bool] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class AIPromptTemplateOut(BaseModel):
    prompt_id: str
    prompt_label: str
    prompt_text: str
    module: Optional[str]
    is_featured: bool
    sort_order: int
    is_active: bool
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# 10. Approval Limits
# ─────────────────────────────────────────────────────────────────────────────

class ApprovalLimitCreate(BaseModel):
    module: str = Field(..., max_length=50)
    role_name: str = Field(..., max_length=50)
    auto_approve_threshold: Optional[Decimal] = None
    currency: str = Field("AED", max_length=3)
    requires_md_above: Optional[Decimal] = None
    notes: Optional[str] = None
    is_active: bool = True

class ApprovalLimitUpdate(BaseModel):
    auto_approve_threshold: Optional[Decimal] = None
    requires_md_above: Optional[Decimal] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ApprovalLimitOut(BaseModel):
    limit_id: str
    module: str
    role_name: str
    auto_approve_threshold: Optional[Decimal]
    currency: str
    requires_md_above: Optional[Decimal]
    notes: Optional[str]
    is_active: bool
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True
