import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.foundation import NumberSeries

async def generate_next_number(session: AsyncSession, tenant_id: uuid.UUID, code: str, school_id: uuid.UUID = None) -> str:
    stmt = select(NumberSeries).where(NumberSeries.tenant_id == tenant_id, NumberSeries.code == code).with_for_update()
    res = await session.execute(stmt)
    series = res.scalars().first()
    if not series:
        series = NumberSeries(tenant_id=tenant_id, code=code, current_value=0, padding=4)
        session.add(series)
        await session.flush()
    series.current_value += 1
    return str(series.current_value).zfill(series.padding)
