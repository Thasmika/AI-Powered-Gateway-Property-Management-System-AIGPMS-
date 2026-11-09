import sqlite3

conn = sqlite3.connect('../aigpms.db')
cursor = conn.cursor()

try:
    cursor.execute("SELECT COUNT(*) FROM title_deeds")
    count = cursor.fetchone()[0]
    print(f"Title deeds count: {count}")
    
    # get columns
    cursor.execute("PRAGMA table_info(title_deeds)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Columns: {columns}")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
