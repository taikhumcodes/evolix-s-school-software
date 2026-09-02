import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.security import SecurityEvent

@pytest.mark.asyncio
async def test_security_events_logged(client: AsyncClient, db: AsyncSession):
    # Trigger a LOGIN_SUCCESS
    res = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    
    # Trigger a LOGIN_FAILED
    await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "wrong"})
    
    # Fetch events
    events_res = await client.get("/api/v1/security/events", headers={"Authorization": f"Bearer {token}"})
    assert events_res.status_code == 200
    
    events = events_res.json()
    assert len(events) >= 2
    
    event_types = [e["event_type"] for e in events]
    assert "LOGIN_SUCCESS" in event_types
    assert "LOGIN_FAILED" in event_types
    
    # Ensure immutability (can't delete events via normal APIs - actually we didn't expose a DELETE for events!)
    delete_res = await client.delete("/api/v1/security/events/123", headers={"Authorization": f"Bearer {token}"})
    assert delete_res.status_code == 404 # Endpoint doesn't exist
