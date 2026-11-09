import sys
import os

# Add backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from app.models.auth import User, Role
from app.core import security

def create_users():
    db = SessionLocal()
    
    admin_role = db.query(Role).filter(Role.role_name == "Administrator").first()
    if not admin_role:
        print("Administrator role not found!")
        return

    users_data = [
        {
            "email": "ahmed@gatewaygulf.ae",
            "password": "Gateway",
            "name": "Ahmed",
            "role": admin_role
        },
        {
            "email": "raman@gatewaygulf.ae",
            "password": "Gateway",
            "name": "Raman",
            "role": admin_role
        }
    ]

    for u_data in users_data:
        user = db.query(User).filter(User.email == u_data["email"]).first()
        if not user:
            user = User(
                email=u_data["email"],
                password_hash=security.get_password_hash(u_data["password"]),
                full_name=u_data["name"],
                role_id=u_data["role"].role_id,
                status="Active"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created user {u_data['email']}")
        else:
            # Update password if user already exists
            user.password_hash = security.get_password_hash(u_data["password"])
            db.commit()
            print(f"Updated password for {u_data['email']}")

if __name__ == "__main__":
    create_users()
