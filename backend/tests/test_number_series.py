import uuid
import pytest
import asyncio
from app.services.number_series import generate_next_number
from app.db.session import AsyncSessionLocal
from app.models.foundation import Tenant

@pytest.mark.asyncio
async def test_number_series_uniqueness_and_concurrency():
    tenant_id = uuid.uuid4()
    school_id = None
    code = "TEST_SEQ"
    
    # Create tenant and number series first
    async with AsyncSessionLocal() as session:
        t = Tenant(id=tenant_id, name="Test Tenant for Seq")
        session.add(t)
        await session.flush()
        from app.models.foundation import NumberSeries
        ns = NumberSeries(tenant_id=tenant_id, code=code, current_value=0, padding=4)
        session.add(ns)
        await session.commit()
    
    # Run 10 concurrent requests for the next number
    async def get_number():
        async with AsyncSessionLocal() as session:
            num = await generate_next_number(session, tenant_id, code, school_id)
            await session.commit()
            return num

    tasks = [get_number() for _ in range(10)]
    results = await asyncio.gather(*tasks)
    
    # Should generate exactly 10 distinct values
    assert len(set(results)) == 10
    assert "0001" in results
    assert "0010" in results
