"""
Migration: Create suppliers table
Run once after deployment.
"""
import sqlite3
import os

# Read DATABASE_URL from .env file if present
db_url = None
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith('DATABASE_URL='):
                db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
                break

if not db_url:
    db_url = "sqlite:///./aigpms.db"

DB_PATH = db_url.replace("sqlite:///", "")
if DB_PATH.startswith("./"):
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), DB_PATH[2:])

print(f"Connecting to: {DB_PATH}")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()


def table_exists(name: str) -> bool:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,))
    return cursor.fetchone() is not None


def add_column_if_missing(table: str, column: str, col_type: str):
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cursor.fetchall()]
    if column not in cols:
        print(f"  + Adding column: {table}.{column}")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
    else:
        print(f"  [OK] Already exists: {table}.{column}")


print("\n--- Creating suppliers table ---")
if not table_exists("suppliers"):
    cursor.execute("""
        CREATE TABLE suppliers (
            supplier_id    VARCHAR(36) PRIMARY KEY,
            supplier_name  VARCHAR(200) NOT NULL,
            supplier_type  VARCHAR(100),
            contact_number VARCHAR(50),
            email          VARCHAR(150),
            is_active      BOOLEAN DEFAULT 1,
            created_date   DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_date   DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  + suppliers table created successfully.")
else:
    print("  [OK] suppliers table already exists.")
    # Ensure all columns exist
    add_column_if_missing("suppliers", "supplier_type",   "VARCHAR(100)")
    add_column_if_missing("suppliers", "contact_number",  "VARCHAR(50)")
    add_column_if_missing("suppliers", "email",           "VARCHAR(150)")
    add_column_if_missing("suppliers", "is_active",       "BOOLEAN DEFAULT 1")

conn.commit()
conn.close()
print("\n✅ Migration complete.")
