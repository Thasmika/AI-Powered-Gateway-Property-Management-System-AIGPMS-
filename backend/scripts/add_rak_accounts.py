import sqlite3
import uuid
from datetime import datetime

DB_PATH = '/var/www/aigpms/backend/aigpms.db'

accounts = [
    {
        "account_name": "Mr.Nadeem Khan",
        "bank_name": "RAK BANK (RAK4)",
        "account_number": "0882318069004",
        "iban": "AE920400000882318069004"
    },
    {
        "account_name": "Mr.Manzoor Khan",
        "bank_name": "RAK BANK(RAK 3)",
        "account_number": "0882318069003",
        "iban": "AE220400000882318069003"
    },
    {
        "account_name": "Mr.Ahmed Raza Khan",
        "bank_name": "RAK BANK (RAK 2)",
        "account_number": "0882318069002",
        "iban": "AE490400000882318069002"
    }
]

def add_accounts():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for acc in accounts:
        # Check if already exists
        cursor.execute("SELECT account_id FROM bank_accounts WHERE account_number = ?", (acc['account_number'],))
        exists = cursor.fetchone()
        if exists:
            print(f"Account {acc['account_number']} already exists.")
            continue
            
        acc_id = str(uuid.uuid4())
        now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')
        
        cursor.execute("""
            INSERT INTO bank_accounts (account_id, account_name, bank_name, account_number, iban, currency, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'AED', 'Active', ?)
        """, (acc_id, acc['account_name'], acc['bank_name'], acc['account_number'], acc['iban'], now))
        print(f"Added account {acc['account_number']}")
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    add_accounts()
