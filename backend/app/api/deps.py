from typing import AsyncGenerator, Optional, List
from fastapi import Depends, HTTPException, status, Header, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.db.session import AsyncSessionLocal
from app.models.foundation import User, Tenant, Role, Permission
import os
from jose import jwt, JWTError

import ipaddress

def is_trusted_proxy(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        trusted_cidrs = os.getenv("TRUSTED_PROXY_CIDRS", "").split(",")
        for cidr in trusted_cidrs:
            cidr = cidr.strip()
            if not cidr:
                continue
            if ip in ipaddress.ip_network(cidr):
                return True
        return False
    except ValueError:
        return False

def get_client_ip(request: Request) -> str:
    # 1. Determine direct peer IP
    peer_ip = request.client.host if request.client else "127.0.0.1"
    
    # 2. Check if direct peer is trusted
    if not is_trusted_proxy(peer_ip):
        return peer_ip
        
    # 3. If direct peer is trusted, parse forwarded headers
    forwarded = request.headers.get("forwarded")
    if forwarded:
        for part in forwarded.split(";"):
            part = part.strip()
            if part.lower().startswith("for="):
                val = part[4:].strip().strip("\"").strip("[]")
                if val:
                    return val

    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        ips = [ip.strip() for ip in x_forwarded_for.split(",") if ip.strip()]
        if ips:
            return ips[0]
            
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()
        
    return peer_ip

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise credentials_exception
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        user_id: str = str(sub)
    except JWTError:
        raise credentials_exception
    
    stmt = (
        select(User)
        .options(
            selectinload(User.roles).selectinload(Role.permissions),
            selectinload(User.schools),
            selectinload(User.tenant),
        )
        .where(User.id == user_id)
    )
    result = await db.execute(stmt)
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

async def get_current_tenant(
    user: User = Depends(get_current_user),
    x_tenant_slug: Optional[str] = Header(None)
) -> Tenant:
    return user.tenant

class require_permissions:
    def __init__(self, permissions: List[str]):
        self.permissions = permissions
        
    async def __call__(self, user: User = Depends(get_current_user)):
        user_perms = set()
        for role in user.roles:
            if role.name.lower() in ['superadmin', 'owner', 'principle', 'admin']:
                return True
            for perm in role.permissions:
                user_perms.add(perm.code.lower())
        for p in self.permissions:
            if p.lower() not in user_perms:
                raise HTTPException(status_code=403, detail="Not enough permissions")
        return True
