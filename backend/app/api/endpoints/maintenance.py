"""
Maintenance Management API — Module 09 — Sprint 8
===================================================
Endpoints:
  GET/POST   /api/v1/maintenance-tickets
  GET/PUT    /api/v1/maintenance-tickets/{id}
  POST       /api/v1/maintenance-tickets/{id}/assign
  POST       /api/v1/maintenance-tickets/{id}/status
  POST       /api/v1/maintenance-tickets/{id}/close
  GET/POST   /api/v1/maintenance-tickets/categories

Business Rules (PM Approved):
  - Tickets are linked to a property (unit optional)
  - Maintenance tickets link to property expenses via expense_id
  - Ticket lifecycle: Open → Assigned → In Progress → Pending Parts/LPO
                      → Completed → Verified → Closed
  - Ticket number auto-generated: MNT-YYYY-XXXXX
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import uuid

from app.database.session import get_db
from app.api.deps import get_current_active_user, require_roles
from app.models.auth import User
from app.models.maintenance import (
    MaintenanceCategory,
    MaintenanceTicket,
    MaintenanceAssignment,
    MaintenanceDocument,
)
from app.schemas.maintenance import (
    MaintenanceCategoryCreate,
    MaintenanceCategoryUpdate,
    MaintenanceCategoryOut,
    MaintenanceTicketCreate,
    MaintenanceTicketUpdate,
    MaintenanceTicketStatusUpdate,
    MaintenanceTicketOut,
    MaintenanceTicketListOut,
    MaintenanceAssignmentCreate,
    MaintenanceAssignmentOut,
    MaintenanceDocumentOut,
)

router = APIRouter()


# ═════════════════════════════════════════════════════════════════════════════
# Maintenance Categories
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/categories", response_model=List[MaintenanceCategoryOut])
def list_maintenance_categories(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all maintenance categories (optionally filtered by active status)."""
    q = db.query(MaintenanceCategory)
    if is_active is not None:
        q = q.filter(MaintenanceCategory.is_active == is_active)
    return q.order_by(MaintenanceCategory.category_name).all()


@router.post("/categories", response_model=MaintenanceCategoryOut, status_code=201)
def create_maintenance_category(
    data: MaintenanceCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Managing Director"])),
):
    """Create a new maintenance category (Admin / MD only)."""
    existing = db.query(MaintenanceCategory).filter(
        MaintenanceCategory.category_code == data.category_code
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Category code '{data.category_code}' already exists."
        )
    cat = MaintenanceCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/categories/{cat_id}", response_model=MaintenanceCategoryOut)
def update_maintenance_category(
    cat_id: str,
    data: MaintenanceCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Administrator", "Managing Director"])),
):
    cat = db.query(MaintenanceCategory).filter(
        MaintenanceCategory.category_id == cat_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


# ═════════════════════════════════════════════════════════════════════════════
# Maintenance Tickets
# ═════════════════════════════════════════════════════════════════════════════

def _generate_ticket_number(db: Session) -> str:
    """Auto-generate MNT-YYYY-XXXXX ticket number."""
    year = datetime.utcnow().year
    count = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.ticket_number.like(f"MNT-{year}-%")
    ).count()
    return f"MNT-{year}-{count + 1:05d}"


@router.get("", response_model=List[MaintenanceTicketListOut])
def list_maintenance_tickets(
    property_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List maintenance tickets with filters. Paginated."""
    q = db.query(MaintenanceTicket)
    if property_id:
        q = q.filter(MaintenanceTicket.property_id == property_id)
    if unit_id:
        q = q.filter(MaintenanceTicket.unit_id == unit_id)
    if status:
        q = q.filter(MaintenanceTicket.status == status)
    if priority:
        q = q.filter(MaintenanceTicket.priority == priority)
    if category_id:
        q = q.filter(MaintenanceTicket.category_id == category_id)
    if tenant_id:
        q = q.filter(MaintenanceTicket.tenant_id == tenant_id)
    if from_date:
        q = q.filter(MaintenanceTicket.reported_date >= from_date)
    if to_date:
        q = q.filter(MaintenanceTicket.reported_date <= to_date)
    return (
        q.order_by(
            MaintenanceTicket.priority.desc(),
            MaintenanceTicket.created_at.desc()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("", response_model=MaintenanceTicketOut, status_code=201)
def create_maintenance_ticket(
    data: MaintenanceTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Raise a new maintenance ticket."""
    # Validate category exists
    cat = db.query(MaintenanceCategory).filter(
        MaintenanceCategory.category_id == data.category_id
    ).first()
    if not cat:
        raise HTTPException(status_code=400, detail="Maintenance category not found.")

    ticket_number = _generate_ticket_number(db)

    ticket = MaintenanceTicket(
        **data.model_dump(),
        ticket_number=ticket_number,
        status="Open",
        created_by=current_user.user_id,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}", response_model=MaintenanceTicketOut)
def get_maintenance_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get full ticket detail with assignments and documents."""
    ticket = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.ticket_id == ticket_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found.")
    return ticket


@router.put("/{ticket_id}", response_model=MaintenanceTicketOut)
def update_maintenance_ticket(
    ticket_id: str,
    data: MaintenanceTicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a maintenance ticket (cannot update Closed or Cancelled tickets)."""
    ticket = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.ticket_id == ticket_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found.")
    if ticket.status in ("Closed", "Cancelled"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot update a ticket in '{ticket.status}' status."
        )
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ticket, field, value)
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/assign", response_model=MaintenanceAssignmentOut, status_code=201)
def assign_maintenance_ticket(
    ticket_id: str,
    data: MaintenanceAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["Administrator", "Managing Director", "Accountant", "Maintenance Staff"])
    ),
):
    """Assign a maintenance ticket to a staff member or external contractor."""
    ticket = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.ticket_id == ticket_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found.")
    if ticket.status == "Closed":
        raise HTTPException(status_code=400, detail="Cannot assign a closed ticket.")

    assignment = MaintenanceAssignment(
        ticket_id=ticket_id,
        assigned_to_user_id=data.assigned_to_user_id,
        assigned_to_name=data.assigned_to_name,
        assigned_by=current_user.user_id,
        notes=data.notes,
    )
    db.add(assignment)

    # Auto-advance status to Assigned if still Open
    if ticket.status == "Open":
        ticket.status = "Assigned"
        ticket.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(assignment)
    return assignment


@router.post("/{ticket_id}/status", response_model=MaintenanceTicketOut)
def update_ticket_status(
    ticket_id: str,
    data: MaintenanceTicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Move ticket to a new lifecycle status.
    Valid transitions enforced — Closed/Cancelled are terminal states.
    """
    ticket = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.ticket_id == ticket_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found.")

    terminal = ("Closed", "Cancelled")
    if ticket.status in terminal:
        raise HTTPException(
            status_code=400,
            detail=f"Ticket is already in terminal status '{ticket.status}'."
        )

    ticket.status = data.status
    ticket.updated_at = datetime.utcnow()

    # Auto-set dates
    if data.status == "Completed":
        ticket.actual_completion_date = date.today()
    if data.status == "Closed":
        ticket.closed_date = date.today()
    if data.notes:
        ticket.resolution_notes = (ticket.resolution_notes or "") + f"\n[{data.status}] {data.notes}"

    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/close", response_model=MaintenanceTicketOut)
def close_maintenance_ticket(
    ticket_id: str,
    resolution_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["Administrator", "Managing Director", "Accountant"])
    ),
):
    """Close a maintenance ticket (requires Completed or Verified status first)."""
    ticket = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.ticket_id == ticket_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found.")
    if ticket.status not in ("Completed", "Verified"):
        raise HTTPException(
            status_code=400,
            detail="Ticket must be Completed or Verified before closing."
        )
    ticket.status = "Closed"
    ticket.closed_date = date.today()
    if resolution_notes:
        ticket.resolution_notes = resolution_notes
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return ticket
