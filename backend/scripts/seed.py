import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from app.db.session import AsyncSessionLocal
from app.models.foundation import Tenant, School, User, Role, Permission

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_data():
    async with AsyncSessionLocal() as session:
        # Create Permissions
        permissions = {
            "settings.view": Permission(code="settings.view", description="View settings"),
            "settings.manage": Permission(code="settings.manage", description="Manage settings"),
            "audit.view": Permission(code="audit.view", description="View audit logs"),
            "USERS_VIEW": Permission(code="USERS_VIEW", description="View users"),
            "USERS_MANAGE": Permission(code="USERS_MANAGE", description="Manage users"),
            "ROLES_VIEW": Permission(code="ROLES_VIEW", description="View roles"),
            "ROLES_MANAGE": Permission(code="ROLES_MANAGE", description="Manage roles"),
            "ACADEMIC_YEARS_VIEW": Permission(code="ACADEMIC_YEARS_VIEW", description="View academic years"),
            "ACADEMIC_YEARS_MANAGE": Permission(code="ACADEMIC_YEARS_MANAGE", description="Manage academic years"),
            "AUDIT_LOGS_VIEW": Permission(code="AUDIT_LOGS_VIEW", description="View audit logs")
        }
        for perm in permissions.values():
            session.add(perm)
        await session.flush()

        # Create Tenant A
        tenant_a = Tenant(name="Tenant A", domain="tenant_a.evolix.com")
        session.add(tenant_a)
        await session.flush()
        
        # Create Tenant B
        tenant_b = Tenant(name="Tenant B", domain="tenant_b.evolix.com")
        session.add(tenant_b)
        await session.flush()

        # Create School A
        school_a = School(name="School A", code="SCH_A", tenant_id=tenant_a.id)
        session.add(school_a)
        await session.flush()
        
        # Create School B
        school_b = School(name="School B", code="SCH_B", tenant_id=tenant_b.id)
        session.add(school_b)
        await session.flush()

        # Create Roles
        role_a = Role(name="superadmin", tenant_id=tenant_a.id, is_system=True)
        role_a.permissions.extend(list(permissions.values()))
        session.add(role_a)

        role_b = Role(name="superadmin", tenant_id=tenant_b.id, is_system=True)
        role_b.permissions.extend(list(permissions.values()))
        session.add(role_b)

        # Restricted Role for RBAC Testing
        role_restricted = Role(name="restricted", tenant_id=tenant_a.id, is_system=False)
        role_restricted.permissions.append(permissions["settings.view"])
        session.add(role_restricted)
        
        await session.flush()

        # Create User A
        user_a = User(
            email="admin_a@evolix.com",
            hashed_password=hash_password("password"),
            first_name="Admin",
            last_name="A",
            tenant_id=tenant_a.id
        )
        user_a.schools.append(school_a)
        user_a.roles.append(role_a)
        session.add(user_a)

        # Create User B
        user_b = User(
            email="admin_b@evolix.com",
            hashed_password=hash_password("password"),
            first_name="Admin",
            last_name="B",
            tenant_id=tenant_b.id
        )
        user_b.schools.append(school_b)
        user_b.roles.append(role_b)
        session.add(user_b)
        
        # Create Restricted User for RBAC Test
        user_restricted = User(
            email="restricted_a@evolix.com",
            hashed_password=hash_password("password"),
            first_name="Restricted",
            last_name="A",
            tenant_id=tenant_a.id
        )
        user_restricted.schools.append(school_a)
        user_restricted.roles.append(role_restricted)
        session.add(user_restricted)

        await session.commit()
        print("Seed data successfully inserted.")

if __name__ == "__main__":
    asyncio.run(seed_data())
