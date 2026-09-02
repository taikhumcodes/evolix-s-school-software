import asyncio
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.models.foundation import User, Role, Permission

async def main():
    async with AsyncSessionLocal() as session:
        # Get superadmin role
        result = await session.execute(select(Role).where(Role.name == "superadmin"))
        role = result.scalars().first()
        
        # Define missing permissions
        perms = [
            ("USERS_VIEW", "View users"),
            ("USERS_MANAGE", "Manage users"),
            ("ROLES_VIEW", "View roles"),
            ("ROLES_MANAGE", "Manage roles"),
            ("ACADEMIC_YEARS_VIEW", "View academic years"),
            ("ACADEMIC_YEARS_MANAGE", "Manage academic years"),
            ("AUDIT_LOGS_VIEW", "View audit logs"),
        ]
        
        for code, desc in perms:
            result = await session.execute(select(Permission).where(Permission.code == code))
            p = result.scalars().first()
            if not p:
                p = Permission(code=code, description=desc)
                session.add(p)
            
            # Ensure role has this permission
            await session.refresh(role, ["permissions"])
            if not any(rp.code == p.code for rp in role.permissions):
                role.permissions.append(p)
                
        await session.commit()
        print("Permissions fixed!")

asyncio.run(main())
