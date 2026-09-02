import uuid
import re
import pyotp
import ipaddress
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, update
from fastapi import HTTPException

from app.models.security import (
    SecurityPolicy, UserPasswordHistory, UserTwoFactor,
    UserSession, IpRestriction, SecurityEvent
)
from app.models.foundation import User, Tenant
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

class SecurityService:
    @staticmethod
    async def log_security_event(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        event_type: str,
        user_id: uuid.UUID | None = None,
        ip_address: str | None = None,
        severity: str = "INFO",
        metadata_info: str | None = None
    ) -> SecurityEvent:
        event = SecurityEvent(
            tenant_id=tenant_id,
            user_id=user_id,
            event_type=event_type,
            ip_address=ip_address,
            severity=severity,
            metadata_info=metadata_info
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event

    @staticmethod
    async def get_or_create_policy(db: AsyncSession, tenant_id: uuid.UUID) -> SecurityPolicy:
        result = await db.execute(select(SecurityPolicy).where(SecurityPolicy.tenant_id == tenant_id))
        policy = result.scalars().first()
        if not policy:
            policy = SecurityPolicy(tenant_id=tenant_id)
            db.add(policy)
            await db.commit()
            await db.refresh(policy)
        return policy

    @staticmethod
    async def validate_password_complexity(db: AsyncSession, tenant_id: uuid.UUID, password: str) -> bool:
        policy = await SecurityService.get_or_create_policy(db, tenant_id)
        if len(password) < policy.password_min_length:
            raise HTTPException(status_code=400, detail=f"Password must be at least {policy.password_min_length} characters")
        if policy.password_require_uppercase and not re.search(r"[A-Z]", password):
            raise HTTPException(status_code=400, detail="Password must contain an uppercase letter")
        if policy.password_require_lowercase and not re.search(r"[a-z]", password):
            raise HTTPException(status_code=400, detail="Password must contain a lowercase letter")
        if policy.password_require_number and not re.search(r"\d", password):
            raise HTTPException(status_code=400, detail="Password must contain a number")
        if policy.password_require_special and not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            raise HTTPException(status_code=400, detail="Password must contain a special character")
        return True

    @staticmethod
    async def check_password_history(db: AsyncSession, user_id: uuid.UUID, tenant_id: uuid.UUID, new_password: str) -> bool:
        policy = await SecurityService.get_or_create_policy(db, tenant_id)
        if policy.password_history_count <= 0:
            return True
            
        result = await db.execute(
            select(UserPasswordHistory)
            .where(UserPasswordHistory.user_id == user_id)
            .order_by(desc(UserPasswordHistory.created_at))
            .limit(policy.password_history_count)
        )
        history = result.scalars().all()
        for record in history:
            if verify_password(new_password, record.hashed_password):
                raise HTTPException(status_code=400, detail="Password was used recently")
        return True

    @staticmethod
    async def save_password_history(db: AsyncSession, user_id: uuid.UUID, hashed_password: str):
        record = UserPasswordHistory(user_id=user_id, hashed_password=hashed_password)
        db.add(record)
        await db.commit()

    @staticmethod
    async def check_ip_restriction(db: AsyncSession, tenant_id: uuid.UUID, ip_address: str) -> bool:
        if not ip_address:
            return True
            
        policy = await SecurityService.get_or_create_policy(db, tenant_id)
        if policy.ip_restriction_mode == "DISABLED":
            return True
            
        result = await db.execute(
            select(IpRestriction)
            .where(IpRestriction.tenant_id == tenant_id, IpRestriction.is_enabled == True)
        )
        restrictions = result.scalars().all()
        
        if not restrictions:
            # If ALLOW list is empty, block everyone (or allow? usually block).
            # If DENY list is empty, allow everyone.
            return True if policy.ip_restriction_mode == "DENY" else False
            
        try:
            ip_obj = ipaddress.ip_address(ip_address)
        except ValueError:
            return False # Invalid IP
        
        is_allowed = False
        is_denied = False
        
        for rule in restrictions:
            try:
                network = ipaddress.ip_network(rule.network_cidr, strict=False)
                if ip_obj in network:
                    if rule.rule_type == "DENY":
                        is_denied = True
                    elif rule.rule_type == "ALLOW":
                        is_allowed = True
            except ValueError:
                continue # Ignore invalid CIDRs
                    
        if policy.ip_restriction_mode == "ALLOW":
            if is_denied: return False
            if is_allowed: return True
            return False # Default deny in allowlist mode
        elif policy.ip_restriction_mode == "DENY":
            if is_denied: return False
            return True
            
        return True
        
    @staticmethod
    def _get_fernet():
        import os
        from cryptography.fernet import Fernet
        
        secret = os.getenv("TOTP_ENCRYPTION_KEY")
        if not secret:
            try:
                from dotenv import load_dotenv
                load_dotenv()
                secret = os.getenv("TOTP_ENCRYPTION_KEY")
            except Exception:
                pass
                
        if not secret:
            raise RuntimeError(
                "TOTP_ENCRYPTION_KEY environment variable is missing. "
                "A dedicated Fernet key must be configured in environment variables."
            )
            
        try:
            return Fernet(secret.encode())
        except Exception as e:
            raise ValueError(
                f"TOTP_ENCRYPTION_KEY is not a valid Fernet key: {str(e)}. "
                "It must be a 32 url-safe base64-encoded bytes key generated via Fernet.generate_key()."
            )

    @staticmethod
    def encrypt_secret(secret: str) -> str:
        return SecurityService._get_fernet().encrypt(secret.encode()).decode()

    @staticmethod
    def decrypt_secret(encrypted_secret: str) -> str:
        return SecurityService._get_fernet().decrypt(encrypted_secret.encode()).decode()

    @staticmethod
    def generate_totp_secret() -> str:
        return pyotp.random_base32()
        
    @staticmethod
    def get_totp_uri(secret: str, email: str, issuer: str = "Evolix") -> str:
        return pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)
        
    @staticmethod
    def verify_totp(secret: str, code: str) -> bool:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)
        
    @staticmethod
    def generate_recovery_codes(count: int = 8) -> list[str]:
        import secrets
        import string
        codes = []
        for _ in range(count):
            # Format: XXXX-XXXX
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            codes.append(f"{code[:4]}-{code[4:]}")
        return codes
