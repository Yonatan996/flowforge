import copy
import logging
from typing import Any, Dict, List, Optional, Tuple
from croniter import croniter
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.workflow import Workflow, generate_webhook_token
from backend.app.models.scheduled_job import ScheduledJob
from backend.app.schemas.workflow import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowValidationResult,
    WorkflowDefinition,
)
from backend.app.services.actions.http_action import validate_target_url

logger = logging.getLogger(__name__)


class WorkflowService:
    @staticmethod
    def validate_definition(definition: Dict[str, Any], trigger_type: str) -> WorkflowValidationResult:
        """Thoroughly validates workflow definition, triggers, and steps."""
        errors: List[str] = []
        warnings: List[str] = []

        if not isinstance(definition, dict):
            return WorkflowValidationResult(valid=False, errors=["Definition must be a JSON object"])

        # Validate trigger
        trigger_def = definition.get("trigger", {})
        actual_trigger_type = trigger_def.get("type", trigger_type)
        trigger_cfg = trigger_def.get("config", {})

        if actual_trigger_type == "scheduled":
            cron_expr = trigger_cfg.get("cron_expression")
            interval_sec = trigger_cfg.get("interval_seconds")
            if not cron_expr and not interval_sec:
                errors.append("Scheduled trigger requires either 'cron_expression' or 'interval_seconds'")
            elif cron_expr:
                if not croniter.is_valid(cron_expr):
                    errors.append(f"Invalid cron expression: '{cron_expr}'")
            elif interval_sec:
                if not isinstance(interval_sec, int) or interval_sec < 10:
                    errors.append("Interval must be an integer of at least 10 seconds")

        # Validate steps
        steps = definition.get("steps", [])
        if not isinstance(steps, list):
            errors.append("'steps' must be a list of step definitions")
            return WorkflowValidationResult(valid=False, errors=errors, warnings=warnings)

        if len(steps) > settings.MAX_WORKFLOW_STEPS:
            errors.append(f"Workflow exceeds maximum allowed steps limit ({settings.MAX_WORKFLOW_STEPS} max, received {len(steps)})")

        if len(steps) == 0:
            warnings.append("Workflow has no action steps configured")

        seen_keys = set()
        for idx, s in enumerate(steps):
            if not isinstance(s, dict):
                errors.append(f"Step at index {idx} must be an object")
                continue

            step_key = s.get("key")
            if not step_key or not isinstance(step_key, str):
                errors.append(f"Step at index {idx} is missing a valid 'key'")
            elif step_key in seen_keys:
                errors.append(f"Duplicate step key '{step_key}' found at index {idx}")
            else:
                seen_keys.add(step_key)

            step_type = s.get("type")
            if step_type not in ("http_request", "json_transform", "condition"):
                errors.append(f"Step '{step_key or idx}' has invalid type '{step_type}'")
                continue

            cfg = s.get("config", {})
            if step_type == "http_request":
                url = cfg.get("url")
                if not url or not isinstance(url, str):
                    errors.append(f"Step '{step_key}': HTTP request requires a valid 'url'")
                else:
                    try:
                        validate_target_url(url)
                    except ValueError as ve:
                        errors.append(f"Step '{step_key}': URL failed SSRF validation: {ve}")

                method = cfg.get("method", "GET").upper()
                if method not in ("GET", "POST", "PUT", "DELETE"):
                    errors.append(f"Step '{step_key}': Invalid HTTP method '{method}'")

            elif step_type == "json_transform":
                operation = cfg.get("operation", "select_path")
                if operation not in ("select_path", "rename_keys", "construct_object", "type_convert"):
                    errors.append(f"Step '{step_key}': Unsupported transformation operation '{operation}'")
                if operation == "select_path" and not cfg.get("path"):
                    errors.append(f"Step '{step_key}': select_path requires 'path' parameter")
                if operation == "rename_keys" and not isinstance(cfg.get("mappings"), dict):
                    errors.append(f"Step '{step_key}': rename_keys requires 'mappings' dictionary")
                if operation == "construct_object" and not isinstance(cfg.get("template"), dict):
                    errors.append(f"Step '{step_key}': construct_object requires 'template' object")
                if operation == "type_convert":
                    if not cfg.get("path"):
                        errors.append(f"Step '{step_key}': type_convert requires 'path'")
                    if cfg.get("target_type") not in ("string", "integer", "float", "boolean", "json"):
                        errors.append(f"Step '{step_key}': Invalid target_type for type_convert")

            elif step_type == "condition":
                if not cfg.get("left_operand"):
                    errors.append(f"Step '{step_key}': Condition requires 'left_operand'")
                op = cfg.get("operator", "equals")
                if op not in ("equals", "not_equals", "greater_than", "less_than", "contains", "exists", "not_exists"):
                    errors.append(f"Step '{step_key}': Invalid condition operator '{op}'")

        is_valid = len(errors) == 0
        return WorkflowValidationResult(valid=is_valid, errors=errors, warnings=warnings)

    @classmethod
    async def create(cls, db: AsyncSession, owner_id: str, data: WorkflowCreate) -> Workflow:
        def_json = data.definition_json.model_dump() if data.definition_json else {"trigger": {"type": data.trigger_type, "config": {}}, "steps": []}
        
        workflow = Workflow(
            owner_id=owner_id,
            name=data.name,
            description=data.description or "",
            status="draft",
            definition_json=def_json,
            version=1,
            trigger_type=data.trigger_type,
            webhook_token=generate_webhook_token() if data.trigger_type == "webhook" else None,
        )
        db.add(workflow)
        await db.commit()
        await db.refresh(workflow)

        # If scheduled trigger, initialize scheduled_job
        if data.trigger_type == "scheduled":
            await cls._sync_scheduled_job(db, workflow)

        return workflow

    @classmethod
    async def update(cls, db: AsyncSession, workflow: Workflow, data: WorkflowUpdate) -> Workflow:
        if data.name is not None:
            workflow.name = data.name
        if data.description is not None:
            workflow.description = data.description
        if data.trigger_type is not None:
            workflow.trigger_type = data.trigger_type
            if workflow.trigger_type == "webhook" and not workflow.webhook_token:
                workflow.webhook_token = generate_webhook_token()
        if data.definition_json is not None:
            workflow.definition_json = data.definition_json.model_dump()
            workflow.version += 1  # Increment version on definition change
        if data.status is not None:
            if data.status == "active":
                val_res = cls.validate_definition(workflow.definition_json, workflow.trigger_type)
                if not val_res.valid or len(workflow.definition_json.get("steps", [])) == 0:
                    raise ValueError(f"Cannot activate invalid workflow: {'; '.join(val_res.errors or ['At least one step is required'])}")
            workflow.status = data.status

        await db.commit()
        await db.refresh(workflow)

        # Sync scheduled job
        if workflow.trigger_type == "scheduled":
            await cls._sync_scheduled_job(db, workflow)

        return workflow

    @classmethod
    async def activate(cls, db: AsyncSession, workflow: Workflow) -> Workflow:
        val_res = cls.validate_definition(workflow.definition_json, workflow.trigger_type)
        steps = workflow.definition_json.get("steps", [])
        if not val_res.valid or len(steps) == 0:
            err_msg = "; ".join(val_res.errors) if val_res.errors else "Workflow must have at least one step before activation"
            raise ValueError(f"Workflow validation failed: {err_msg}")

        workflow.status = "active"
        if workflow.trigger_type == "webhook" and not workflow.webhook_token:
            workflow.webhook_token = generate_webhook_token()

        await db.commit()
        await db.refresh(workflow)

        if workflow.trigger_type == "scheduled":
            await cls._sync_scheduled_job(db, workflow)

        return workflow

    @classmethod
    async def deactivate(cls, db: AsyncSession, workflow: Workflow) -> Workflow:
        workflow.status = "inactive"
        await db.commit()
        await db.refresh(workflow)

        stmt = select(ScheduledJob).where(ScheduledJob.workflow_id == workflow.id)
        res = await db.execute(stmt)
        job = res.scalar_one_or_none()
        if job:
            job.enabled = False
            await db.commit()

        return workflow

    @classmethod
    async def duplicate(cls, db: AsyncSession, workflow: Workflow, owner_id: str) -> Workflow:
        new_def = copy.deepcopy(workflow.definition_json)
        dup = Workflow(
            owner_id=owner_id,
            name=f"{workflow.name} (Copy)",
            description=workflow.description,
            status="draft",
            definition_json=new_def,
            version=1,
            trigger_type=workflow.trigger_type,
            webhook_token=generate_webhook_token() if workflow.trigger_type == "webhook" else None,
        )
        db.add(dup)
        await db.commit()
        await db.refresh(dup)
        return dup

    @classmethod
    async def _sync_scheduled_job(cls, db: AsyncSession, workflow: Workflow) -> None:
        from datetime import datetime, timezone
        trigger_cfg = workflow.definition_json.get("trigger", {}).get("config", {})
        cron_expr = trigger_cfg.get("cron_expression")
        interval_sec = trigger_cfg.get("interval_seconds")

        # Calculate next_run_at
        now = datetime.now(timezone.utc)
        next_run = None
        if cron_expr and croniter.is_valid(cron_expr):
            iter = croniter(cron_expr, now)
            next_run = iter.get_next(datetime)
        elif interval_sec:
            from datetime import timedelta
            next_run = now + timedelta(seconds=interval_sec)

        stmt = select(ScheduledJob).where(ScheduledJob.workflow_id == workflow.id)
        res = await db.execute(stmt)
        job = res.scalar_one_or_none()

        if not job:
            job = ScheduledJob(
                workflow_id=workflow.id,
                cron_expression=cron_expr,
                interval_seconds=interval_sec,
                next_run_at=next_run,
                enabled=(workflow.status == "active")
            )
            db.add(job)
        else:
            job.cron_expression = cron_expr
            job.interval_seconds = interval_sec
            job.next_run_at = next_run
            job.enabled = (workflow.status == "active")

        await db.commit()


workflow_service = WorkflowService()
