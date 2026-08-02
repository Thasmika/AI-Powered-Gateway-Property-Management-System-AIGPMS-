import sqlite3
import uuid

def migrate():
    conn = sqlite3.connect('aigpms.db')
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(title_deeds)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'unit_id' not in columns:
            print("Adding unit_id column...")
            cursor.execute("ALTER TABLE title_deeds ADD COLUMN unit_id VARCHAR(36)")
            
            # Update existing rows with a unique uuid
            cursor.execute("SELECT title_deed_id FROM title_deeds")
            rows = cursor.fetchall()
            for row in rows:
                new_uuid = str(uuid.uuid4())
                cursor.execute("UPDATE title_deeds SET unit_id = ? WHERE title_deed_id = ?", (new_uuid, row[0]))
            
            conn.commit()
            print(f"Successfully migrated {len(rows)} title deeds.")
        else:
            print("unit_id column already exists.")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
