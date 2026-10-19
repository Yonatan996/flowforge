import copy
import logging
from typing import Any, Dict, Optional
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.workflow import Workflow
from backend.app.models.execution import Execution
from backend.app.services.queue_service import queue_service

logger = logging.getLogger(__name__)


class WebhookTriggerService:
    @staticmethod
    async def process_incoming_webhook(
        db: AsyncSession,
        webhook_token: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None
    ) -> Execution:
        """
        Validates webhook token, checks idempotency, creates Execution record with snapshot,
        and enqueues background job.
        """
        # Find active workflow with matching webhook_token
        stmt = select(Workflow).where(
            Workflow.webhook_token == webhook_token,
            Workflow.status == "active"
        )
        res = await db.execute(stmt)
        workflow = res.scalar_one_or_none()
        if not workflow:
            raise ValueError("Active webhook workflow not found or inactive")

        # Check idempotency
        if idempotency_key:
            idem_stmt = select(Execution).where(
                Execution.workflow_id == workflow.id,
                Execution.idempotency_key == idempotency_key
            )
            idem_res = await db.execute(idem_stmt)
            existing_exec = idem_res.scalar_one_or_none()
            if existing_exec:
                logger.info(f"Duplicate webhook delivery detected with key '{idempotency_key}'. Returning existing execution {existing_exec.id}.")
                return existing_exec

        # Validate payload against required_fields if defined in trigger config
        trigger_cfg = workflow.definition_json.get("trigger", {}).get("config", {})
        required_fields = trigger_cfg.get("required_fields", [])
        if required_fields:
            missing = [f for f in required_fields if f not in payload]
            if missing:
                raise ValueError(f"Webhook payload is missing required fields: {', '.join(missing)}")

        wf_id = str(workflow.id)
        wf_owner_id = str(workflow.owner_id)
        wf_version = int(workflow.version)
        wf_snapshot = copy.deepcopy(workflow.definition_json)

        # Create execution record with immutable workflow snapshot
        execution = Execution(
            workflow_id=wf_id,
            owner_id=wf_owner_id,
            workflow_version=wf_version,
            status="QUEUED",
            trigger_source="webhook",
            input_payload=payload,
            workflow_snapshot=wf_snapshot,
            idempotency_key=idempotency_key
        )
        try:
            db.add(execution)
            await db.commit()
            await db.refresh(execution)
        except IntegrityError:
            await db.rollback()
            if idempotency_key:
                # Concurrent delivery raced and committed first
                idem_stmt = select(Execution).where(
                    Execution.workflow_id == wf_id,
                    Execution.idempotency_key == idempotency_key
                )
                idem_res = await db.execute(idem_stmt)
                winner = idem_res.scalar_one_or_none()
                if winner:
                    logger.info(f"Concurrent duplicate resolved: returning winner execution {winner.id}")
                    return winner
            raise

        # Enqueue for background processing
        await queue_service.enqueue(execution.id)
        logger.info(f"Enqueued webhook execution {execution.id} for workflow {workflow.id}")

        return execution


webhook_trigger_service = WebhookTriggerService()
