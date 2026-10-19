import pytest
from httpx import AsyncClient
from unittest.mock import MagicMock


@pytest.mark.asyncio
async def test_user_registration_and_login(client: AsyncClient):
    # Register
    reg_resp = await client.post("/api/v1/auth/register", json={
        "email": "alice@flowforge.dev",
        "password": "ValidPassword999!"
    })
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice@flowforge.dev"

    # Duplicate registration must fail
    dup_resp = await client.post("/api/v1/auth/register", json={
        "email": "alice@flowforge.dev",
        "password": "AnotherPassword123!"
    })
    assert dup_resp.status_code == 400
    assert "already registered" in dup_resp.json()["detail"].lower()

    # Login with valid password
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "alice@flowforge.dev",
        "password": "ValidPassword999!"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    assert token

    # Login with invalid password
    bad_login = await client.post("/api/v1/auth/login", json={
        "email": "alice@flowforge.dev",
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_and_logout(client: AsyncClient, auth_headers: dict):
    # Unauthenticated request (clear any cookie set by registration)
    client.cookies.clear()
    unauth = await client.get("/api/v1/auth/me")
    assert unauth.status_code == 401

    # Authenticated request
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "tester@example.com"

    # Logout
    logout_resp = await client.post("/api/v1/auth/logout", headers=auth_headers)
    assert logout_resp.status_code == 200


@pytest.mark.asyncio
async def test_auth_rate_limiting_enforcement(client: AsyncClient, monkeypatch):
    from backend.app.core.config import settings
    from backend.app.core.dependencies import reset_rate_limiter, rate_limiter
    from fastapi import Request, HTTPException

    reset_rate_limiter()
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    mock_req = MagicMock(spec=Request)
    mock_req.client.host = "192.168.1.100"

    # 15 requests allowed within window
    for _ in range(15):
        await rate_limiter(mock_req)

    # 16th request must trigger 429 Too Many Requests
    with pytest.raises(HTTPException) as exc_info:
        await rate_limiter(mock_req)
    assert exc_info.value.status_code == 429
    assert "Too many authentication attempts" in exc_info.value.detail

    reset_rate_limiter()


def test_production_secret_key_enforcement(monkeypatch):
    import os
    from backend.app.core.config import Settings

    monkeypatch.setenv("ENVIRONMENT", "production")

    # Insecure / default secret key in production must fail validation
    with pytest.raises(ValueError, match="SECRET_KEY must be securely configured"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="flowforge_development_secret_key_needs_override_in_production_32chars"
        )

    # Short secret key in production must fail validation
    with pytest.raises(ValueError, match="at least 32 characters"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="too_short"
        )
