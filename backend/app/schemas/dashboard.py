from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ExecutionTrendPoint(BaseModel):
    timestamp: str  # ISO date string or formatted label, e.g. "2026-10-19 10:00"
    total: int
    succeeded: int
    failed: int


class DashboardSummary(BaseModel):
    total_workflows: int
    active_workflows: int
    total_executions: int
    succeeded_executions: int
    failed_executions: int
    success_rate_percent: float
    avg_duration_ms: float
    recent_activity: List[dict]
