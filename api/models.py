from datetime import datetime
from typing import Optional
import json

from sqlalchemy import String, Text, Integer, DateTime, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from db import Base


class Auth(Base):
    """Single-user auth. Only one row allowed (id=1)."""
    __tablename__ = "auth"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        CheckConstraint("id = 1", name="single_user"),
    )


class UserSession(Base):
    """Server-side session storage."""
    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(String(255), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class ApiKey(Base):
    """API keys for MCP/programmatic access."""
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_used: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Deadline(Base):
    """Deadlines with slug-based IDs."""
    __tablename__ = "deadlines"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)  # slug: "grcdi-2026"
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deadline: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    project: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        default="watching",
        index=True
    )
    url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    _tags: Mapped[Optional[str]] = mapped_column("tags", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('watching', 'active', 'completed', 'expired')",
            name="valid_status"
        ),
    )

    @property
    def tags(self) -> list[str]:
        if self._tags is None:
            return []
        return json.loads(self._tags)

    @tags.setter
    def tags(self, value: list[str]):
        self._tags = json.dumps(value) if value else None
