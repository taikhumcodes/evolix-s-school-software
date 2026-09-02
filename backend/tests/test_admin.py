import pytest
from httpx import AsyncClient



@pytest.mark.asyncio
async def test_get_users(client: AsyncClient, admin_token: str):
    response = await client.get("/api/v1/users", headers={"Authorization": f"Bearer {admin_token}", "X-Tenant-Slug": "tenant-a"})
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) >= 1
    assert any(u["email"] == "admin_a@evolix.com" for u in data["items"])

@pytest.mark.asyncio
async def test_get_roles(client: AsyncClient, admin_token: str):
    response = await client.get("/api/v1/roles", headers={"Authorization": f"Bearer {admin_token}", "X-Tenant-Slug": "tenant-a"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(r["name"] == "superadmin" for r in data)

@pytest.mark.asyncio
async def test_get_permissions(client: AsyncClient, admin_token: str):
    response = await client.get("/api/v1/permissions", headers={"Authorization": f"Bearer {admin_token}", "X-Tenant-Slug": "tenant-a"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

@pytest.mark.asyncio
async def test_get_academic_years(client: AsyncClient, admin_token: str):
    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    school_id = me_resp.json()["schools"][0]["id"]
    response = await client.get(f"/api/v1/academic-years?school_id={school_id}", headers={"Authorization": f"Bearer {admin_token}", "X-Tenant-Slug": "tenant-a"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_get_audit_logs(client: AsyncClient, admin_token: str):
    response = await client.get("/api/v1/audit-logs", headers={"Authorization": f"Bearer {admin_token}", "X-Tenant-Slug": "tenant-a"})
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert isinstance(data["items"], list)
