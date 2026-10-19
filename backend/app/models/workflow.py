import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


def generate_webhook_token():
    return secrets.token_urlsafe(32)


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True, default="")
    status = Column(String(50), nullable=False, default="draft", index=True)  # draft, active, inactive
    definition_json = Column(JSON, nullable=False, default=dict)
    version = Column(Integer, nullable=False, default=1)
    trigger_type = Column(String(50), nullable=False, default="manual")  # webhook, scheduled, manual
    webhook_token = Column(String(64), unique=True, index=True, nullable=True, default=generate_webhook_token)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="workflows", lazy="selectin")
    executions = relationship("Execution", back_populates="workflow", cascade="all, delete-orphan", lazy="selectin")
    scheduled_job = relationship("ScheduledJob", back_populates="workflow", uselist=False, cascade="all, delete-orphan", lazy="selectin")
