from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.api.deps import get_db
from app.models.foundation import Permission

router = APIRouter()

@router.get("")
async def get_permissions(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Permission))
    return [{"id": str(p.id), "code": p.code, "description": p.description} for p in res.scalars().all()]
