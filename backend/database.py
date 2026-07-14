import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Retrieve database URL from environment variables
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        raise RuntimeError("DATABASE_URL is required in production.")
    SQLALCHEMY_DATABASE_URL = "postgresql://postgres:replace-me@localhost:5432/ser_ostar_db"

# Create connection engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=3,
    max_overflow=2,
)

# Configure session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declare base class for database models
Base = declarative_base()

# Dependency override helper to obtain session and close appropriately
def get_db():
    db = SessionLocal()
    try:
         yield db
    finally:
         db.close()
