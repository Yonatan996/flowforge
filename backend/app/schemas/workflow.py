from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, model_validator


# --- Step Configurations ---

class HttpRequestConfig(BaseModel):
    method: Literal["GET", "POST", "PUT", "DELETE"] = "GET"
    url: str = Field(..., description="Target HTTP or HTTPS URL")
    headers: Dict[str, str] = Field(default_factory=dict)
    body: Optional[Any] = None
    timeout_seconds: float = Field(default=10.0, ge=0.5, le=30.0)


class JsonTransformConfig(BaseModel):
    operation: Literal["select_path", "rename_keys", "construct_object", "type_convert"] = "select_path"
    path: Optional[str] = Field(default=None, description="Path to extract, e.g. 'input.data.user_id' or 'steps.step_1.output.id'")
    mappings: Optional[Dict[str, str]] = Field(default=None, description="Key remapping dict {old_key: new_key}")
    template: Optional[Dict[str, Any]] = Field(default=None, description="Object template with path references")
    target_type: Optional[Literal["string", "integer", "float", "boolean", "json"]] = Field(default=None)


class ConditionConfig(BaseModel):
    left_operand: str = Field(..., description="Path or literal value, e.g. 'steps.step_1.output.status'")
    operator: Literal[
        "equals",
        "not_equals",
        "greater_than",
        "less_than",
        "contains",
        "exists",
        "not_exists"
    ] = "equals"
    right_operand: Optional[Any] = Field(default=None, description="Comparison value")


class RetryConfig(BaseModel):
    max_attempts: int = Field(default=3, ge=1, le=5)
    backoff_factor: float = Field(default=2.0, ge=1.0, le=10.0)


class StepDefinition(BaseModel):
    key: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-zA-Z0-9_\-]+$")
    name: str = Field(..., min_length=1, max_length=100)
    type: Literal["http_request", "json_transform", "condition"]
    config: Dict[str, Any] = Field(default_factory=dict)
    retry: Optional[RetryConfig] = Field(default_factory=RetryConfig)


# --- Trigger Definitions ---

class WebhookTriggerConfig(BaseModel):
    idempotency_header: Optional[str] = Field(default="Idempotency-Key", description="Header used to check for duplicate deliveries")
    required_fields: Optional[List[str]] = Field(default_factory=list)


class ScheduledTriggerConfig(BaseModel):
    cron_expression: Optional[str] = Field(default="*/15 * * * *", description="Cron schedule in UTC, e.g. */15 * * * *")
    interval_seconds: Optional[int] = Field(default=None, ge=10, description="Alternative interval in seconds")


class ManualTriggerConfig(BaseModel):
    sample_payload: Optional[Dict[str, Any]] = Field(default_factory=dict)


class TriggerDefinition(BaseModel):
    type: Literal["webhook", "scheduled", "manual"] = "manual"
    config: Dict[str, Any] = Field(default_factory=dict)


class WorkflowDefinition(BaseModel):
    trigger: TriggerDefinition = Field(default_factory=TriggerDefinition)
    steps: List[StepDefinition] = Field(default_factory=list, max_length=50)


# --- Workflow CRUD Schemas ---

class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(default="", max_length=1000)
    trigger_type: Literal["webhook", "scheduled", "manual"] = "manual"
    definition_json: Optional[WorkflowDefinition] = None


class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    status: Optional[Literal["draft", "active", "inactive"]] = None
    trigger_type: Optional[Literal["webhook", "scheduled", "manual"]] = None
    definition_json: Optional[WorkflowDefinition] = None


class WorkflowResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    description: Optional[str] = ""
    status: str
    definition_json: Dict[str, Any]
    version: int
    trigger_type: str
    webhook_token: Optional[str] = None
    webhook_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_execution_status: Optional[str] = None
    last_execution_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class WorkflowValidationResult(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
