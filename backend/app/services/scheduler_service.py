import asyncio
import copy
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from croniter import croniter
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from backend.app.core.database import AsyncSessionLocal
from backend.app.models.scheduled_job import ScheduledJob
from backend.app.models.workflow import Workflow
from backend.app.models.execution import Execution
from backend.app.services.queue_service import queue_service

logger = logging.getLogger(__name__)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SchedulerService:
    @staticmethod
    def calculate_next_run(job: ScheduledJob, base_time: datetime) -> Optional[datetime]:
        """Calculates next run datetime in UTC based on cron expression or interval."""
        if job.cron_expression and croniter.is_valid(job.cron_expression):
            iter = croniter(job.cron_expression, base_time)
            return iter.get_next(datetime)
        elif job.interval_seconds and job.interval_seconds >= 10:
            return base_time + timedelta(seconds=job.interval_seconds)
        return None

    async def check_and_dispatch_due_jobs(self) -> int:
        """
        Dispatches all due scheduled jobs in UTC.
        Uses atomic select and update to avoid double-dispatching in multi-instance setups.
        """
        now = utcnow()
        dispatched_count = 0

        async with AsyncSessionLocal() as session:
            # Find candidate jobs that may be due
            stmt = (
                select(ScheduledJob.id, ScheduledJob.cron_expression, ScheduledJob.interval_seconds, ScheduledJob.workflow_id)
                .join(Workflow, ScheduledJob.workflow_id == Workflow.id)
                .where(
                    ScheduledJob.enabled == True,
                    ScheduledJob.next_run_at <= now,
                    Workflow.status == "active"
                )
            )
            res = await session.execute(stmt)
            candidates = res.all()

        for cand in candidates:
            job_id, cron_expr, interval_sec, wf_id = cand

            # Compute next run
            temp_job = ScheduledJob(cron_expression=cron_expr, interval_seconds=interval_sec)
            next_run = self.calculate_next_run(temp_job, now)

            # Atomically claim the job to prevent another scheduler instance from claiming it
            async with AsyncSessionLocal() as session:
                claim_stmt = (
                    update(ScheduledJob)
                    .where(ScheduledJob.id == job_id, ScheduledJob.next_run_at <= now)
                    .values(last_run_at=now, next_run_at=next_run)
                    .returning(ScheduledJob.id)
                )
                claim_res = await session.execute(claim_stmt)
                claimed = claim_res.scalar_one_or_none()
                if not claimed:
                    # Raced and claimed by another scheduler instance
                    continue

                # Load workflow details and create execution
                wf_res = await session.execute(select(Workflow).where(Workflow.id == wf_id, Workflow.status == "active"))
                workflow = wf_res.scalar_one_or_none()
                if not workflow:
                    await session.commit()
                    continue

                execution = Execution(
                    workflow_id=workflow.id,
                    owner_id=workflow.owner_id,
                    workflow_version=workflow.version,
                    status="QUEUED",
                    trigger_source="scheduled",
                    input_payload={"scheduled_at": now.isoformat()},
                    workflow_snapshot=copy.deepcopy(workflow.definition_json),
                )
                session.add(execution)
                await session.commit()

                # Enqueue background execution
                await queue_service.enqueue(execution.id)
                dispatched_count += 1
                logger.info(f"Dispatched scheduled workflow '{workflow.name}' (id: {workflow.id}), next run at {next_run}")

        return dispatched_count


scheduler_service = SchedulerService()
