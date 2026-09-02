import pytest
from httpx import AsyncClient
import asyncio

@pytest.mark.asyncio
async def test_academic_year_concurrency(client: AsyncClient, admin_token: str):
    """
    Verify two concurrent activation attempts cannot leave two ACTIVE/current academic years.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Get school id
    me = await client.get("/api/v1/auth/me", headers=headers)
    school_id = me.json()["schools"][0]["id"]
    
    # Create two academic years
    ay1 = await client.post("/api/v1/academic-years", json={
        "school_id": school_id,
        "name": "2026-2027",
        "start_date": "2026-06-01",
        "end_date": "2027-05-31",
        "is_current": False,
        "is_closed": False
    }, headers=headers)
    
    ay2 = await client.post("/api/v1/academic-years", json={
        "school_id": school_id,
        "name": "2027-2028",
        "start_date": "2027-06-01",
        "end_date": "2028-05-31",
        "is_current": False,
        "is_closed": False
    }, headers=headers)
    
    ay1_id = ay1.json()["id"]
    ay2_id = ay2.json()["id"]
    
    # Trigger concurrent activation
    async def activate_ay(ay_id):
        return await client.patch(f"/api/v1/academic-years/{ay_id}", json={"is_current": True}, headers=headers)
        
    await asyncio.gather(
        activate_ay(ay1_id),
        activate_ay(ay2_id)
    )
    
    # Verify they both didn't succeed in leaving two current years
    # Fetch all current
    all_ays = await client.get(f"/api/v1/academic-years?school_id={school_id}", headers=headers)
    current_years = [y for y in all_ays.json() if y["is_current"] is True]
    
    # ONLY ONE MUST BE CURRENT
    assert len(current_years) <= 1
