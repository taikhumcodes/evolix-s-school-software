import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';

describe('Security & 2FA Lifecycle', () => {
  let userToken: string;
  let testUserId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    testUserEmail = `secuser_${Date.now()}@evolix.local`;
    const hash = await bcrypt.hash('InitialPassword123!', 10);
    const tenant = await prisma.tenant.findFirst();

    const user = await prisma.user.create({
      data: {
        tenantId: tenant!.id,
        email: testUserEmail,
        hashedPassword: hash,
        firstName: 'Sec',
        lastName: 'User',
      },
    });
    testUserId = user.id;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUserEmail,
        password: 'InitialPassword123!',
      });
    userToken = loginRes.body.access_token;
  });

  it('should change password, enforce complexity, and prevent password reuse', async () => {
    // 1. Wrong current password -> 400
    const failRes = await request(app)
      .patch('/api/v1/security/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        current_password: 'WrongPassword!',
        new_password: 'NewStrongPassword123!',
      });
    expect(failRes.status).toBe(422);

    // 2. Weak new password (< 8 chars) -> 422
    const weakRes = await request(app)
      .patch('/api/v1/security/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        current_password: 'InitialPassword123!',
        new_password: 'short',
      });
    expect(weakRes.status).toBe(422);

    // 3. Valid password change
    const successRes = await request(app)
      .patch('/api/v1/security/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        current_password: 'InitialPassword123!',
        new_password: 'NewStrongPassword123!',
      });
    expect(successRes.status).toBe(200);

    // 4. Attempt to change to same recently used password -> 422
    const reuseRes = await request(app)
      .patch('/api/v1/security/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        current_password: 'NewStrongPassword123!',
        new_password: 'NewStrongPassword123!',
      });
    expect(reuseRes.status).toBe(422);
    expect(reuseRes.body.error.message).toContain('Password was used recently');
  });

  it('should execute 2FA setup, verify, challenge on login, and recovery code login', async () => {
    // 1. Setup 2FA
    const setupRes = await request(app)
      .post('/api/v1/security/2fa/setup')
      .set('Authorization', `Bearer ${userToken}`);

    expect(setupRes.status).toBe(200);
    expect(setupRes.body.secret).toBeDefined();
    expect(setupRes.body.uri).toContain('otpauth://totp/');
    expect(setupRes.body.recovery_codes).toHaveLength(8);

    const totpSecret = setupRes.body.secret;
    const recoveryCodes: string[] = setupRes.body.recovery_codes;

    // 2. Verify with invalid code -> 422
    const invalidCodeRes = await request(app)
      .post('/api/v1/security/2fa/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: '000000' });
    expect(invalidCodeRes.status).toBe(422);

    // 3. Verify with valid TOTP code
    const validCode = authenticator.generate(totpSecret);
    const verifyRes = await request(app)
      .post('/api/v1/security/2fa/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: validCode });
    expect(verifyRes.status).toBe(200);

    // 4. Login now returns 2fa_challenge instead of full tokens
    const challengeRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUserEmail,
        password: 'NewStrongPassword123!',
      });

    expect(challengeRes.status).toBe(200);
    expect(challengeRes.body.token_type).toBe('2fa_challenge');
    expect(challengeRes.body.challenge_token).toBeDefined();

    const challengeToken = challengeRes.body.challenge_token;

    // 5. Verify 2FA at login
    const totpAtLogin = authenticator.generate(totpSecret);
    const verify2faLoginRes = await request(app)
      .post('/api/v1/auth/verify-2fa')
      .send({
        challenge_token: challengeToken,
        totp_code: totpAtLogin,
      });

    expect(verify2faLoginRes.status).toBe(200);
    expect(verify2faLoginRes.body.token_type).toBe('bearer');
    expect(verify2faLoginRes.body.access_token).toBeDefined();

    // 6. Test Single-Use Recovery Code Login
    // Issue a new challenge token
    const challengeRes2 = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUserEmail,
        password: 'NewStrongPassword123!',
      });
    const challengeToken2 = challengeRes2.body.challenge_token;

    const codeToUse = recoveryCodes[0];
    const recoveryRes = await request(app)
      .post('/api/v1/auth/recovery-login')
      .send({
        challenge_token: challengeToken2,
        recovery_code: codeToUse,
      });

    expect(recoveryRes.status).toBe(200);
    expect(recoveryRes.body.token_type).toBe('bearer');
    expect(recoveryRes.body.access_token).toBeDefined();

    // 7. Reusing same recovery code must fail
    const challengeRes3 = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUserEmail,
        password: 'NewStrongPassword123!',
      });
    const challengeToken3 = challengeRes3.body.challenge_token;

    const reuseRecoveryRes = await request(app)
      .post('/api/v1/auth/recovery-login')
      .send({
        challenge_token: challengeToken3,
        recovery_code: codeToUse,
      });

    expect(reuseRecoveryRes.status).toBe(401);
  });

  it('should list active sessions and revoke session and its refresh token', async () => {
    // 1. Fetch sessions
    const sessionsRes = await request(app)
      .get('/api/v1/security/sessions')
      .set('Authorization', `Bearer ${userToken}`);

    expect(sessionsRes.status).toBe(200);
    expect(Array.isArray(sessionsRes.body)).toBe(true);
    expect(sessionsRes.body.length).toBeGreaterThan(0);

    const sessionToRevoke = sessionsRes.body[0];

    // 2. Revoke session
    const revokeRes = await request(app)
      .delete(`/api/v1/security/sessions/${sessionToRevoke.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.status).toBe('ok');

    // 3. Verify session is no longer active in the active sessions list
    const sessionsAfter = await request(app)
      .get('/api/v1/security/sessions')
      .set('Authorization', `Bearer ${userToken}`);

    const ids = sessionsAfter.body.map((s: any) => s.id);
    expect(ids).not.toContain(sessionToRevoke.id);
  });
});
