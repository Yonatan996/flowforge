from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.workflow import Workflow
from backend.app.models.execution import Execution
from backend.app.schemas.workflow import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowResponse,
    WorkflowValidationResult,
)
from backend.app.services.workflow_service import workflow_service

router = APIRouter(prefix="/workflows", tags=["Workflows"])


def format_workflow_response(workflow: Workflow, request: Request, last_exec: Optional[Execution] = None) -> WorkflowResponse:
    webhook_url = None
    if workflow.webhook_token:
        # Build URL relative to host
        base_url = str(request.base_url).rstrip("/")
        webhook_url = f"{base_url}/api/v1/webhooks/{workflow.webhook_token}"

    return WorkflowResponse(
        id=workflow.id,
        owner_id=workflow.owner_id,
        name=workflow.name,
        description=workflow.description or "",
        status=workflow.status,
        definition_json=workflow.definition_json or {},
        version=workflow.version,
        trigger_type=workflow.trigger_type,
        webhook_token=workflow.webhook_token,
        webhook_url=webhook_url,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
        last_execution_status=last_exec.status if last_exec else None,
        last_execution_at=last_exec.completed_at or last_exec.started_at if last_exec else None,
    )


@router.get("", response_model=List[WorkflowResponse])
async def list_workflows(
    request: Request,
    search: Optional[str] = Query(None, description="Search by name or description"),
    status: Optional[str] = Query(None, description="Filter by status (draft, active, inactive)"),
    trigger_type: Optional[str] = Query(None, description="Filter by trigger type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Workflow).where(Workflow.owner_id == current_user.id)

    if search:
        query = query.where(
            (Workflow.name.ilike(f"%{search}%")) | (Workflow.description.ilike(f"%{search}%"))
        )
    if status:
        query = query.where(Workflow.status == status)
    if trigger_type:
        query = query.where(Workflow.trigger_type == trigger_type)

    query = query.order_by(desc(Workflow.updated_at)).offset(skip).limit(limit)
    res = await db.execute(query)
    workflows = res.scalars().all()

    # Enrich with last execution info
    results = []
    for wf in workflows:
        last_exec_stmt = (
            select(Execution)
            .where(Execution.workflow_id == wf.id)
            .order_by(desc(Execution.created_at))
            .limit(1)
        )
        exec_res = await db.execute(last_exec_stmt)
        last_exec = exec_res.scalar_one_or_none()
        results.append(format_workflow_response(wf, request, last_exec))

    return results


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    request: Request,
    data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workflow = await workflow_service.create(db, current_user.id, data)
    return format_workflow_response(workflow, request)


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Workflow).where(Workflow.id == workflow_id, Workflow.owner_id == current_user.id)
    res = await db.execute(stmt)
    workflow = res.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    last_exec_stmt = (
        select(Execution)
        .where(Execution.workflow_id == workflow.id)
        .order_by(desc(Execution.created_at))
        .limit(1)
    )
    exec_res = await db.execute(last_exec_stmt)
    last_exec = exec_res.scalar_one_or_none()

    return format_workflow_response(workflow, request, last_exec)


@router.patch("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    request: Request,
    data: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Workflow).where(Workflow.id == workflow_id, Workflow.owner_id == current_user.id)
    res = await db.execute(stmt)
    workflow = res.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    try:
        updated = await workflow_service.update(db, workflow, data)
        return format_workflow_response(updated, request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{workflow_id}", status_code=status.HTTP_200_OK)
async def delete_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Workflow).where(Workflow.id == workflow_id, Workflow.owner_id == current_user.id)
    res = await db.execute(stmt)
    workflow = res.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    await db.delete(workflow)
    await db.commit()
    return {"message": "Workflow deleted successfully"}


@router.post("/{workflow_id}/activate", response_model=WorkflowResponse)
async def activate_workflow(
    workflow_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Workflow).where(Workflow.id == workflow_id, Workflow.owner_id == current_user.id)
    res = await db.execute(stmt)
    workflow = res.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    try:
        activated = await workflow_service.activate(db, workflow)
        return format_workflow_response(activated, request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{workflow_id}/deactivate", response_model=WorkflowResponse)
async def deactivate_workflow(
    workflow_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Workflow).where(Workflow.id == workflow_id, Workflow.owner_id == current_user.id)
    res = await db.execute(stmt)
    workflow = res.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    deactivated = await workflow_service.deactivate(db, workflow)
    return format_workflow_response(deactivated, request)


@router.post("/{workflow_id}/duplicate", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_workflow(
    workflow_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Workflow).where(Workflow.id == workflow_id, Workflow.owner_id == current_user.id)
    res = await db.execute(stmt)
    workflow = res.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    dup = await workflow_service.duplicate(db, workflow, current_user.id)
    return format_workflow_response(dup, request)


@router.post("/{workflow_id}/validate", response_model=WorkflowValidationResult)
async def validate_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Workflow).where(Workflow.id == workflow_id, Workflow.owner_id == current_user.id)
    res = await db.execute(stmt)
    workflow = res.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    return workflow_service.validate_definition(workflow.definition_json, workflow.trigger_type)
