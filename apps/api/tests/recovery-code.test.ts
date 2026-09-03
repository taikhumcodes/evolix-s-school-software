import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('2FA Recovery Code Flow', () => {
  let tenantId: string;
  let userAToken: string;
  let userAId: string;
  let userAEmail: string;
  let userARecoveryCodes: string[];
  let userATotpSecret: string;

  let userBToken: string;
  let userBId: string;
  let userBEmail: string;
  let userBRecoveryCodes: string[];

  const userPassword = 'RecoveryTestPass123!';

  beforeAll(async () => {
    const tenant = await prisma.tenant.findFirst();
    tenantId = tenant!.id;

    // Create User A
    userAEmail = `rec_user_a_${Date.now()}@evolix.local`;
    const hashA = await bcrypt.hash(userPassword, 10);
    const userA = await prisma.user.create({
      data: {
        tenantId,
        email: userAEmail,
        hashedPassword: hashA,
        firstName: 'User',
        lastName: 'A',
      },
    });
    userAId = userA.id;

    const loginARes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userAEmail, password: userPassword });
    userAToken = loginARes.body.access_token;

    // Create User B
    userBEmail = `rec_user_b_${Date.now()}@evolix.local`;
    const hashB = await bcrypt.hash(userPassword, 10);
    const userB = await prisma.user.create({
      data: {
        tenantId,
        email: userBEmail,
        hashedPassword: hashB,
        firstName: 'User',
        lastName: 'B',
      },
    });
    userBId = userB.id;

    const loginBRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userBEmail, password: userPassword });
    userBToken = loginBRes.body.access_token;
  });

  it('1. enrollment creates hashed codes in database and returns plaintext codes once', async () => {
    // Enroll User A
    const setupA = await request(app)
      .post('/api/v1/security/2fa/setup')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(setupA.status).toBe(200);
    expect(setupA.body.recovery_codes).toHaveLength(8);
    userARecoveryCodes = setupA.body.recovery_codes;
    userATotpSecret = setupA.body.secret;

    // Verify User A 2FA activation
    const totpCodeA = authenticator.generate(userATotpSecret);
    const verifyA = await request(app)
      .post('/api/v1/security/2fa/verify')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ code: totpCodeA });
    expect(verifyA.status).toBe(200);

    // Check database records for User A
    const dbCodesA = await prisma.userRecoveryCode.findMany({
      where: { userId: userAId },
    });
    expect(dbCodesA).toHaveLength(8);

    for (const codeRecord of dbCodesA) {
      expect(codeRecord.hashedCode).toMatch(/^\$2[aby]\$/); // Stored as bcrypt hash
      expect(codeRecord.usedAt).toBeNull();
      // Ensure plaintext code is NOT stored as-is in the database
      expect(userARecoveryCodes).not.toContain(codeRecord.hashedCode);
    }

    // Enroll User B
    const setupB = await request(app)
      .post('/api/v1/security/2fa/setup')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(setupB.status).toBe(200);
    userBRecoveryCodes = setupB.body.recovery_codes;

    const totpCodeB = authenticator.generate(setupB.body.secret);
    await request(app)
      .post('/api/v1/security/2fa/verify')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ code: totpCodeB });
  });

  it('2. valid recovery code succeeds across formats (hyphen, no-hyphen, lowercase, spaces)', async () => {
    // Test code 0: with hyphen (e.g. ABCD-EFGH)
    const chal1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userAEmail, password: userPassword });
    expect(chal1.body.token_type).toBe('2fa_challenge');

    const code0 = userARecoveryCodes[0];
    const rec1 = await request(app)
      .post('/api/v1/auth/recovery-login')
      .send({
        challenge_token: chal1.body.challenge_token,
        recovery_code: code0,
      });
    expect(rec1.status).toBe(200);
    expect(rec1.body.token_type).toBe('bearer');
    expect(rec1.body.access_token).toBeDefined();

    // Test code 1: without hyphen and lowercase (e.g. abcdefgh)
    const chal2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userAEmail, password: userPassword });

    const code1WithoutHyphen = userARecoveryCodes[1].replace('-', '').toLowerCase();
    const rec2 = await request(app)
      .post('/api/v1/auth/recovery-login')
      .send({
        challenge_token: chal2.body.challenge_token,
        recovery_code: code1WithoutHyphen,
      });
    expect(rec2.status).toBe(200);
    expect(rec2.body.access_token).toBeDefined();

    // Test code 2: with spaces and mixed case (e.g. "  abCd - EfGh  ")
    const chal3 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userAEmail, password: userPassword });

    const code2WithSpaces = `  ${userARecoveryCodes[2].toLowerCase().slice(0, 4)} - ${userARecoveryCodes[2].toUpperCase().slice(5)}  `;
    const rec3 = await request(app)
      .post('/api/v1/auth/recovery-login')
      .send({
        challenge_token: chal3.body.challenge_token,
        recovery_code: code2WithSpaces,
      });
    expect(rec3.status).toBe(200);
    expect(rec3.body.access_token).toBeDefined();
  });

  it('3. same code reuse fails', async () => {
    // Issue challenge for User A
    const chal = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userAEmail, password: userPassword });

    // Attempt to reuse code 0 (which was already used in test 2)
    const reuseRes = await request(app)
      .post('/api/v1/auth/recovery-login')
      .send({
        challenge_token: chal.body.challenge_token,
        recovery_code: userARecoveryCodes[0],
      });

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.message).toBe('This recovery code has already been used');
  });

  it('4. invalid code fails', async () => {
    const chal = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userAEmail, password: userPassword });

    const invalidRes = await request(app)
      .post('/api/v1/auth/recovery-login')
      .send({
        challenge_token: chal.body.challenge_token,
        recovery_code: 'INVALID123',
      });

    expect(invalidRes.status).toBe(401);
    expect(invalidRes.body.error.message).toBe('Invalid recovery code');
  });

  it('5. expired challenge fails', async () => {
    const jwtSecret = process.env.JWT_SECRET || 'evolix-super-secret-jwt-key-for-development-only-change-in-prod-min-32-bytes';
    const expiredToken = jwt.sign(
      { sub: userAId, tenant_id: tenantId, type: '2fa_challenge' },
      jwtSecret,
      { expiresIn: '-10s' }
    );

    const res = await request(app)
      .post('/api/v1/auth/recovery-login')
      .send({
        challenge_token: expiredToken,
        recovery_code: userARecoveryCodes[3],
      });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired challenge token');
  });

  it('6. recovery code without challenge fails', async () => {
    const res = await request(app)
      .post('/api/v1/auth/recovery-login')
      .send({
        recovery_code: userARecoveryCodes[3],
      });

    expect(res.status).toBe(422);
  });

  it('7. code from User A cannot authenticate User B', async () => {
    // Challenge is issued for User B
    const chalB = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userBEmail, password: userPassword });

    // Submit User A's unused code 4 against User B's challenge token
    const crossRes = await request(app)
      .post('/api/v1/auth/recovery-login')
      .send({
        challenge_token: chalB.body.challenge_token,
        recovery_code: userARecoveryCodes[4],
      });

    expect(crossRes.status).toBe(401);
    expect(crossRes.body.error.message).toBe('Invalid recovery code');
  });

  it('8. two simultaneous uses of same code -> only one succeeds (concurrency safety)', async () => {
    const codeToTest = userARecoveryCodes[5];

    // Issue two distinct challenge tokens for User A
    const chal1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userAEmail, password: userPassword });
    const chal2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userAEmail, password: userPassword });

    // Send simultaneous requests using the exact same recovery code
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/auth/recovery-login')
        .send({
          challenge_token: chal1.body.challenge_token,
          recovery_code: codeToTest,
        }),
      request(app)
        .post('/api/v1/auth/recovery-login')
        .send({
          challenge_token: chal2.body.challenge_token,
          recovery_code: codeToTest,
        }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 401]);

    const successRes = res1.status === 200 ? res1 : res2;
    const failRes = res1.status === 401 ? res1 : res2;

    expect(successRes.body.access_token).toBeDefined();
    expect(failRes.body.error.message).toBe('This recovery code has already been used');
  });
});
