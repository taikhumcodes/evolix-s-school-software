from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from app.db.session import AsyncSessionLocal
from app.api.deps import get_db, get_current_user, get_client_ip
from app.models.foundation import User, RefreshToken, School
from app.models.security import UserTwoFactor, UserSession
from app.services.security_service import SecurityService
from jose import jwt
from datetime import datetime, timedelta, timezone
import os, uuid
import bcrypt

router = APIRouter()
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"

class LoginData(BaseModel):
    email: str
    password: str

class RefreshData(BaseModel):
    refresh_token: str
    
class Verify2FAData(BaseModel):
    challenge_token: str
    totp_code: str

@router.post("/login")
async def login(data: LoginData, request: Request, db: AsyncSession = Depends(get_db)):
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    
    stmt = select(User).where(User.email == data.email)
    res = await db.execute(stmt)
    user = res.scalars().first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    # 1. Check if user is locked out
    if user.locked_until:
        now_utc = datetime.now(timezone.utc)
        user_lock = user.locked_until if user.locked_until.tzinfo else user.locked_until.replace(tzinfo=timezone.utc)
        if user_lock > now_utc:
            raise HTTPException(status_code=403, detail="Account is temporarily locked. Try again later.")
        
    # 2. IP Restriction Check
    ip_allowed = await SecurityService.check_ip_restriction(db, user.tenant_id, ip_address)
    if not ip_allowed:
        await SecurityService.log_security_event(db, user.tenant_id, "LOGIN_DENIED_IP", user.id, ip_address, "WARNING")
        raise HTTPException(status_code=403, detail="Login from this IP address is not permitted.")
        
    try:
        is_valid = bcrypt.checkpw(data.password.encode('utf-8'), user.hashed_password.encode('utf-8'))
    except Exception:
        is_valid = False
        
    if not is_valid:
        policy = await SecurityService.get_or_create_policy(db, user.tenant_id)
        
        from sqlalchemy import update
        stmt = update(User).where(User.id == user.id).values(
            failed_login_attempts=User.failed_login_attempts + 1
        ).returning(User.failed_login_attempts)
        result = await db.execute(stmt)
        updated_attempts = result.scalar_one()
        
        if updated_attempts >= policy.max_failed_attempts:
            lock_time = datetime.now(timezone.utc) + timedelta(minutes=policy.lockout_minutes)
            await db.execute(update(User).where(User.id == user.id).values(locked_until=lock_time))
            await SecurityService.log_security_event(db, user.tenant_id, "ACCOUNT_LOCKED", user.id, ip_address, "CRITICAL")
        else:
            await SecurityService.log_security_event(db, user.tenant_id, "LOGIN_FAILED", user.id, ip_address, "INFO")
            
        await db.commit()
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Reset failed attempts
    user.failed_login_attempts = 0
    user.locked_until = None
    
    # 3. Check 2FA
    two_factor = await db.execute(select(UserTwoFactor).where(UserTwoFactor.user_id == user.id))
    tf = two_factor.scalars().first()
    
    if tf and tf.is_active:
        challenge_exp = datetime.utcnow() + timedelta(minutes=5)
        challenge_token = jwt.encode({"sub": str(user.id), "type": "2fa_challenge", "exp": challenge_exp}, SECRET_KEY, algorithm=ALGORITHM)
        await db.commit()
        return {"token_type": "2fa_challenge", "challenge_token": challenge_token}

    # Generate full tokens
    expires = datetime.utcnow() + timedelta(minutes=60)
    access_token = jwt.encode({"sub": str(user.id), "exp": expires, "type": "access"}, SECRET_KEY, algorithm=ALGORITHM)
    
    refresh_token = str(uuid.uuid4())
    rt_record = RefreshToken(user_id=user.id, token=refresh_token, expires_at=int((datetime.utcnow() + timedelta(days=7)).timestamp()))
    db.add(rt_record)
    await db.flush()
    
    # Create session
    session_record = UserSession(
        tenant_id=user.tenant_id,
        user_id=user.id,
        refresh_token_id=rt_record.id,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(session_record)
    
    await SecurityService.log_security_event(db, user.tenant_id, "LOGIN_SUCCESS", user.id, ip_address, "INFO")
    await db.commit()
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/verify-2fa")
async def verify_2fa(data: Verify2FAData, request: Request, db: AsyncSession = Depends(get_db)):
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    
    try:
        payload = jwt.decode(data.challenge_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "2fa_challenge":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id_str = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired challenge token")
        
    user_id = uuid.UUID(user_id_str)
    
    two_factor = await db.execute(select(UserTwoFactor).where(UserTwoFactor.user_id == user_id))
    tf = two_factor.scalars().first()
    
    if not tf or not tf.is_active:
        raise HTTPException(status_code=400, detail="2FA is not enabled")
        
    decrypted_secret = SecurityService.decrypt_secret(tf.totp_secret)
    if not SecurityService.verify_totp(decrypted_secret, data.totp_code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")
        
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalars().first()
    
    expires = datetime.utcnow() + timedelta(minutes=60)
    access_token = jwt.encode({"sub": str(user.id), "exp": expires, "type": "access"}, SECRET_KEY, algorithm=ALGORITHM)
    
    refresh_token = str(uuid.uuid4())
    rt_record = RefreshToken(user_id=user.id, token=refresh_token, expires_at=int((datetime.utcnow() + timedelta(days=7)).timestamp()))
    db.add(rt_record)
    await db.flush()
    
    session_record = UserSession(
        tenant_id=user.tenant_id,
        user_id=user.id,
        refresh_token_id=rt_record.id,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(session_record)
    
    await SecurityService.log_security_event(db, user.tenant_id, "2FA_LOGIN_SUCCESS", user.id, ip_address, "INFO")
    await db.commit()
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

class RecoveryLoginData(BaseModel):
    challenge_token: str
    recovery_code: str

@router.post("/recovery-login")
async def recovery_login(data: RecoveryLoginData, request: Request, db: AsyncSession = Depends(get_db)):
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    
    try:
        payload = jwt.decode(data.challenge_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "2fa_challenge":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id_str = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired challenge token")
        
    user_id = uuid.UUID(user_id_str)
    
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
        
    from app.models.security import UserRecoveryCode
    from app.services.security_service import verify_password
    
    res = await db.execute(select(UserRecoveryCode).where(UserRecoveryCode.user_id == user_id, UserRecoveryCode.used_at == None))
    codes = res.scalars().all()
    
    valid_code = None
    for code_record in codes:
        if verify_password(data.recovery_code, code_record.hashed_code):
            valid_code = code_record
            break
            
    if not valid_code:
        raise HTTPException(status_code=401, detail="Invalid recovery code")
        
    # Mark as used
    valid_code.used_at = datetime.utcnow()
    
    expires = datetime.utcnow() + timedelta(minutes=60)
    access_token = jwt.encode({"sub": str(user.id), "exp": expires, "type": "access"}, SECRET_KEY, algorithm=ALGORITHM)
    
    refresh_token = str(uuid.uuid4())
    rt_record = RefreshToken(user_id=user.id, token=refresh_token, expires_at=int((datetime.utcnow() + timedelta(days=7)).timestamp()))
    db.add(rt_record)
    await db.flush()
    
    session_record = UserSession(
        tenant_id=user.tenant_id,
        user_id=user.id,
        refresh_token_id=rt_record.id,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(session_record)
    
    await SecurityService.log_security_event(db, user.tenant_id, "2FA_RECOVERY_USED", user.id, ip_address, "WARNING")
    await db.commit()
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh")
async def refresh(data: RefreshData, request: Request, db: AsyncSession = Depends(get_db)):
    ip_address = get_client_ip(request)
    
    stmt = select(RefreshToken).where(RefreshToken.token == data.refresh_token)
    res = await db.execute(stmt)
    rt = res.scalars().first()
    
    if not rt:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    stmt_user = select(User).where(User.id == rt.user_id)
    res_user = await db.execute(stmt_user)
    user = res_user.scalars().first()
        
    if rt.is_revoked or rt.replaced_by:
        # Token reuse detected! Revoke descendant token
        if rt.replaced_by:
            rev_stmt = select(RefreshToken).where(RefreshToken.token == rt.replaced_by)
            rev_res = await db.execute(rev_stmt)
            descendant = rev_res.scalars().first()
            if descendant:
                descendant.is_revoked = True
                await db.commit()
        await SecurityService.log_security_event(db, user.tenant_id, "REFRESH_REUSE_DETECTED", user.id, ip_address, "WARNING")
        raise HTTPException(status_code=401, detail="Token reuse detected")
        
    if rt.expires_at < int(datetime.utcnow().timestamp()):
        raise HTTPException(status_code=401, detail="Refresh token expired")
        
    rt.is_revoked = True
    new_refresh = str(uuid.uuid4())
    rt.replaced_by = new_refresh
    new_rt_record = RefreshToken(user_id=rt.user_id, token=new_refresh, expires_at=int((datetime.utcnow() + timedelta(days=7)).timestamp()))
    db.add(new_rt_record)
    await db.flush()
    
    expires = datetime.utcnow() + timedelta(minutes=60)
    access_token = jwt.encode({"sub": str(user.id), "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)
    
    # Update Session activity
    session_res = await db.execute(select(UserSession).where(UserSession.refresh_token_id == rt.id))
    session = session_res.scalars().first()
    if session:
        session.last_activity_at = datetime.utcnow()
        session.ip_address = ip_address
        session.refresh_token_id = new_rt_record.id
    
    await db.commit()
    return {"access_token": access_token, "refresh_token": new_refresh, "token_type": "bearer"}

@router.post("/logout")
async def logout(data: RefreshData, db: AsyncSession = Depends(get_db)):
    stmt = select(RefreshToken).where(RefreshToken.token == data.refresh_token)
    res = await db.execute(stmt)
    rt = res.scalars().first()
    if rt:
        rt.is_revoked = True
        
        # Revoke session
        session_res = await db.execute(select(UserSession).where(UserSession.refresh_token_id == rt.id))
        session = session_res.scalars().first()
        if session:
            session.is_revoked = True
            
        await db.commit()
    return {"status": "ok"}

@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    schools = [{"id": str(s.id), "name": s.name} for s in user.schools]
    return {"id": str(user.id), "email": user.email, "first_name": user.first_name, "last_name": user.last_name, "schools": schools, "tenant_id": str(user.tenant_id)}
