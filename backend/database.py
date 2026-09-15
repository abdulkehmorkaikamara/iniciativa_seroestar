"""Database engine wiring.

The backend must reach *the same* persistent database on every start: after the
dev server is stopped, after the project folder is closed, after a reboot, and
after a redeploy. Two rules make that true:

1. ``DATABASE_URL`` always wins. Production refuses to boot without it.
2. When it is absent during local development we fall back to a SQLite file
   stored next to the backend package (``backend/data/seroestar.db``). The path
   is derived from this module's location, not from the current working
   directory, so the same file is opened no matter where the process starts.

The previous default pointed at a placeholder PostgreSQL DSN
(``postgres:replace-me@localhost``) that does not exist on a developer machine.
Every request failed, callers silently fell back to throwaway stores, and any
account created that way disappeared with the process. Persisting to a real
file removes that failure mode.
"""

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# backend/ -> project root
BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("BACKEND_DATA_DIR") or (BACKEND_DIR / "data"))


def _normalize_database_url(url: str) -> str:
    """Accept the DSN spellings hosted PostgreSQL providers hand out."""
    url = url.strip()
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql+psycopg2cffi://"):
        return "postgresql://" + url.split("://", 1)[1]
    return url


def _default_sqlite_url() -> str:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{(DATA_DIR / 'seroestar.db').as_posix()}"


def resolve_database_url() -> str:
    """Return the persistent database URL for this process."""
    configured = os.getenv("DATABASE_URL", "").strip()
    if configured:
        return _normalize_database_url(configured)
    if ENVIRONMENT == "production":
        raise RuntimeError("DATABASE_URL is required in production.")
    return _default_sqlite_url()


SQLALCHEMY_DATABASE_URL = resolve_database_url()
IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith("sqlite")


def _engine_options(url: str) -> dict:
    if url.startswith("sqlite"):
        # SQLite has no server-side pool to size, and FastAPI hands sessions
        # between threads, so the same-thread guard has to be relaxed.
        return {"connect_args": {"check_same_thread": False}}
    return {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 3,
        "max_overflow": 2,
    }


engine = create_engine(SQLALCHEMY_DATABASE_URL, **_engine_options(SQLALCHEMY_DATABASE_URL))

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def database_description() -> str:
    """A log-safe description of the connection (never leaks the password)."""
    if IS_SQLITE:
        return f"sqlite file {SQLALCHEMY_DATABASE_URL.removeprefix('sqlite:///')}"
    try:
        scheme, rest = SQLALCHEMY_DATABASE_URL.split("://", 1)
        host_and_db = rest.split("@", 1)[-1]
        return f"{scheme}://***@{host_and_db}"
    except ValueError:
        return "configured database"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
