from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from typing import Optional
from app.db.session import AsyncSessionLocal
from app.api.deps import get_db, get_current_user
from app.models.foundation import AuditLog, User

router = APIRouter()

@router.get("")
async def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(AuditLog).where(AuditLog.tenant_id == current_user.tenant_id)
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    query = query.order_by(desc(AuditLog.created_at))

    # Count total
    from sqlalchemy import func
    count_q = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_q)
    total = total_res.scalar() or 0

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(query)

    items = []
    for a in res.scalars().all():
        items.append({
            "id": str(a.id),
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "user_id": str(a.user_id) if a.user_id else None,
            "school_id": str(a.school_id) if a.school_id else None,
            "before_data": a.before_data,
            "after_data": a.after_data,
            "ip_address": a.ip_address,
            "created_at": str(a.created_at) if a.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total > 0 else 0,
    }
