import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db

# Use a local file for test database to avoid sqlite connection sharing issues
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_aigpms.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Create the schema and seed data once for tests
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    init_db(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_aigpms.db"):
        try:
            os.remove("./test_aigpms.db")
        except Exception:
            pass

client = TestClient(app)

def test_login_success():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "md@aigpms.com", "password": "MDPass123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role_name"] == "Managing Director"

def test_login_failed_wrong_password():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "md@aigpms.com", "password": "wrongpassword"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"

def test_login_failed_non_existent_user():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "notexist@aigpms.com", "password": "MDPass123!"}
    )
    assert response.status_code == 400

def test_get_me_success():
    # Login first
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "md@aigpms.com", "password": "MDPass123!"}
    )
    token = login_response.json()["access_token"]
    
    # Call protected endpoint
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "md@aigpms.com"
    assert data["role"]["role_name"] == "Managing Director"

def test_get_me_unauthorized():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
