import asyncio
import os
import sys
from os.path import abspath, dirname

# Ensure root directory is on sys.path
sys.path.insert(0, abspath(dirname(dirname(dirname(__file__)))))

import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Force test configuration
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_flowforge.db"
os.environ["SECRET_KEY"] = "test_secret_key_for_flowforge_tests_only_32_characters"
os.environ["ENVIRONMENT"] = "testing"

from backend.app.core.config import settings
settings.DATABASE_URL = "sqlite+aiosqlite:///./test_flowforge.db"
settings.SECRET_KEY = "test_secret_key_for_flowforge_tests_only_32_characters"
settings.ENVIRONMENT = "testing"

from backend.app.core.database import Base, get_db, AsyncSessionLocal
from backend.app.main import app

test_engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30},
    future=True,
)

# Rebind AsyncSessionLocal to test_engine so workers and engines in tests use test db
AsyncSessionLocal.configure(bind=test_engine)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict:
    res = await client.post("/api/v1/auth/register", json={
        "email": "tester@example.com",
        "password": "SecurePassword123!"
    })
    token = res.json()["access_token"]
    client.cookies.clear()
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def second_user_auth_headers(client: AsyncClient) -> dict:
    res = await client.post("/api/v1/auth/register", json={
        "email": "other_user@example.com",
        "password": "SecurePassword456!"
    })
    token = res.json()["access_token"]
    client.cookies.clear()
    return {"Authorization": f"Bearer {token}"}
