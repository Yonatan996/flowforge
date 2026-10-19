from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.workflow import Workflow
from backend.app.models.scheduled_job import ScheduledJob
from backend.app.services.workflow_service import workflow_service

router = APIRouter(prefix="/schedules", tags=["Schedules"])


class ScheduleResponse(BaseModel):
    id: str
    workflow_id: str
    workflow_name: str
    cron_expression: Optional[str] = None
    interval_seconds: Optional[int] = None
    next_run_at: Optional[str] = None
    last_run_at: Optional[str] = None
    enabled: bool


@router.get("", response_model=List[ScheduleResponse])
async def list_schedules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ScheduledJob)
        .join(ScheduledJob.workflow)
        .where(Workflow.owner_id == current_user.id)
        .options(selectinload(ScheduledJob.workflow))
    )
    res = await db.execute(stmt)
    jobs = res.scalars().all()

    return [
        ScheduleResponse(
            id=job.id,
            workflow_id=job.workflow_id,
            workflow_name=job.workflow.name if job.workflow else "Workflow",
            cron_expression=job.cron_expression,
            interval_seconds=job.interval_seconds,
            next_run_at=job.next_run_at.isoformat() if job.next_run_at else None,
            last_run_at=job.last_run_at.isoformat() if job.last_run_at else None,
            enabled=job.enabled,
        )
        for job in jobs
    ]
