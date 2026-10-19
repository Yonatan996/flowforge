import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.logging_config import setup_logging
from backend.app.core.database import engine, Base
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.workflows import router as workflows_router
from backend.app.api.v1.executions import router as executions_router
from backend.app.api.v1.webhooks import router as webhooks_router
from backend.app.api.v1.dashboard import router as dashboard_router
from backend.app.api.v1.schedules import router as schedules_router
from backend.app.api.v1.health import router as health_router

setup_logging(debug=settings.DEBUG)
logger = logging.getLogger("flowforge")

background_tasks = []


async def run_worker_loop():
    """Background worker loop processing queued executions."""
    from backend.app.services.queue_service import queue_service
    from backend.app.services.execution_engine import execution_engine

    logger.info("Starting in-process FlowForge execution worker loop...")
    while True:
        try:
            execution_id = await queue_service.dequeue(timeout=1.0)
            if execution_id:
                asyncio.create_task(execution_engine.execute_job(execution_id))
            # Periodically recover abandoned executions
            await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Worker loop error: {e}", exc_info=True)
            await asyncio.sleep(1.0)


async def run_scheduler_loop():
    """Background scheduler loop checking and dispatching due jobs."""
    from backend.app.services.scheduler_service import scheduler_service
    from backend.app.services.execution_engine import execution_engine

    logger.info("Starting in-process FlowForge scheduler loop...")
    last_recovery = 0
    while True:
        try:
            await scheduler_service.check_and_dispatch_due_jobs()
            
            # Run abandoned execution recovery every minute
            await execution_engine.recover_abandoned_executions()

            await asyncio.sleep(settings.SCHEDULER_CHECK_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Scheduler loop error: {e}", exc_info=True)
            await asyncio.sleep(5.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema for dev / sqlite
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("FlowForge database tables initialized")

    # Start background loops (allows full standalone functionality without external daemon)
    worker_task = asyncio.create_task(run_worker_loop())
    scheduler_task = asyncio.create_task(run_scheduler_loop())
    background_tasks.extend([worker_task, scheduler_task])

    yield

    # Shutdown
    for task in background_tasks:
        task.cancel()
    await asyncio.gather(*background_tasks, return_exceptions=True)
    await engine.dispose()
    logger.info("FlowForge shutdown complete")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Professional workflow automation platform API",
    version="1.0.0",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler for uniform responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error occurred. Please consult server logs."}
    )

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(workflows_router, prefix=settings.API_V1_STR)
app.include_router(executions_router, prefix=settings.API_V1_STR)
app.include_router(webhooks_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(schedules_router, prefix=settings.API_V1_STR)
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(health_router)  # Also root /health for docker/k8s probes
