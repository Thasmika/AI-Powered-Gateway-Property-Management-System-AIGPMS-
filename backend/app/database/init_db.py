from sqlalchemy.orm import Session
from app.models.auth import Role, User
from app.core import security
from app.database.seed_data import seed_master_data


def init_db(db: Session) -> None:
    # 1. Seed Roles if they don't exist
    roles_data = [
        {"name": "Managing Director", "desc": "Business control, approvals and high-level decisions"},
        {"name": "Accountant", "desc": "Financial operations, receipts, payments and vouchers"},
        {"name": "Camp Supervisor", "desc": "Labour camp operations and room occupancy management"},
        {"name": "Maintenance Staff", "desc": "Completing repair works and updating tickets"},
        {"name": "Administrator", "desc": "System configuration, user management and security settings"},
        {"name": "AI Administrator", "desc": "AI model configurations and prompt management"}
    ]

    role_objs = {}
    for r_data in roles_data:
        role = db.query(Role).filter(Role.role_name == r_data["name"]).first()
        if not role:
            role = Role(role_name=r_data["name"], description=r_data["desc"])
            db.add(role)
            db.commit()
            db.refresh(role)
        role_objs[r_data["name"]] = role

    # 2. Seed Default Users if they don't exist
    users_data = [
        {
            "email": "md@aigpms.com",
            "password": "MDPass123!",
            "name": "Saeed Al-Mansoori",
            "role": "Managing Director"
        },
        {
            "email": "accountant@aigpms.com",
            "password": "AccountantPass123!",
            "name": "Jane Miller",
            "role": "Accountant"
        },
        {
            "email": "supervisor@aigpms.com",
            "password": "SupervisorPass123!",
            "name": "Rajesh Kumar",
            "role": "Camp Supervisor"
        },
        {
            "email": "maintenance@aigpms.com",
            "password": "MaintenancePass123!",
            "name": "John Doe",
            "role": "Maintenance Staff"
        },
        {
            "email": "admin@aigpms.com",
            "password": "AdminPass123!",
            "name": "System Admin",
            "role": "Administrator"
        },
        {
            "email": "aiadmin@aigpms.com",
            "password": "AIAdminPass123!",
            "name": "AI System Admin",
            "role": "AI Administrator"
        }
    ]

    for u_data in users_data:
        user = db.query(User).filter(User.email == u_data["email"]).first()
        if not user:
            role = role_objs[u_data["role"]]
            user = User(
                email=u_data["email"],
                password_hash=security.get_password_hash(u_data["password"]),
                full_name=u_data["name"],
                role_id=role.role_id,
                status="Active"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # 3. Seed Master Data (UAE banks, emirates, categories, templates)
    print("[init_db] Seeding master data...")
    seed_master_data(db)
    print("[init_db] DONE: Database initialization complete.")
