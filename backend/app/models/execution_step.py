import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class ExecutionStep(Base):
    __tablename__ = "execution_steps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    execution_id = Column(String(36), ForeignKey("executions.id", ondelete="CASCADE"), nullable=False, index=True)
    step_key = Column(String(100), nullable=False)
    step_type = Column(String(50), nullable=False)  # http_request, json_transform, condition
    step_order = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="pending")  # pending, running, succeeded, failed, skipped
    input_summary = Column(JSON, nullable=True, default=dict)
    output_summary = Column(JSON, nullable=True, default=dict)
    error_summary = Column(Text, nullable=True)
    attempt_count = Column(Integer, nullable=False, default=0)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Float, nullable=True)

    # Relationships
    execution = relationship("Execution", back_populates="steps")
