import asyncio
import logging
from backend.app.core.config import settings
from backend.app.core.logging_config import setup_logging
from backend.app.services.scheduler_service import scheduler_service
from backend.app.services.execution_engine import execution_engine

setup_logging(debug=settings.DEBUG)
logger = logging.getLogger("flowforge.scheduler")


async def main():
    logger.info("Starting FlowForge dedicated scheduler daemon...")
    while True:
        try:
            count = await scheduler_service.check_and_dispatch_due_jobs()
            if count > 0:
                logger.info(f"Dispatched {count} due jobs")
            await execution_engine.recover_abandoned_executions()
            await asyncio.sleep(settings.SCHEDULER_CHECK_INTERVAL_SECONDS)
        except (KeyboardInterrupt, asyncio.CancelledError):
            logger.info("Scheduler shutting down...")
            break
        except Exception as e:
            logger.error(f"Scheduler encountered error: {e}", exc_info=True)
            await asyncio.sleep(5.0)


if __name__ == "__main__":
    asyncio.run(main())
