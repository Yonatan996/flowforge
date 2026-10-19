import json
from typing import Any, Dict
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.services.triggers.webhook_trigger import webhook_trigger_service

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

MAX_WEBHOOK_SIZE = 1024 * 1024  # 1 MB


@router.post("/{webhook_token}", status_code=status.HTTP_202_ACCEPTED)
async def handle_webhook(
    webhook_token: str,
    request: Request,
    idempotency_key: str = Header(None, alias="Idempotency-Key"),
    x_idempotency_key: str = Header(None, alias="X-Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
):
    # Enforce request body size limit
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_WEBHOOK_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Payload exceeds maximum permitted size of 1 MB"
        )

    # Read and parse JSON payload
    try:
        raw_body = await request.body()
        if len(raw_body) > MAX_WEBHOOK_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Payload exceeds maximum permitted size of 1 MB"
            )

        # Enforce application/json when body is present
        content_type = request.headers.get("content-type", "")
        if raw_body and not ("application/json" in content_type or "+json" in content_type):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Webhook payload Content-Type must be application/json"
            )

        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        if not isinstance(payload, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook payload must be a JSON object"
            )
    except UnicodeDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid character encoding in payload")
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")

    active_idempotency_key = idempotency_key or x_idempotency_key

    try:
        execution = await webhook_trigger_service.process_incoming_webhook(
            db=db,
            webhook_token=webhook_token,
            payload=payload,
            idempotency_key=active_idempotency_key
        )
        return {
            "status": "accepted",
            "message": "Workflow execution enqueued",
            "execution_id": execution.id,
            "idempotency_key": execution.idempotency_key,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
