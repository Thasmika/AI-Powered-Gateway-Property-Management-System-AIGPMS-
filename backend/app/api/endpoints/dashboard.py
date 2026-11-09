"""
Dashboard Aggregation API — Sprint 9
Provides pre-aggregated KPI data for all role-based dashboards:
  - MD Dashboard
  - Finance Dashboard (PDC panels + cash flow)
  - Property Dashboard (occupancy, lease expiry)
  - Maintenance Dashboard (ticket stats, cost trend)
  - Labour Camp Dashboard (rooms, beds, utility)
"""

import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_

from app.api import deps
from app.models.auth import User, AuditLog
from app.models.property import Property, PropertyUnit, PropertyValuation
from app.models.property import PropertyAcquisitionCost
from app.models.tenant import Tenant, Lease, LeaseVersion
from app.models.pdc import (
    RentalReceipt, PDCReceived, PDCIssued,
    BankAccount
)
from app.models.finance import Expense, CashflowCommitment
from app.models.loans import Loan, LoanInstalment
from app.models.maintenance import MaintenanceTicket
from app.models.labourcamp import LabourCampUnit, CampResident, CampUtilityReading

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _today():
    return datetime.date.today()

def _this_week_end():
    t = _today()
    return t + datetime.timedelta(days=7)

def _this_month_end():
    t = _today()
    if t.month == 12:
        return datetime.date(t.year + 1, 1, 1) - datetime.timedelta(days=1)
    return datetime.date(t.year, t.month + 1, 1) - datetime.timedelta(days=1)

def _next_month_start():
    t = _today()
    if t.month == 12:
        return datetime.date(t.year + 1, 1, 1)
    return datetime.date(t.year, t.month + 1, 1)

def _next_month_end():
    nms = _next_month_start()
    if nms.month == 12:
        return datetime.date(nms.year + 1, 1, 1) - datetime.timedelta(days=1)
    return datetime.date(nms.year, nms.month + 1, 1) - datetime.timedelta(days=1)

def _month_start():
    t = _today()
    return datetime.date(t.year, t.month, 1)

def _six_months_ago():
    t = _today()
    month = t.month - 6
    year = t.year
    if month <= 0:
        month += 12
        year -= 1
    return datetime.date(year, month, 1)


# ─────────────────────────────────────────────────────────────────────────────
# MD DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/md")
def md_dashboard(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    MD Dashboard — portfolio summary, finance summary, investment KPIs, alerts.
    """
    today = _today()
    week_end = _this_week_end()
    month_end = _this_month_end()
    month_start = _month_start()

    # ── Portfolio Summary ────────────────────────────────────────────────────
    total_properties = db.query(Property).filter(Property.status == "Active").count()
    total_units = db.query(PropertyUnit).count()
    occupied_units = db.query(PropertyUnit).filter(PropertyUnit.status == "Occupied").count()
    vacant_units = total_units - occupied_units
    occupancy_rate = round((occupied_units / total_units * 100), 1) if total_units > 0 else 0.0

    # ── Investment KPIs ──────────────────────────────────────────────────────
    # Latest valuation per property
    latest_val_sub = db.query(
        PropertyValuation.property_id,
        func.max(PropertyValuation.valuation_date).label("max_date")
    ).group_by(PropertyValuation.property_id).subquery()

    latest_vals = db.query(PropertyValuation).join(
        latest_val_sub,
        and_(
            PropertyValuation.property_id == latest_val_sub.c.property_id,
            PropertyValuation.valuation_date == latest_val_sub.c.max_date
        )
    ).all()

    total_market_value = float(sum(v.market_value for v in latest_vals)) if latest_vals else 0.0

    # Total acquisition cost
    acq_costs = db.query(func.sum(PropertyAcquisitionCost.total_acquisition_cost)).scalar()
    total_acquisition_cost = float(acq_costs or 0)

    unrealized_gain = total_market_value - total_acquisition_cost
    capital_appreciation_pct = round((unrealized_gain / total_acquisition_cost * 100), 2) if total_acquisition_cost > 0 else 0.0

    # Loans outstanding
    total_loan_outstanding = float(db.query(func.sum(Loan.outstanding_balance)).filter(
        Loan.status == "Active"
    ).scalar() or 0)
    total_equity = total_market_value - total_loan_outstanding

    # ── Finance Summary ──────────────────────────────────────────────────────
    pdcs_held_count = db.query(PDCReceived).filter(
        PDCReceived.status.in_(["Received", "Under Custody", "Held"])
    ).count()
    pdcs_held_value = float(db.query(func.sum(PDCReceived.cheque_amount)).filter(
        PDCReceived.status.in_(["Received", "Under Custody", "Held"])
    ).scalar() or 0)

    pdcs_issued_uncleared_count = db.query(PDCIssued).filter(
        PDCIssued.status.in_(["Approved", "Issued", "Held by Payee", "Due Soon", "Presented"])
    ).count()
    pdcs_issued_uncleared_value = float(db.query(func.sum(PDCIssued.cheque_amount)).filter(
        PDCIssued.status.in_(["Approved", "Issued", "Held by Payee", "Due Soon", "Presented"])
    ).scalar() or 0)

    # Cash commitments this month
    upcoming_commitments = float(db.query(func.sum(CashflowCommitment.amount)).filter(
        CashflowCommitment.commitment_date >= today,
        CashflowCommitment.commitment_date <= month_end,
        CashflowCommitment.is_settled == False
    ).scalar() or 0)

    # ── PDC Due Summary ──────────────────────────────────────────────────────
    pdcs_due_this_week = db.query(PDCReceived).filter(
        PDCReceived.cheque_date >= today,
        PDCReceived.cheque_date <= week_end,
        PDCReceived.status.in_(["Received", "Under Custody", "Held"])
    ).count()

    # ── Active Leases ────────────────────────────────────────────────────────
    active_leases = db.query(Lease).filter(Lease.status == "Active").count()
    expiring_30d = db.query(LeaseVersion).join(
        Lease, LeaseVersion.lease_id == Lease.lease_id
    ).filter(
        Lease.status == "Active",
        LeaseVersion.is_current_version == True,
        LeaseVersion.contract_end_date >= today,
        LeaseVersion.contract_end_date <= today + datetime.timedelta(days=30)
    ).count()

    # ── Recent Activity (last 10 audit entries) ──────────────────────────────
    try:
        recent_activity = db.query(AuditLog).order_by(
            AuditLog.timestamp.desc()
        ).limit(10).all()
        activity_feed = [
            {
                "id": a.audit_id,
                "action": a.action,
                "module": a.module,
                "entity_reference": None,
                "user_name": a.user.full_name if a.user else "System",
                "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            }
            for a in recent_activity
        ]
    except Exception:
        activity_feed = []

    return {
        "portfolio": {
            "total_properties": total_properties,
            "total_units": total_units,
            "occupied_units": occupied_units,
            "vacant_units": vacant_units,
            "occupancy_rate": occupancy_rate,
        },
        "investment": {
            "total_portfolio_purchase_value": total_acquisition_cost,
            "total_market_value": total_market_value,
            "unrealized_capital_gain": unrealized_gain,
            "capital_appreciation_pct": capital_appreciation_pct,
            "total_loan_outstanding": total_loan_outstanding,
            "total_equity_value": total_equity,
        },
        "finance": {
            "pdcs_held_count": pdcs_held_count,
            "pdcs_held_value": pdcs_held_value,
            "pdcs_issued_uncleared_count": pdcs_issued_uncleared_count,
            "pdcs_issued_uncleared_value": pdcs_issued_uncleared_value,
            "upcoming_commitments_this_month": upcoming_commitments,
            "pdcs_due_this_week": pdcs_due_this_week,
        },
        "leases": {
            "active_leases": active_leases,
            "expiring_next_30_days": expiring_30d,
        },
        "activity_feed": activity_feed,
        "generated_at": datetime.datetime.now().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# FINANCE DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/finance")
def finance_dashboard(
    period: str = Query("this_month", enum=["this_week", "this_month", "next_month"]),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Finance Dashboard — PDC panels, cash flow, expense summary, loan instalments.
    """
    today = _today()
    month_start = _month_start()
    month_end = _this_month_end()
    week_end = _this_week_end()
    next_start = _next_month_start()
    next_end = _next_month_end()

    if period == "this_week":
        p_start, p_end = today, week_end
    elif period == "next_month":
        p_start, p_end = next_start, next_end
    else:  # this_month
        p_start, p_end = month_start, month_end

    # ── PDC Received Panel ───────────────────────────────────────────────────
    held_statuses = ["Received", "Under Custody", "Held", "Due Soon", "Overdue"]

    def pdc_rec_count_val(statuses):
        q = db.query(
            func.count(PDCReceived.pdc_received_id),
            func.coalesce(func.sum(PDCReceived.cheque_amount), 0)
        ).filter(PDCReceived.status.in_(statuses))
        r = q.first()
        return {"count": r[0], "value": float(r[1])}

    pdc_received_panel = {
        "held": pdc_rec_count_val(held_statuses),
        "due_this_week": {
            "count": db.query(PDCReceived).filter(
                PDCReceived.cheque_date >= today,
                PDCReceived.cheque_date <= week_end,
                PDCReceived.status.in_(held_statuses)
            ).count(),
            "value": float(db.query(func.sum(PDCReceived.cheque_amount)).filter(
                PDCReceived.cheque_date >= today,
                PDCReceived.cheque_date <= week_end,
                PDCReceived.status.in_(held_statuses)
            ).scalar() or 0),
        },
        "due_this_month": {
            "count": db.query(PDCReceived).filter(
                PDCReceived.cheque_date >= p_start,
                PDCReceived.cheque_date <= p_end,
                PDCReceived.status.in_(held_statuses)
            ).count(),
            "value": float(db.query(func.sum(PDCReceived.cheque_amount)).filter(
                PDCReceived.cheque_date >= p_start,
                PDCReceived.cheque_date <= p_end,
                PDCReceived.status.in_(held_statuses)
            ).scalar() or 0),
        },
        "submitted": pdc_rec_count_val(["Submitted to Bank", "Deposited"]),
        "cleared_this_month": {
            "count": db.query(PDCReceived).filter(
                PDCReceived.status == "Cleared",
                PDCReceived.cleared_at >= p_start,
                PDCReceived.cleared_at <= p_end
            ).count(),
            "value": float(db.query(func.sum(PDCReceived.cheque_amount)).filter(
                PDCReceived.status == "Cleared",
                PDCReceived.cleared_at >= p_start,
                PDCReceived.cleared_at <= p_end
            ).scalar() or 0),
        },
        "returned_this_month": pdc_rec_count_val(["Returned"]),
        "replaced": pdc_rec_count_val(["Replaced"]),
        "overdue": {
            "count": db.query(PDCReceived).filter(
                or_(
                    PDCReceived.cheque_date < today,
                    PDCReceived.status == "Overdue"
                ),
                PDCReceived.status.in_(held_statuses)
            ).count(),
            "value": float(db.query(func.sum(PDCReceived.cheque_amount)).filter(
                or_(
                    PDCReceived.cheque_date < today,
                    PDCReceived.status == "Overdue"
                ),
                PDCReceived.status.in_(held_statuses)
            ).scalar() or 0),
        },
    }

    # ── PDC Issued Panel ─────────────────────────────────────────────────────
    issued_statuses = ["Approved", "Issued", "Held by Payee", "Due Soon", "Overdue", "Presented"]

    def pdc_iss_count_val(filters):
        q = db.query(
            func.count(PDCIssued.pdc_issued_id),
            func.coalesce(func.sum(PDCIssued.cheque_amount), 0)
        ).filter(*filters)
        r = q.first()
        return {"count": r[0], "value": float(r[1])}

    pdc_issued_panel = {
        "total_uncleared": pdc_iss_count_val([PDCIssued.status.in_(issued_statuses)]),
        "due_this_week": pdc_iss_count_val([
            PDCIssued.cheque_date >= today,
            PDCIssued.cheque_date <= week_end,
            PDCIssued.status.in_(issued_statuses)
        ]),
        "due_this_month": pdc_iss_count_val([
            PDCIssued.cheque_date >= p_start,
            PDCIssued.cheque_date <= p_end,
            PDCIssued.status.in_(issued_statuses)
        ]),
        "by_payee_type": _pdc_issued_by_payee_type(db, issued_statuses),
        "by_bank_account": _pdc_issued_by_bank(db, issued_statuses),
    }

    # ── Cash Flow Forecast ───────────────────────────────────────────────────
    # Build 6-month rolling cash flow (incoming vs outgoing)
    cash_flow = _build_cash_flow(db, today)

    # ── Expense Summary (current month) ─────────────────────────────────────
    expense_summary = _expense_summary_by_category(db, p_start, p_end)

    # ── Loan Instalments upcoming ────────────────────────────────────────────
    upcoming_instalments = []
    try:
        instalments = db.query(LoanInstalment).filter(
            LoanInstalment.due_date >= today,
            LoanInstalment.due_date <= month_end,
            LoanInstalment.status == "Pending"
        ).order_by(LoanInstalment.due_date).all()
        upcoming_instalments = [
            {
                "id": i.instalment_id,
                "loan_id": i.loan_id,
                "due_date": i.due_date.isoformat() if i.due_date else None,
                "total_amount": float(i.total_amount or 0),
                "status": i.status,
            }
            for i in instalments
        ]
    except Exception:
        upcoming_instalments = []

    return {
        "period": period,
        "pdc_received": pdc_received_panel,
        "pdc_issued": pdc_issued_panel,
        "cash_flow": cash_flow,
        "expense_summary": expense_summary,
        "upcoming_loan_instalments": upcoming_instalments,
        "generated_at": datetime.datetime.now().isoformat(),
    }


def _pdc_issued_by_payee_type(db, issued_statuses):
    try:
        rows = db.query(
            PDCIssued.payee_type,
            func.count(PDCIssued.pdc_issued_id),
            func.coalesce(func.sum(PDCIssued.cheque_amount), 0)
        ).filter(
            PDCIssued.status.in_(issued_statuses)
        ).group_by(PDCIssued.payee_type).all()
        return [{"payee_type": r[0], "count": r[1], "value": float(r[2])} for r in rows]
    except Exception:
        return []


def _pdc_issued_by_bank(db, issued_statuses):
    try:
        rows = db.query(
            BankAccount.account_name,
            func.count(PDCIssued.pdc_issued_id),
            func.coalesce(func.sum(PDCIssued.cheque_amount), 0)
        ).join(
            BankAccount, PDCIssued.bank_account_id == BankAccount.account_id
        ).filter(
            PDCIssued.status.in_(issued_statuses)
        ).group_by(BankAccount.account_name).all()
        return [{"bank": r[0], "count": r[1], "value": float(r[2])} for r in rows]
    except Exception:
        return []


def _build_cash_flow(db, today):
    """Build 6-month rolling cash flow data using actual receipts and expenses."""
    from app.models.pdc import RentalReceipt
    from app.models.finance import Expense
    result = []
    for i in range(-2, 4):  # -2 months past, up to 3 months future
        t = today
        month = t.month + i
        year = t.year
        while month <= 0:
            month += 12
            year -= 1
        while month > 12:
            month -= 12
            year += 1
        start = datetime.date(year, month, 1)
        if month == 12:
            end = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
        else:
            end = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)

        incoming = float(db.query(func.sum(RentalReceipt.total_amount)).filter(
            RentalReceipt.receipt_date >= start,
            RentalReceipt.receipt_date <= end,
            RentalReceipt.receipt_status.in_(["Posted", "Partially Allocated", "Fully Allocated"])
        ).scalar() or 0)

        outgoing = float(db.query(func.sum(Expense.total_amount)).filter(
            func.coalesce(Expense.invoice_date, func.date(Expense.created_at)) >= start,
            func.coalesce(Expense.invoice_date, func.date(Expense.created_at)) <= end,
            Expense.approval_status == "Approved"
        ).scalar() or 0)

        result.append({
            "month": f"{year}-{month:02d}",
            "label": start.strftime("%b %Y"),
            "incoming": incoming,
            "outgoing": outgoing,
            "net": incoming - outgoing,
        })
    return result


def _expense_summary_by_category(db, start, end):
    try:
        from app.models.finance import ExpenseCategory
        rows = db.query(
            ExpenseCategory.category_name,
            func.count(Expense.expense_id),
            func.coalesce(func.sum(Expense.amount), 0)
        ).join(
            ExpenseCategory, Expense.category_id == ExpenseCategory.category_id
        ).filter(
            Expense.invoice_date >= start,
            Expense.invoice_date <= end,
        ).group_by(ExpenseCategory.category_name).all()
        return [{"category": r[0], "count": r[1], "total": float(r[2])} for r in rows]
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────────────────
# PROPERTY DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/property")
def property_dashboard(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    today = _today()

    # Occupancy by property
    properties = db.query(Property).filter(Property.status == "Active").all()
    occupancy_by_property = []
    for p in properties:
        total = db.query(PropertyUnit).filter(PropertyUnit.property_id == p.property_id).count()
        occupied = db.query(PropertyUnit).filter(
            PropertyUnit.property_id == p.property_id,
            PropertyUnit.status == "Occupied"
        ).count()
        occupancy_by_property.append({
            "property_id": p.property_id,
            "property_name": p.property_name,
            "total_units": total,
            "occupied_units": occupied,
            "vacant_units": total - occupied,
            "occupancy_rate": round((occupied / total * 100), 1) if total > 0 else 0.0,
        })

    # Lease expiry timeline (next 90 days) — query via LeaseVersion
    expiry_timeline = []
    leases_expiring = db.query(LeaseVersion).join(
        Lease, LeaseVersion.lease_id == Lease.lease_id
    ).filter(
        Lease.status == "Active",
        LeaseVersion.is_current_version == True,
        LeaseVersion.contract_end_date >= today,
        LeaseVersion.contract_end_date <= today + datetime.timedelta(days=90)
    ).order_by(LeaseVersion.contract_end_date).all()

    for lv in leases_expiring:
        days_remaining = (lv.contract_end_date - today).days if lv.contract_end_date else 0
        expiry_timeline.append({
            "lease_id": lv.lease_id,
            "lease_reference": lv.lease.lease_number if lv.lease else lv.lease_id,
            "end_date": lv.contract_end_date.isoformat() if lv.contract_end_date else None,
            "days_remaining": days_remaining,
            "urgency": "Critical" if days_remaining <= 14 else ("Warning" if days_remaining <= 30 else "Notice"),
        })

    # Vacancy trend (last 6 months — approximate from current unit status)
    total_units = db.query(PropertyUnit).count()
    total_occupied = db.query(PropertyUnit).filter(PropertyUnit.status == "Occupied").count()
    vacancy_trend = [
        {"month": "Current", "vacant": total_units - total_occupied, "occupied": total_occupied}
    ]

    return {
        "occupancy_by_property": occupancy_by_property,
        "lease_expiry_timeline": expiry_timeline,
        "vacancy_trend": vacancy_trend,
        "summary": {
            "total_properties": len(properties),
            "total_units": total_units,
            "total_occupied": total_occupied,
            "total_vacant": total_units - total_occupied,
            "overall_occupancy_rate": round((total_occupied / total_units * 100), 1) if total_units > 0 else 0.0,
            "leases_expiring_90_days": len(leases_expiring),
        },
        "generated_at": datetime.datetime.now().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# MAINTENANCE DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/maintenance")
def maintenance_dashboard(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    today = _today()
    month_start = _month_start()

    # Ticket counts by status
    all_statuses = ["Open", "Assigned", "In Progress", "Pending Parts", "Completed", "Verified", "Closed"]
    status_counts = {}
    for s in all_statuses:
        status_counts[s.lower().replace(" ", "_")] = db.query(MaintenanceTicket).filter(
            MaintenanceTicket.status == s
        ).count()

    open_count = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.status.in_(["Open", "Assigned", "In Progress", "Pending Parts"])
    ).count()

    # Overdue tickets (created > 7 days ago and still open)
    overdue_threshold = today - datetime.timedelta(days=7)
    overdue_count = 0
    try:
        overdue_count = db.query(MaintenanceTicket).filter(
            MaintenanceTicket.status.in_(["Open", "Assigned"]),
            MaintenanceTicket.created_at <= overdue_threshold
        ).count()
    except Exception:
        pass

    # Category breakdown
    category_breakdown = []
    try:
        from app.models.maintenance import MaintenanceCategory
        rows = db.query(
            MaintenanceCategory.category_name,
            func.count(MaintenanceTicket.ticket_id)
        ).join(
            MaintenanceCategory, MaintenanceTicket.category_id == MaintenanceCategory.category_id
        ).filter(
            MaintenanceTicket.status.in_(["Open", "Assigned", "In Progress", "Pending Parts"])
        ).group_by(MaintenanceCategory.category_name).all()
        category_breakdown = [{"category": r[0], "count": r[1]} for r in rows]
    except Exception:
        pass

    # Monthly cost trend (from expenses linked to maintenance)
    cost_trend = []
    try:
        rows = db.query(
            func.strftime('%Y-%m', Expense.invoice_date).label("month"),
            func.coalesce(func.sum(Expense.amount), 0)
        ).filter(
            Expense.invoice_date >= _six_months_ago(),
            Expense.maintenance_ticket_id.isnot(None)
        ).group_by("month").order_by("month").all()
        cost_trend = [{"month": r[0], "cost": float(r[1])} for r in rows]
    except Exception:
        pass

    return {
        "summary": {
            "total_open": open_count,
            "overdue": overdue_count,
            **status_counts,
        },
        "category_breakdown": category_breakdown,
        "cost_trend": cost_trend,
        "generated_at": datetime.datetime.now().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# LABOUR CAMP DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/labour-camp")
def labour_camp_dashboard(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    today = _today()

    total_units = db.query(LabourCampUnit).count()
    occupied_units = db.query(LabourCampUnit).filter(LabourCampUnit.status == "Occupied").count()
    vacant_units = total_units - occupied_units

    total_capacity = db.query(func.sum(LabourCampUnit.total_capacity)).scalar() or 0
    total_residents = db.query(CampResident).filter(CampResident.status == "Active").count()

    occupancy_rate = round((occupied_units / total_units * 100), 1) if total_units > 0 else 0.0

    # Utility consumption (last 30 days)
    thirty_days_ago = today - datetime.timedelta(days=30)
    utility_totals = {}
    try:
        rows = db.query(
            CampUtilityReading.utility_type,
            func.coalesce(func.sum(CampUtilityReading.consumption), 0)
        ).filter(
            CampUtilityReading.reading_date >= thirty_days_ago
        ).group_by(CampUtilityReading.utility_type).all()
        utility_totals = {r[0]: float(r[1]) for r in rows}
    except Exception:
        pass

    # Units by status
    unit_status_breakdown = []
    try:
        rows = db.query(
            LabourCampUnit.status,
            func.count(LabourCampUnit.unit_id)
        ).group_by(LabourCampUnit.status).all()
        unit_status_breakdown = [{"status": r[0], "count": r[1]} for r in rows]
    except Exception:
        pass

    return {
        "summary": {
            "total_units": total_units,
            "occupied_units": occupied_units,
            "vacant_units": vacant_units,
            "total_capacity_beds": int(total_capacity),
            "total_active_residents": total_residents,
            "occupancy_rate": occupancy_rate,
        },
        "unit_status_breakdown": unit_status_breakdown,
        "utility_totals_last_30d": utility_totals,
        "generated_at": datetime.datetime.now().isoformat(),
    }
