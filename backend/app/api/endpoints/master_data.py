"""
Master Data API Endpoints — Module 15
Full CRUD for all 10 master lookup tables.
GET (list with active filter) + POST + PUT + DELETE (soft-delete via is_active).
All endpoints require at least Accountant role; configuration endpoints require Administrator.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db, get_current_active_user, require_roles
from app.models.master_data import (
    MasterBank, MasterCommunity, MasterEmirate, MasterPropertyType,
    MasterExpenseCategory, MasterMaintenanceCategory, MasterPaymentMethod,
    NotificationTemplate, AIPromptTemplate, ApprovalLimit,
)
from app.schemas.master_data import (
    MasterBankCreate, MasterBankUpdate, MasterBankOut,
    MasterCommunityCreate, MasterCommunityUpdate, MasterCommunityOut,
    MasterEmirateCreate, MasterEmirateUpdate, MasterEmirateOut,
    MasterPropertyTypeCreate, MasterPropertyTypeUpdate, MasterPropertyTypeOut,
    MasterExpenseCategoryCreate, MasterExpenseCategoryUpdate, MasterExpenseCategoryOut,
    MasterMaintenanceCategoryCreate, MasterMaintenanceCategoryUpdate, MasterMaintenanceCategoryOut,
    MasterPaymentMethodCreate, MasterPaymentMethodUpdate, MasterPaymentMethodOut,
    NotificationTemplateCreate, NotificationTemplateUpdate, NotificationTemplateOut,
    AIPromptTemplateCreate, AIPromptTemplateUpdate, AIPromptTemplateOut,
    ApprovalLimitCreate, ApprovalLimitUpdate, ApprovalLimitOut,
)

router = APIRouter()

# ════════════════════════════════════════════════════════════════════════════
# HELPER: Generic active-only filter
# ════════════════════════════════════════════════════════════════════════════

def _active_filter(model, db, active_only: bool):
    q = db.query(model)
    if active_only:
        q = q.filter(model.is_active == True)
    return q


# ════════════════════════════════════════════════════════════════════════════
# 1. BANKS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/banks", response_model=List[MasterBankOut], tags=["Master Data — Banks"])
def list_banks(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_active_user),
):
    return _active_filter(MasterBank, db, active_only).order_by(MasterBank.bank_name).all()


@router.post("/banks", response_model=MasterBankOut, status_code=status.HTTP_201_CREATED,
             tags=["Master Data — Banks"])
def create_bank(
    payload: MasterBankCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    if db.query(MasterBank).filter(MasterBank.bank_name == payload.bank_name).first():
        raise HTTPException(status_code=400, detail="Bank with this name already exists.")
    obj = MasterBank(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/banks/{bank_id}", response_model=MasterBankOut, tags=["Master Data — Banks"])
def get_bank(bank_id: str, db: Session = Depends(get_db), _: dict = Depends(get_current_active_user)):
    obj = db.query(MasterBank).filter(MasterBank.bank_id == bank_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Bank not found.")
    return obj


@router.put("/banks/{bank_id}", response_model=MasterBankOut, tags=["Master Data — Banks"])
def update_bank(
    bank_id: str,
    payload: MasterBankUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(MasterBank).filter(MasterBank.bank_id == bank_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Bank not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/banks/{bank_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Master Data — Banks"])
def deactivate_bank(
    bank_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(MasterBank).filter(MasterBank.bank_id == bank_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Bank not found.")
    obj.is_active = False
    db.commit()


# ════════════════════════════════════════════════════════════════════════════
# 2. COMMUNITIES
# ════════════════════════════════════════════════════════════════════════════

@router.get("/communities", response_model=List[MasterCommunityOut], tags=["Master Data — Communities"])
def list_communities(
    active_only: bool = Query(True),
    emirate: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_active_user),
):
    q = _active_filter(MasterCommunity, db, active_only)
    if emirate:
        q = q.filter(MasterCommunity.emirate == emirate)
    return q.order_by(MasterCommunity.community_name).all()


@router.post("/communities", response_model=MasterCommunityOut, status_code=status.HTTP_201_CREATED,
             tags=["Master Data — Communities"])
def create_community(
    payload: MasterCommunityCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = MasterCommunity(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/communities/{community_id}", response_model=MasterCommunityOut,
            tags=["Master Data — Communities"])
def update_community(
    community_id: str,
    payload: MasterCommunityUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(MasterCommunity).filter(MasterCommunity.community_id == community_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Community not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/communities/{community_id}", status_code=status.HTTP_204_NO_CONTENT,
               tags=["Master Data — Communities"])
def deactivate_community(
    community_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(MasterCommunity).filter(MasterCommunity.community_id == community_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Community not found.")
    obj.is_active = False
    db.commit()


# ════════════════════════════════════════════════════════════════════════════
# 3. EMIRATES
# ════════════════════════════════════════════════════════════════════════════

@router.get("/emirates", response_model=List[MasterEmirateOut], tags=["Master Data — Emirates"])
def list_emirates(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_active_user),
):
    return _active_filter(MasterEmirate, db, active_only).order_by(MasterEmirate.emirate_name).all()


@router.post("/emirates", response_model=MasterEmirateOut, status_code=status.HTTP_201_CREATED,
             tags=["Master Data — Emirates"])
def create_emirate(
    payload: MasterEmirateCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    if db.query(MasterEmirate).filter(MasterEmirate.emirate_name == payload.emirate_name).first():
        raise HTTPException(status_code=400, detail="Emirate already exists.")
    obj = MasterEmirate(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/emirates/{emirate_id}", response_model=MasterEmirateOut, tags=["Master Data — Emirates"])
def update_emirate(
    emirate_id: str,
    payload: MasterEmirateUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(MasterEmirate).filter(MasterEmirate.emirate_id == emirate_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Emirate not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


# ════════════════════════════════════════════════════════════════════════════
# 4. PROPERTY TYPES
# ════════════════════════════════════════════════════════════════════════════

@router.get("/property-types", response_model=List[MasterPropertyTypeOut],
            tags=["Master Data — Property Types"])
def list_property_types(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_active_user),
):
    return _active_filter(MasterPropertyType, db, active_only).order_by(MasterPropertyType.type_name).all()


@router.post("/property-types", response_model=MasterPropertyTypeOut,
             status_code=status.HTTP_201_CREATED, tags=["Master Data — Property Types"])
def create_property_type(
    payload: MasterPropertyTypeCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    if db.query(MasterPropertyType).filter(MasterPropertyType.type_name == payload.type_name).first():
        raise HTTPException(status_code=400, detail="Property type already exists.")
    obj = MasterPropertyType(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/property-types/{type_id}", response_model=MasterPropertyTypeOut,
            tags=["Master Data — Property Types"])
def update_property_type(
    type_id: str,
    payload: MasterPropertyTypeUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(MasterPropertyType).filter(MasterPropertyType.property_type_id == type_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Property type not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


# ════════════════════════════════════════════════════════════════════════════
# 5. EXPENSE CATEGORIES
# ════════════════════════════════════════════════════════════════════════════

@router.get("/expense-categories", response_model=List[MasterExpenseCategoryOut],
            tags=["Master Data — Expense Categories"])
def list_expense_categories(
    active_only: bool = Query(True),
    expense_class: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_active_user),
):
    q = _active_filter(MasterExpenseCategory, db, active_only)
    if expense_class:
        q = q.filter(MasterExpenseCategory.expense_class == expense_class)
    return q.order_by(MasterExpenseCategory.category_name).all()


@router.post("/expense-categories", response_model=MasterExpenseCategoryOut,
             status_code=status.HTTP_201_CREATED, tags=["Master Data — Expense Categories"])
def create_expense_category(
    payload: MasterExpenseCategoryCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director", "Accountant"])),
):
    obj = MasterExpenseCategory(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/expense-categories/{category_id}", response_model=MasterExpenseCategoryOut,
            tags=["Master Data — Expense Categories"])
def update_expense_category(
    category_id: str,
    payload: MasterExpenseCategoryUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(MasterExpenseCategory).filter(MasterExpenseCategory.category_id == category_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Expense category not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


# ════════════════════════════════════════════════════════════════════════════
# 6. MAINTENANCE CATEGORIES
# ════════════════════════════════════════════════════════════════════════════

@router.get("/maintenance-categories", response_model=List[MasterMaintenanceCategoryOut],
            tags=["Master Data — Maintenance Categories"])
def list_maintenance_categories(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_active_user),
):
    return _active_filter(MasterMaintenanceCategory, db, active_only).order_by(
        MasterMaintenanceCategory.category_name).all()


@router.post("/maintenance-categories", response_model=MasterMaintenanceCategoryOut,
             status_code=status.HTTP_201_CREATED, tags=["Master Data — Maintenance Categories"])
def create_maintenance_category(
    payload: MasterMaintenanceCategoryCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = MasterMaintenanceCategory(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/maintenance-categories/{cat_id}", response_model=MasterMaintenanceCategoryOut,
            tags=["Master Data — Maintenance Categories"])
def update_maintenance_category(
    cat_id: str,
    payload: MasterMaintenanceCategoryUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(MasterMaintenanceCategory).filter(
        MasterMaintenanceCategory.maint_category_id == cat_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Maintenance category not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


# ════════════════════════════════════════════════════════════════════════════
# 7. PAYMENT METHODS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/payment-methods", response_model=List[MasterPaymentMethodOut],
            tags=["Master Data — Payment Methods"])
def list_payment_methods(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_active_user),
):
    return _active_filter(MasterPaymentMethod, db, active_only).order_by(
        MasterPaymentMethod.method_name).all()


@router.post("/payment-methods", response_model=MasterPaymentMethodOut,
             status_code=status.HTTP_201_CREATED, tags=["Master Data — Payment Methods"])
def create_payment_method(
    payload: MasterPaymentMethodCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    if db.query(MasterPaymentMethod).filter(MasterPaymentMethod.method_name == payload.method_name).first():
        raise HTTPException(status_code=400, detail="Payment method already exists.")
    obj = MasterPaymentMethod(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/payment-methods/{method_id}", response_model=MasterPaymentMethodOut,
            tags=["Master Data — Payment Methods"])
def update_payment_method(
    method_id: str,
    payload: MasterPaymentMethodUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(MasterPaymentMethod).filter(MasterPaymentMethod.method_id == method_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Payment method not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


# ════════════════════════════════════════════════════════════════════════════
# 8. NOTIFICATION TEMPLATES
# ════════════════════════════════════════════════════════════════════════════

@router.get("/notification-templates", response_model=List[NotificationTemplateOut],
            tags=["Master Data — Notification Templates"])
def list_notification_templates(
    active_only: bool = Query(True),
    module: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    q = _active_filter(NotificationTemplate, db, active_only)
    if module:
        q = q.filter(NotificationTemplate.module == module)
    return q.order_by(NotificationTemplate.template_code).all()


@router.post("/notification-templates", response_model=NotificationTemplateOut,
             status_code=status.HTTP_201_CREATED, tags=["Master Data — Notification Templates"])
def create_notification_template(
    payload: NotificationTemplateCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    if db.query(NotificationTemplate).filter(
            NotificationTemplate.template_code == payload.template_code).first():
        raise HTTPException(status_code=400, detail="Template code already exists.")
    obj = NotificationTemplate(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/notification-templates/{template_id}", response_model=NotificationTemplateOut,
            tags=["Master Data — Notification Templates"])
def update_notification_template(
    template_id: str,
    payload: NotificationTemplateUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(NotificationTemplate).filter(NotificationTemplate.template_id == template_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Notification template not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


# ════════════════════════════════════════════════════════════════════════════
# 9. AI PROMPT TEMPLATES
# ════════════════════════════════════════════════════════════════════════════

@router.get("/ai-prompts", response_model=List[AIPromptTemplateOut],
            tags=["Master Data — AI Prompts"])
def list_ai_prompts(
    active_only: bool = Query(True),
    module: Optional[str] = Query(None),
    featured_only: bool = Query(False),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_active_user),
):
    q = _active_filter(AIPromptTemplate, db, active_only)
    if module:
        q = q.filter(AIPromptTemplate.module == module)
    if featured_only:
        q = q.filter(AIPromptTemplate.is_featured == True)
    return q.order_by(AIPromptTemplate.sort_order, AIPromptTemplate.prompt_label).all()


@router.post("/ai-prompts", response_model=AIPromptTemplateOut,
             status_code=status.HTTP_201_CREATED, tags=["Master Data — AI Prompts"])
def create_ai_prompt(
    payload: AIPromptTemplateCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = AIPromptTemplate(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/ai-prompts/{prompt_id}", response_model=AIPromptTemplateOut,
            tags=["Master Data — AI Prompts"])
def update_ai_prompt(
    prompt_id: str,
    payload: AIPromptTemplateUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(AIPromptTemplate).filter(AIPromptTemplate.prompt_id == prompt_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="AI prompt not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


# ════════════════════════════════════════════════════════════════════════════
# 10. APPROVAL LIMITS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/approval-limits", response_model=List[ApprovalLimitOut],
            tags=["Master Data — Approval Limits"])
def list_approval_limits(
    module: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    q = db.query(ApprovalLimit).filter(ApprovalLimit.is_active == True)
    if module:
        q = q.filter(ApprovalLimit.module == module)
    return q.order_by(ApprovalLimit.module, ApprovalLimit.role_name).all()


@router.post("/approval-limits", response_model=ApprovalLimitOut,
             status_code=status.HTTP_201_CREATED, tags=["Master Data — Approval Limits"])
def create_approval_limit(
    payload: ApprovalLimitCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = ApprovalLimit(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/approval-limits/{limit_id}", response_model=ApprovalLimitOut,
            tags=["Master Data — Approval Limits"])
def update_approval_limit(
    limit_id: str,
    payload: ApprovalLimitUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(["Administrator", "Managing Director"])),
):
    obj = db.query(ApprovalLimit).filter(ApprovalLimit.limit_id == limit_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Approval limit not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj
