"""
Auto-migration script: safely adds missing columns to existing tables.
Run this on the server after deployment when models have new columns.
Uses only stdlib - no SQLAlchemy import needed.
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

# Convert SQLAlchemy URL to file path
DB_PATH = db_url.replace("sqlite:///", "")
if DB_PATH.startswith("./"):
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), DB_PATH[2:])

print(f"Connecting to: {DB_PATH}")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

def add_column_if_missing(table: str, column: str, col_type: str):
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cursor.fetchall()]
    if column not in cols:
        print(f"  + Adding column: {table}.{column}")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
    else:
        print(f"  [OK] Already exists: {table}.{column}")

print("\n--- Migrating property_units ---")
add_column_if_missing("property_units", "balcony",               "VARCHAR(50)")
add_column_if_missing("property_units", "legal_owner_id",        "VARCHAR(36)")
add_column_if_missing("property_units", "beneficial_owner_id",   "VARCHAR(36)")
add_column_if_missing("property_units", "bank_id",               "VARCHAR(36)")
add_column_if_missing("property_units", "tenant_id",             "VARCHAR(36)")
add_column_if_missing("property_units", "area_measure",          "VARCHAR(20)")

print("\n--- Migrating title_deeds ---")
add_column_if_missing("title_deeds", "legal_owner_id",           "VARCHAR(36)")
add_column_if_missing("title_deeds", "beneficial_owner_id",      "VARCHAR(36)")
add_column_if_missing("title_deeds", "purchase_method",          "VARCHAR(100)")
add_column_if_missing("title_deeds", "purchased_from",           "VARCHAR(200)")
add_column_if_missing("title_deeds", "notes",                    "TEXT")
add_column_if_missing("title_deeds", "attachment_path",          "VARCHAR(500)")
add_column_if_missing("title_deeds", "mortgage_bank",            "VARCHAR(200)")
add_column_if_missing("title_deeds", "mortgage_status",          "VARCHAR(50)")
add_column_if_missing("title_deeds", "outstanding_loan",         "NUMERIC(15,2)")
add_column_if_missing("title_deeds", "loan_to_value_ratio",      "NUMERIC(10,4)")
add_column_if_missing("title_deeds", "mortgage_expiry_date",     "DATE")
add_column_if_missing("title_deeds", "loan_number",              "VARCHAR(100)")

print("\n--- Migrating lease_versions ---")
add_column_if_missing("lease_versions", "premises_no",           "VARCHAR(100)")

print("\n--- Creating suppliers table ---")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='suppliers'")
if not cursor.fetchone():
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
    print("  + suppliers table created")
else:
    print("  [OK] suppliers already exists")
    add_column_if_missing("suppliers", "supplier_type",   "VARCHAR(100)")
    add_column_if_missing("suppliers", "contact_number",  "VARCHAR(50)")
    add_column_if_missing("suppliers", "email",           "VARCHAR(150)")

conn.commit()
conn.close()
print("\nMigration complete.")
