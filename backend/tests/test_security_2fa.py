import pytest
from httpx import AsyncClient
import pyotp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.security import UserTwoFactor, UserRecoveryCode
from app.services.security_service import SecurityService

@pytest.mark.asyncio
async def test_2fa_setup_and_verify(client: AsyncClient, db: AsyncSession):
    # 1. Login
    res = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"})
    token = res.json()["access_token"]
    
    # 2. Setup 2FA
    setup_res = await client.post("/api/v1/security/2fa/setup", headers={"Authorization": f"Bearer {token}"})
    assert setup_res.status_code == 200
    setup_data = setup_res.json()
    assert "secret" in setup_data
    assert "uri" in setup_data
    assert "recovery_codes" in setup_data
    
    secret = setup_data["secret"]
    recovery_codes = setup_data["recovery_codes"]
    
    # 3. Check DB encryption
    from app.models.foundation import User
    user = (await db.execute(select(User).where(User.email == "admin_a@evolix.com"))).scalars().first()
    tf = (await db.execute(select(UserTwoFactor).where(UserTwoFactor.user_id == user.id))).scalars().first()
    
    assert tf is not None
    assert tf.is_active == False
    assert tf.totp_secret != secret # Proves it's encrypted
    
    decrypted_secret = SecurityService.decrypt_secret(tf.totp_secret)
    assert decrypted_secret == secret
    
    # 4. Verify with invalid code
    verify_res_invalid = await client.post("/api/v1/security/2fa/verify", headers={"Authorization": f"Bearer {token}"}, json={"code": "000000"})
    assert verify_res_invalid.status_code == 400
    
    # 5. Verify with valid code
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()
    verify_res_valid = await client.post("/api/v1/security/2fa/verify", headers={"Authorization": f"Bearer {token}"}, json={"code": valid_code})
    assert verify_res_valid.status_code == 200
    
    # Check it's active now
    await db.refresh(tf)
    assert tf.is_active == True

@pytest.mark.asyncio
async def test_2fa_login_challenge_and_recovery(client: AsyncClient, db: AsyncSession):
    # 1. Login - should return challenge token now
    res = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"})
    assert res.status_code == 200
    data = res.json()
    assert data["token_type"] == "2fa_challenge"
    challenge_token = data["challenge_token"]
    
    # 2. Try using challenge token on normal API
    users_res = await client.get("/api/v1/users", headers={"Authorization": f"Bearer {challenge_token}"})
    assert users_res.status_code == 401 # Should be rejected
    
    # 3. Re-enroll to capture a new recovery code
    # Wait, we need an active session to re-enroll
    from app.models.foundation import User
    from app.services.security_service import SecurityService
    user = (await db.execute(select(User).where(User.email == "admin_a@evolix.com"))).scalars().first()
    tf = (await db.execute(select(UserTwoFactor).where(UserTwoFactor.user_id == user.id))).scalars().first()
    decrypted_secret = SecurityService.decrypt_secret(tf.totp_secret)
    totp = pyotp.TOTP(decrypted_secret)
    valid_code = totp.now()
    
    # Complete 2FA login
    res = await client.post("/api/v1/auth/verify-2fa", json={"challenge_token": challenge_token, "totp_code": valid_code})
    assert res.status_code == 200
    access_token = res.json()["access_token"]
    
    # Disable first so we can setup again
    await client.delete("/api/v1/security/2fa", headers={"Authorization": f"Bearer {access_token}"})
    
    try:
        # Generate new setup to get recovery codes
        setup_res = await client.post("/api/v1/security/2fa/setup", headers={"Authorization": f"Bearer {access_token}"})
        recovery_codes = setup_res.json()["recovery_codes"]
        
        # Activate 2FA again
        valid_code_2 = pyotp.TOTP(setup_res.json()["secret"]).now()
        act_res = await client.post("/api/v1/security/2fa/verify", headers={"Authorization": f"Bearer {access_token}"}, json={"code": valid_code_2})
        assert act_res.status_code == 200
        
        # Login again to get a new challenge token
        res = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"})
        challenge_token_2 = res.json()["challenge_token"]
        
        # 4. Use recovery code
        recovery_code = recovery_codes[0]
        rec_res = await client.post("/api/v1/auth/recovery-login", json={"challenge_token": challenge_token_2, "recovery_code": recovery_code})
        assert rec_res.status_code == 200
        
        # 5. Try reusing the same recovery code - should fail
        res = await client.post("/api/v1/auth/login", json={"email": "admin_a@evolix.com", "password": "password"})
        challenge_token_3 = res.json()["challenge_token"]
        rec_res_2 = await client.post("/api/v1/auth/recovery-login", json={"challenge_token": challenge_token_3, "recovery_code": recovery_code})
        assert rec_res_2.status_code == 401
    finally:
        # Disable 2FA to clean up!
        await client.delete("/api/v1/security/2fa", headers={"Authorization": f"Bearer {access_token}"})
