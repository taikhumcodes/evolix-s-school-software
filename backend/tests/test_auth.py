import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin_a@evolix.com",
        "password": "password"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin_a@evolix.com",
        "password": "wrong"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

@pytest.mark.asyncio
async def test_get_me(client: AsyncClient):
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "admin_a@evolix.com",
        "password": "password"
    })
    token = login_resp.json()["access_token"]
    
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "admin_a@evolix.com"

@pytest.mark.asyncio
async def test_refresh_token_and_revocation(client: AsyncClient):
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "admin_a@evolix.com",
        "password": "password"
    })
    refresh_token = login_resp.json()["refresh_token"]
    
    # Refresh successfully
    refresh_resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert refresh_resp.status_code == 200
    new_refresh = refresh_resp.json()["refresh_token"]
    
    # Try reusing the OLD refresh token (should trigger reuse detection)
    reuse_resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert reuse_resp.status_code == 401
    assert "Token reuse detected" in reuse_resp.json()["detail"]
    
    # Try the NEW refresh token (should be revoked because of reuse detection)
    final_resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": new_refresh
    })
    assert final_resp.status_code == 401
    assert "Token reuse detected" in final_resp.json()["detail"]

@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "admin_a@evolix.com",
        "password": "password"
    })
    refresh_token = login_resp.json()["refresh_token"]
    
    logout_resp = await client.post("/api/v1/auth/logout", json={
        "refresh_token": refresh_token
    })
    assert logout_resp.status_code == 200
    
    refresh_resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert refresh_resp.status_code == 401
