from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from app.db.session import AsyncSessionLocal
from app.api.deps import get_db, get_current_user
from app.models.foundation import AcademicYear, User
from app.services.audit_service import write_audit_log
from pydantic import BaseModel
import uuid
from datetime import date

router = APIRouter()

class AcademicYearCreate(BaseModel):
    school_id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    is_current: bool = False
    is_closed: bool = False

class AcademicYearUpdate(BaseModel):
    is_current: Optional[bool] = None
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_closed: Optional[bool] = None

@router.get("")
async def get_academic_years(school_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AcademicYear).where(AcademicYear.school_id == school_id))
    return [{"id": str(a.id), "name": a.name, "is_current": a.is_current, "is_closed": a.is_closed} for a in res.scalars().all()]

@router.post("")
async def create_academic_year(data: AcademicYearCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ay = AcademicYear(**data.model_dump())
    db.add(ay)
    await db.flush()
    await db.refresh(ay)
    await write_audit_log(
        db,
        tenant_id=current_user.tenant_id,
        actor_id=current_user.id,
        action="ACADEMIC_YEAR_CREATED",
        entity_type="AcademicYear",
        entity_id=str(ay.id),
        school_id=data.school_id,
        after_data={"name": ay.name, "start_date": str(ay.start_date), "end_date": str(ay.end_date)},
    )
    await db.commit()
    return {"id": str(ay.id)}

@router.patch("/{ay_id}")
async def update_academic_year(ay_id: uuid.UUID, data: AcademicYearUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(AcademicYear).where(AcademicYear.id == ay_id))
    ay = res.scalars().first()
    if not ay:
        raise HTTPException(status_code=404, detail="Not found")
    
    before_data = {
        "name": ay.name,
        "start_date": str(ay.start_date),
        "end_date": str(ay.end_date),
        "is_current": ay.is_current,
        "is_closed": ay.is_closed
    }
    
    # Handle activation
    if data.is_current is not None:
        before_current = ay.is_current
        # Lock ALL academic years for this school to serialize concurrent activations
        all_res = await db.execute(
            select(AcademicYear)
            .where(AcademicYear.school_id == ay.school_id)
            .with_for_update()
            .order_by(AcademicYear.id)
        )
        all_ays = all_res.scalars().all()
        
        if data.is_current:
            for other in all_ays:
                if other.id != ay_id:
                    other.is_current = False
                    
        target = next((a for a in all_ays if a.id == ay_id), None)
        if target:
            target.is_current = data.is_current
            
        if data.is_current and not before_current:
            await write_audit_log(
                db, tenant_id=current_user.tenant_id, actor_id=current_user.id,
                action="ACADEMIC_YEAR_ACTIVATED", entity_type="AcademicYear", entity_id=str(ay_id),
                school_id=ay.school_id, before_data={"is_current": False}, after_data={"is_current": True}
            )

    # Handle closure
    if data.is_closed is not None and data.is_closed != ay.is_closed:
        ay.is_closed = data.is_closed
        if data.is_closed:
            await write_audit_log(
                db, tenant_id=current_user.tenant_id, actor_id=current_user.id,
                action="ACADEMIC_YEAR_CLOSED", entity_type="AcademicYear", entity_id=str(ay_id),
                school_id=ay.school_id, before_data={"is_closed": False}, after_data={"is_closed": True}
            )

    # Handle general updates
    update_data = data.model_dump(exclude_unset=True)
    field_updated = False
    for field in ["name", "start_date", "end_date"]:
        if field in update_data and getattr(ay, field) != update_data[field]:
            setattr(ay, field, update_data[field])
            field_updated = True
            
    if field_updated:
        after_data = {
            "name": ay.name,
            "start_date": str(ay.start_date),
            "end_date": str(ay.end_date)
        }
        await write_audit_log(
            db, tenant_id=current_user.tenant_id, actor_id=current_user.id,
            action="ACADEMIC_YEAR_UPDATED", entity_type="AcademicYear", entity_id=str(ay_id),
            school_id=ay.school_id, before_data=before_data, after_data=after_data
        )

    await db.commit()
    return {"status": "ok"}

