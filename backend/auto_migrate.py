import sys
import os
import traceback

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import engine, Base
from sqlalchemy import inspect, text
import app.main  # Ensures all models are imported and registered in Base.metadata

def migrate():
    inspector = inspect(engine)
    added_count = 0
    
    with engine.connect() as conn:
        for table_name in Base.metadata.tables:
            if not inspector.has_table(table_name):
                print(f"Table {table_name} does not exist, skipping (run create_all first).")
                continue
            
            # Get existing columns from the database
            existing_cols = {col['name'] for col in inspector.get_columns(table_name)}
            
            # Get defined columns from SQLAlchemy metadata
            table = Base.metadata.tables[table_name]
            for column in table.columns:
                if column.name not in existing_cols:
                    print(f"Missing column: {column.name} in table: {table_name}")
                    try:
                        col_type = column.type.compile(engine.dialect)
                        # Build ALTER TABLE query
                        query = text(f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type}")
                        conn.execute(query)
                        print(f"Successfully added {column.name} to {table_name}")
                        added_count += 1
                    except Exception as e:
                        print(f"Failed to add {column.name} to {table_name}: {e}")
                        traceback.print_exc()
        
        conn.commit()

    print(f"Migration completed. Added {added_count} columns.")

if __name__ == '__main__':
    migrate()
