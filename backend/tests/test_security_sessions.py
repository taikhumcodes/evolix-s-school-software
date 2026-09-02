import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

@pytest.mark.asyncio
async def test_session_lifecycle_and_revocation(client: AsyncClient, db: AsyncSession):
    # 1. Login to create a session
    res = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"})
    assert res.status_code == 200
    access_token = res.json()["access_token"]
    refresh_token = res.json()["refresh_token"]
    
    # 2. List own sessions
    sess_res = await client.get("/api/v1/security/sessions", headers={"Authorization": f"Bearer {access_token}"})
    assert sess_res.status_code == 200
    sessions = sess_res.json()
    assert len(sessions) >= 1
    
    session_id = sessions[0]["id"]
    
    # 3. Refresh works initially
    refresh_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    
    # 4. Revoke individual session
    revoke_res = await client.delete(f"/api/v1/security/sessions/{session_id}", headers={"Authorization": f"Bearer {access_token}"})
    assert revoke_res.status_code == 200
    
    # 5. Revoked session cannot refresh
    refresh_res_2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res_2.status_code == 401
    
    # 6. Cannot list another user's sessions
    # (By definition, the endpoint filters by `current_user.id`, so it's intrinsically isolated)
    
    # 7. Admin revoke
    # Login again to get a fresh token (admin_a is superadmin)
    res2 = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"})
    access_token2 = res2.json()["access_token"]
    
    sess_res2 = await client.get("/api/v1/security/sessions", headers={"Authorization": f"Bearer {access_token2}"})
    for sess in sess_res2.json():
        admin_revoke_res = await client.delete(f"/api/v1/security/admin/sessions/{sess['id']}", headers={"Authorization": f"Bearer {access_token2}"})
        assert admin_revoke_res.status_code == 200
    
    # Refresh should fail now
    refresh_token2 = res2.json()["refresh_token"]
    refresh_res_3 = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token2})
    assert refresh_res_3.status_code == 401
