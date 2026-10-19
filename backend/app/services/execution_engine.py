import asyncio
import logging
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, List
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import AsyncSessionLocal
from backend.app.core.config import settings
from backend.app.models.execution import Execution
from backend.app.models.execution_step import ExecutionStep
from backend.app.models.workflow import Workflow
from backend.app.services.actions import ACTION_REGISTRY, ActionResult
from backend.app.services.actions.http_action import redact_headers

logger = logging.getLogger(__name__)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ExecutionEngine:
    """
    Dedicated workflow execution engine independent of HTTP route handlers.
    Manages step orchestration, condition branching, retries with backoff,
    and state persistence.
    """

    async def execute_job(self, execution_id: str) -> None:
        """
        Main worker entrypoint for executing a queued job.
        Uses short transactions and atomic state claims.
        """
        # Step 1: Atomically claim the execution from QUEUED to RUNNING
        async with AsyncSessionLocal() as session:
            stmt = (
                update(Execution)
                .where(Execution.id == execution_id, Execution.status == "QUEUED")
                .values(status="RUNNING", started_at=utcnow())
                .returning(Execution.id)
            )
            result = await session.execute(stmt)
            await session.commit()
            claimed = result.scalar_one_or_none()
            if not claimed:
                logger.warning(f"Execution {execution_id} was not in QUEUED state or claimed by another worker. Skipping.")
                return

        # Fetch execution record and snapshot
        async with AsyncSessionLocal() as session:
            exec_stmt = select(Execution).where(Execution.id == execution_id)
            res = await session.execute(exec_stmt)
            execution = res.scalar_one_or_none()
            if not execution:
                logger.error(f"Execution {execution_id} not found in database.")
                return

            workflow_snapshot = execution.workflow_snapshot or {}
            input_payload = execution.input_payload or {}
            start_time = execution.started_at or utcnow()

        steps_def: List[Dict[str, Any]] = workflow_snapshot.get("steps", [])
        if not steps_def:
            # Nothing to execute
            await self._finalize_execution(execution_id, "SUCCEEDED", start_time, error_summary=None)
            return

        # Create ExecutionStep rows in PENDING state
        step_records: List[Dict[str, Any]] = []
        async with AsyncSessionLocal() as session:
            for idx, s in enumerate(steps_def):
                step_obj = ExecutionStep(
                    execution_id=execution_id,
                    step_key=s.get("key", f"step_{idx}"),
                    step_type=s.get("type", "unknown"),
                    step_order=idx,
                    status="pending",
                    input_summary={},
                    output_summary={},
                    attempt_count=0,
                )
                session.add(step_obj)
            await session.commit()

        # Step runtime context
        runtime_context: Dict[str, Any] = {
            "input": input_payload,
            "steps": {}
        }

        execution_status = "SUCCEEDED"
        execution_error = None
        skip_remaining = False

        # Execute steps in order
        for idx, s_def in enumerate(steps_def):
            step_key = s_def.get("key", f"step_{idx}")
            step_type = s_def.get("type")
            step_config = s_def.get("config", {})
            retry_cfg = s_def.get("retry", {}) or {}
            max_attempts = max(int(retry_cfg.get("max_attempts", 1)), 1)
            backoff_factor = float(retry_cfg.get("backoff_factor", settings.RETRY_BASE_DELAY_SECONDS))

            if skip_remaining:
                # Mark step as skipped
                await self._update_step_status(
                    execution_id=execution_id,
                    step_key=step_key,
                    status="skipped",
                    output_summary={"reason": "Skipped due to prior step condition or failure"},
                    duration_ms=0.0
                )
                runtime_context["steps"][step_key] = {"status": "skipped", "output": {}}
                continue

            # Execute step with retries
            step_success, step_output, step_error, should_skip = await self._run_step_with_retries(
                execution_id=execution_id,
                step_key=step_key,
                step_type=step_type,
                step_config=step_config,
                runtime_context=runtime_context,
                max_attempts=max_attempts,
                backoff_factor=backoff_factor
            )

            runtime_context["steps"][step_key] = {
                "status": "succeeded" if step_success else "failed",
                "output": step_output
            }

            if not step_success:
                execution_status = "FAILED"
                execution_error = step_error or f"Step '{step_key}' failed"
                skip_remaining = True
            elif should_skip:
                # Condition evaluated to false, skip subsequent steps
                skip_remaining = True

        # Finalize execution state
        await self._finalize_execution(
            execution_id=execution_id,
            status=execution_status,
            start_time=start_time,
            error_summary=execution_error
        )

    async def _run_step_with_retries(
        self,
        execution_id: str,
        step_key: str,
        step_type: str,
        step_config: Dict[str, Any],
        runtime_context: Dict[str, Any],
        max_attempts: int,
        backoff_factor: float
    ) -> (bool, Dict[str, Any], Optional[str], bool):
        """
        Executes a single action with retry loop, exponential backoff, and jitter.
        Transactions are NEVER held during action execution or backoff sleeps!
        """
        action_cls = ACTION_REGISTRY.get(step_type)
        if not action_cls:
            err = f"Unrecognized step type '{step_type}'"
            await self._update_step_status(
                execution_id=execution_id,
                step_key=step_key,
                status="failed",
                output_summary={},
                error_summary=err,
                attempt_count=1,
                duration_ms=0.0
            )
            return False, {}, err, False

        action_instance = action_cls()
        step_start_monotonic = time.monotonic()
        step_start_dt = utcnow()

        # Update step to running
        await self._update_step_status(
            execution_id=execution_id,
            step_key=step_key,
            status="running",
            started_at=step_start_dt
        )

        last_error = None
        last_output = {}
        should_skip_subsequent = False

        for attempt in range(1, max_attempts + 1):
            # Short sanitized summary of input
            input_sanitized = {
                "step_key": step_key,
                "step_type": step_type,
                "attempt": attempt,
            }
            if step_type == "http_request":
                input_sanitized["url"] = step_config.get("url")
                input_sanitized["method"] = step_config.get("method")
                input_sanitized["headers"] = redact_headers(step_config.get("headers", {}))

            try:
                # Execute action - NO active DB session during network I/O
                res: ActionResult = await asyncio.wait_for(
                    action_instance.execute(step_config, runtime_context),
                    timeout=settings.EXECUTION_TIMEOUT_SECONDS
                )

                last_output = res.output or {}
                last_error = res.error
                should_skip_subsequent = res.should_skip_subsequent

                if res.success:
                    duration_ms = (time.monotonic() - step_start_monotonic) * 1000.0
                    await self._update_step_status(
                        execution_id=execution_id,
                        step_key=step_key,
                        status="succeeded",
                        input_summary=input_sanitized,
                        output_summary=last_output,
                        error_summary=None,
                        attempt_count=attempt,
                        completed_at=utcnow(),
                        duration_ms=duration_ms
                    )
                    return True, last_output, None, should_skip_subsequent

                # Failed, check if retryable
                if not res.retryable or attempt >= max_attempts:
                    break

            except asyncio.TimeoutError:
                last_error = f"Step execution timed out after {settings.EXECUTION_TIMEOUT_SECONDS}s"
                if attempt >= max_attempts:
                    break
            except Exception as e:
                logger.exception(f"Unexpected exception in step {step_key}: {e}")
                last_error = f"Step execution error: {str(e)}"
                break

            # Sleep with exponential backoff and jitter
            delay = (backoff_factor ** (attempt - 1)) + random.uniform(0.1, 0.5)
            logger.info(f"Step {step_key} failed (attempt {attempt}/{max_attempts}). Retrying in {delay:.2f}s...")
            await asyncio.sleep(delay)

        # Step permanently failed
        duration_ms = (time.monotonic() - step_start_monotonic) * 1000.0
        await self._update_step_status(
            execution_id=execution_id,
            step_key=step_key,
            status="failed",
            input_summary=input_sanitized,
            output_summary=last_output,
            error_summary=last_error,
            attempt_count=attempt,
            completed_at=utcnow(),
            duration_ms=duration_ms
        )
        return False, last_output, last_error, should_skip_subsequent

    async def _update_step_status(
        self,
        execution_id: str,
        step_key: str,
        status: str,
        input_summary: Optional[Dict[str, Any]] = None,
        output_summary: Optional[Dict[str, Any]] = None,
        error_summary: Optional[str] = None,
        attempt_count: Optional[int] = None,
        started_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        duration_ms: Optional[float] = None
    ) -> None:
        """Helper to update an ExecutionStep record using a short dedicated transaction."""
        async with AsyncSessionLocal() as session:
            stmt = select(ExecutionStep).where(
                ExecutionStep.execution_id == execution_id,
                ExecutionStep.step_key == step_key
            )
            res = await session.execute(stmt)
            step = res.scalar_one_or_none()
            if not step:
                return

            step.status = status
            if input_summary is not None:
                step.input_summary = input_summary
            if output_summary is not None:
                step.output_summary = output_summary
            if error_summary is not None:
                step.error_summary = error_summary
            if attempt_count is not None:
                step.attempt_count = attempt_count
            if started_at is not None:
                step.started_at = started_at
            if completed_at is not None:
                step.completed_at = completed_at
            if duration_ms is not None:
                step.duration_ms = duration_ms

            await session.commit()

    async def _finalize_execution(
        self,
        execution_id: str,
        status: str,
        start_time: datetime,
        error_summary: Optional[str] = None
    ) -> None:
        """Marks the execution in its terminal state with short transaction."""
        now = utcnow()
        if start_time:
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            duration_ms = (now - start_time).total_seconds() * 1000.0
        else:
            duration_ms = 0.0

        async with AsyncSessionLocal() as session:
            stmt = select(Execution).where(Execution.id == execution_id)
            res = await session.execute(stmt)
            execution = res.scalar_one_or_none()
            if not execution:
                return

            # Avoid overwriting already finalized executions (idempotent terminal transition)
            if execution.status in ("SUCCEEDED", "FAILED", "CANCELLED"):
                return

            execution.status = status
            execution.completed_at = now
            execution.duration_ms = max(duration_ms, 0.0)
            execution.error_summary = error_summary
            await session.commit()
            logger.info(f"Execution {execution_id} finalized as {status} (duration: {execution.duration_ms:.1f}ms)")

    async def recover_abandoned_executions(self) -> int:
        """
        Sweeps and marks abandoned RUNNING executions (e.g. from crashed workers) as FAILED.
        """
        cutoff = utcnow() - timedelta(seconds=settings.EXECUTION_TIMEOUT_SECONDS * 2)
        count = 0
        async with AsyncSessionLocal() as session:
            stmt = select(Execution).where(
                Execution.status == "RUNNING",
                Execution.started_at < cutoff
            )
            res = await session.execute(stmt)
            abandoned = res.scalars().all()
            for ex in abandoned:
                ex.status = "FAILED"
                ex.completed_at = utcnow()
                ex.error_summary = "Execution timed out or worker process terminated unexpectedly"
                count += 1
            if count > 0:
                await session.commit()
                logger.warning(f"Recovered {count} abandoned executions and marked as FAILED")
        return count


execution_engine = ExecutionEngine()
