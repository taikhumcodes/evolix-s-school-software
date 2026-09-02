import os
os.environ["TOTP_ENCRYPTION_KEY"] = "79XifqZI8YUiBMtp8Hp9FXBndGHnX1ET105sFX1A5C0="

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import AsyncSessionLocal

@pytest_asyncio.fixture()
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture()
async def db():
    async with AsyncSessionLocal() as session:
        yield session

from sqlalchemy.future import select # noqa: E402
from app.models.foundation import Role, Permission # noqa: E402
from sqlalchemy.orm import selectinload # noqa: E402

@pytest_asyncio.fixture(autouse=True)
async def setup_admin_permissions():
    async with AsyncSessionLocal() as session:
        # Get the superadmin role
        role_result = await session.execute(
            select(Role).options(selectinload(Role.permissions)).where(Role.name == "superadmin")
        )
        roles = role_result.scalars().all()
        
        required_perms = ["USERS_VIEW", "USERS_MANAGE", "ROLES_VIEW", "ROLES_MANAGE", "ACADEMIC_YEARS_VIEW", "ACADEMIC_YEARS_MANAGE", "AUDIT_LOGS_VIEW", "settings.manage"]
        
        for code in required_perms:
            p_res = await session.execute(select(Permission).where(Permission.code == code))
            perm = p_res.scalars().first()
            if not perm:
                perm = Permission(code=code, description=code)
                session.add(perm)
            
            for role in roles:
                if perm not in role.permissions:
                    role.permissions.append(perm)
        
        await session.commit()

@pytest_asyncio.fixture
async def admin_token(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin_a@evolix.com",
        "password": "password"
    })
    return resp.json()["access_token"]

