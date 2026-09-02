import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_tenant_header_manipulation_denied(client: AsyncClient, admin_token: str):
    """
    Test malicious case:
    A. Authenticate as Tenant A user.
    B. Manually send X-Tenant-Slug for Tenant B.
    C. Attempt to access Tenant B data.
    Must be denied or masked (return Tenant A data instead).
    """
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "X-Tenant-Slug": "malicious-tenant-b"
    }
    
    # GET Tenant B user
    response = await client.get("/api/v1/users", headers=headers)
    assert response.status_code == 200
    # Because backend derives tenant from token, it ignores header and returns Tenant A data
    data = response.json()
    assert all("malicious-tenant-b" not in str(item) for item in data.get("items", []))
    
    # Attempt to GET non-existent Tenant B user directly (assuming fake UUID)
    response = await client.get("/api/v1/users/00000000-0000-0000-0000-000000000000", headers=headers)
    assert response.status_code == 404
