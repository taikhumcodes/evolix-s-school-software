from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_db, get_current_user
from app.models.foundation import NumberSeries, User

router = APIRouter()

@router.get("")
async def get_number_series(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(NumberSeries).where(NumberSeries.tenant_id == current_user.tenant_id))
    return [{"id": str(ns.id), "code": ns.code, "current_value": ns.current_value} for ns in res.scalars().all()]
