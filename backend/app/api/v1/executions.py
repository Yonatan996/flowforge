import copy
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.workflow import Workflow
from backend.app.models.execution import Execution
from backend.app.models.execution_step import ExecutionStep
from backend.app.schemas.execution import (
    ExecutionResponse,
    ExecutionDetailResponse,
    ExecutionStepResponse,
    ManualRunRequest,
)
from backend.app.services.triggers.manual_trigger import manual_trigger_service
from backend.app.services.queue_service import queue_service

router = APIRouter(tags=["Executions"])


@router.get("/executions", response_model=List[ExecutionResponse])
async def list_executions(
    workflow_id: Optional[str] = Query(None, description="Filter by workflow ID"),
    status: Optional[str] = Query(None, description="Filter by execution status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Execution)
        .where(Execution.owner_id == current_user.id)
        .options(selectinload(Execution.steps))
    )
    if workflow_id:
        query = query.where(Execution.workflow_id == workflow_id)
    if status:
        query = query.where(Execution.status == status)

    query = query.order_by(desc(Execution.created_at)).offset(skip).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/executions/{execution_id}", response_model=ExecutionDetailResponse)
async def get_execution(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Execution)
        .where(Execution.id == execution_id, Execution.owner_id == current_user.id)
        .options(selectinload(Execution.steps), selectinload(Execution.workflow))
    )
    res = await db.execute(stmt)
    execution = res.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")

    detail = ExecutionDetailResponse.model_validate(execution)
    if execution.workflow:
        detail.workflow_name = execution.workflow.name
    return detail


@router.get("/executions/{execution_id}/steps", response_model=List[ExecutionStepResponse])
async def get_execution_steps(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership of execution
    stmt = select(Execution).where(Execution.id == execution_id, Execution.owner_id == current_user.id)
    res = await db.execute(stmt)
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")

    step_stmt = (
        select(ExecutionStep)
        .where(ExecutionStep.execution_id == execution_id)
        .order_by(ExecutionStep.step_order)
    )
    step_res = await db.execute(step_stmt)
    return step_res.scalars().all()


@router.post("/workflows/{workflow_id}/run", response_model=ExecutionResponse, status_code=status.HTTP_201_CREATED)
async def run_workflow(
    workflow_id: str,
    body: Optional[ManualRunRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Workflow).where(Workflow.id == workflow_id, Workflow.owner_id == current_user.id)
    res = await db.execute(stmt)
    workflow = res.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    payload = body.payload if body else {}
    try:
        execution = await manual_trigger_service.trigger_manual_execution(db, workflow, payload)
        return execution
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/executions/{execution_id}/retry", response_model=ExecutionResponse, status_code=status.HTTP_201_CREATED)
async def retry_execution(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Execution).where(Execution.id == execution_id, Execution.owner_id == current_user.id)
    res = await db.execute(stmt)
    original = res.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")

    # Clone into a new execution in QUEUED state
    new_execution = Execution(
        workflow_id=original.workflow_id,
        owner_id=original.owner_id,
        workflow_version=original.workflow_version,
        status="QUEUED",
        trigger_source=f"retry:{original.trigger_source}",
        input_payload=copy.deepcopy(original.input_payload),
        workflow_snapshot=copy.deepcopy(original.workflow_snapshot),
    )
    db.add(new_execution)
    await db.commit()
    await db.refresh(new_execution)

    await queue_service.enqueue(new_execution.id)
    return new_execution
