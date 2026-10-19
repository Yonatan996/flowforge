import asyncio
import json
import logging
from typing import Optional, Dict, Any
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory queue fallback for standalone/test execution
_memory_queue: asyncio.Queue = asyncio.Queue()


class QueueService:
    def __init__(self):
        self._redis_client = None
        self._queue_key = "flowforge:execution_queue"

    async def get_redis(self):
        if not settings.USE_REDIS_QUEUE:
            return None
        if self._redis_client is None:
            try:
                import redis.asyncio as aioredis
                self._redis_client = aioredis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=2.0
                )
                await self._redis_client.ping()
            except Exception as e:
                logger.warning(f"Could not connect to Redis at {settings.REDIS_URL} ({e}). Falling back to memory queue.")
                self._redis_client = None
        return self._redis_client

    async def enqueue(self, execution_id: str, priority: int = 0) -> bool:
        """Enqueues an execution ID for background processing."""
        redis = await self.get_redis()
        payload = json.dumps({"execution_id": execution_id, "priority": priority})
        if redis:
            try:
                await redis.rpush(self._queue_key, payload)
                logger.info(f"Enqueued execution {execution_id} in Redis queue")
                return True
            except Exception as e:
                logger.error(f"Failed to enqueue to Redis ({e}), using memory queue fallback")

        await _memory_queue.put({"execution_id": execution_id, "priority": priority})
        logger.info(f"Enqueued execution {execution_id} in memory queue")
        return True

    async def dequeue(self, timeout: float = 2.0) -> Optional[str]:
        """Dequeues the next execution ID, blocking up to timeout seconds."""
        redis = await self.get_redis()
        if redis:
            try:
                result = await redis.blpop(self._queue_key, timeout=int(timeout))
                if result:
                    _, raw_payload = result
                    data = json.loads(raw_payload)
                    return data.get("execution_id")
            except Exception as e:
                logger.error(f"Error dequeuing from Redis: {e}")

        try:
            item = await asyncio.wait_for(_memory_queue.get(), timeout=timeout)
            _memory_queue.task_done()
            return item.get("execution_id")
        except asyncio.TimeoutError:
            return None


queue_service = QueueService()
