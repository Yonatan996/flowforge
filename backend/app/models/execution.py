import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Execution(Base):
    __tablename__ = "executions"
    __table_args__ = (
        UniqueConstraint("workflow_id", "idempotency_key", name="uq_executions_workflow_idempotency"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id = Column(String(36), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workflow_version = Column(Integer, nullable=False, default=1)
    status = Column(String(50), nullable=False, default="QUEUED", index=True)  # QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED
    trigger_source = Column(String(50), nullable=False, default="manual")  # webhook, scheduled, manual
    input_payload = Column(JSON, nullable=True, default=dict)
    workflow_snapshot = Column(JSON, nullable=False, default=dict)  # Snapshot of definition at runtime
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Float, nullable=True)
    error_summary = Column(Text, nullable=True)
    idempotency_key = Column(String(255), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)

    # Relationships
    workflow = relationship("Workflow", back_populates="executions", lazy="selectin")
    owner = relationship("User", back_populates="executions", lazy="selectin")
    steps = relationship("ExecutionStep", back_populates="execution", cascade="all, delete-orphan", order_by="ExecutionStep.step_order", lazy="selectin")
