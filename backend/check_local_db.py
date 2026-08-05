import sqlite3

def check_db():
    conn = sqlite3.connect('aigpms.db')
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [t[0] for t in cur.fetchall()]
    print("Tables:", tables)
    if 'companies' in tables:
        cur.execute("SELECT * FROM companies")
        print("Companies:", cur.fetchall())
    
    # Or maybe it's in property_master, let's see which tables exist
check_db()
