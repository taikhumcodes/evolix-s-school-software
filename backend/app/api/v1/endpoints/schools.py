from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.api.deps import get_db, get_current_user, require_permissions
from app.models.foundation import School, User
import uuid

router = APIRouter()

@router.get("/{school_id}")
async def get_school(school_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Tenant isolation: only return school if it belongs to the user's tenant
    res = await db.execute(
        select(School).where(School.id == school_id, School.tenant_id == current_user.tenant_id)
    )
    school = res.scalars().first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return {"id": str(school.id), "name": school.name, "code": school.code}

@router.post("/{school_id}/settings", dependencies=[Depends(require_permissions(["settings.manage"]))])
async def update_school_settings(school_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    
    res = await db.execute(
        select(School).where(School.id == school_id, School.tenant_id == current_user.tenant_id)
    )
    school = res.scalars().first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return {"status": "ok"}
