import time
from collections import defaultdict
from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token
from backend.app.models.user import User

security_scheme = HTTPBearer(auto_error=False)

from backend.app.core.config import settings

# Simple in-memory rate limiter per IP for sensitive endpoints (like auth)
_ip_attempts = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
MAX_REQUESTS_PER_WINDOW = 15  # requests


def reset_rate_limiter():
    """Resets the in-memory rate limiter tracking."""
    _ip_attempts.clear()


async def rate_limiter(request: Request):
    if settings.ENVIRONMENT == "testing":
        return

    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    attempts = _ip_attempts[client_ip]
    
    # Filter attempts within window
    _ip_attempts[client_ip] = [t for t in attempts if now - t < RATE_LIMIT_WINDOW]
    
    if len(_ip_attempts[client_ip]) >= MAX_REQUESTS_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again later."
        )
    _ip_attempts[client_ip].append(now)


async def get_current_user(
    request: Request,
    token_auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Extracts and validates JWT from Authorization Bearer header or cookie.
    Enforces that valid user exists in database.
    """
    token = None
    if token_auth and token_auth.credentials:
        token = token_auth.credentials
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
