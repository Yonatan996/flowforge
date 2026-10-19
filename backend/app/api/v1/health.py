from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.services.queue_service import queue_service

router = APIRouter(tags=["Health"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health & Readiness check endpoint for Docker, K8s, and monitoring."""
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    redis_ok = False
    try:
        redis = await queue_service.get_redis()
        if redis:
            await redis.ping()
            redis_ok = True
        else:
            redis_ok = "in_memory"
    except Exception:
        redis_ok = False

    healthy = db_ok and (redis_ok is not False)
    payload = {
        "status": "healthy" if healthy else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "queue": "connected" if redis_ok is True else ("in_memory" if redis_ok == "in_memory" else "unreachable"),
    }
    return JSONResponse(status_code=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE, content=payload)
