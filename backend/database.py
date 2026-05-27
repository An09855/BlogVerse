"""
Database configuration and session management.

Uses synchronous SQLAlchemy. Defaults to a local SQLite database for
zero-configuration setup. Set the DATABASE_URL environment variable to
use PostgreSQL or any other supported backend.
"""

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Default to SQLite for easy setup — swap to PostgreSQL by setting env var:
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blogdb
_DB_PATH = Path(__file__).resolve().parent / "blogverse.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_DB_PATH}")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
