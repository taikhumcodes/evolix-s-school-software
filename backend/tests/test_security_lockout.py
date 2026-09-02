import pytest
from httpx import AsyncClient
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.foundation import User

@pytest.mark.asyncio
async def test_lockout_concurrency(client: AsyncClient, db: AsyncSession):
    # Setup test user
    user_email = "lockout_concurrent@evolix.com"
    from app.models.foundation import User
    from app.services.security_service import get_password_hash
    import uuid
    
    # 1. Create a specific user for this test to avoid interfering with others
    res = await db.execute(select(User).where(User.email == user_email))
    user = res.scalars().first()
    if not user:
        # Assuming tenant A exists
        from app.models.foundation import Tenant
        tenant = (await db.execute(select(Tenant).where(Tenant.name == "Tenant A"))).scalars().first()
        user = User(
            email=user_email,
            hashed_password=get_password_hash("password"),
            first_name="Lockout",
            last_name="Test",
            tenant_id=tenant.id
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # 2. Reset any previous lockouts
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.commit()

    # 3. Fire 10 concurrent invalid logins
    async def try_login():
        return await client.post("/api/v1/auth/login", json={
            "email": user_email,
            "password": "wrongpassword"
        })

    tasks = [try_login() for _ in range(10)]
    responses = await asyncio.gather(*tasks)

    # Verify responses
    assert all(r.status_code in [401, 403] for r in responses)

    # Check database state
    await db.refresh(user)
    
    # Default policy allows 5 attempts. Wait, concurrent updates might overwrite if not atomic.
    # The atomic update `User.failed_login_attempts + 1` should make it exactly 10.
    assert user.failed_login_attempts == 10
    assert user.locked_until is not None

@pytest.mark.asyncio
async def test_lockout_unlocks_automatically(client: AsyncClient, db: AsyncSession):
    # We simulate passing the lockout window
    user_email = "lockout_concurrent@evolix.com"
    res = await db.execute(select(User).where(User.email == user_email))
    user = res.scalars().first()
    
    if not user:
        # Create it just in case previous test didn't
        from app.models.foundation import Tenant
        from app.services.security_service import get_password_hash
        tenant = (await db.execute(select(Tenant).where(Tenant.name == "Tenant A"))).scalars().first()
        user = User(
            email=user_email,
            hashed_password=get_password_hash("password"),
            first_name="Lockout2",
            last_name="Test2",
            tenant_id=tenant.id
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    # Set lock time to past
    from datetime import datetime, timedelta
    user.locked_until = datetime.utcnow() - timedelta(minutes=1)
    await db.commit()

    # Login should succeed now
    response = await client.post("/api/v1/auth/login", json={
        "email": user_email,
        "password": "password"
    })
    
    assert response.status_code == 200
    
    # Verify failed attempts are reset
    await db.refresh(user)
    assert user.failed_login_attempts == 0
    assert user.locked_until is None
