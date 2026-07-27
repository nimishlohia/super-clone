import sys
import os

# Add root folder to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base
import app.models  # Guarantees models are registered with Base metadata


def init_database():
    print("🔄 Initializing Signal Clone SQLite Database...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully!")


if __name__ == "__main__":
    init_database()