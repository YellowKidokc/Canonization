"""Database engine/session plus embedded PostgreSQL bootstrap (pgserver).

The embedded server binds localhost only. A real PostgreSQL/pgvector server can
replace it by setting DATABASE_URL_OVERRIDE in .env — no application changes.
"""
from __future__ import annotations

import atexit
import threading

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

_engine = None
_SessionLocal: sessionmaker | None = None
_pgserver_handle = None
_pgserver_lock = threading.Lock()


class Base(DeclarativeBase):
    pass


def start_embedded_postgres() -> None:
    """Start the embedded PostgreSQL server if no override URL is configured."""
    global _pgserver_handle
    settings = get_settings()
    if settings.database_url_override:
        return
    with _pgserver_lock:
        if _pgserver_handle is not None:
            return
        import pgserver  # noqa: PLC0415 — imported lazily so tests can override URLs

        pg = pgserver.get_server(settings.pg_data_dir, cleanup_mode=None)
        # Ensure role + database exist (pgserver creates a superuser named after
        # the OS user; we create our application role and DB idempotently).
        super_uri = pg.get_uri().replace("postgresql://", "postgresql+psycopg://", 1)
        admin_engine = create_engine(
            super_uri, execution_options={"isolation_level": "AUTOCOMMIT"}
        )
        with admin_engine.connect() as conn:
            role_exists = conn.execute(
                text("SELECT 1 FROM pg_roles WHERE rolname=:r"),
                {"r": settings.pg_user},
            ).scalar()
            if not role_exists:
                # DDL cannot take bind parameters for PASSWORD; the value is a
                # locally-generated token — escape single quotes defensively.
                safe_pw = settings.pg_password.replace("'", "''")
                conn.execute(text(f"CREATE ROLE \"{settings.pg_user}\" LOGIN PASSWORD '{safe_pw}'"))
                conn.execute(text(f'ALTER ROLE "{settings.pg_user}" CREATEDB'))
            db_exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname=:d"),
                {"d": settings.pg_database},
            ).scalar()
            if not db_exists:  # CREATE DATABASE cannot run inside a transaction
                conn.execute(text(f'CREATE DATABASE "{settings.pg_database}"'))
            # The application role must own its database (PG 15+ revokes CREATE
            # on schema public from non-owners).
            conn.execute(text(f'ALTER DATABASE "{settings.pg_database}" OWNER TO "{settings.pg_user}"'))
        admin_engine.dispose()
        _pgserver_handle = pg
        # Record the live port for backup/restore scripts (pgserver assigns it
        # dynamically at each boot).
        try:
            from urllib.parse import urlsplit as _urlsplit

            port_file = settings.pg_data_dir.parent / "postgres.port"
            port_file.write_text(str(_urlsplit(pg.get_uri()).port))
        except Exception:  # noqa: BLE001 — informational only
            pass
        atexit.register(_stop_embedded_postgres)


def _stop_embedded_postgres() -> None:
    global _pgserver_handle
    if _pgserver_handle is not None:
        try:
            _pgserver_handle.cleanup()
        except Exception:  # noqa: BLE001 — best-effort shutdown
            pass
        _pgserver_handle = None


def get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        _engine = create_engine(database_url(), pool_pre_ping=True, future=True)
        _SessionLocal = sessionmaker(bind=_engine, class_=Session, expire_on_commit=False, future=True)
    return _engine


def get_db():
    """FastAPI dependency yielding a scoped session."""
    get_engine()
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def session_scope() -> Session:
    get_engine()
    return _SessionLocal()


def database_url() -> str:
    """Connection URL. Embedded server wins (port assigned dynamically by
    pgserver); DATABASE_URL_OVERRIDE wins over everything."""
    settings = get_settings()
    if settings.database_url_override:
        return settings.database_url_override.replace("postgresql://", "postgresql+psycopg://", 1)
    if _pgserver_handle is not None:
        # pgserver.get_uri() points at the bootstrap superuser/db — substitute
        # the application role, its credentials, and the application database.
        from urllib.parse import urlsplit

        parts = urlsplit(_pgserver_handle.get_uri())
        netloc = f"{settings.pg_user}:{settings.pg_password}@{parts.hostname}:{parts.port}"
        return f"postgresql+psycopg://{netloc}/{settings.pg_database}"
    return (
        f"postgresql+psycopg://{settings.pg_user}:{settings.pg_password}"
        f"@{settings.pg_host}:{settings.pg_port}/{settings.pg_database}"
    )


def pg_version() -> str:
    with get_engine().connect() as conn:
        return conn.execute(text("SHOW server_version")).scalar()
