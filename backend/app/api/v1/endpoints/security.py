import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, desc
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.api.deps import get_db, get_current_user, require_permissions
from app.models.foundation import User
from app.models.security import UserTwoFactor, UserSession, IpRestriction, SecurityEvent
from app.services.security_service import SecurityService

router = APIRouter()

# --- Pydantic Models ---

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class TotpSetupResponse(BaseModel):
    secret: str
    uri: str
    recovery_codes: List[str]

class TotpVerifyRequest(BaseModel):
    code: str

class SecurityPolicyUpdate(BaseModel):
    password_min_length: Optional[int] = None
    password_require_uppercase: Optional[bool] = None
    password_require_lowercase: Optional[bool] = None
    password_require_number: Optional[bool] = None
    password_require_special: Optional[bool] = None
    password_history_count: Optional[int] = None
    password_expiry_days: Optional[int] = None
    max_failed_attempts: Optional[int] = None
    lockout_minutes: Optional[int] = None
    ip_restriction_mode: Optional[str] = None
    require_2fa_for_admins: Optional[bool] = None

class IpRestrictionCreate(BaseModel):
    network_cidr: str
    rule_type: str # ALLOW, DENY
    description: Optional[str] = None

# --- Personal Security Endpoints ---

@router.patch("/password")
async def change_password(
    data: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.security_service import verify_password, get_password_hash
    
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    await SecurityService.validate_password_complexity(db, current_user.tenant_id, data.new_password)
    await SecurityService.check_password_history(db, current_user.id, current_user.tenant_id, data.new_password)
    
    new_hash = get_password_hash(data.new_password)
    current_user.hashed_password = new_hash
    current_user.password_changed_at = datetime.utcnow()
    
    await SecurityService.save_password_history(db, current_user.id, new_hash)
    await SecurityService.log_security_event(db, current_user.tenant_id, "PASSWORD_CHANGED", current_user.id)
    await db.commit()
    
    return {"status": "ok"}

@router.post("/2fa/setup", response_model=TotpSetupResponse)
async def setup_2fa(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(UserTwoFactor).where(UserTwoFactor.user_id == current_user.id))
    tf = result.scalars().first()
    
    if tf and tf.is_active:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
        
    secret = SecurityService.generate_totp_secret()
    uri = SecurityService.get_totp_uri(secret, current_user.email)
    
    encrypted_secret = SecurityService.encrypt_secret(secret)
    
    if tf:
        tf.totp_secret = encrypted_secret
    else:
        tf = UserTwoFactor(user_id=current_user.id, totp_secret=encrypted_secret)
        db.add(tf)
        
    # Generate recovery codes
    from app.services.security_service import get_password_hash
    from app.models.security import UserRecoveryCode
    
    # Delete old ones if they existed
    await db.execute(
        UserRecoveryCode.__table__.delete().where(UserRecoveryCode.user_id == current_user.id)
    )
    
    plaintext_codes = SecurityService.generate_recovery_codes()
    for code in plaintext_codes:
        db.add(UserRecoveryCode(
            user_id=current_user.id,
            hashed_code=get_password_hash(code)
        ))
        
    await db.commit()
    return {"secret": secret, "uri": uri, "recovery_codes": plaintext_codes}

@router.post("/2fa/verify")
async def verify_2fa_setup(
    data: TotpVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(UserTwoFactor).where(UserTwoFactor.user_id == current_user.id))
    tf = result.scalars().first()
    
    if not tf or tf.is_active:
        raise HTTPException(status_code=400, detail="Invalid 2FA setup state")
        
    decrypted_secret = SecurityService.decrypt_secret(tf.totp_secret)
    if not SecurityService.verify_totp(decrypted_secret, data.code):
        raise HTTPException(status_code=400, detail="Invalid code")
        
    tf.is_active = True
    await SecurityService.log_security_event(db, current_user.tenant_id, "2FA_ENABLED", current_user.id)
    await db.commit()
    return {"status": "ok"}

@router.delete("/2fa")
async def disable_2fa(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.security import UserRecoveryCode
    await db.execute(delete(UserTwoFactor).where(UserTwoFactor.user_id == current_user.id))
    await db.execute(delete(UserRecoveryCode).where(UserRecoveryCode.user_id == current_user.id))
    await SecurityService.log_security_event(db, current_user.tenant_id, "2FA_DISABLED", current_user.id)
    await db.commit()
    return {"status": "ok"}

@router.get("/sessions")
async def get_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == current_user.id, UserSession.is_revoked.is_(False))
    )
    sessions = result.scalars().all()
    return [{
        "id": str(s.id),
        "ip_address": s.ip_address,
        "user_agent": s.user_agent,
        "last_activity_at": s.last_activity_at,
        "expires_at": s.expires_at
    } for s in sessions]

@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.foundation import RefreshToken
    try:
        sess_uuid = uuid.UUID(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    result = await db.execute(select(UserSession).where(UserSession.id == sess_uuid, UserSession.user_id == current_user.id))
    session = result.scalars().first()
    if session:
        session.is_revoked = True
        if session.refresh_token_id:
            rt_res = await db.execute(select(RefreshToken).where(RefreshToken.id == session.refresh_token_id))
            rt = rt_res.scalars().first()
            if rt:
                rt.is_revoked = True
        await db.commit()
    return {"status": "ok"}

# --- Admin Security Endpoints ---

@router.get("/policy", dependencies=[Depends(require_permissions(["security.manage"]))])
async def get_policy(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = await SecurityService.get_or_create_policy(db, current_user.tenant_id)
    return policy

@router.patch("/policy", dependencies=[Depends(require_permissions(["security.manage"]))])
async def update_policy(
    data: SecurityPolicyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = await SecurityService.get_or_create_policy(db, current_user.tenant_id)
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(policy, key, value)
        
    await SecurityService.log_security_event(db, current_user.tenant_id, "POLICY_UPDATED", current_user.id)
    await db.commit()
    return policy

@router.get("/ip-restrictions", dependencies=[Depends(require_permissions(["security.manage"]))])
async def list_ip_restrictions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(IpRestriction).where(IpRestriction.tenant_id == current_user.tenant_id))
    return result.scalars().all()

@router.post("/ip-restrictions", dependencies=[Depends(require_permissions(["security.manage"]))])
async def create_ip_restriction(
    data: IpRestrictionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import ipaddress
    try:
        ipaddress.ip_network(data.network_cidr, strict=False)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid CIDR format")
        
    rule = IpRestriction(
        tenant_id=current_user.tenant_id,
        network_cidr=data.network_cidr,
        rule_type=data.rule_type,
        description=data.description
    )
    db.add(rule)
    await SecurityService.log_security_event(db, current_user.tenant_id, "IP_RULE_ADDED", current_user.id, metadata_info=data.network_cidr)
    await db.commit()
    await db.refresh(rule)
    return rule

@router.delete("/ip-restrictions/{rule_id}", dependencies=[Depends(require_permissions(["security.manage"]))])
async def delete_ip_restriction(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(IpRestriction).where(IpRestriction.id == rule_id, IpRestriction.tenant_id == current_user.tenant_id))
    rule = result.scalars().first()
    if rule:
        await db.delete(rule)
        await SecurityService.log_security_event(db, current_user.tenant_id, "IP_RULE_DELETED", current_user.id)
        await db.commit()
    return {"status": "ok"}

@router.get("/events", dependencies=[Depends(require_permissions(["security.manage"]))])
async def list_security_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(SecurityEvent)
        .where(SecurityEvent.tenant_id == current_user.tenant_id)
        .order_by(desc(SecurityEvent.created_at))
        .limit(100)
    )
    return result.scalars().all()

@router.delete("/admin/sessions/{session_id}", dependencies=[Depends(require_permissions(["security.manage"]))])
async def admin_revoke_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.foundation import RefreshToken
    result = await db.execute(select(UserSession).where(UserSession.id == session_id, UserSession.tenant_id == current_user.tenant_id))
    session = result.scalars().first()
    if session:
        session.is_revoked = True
        if session.refresh_token_id:
            rt_res = await db.execute(select(RefreshToken).where(RefreshToken.id == session.refresh_token_id))
            rt = rt_res.scalars().first()
            if rt:
                rt.is_revoked = True
        await SecurityService.log_security_event(db, current_user.tenant_id, "SESSION_REVOKED_ADMIN", session.user_id)
        await db.commit()
    return {"status": "ok"}

@router.delete("/admin/2fa/{user_id}", dependencies=[Depends(require_permissions(["security.manage"]))])
async def admin_reset_2fa(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_res = await db.execute(select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    result = await db.execute(select(UserTwoFactor).where(UserTwoFactor.user_id == user.id))
    tf = result.scalars().first()
    if tf:
        await db.delete(tf)
        
    from app.models.security import UserRecoveryCode
    await db.execute(UserRecoveryCode.__table__.delete().where(UserRecoveryCode.user_id == user.id))
        
    await SecurityService.log_security_event(db, current_user.tenant_id, "2FA_DISABLED_ADMIN", user.id)
    await db.commit()
    return {"status": "ok"}
    
@router.post("/admin/unlock/{user_id}", dependencies=[Depends(require_permissions(["security.manage"]))])
async def admin_unlock_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_res = await db.execute(select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.locked_until = None
    user.failed_login_attempts = 0
    await SecurityService.log_security_event(db, current_user.tenant_id, "ACCOUNT_UNLOCKED_ADMIN", user.id)
    await db.commit()
    return {"status": "ok"}
