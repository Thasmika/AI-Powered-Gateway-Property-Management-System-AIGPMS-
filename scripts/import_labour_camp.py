import csv
import os
import sys
from datetime import datetime
from decimal import Decimal

# Add the project root directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.session import SessionLocal
from app.models.property import Property
from app.models.labourcamp import LabourCampUnit, CampResident, CampLease
from app.models.pdc import RentalReceipt, RentalReceiptPaymentLine
from app.models.tenant import Tenant, Lease, LeaseVersion


def parse_date(date_str):
    if not date_str:
        return None
    try:
        # Expected format like 7/1/2026 (M/D/YYYY)
        return datetime.strptime(date_str, "%m/%d/%Y").date()
    except ValueError:
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return None


def import_labour_camp_data(csv_file_path, dry_run=False):
    print(f"Starting import from {csv_file_path}...")
    db = SessionLocal()
    
    try:
        # 1. Ensure the Labour Camp Property exists
        property_name = "GLC Technical Services - Labour Camp"
        camp_prop = db.query(Property).filter(Property.property_name == property_name).first()
        
        if not camp_prop:
            print(f"Property '{property_name}' not found. Creating placeholder property...")
            camp_prop = Property(
                property_code="GLC-LC-01",
                property_name=property_name,
                property_type="Labour Camp",
                status="Active"
            )
            db.add(camp_prop)
            db.commit()
            db.refresh(camp_prop)
            print(f"Created property: {camp_prop.property_id}")
        else:
            print(f"Found existing property: {camp_prop.property_id}")

        # 2. Read the CSV file
        with open(csv_file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            # Print columns to verify mapping
            print(f"Detected columns: {reader.fieldnames}")
            
            for row in reader:
                floor_no = row.get('FLOOR NO', '').strip()
                room_no = row.get('ROOM NO', '').strip()
                tenant_name = row.get('TENANT NAME', '').strip()
                rent_str = row.get('RENT', '').strip()
                due_date_str = row.get('DUE DATE', '').strip()
                paid_str = row.get('PAID', '').strip()

                if not room_no:
                    continue  # Skip empty rows

                # A. Handle Unit (Room)
                unit = db.query(LabourCampUnit).filter(
                    LabourCampUnit.property_id == camp_prop.property_id,
                    LabourCampUnit.unit_number == room_no
                ).first()

                if not unit:
                    unit = LabourCampUnit(
                        property_id=camp_prop.property_id,
                        unit_number=room_no,
                        unit_type="Room",
                        location_description=f"Floor {floor_no}" if floor_no else None,
                        total_capacity=1, # Defaulting to 1 for this import format
                        current_occupancy=0,
                        status="Available"
                    )
                    db.add(unit)
                    db.flush() # Flush to get unit_id
                    print(f"Created Unit: {room_no}")

                # B. Handle Resident (Tenant)
                if tenant_name:
                    resident = db.query(CampResident).filter(
                        CampResident.full_name == tenant_name
                    ).first()

                    if not resident:
                        # Dummy ID required by the schema, using a placeholder if actual is unknown
                        resident = CampResident(
                            full_name=tenant_name,
                            id_type="Passport",
                            id_number=f"TBD-{tenant_name.replace(' ', '')[:10]}",
                            status="Active",
                            unit_id=unit.unit_id
                        )
                        db.add(resident)
                        db.flush()
                        print(f"Created Resident: {tenant_name}")
                    else:
                        # Update unit assignment if needed
                        if resident.unit_id != unit.unit_id:
                            resident.unit_id = unit.unit_id
                            db.add(resident)
                            db.flush()

                    # C. Handle Unit Occupancy update
                    if unit.current_occupancy == 0:
                        unit.current_occupancy = 1
                        unit.status = "Occupied"
                        db.add(unit)
                        db.flush()

                    # D. Handle Lease
                    if rent_str and due_date_str:
                        rent = Decimal(rent_str.replace(',', ''))
                        due_date = parse_date(due_date_str)

                        if due_date:
                            # Check if lease exists for this resident and unit
                            lease = db.query(CampLease).filter(
                                CampLease.resident_id == resident.resident_id,
                                CampLease.unit_id == unit.unit_id
                            ).first()

                            if not lease:
                                # Generate a pseudo lease reference
                                year = datetime.now().year
                                import_ref = f"CL-{year}-IMP-{unit.unit_number}"
                                
                                lease = CampLease(
                                    lease_reference=import_ref,
                                    unit_id=unit.unit_id,
                                    resident_id=resident.resident_id,
                                    start_date=due_date,
                                    monthly_rate=rent,
                                    billing_cycle="Monthly",
                                    payment_method="Cash",
                                    status="Active"
                                )
                                db.add(lease)
                                db.flush()
                                print(f"Created Lease for {tenant_name}: {rent} AED from {due_date}")

                            # E. Handle PAID status (Rental Receipt from Module 05)
                            if paid_str and paid_str.lower() in ['yes', 'true', '1', 'paid']:
                                # We need a Tenant, Lease, and LeaseVersion to satisfy Module 05 FK constraints
                                tenant = db.query(Tenant).filter(Tenant.full_name == tenant_name).first()
                                if not tenant:
                                    tenant = Tenant(
                                        tenant_type="Individual",
                                        full_name=tenant_name,
                                        id_type="Passport",
                                        id_number=f"TBD-{tenant_name.replace(' ', '')[:10]}"
                                    )
                                    db.add(tenant)
                                    db.flush()
                                
                                mod5_lease = db.query(Lease).filter(Lease.tenant_id == tenant.tenant_id, Lease.property_id == camp_prop.property_id).first()
                                if not mod5_lease:
                                    mod5_lease = Lease(
                                        lease_number=f"MOD5-{lease.lease_reference}",
                                        property_id=camp_prop.property_id,
                                        unit_id=unit.unit_id,
                                        tenant_id=tenant.tenant_id,
                                        lease_type="Labour Camp"
                                    )
                                    db.add(mod5_lease)
                                    db.flush()
                                    
                                    lease_version = LeaseVersion(
                                        lease_id=mod5_lease.lease_id,
                                        version_number=1,
                                        contract_start_date=due_date,
                                        contract_end_date=due_date, # Dummy end date
                                        annual_rent=rent * 12
                                    )
                                    db.add(lease_version)
                                    db.flush()
                                else:
                                    lease_version = db.query(LeaseVersion).filter(LeaseVersion.lease_id == mod5_lease.lease_id).first()

                                # Create the Rental Receipt
                                receipt = db.query(RentalReceipt).filter(
                                    RentalReceipt.tenant_id == tenant.tenant_id,
                                    RentalReceipt.lease_id == mod5_lease.lease_id,
                                    RentalReceipt.receipt_date == due_date
                                ).first()
                                
                                if not receipt:
                                    receipt = RentalReceipt(
                                        receipt_number=f"RCPT-LC-{lease.lease_reference}",
                                        receipt_date=due_date,
                                        tenant_id=tenant.tenant_id,
                                        property_id=camp_prop.property_id,
                                        unit_id=unit.unit_id,
                                        lease_id=mod5_lease.lease_id,
                                        lease_version_id=lease_version.version_id,
                                        payment_purpose="Labour Camp Rent",
                                        total_amount=rent,
                                        receipt_status="Posted"
                                    )
                                    db.add(receipt)
                                    db.flush()
                                    
                                    payment_line = RentalReceiptPaymentLine(
                                        receipt_id=receipt.receipt_id,
                                        lease_version_id=lease_version.version_id,
                                        line_number=1,
                                        instrument_type="Cash",
                                        amount=rent
                                    )
                                    db.add(payment_line)
                                    db.flush()
                                    print(f"Created Rental Receipt for {tenant_name}: {rent} AED")
                
        # Commit all changes unless dry run
        if dry_run:
            db.rollback()
            print("\n--- DRY RUN COMPLETED ---")
            print("No data was saved to the database.")
        else:
            db.commit()
            print("Import completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error during import: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Import Labour Camp data from a CSV file.")
    parser.add_argument("csv_file", help="Path to the CSV file")
    parser.add_argument("--dry-run", action="store_true", help="Run the script without saving to the database")
    
    args = parser.parse_args()
    if not os.path.exists(args.csv_file):
        print(f"File not found: {args.csv_file}")
        sys.exit(1)
        
    try:
        import_labour_camp_data(args.csv_file, dry_run=args.dry_run)
    except Exception as e:
        print(f"Failed: {e}")
