import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Authentication Flow', () => {
  beforeEach(async () => {
    // Reset admin user lockout / failed attempts
    await prisma.user.updateMany({
      where: { email: 'admin@evolix.local' },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  });

  it('should successfully login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@evolix.local',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.token_type).toBe('bearer');
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();

    // Verify session was created
    const session = await prisma.userSession.findFirst({
      where: {
        user: { email: 'admin@evolix.local' },
        isRevoked: false,
      },
    });
    expect(session).not.toBeNull();
  });

  it('should reject invalid password and increment failed attempts', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@evolix.local',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');

    const user = await prisma.user.findUnique({
      where: { email: 'admin@evolix.local' },
    });
    expect(user?.failedLoginAttempts).toBeGreaterThan(0);
  });

  it('should rotate refresh tokens and detect token reuse', async () => {
    // 1. Login to obtain tokens
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@evolix.local',
        password: 'Password123!',
      });
    const { refresh_token } = loginRes.body;

    // 2. Perform refresh
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.access_token).toBeDefined();
    expect(refreshRes.body.refresh_token).toBeDefined();
    expect(refreshRes.body.refresh_token).not.toBe(refresh_token);

    const newRefreshToken = refreshRes.body.refresh_token;

    // 3. Attempt to reuse old refresh token -> should be rejected!
    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token });

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.message).toContain('Token reuse detected');

    // 4. Verify descendant token was revoked as well due to replay detection
    const descendantRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: newRefreshToken });

    expect(descendantRes.status).toBe(401);
  });

  it('should logout and revoke refresh token and session', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@evolix.local',
        password: 'Password123!',
      });
    const { refresh_token } = loginRes.body;

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refresh_token });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.status).toBe('ok');

    // Token should now be rejected for refresh
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token });

    expect(refreshRes.status).toBe(401);
  });
});
