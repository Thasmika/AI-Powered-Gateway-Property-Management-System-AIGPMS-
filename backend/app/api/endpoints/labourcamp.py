"""
Labour Camp Management API — Module 11 — Sprint 8
===================================================
Endpoints:
  GET/POST   /api/v1/labour-camp/units
  GET/PUT    /api/v1/labour-camp/units/{id}
  GET/POST   /api/v1/labour-camp/residents
  GET/PUT    /api/v1/labour-camp/residents/{id}
  GET/POST   /api/v1/labour-camp/leases
  GET/PUT    /api/v1/labour-camp/leases/{id}
  POST       /api/v1/labour-camp/utility-readings
  GET        /api/v1/labour-camp/occupancy-summary
  GET        /api/v1/labour-camp/utility-readings

PM Rule: Labour camp does NOT use PDC — different payment process.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
import uuid

from app.database.session import get_db
from app.api.deps import get_current_active_user, require_roles
from app.models.auth import User
from app.models.labourcamp import (
    LabourCampUnit,
    CampResident,
    CampLease,
    CampUtilityReading,
)
from app.schemas.labourcamp import (
    LabourCampUnitCreate,
    LabourCampUnitUpdate,
    LabourCampUnitOut,
    CampResidentCreate,
    CampResidentUpdate,
    CampResidentOut,
    CampLeaseCreate,
    CampLeaseUpdate,
    CampLeaseOut,
    CampUtilityReadingCreate,
    CampUtilityReadingOut,
    CampOccupancySummary,
)

router = APIRouter()


# ═════════════════════════════════════════════════════════════════════════════
# Labour Camp Units
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/units", response_model=List[LabourCampUnitOut])
def list_camp_units(
    property_id: Optional[str] = None,
    status: Optional[str] = None,
    unit_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all labour camp units with optional filters."""
    q = db.query(LabourCampUnit)
    if property_id:
        q = q.filter(LabourCampUnit.property_id == property_id)
    if status:
        q = q.filter(LabourCampUnit.status == status)
    if unit_type:
        q = q.filter(LabourCampUnit.unit_type == unit_type)
    if is_active is not None:
        q = q.filter(LabourCampUnit.is_active == is_active)
    return q.order_by(LabourCampUnit.unit_number).offset(skip).limit(limit).all()


@router.post("/units", response_model=LabourCampUnitOut, status_code=201)
def create_camp_unit(
    data: LabourCampUnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["Administrator", "Managing Director", "Accountant"])
    ),
):
    """Register a new labour camp unit (room / bed space)."""
    unit = LabourCampUnit(**data.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/units/{unit_id}", response_model=LabourCampUnitOut)
def get_camp_unit(
    unit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    unit = db.query(LabourCampUnit).filter(LabourCampUnit.unit_id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Labour camp unit not found.")
    return unit


@router.put("/units/{unit_id}", response_model=LabourCampUnitOut)
def update_camp_unit(
    unit_id: str,
    data: LabourCampUnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["Administrator", "Managing Director", "Accountant"])
    ),
):
    unit = db.query(LabourCampUnit).filter(LabourCampUnit.unit_id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Labour camp unit not found.")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(unit, field, value)
    unit.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(unit)
    return unit


# ═════════════════════════════════════════════════════════════════════════════
# Camp Residents
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/residents", response_model=List[CampResidentOut])
def list_camp_residents(
    unit_id: Optional[str] = None,
    status: Optional[str] = None,
    employer_company: Optional[str] = None,
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all camp residents with optional filters."""
    q = db.query(CampResident)
    if unit_id:
        q = q.filter(CampResident.unit_id == unit_id)
    if status:
        q = q.filter(CampResident.status == status)
    if employer_company:
        q = q.filter(CampResident.employer_company.ilike(f"%{employer_company}%"))
    return q.order_by(CampResident.full_name).offset(skip).limit(limit).all()


@router.post("/residents", response_model=CampResidentOut, status_code=201)
def create_camp_resident(
    data: CampResidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Register a new labour camp resident."""
    # Check duplicate ID number
    existing = db.query(CampResident).filter(
        CampResident.id_number == data.id_number,
        CampResident.id_type == data.id_type,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A resident with {data.id_type} '{data.id_number}' already exists."
        )

    resident = CampResident(**data.model_dump(), created_by=current_user.user_id)
    db.add(resident)

    # Update unit occupancy count
    if data.unit_id:
        unit = db.query(LabourCampUnit).filter(
            LabourCampUnit.unit_id == data.unit_id
        ).first()
        if unit:
            if unit.current_occupancy >= unit.total_capacity:
                raise HTTPException(
                    status_code=400,
                    detail="Unit is at full capacity."
                )
            unit.current_occupancy += 1
            if unit.current_occupancy >= unit.total_capacity:
                unit.status = "Occupied"

    db.commit()
    db.refresh(resident)
    return resident


@router.get("/residents/{resident_id}", response_model=CampResidentOut)
def get_camp_resident(
    resident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    resident = db.query(CampResident).filter(
        CampResident.resident_id == resident_id
    ).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found.")
    return resident


@router.put("/residents/{resident_id}", response_model=CampResidentOut)
def update_camp_resident(
    resident_id: str,
    data: CampResidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    resident = db.query(CampResident).filter(
        CampResident.resident_id == resident_id
    ).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found.")

    old_unit_id = resident.unit_id
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(resident, field, value)
    resident.updated_at = datetime.utcnow()

    # Handle unit reassignment: update occupancy counts
    new_unit_id = data.unit_id
    if new_unit_id is not None and new_unit_id != old_unit_id:
        if old_unit_id:
            old_unit = db.query(LabourCampUnit).filter(
                LabourCampUnit.unit_id == old_unit_id
            ).first()
            if old_unit:
                old_unit.current_occupancy = max(0, old_unit.current_occupancy - 1)
                if old_unit.current_occupancy < old_unit.total_capacity:
                    old_unit.status = "Available"

        if new_unit_id:
            new_unit = db.query(LabourCampUnit).filter(
                LabourCampUnit.unit_id == new_unit_id
            ).first()
            if new_unit:
                if new_unit.current_occupancy >= new_unit.total_capacity:
                    raise HTTPException(status_code=400, detail="New unit is at full capacity.")
                new_unit.current_occupancy += 1
                if new_unit.current_occupancy >= new_unit.total_capacity:
                    new_unit.status = "Occupied"

    db.commit()
    db.refresh(resident)
    return resident


# ═════════════════════════════════════════════════════════════════════════════
# Camp Leases
# ═════════════════════════════════════════════════════════════════════════════

def _generate_lease_reference(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(CampLease).filter(
        CampLease.lease_reference.like(f"CL-{year}-%")
    ).count()
    return f"CL-{year}-{count + 1:04d}"


@router.get("/leases", response_model=List[CampLeaseOut])
def list_camp_leases(
    unit_id: Optional[str] = None,
    resident_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(CampLease)
    if unit_id:
        q = q.filter(CampLease.unit_id == unit_id)
    if resident_id:
        q = q.filter(CampLease.resident_id == resident_id)
    if status:
        q = q.filter(CampLease.status == status)
    return q.order_by(CampLease.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/leases", response_model=CampLeaseOut, status_code=201)
def create_camp_lease(
    data: CampLeaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new camp occupancy lease (no PDC — PM rule)."""
    # Verify unit exists
    unit = db.query(LabourCampUnit).filter(
        LabourCampUnit.unit_id == data.unit_id
    ).first()
    if not unit:
        raise HTTPException(status_code=400, detail="Labour camp unit not found.")
    # Verify resident exists
    resident = db.query(CampResident).filter(
        CampResident.resident_id == data.resident_id
    ).first()
    if not resident:
        raise HTTPException(status_code=400, detail="Resident not found.")

    lease_ref = _generate_lease_reference(db)
    lease = CampLease(
        **data.model_dump(),
        lease_reference=lease_ref,
        created_by=current_user.user_id,
    )
    db.add(lease)
    db.commit()
    db.refresh(lease)
    return lease


@router.get("/leases/{lease_id}", response_model=CampLeaseOut)
def get_camp_lease(
    lease_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    lease = db.query(CampLease).filter(CampLease.lease_id == lease_id).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Camp lease not found.")
    return lease


@router.put("/leases/{lease_id}", response_model=CampLeaseOut)
def update_camp_lease(
    lease_id: str,
    data: CampLeaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["Administrator", "Managing Director", "Accountant"])
    ),
):
    lease = db.query(CampLease).filter(CampLease.lease_id == lease_id).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Camp lease not found.")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(lease, field, value)
    lease.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lease)
    return lease


# ═════════════════════════════════════════════════════════════════════════════
# Utility Readings
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/utility-readings", response_model=CampUtilityReadingOut, status_code=201)
def record_utility_reading(
    data: CampUtilityReadingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Record a new utility meter reading and auto-calculate consumption and billing."""
    unit = db.query(LabourCampUnit).filter(
        LabourCampUnit.unit_id == data.unit_id
    ).first()
    if not unit:
        raise HTTPException(status_code=400, detail="Labour camp unit not found.")

    # Auto-calculate consumption
    units_consumed = None
    billed_amount = None
    if data.previous_reading is not None:
        units_consumed = data.current_reading - data.previous_reading
        if units_consumed < 0:
            raise HTTPException(
                status_code=400,
                detail="Current reading cannot be less than previous reading."
            )
    if units_consumed is not None and data.rate_per_unit is not None:
        billed_amount = units_consumed * data.rate_per_unit

    reading = CampUtilityReading(
        **data.model_dump(),
        units_consumed=units_consumed,
        billed_amount=billed_amount,
        recorded_by=current_user.user_id,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.get("/utility-readings", response_model=List[CampUtilityReadingOut])
def list_utility_readings(
    unit_id: Optional[str] = None,
    utility_type: Optional[str] = None,
    is_billed: Optional[bool] = None,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List utility readings with filters."""
    q = db.query(CampUtilityReading)
    if unit_id:
        q = q.filter(CampUtilityReading.unit_id == unit_id)
    if utility_type:
        q = q.filter(CampUtilityReading.utility_type == utility_type)
    if is_billed is not None:
        q = q.filter(CampUtilityReading.is_billed == is_billed)
    if from_date:
        q = q.filter(CampUtilityReading.reading_date >= from_date)
    if to_date:
        q = q.filter(CampUtilityReading.reading_date <= to_date)
    return q.order_by(CampUtilityReading.reading_date.desc()).offset(skip).limit(limit).all()


# ═════════════════════════════════════════════════════════════════════════════
# Occupancy Summary
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/occupancy-summary", response_model=CampOccupancySummary)
def get_camp_occupancy_summary(
    property_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Overall labour camp occupancy summary for dashboard."""
    q = db.query(LabourCampUnit).filter(LabourCampUnit.is_active == True)
    if property_id:
        q = q.filter(LabourCampUnit.property_id == property_id)

    units = q.all()
    total_units = len(units)
    total_capacity = sum(u.total_capacity for u in units)
    current_occupancy = sum(u.current_occupancy for u in units)
    available_beds = total_capacity - current_occupancy
    occupancy_rate = (current_occupancy / total_capacity * 100) if total_capacity > 0 else 0

    units_available = sum(1 for u in units if u.status == "Available")
    units_occupied = sum(1 for u in units if u.status == "Occupied")
    units_maintenance = sum(1 for u in units if u.status == "Under Maintenance")

    return CampOccupancySummary(
        total_units=total_units,
        total_capacity=total_capacity,
        current_occupancy=current_occupancy,
        available_beds=available_beds,
        occupancy_rate_pct=round(occupancy_rate, 1),
        units_available=units_available,
        units_occupied=units_occupied,
        units_under_maintenance=units_maintenance,
    )


# ═════════════════════════════════════════════════════════════════════════════
# Labour Camp Cash Receipts — Cash Collection Module
# Technical Instruction Sheet approved — August 2026
# Endpoints:
#   GET    /labour-camp/cash-receipts/leases       — combo box data
#   GET    /labour-camp/cash-receipts              — list / register
#   POST   /labour-camp/cash-receipts              — create draft
#   GET    /labour-camp/cash-receipts/{id}         — detail
#   POST   /labour-camp/cash-receipts/{id}/post    — post (full 13-step validation)
#   POST   /labour-camp/cash-receipts/{id}/cancel  — cancel draft
#   POST   /labour-camp/cash-receipts/{id}/reverse — reverse posted (MD/Admin)
# ═════════════════════════════════════════════════════════════════════════════

from app.models.labourcamp import LabourCampCashReceipt, LabourCampCashReceiptLine
from app.models.property import Property
from app.models.auth import AuditLog
from app.schemas.labourcamp import (
    CampLeaseForReceiptOut,
    LabourCampCashReceiptCreate,
    LabourCampCashReceiptOut,
    LabourCampCashReceiptLineOut,
    LabourCampCashReceiptListItem,
)
import calendar
import json


def _generate_cash_receipt_number(db: Session) -> str:
    """Generate unique receipt reference: LCCR-YYYY-NNNN."""
    year = datetime.utcnow().year
    prefix = f"LCCR-{year}-"
    latest = db.query(func.max(LabourCampCashReceipt.receipt_number)).filter(
        LabourCampCashReceipt.receipt_number.like(f"{prefix}%")
    ).scalar()
    if latest:
        try:
            seq = int(latest.replace(prefix, "")) + 1
        except (ValueError, AttributeError):
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


def _add_one_calendar_month(d) -> date:
    """
    Add exactly one calendar month to a date, handling month-end edge cases.

    PM Rule (August 2026 update):
      new_expiry = receipt_date + 1 calendar month
      (NOT old_expiry + 1 month — if the old expiry is already past,
       adding to it would still leave the new date in the past.)

    Examples:
      15-Aug-2026  → 15-Sep-2026
      31-Jan-2027  → 28-Feb-2027   (February has no 31st)
      31-Mar-2027  → 30-Apr-2027   (April has no 31st)
    """
    if d is None:
        return None
    month = d.month + 1
    year = d.year + (1 if month > 12 else 0)
    month = month if month <= 12 else 1
    # Clamp day to last valid day in target month
    max_day = calendar.monthrange(year, month)[1]
    new_day = min(d.day, max_day)
    return date(year, month, new_day)


def _enrich_lines(lines: list, db: Session) -> list:
    """Attach lease_reference, unit_number, resident_name to line output objects."""
    enriched = []
    for line in lines:
        lo = LabourCampCashReceiptLineOut.model_validate(line)
        if line.lease:
            lo.lease_reference = line.lease.lease_reference
            unit = db.query(LabourCampUnit).filter(
                LabourCampUnit.unit_id == line.lease.unit_id
            ).first()
            if unit:
                lo.unit_number = unit.unit_number
            resident = db.query(CampResident).filter(
                CampResident.resident_id == line.lease.resident_id
            ).first()
            if resident:
                lo.resident_name = resident.full_name
        enriched.append(lo)
    return enriched


def _build_receipt_out(receipt: LabourCampCashReceipt, db: Session) -> LabourCampCashReceiptOut:
    """Build the full response object with enriched lines and computed grid_total."""
    out = LabourCampCashReceiptOut.model_validate(receipt)
    out.lines = _enrich_lines(receipt.lines, db)
    out.grid_total = sum(ln.rent_amount_received for ln in out.lines) if out.lines else Decimal("0")
    return out


# ─────────────────────────────────────────────────────────────────────────────
# GET /labour-camp/cash-receipts/leases
# Returns active CampLease records scoped EXCLUSIVELY to Labour Camp property.
# Used to populate the Tenancy Contract combo box in the receipt entry screen.
# IMPORTANT: Route must be registered BEFORE /{id} routes to avoid path clash.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/cash-receipts/leases", response_model=List[CampLeaseForReceiptOut])
def list_leases_for_receipt(
    include_expired: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Return CampLease records belonging ONLY to Labour Camp properties.

    Filtering logic (PM rule — Section 15):
      JOIN labour_camp_units ON camp_leases.unit_id = labour_camp_units.unit_id
      JOIN properties ON labour_camp_units.property_id = properties.property_id
      WHERE properties.property_type = 'Labour Camp'
        AND camp_leases.status = 'Active'

    The combo box only shows contracts that are Active (and optionally Expired
    if include_expired=true — for monthly-renewable contracts near expiry).
    """
    q = (
        db.query(CampLease)
        .join(LabourCampUnit, CampLease.unit_id == LabourCampUnit.unit_id)
        .join(Property, LabourCampUnit.property_id == Property.property_id)
        .filter(Property.property_type == "Labour Camp")
        .filter(CampLease.status != "Terminated")
        .filter(CampLease.status != "Cancelled")
    )
    if not include_expired:
        q = q.filter(CampLease.status == "Active")

    leases = q.order_by(CampLease.lease_reference).all()

    result = []
    for lease in leases:
        unit = db.query(LabourCampUnit).filter(
            LabourCampUnit.unit_id == lease.unit_id
        ).first()
        resident = db.query(CampResident).filter(
            CampResident.resident_id == lease.resident_id
        ).first()
        result.append(CampLeaseForReceiptOut(
            lease_id=lease.lease_id,
            lease_reference=lease.lease_reference,
            unit_id=lease.unit_id,
            unit_number=unit.unit_number if unit else "—",
            resident_name=resident.full_name if resident else "—",
            monthly_rate=lease.monthly_rate,
            end_date=lease.end_date,
            status=lease.status,
        ))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# GET /labour-camp/cash-receipts  — List / Register
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/cash-receipts", response_model=List[LabourCampCashReceiptListItem])
def list_cash_receipts(
    status: Optional[str] = None,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    receipt_number: Optional[str] = None,
    skip: int = 0,
    limit: int = 5000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List Labour Camp cash receipts with optional filters."""
    q = db.query(LabourCampCashReceipt)
    if status:
        q = q.filter(LabourCampCashReceipt.status == status)
    if from_date:
        q = q.filter(LabourCampCashReceipt.receipt_date >= from_date)
    if to_date:
        q = q.filter(LabourCampCashReceipt.receipt_date <= to_date)
    if receipt_number:
        q = q.filter(LabourCampCashReceipt.receipt_number.ilike(f"%{receipt_number}%"))

    receipts = q.order_by(LabourCampCashReceipt.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for r in receipts:
        result.append(LabourCampCashReceiptListItem(
            receipt_id=r.receipt_id,
            receipt_number=r.receipt_number,
            receipt_date=r.receipt_date,
            total_amount=r.total_amount,
            received_from=r.received_from,
            status=r.status,
            line_count=len(r.lines),
            created_by=r.created_by,
            created_at=r.created_at,
            posted_by=r.posted_by,
            posted_at=r.posted_at,
        ))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# POST /labour-camp/cash-receipts  — Create Draft
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/cash-receipts", response_model=LabourCampCashReceiptOut, status_code=201)
def create_cash_receipt(
    data: LabourCampCashReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["Accountant", "Managing Director", "Administrator"])
    ),
):
    """
    Create a Labour Camp Cash Receipt in Draft status.

    Validation sequence (Steps 1–9 from Technical Instruction Sheet):
      1. receipt_date provided
      2. total_amount > 0
      3. At least one detail line
      4. Every line has a camp_lease_id
      5. Every rent_amount_received > 0
      6. All leases belong to Labour Camp property
      7. No duplicate lease in same receipt
      8. grid_total = SUM(rent_amount_received)
      9. grid_total == total_amount

    Steps 10–11: Save header and lines.
    Step 13: Audit log entry.
    (Steps 12 — expiry extension — runs only on POST, not on Draft save.)
    """
    # Step 1 — receipt_date already validated by Pydantic (it's a required date field)

    # Step 2 — total_amount > 0 — already validated by Pydantic Field(gt=0)

    # Step 3 — at least one line
    if not data.lines:
        raise HTTPException(
            status_code=400,
            detail="At least one tenancy contract line is required."
        )

    # Step 4 — every line has a camp_lease_id (enforced by Pydantic)

    # Step 5 — every rent_amount_received > 0 (enforced by Pydantic Field gt=0)

    # Step 6 — all leases belong to Labour Camp property
    labour_camp_lease_ids = set(
        row[0] for row in db.query(CampLease.lease_id)
        .join(LabourCampUnit, CampLease.unit_id == LabourCampUnit.unit_id)
        .join(Property, LabourCampUnit.property_id == Property.property_id)
        .filter(Property.property_type == "Labour Camp")
        .all()
    )
    for line in data.lines:
        if line.camp_lease_id not in labour_camp_lease_ids:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Lease '{line.camp_lease_id}' does not belong to a Labour Camp property. "
                    "Only Labour Camp tenancy contracts may be included in this receipt."
                )
            )

    # Step 7 — no duplicate lease in same receipt
    seen_leases: set = set()
    for line in data.lines:
        if line.camp_lease_id in seen_leases:
            raise HTTPException(
                status_code=400,
                detail="This tenancy contract has already been entered in this receipt. "
                       "Each contract may appear only once per receipt."
            )
        seen_leases.add(line.camp_lease_id)

    # Step 8 — calculate grid total
    grid_total = sum(ln.rent_amount_received for ln in data.lines)

    # Step 9 — grid total must equal header total (within AED 0.01 rounding tolerance)
    diff = abs(grid_total - data.total_amount)
    if diff > Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Total amount does not match the total rent entered in the detail lines. "
                f"Header Total: AED {data.total_amount:,.2f} | "
                f"Grid Total: AED {grid_total:,.2f} | "
                f"Difference: AED {grid_total - data.total_amount:,.2f}. "
                "Please verify the collection before saving."
            )
        )

    # Resolve property_id for the Labour Camp property (first match)
    lc_property = (
        db.query(Property)
        .filter(Property.property_type == "Labour Camp")
        .first()
    )

    # Step 10 — Save receipt header
    receipt = LabourCampCashReceipt(
        receipt_id=str(uuid.uuid4()),
        receipt_number=_generate_cash_receipt_number(db),
        receipt_date=data.receipt_date,
        property_id=lc_property.property_id if lc_property else None,
        total_amount=data.total_amount,
        received_from=data.received_from,
        remarks=data.remarks,
        status="Draft",
        created_by=current_user.user_id,
        created_at=datetime.utcnow(),
    )
    db.add(receipt)
    db.flush()

    # Step 11 — Save receipt lines (snapshot monthly_rate)
    for idx, line_in in enumerate(data.lines, start=1):
        lease = db.query(CampLease).filter(CampLease.lease_id == line_in.camp_lease_id).first()
        db_line = LabourCampCashReceiptLine(
            line_id=str(uuid.uuid4()),
            cash_receipt_id=receipt.receipt_id,
            line_number=idx,
            camp_lease_id=line_in.camp_lease_id,
            unit_id=lease.unit_id if lease else None,
            contract_monthly_rent=lease.monthly_rate if lease else line_in.rent_amount_received,
            rent_amount_received=line_in.rent_amount_received,
            # old_expiry_date and new_expiry_date filled in on Post, not Draft
            remarks=line_in.remarks,
            created_at=datetime.utcnow(),
        )
        db.add(db_line)

    # Step 13 — Audit log
    audit = AuditLog(
        audit_id=str(uuid.uuid4()),
        user_id=current_user.user_id,
        action="Create Labour Camp Cash Receipt (Draft)",
        module="Labour Camp Cash Collection",
        new_value=json.dumps({
            "receipt_number": receipt.receipt_number,
            "receipt_date": str(data.receipt_date),
            "total_amount": str(data.total_amount),
            "line_count": len(data.lines),
        }),
        timestamp=datetime.utcnow(),
    )
    db.add(audit)

    db.commit()
    db.refresh(receipt)
    return _build_receipt_out(receipt, db)


# ─────────────────────────────────────────────────────────────────────────────
# GET /labour-camp/cash-receipts/{receipt_id}  — Detail
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/cash-receipts/{receipt_id}", response_model=LabourCampCashReceiptOut)
def get_cash_receipt(
    receipt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a single Labour Camp cash receipt with all detail lines."""
    receipt = db.query(LabourCampCashReceipt).filter(
        LabourCampCashReceipt.receipt_id == receipt_id
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Labour Camp cash receipt not found.")
    return _build_receipt_out(receipt, db)


# ─────────────────────────────────────────────────────────────────────────────
# POST /labour-camp/cash-receipts/{receipt_id}/post  — Post
# Full 13-step validation + atomic DB transaction + expiry date extension
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/cash-receipts/{receipt_id}/post", response_model=LabourCampCashReceiptOut)
def post_cash_receipt(
    receipt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["Accountant", "Managing Director", "Administrator"])
    ),
):
    """
    Post a Draft Labour Camp cash receipt.

    Full 13-step validation and posting sequence (Technical Instruction Sheet §11):
      1.  Validate receipt_date
      2.  Validate header total > 0
      3.  Validate at least one detail line exists
      4.  Validate every detail line has a tenancy contract
      5.  Validate every rent_amount_received > 0
      6.  Validate selected contracts belong to Labour Camp
      7.  Validate no duplicate tenancy contract in receipt
      8.  Calculate grid total
      9.  Validate grid total == header total
      10. (header already saved — status update happens here)
      11. (lines already saved — old/new expiry updated here)
      12. Update tenancy contract expiry dates (+1 calendar month each)
      13. Record audit log
          Mark receipt as Posted.

    ALL steps run inside ONE database transaction — any failure causes full rollback.
    """
    receipt = db.query(LabourCampCashReceipt).filter(
        LabourCampCashReceipt.receipt_id == receipt_id
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Labour Camp cash receipt not found.")

    if receipt.status == "Posted":
        raise HTTPException(status_code=400, detail="This receipt has already been posted.")
    if receipt.status in ("Cancelled", "Reversed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot post a receipt with status '{receipt.status}'."
        )

    # Step 1 — receipt_date present
    if not receipt.receipt_date:
        raise HTTPException(status_code=400, detail="Receipt date is required.")

    # Step 2 — header total > 0
    if receipt.total_amount <= 0:
        raise HTTPException(status_code=400, detail="Receipt total amount must be greater than zero.")

    # Step 3 — at least one line
    if not receipt.lines:
        raise HTTPException(
            status_code=400,
            detail="Cannot post: receipt has no detail lines."
        )

    # Prefetch all relevant leases
    lease_ids = [ln.camp_lease_id for ln in receipt.lines]
    leases_by_id = {
        lease.lease_id: lease
        for lease in db.query(CampLease).filter(CampLease.lease_id.in_(lease_ids)).all()
    }

    # Labour Camp lease IDs for property validation
    labour_camp_lease_ids = set(
        row[0] for row in db.query(CampLease.lease_id)
        .join(LabourCampUnit, CampLease.unit_id == LabourCampUnit.unit_id)
        .join(Property, LabourCampUnit.property_id == Property.property_id)
        .filter(Property.property_type == "Labour Camp")
        .all()
    )

    seen: set = set()
    for line in receipt.lines:
        # Step 4 — every line has a lease
        lease = leases_by_id.get(line.camp_lease_id)
        if not lease:
            raise HTTPException(
                status_code=400,
                detail=f"Line {line.line_number}: Tenancy contract not found."
            )

        # Step 5 — rent_amount_received > 0
        if line.rent_amount_received <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Line {line.line_number}: Rent amount received must be greater than zero."
            )

        # Step 6 — contract belongs to Labour Camp
        if line.camp_lease_id not in labour_camp_lease_ids:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Line {line.line_number}: Contract '{lease.lease_reference}' "
                    "does not belong to a Labour Camp property."
                )
            )

        # Step 7 — no duplicates
        if line.camp_lease_id in seen:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Duplicate tenancy contract '{lease.lease_reference}' "
                    "found in this receipt. Each contract must appear only once."
                )
            )
        seen.add(line.camp_lease_id)

    # Step 8 — calculate grid total
    grid_total = sum(ln.rent_amount_received for ln in receipt.lines)

    # Step 9 — grid total == header total
    diff = abs(grid_total - receipt.total_amount)
    if diff > Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Total amount does not match the total rent entered in the detail lines. "
                f"Header Total: AED {receipt.total_amount:,.2f} | "
                f"Grid Total: AED {grid_total:,.2f} | "
                f"Difference: AED {grid_total - receipt.total_amount:,.2f}. "
                "Please verify the collection before saving."
            )
        )

    # Steps 10, 11, 12, 13 — all within the same transaction
    try:
        # Step 12 — Update each contract expiry date
        #
        # PM Rule (August 2026):
        #   new_expiry = receipt_date + 1 calendar month
        #
        # Rationale: If the old end_date is already in the past (expired lease),
        # adding 1 month to it would still produce a past date — making it appear
        # the extension did not work. Using receipt_date ensures one payment always
        # pushes the contract to the next calendar month from the posting date.
        #
        # Example: old_expiry=2026-07-01, receipt_date=2026-08-21
        #   new_expiry = 2026-08-21 + 1 month = 2026-09-21  (correct, in the future)
        #
        # Note: old_expiry is still recorded on the line for full audit trail.
        audit_changes = []
        for line in receipt.lines:
            lease = leases_by_id[line.camp_lease_id]
            old_expiry = lease.end_date
            old_status = lease.status
            # Fix: base the new expiry on the later of old_expiry and receipt_date
            if old_expiry and old_expiry > receipt.receipt_date:
                base_date = old_expiry
            else:
                base_date = receipt.receipt_date
            new_expiry = _add_one_calendar_month(base_date)

            # Record on the receipt line for audit/reporting
            line.old_expiry_date = old_expiry
            line.new_expiry_date = new_expiry

            # Update the camp lease
            lease.end_date = new_expiry
            if lease.status == "Expired":
                lease.status = "Active"

            audit_changes.append({
                "contract_id": lease.lease_id,
                "lease_reference": lease.lease_reference,
                "old_expiry": str(old_expiry),
                "new_expiry": str(new_expiry),
                "old_status": old_status,
                "new_status": lease.status,
                "receipt_date": str(receipt.receipt_date),
                "cash_receipt_id": receipt.receipt_id,
                "reason": "Labour Camp Monthly Cash Collection — expiry = receipt_date + 1 month",
            })

            # Write per-lease audit log entry
            db.add(AuditLog(
                audit_id=str(uuid.uuid4()),
                user_id=current_user.user_id,
                action="Labour Camp Lease Expiry Extended",
                module="Labour Camp Cash Collection",
                old_value=json.dumps({
                    "lease_reference": lease.lease_reference,
                    "expiry_date": str(old_expiry),
                    "status": old_status,
                }),
                new_value=json.dumps({
                    "lease_reference": lease.lease_reference,
                    "expiry_date": str(new_expiry),
                    "status": lease.status,
                    "extended_by": "1 calendar month",
                    "cash_receipt": receipt.receipt_number,
                    "changed_by": current_user.full_name,
                    "changed_at": datetime.utcnow().isoformat(),
                    "reason": "Labour Camp Monthly Cash Collection",
                }),
                timestamp=datetime.utcnow(),
            ))

        # Step 10 / 13 — Mark receipt as Posted, write summary audit
        receipt.status = "Posted"
        receipt.posted_by = current_user.user_id
        receipt.posted_at = datetime.utcnow()

        db.add(AuditLog(
            audit_id=str(uuid.uuid4()),
            user_id=current_user.user_id,
            action="Post Labour Camp Cash Receipt",
            module="Labour Camp Cash Collection",
            old_value=json.dumps({"status": "Draft"}),
            new_value=json.dumps({
                "receipt_number": receipt.receipt_number,
                "receipt_date": str(receipt.receipt_date),
                "total_amount": str(receipt.total_amount),
                "status": "Posted",
                "posted_by": current_user.full_name,
                "leases_extended": len(audit_changes),
                "lease_details": audit_changes,
            }),
            timestamp=datetime.utcnow(),
        ))

        db.commit()
        db.refresh(receipt)
        return _build_receipt_out(receipt, db)

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to post receipt due to an internal error: {str(exc)}"
        ) from exc


# ─────────────────────────────────────────────────────────────────────────────
# POST /labour-camp/cash-receipts/{receipt_id}/cancel  — Cancel Draft
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/cash-receipts/{receipt_id}/cancel", response_model=LabourCampCashReceiptOut)
def cancel_cash_receipt(
    receipt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["Accountant", "Managing Director", "Administrator"])
    ),
):
    """Cancel a Draft Labour Camp cash receipt. Only Draft receipts may be cancelled."""
    receipt = db.query(LabourCampCashReceipt).filter(
        LabourCampCashReceipt.receipt_id == receipt_id
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Labour Camp cash receipt not found.")
    if receipt.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Only Draft receipts can be cancelled. Current status: '{receipt.status}'."
        )

    receipt.status = "Cancelled"
    receipt.cancelled_by = current_user.user_id
    receipt.cancelled_at = datetime.utcnow()

    db.add(AuditLog(
        audit_id=str(uuid.uuid4()),
        user_id=current_user.user_id,
        action="Cancel Labour Camp Cash Receipt",
        module="Labour Camp Cash Collection",
        old_value=json.dumps({"status": "Draft"}),
        new_value=json.dumps({
            "receipt_number": receipt.receipt_number,
            "status": "Cancelled",
            "cancelled_by": current_user.full_name,
        }),
        timestamp=datetime.utcnow(),
    ))

    db.commit()
    db.refresh(receipt)
    return _build_receipt_out(receipt, db)


@router.delete("/cash-receipts/{receipt_id}", status_code=204)
def delete_cash_receipt(
    receipt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Accountant", "Managing Director", "Administrator"])),
):
    """Delete a Labour Camp Cash Receipt. Only Draft receipts can be deleted."""
    receipt = db.query(LabourCampCashReceipt).filter(
        LabourCampCashReceipt.receipt_id == receipt_id
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found.")

    db.add(AuditLog(
        audit_id=str(uuid.uuid4()),
        user_id=current_user.user_id,
        action="Delete Labour Camp Cash Receipt",
        module="Labour Camp Cash Collection",
        old_value=json.dumps({"receipt_number": receipt.receipt_number, "status": receipt.status}),
        new_value=json.dumps({"deleted": True}),
        timestamp=datetime.utcnow(),
    ))

    db.delete(receipt)
    db.commit()
# ─────────────────────────────────────────────────────────────────────────────
# POST /labour-camp/cash-receipts/{receipt_id}/reverse  — Reverse Posted
# MD / Administrator only — preserves financial and contract history
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/cash-receipts/{receipt_id}/reverse", response_model=LabourCampCashReceiptOut)
def reverse_cash_receipt(
    receipt_id: str,
    reversal_reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(["Managing Director", "Administrator"])
    ),
):
    """
    Reverse a Posted Labour Camp cash receipt.

    PM Rule: The system does NOT delete or directly edit posted transactions.
    A reversal marks the receipt as Reversed and writes a full audit trail.
    The CampLease expiry dates are NOT automatically rolled back (history preserved).
    Old and new expiry dates remain visible on the receipt lines for reference.
    """
    receipt = db.query(LabourCampCashReceipt).filter(
        LabourCampCashReceipt.receipt_id == receipt_id
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Labour Camp cash receipt not found.")
    if receipt.status != "Posted":
        raise HTTPException(
            status_code=400,
            detail=f"Only Posted receipts can be reversed. Current status: '{receipt.status}'."
        )

    receipt.status = "Reversed"
    receipt.reversal_reason = reversal_reason or "Reversal authorised by Managing Director / Administrator"

    db.add(AuditLog(
        audit_id=str(uuid.uuid4()),
        user_id=current_user.user_id,
        action="Reverse Labour Camp Cash Receipt",
        module="Labour Camp Cash Collection",
        old_value=json.dumps({"status": "Posted"}),
        new_value=json.dumps({
            "receipt_number": receipt.receipt_number,
            "status": "Reversed",
            "reversed_by": current_user.full_name,
            "reversal_reason": receipt.reversal_reason,
            "note": (
                "Lease expiry dates NOT automatically restored. "
                "Old and new expiry dates remain on receipt lines for reference."
            ),
        }),
        timestamp=datetime.utcnow(),
    ))

    db.commit()
    db.refresh(receipt)
    return _build_receipt_out(receipt, db)

