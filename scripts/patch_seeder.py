import sys

filepath = 'e:/AI Powered Gateway Property Management System (AIGPMS)/backend/scripts/seed_dummy_data.py'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if 'db.query(BeneficiaryAllocation).delete()' in line or \
       'db.query(OwnershipRecord).delete()' in line or \
       'db.query(PropertyAcquisitionCost).delete()' in line or \
       'db.query(PropertyValuation).delete()' in line or \
       'db.query(TitleDeed).delete()' in line or \
       'db.query(PropertyUnit).delete()' in line or \
       'db.query(Property).delete()' in line or \
       'db.query(BeneficialOwner).delete()' in line or \
       'db.query(LegalOwner).delete()' in line:
        new_lines.append('    # ' + line.lstrip())
    elif 'def seed_dummy_data(db: Session):' in line:
        new_lines.append(line)
        skip = True
        
        # Inject the new property fetching code
        new_code = """
    # ── 1 to 9. PRESERVED REAL PROPERTY MASTER DATA ──────────────────────────
    log("Fetching real Property Master data instead of seeding dummies...")
    properties = db.query(Property).all()
    if not properties:
        log("No properties found! Please enter real properties in the UI first.")
        from decimal import Decimal
        fallback_p = Property(
            property_id=gen_id(), property_code="FB-001", property_name="Fallback Property",
            property_type="Apartment", community="Dubai Marina", emirate="Dubai",
            total_units=1, total_area_sqft=Decimal("1000.00"), status="Active"
        )
        fallback_u = PropertyUnit(
            unit_id=gen_id(), property_id=fallback_p.property_id, unit_number="FB-101",
            unit_type="2BR Apartment", status="Vacant"
        )
        db.add_all([fallback_p, fallback_u])
        db.commit()
        properties = [fallback_p]
        units = [fallback_u]
    else:
        units = db.query(PropertyUnit).all()
        if not units:
            log("Properties exist but no units found! Creating fallback unit.")
            fallback_u = PropertyUnit(
                unit_id=gen_id(), property_id=properties[0].property_id, unit_number="FB-101",
                unit_type="2BR Apartment", status="Vacant"
            )
            db.add(fallback_u)
            db.commit()
            units = [fallback_u]

    p1 = properties[0]
    p2 = properties[1] if len(properties) > 1 else properties[0]
    p3 = properties[2] if len(properties) > 2 else properties[0]
    p4 = properties[3] if len(properties) > 3 else properties[0]
    p5 = properties[4] if len(properties) > 4 else properties[0]

    def get_unit(prop_id):
        for u in units:
            if u.property_id == prop_id:
                return u
        return units[0]

    u1 = get_unit(p1.property_id)
    u2 = get_unit(p2.property_id)
    u4 = get_unit(p3.property_id)
    u8 = get_unit(p4.property_id)
    u9 = get_unit(p5.property_id)
"""
        new_lines.append(new_code)
    elif skip:
        if '── 10. Tenants ──' in line:
            skip = False
            new_lines.append(line)
    else:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Updated seed_dummy_data.py to preserve Property Master data!')
