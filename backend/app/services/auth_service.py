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

    @staticmethod
    async def change_password(db: AsyncSession, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.password_hash):
            raise ValueError("Current password is incorrect")
        if current_password == new_password:
            raise ValueError("New password must be different from current password")
        user.password_hash = hash_password(new_password)
        db.add(user)
        await db.commit()
        await db.refresh(user)


auth_service = AuthService()
