import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_tenant_isolation(client: AsyncClient):
    # Login as User A (Tenant A)
    login_a = await client.post("/api/v1/auth/login", json={
        "email": "admin_a@evolix.com",
        "password": "password"
    })
    token_a = login_a.json()["access_token"]
    
    # Login as User B (Tenant B)
    login_b = await client.post("/api/v1/auth/login", json={
        "email": "admin_b@evolix.com",
        "password": "password"
    })
    token_b = login_b.json()["access_token"]
    
    # First, User A gets User A's school (School A). To do this, we need School A's ID.
    # We can fetch it by doing a DB query or we can just get the ID from /me endpoint.
    me_a = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    school_a_id = me_a.json()["schools"][0]["id"]
    
    me_b = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_b}"})
    school_b_id = me_b.json()["schools"][0]["id"]
    
    # User A accesses School A -> Success
    res_aa = await client.get(f"/api/v1/schools/{school_a_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert res_aa.status_code == 200
    
    # User B accesses School B -> Success
    res_bb = await client.get(f"/api/v1/schools/{school_b_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert res_bb.status_code == 200
    
    # TENANT ISOLATION: User A accesses School B -> 404 Not Found
    res_ab = await client.get(f"/api/v1/schools/{school_b_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert res_ab.status_code == 404
    
    # TENANT ISOLATION: User B accesses School A -> 404 Not Found
    res_ba = await client.get(f"/api/v1/schools/{school_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert res_ba.status_code == 404
