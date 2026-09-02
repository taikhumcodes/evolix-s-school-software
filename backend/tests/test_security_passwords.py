import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.security import SecurityPolicy, UserPasswordHistory

@pytest.mark.asyncio
async def test_password_change_and_history(client: AsyncClient, db: AsyncSession):
    # 1. Login
    res = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"})
    token = res.json()["access_token"]
    
    # Enable complexity to test it
    from app.models.foundation import User
    user = (await db.execute(select(User).where(User.email == "admin_a@evolix.com"))).scalars().first()
    
    policy_res = await db.execute(select(SecurityPolicy).where(SecurityPolicy.tenant_id == user.tenant_id))
    policy = policy_res.scalars().first()
    if not policy:
        policy = SecurityPolicy(tenant_id=user.tenant_id)
        db.add(policy)
        
    policy.password_min_length = 8
    policy.password_require_number = True
    policy.password_require_special = True
    policy.password_history_count = 3
    await db.commit()
    
    import uuid
    new_pwd = f"NewStrong!Password1_{uuid.uuid4().hex[:8]}"
    
    # 2. Try weak password
    weak_res = await client.patch("/api/v1/security/password", headers={"Authorization": f"Bearer {token}"}, json={
        "current_password": "password",
        "new_password": "weak"
    })
    assert weak_res.status_code == 400
    
    # 3. Successful change
    valid_res = await client.patch("/api/v1/security/password", headers={"Authorization": f"Bearer {token}"}, json={
        "current_password": "password",
        "new_password": new_pwd
    })
    assert valid_res.status_code == 200
    
    # 4. Try changing it back immediately (violates history)
    hist_res = await client.patch("/api/v1/security/password", headers={"Authorization": f"Bearer {token}"}, json={
        "current_password": new_pwd,
        "new_password": "password"
    })
    assert hist_res.status_code == 400
    
    # 5. Old password rejected
    old_login = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"})
    assert old_login.status_code == 401
    
    # 6. New password works
    new_login = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": new_pwd})
    assert new_login.status_code == 200
    token_new = new_login.json()["access_token"]
    
    # Disable complexity so we can test history and restore 'password'
    policy.password_min_length = 1
    policy.password_require_uppercase = False
    policy.password_require_lowercase = False
    policy.password_require_number = False
    policy.password_require_special = False
    await db.commit()
    
    # 7. Reusing old password rejected by history policy
    reuse_res = await client.patch("/api/v1/security/password", headers={"Authorization": f"Bearer {token_new}"}, json={
        "current_password": new_pwd,
        "new_password": "password"
    })
    assert reuse_res.status_code == 400
    assert "used recently" in reuse_res.json()["detail"].lower()
    
    policy.password_history_count = 0
    await db.commit()
    
    # Clean up so other tests don't break
    await client.patch("/api/v1/security/password", headers={"Authorization": f"Bearer {token_new}"}, json={
        "current_password": new_pwd,
        "new_password": "password"
    })
