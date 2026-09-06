import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Global ERP Deep Search API', () => {
  let adminToken: string;
  let tenantId: string;
  let schoolAId: string;
  let schoolBId: string;

  beforeAll(async () => {
    // 1. Authenticate as default admin
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@evolix.local',
        password: 'Password123!',
      });
    adminToken = login.body.access_token;

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    tenantId = me.body.tenant_id;
    schoolAId = me.body.schools[0]?.id;

    // 2. Ensure test classes exist in school A
    await prisma.classMaster.upsert({
      where: {
        schoolId_code: {
          schoolId: schoolAId,
          code: 'G-1',
        },
      },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        name: 'Grade 1',
        code: 'G-1',
        academicLevel: 'Primary',
        displayOrder: 1,
      },
    });

    await prisma.classMaster.upsert({
      where: {
        schoolId_code: {
          schoolId: schoolAId,
          code: 'G-9',
        },
      },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        name: 'Grade 9',
        code: 'G-9',
        academicLevel: 'Middle',
        displayOrder: 9,
      },
    });

    await prisma.classMaster.upsert({
      where: {
        schoolId_code: {
          schoolId: schoolAId,
          code: 'G-10',
        },
      },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        name: 'Grade 10',
        code: 'G-10',
        academicLevel: 'Secondary',
        displayOrder: 10,
      },
    });

    // 3. Create a second school in database to verify isolation
    const schoolB = await prisma.school.upsert({
      where: { id: '00000000-0000-0000-0000-000000000099' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000099',
        tenantId,
        code: 'ISOLATED_SCH',
        name: 'Isolated School B',
      },
    });
    schoolBId = schoolB.id;

    await prisma.classMaster.upsert({
      where: {
        schoolId_code: {
          schoolId: schoolBId,
          code: 'G9-ISOLATED',
        },
      },
      update: {},
      create: {
        tenantId,
        schoolId: schoolBId,
        name: 'Grade 9 Secret',
        code: 'G9-ISOLATED',
        displayOrder: 9,
      },
    });
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/search?q=Grade');
    expect(res.status).toBe(401);
  });

  it('returns empty results when query is empty', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  it('specifically narrows down to Grade 9 when searching "Grade 9" without returning Grade 1 or Grade 10', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=Grade%209')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);

    const classMatches = res.body.results.filter((r: any) => r.type === 'class');
    const grade9 = classMatches.find((r: any) => r.title === 'Grade 9');
    expect(grade9).toBeDefined();

    const grade1 = classMatches.find((r: any) => r.title === 'Grade 1');
    const grade10 = classMatches.find((r: any) => r.title === 'Grade 10');
    expect(grade1).toBeUndefined();
    expect(grade10).toBeUndefined();
  });

  it('matches Grade 9 when searching "Class 9" via bidirectional educational alias', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=Class%209')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    const grade9 = res.body.results.find((r: any) => r.title === 'Grade 9');
    expect(grade9).toBeDefined();
  });

  it('matches Grade 9 when searching compact format "grade9" or "grade-9"', async () => {
    const res1 = await request(app)
      .get('/api/v1/search?q=grade9')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(res1.status).toBe(200);
    expect(res1.body.results.some((r: any) => r.title === 'Grade 9')).toBe(true);

    const res2 = await request(app)
      .get('/api/v1/search?q=grade-9')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(res2.status).toBe(200);
    expect(res2.body.results.some((r: any) => r.title === 'Grade 9')).toBe(true);
  });

  it('enforces active school boundary: school A search never returns school B records', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=Secret')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    const isolatedMatch = res.body.results.find((r: any) => r.title === 'Grade 9 Secret');
    expect(isolatedMatch).toBeUndefined();
  });
});
