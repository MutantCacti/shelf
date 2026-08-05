from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from config import DATABASE_URL, DATABASE_PATH


class Base(DeclarativeBase):
    pass


# Ensure data directory exists
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(DATABASE_URL, echo=False)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_session():
    """Dependency for route handlers."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def init_db():
    """Create all tables and apply lightweight migrations."""
    Base.metadata.create_all(engine)
    migrate_db()


def migrate_db(target_engine=None):
    """Add columns missing from databases created before they existed.

    create_all() never alters existing tables, so pre-existing databases
    need explicit ALTERs. Each is guarded by a pragma check, making this
    safe to run on every startup.
    """
    with (target_engine or engine).begin() as conn:
        cols = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(transfers)")}
        if "group" not in cols:
            conn.exec_driver_sql('ALTER TABLE transfers ADD COLUMN "group" INTEGER')
