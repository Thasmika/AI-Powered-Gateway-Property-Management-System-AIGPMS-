import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import engine, Base
from sqlalchemy import text
import app.main  # Ensures all models are imported

def migrate_title_deeds():
    with engine.begin() as conn:
        try:
            conn.execute(text("DROP INDEX IF EXISTS ix_title_deeds_title_deed_number;"))
            print("Dropped old index")
        except Exception as e:
            print("Could not drop old index:", e)
            
    # 2. Recreate all missing tables (this will create the new title_deeds without NOT NULL on unit_id)
    Base.metadata.create_all(engine)
    print("Created new title_deeds table")
    
    with engine.begin() as conn:
        # 3. Copy data
        # Get columns of the new table
        from sqlalchemy import inspect
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('title_deeds')]
        
        # Check columns of old table to match
        old_columns = [col['name'] for col in inspector.get_columns('title_deeds_old')]
        
        # We only copy columns that exist in both
        common_cols = [c for c in columns if c in old_columns]
        
        col_names = ", ".join(common_cols)
        
        conn.execute(text(f"INSERT INTO title_deeds ({col_names}) SELECT {col_names} FROM title_deeds_old;"))
        print(f"Copied data for columns: {col_names}")
        
        # 4. Drop old table
        conn.execute(text("DROP TABLE title_deeds_old;"))
        print("Dropped old table")

if __name__ == "__main__":
    migrate_title_deeds()
