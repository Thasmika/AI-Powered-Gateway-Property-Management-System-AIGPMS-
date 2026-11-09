import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db
from app.models.property import Property
from app.models.ownership import LegalOwner, BeneficialOwner
from app.models.tenant import Tenant
from app.models.master_data import MasterBank

# Use a unique local file for this module's test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_aigpms_api.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Apply the DB override for this module — done HERE (not at import time)
    # so that if test_auth.py ran first and tore down, we start fresh.
    app.dependency_overrides[get_db] = override_get_db

    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    init_db(db)

    # Create test entities for our cascading workflow
    prop = Property(property_code="PROP-TEST", property_name="Test Property")
    db.add(prop)

    legal_owner = LegalOwner(owner_type="Individual", full_name="John Legal")
    db.add(legal_owner)

    ben_owner = BeneficialOwner(owner_type="Individual", full_name="Jane Beneficial")
    db.add(ben_owner)

    tenant = Tenant(full_name="Tom Tenant", tenant_type="Individual")
    db.add(tenant)

    # Add a mock bank just in case seed_master_data didn't add it
    bank = db.query(MasterBank).first()
    if not bank:
        bank = MasterBank(bank_name="Test Bank", status="Active")
        db.add(bank)

    db.commit()
    db.refresh(prop)
    db.refresh(legal_owner)
    db.refresh(ben_owner)
    db.refresh(tenant)
    db.refresh(bank)

    os.environ['TEST_PROP_ID'] = prop.property_id
    os.environ['TEST_LEGAL_ID'] = legal_owner.legal_owner_id
    os.environ['TEST_BEN_ID'] = ben_owner.beneficial_owner_id
    os.environ['TEST_TENANT_ID'] = tenant.tenant_id
    os.environ['TEST_BANK_ID'] = bank.bank_id

    db.close()
    yield

    # Teardown: drop this module's tables and remove the DB override
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)
    if os.path.exists("./test_aigpms_api.db"):
        try:
            os.remove("./test_aigpms_api.db")
        except Exception:
            pass


client = TestClient(app)


@pytest.fixture(scope="module")
def auth_token(setup_db):
    """Module-scoped auth token — explicitly depends on setup_db to ensure ordering."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "md@aigpms.com", "password": "MDPass123!"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


def test_add_unit_cascading(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}

    prop_id = os.environ.get('TEST_PROP_ID')
    legal_id = os.environ.get('TEST_LEGAL_ID')
    ben_id = os.environ.get('TEST_BEN_ID')
    tenant_id = os.environ.get('TEST_TENANT_ID')
    bank_id = os.environ.get('TEST_BANK_ID')

    payload = {
        "unit_number": "101",
        "unit_type": "Apartment",
        "area_sqft": 1000,
        "status": "Vacant",
        "legal_owner_id": legal_id,
        "beneficial_owner_id": ben_id,
        "bank_id": bank_id,
        "tenant_id": tenant_id
    }

    # Add Unit
    response = client.post(f"/api/v1/properties/{prop_id}/units", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["unit_number"] == "101"
    unit_id = data["unit_id"]

    # Verify Title Deed
    db = TestingSessionLocal()
    from app.models.property import TitleDeed
    deed = db.query(TitleDeed).filter(TitleDeed.unit_id == unit_id).first()
    assert deed is not None
    assert deed.legal_owner_id == legal_id
    assert deed.beneficial_owner_id == ben_id

    # Verify Ownership Record
    from app.models.ownership import OwnershipRecord
    ownership = db.query(OwnershipRecord).filter(OwnershipRecord.unit_id == unit_id).first()
    assert ownership is not None
    assert ownership.property_id == prop_id
    assert ownership.legal_owner_id == legal_id

    # Verify Beneficiary Allocation
    from app.models.ownership import BeneficiaryAllocation
    allocation = db.query(BeneficiaryAllocation).filter(BeneficiaryAllocation.ownership_record_id == ownership.ownership_id).first()
    assert allocation is not None
    assert allocation.beneficial_owner_id == ben_id

    # Verify Lease
    from app.models.tenant import Lease, LeaseVersion
    lease = db.query(Lease).filter(Lease.unit_id == unit_id).first()
    assert lease is not None
    assert lease.tenant_id == tenant_id
    assert lease.status == "Draft"

    lease_version = db.query(LeaseVersion).filter(LeaseVersion.lease_id == lease.lease_id).first()
    assert lease_version is not None
    assert lease_version.annual_rent == 0
    assert lease_version.status == "Draft"

    db.close()
