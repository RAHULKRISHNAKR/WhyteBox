"""
SQLAlchemy ORM Model for ML models stored in the database.
"""

import uuid
from datetime import datetime, timezone

from app.core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Model(Base):
    """SQLAlchemy ORM model representing an uploaded/registered ML model."""

    __tablename__ = "models"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Basic info
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    type = Column(String(64), nullable=False)          # ModelType enum value
    framework = Column(String(64), nullable=False)     # Framework enum value
    version = Column(String(64), nullable=False, default="1.0.0")

    # File info
    file_path = Column(String(1024), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False, unique=True, index=True)

    # Architecture
    input_dtype = Column(String(32), nullable=False, default="float32")
    output_dtype = Column(String(32), nullable=False, default="float32")

    # Statistics
    total_params = Column(Integer, nullable=True)
    trainable_params = Column(Integer, nullable=True)
    non_trainable_params = Column(Integer, nullable=True)
    num_layers = Column(Integer, nullable=True)

    # Performance metrics
    accuracy = Column(Float, nullable=True)
    top5_accuracy = Column(Float, nullable=True)
    loss = Column(Float, nullable=True)

    # Training info
    dataset = Column(String(255), nullable=True)
    training_time = Column(Integer, nullable=True)   # hours
    epochs = Column(Integer, nullable=True)
    batch_size = Column(Integer, nullable=True)

    # Status & visibility
    status = Column(String(32), nullable=False, default="active", index=True)
    is_public = Column(Integer, nullable=False, default=0)      # 0/1 bool
    is_pretrained = Column(Integer, nullable=False, default=0)  # 0/1 bool

    # Usage statistics
    download_count = Column(Integer, nullable=False, default=0)
    inference_count = Column(Integer, nullable=False, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    # Ownership
    user_id = Column(String(36), nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, default=_now)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    def increment_inference_count(self) -> None:
        """Increment inference counter and update last_used_at."""
        self.inference_count = (self.inference_count or 0) + 1
        self.last_used_at = _now()

    def increment_download_count(self) -> None:
        """Increment download counter."""
        self.download_count = (self.download_count or 0) + 1

    def __repr__(self) -> str:
        return f"<Model id={self.id!r} name={self.name!r} framework={self.framework!r}>"


# Made with Bob
