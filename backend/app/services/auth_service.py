from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.user import User
from backend.app.schemas.user import UserRegister
from backend.app.core.security import hash_password, verify_password


class AuthService:
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower().strip())
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def register(db: AsyncSession, data: UserRegister) -> User:
        clean_email = data.email.lower().strip()
        existing = await AuthService.get_by_email(db, clean_email)
        if existing:
            raise ValueError("Email is already registered")

        pwd_hash = hash_password(data.password)
        user = User(
            email=clean_email,
            password_hash=pwd_hash
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
        user = await AuthService.get_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user


auth_service = AuthService()
