import asyncio
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import select
from unittest.mock import patch, MagicMock

from backend.app.models.execution import Execution
from backend.app.services.execution_engine import execution_engine
from backend.app.services.scheduler_service import scheduler_service
from backend.app.models.workflow import Workflow
from backend.app.models.scheduled_job import ScheduledJob
from backend.app.core.database import AsyncSessionLocal


from backend.app.models.user import User


@pytest.mark.asyncio
async def test_step_retries_and_failure():
    async with AsyncSessionLocal() as session:
        user = User(id="user_retry", email="retry_user@example.com", password_hash="hash")
        session.add(user)
        await session.flush()

        wf = Workflow(
            owner_id=user.id,
            name="Retry Test",
            definition_json={
                "trigger": {"type": "manual", "config": {}},
                "steps": [
                    {
                        "key": "failing_http",
                        "name": "Failing HTTP",
                        "type": "http_request",
                        "config": {"url": "https://example.com/mock-endpoint", "method": "GET"},
                        "retry": {"max_attempts": 2, "backoff_factor": 1.0}
                    }
                ]
            }
        )
        session.add(wf)
        await session.flush()

        execution = Execution(
            workflow_id=wf.id,
            owner_id=user.id,
            status="QUEUED",
            workflow_snapshot=wf.definition_json,
        )
        session.add(execution)
        await session.commit()
        exec_id = execution.id

    with patch("backend.app.services.actions.http_action.validate_target_url", return_value=("https", "example.com", 443, "93.184.216.34")):
        with patch("httpx.AsyncClient.request", side_effect=Exception("Connection reset")):
            await execution_engine.execute_job(exec_id)

    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Execution).where(Execution.id == exec_id))
        finished_exec = res.scalar_one()
        assert finished_exec.status == "FAILED"
        assert finished_exec.error_summary is not None


@pytest.mark.asyncio
async def test_abandoned_execution_recovery():
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=10)
    async with AsyncSessionLocal() as session:
        user = User(id="user_rec", email="recovery@example.com", password_hash="hash")
        session.add(user)
        await session.flush()

        wf = Workflow(owner_id=user.id, name="Crash Test", definition_json={})
        session.add(wf)
        await session.flush()

        stalled = Execution(
            workflow_id=wf.id,
            owner_id=user.id,
            status="RUNNING",
            started_at=stale_time,
            workflow_snapshot={},
        )
        session.add(stalled)
        await session.commit()
        stalled_id = stalled.id

    count = await execution_engine.recover_abandoned_executions()
    assert count >= 1

    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Execution).where(Execution.id == stalled_id))
        recovered = res.scalar_one()
        assert recovered.status == "FAILED"
        assert "timed out or worker process terminated" in recovered.error_summary


@pytest.mark.asyncio
async def test_scheduled_job_dispatch():
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as session:
        user = User(id="user_sched", email="sched@example.com", password_hash="hash")
        session.add(user)
        await session.flush()

        wf = Workflow(
            owner_id=user.id,
            name="Scheduled Backup",
            status="active",
            trigger_type="scheduled",
            definition_json={"trigger": {"type": "scheduled", "config": {"interval_seconds": 60}}, "steps": []}
        )
        session.add(wf)
        await session.flush()

        job = ScheduledJob(
            workflow_id=wf.id,
            interval_seconds=60,
            next_run_at=now - timedelta(seconds=10),
            enabled=True
        )
        session.add(job)
        await session.commit()

    dispatched = await scheduler_service.check_and_dispatch_due_jobs()
    assert dispatched >= 1


@pytest.mark.asyncio
async def test_concurrent_scheduler_instances_no_double_dispatch():
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as session:
        user = User(id="user_race_sched", email="race_sched@example.com", password_hash="hash")
        session.add(user)
        await session.flush()

        wf = Workflow(
            owner_id=user.id,
            name="Race Schedule Flow",
            status="active",
            trigger_type="scheduled",
            definition_json={"trigger": {"type": "scheduled", "config": {"interval_seconds": 120}}, "steps": []}
        )
        session.add(wf)
        await session.flush()

        job = ScheduledJob(
            workflow_id=wf.id,
            interval_seconds=120,
            next_run_at=now - timedelta(seconds=5),
            enabled=True
        )
        session.add(job)
        await session.commit()

    # Simulate two scheduler instances running check_and_dispatch_due_jobs concurrently
    results = await asyncio.gather(
        scheduler_service.check_and_dispatch_due_jobs(),
        scheduler_service.check_and_dispatch_due_jobs()
    )

    # Exactly ONE scheduler instance should have claimed and dispatched the job
    assert sum(results) == 1


@pytest.mark.asyncio
async def test_long_running_execution_sweeper_boundary():
    # An execution that started recently (within threshold) must NOT be reaped by the sweeper
    recent_time = datetime.now(timezone.utc) - timedelta(seconds=10)
    async with AsyncSessionLocal() as session:
        user = User(id="user_recent", email="recent@example.com", password_hash="hash")
        session.add(user)
        await session.flush()

        wf = Workflow(owner_id=user.id, name="Active Flow", definition_json={})
        session.add(wf)
        await session.flush()

        active = Execution(
            workflow_id=wf.id,
            owner_id=user.id,
            status="RUNNING",
            started_at=recent_time,
            workflow_snapshot={},
        )
        session.add(active)
        await session.commit()
        active_id = active.id

    # Run abandoned execution sweeper
    count = await execution_engine.recover_abandoned_executions()

    # Verify our recently started execution was NOT marked failed
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Execution).where(Execution.id == active_id))
        check_active = res.scalar_one()
        assert check_active.status == "RUNNING"


@pytest.mark.asyncio
async def test_workflow_edit_does_not_mutate_in_flight_execution_snapshot():
    # Verify that updating a workflow's definition does NOT mutate existing execution snapshot
    async with AsyncSessionLocal() as session:
        user = User(id="user_snap", email="snap@example.com", password_hash="hash")
        session.add(user)
        await session.flush()

        original_def = {
            "trigger": {"type": "manual", "config": {}},
            "steps": [{"key": "s1", "name": "Original Step", "type": "json_transform", "config": {"operation": "select_path", "path": "input.v1"}}]
        }
        wf = Workflow(owner_id=user.id, name="Snapshot Flow", definition_json=original_def)
        session.add(wf)
        await session.flush()

        # Capture snapshot when queued
        ex = Execution(
            workflow_id=wf.id,
            owner_id=user.id,
            status="QUEUED",
            workflow_snapshot=dict(original_def),
        )
        session.add(ex)
        await session.commit()
        ex_id = ex.id
        wf_id = wf.id

        # Now mutate the workflow definition
        wf.definition_json = {
            "trigger": {"type": "manual", "config": {}},
            "steps": [{"key": "s2", "name": "Mutated Step", "type": "json_transform", "config": {"operation": "select_path", "path": "input.v2"}}]
        }
        await session.commit()

    # Verify execution snapshot still preserves original step s1
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Execution).where(Execution.id == ex_id))
        persisted_ex = res.scalar_one()
        assert persisted_ex.workflow_snapshot["steps"][0]["key"] == "s1"
        assert persisted_ex.workflow_snapshot["steps"][0]["name"] == "Original Step"


@pytest.mark.asyncio
async def test_cascade_deletion_of_workflow_and_schedules():
    async with AsyncSessionLocal() as session:
        user = User(id="user_cascade", email="cascade@example.com", password_hash="hash")
        session.add(user)
        await session.flush()

        wf = Workflow(owner_id=user.id, name="Cascade Flow", definition_json={})
        session.add(wf)
        await session.flush()
        wf_id = wf.id

        job = ScheduledJob(workflow_id=wf_id, interval_seconds=60, enabled=True)
        session.add(job)
        ex = Execution(workflow_id=wf_id, owner_id=user.id, status="QUEUED", workflow_snapshot={})
        session.add(ex)
        await session.commit()
        ex_id = ex.id
        job_id = job.id

        # Delete workflow
        await session.delete(wf)
        await session.commit()

    # Verify scheduled job and execution were cascade-deleted
    async with AsyncSessionLocal() as session:
        res_job = await session.execute(select(ScheduledJob).where(ScheduledJob.id == job_id))
        assert res_job.scalar_one_or_none() is None

        res_ex = await session.execute(select(Execution).where(Execution.id == ex_id))
        assert res_ex.scalar_one_or_none() is None
