import os
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import sessionmaker

db_url = "postgresql://postgres:SuperSecretPassword123!@aigpms-staging-db.cnc80m06mi0f.eu-north-1.rds.amazonaws.com:5432/aigpms_db"
engine = create_engine(db_url)
metadata = MetaData()
metadata.reflect(bind=engine)

print("Tables with data:")
for table_name in metadata.tables:
    with engine.connect() as conn:
        count = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
        if count > 0:
            print(f"{table_name}: {count}")
