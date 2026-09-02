import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from sqlalchemy.future import select
from app.models.foundation import User
from sqlalchemy.orm import selectinload

async def check():
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).options(selectinload(User.roles)).where(User.email == "admin_a@evolix.com"))).scalars().first()
        from app.models.foundation import Role
        role = (await db.execute(select(Role).where(Role.name == "superadmin", Role.tenant_id == user.tenant_id))).scalars().first()
        if user and role and role not in user.roles:
            user.roles.append(role)
            await db.commit()
            print("Role added to admin_a@evolix.com")
        
        user2 = (await db.execute(select(User).options(selectinload(User.roles)).where(User.email == "restricted_a@evolix.com"))).scalars().first()
        role_restricted = (await db.execute(select(Role).where(Role.name == "restricted", Role.tenant_id == user.tenant_id))).scalars().first()
        if user2 and role_restricted and role_restricted not in user2.roles:
            user2.roles.append(role_restricted)
            await db.commit()
            print("Role added to restricted_a@evolix.com")

if __name__ == "__main__":
    asyncio.run(check())
