"""
SQLAlchemy ORM Model for users.
"""

import uuid
from datetime import datetime, timezone

from app.core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """SQLAlchemy ORM model representing an application user."""

    __tablename__ = "users"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Identity
    email = Column(String(255), nullable=False, unique=True, index=True)
    username = Column(String(64), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)

    # Profile
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(1024), nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    is_superuser = Column(Boolean, nullable=False, default=False)
    is_verified = Column(Boolean, nullable=False, default=False)

    # Usage
    model_count = Column(Integer, nullable=False, default=0)
    inference_count = Column(Integer, nullable=False, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, default=_now)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<User id={self.id!r} email={self.email!r}>"


# Made with Bob
