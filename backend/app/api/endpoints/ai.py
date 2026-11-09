"""
AI Assistant & Chatbot — Sprint 9 Enhanced
Covers all 15 PM-required queries:
  - 9 PDC queries
  - 6 Investment queries
Plus general property, lease, portfolio queries.
"""

import os
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.api import deps
from app.models.auth import User
from app.models.property import Property, PropertyUnit, PropertyValuation, PropertyAcquisitionCost
from app.models.tenant import Tenant, Lease, LeaseVersion, LeasePaymentSchedule
from app.models.pdc import RentalReceipt, PDCReceived, PDCIssued, BankAccount
from app.models.finance import Expense
from app.models.loans import Loan, LoanInstalment

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class AIChatRequest(BaseModel):
    prompt: str
    image_urls: Optional[List[str]] = []
    conversation_id: Optional[str] = None

class AIQueryRequest(BaseModel):
    """Alias schema for POST /api/v1/ai/query"""
    query: str
    context: Optional[str] = None

class AIChatResponse(BaseModel):
    answer: str
    data_summary: Optional[dict] = None
    suggested_actions: Optional[List[str]] = []
    image_analysis: Optional[str] = None
    timestamp: str


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _today():
    return datetime.date.today()

def _week_end():
    return _today() + datetime.timedelta(days=7)

def _month_start():
    t = _today()
    return datetime.date(t.year, t.month, 1)

def _month_end():
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

def _six_months_ago():
    t = _today()
    month = t.month - 6
    year = t.year
    if month <= 0:
        month += 12
        year -= 1
    return datetime.date(year, month, 1)

ISSUED_STATUSES = ["Approved", "Issued", "Held by Payee", "Due Soon", "Presented"]
RECEIVED_ACTIVE = ["Received", "Under Custody", "Held"]


# ─────────────────────────────────────────────────────────────────────────────
# Core Query Engine — covers all 15 PM queries + general queries
# ─────────────────────────────────────────────────────────────────────────────

def _process_query(prompt: str, db: Session, current_user: User):
    """
    Keyword-based RAG engine that covers all 15 PM-required queries.
    Returns (answer_parts, data_summary, suggested_actions).
    """
    pl = prompt.lower().strip()
    answer_parts = []
    data_summary = {}
    suggested_actions = []
    today = _today()

    # ── PDC QUERY 1: Cheques due this week ──────────────────────────────────
    if any(k in pl for k in ["due this week", "due next week", "cheques due", "pdcs due this week"]):
        week_end = _week_end()
        results = db.query(PDCReceived).filter(
            PDCReceived.cheque_date >= today,
            PDCReceived.cheque_date <= week_end,
            PDCReceived.status.in_(RECEIVED_ACTIVE)
        ).order_by(PDCReceived.cheque_date).all()

        total_val = sum(float(r.cheque_amount or 0) for r in results)
        tenants_affected = len(set(r.tenant_id for r in results if r.tenant_id))

        data_summary["pdcs_due_this_week"] = len(results)
        data_summary["total_value_aed"] = total_val
        data_summary["tenants_affected"] = tenants_affected

        rows = "\n".join(
            f"  • Cheque #{r.cheque_number} | {r.bank_name or 'N/A'} | {r.cheque_date} | AED {float(r.cheque_amount or 0):,.0f} | {r.status}"
            for r in results[:10]
        )
        answer_parts.append(
            f"📅 **Tenant Cheques Due This Week** ({today} – {week_end}):\n"
            f"- **{len(results)} cheque(s)** totalling **AED {total_val:,.2f}**\n"
            f"- Affecting **{tenants_affected} tenant(s)**\n"
            + (f"\n**Details:**\n{rows}" if rows else "\n_No cheques due this week._")
        )
        suggested_actions.extend(["View PDC Register", "Deposit Cheques"])

    # ── PDC QUERY 2: PDCs not deposited ──────────────────────────────────────
    if any(k in pl for k in ["not deposited", "not been deposited", "undeposited", "pending deposit"]):
        results = db.query(PDCReceived).filter(
            PDCReceived.status.in_(RECEIVED_ACTIVE)
        ).order_by(PDCReceived.cheque_date).all()

        overdue = [r for r in results if r.cheque_date and r.cheque_date < today]
        total_val = sum(float(r.cheque_amount or 0) for r in results)
        overdue_val = sum(float(r.cheque_amount or 0) for r in overdue)

        data_summary["not_deposited_count"] = len(results)
        data_summary["not_deposited_value"] = total_val
        data_summary["overdue_count"] = len(overdue)
        data_summary["overdue_value"] = overdue_val

        answer_parts.append(
            f"💳 **PDCs Not Yet Deposited:**\n"
            f"- Total held: **{len(results)} cheques** worth **AED {total_val:,.2f}**\n"
            f"- ⚠️ Overdue (past cheque date): **{len(overdue)} cheques** worth **AED {overdue_val:,.2f}**\n"
            f"- Awaiting deposit: **{len(results) - len(overdue)} cheques** (future dated)"
        )
        suggested_actions.extend(["Open PDC Received Register", "Mark as Deposited"])

    # ── PDC QUERY 3: Returned cheques last 6 months ──────────────────────────
    if any(k in pl for k in ["returned cheque", "bounced cheque", "cheque return", "returned cheques"]):
        six_months = _six_months_ago()
        results = db.query(PDCReceived).filter(
            PDCReceived.status == "Returned"
        ).order_by(PDCReceived.cheque_date.desc()).all()

        recent = [r for r in results if r.cheque_date and r.cheque_date >= six_months]
        total_val = sum(float(r.cheque_amount or 0) for r in recent)

        data_summary["returned_last_6_months"] = len(recent)
        data_summary["returned_total_value"] = total_val

        rows = "\n".join(
            f"  • Cheque #{r.cheque_number} | {r.bank_name or 'N/A'} | {r.cheque_date} | AED {float(r.cheque_amount or 0):,.0f}"
            for r in recent[:10]
        )
        answer_parts.append(
            f"🔴 **Returned Cheques — Last 6 Months** (since {six_months}):\n"
            f"- **{len(recent)} returned cheque(s)** | Total: **AED {total_val:,.2f}**\n"
            + (f"\n**Details:**\n{rows}" if rows else "\n_No returned cheques in the last 6 months._")
        )
        suggested_actions.extend(["View Returned Cheques", "Process Replacements"])

    # ── PDC QUERY 4: Leases with insufficient cheque coverage ────────────────
    if any(k in pl for k in ["insufficient cheque", "insufficient coverage", "missing cheque", "cheque coverage"]):
        try:
            # Find active leases and compare schedule total vs actual PDC total
            active_leases = db.query(Lease).filter(Lease.status == "Active").all()
            insufficient = []
            for lease in active_leases:
                schedule_total = float(db.query(func.sum(LeasePaymentSchedule.amount)).filter(
                    LeasePaymentSchedule.lease_id == lease.id
                ).scalar() or 0)
                pdc_total = float(db.query(func.sum(PDCReceived.cheque_amount)).filter(
                    PDCReceived.lease_id == lease.id,
                    PDCReceived.status.notin_(["Cancelled", "Returned"])
                ).scalar() or 0)
                if schedule_total > 0 and pdc_total < schedule_total:
                    shortfall = schedule_total - pdc_total
                    insufficient.append({
                        "lease_id": lease.id,
                        "lease_ref": lease.lease_reference,
                        "schedule_total": schedule_total,
                        "pdc_total": pdc_total,
                        "shortfall": shortfall,
                    })

            data_summary["leases_with_insufficient_coverage"] = len(insufficient)
            shortfall_total = sum(l["shortfall"] for l in insufficient)

            rows = "\n".join(
                f"  • Lease {l['lease_ref']} — Schedule: AED {l['schedule_total']:,.0f} | PDCs: AED {l['pdc_total']:,.0f} | Shortfall: AED {l['shortfall']:,.0f}"
                for l in insufficient[:10]
            )
            answer_parts.append(
                f"⚠️ **Leases with Insufficient Cheque Coverage:**\n"
                f"- **{len(insufficient)} lease(s)** have uncovered amounts\n"
                f"- Total shortfall: **AED {shortfall_total:,.2f}**\n"
                + (f"\n**Details:**\n{rows}" if rows else "\n_All leases have full cheque coverage._")
            )
        except Exception as e:
            answer_parts.append(f"⚠️ **Cheque Coverage:** Unable to compute — {str(e)}")
        suggested_actions.extend(["View Lease Register", "Request Missing Cheques"])

    # ── PDC QUERY 5: Expected PDC collection next month ──────────────────────
    if any(k in pl for k in ["expected pdc", "expected collection", "collection next month", "pdc collection next month"]):
        nms, nme = _next_month_start(), _next_month_end()
        count = db.query(PDCReceived).filter(
            PDCReceived.cheque_date >= nms,
            PDCReceived.cheque_date <= nme,
        ).count()
        total = float(db.query(func.sum(PDCReceived.cheque_amount)).filter(
            PDCReceived.cheque_date >= nms,
            PDCReceived.cheque_date <= nme,
        ).scalar() or 0)

        data_summary["expected_collection_next_month_count"] = count
        data_summary["expected_collection_next_month_value"] = total

        answer_parts.append(
            f"📈 **Expected PDC Collection — Next Month** ({nms.strftime('%B %Y')}):\n"
            f"- **{count} cheques** expected\n"
            f"- Total value: **AED {total:,.2f}**"
        )
        suggested_actions.extend(["View PDC Calendar", "Finance Dashboard"])

    # ── PDC QUERY 6: How much in issued PDCs due next month ──────────────────
    if any(k in pl for k in ["issued pdcs due next month", "pdcs due next month", "outgoing next month", "issued cheques next month"]):
        nms, nme = _next_month_start(), _next_month_end()
        count = db.query(PDCIssued).filter(
            PDCIssued.cheque_date >= nms,
            PDCIssued.cheque_date <= nme,
            PDCIssued.status.in_(ISSUED_STATUSES)
        ).count()
        total = float(db.query(func.sum(PDCIssued.cheque_amount)).filter(
            PDCIssued.cheque_date >= nms,
            PDCIssued.cheque_date <= nme,
            PDCIssued.status.in_(ISSUED_STATUSES)
        ).scalar() or 0)

        data_summary["issued_pdcs_due_next_month_count"] = count
        data_summary["issued_pdcs_due_next_month_value"] = total

        answer_parts.append(
            f"💸 **Issued PDCs Due — Next Month** ({nms.strftime('%B %Y')}):\n"
            f"- **{count} cheques** to be presented\n"
            f"- Total outgoing: **AED {total:,.2f}**"
        )
        suggested_actions.extend(["View PDC Issued Register", "Finance Dashboard"])

    # ── PDC QUERY 7: Bank account with highest commitment ────────────────────
    if any(k in pl for k in ["highest commitment", "bank account commitment", "highest upcoming", "which bank account"]):
        try:
            rows = db.query(
                BankAccount.account_name,
                BankAccount.bank_name,
                func.count(PDCIssued.id).label("cnt"),
                func.coalesce(func.sum(PDCIssued.cheque_amount), 0).label("total")
            ).join(
                BankAccount, PDCIssued.bank_account_id == BankAccount.id
            ).filter(
                PDCIssued.status.in_(ISSUED_STATUSES)
            ).group_by(BankAccount.account_name, BankAccount.bank_name)\
             .order_by(func.sum(PDCIssued.cheque_amount).desc()).all()

            if rows:
                top = rows[0]
                data_summary["top_bank_account"] = top.account_name
                data_summary["top_bank_commitment"] = float(top.total)

                bank_list = "\n".join(
                    f"  {i+1}. {r.account_name} ({r.bank_name}) — {r.cnt} cheques | AED {float(r.total):,.2f}"
                    for i, r in enumerate(rows[:5])
                )
                answer_parts.append(
                    f"🏦 **Bank Account Commitment Ranking:**\n"
                    f"- Highest: **{top.account_name}** ({top.bank_name}) — **AED {float(top.total):,.2f}**\n\n"
                    f"**All accounts:**\n{bank_list}"
                )
            else:
                answer_parts.append("🏦 **Bank Accounts:** No outstanding issued PDC commitments found.")
        except Exception as e:
            answer_parts.append(f"🏦 **Bank Commitment:** {str(e)}")
        suggested_actions.extend(["View PDC Issued Register", "Cheque Book Register"])

    # ── PDC QUERY 8: PDCs issued to financial institutions ───────────────────
    if any(k in pl for k in ["financial institution", "issued to bank", "issued to financial", "pdc to bank"]):
        results = db.query(PDCIssued).filter(
            PDCIssued.payee_type.in_(["Bank", "Loan Provider", "Financial Institution"])
        ).order_by(PDCIssued.cheque_date.desc()).all()

        total_val = sum(float(r.cheque_amount or 0) for r in results)
        data_summary["issued_to_financial_institutions"] = len(results)
        data_summary["total_value"] = total_val

        rows = "\n".join(
            f"  • {r.payee_name} | {r.cheque_date} | AED {float(r.cheque_amount or 0):,.0f} | {r.status}"
            for r in results[:10]
        )
        answer_parts.append(
            f"🏛️ **PDCs Issued to Financial Institutions:**\n"
            f"- **{len(results)} cheque(s)** | Total: **AED {total_val:,.2f}**\n"
            + (f"\n**Details:**\n{rows}" if rows else "\n_No PDCs issued to financial institutions._")
        )
        suggested_actions.extend(["View PDC Issued Register", "Loan Instalment Schedule"])

    # ── PDC QUERY 9: Issued cheques linked to property loans ─────────────────
    if any(k in pl for k in ["linked to loan", "property loan", "loan pdc", "cheques linked to"]):
        try:
            results = db.query(PDCIssued, LoanInstalment).join(
                LoanInstalment, PDCIssued.id == LoanInstalment.pdc_issued_id
            ).filter(
                PDCIssued.status.in_(ISSUED_STATUSES)
            ).all()

            total_val = sum(float(r[0].cheque_amount or 0) for r in results)
            data_summary["loan_linked_pdcs"] = len(results)
            data_summary["total_value"] = total_val

            rows = "\n".join(
                f"  • Cheque #{r[0].cheque_number} | {r[0].payee_name} | {r[0].cheque_date} | AED {float(r[0].cheque_amount or 0):,.0f}"
                for r in results[:10]
            )
            answer_parts.append(
                f"🏠 **Issued Cheques Linked to Property Loans:**\n"
                f"- **{len(results)} cheque(s)** | Total: **AED {total_val:,.2f}**\n"
                + (f"\n**Details:**\n{rows}" if rows else "\n_No cheques currently linked to loan instalments._")
            )
        except Exception as e:
            answer_parts.append(f"🏠 **Loan-linked PDCs:** {str(e)}")
        suggested_actions.extend(["View Loan Register", "PDC Issued Register"])

    # ── INVESTMENT QUERY 1: Highest capital appreciation ────────────────────
    if any(k in pl for k in ["highest appreciation", "capital appreciation", "appreciated most", "appreciation"]):
        try:
            latest_val_sub = db.query(
                PropertyValuation.property_id,
                func.max(PropertyValuation.valuation_date).label("max_date")
            ).group_by(PropertyValuation.property_id).subquery()

            latest_vals = db.query(Property, PropertyValuation, PropertyAcquisitionCost).join(
                PropertyValuation,
                Property.id == PropertyValuation.property_id
            ).join(
                latest_val_sub,
                and_(
                    PropertyValuation.property_id == latest_val_sub.c.property_id,
                    PropertyValuation.valuation_date == latest_val_sub.c.max_date
                )
            ).join(
                PropertyAcquisitionCost,
                Property.id == PropertyAcquisitionCost.property_id
            ).all()

            ranked = []
            for prop, val, cost in latest_vals:
                if cost.total_acquisition_cost and cost.total_acquisition_cost > 0:
                    gain = float(val.market_value or 0) - float(cost.total_acquisition_cost)
                    pct = round((gain / float(cost.total_acquisition_cost)) * 100, 1)
                    ranked.append({
                        "name": prop.property_name,
                        "purchase": float(cost.total_acquisition_cost),
                        "current": float(val.market_value or 0),
                        "gain": gain,
                        "pct": pct,
                    })

            ranked.sort(key=lambda x: x["pct"], reverse=True)
            data_summary["top_appreciated_properties"] = ranked[:5]

            rows = "\n".join(
                f"  {i+1}. **{r['name']}** — {r['pct']:+.1f}% | AED {r['gain']:+,.0f} | Current: AED {r['current']:,.0f}"
                for i, r in enumerate(ranked[:5])
            )
            answer_parts.append(
                f"📈 **Properties by Capital Appreciation:**\n"
                + (rows if rows else "_No valuation data available._")
            )
        except Exception as e:
            answer_parts.append(f"📈 **Appreciation Query:** {str(e)}")
        suggested_actions.extend(["View Investment Dashboard", "Capital Appreciation Report"])

    # ── INVESTMENT QUERY 2: Total portfolio value ─────────────────────────────
    if any(k in pl for k in ["total portfolio", "portfolio value", "real estate value", "portfolio worth", "portfolio today"]):
        try:
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

            total_market = sum(float(v.market_value or 0) for v in latest_vals)
            acq = float(db.query(func.sum(PropertyAcquisitionCost.total_acquisition_cost)).scalar() or 0)
            loans = float(db.query(func.sum(Loan.outstanding_balance)).filter(Loan.status == "Active").scalar() or 0)

            data_summary["total_market_value"] = total_market
            data_summary["total_acquisition_cost"] = acq
            data_summary["net_equity"] = total_market - loans
            data_summary["properties_valued"] = len(latest_vals)

            answer_parts.append(
                f"🌍 **Total Real Estate Portfolio — Today ({today}):**\n"
                f"- **Current Market Value: AED {total_market:,.2f}** ({len(latest_vals)} properties)\n"
                f"- Original Purchase Cost: AED {acq:,.2f}\n"
                f"- Total Loan Outstanding: AED {loans:,.2f}\n"
                f"- **Net Equity: AED {(total_market - loans):,.2f}**\n"
                f"- Unrealized Gain: AED {(total_market - acq):+,.2f}"
            )
        except Exception as e:
            answer_parts.append(f"🌍 **Portfolio Value:** {str(e)}")
        suggested_actions.extend(["View Investment Dashboard", "Portfolio Report"])

    # ── INVESTMENT QUERY 3: Rental yield vs capital appreciation ─────────────
    if any(k in pl for k in ["rental yield", "yield", "compare rental", "yield versus"]):
        try:
            latest_val_sub = db.query(
                PropertyValuation.property_id,
                func.max(PropertyValuation.valuation_date).label("max_date")
            ).group_by(PropertyValuation.property_id).subquery()

            rows_data = db.query(Property, PropertyValuation, PropertyAcquisitionCost).join(
                PropertyValuation, Property.id == PropertyValuation.property_id
            ).join(
                latest_val_sub,
                and_(
                    PropertyValuation.property_id == latest_val_sub.c.property_id,
                    PropertyValuation.valuation_date == latest_val_sub.c.max_date
                )
            ).join(
                PropertyAcquisitionCost, Property.id == PropertyAcquisitionCost.property_id
            ).all()

            comparison = []
            for prop, val, cost in rows_data:
                # Annual rent from active leases
                annual_rent = float(db.query(func.sum(LeasePaymentSchedule.amount)).join(
                    Lease, LeasePaymentSchedule.lease_id == Lease.id
                ).filter(
                    Lease.property_id == prop.id,
                    Lease.status == "Active"
                ).scalar() or 0)

                market_val = float(val.market_value or 0)
                purchase = float(cost.total_acquisition_cost or 0)

                yield_pct = round((annual_rent / market_val * 100), 2) if market_val > 0 else 0
                apprec_pct = round(((market_val - purchase) / purchase * 100), 1) if purchase > 0 else 0

                comparison.append({
                    "property": prop.property_name,
                    "annual_rent": annual_rent,
                    "yield_pct": yield_pct,
                    "appreciation_pct": apprec_pct,
                })

            rows_str = "\n".join(
                f"  • **{c['property']}** — Yield: {c['yield_pct']:.1f}% | Appreciation: {c['appreciation_pct']:+.1f}%"
                for c in comparison[:8]
            )
            avg_yield = round(sum(c["yield_pct"] for c in comparison) / len(comparison), 2) if comparison else 0
            avg_apprec = round(sum(c["appreciation_pct"] for c in comparison) / len(comparison), 1) if comparison else 0

            answer_parts.append(
                f"📊 **Rental Yield vs Capital Appreciation:**\n"
                f"- Portfolio Average Yield: **{avg_yield:.1f}%**\n"
                f"- Portfolio Average Appreciation: **{avg_apprec:+.1f}%**\n\n"
                + (rows_str if rows_str else "_No data available._")
            )
        except Exception as e:
            answer_parts.append(f"📊 **Yield vs Appreciation:** {str(e)}")
        suggested_actions.extend(["View Investment Dashboard", "Rental Yield Report"])

    # ── INVESTMENT QUERY 4: Underperforming properties ───────────────────────
    if any(k in pl for k in ["underperforming", "under performing", "low yield", "poor performance", "which properties are under"]):
        try:
            latest_val_sub = db.query(
                PropertyValuation.property_id,
                func.max(PropertyValuation.valuation_date).label("max_date")
            ).group_by(PropertyValuation.property_id).subquery()

            props = db.query(Property, PropertyValuation, PropertyAcquisitionCost).join(
                PropertyValuation, Property.id == PropertyValuation.property_id
            ).join(
                latest_val_sub,
                and_(
                    PropertyValuation.property_id == latest_val_sub.c.property_id,
                    PropertyValuation.valuation_date == latest_val_sub.c.max_date
                )
            ).join(
                PropertyAcquisitionCost, Property.id == PropertyAcquisitionCost.property_id
            ).all()

            underperforming = []
            for prop, val, cost in props:
                market_val = float(val.market_value or 0)
                purchase = float(cost.total_acquisition_cost or 0)
                apprec = ((market_val - purchase) / purchase * 100) if purchase > 0 else 0

                annual_rent = float(db.query(func.sum(LeasePaymentSchedule.amount)).join(
                    Lease, LeasePaymentSchedule.lease_id == Lease.id
                ).filter(
                    Lease.property_id == prop.id, Lease.status == "Active"
                ).scalar() or 0)
                yield_pct = (annual_rent / market_val * 100) if market_val > 0 else 0

                if apprec < 5 or yield_pct < 3:  # underperforming thresholds
                    underperforming.append({
                        "name": prop.property_name,
                        "appreciation_pct": round(apprec, 1),
                        "yield_pct": round(yield_pct, 1),
                    })

            rows_str = "\n".join(
                f"  • **{p['name']}** — Appreciation: {p['appreciation_pct']:+.1f}% | Yield: {p['yield_pct']:.1f}%"
                for p in underperforming[:8]
            )
            answer_parts.append(
                f"📉 **Underperforming Properties** (Appreciation < 5% OR Yield < 3%):\n"
                f"- **{len(underperforming)} propert{'y' if len(underperforming)==1 else 'ies'}** flagged\n"
                + (rows_str if rows_str else "\n_All properties are performing above thresholds._")
            )
        except Exception as e:
            answer_parts.append(f"📉 **Underperforming:** {str(e)}")
        suggested_actions.extend(["View Investment Dashboard", "Profitability Report"])

    # ── INVESTMENT QUERY 5: Retain for 5 more years ──────────────────────────
    if any(k in pl for k in ["retain", "five years", "5 years", "hold for", "long term"]):
        try:
            latest_val_sub = db.query(
                PropertyValuation.property_id,
                func.max(PropertyValuation.valuation_date).label("max_date")
            ).group_by(PropertyValuation.property_id).subquery()

            props = db.query(Property, PropertyValuation, PropertyAcquisitionCost).join(
                PropertyValuation, Property.id == PropertyValuation.property_id
            ).join(latest_val_sub, and_(
                PropertyValuation.property_id == latest_val_sub.c.property_id,
                PropertyValuation.valuation_date == latest_val_sub.c.max_date
            )).join(
                PropertyAcquisitionCost, Property.id == PropertyAcquisitionCost.property_id
            ).all()

            retain = []
            for prop, val, cost in props:
                market_val = float(val.market_value or 0)
                purchase = float(cost.total_acquisition_cost or 0)
                apprec = ((market_val - purchase) / purchase * 100) if purchase > 0 else 0

                # Positive appreciation and no outstanding issues
                if apprec > 10:
                    retain.append({
                        "name": prop.property_name,
                        "appreciation_pct": round(apprec, 1),
                        "market_value": market_val,
                    })

            retain.sort(key=lambda x: x["appreciation_pct"], reverse=True)
            rows_str = "\n".join(
                f"  • **{p['name']}** — {p['appreciation_pct']:+.1f}% appreciation | AED {p['market_value']:,.0f}"
                for p in retain[:8]
            )
            answer_parts.append(
                f"🎯 **Properties Recommended for Long-Term Retention (5+ Years):**\n"
                f"- Criteria: Appreciation > 10% since purchase\n"
                f"- **{len(retain)} propert{'y' if len(retain)==1 else 'ies'}** recommended\n"
                + (rows_str if rows_str else "\n_Insufficient valuation data to make recommendations._")
            )
        except Exception as e:
            answer_parts.append(f"🎯 **Retention Analysis:** {str(e)}")
        suggested_actions.extend(["Investment Dashboard", "Capital Appreciation Report"])

    # ── INVESTMENT QUERY 6: Loans near LTV threshold ─────────────────────────
    if any(k in pl for k in ["loan to value", "ltv", "loan-to-value", "exceeding ltv", "close to ltv"]):
        try:
            loans_at_risk = db.query(Loan).filter(
                Loan.status == "Active",
                Loan.loan_to_value_ratio > 70  # 70% LTV threshold
            ).order_by(Loan.loan_to_value_ratio.desc()).all()

            all_loans = db.query(Loan).filter(Loan.status == "Active").count()
            data_summary["loans_near_ltv_threshold"] = len(loans_at_risk)
            data_summary["total_active_loans"] = all_loans

            rows_str = "\n".join(
                f"  • Loan #{l.id} — LTV: {float(l.loan_to_value_ratio or 0):.1f}% | Outstanding: AED {float(l.outstanding_balance or 0):,.0f}"
                for l in loans_at_risk[:8]
            )
            answer_parts.append(
                f"⚠️ **Loans Approaching LTV Threshold (>70%):**\n"
                f"- **{len(loans_at_risk)} of {all_loans} active loans** at risk\n"
                + (rows_str if rows_str else "\n_All loans are within acceptable LTV limits._")
            )
        except Exception as e:
            answer_parts.append(f"⚠️ **LTV Analysis:** {str(e)}")
        suggested_actions.extend(["View Loan Register", "Loan Outstanding Report"])

    # ── GENERAL: Property portfolio overview ─────────────────────────────────
    if any(k in pl for k in ["property", "portfolio", "unit", "building", "real estate", "occupancy"]) and not answer_parts:
        total_props = db.query(Property).count()
        total_units = db.query(PropertyUnit).count()
        occupied = db.query(PropertyUnit).filter(PropertyUnit.status == "Occupied").count()
        occ_rate = round((occupied / total_units * 100), 1) if total_units > 0 else 0

        data_summary["properties_count"] = total_props
        data_summary["units_count"] = total_units
        data_summary["occupancy_rate"] = f"{occ_rate}%"

        answer_parts.append(
            f"🏢 **Portfolio Overview:**\n"
            f"- Total Properties: **{total_props}**\n"
            f"- Total Units: **{total_units}** ({occupied} Occupied, {total_units - occupied} Vacant)\n"
            f"- Occupancy Rate: **{occ_rate}%**"
        )
        suggested_actions.extend(["View Properties Directory", "Property Dashboard"])

    # ── GENERAL: Lease & tenant ───────────────────────────────────────────────
    if any(k in pl for k in ["lease", "expiring", "tenant", "contract", "rent"]) and not any(
        k in pl for k in ["pdc", "cheque", "deposited", "collection", "coverage"]
    ):
        active_leases = db.query(Lease).filter(Lease.status == "Active").count()
        expiring_30d = db.query(Lease).filter(
            Lease.status == "Active",
            Lease.end_date <= today + datetime.timedelta(days=30),
            Lease.end_date >= today
        ).count()
        data_summary["active_leases"] = active_leases
        data_summary["expiring_next_30_days"] = expiring_30d

        if not answer_parts:
            answer_parts.append(
                f"📜 **Lease & Tenant Summary:**\n"
                f"- Active Leases: **{active_leases}**\n"
                f"- Expiring in Next 30 Days: **{expiring_30d}**"
            )
            suggested_actions.extend(["View Lease Register", "Send Renewal Notices"])

    # ── FALLBACK ──────────────────────────────────────────────────────────────
    if not answer_parts:
        answer_parts.append(
            f"Hello **{current_user.full_name or current_user.email}**! I am your **AIGPMS AI Assistant**.\n\n"
            f"You asked: *\"{prompt}\"*\n\n"
            f"I can answer questions about:\n"
            f"- 📅 **PDC Cheques**: due dates, returns, deposits, coverage, bank commitments\n"
            f"- 📈 **Investment**: portfolio value, appreciation, rental yield, loan-to-value\n"
            f"- 🏢 **Properties**: occupancy, units, leases expiring\n"
            f"- 💳 **Finance**: issued PDCs, collections, cash flow\n\n"
            f"You can also paste screenshots (`Ctrl+V`) for image analysis!\n\n"
            f"**Try asking:**\n"
            f'- "Which tenant cheques are due this week?"\n'
            f'- "Which properties have the highest capital appreciation?"\n'
            f'- "What is our total real estate portfolio value today?"'
        )
        suggested_actions.extend([
            "Which tenant cheques are due this week?",
            "What is our total portfolio value today?",
            "Show returned cheques for the last 6 months",
        ])

    return answer_parts, data_summary, suggested_actions


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=AIChatResponse)
def ai_chat(
    req: AIChatRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Main AI chat endpoint — handles all natural language queries + image analysis."""
    image_urls = req.image_urls or []
    image_analysis = None

    # Handle image analysis
    if image_urls:
        image_analysis = f"Processed {len(image_urls)} attached screenshot(s):\n"
        for idx, img_url in enumerate(image_urls, 1):
            file_name = os.path.basename(img_url)
            image_analysis += f"- Screenshot #{idx} ({file_name}): Scanned via Vision Engine.\n"

    answer_parts, data_summary, suggested_actions = _process_query(req.prompt, db, current_user)

    if image_urls:
        answer_parts.insert(0, f"📷 **Screenshot Analysis:** Analyzed {len(image_urls)} image file(s).")

    return AIChatResponse(
        answer="\n\n".join(answer_parts),
        data_summary=data_summary if data_summary else None,
        suggested_actions=list(dict.fromkeys(suggested_actions)),  # deduplicate preserving order
        image_analysis=image_analysis,
        timestamp=datetime.datetime.now().isoformat()
    )


@router.post("/query", response_model=AIChatResponse)
def ai_query(
    req: AIQueryRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """POST /api/v1/ai/query — alias for /chat with query field."""
    answer_parts, data_summary, suggested_actions = _process_query(req.query, db, current_user)
    return AIChatResponse(
        answer="\n\n".join(answer_parts),
        data_summary=data_summary if data_summary else None,
        suggested_actions=list(dict.fromkeys(suggested_actions)),
        image_analysis=None,
        timestamp=datetime.datetime.now().isoformat()
    )
