import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_ai.db"

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
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    init_db(db)
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)
    if os.path.exists("./test_ai.db"):
        try:
            os.remove("./test_ai.db")
        except Exception:
            pass

client = TestClient(app)

def get_auth_token():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "md@aigpms.com", "password": "MDPass123!"}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def test_ai_chat_endpoint():
    token = get_auth_token()
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Test text query
    response = client.post(
        "/api/v1/ai/chat",
        json={"prompt": "Show property portfolio occupancy rate"},
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "Portfolio Overview" in data["answer"]

def test_ai_chat_with_screenshot():
    token = get_auth_token()
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test screenshot attachment query
    response = client.post(
        "/api/v1/ai/chat",
        json={
            "prompt": "Analyze attached cheque screenshot",
            "image_urls": ["/uploads/test_cheque.png"]
        },
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "Screenshot Analysis" in data["answer"]
