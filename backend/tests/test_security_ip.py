import pytest
from httpx import AsyncClient
import os

@pytest.mark.asyncio
async def test_ip_security_trusted_proxy(client: AsyncClient):
    # Setup test environment for proxy
    original_cidrs = os.environ.get("TRUSTED_PROXY_CIDRS", "")
    os.environ["TRUSTED_PROXY_CIDRS"] = "10.0.0.0/8,192.168.1.100/32"
    
    # Send request pretending to be from an UNTRUSTED peer, but with X-Forwarded-For
    res_untrusted = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"}, headers={"x-forwarded-for": "10.1.1.1"})
    
    # Send request pretending to be from a TRUSTED proxy (we mock the client host in httpx, which is a bit tricky, but we can call get_client_ip directly or mock request)
    # Httpx AsyncClient usually sets client host to 127.0.0.1. So let's trust 127.0.0.1!
    os.environ["TRUSTED_PROXY_CIDRS"] = "127.0.0.1/32"
    
    # 1. Without spoofing, should work
    res_local = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"})
    assert res_local.status_code == 200
    
    # Let's restore
    os.environ["TRUSTED_PROXY_CIDRS"] = original_cidrs
    
    # Enable IP restriction mode first
    from app.models.security import SecurityPolicy
    from app.models.foundation import User
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import text
    from sqlalchemy.future import select
    
    async with AsyncSessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == "admin_a@evolix.com"))).scalars().first()
        policy = (await session.execute(select(SecurityPolicy).where(SecurityPolicy.tenant_id == user.tenant_id))).scalars().first()
        if not policy:
            policy = SecurityPolicy(tenant_id=user.tenant_id)
            session.add(policy)
        policy.ip_restriction_mode = "DENY"
        await session.commit()

    token = res_local.json()["access_token"]
    
    rule_res = await client.post("/api/v1/security/ip-restrictions", headers={"Authorization": f"Bearer {token}"}, json={
        "network_cidr": "10.1.1.1/32",
        "rule_type": "DENY",
        "description": "Test deny"
    })
    
    assert rule_res.status_code == 200
    rule_id = rule_res.json()["id"]
    
    # Next login from 10.1.1.1 should be DENIED
    # We must trust 127.0.0.1 to spoof 10.1.1.1
    os.environ["TRUSTED_PROXY_CIDRS"] = "127.0.0.1/32"
    res_denied = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"}, headers={"x-forwarded-for": "10.1.1.1"})
    assert res_denied.status_code == 403
    assert "not permitted" in res_denied.json()["detail"]
    
    # Clean up (we must bypass login to clean up since we are blocked, or use DB session directly)
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import text
    async with AsyncSessionLocal() as session:
        await session.execute(text(f"DELETE FROM ip_restrictions WHERE id = '{rule_id}'"))
        
        # Reset policy back to DISABLED so it doesn't affect other tests!
        user = (await session.execute(select(User).where(User.email == "admin_a@evolix.com"))).scalars().first()
        policy = (await session.execute(select(SecurityPolicy).where(SecurityPolicy.tenant_id == user.tenant_id))).scalars().first()
        if policy:
            policy.ip_restriction_mode = "DISABLED"
        
        await session.commit()
    
    # Restore original environment
    if original_cidrs is not None:
        os.environ["TRUSTED_PROXY_CIDRS"] = original_cidrs
    else:
        del os.environ["TRUSTED_PROXY_CIDRS"]
