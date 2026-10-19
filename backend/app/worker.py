import asyncio
import logging
from backend.app.core.config import settings
from backend.app.core.logging_config import setup_logging
from backend.app.services.queue_service import queue_service
from backend.app.services.execution_engine import execution_engine

setup_logging(debug=settings.DEBUG)
logger = logging.getLogger("flowforge.worker")


async def main():
    logger.info("Starting FlowForge dedicated background worker...")
    semaphore = asyncio.Semaphore(settings.WORKER_CONCURRENCY)

    async def _process_with_limit(execution_id: str):
        async with semaphore:
            await execution_engine.execute_job(execution_id)

    while True:
        try:
            execution_id = await queue_service.dequeue(timeout=2.0)
            if execution_id:
                logger.info(f"Worker claimed job {execution_id}")
                asyncio.create_task(_process_with_limit(execution_id))
        except (KeyboardInterrupt, asyncio.CancelledError):
            logger.info("Worker shutting down...")
            break
        except Exception as e:
            logger.error(f"Worker encountered error: {e}", exc_info=True)
            await asyncio.sleep(1.0)


if __name__ == "__main__":
    asyncio.run(main())
