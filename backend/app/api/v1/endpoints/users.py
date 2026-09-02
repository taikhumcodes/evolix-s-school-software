from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from app.db.session import AsyncSessionLocal
from app.api.deps import get_db, get_current_user, require_permissions
from app.models.foundation import User, Role
from app.services.audit_service import write_audit_log
from app.services.security_service import get_password_hash
import uuid

router = APIRouter()

class UserCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    is_active: bool = True
    role_ids: List[uuid.UUID] = []

class UserUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role_ids: Optional[List[uuid.UUID]] = None

@router.get("")
async def get_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(User).options(selectinload(User.roles)).where(User.tenant_id == current_user.tenant_id))
    items = [
        {
            "id": str(u.id),
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "is_active": u.is_active,
            "roles": [{"id": str(r.id), "name": r.name} for r in u.roles] if u.roles else [],
        }
        for u in res.scalars().all()
    ]
    return {"items": items, "total": len(items)}

@router.get("/{user_id}")
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(User).options(selectinload(User.roles)).where(User.id == user_id, User.tenant_id == current_user.tenant_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "roles": [{"id": str(r.id), "name": r.name} for r in user.roles] if user.roles else [],
    }

@router.post("")
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    res = await db.execute(select(Role).where(Role.id.in_(user_in.role_ids)))
    roles = res.scalars().all()
    
    # Privilege escalation guard: check if any requested role has permissions
    # the current user doesn't have
    current_perms = set()
    for role in current_user.roles:
        for perm in role.permissions:
            current_perms.add(perm.code)
    
    for role in roles:
        for perm in role.permissions:
            if perm.code not in current_perms:
                raise HTTPException(status_code=403, detail="Cannot assign roles with permissions you don't have")
    
    new_user = User(
        tenant_id=current_user.tenant_id,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        is_active=user_in.is_active,
        roles=roles
    )
    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)
    await write_audit_log(
        db,
        tenant_id=current_user.tenant_id,
        actor_id=current_user.id,
        action="USER_CREATED",
        entity_type="User",
        entity_id=str(new_user.id),
        after_data={"email": new_user.email, "first_name": new_user.first_name, "last_name": new_user.last_name, "is_active": new_user.is_active},
    )
    await db.commit()
    return {"id": str(new_user.id)}

@router.patch("/{user_id}")
async def update_user(user_id: uuid.UUID, user_in: UserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    before_data = {"email": user.email, "first_name": user.first_name, "last_name": user.last_name, "is_active": user.is_active}
    update_data = user_in.model_dump(exclude_unset=True)
    
    # Handle role updates
    if "role_ids" in update_data:
        # Check privilege escalation
        current_perms = set()
        for role in current_user.roles:
            for perm in role.permissions:
                current_perms.add(perm.code)
                
        res_roles = await db.execute(select(Role).where(Role.id.in_(update_data["role_ids"])))
        new_roles = res_roles.scalars().all()
        for role in new_roles:
            for perm in role.permissions:
                if perm.code not in current_perms:
                    raise HTTPException(status_code=403, detail="Cannot assign roles with permissions you don't have")
        
        old_role_ids = {r.id for r in user.roles}
        new_role_ids = {r.id for r in new_roles}
        
        user.roles = new_roles
        
        # Log role changes
        added_roles = new_role_ids - old_role_ids
        removed_roles = old_role_ids - new_role_ids
        
        if added_roles:
            await write_audit_log(db, tenant_id=current_user.tenant_id, actor_id=current_user.id, action="USER_ROLE_ASSIGNED", entity_type="User", entity_id=str(user.id), after_data={"assigned_roles": [str(r) for r in added_roles]})
        if removed_roles:
            await write_audit_log(db, tenant_id=current_user.tenant_id, actor_id=current_user.id, action="USER_ROLE_REMOVED", entity_type="User", entity_id=str(user.id), before_data={"removed_roles": [str(r) for r in removed_roles]})
            
        del update_data["role_ids"]

    # Handle password updates
    if "password" in update_data:
        if update_data["password"]:
            user.hashed_password = get_password_hash(update_data["password"])
            field_updated = True
        del update_data["password"]

    # Handle active status toggle
    if "is_active" in update_data and update_data["is_active"] != user.is_active:
        action = "USER_ACTIVATED" if update_data["is_active"] else "USER_DEACTIVATED"
        await write_audit_log(db, tenant_id=current_user.tenant_id, actor_id=current_user.id, action=action, entity_type="User", entity_id=str(user.id))

    # Handle other field updates
    field_updated = False
    for field, value in update_data.items():
        if getattr(user, field) != value:
            setattr(user, field, value)
            field_updated = True
            
    if field_updated:
        after_data = {"email": user.email, "first_name": user.first_name, "last_name": user.last_name, "is_active": user.is_active}
        await write_audit_log(db, tenant_id=current_user.tenant_id, actor_id=current_user.id, action="USER_UPDATED", entity_type="User", entity_id=str(user.id), before_data=before_data, after_data=after_data)

    await db.commit()
    return {"status": "ok"}


@router.delete("/{user_id}")
async def delete_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if user:
        await write_audit_log(
            db,
            tenant_id=current_user.tenant_id,
            actor_id=current_user.id,
            action="USER_DELETED",
            entity_type="User",
            entity_id=str(user.id),
            before_data={"email": user.email, "first_name": user.first_name},
        )
        await db.delete(user)
        await db.commit()
    return {"status": "ok"}
