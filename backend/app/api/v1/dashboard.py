from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.workflow import Workflow
from backend.app.models.execution import Execution
from backend.app.schemas.dashboard import DashboardSummary, ExecutionTrendPoint

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Total workflows
    wf_total_stmt = select(func.count(Workflow.id)).where(Workflow.owner_id == current_user.id)
    wf_total = (await db.execute(wf_total_stmt)).scalar() or 0

    # Active workflows
    wf_active_stmt = select(func.count(Workflow.id)).where(
        Workflow.owner_id == current_user.id,
        Workflow.status == "active"
    )
    wf_active = (await db.execute(wf_active_stmt)).scalar() or 0

    # Total executions
    exec_total_stmt = select(func.count(Execution.id)).where(Execution.owner_id == current_user.id)
    exec_total = (await db.execute(exec_total_stmt)).scalar() or 0

    # Succeeded executions
    exec_succ_stmt = select(func.count(Execution.id)).where(
        Execution.owner_id == current_user.id,
        Execution.status == "SUCCEEDED"
    )
    exec_succ = (await db.execute(exec_succ_stmt)).scalar() or 0

    # Failed executions
    exec_fail_stmt = select(func.count(Execution.id)).where(
        Execution.owner_id == current_user.id,
        Execution.status == "FAILED"
    )
    exec_fail = (await db.execute(exec_fail_stmt)).scalar() or 0

    # Average duration ms
    avg_dur_stmt = select(func.avg(Execution.duration_ms)).where(
        Execution.owner_id == current_user.id,
        Execution.duration_ms.isnot(None)
    )
    avg_dur = (await db.execute(avg_dur_stmt)).scalar() or 0.0

    success_rate = (exec_succ / exec_total * 100.0) if exec_total > 0 else 0.0

    # Recent 10 executions with workflow name
    recent_stmt = (
        select(Execution)
        .where(Execution.owner_id == current_user.id)
        .options(selectinload(Execution.workflow))
        .order_by(desc(Execution.created_at))
        .limit(10)
    )
    recent_res = await db.execute(recent_stmt)
    recent_execs = recent_res.scalars().all()

    recent_activity = [
        {
            "id": ex.id,
            "workflow_id": ex.workflow_id,
            "workflow_name": ex.workflow.name if ex.workflow else "Workflow",
            "status": ex.status,
            "trigger_source": ex.trigger_source,
            "duration_ms": ex.duration_ms,
            "created_at": ex.created_at.isoformat() if ex.created_at else None,
            "error_summary": ex.error_summary,
        }
        for ex in recent_execs
    ]

    return DashboardSummary(
        total_workflows=wf_total,
        active_workflows=wf_active,
        total_executions=exec_total,
        succeeded_executions=exec_succ,
        failed_executions=exec_fail,
        success_rate_percent=round(success_rate, 1),
        avg_duration_ms=round(avg_dur, 1),
        recent_activity=recent_activity,
    )


@router.get("/execution-trends", response_model=List[ExecutionTrendPoint])
async def get_execution_trends(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = utcnow()
    start_time = now - timedelta(days=days)

    stmt = (
        select(Execution)
        .where(
            Execution.owner_id == current_user.id,
            Execution.created_at >= start_time
        )
        .order_by(Execution.created_at.asc())
    )
    res = await db.execute(stmt)
    executions = res.scalars().all()

    # Bucket by date (YYYY-MM-DD)
    date_buckets = {}
    for i in range(days + 1):
        d_str = (start_time + timedelta(days=i)).strftime("%Y-%m-%d")
        date_buckets[d_str] = {"total": 0, "succeeded": 0, "failed": 0}

    for ex in executions:
        d_str = ex.created_at.strftime("%Y-%m-%d")
        if d_str in date_buckets:
            date_buckets[d_str]["total"] += 1
            if ex.status == "SUCCEEDED":
                date_buckets[d_str]["succeeded"] += 1
            elif ex.status == "FAILED":
                date_buckets[d_str]["failed"] += 1

    return [
        ExecutionTrendPoint(
            timestamp=day,
            total=metrics["total"],
            succeeded=metrics["succeeded"],
            failed=metrics["failed"],
        )
        for day, metrics in date_buckets.items()
    ]
