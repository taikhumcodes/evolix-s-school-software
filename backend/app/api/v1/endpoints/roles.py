from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
import uuid
from app.db.session import AsyncSessionLocal
from app.api.deps import get_db, get_current_user
from app.models.foundation import Role, User, Permission
from app.services.audit_service import write_audit_log

router = APIRouter()

class RoleCreate(BaseModel):
    name: str
    permission_ids: List[uuid.UUID] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    permission_ids: Optional[List[uuid.UUID]] = None

@router.get("")
async def get_roles(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(Role).where(Role.tenant_id == current_user.tenant_id))
    return [{"id": str(r.id), "name": r.name, "is_system": r.is_system, "permissions": [{"id": str(p.id), "code": p.code, "description": p.description} for p in r.permissions]} for r in res.scalars().all()]

@router.post("")
async def create_role(role_in: RoleCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(Permission).where(Permission.id.in_(role_in.permission_ids)))
    permissions = res.scalars().all()

    new_role = Role(
        tenant_id=current_user.tenant_id,
        name=role_in.name,
        is_system=False,
        permissions=permissions
    )
    db.add(new_role)
    await db.flush()
    await db.refresh(new_role)

    await write_audit_log(
        db,
        tenant_id=current_user.tenant_id,
        actor_id=current_user.id,
        action="ROLE_CREATED",
        entity_type="Role",
        entity_id=str(new_role.id),
        after_data={"name": new_role.name, "permissions": [p.code for p in permissions]},
    )
    await db.commit()
    return {"id": str(new_role.id)}

@router.patch("/{role_id}")
async def update_role(role_id: uuid.UUID, role_in: RoleUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(Role).where(Role.id == role_id, Role.tenant_id == current_user.tenant_id))
    role = res.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system:
        raise HTTPException(status_code=403, detail="Cannot modify system roles")

    before_data = {"name": role.name, "permissions": [p.code for p in role.permissions]}
    
    if role_in.name and role_in.name != role.name:
        role.name = role_in.name
        await write_audit_log(
            db,
            tenant_id=current_user.tenant_id,
            actor_id=current_user.id,
            action="ROLE_UPDATED",
            entity_type="Role",
            entity_id=str(role.id),
            before_data={"name": before_data["name"]},
            after_data={"name": role.name}
        )

    if role_in.permission_ids is not None:
        res_perms = await db.execute(select(Permission).where(Permission.id.in_(role_in.permission_ids)))
        new_permissions = res_perms.scalars().all()
        
        old_codes = {p.code for p in role.permissions}
        new_codes = {p.code for p in new_permissions}
        
        if old_codes != new_codes:
            role.permissions = new_permissions
            await write_audit_log(
                db,
                tenant_id=current_user.tenant_id,
                actor_id=current_user.id,
                action="ROLE_PERMISSIONS_CHANGED",
                entity_type="Role",
                entity_id=str(role.id),
                before_data={"permissions": list(old_codes)},
                after_data={"permissions": list(new_codes)}
            )

    await db.commit()
    return {"status": "ok"}

@router.delete("/{role_id}")
async def delete_role(role_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(Role).where(Role.id == role_id, Role.tenant_id == current_user.tenant_id))
    role = res.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system roles")

    # In our model we might hard delete or just write audit
    await write_audit_log(
        db,
        tenant_id=current_user.tenant_id,
        actor_id=current_user.id,
        action="ROLE_ARCHIVED",
        entity_type="Role",
        entity_id=str(role.id),
        before_data={"name": role.name}
    )
    await db.delete(role)
    await db.commit()
    return {"status": "ok"}
