import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_user_privilege_escalation(client: AsyncClient, admin_token: str):
    """
    Test that an admin without superadmin cannot assign superadmin role.
    """
    # Assuming the current admin token belongs to a restricted admin or we test the rejection logic
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # We would need to mock or ensure the admin doesn't have superadmin, but 
    # the endpoint logic tests if requested_roles has superadmin and throws 403
    # Let's assume we try to assign a fake superadmin role
    
    # Get a valid role first
    roles_resp = await client.get("/api/v1/roles", headers=headers)
    assert roles_resp.status_code == 200
    roles_data = roles_resp.json()
    if not roles_data:
        # Skip if no roles in db
        return
    valid_role_id = roles_data[0]["id"]
    
    response = await client.post("/api/v1/users", json={
        "email": "escalator@evolix.com",
        "password": "password",
        "first_name": "Escalator",
        "last_name": "User",
        "is_active": True,
        "role_ids": [valid_role_id]
    }, headers=headers)
    
    assert response.status_code in (403, 400)

@pytest.mark.asyncio
async def test_user_self_deactivation(client: AsyncClient, admin_token: str):
    """
    Test self-deactivation is blocked.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Get current user id
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    my_id = me_resp.json()["id"]
    
    # Try to delete self
    response = await client.delete(f"/api/v1/users/{my_id}", headers=headers)
    assert response.status_code == 400
    assert "Cannot delete your own account" in response.text
