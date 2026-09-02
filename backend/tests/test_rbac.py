import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_rbac_enforcement(client: AsyncClient):
    # Login as User A (Superadmin) -> Has 'settings.manage'
    login_super = await client.post("/api/v1/auth/login", json={
        "email": "admin_a@evolix.com",
        "password": "password"
    })
    token_super = login_super.json()["access_token"]
    
    # Login as Restricted User A -> ONLY has 'settings.view'
    login_restricted = await client.post("/api/v1/auth/login", json={
        "email": "restricted_a@evolix.com",
        "password": "password"
    })
    token_restricted = login_restricted.json()["access_token"]
    
    # Fetch a school ID
    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_super}"})
    print("ME ROLES:", me_resp.json().get("roles"))
    school_a_id = me_resp.json()["schools"][0]["id"]
    
    # Superadmin updates settings -> Success
    res_super = await client.post(f"/api/v1/schools/{school_a_id}/settings", headers={"Authorization": f"Bearer {token_super}"})
    assert res_super.status_code == 200
    
    # Restricted User updates settings -> 403 Forbidden
    res_restricted = await client.post(f"/api/v1/schools/{school_a_id}/settings", headers={"Authorization": f"Bearer {token_restricted}"})
    assert res_restricted.status_code == 403
    assert "Not enough permissions" in res_restricted.json()["detail"]
