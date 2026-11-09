"""
Maintenance Management Schemas — Module 09 — Sprint 8
======================================================
Pydantic v2 request/response schemas for:
  - MaintenanceCategory
  - MaintenanceTicket
  - MaintenanceAssignment
  - MaintenanceDocument
"""

from __future__ import annotations
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Maintenance Category
# ─────────────────────────────────────────────────────────────────────────────

class MaintenanceCategoryCreate(BaseModel):
    category_code: str = Field(..., max_length=30)
    category_name: str = Field(..., max_length=200)
    description: Optional[str] = None
    is_active: bool = True


class MaintenanceCategoryUpdate(BaseModel):
    category_name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class MaintenanceCategoryOut(BaseModel):
    category_id: str
    category_code: str
    category_name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Maintenance Document
# ─────────────────────────────────────────────────────────────────────────────

class MaintenanceDocumentOut(BaseModel):
    document_id: str
    ticket_id: str
    document_type: str
    file_name: str
    file_path: str
    file_size_bytes: Optional[int]
    mime_type: Optional[str]
    description: Optional[str]
    uploaded_by: Optional[str]
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Maintenance Assignment
# ─────────────────────────────────────────────────────────────────────────────

class MaintenanceAssignmentCreate(BaseModel):
    assigned_to_user_id: Optional[str] = None
    assigned_to_name: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None


class MaintenanceAssignmentOut(BaseModel):
    assignment_id: str
    ticket_id: str
    assigned_to_user_id: Optional[str]
    assigned_to_name: Optional[str]
    assigned_by: Optional[str]
    assigned_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    assignment_status: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Maintenance Ticket
# ─────────────────────────────────────────────────────────────────────────────

class MaintenanceTicketCreate(BaseModel):
    property_id: str
    unit_id: Optional[str] = None
    category_id: str
    priority: str = Field("Medium", pattern="^(Low|Medium|High|Critical)$")
    title: str = Field(..., max_length=300)
    description: Optional[str] = None
    tenant_id: Optional[str] = None
    reported_by: Optional[str] = Field(None, max_length=200)
    reported_date: date
    target_completion_date: Optional[date] = None
    supplier_name: Optional[str] = Field(None, max_length=200)
    lpo_number: Optional[str] = Field(None, max_length=100)
    lpo_amount: Optional[Decimal] = None
    estimated_cost: Optional[Decimal] = None
    internal_notes: Optional[str] = None


class MaintenanceTicketUpdate(BaseModel):
    category_id: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(Low|Medium|High|Critical)$")
    title: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = None
    target_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    supplier_name: Optional[str] = Field(None, max_length=200)
    lpo_number: Optional[str] = Field(None, max_length=100)
    lpo_amount: Optional[Decimal] = None
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    resolution_notes: Optional[str] = None
    internal_notes: Optional[str] = None


class MaintenanceTicketStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        pattern="^(Open|Assigned|In Progress|Pending Parts/LPO|Completed|Verified|Closed|Cancelled)$"
    )
    notes: Optional[str] = None


class MaintenanceTicketOut(BaseModel):
    ticket_id: str
    ticket_number: str
    property_id: str
    unit_id: Optional[str]
    category_id: str
    priority: str
    title: str
    description: Optional[str]
    tenant_id: Optional[str]
    reported_by: Optional[str]
    reported_date: date
    status: str
    target_completion_date: Optional[date]
    actual_completion_date: Optional[date]
    closed_date: Optional[date]
    supplier_name: Optional[str]
    lpo_number: Optional[str]
    lpo_amount: Optional[Decimal]
    estimated_cost: Optional[Decimal]
    actual_cost: Optional[Decimal]
    expense_id: Optional[str]
    resolution_notes: Optional[str]
    internal_notes: Optional[str]
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Nested
    category: Optional[MaintenanceCategoryOut] = None
    assignments: List[MaintenanceAssignmentOut] = []
    documents: List[MaintenanceDocumentOut] = []

    class Config:
        from_attributes = True


class MaintenanceTicketListOut(BaseModel):
    """Lightweight list schema — no nested relations."""
    ticket_id: str
    ticket_number: str
    property_id: str
    unit_id: Optional[str]
    category_id: str
    priority: str
    title: str
    status: str
    reported_date: date
    target_completion_date: Optional[date]
    actual_cost: Optional[Decimal]
    created_at: datetime

    class Config:
        from_attributes = True
