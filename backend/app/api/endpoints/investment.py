from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from decimal import Decimal

from app.database.session import get_db
from app.models.property import Property, TitleDeed, PropertyAcquisitionCost, PropertyValuation
from app.models.auth import User
from app.api import deps

router = APIRouter()

@router.get("/dashboard", response_model=Dict[str, Any])
def get_investment_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get all investment KPIs for the dashboard.
    """
    
    # 1. Total Portfolio Purchase Value
    total_purchase_value = db.query(func.sum(PropertyAcquisitionCost.total_acquisition_cost)).scalar() or Decimal("0")
    
    # 2. Current Estimated Market Value
    # For each property, we need the LATEST valuation.
    # We can do this by getting all valuations and keeping the most recent per property.
    all_valuations = db.query(PropertyValuation).order_by(PropertyValuation.valuation_date.desc()).all()
    latest_valuations = {}
    for val in all_valuations:
        if val.property_id not in latest_valuations:
            latest_valuations[val.property_id] = val

    total_market_value = sum((v.market_value for v in latest_valuations.values()), Decimal("0"))
    
    # If no valuations exist, fallback to purchase value for those properties?
    # Let's say if a property has an acquisition cost but no valuation, market value = purchase value
    all_acquisitions = db.query(PropertyAcquisitionCost).all()
    
    # Re-calculate total market value considering fallbacks
    total_market_value_with_fallback = Decimal("0")
    
    # property_id to title deed mapping
    all_title_deeds = db.query(TitleDeed).all()
    td_to_prop = {td.title_deed_id: td.property_id for td in all_title_deeds}
    
    for acq in all_acquisitions:
        prop_id = td_to_prop.get(acq.title_deed_id)
        if prop_id in latest_valuations:
            total_market_value_with_fallback += latest_valuations[prop_id].market_value
        else:
            total_market_value_with_fallback += (acq.total_acquisition_cost or Decimal("0"))

    total_market_value = total_market_value_with_fallback

    # 3. Unrealized Capital Gain
    unrealized_capital_gain = total_market_value - total_purchase_value

    # 4. Capital Appreciation % (portfolio-wide)
    capital_appreciation_pct = Decimal("0")
    if total_purchase_value > 0:
        capital_appreciation_pct = (unrealized_capital_gain / total_purchase_value) * 100

    # 5. Net Rental Yield % (Mocked for Sprint 2)
    net_rental_yield_pct = Decimal("6.5")

    # 6. Return on Investment (ROI) % (Mocked for Sprint 2)
    roi_pct = Decimal("8.2")

    # 7. Total Loan Outstanding
    total_loan_outstanding = db.query(func.sum(TitleDeed.outstanding_loan)).scalar() or Decimal("0")

    # 8. Total Equity Value
    total_equity_value = total_market_value - total_loan_outstanding

    # --- Chart Data (Purchase vs Market Value per Property) ---
    properties = db.query(Property).all()
    chart_data = []
    table_data = []

    for prop in properties:
        td = prop.title_deed
        acq_cost = td.acquisition_costs.total_acquisition_cost if td and td.acquisition_costs else Decimal("0")
        
        market_val = acq_cost
        if prop.property_id in latest_valuations:
            market_val = latest_valuations[prop.property_id].market_value

        prop_appreciation = Decimal("0")
        if acq_cost > 0:
            prop_appreciation = ((market_val - acq_cost) / acq_cost) * 100

        chart_data.append({
            "property_name": prop.property_name,
            "purchase_value": float(acq_cost),
            "market_value": float(market_val)
        })

        table_data.append({
            "property_id": prop.property_id,
            "property_name": prop.property_name,
            "purchase_value": float(acq_cost),
            "market_value": float(market_val),
            "appreciation_pct": float(prop_appreciation),
            "value_declined": prop_appreciation < 0
        })

    # Sort table by appreciation descending
    table_data.sort(key=lambda x: x["appreciation_pct"], reverse=True)

    return {
        "kpis": {
            "total_portfolio_purchase_value": float(total_purchase_value),
            "current_estimated_market_value": float(total_market_value),
            "unrealized_capital_gain": float(unrealized_capital_gain),
            "capital_appreciation_pct": float(capital_appreciation_pct),
            "net_rental_yield_pct": float(net_rental_yield_pct),
            "roi_pct": float(roi_pct),
            "total_loan_outstanding": float(total_loan_outstanding),
            "total_equity_value": float(total_equity_value),
        },
        "chart_data": chart_data,
        "property_list": table_data
    }
