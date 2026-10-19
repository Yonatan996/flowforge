from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExecutionStepResponse(BaseModel):
    id: str
    execution_id: str
    step_key: str
    step_type: str
    step_order: int
    status: str
    input_summary: Optional[Dict[str, Any]] = None
    output_summary: Optional[Dict[str, Any]] = None
    error_summary: Optional[str] = None
    attempt_count: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[float] = None

    model_config = {"from_attributes": True}


class ExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    owner_id: str
    workflow_version: int
    status: str
    trigger_source: str
    input_payload: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[float] = None
    error_summary: Optional[str] = None
    idempotency_key: Optional[str] = None
    created_at: datetime
    steps: Optional[List[ExecutionStepResponse]] = None

    model_config = {"from_attributes": True}


class ExecutionDetailResponse(ExecutionResponse):
    workflow_snapshot: Dict[str, Any] = Field(default_factory=dict)
    workflow_name: Optional[str] = None


class ManualRunRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)
