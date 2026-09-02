import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_audit_writing_on_user_creation(client: AsyncClient, admin_token: str):
    # Create a user to trigger audit log
    new_email = f"test_audit_{uuid.uuid4()}@evolix.com"
    response = await client.post(
        "/api/v1/users",
        json={
            "email": new_email,
            "password": "password123",
            "first_name": "Audit",
            "last_name": "Test",
            "is_active": True,
            "role_ids": []
        },
        headers={"Authorization": f"Bearer {admin_token}", "X-Tenant-Slug": "tenant-a"}
    )
    assert response.status_code == 200
    user_id = response.json()["id"]

    # Verify audit log was created
    audit_resp = await client.get("/api/v1/audit-logs?action=USER_CREATED", headers={"Authorization": f"Bearer {admin_token}", "X-Tenant-Slug": "tenant-a"})
    assert audit_resp.status_code == 200
    audit_data = audit_resp.json()
    assert "items" in audit_data
    
    # Check if our specific event is in the audit logs
    found = False
    for item in audit_data["items"]:
        if item["entity_id"] == user_id and item["action"] == "USER_CREATED":
            found = True
            break
            
    assert found, "Audit log for USER_CREATED was not found"
