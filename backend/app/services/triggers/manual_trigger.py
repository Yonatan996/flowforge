import copy
import logging
from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.workflow import Workflow
from backend.app.models.execution import Execution
from backend.app.services.workflow_service import workflow_service
from backend.app.services.queue_service import queue_service

logger = logging.getLogger(__name__)


class ManualTriggerService:
    @staticmethod
    async def trigger_manual_execution(
        db: AsyncSession,
        workflow: Workflow,
        payload: Dict[str, Any]
    ) -> Execution:
        """
        Manually triggers a workflow execution using the current definition snapshot.
        Enforces validation before executing.
        """
        # Validate workflow definition
        val_res = workflow_service.validate_definition(workflow.definition_json, workflow.trigger_type)
        if not val_res.valid:
            raise ValueError(f"Cannot execute invalid workflow: {'; '.join(val_res.errors)}")

        execution = Execution(
            workflow_id=workflow.id,
            owner_id=workflow.owner_id,
            workflow_version=workflow.version,
            status="QUEUED",
            trigger_source="manual",
            input_payload=payload or {},
            workflow_snapshot=copy.deepcopy(workflow.definition_json),
        )
        db.add(execution)
        await db.commit()
        await db.refresh(execution)

        # Enqueue background job
        await queue_service.enqueue(execution.id)
        logger.info(f"Enqueued manual execution {execution.id} for workflow {workflow.id}")

        return execution


manual_trigger_service = ManualTriggerService()
