import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

describe('Multi-Tenant Isolation', () => {
  let tenantAToken: string;
  let tenantBSchoolId: string;
  let tenantBUserId: string;

  beforeAll(async () => {
    // 1. Get Tenant A access token
    const loginA = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@evolix.local',
        password: 'Password123!',
      });
    tenantAToken = loginA.body.access_token;

    // 2. Setup isolated Tenant B in database
    const tenantB = await prisma.tenant.upsert({
      where: { id: '00000000-0000-0000-0000-000000000010' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000010',
        name: 'Apex Academy Trust',
        domain: 'apex.local',
      },
    });

    const schoolB = await prisma.school.upsert({
      where: { id: '00000000-0000-0000-0000-000000000011' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000011',
        tenantId: tenantB.id,
        code: 'APEX01',
        name: 'Apex International',
      },
    });
    tenantBSchoolId = schoolB.id;

    const hash = await bcrypt.hash('Password123!', 10);
    const userB = await prisma.user.upsert({
      where: { email: 'user@apex.local' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000012',
        tenantId: tenantB.id,
        email: 'user@apex.local',
        hashedPassword: hash,
        firstName: 'Apex',
        lastName: 'User',
      },
    });
    tenantBUserId = userB.id;
  });

  it("should prevent Tenant A from accessing Tenant B's school", async () => {
    const res = await request(app)
      .get(`/api/v1/schools/${tenantBSchoolId}`)
      .set('Authorization', `Bearer ${tenantAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should not leak Tenant B users when Tenant A lists users', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${tenantAToken}`);

    expect(res.status).toBe(200);
    const userIds = res.body.items.map((u: any) => u.id);
    expect(userIds).not.toContain(tenantBUserId);
  });

  it("should prevent Tenant A from loading configuration for Tenant B's school", async () => {
    const res = await request(app)
      .get(`/api/v1/configuration?school_id=${tenantBSchoolId}`)
      .set('Authorization', `Bearer ${tenantAToken}`);

    // Since school does not belong to Tenant A, it returns 404
    expect(res.status).toBe(404);
  });
});
