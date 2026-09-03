import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

describe('School Context & Persistence Verification (Scenarios A - I)', () => {
  let adminToken: string;
  let adminUserId: string;
  let tenantId: string;
  let schoolId: string;

  let tenantBToken: string;
  let tenantBId: string;
  let schoolBId: string;

  beforeAll(async () => {
    // 1. Authenticate Admin (Tenant A)
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@evolix.local', password: 'Password123!' });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.access_token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(meRes.status).toBe(200);
    adminUserId = meRes.body.id;
    tenantId = meRes.body.tenant_id;
    schoolId = meRes.body.selected_school_id || meRes.body.schools[0].id;

    // 2. Setup isolated Tenant B
    tenantBId = '00000000-0000-0000-0000-000000000020';
    schoolBId = '00000000-0000-0000-0000-000000000021';
    await prisma.tenant.upsert({
      where: { id: tenantBId },
      update: {},
      create: {
        id: tenantBId,
        name: 'Tenant B School Trust',
        domain: 'tenantb.local',
      },
    });

    await prisma.school.upsert({
      where: { id: schoolBId },
      update: {},
      create: {
        id: schoolBId,
        tenantId: tenantBId,
        code: 'SCHB01',
        name: 'School B Academy',
      },
    });

    const hashB = await bcrypt.hash('Password123!', 10);
    const userB = await prisma.user.upsert({
      where: { email: 'admin@tenantb.local' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000022',
        tenantId: tenantBId,
        email: 'admin@tenantb.local',
        hashedPassword: hashB,
        firstName: 'TenantB',
        lastName: 'Admin',
      },
    });

    await prisma.userSchool.upsert({
      where: {
        userId_schoolId: {
          userId: userB.id,
          schoolId: schoolBId,
        },
      },
      update: {},
      create: {
        userId: userB.id,
        schoolId: schoolBId,
      },
    });

    // Create role for user B
    let roleB = await prisma.role.findFirst({
      where: {
        tenantId: tenantBId,
        name: 'SchoolAdmin',
      },
    });
    if (!roleB) {
      roleB = await prisma.role.create({
        data: {
          tenantId: tenantBId,
          name: 'SchoolAdmin',
          isSystem: false,
        },
      });
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: userB.id,
          roleId: roleB.id,
        },
      },
      update: {},
      create: {
        userId: userB.id,
        roleId: roleB.id,
      },
    });

    // Add permissions to roleB
    const permissions = await prisma.permission.findMany({
      where: {
        code: {
          in: ['settings.manage', 'academic.manage'],
        },
      },
    });
    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roleB.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: roleB.id,
          permissionId: perm.id,
        },
      });
    }

    const loginBRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@tenantb.local', password: 'Password123!' });
    expect(loginBRes.status).toBe(200);
    tenantBToken = loginBRes.body.access_token;
  });

  // Scenario A: Authenticated user context
  it('Scenario A: /auth/me returns valid tenant, schools, permissions and matches DB', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tenant_id).toBe(tenantId);
    expect(res.body.selected_school_id).toBe(schoolId);
    expect(res.body.schools.length).toBeGreaterThan(0);
    expect(res.body.schools.some((s: any) => s.id === schoolId)).toBe(true);
    expect(res.body.permissions).toContain('settings.manage');
    expect(res.body.permissions).toContain('academic.manage');

    // Verify against DB reality
    const dbSchool = await prisma.school.findUnique({ where: { id: schoolId } });
    expect(dbSchool).toBeDefined();
    expect(dbSchool?.tenantId).toBe(tenantId);
  });

  // Scenario B: Academic Year lifecycle
  it('Scenario B: Academic Year lifecycle with date validation and single current year exclusivity', async () => {
    // 1. Create Academic Year
    const ayName1 = `AY-T1-${Date.now()}`;
    const createRes1 = await request(app)
      .post('/api/v1/academic-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        school_id: schoolId,
        name: ayName1,
        start_date: '2026-04-01',
        end_date: '2027-03-31',
        is_current: true,
      });

    expect(createRes1.status).toBe(200);
    expect(createRes1.body.name).toBe(ayName1);
    expect(createRes1.body.is_current).toBe(true);
    const ay1Id = createRes1.body.id;

    // 2. Create second Academic Year set to current = true
    const ayName2 = `AY-T2-${Date.now()}`;
    const createRes2 = await request(app)
      .post('/api/v1/academic-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        school_id: schoolId,
        name: ayName2,
        start_date: '2027-04-01',
        end_date: '2028-03-31',
        is_current: true,
      });

    expect(createRes2.status).toBe(200);
    expect(createRes2.body.is_current).toBe(true);
    const ay2Id = createRes2.body.id;

    // 3. Verify only one is current
    const listRes = await request(app)
      .get(`/api/v1/academic-years?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    const updatedAy1 = listRes.body.find((y: any) => y.id === ay1Id);
    const updatedAy2 = listRes.body.find((y: any) => y.id === ay2Id);
    expect(updatedAy1.is_current).toBe(false); // deactivated transactionally
    expect(updatedAy2.is_current).toBe(true);

    // 4. Update dates and verify persistence
    const updateRes = await request(app)
      .patch(`/api/v1/academic-years/${ay2Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        start_date: '2027-05-01',
        end_date: '2028-04-30',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.start_date).toBe('2027-05-01');
    expect(updateRes.body.end_date).toBe('2028-04-30');
  });

  // Scenario C: School Profile persistence
  it('Scenario C: School profile updates persist to PostgreSQL and return identical state on reload', async () => {
    // 1. Get current config
    const getRes = await request(app)
      .get(`/api/v1/configuration/school?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    const currentVersion = getRes.body.version;

    // 2. Patch school profile
    const testPhone = `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const testWebsite = `https://school-${Date.now()}.example.org`;

    const patchRes = await request(app)
      .patch(`/api/v1/configuration/school?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: currentVersion,
        values: {
          phone: testPhone,
          website: testWebsite,
          board: 'CBSE',
          affiliation_number: 'AFF-998877',
        },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.version).toBe(currentVersion + 1);

    // 3. Reload config and verify identical updated state
    const reloadRes = await request(app)
      .get(`/api/v1/configuration/school?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reloadRes.status).toBe(200);
    expect(reloadRes.body.version).toBe(currentVersion + 1);
    expect(reloadRes.body.values.primary_phone).toBe(testPhone);
    expect(reloadRes.body.values.website).toBe(testWebsite);
    expect(reloadRes.body.values.board).toBe('CBSE');
    expect(reloadRes.body.values.affiliation_number).toBe('AFF-998877');
  });

  // Scenario D: Attendance Configuration persistence
  it('Scenario D: Attendance configuration updates lock hours, geofence, override rules and persists', async () => {
    const getRes = await request(app)
      .get(`/api/v1/configuration/attendance?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    const version = getRes.body.version;

    const patchRes = await request(app)
      .patch(`/api/v1/configuration/attendance?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version,
        values: {
          attendance_lock_enabled: true,
          attendance_lock_hours: 36,
          attendance_correction_allowed: true,
          attendance_principal_override: true,
          teacher_geofence_enabled: true,
          teacher_geofence_radius_meters: 175,
        },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.version).toBe(version + 1);

    // Reload and verify
    const reloadRes = await request(app)
      .get(`/api/v1/configuration/attendance?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reloadRes.status).toBe(200);
    expect(reloadRes.body.values.attendance_lock_enabled).toBe(true);
    expect(reloadRes.body.values.attendance_lock_hours).toBe(36);
    expect(reloadRes.body.values.attendance_correction_allowed).toBe(true);
    expect(reloadRes.body.values.attendance_principal_override).toBe(true);
    expect(reloadRes.body.values.teacher_geofence_enabled).toBe(true);
    expect(reloadRes.body.values.teacher_geofence_radius_meters).toBe(175);
  });

  // Scenario E: Number Series visibility & preview
  it('Scenario E: Number series visibility and preview without incrementing DB current_value', async () => {
    const listRes = await request(app)
      .get(`/api/v1/configuration/number-series?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThan(0);

    const series = listRes.body[0];
    const initialVal = series.current_value;

    // Preview
    const previewRes = await request(app)
      .get(`/api/v1/configuration/number-series/${series.id}/preview?school_id=${schoolId}&prefix=${encodeURIComponent(series.prefix || '')}&padding=${series.padding}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.preview).toBeDefined();

    // Verify DB current_value is unchanged
    const dbSeries = await prisma.numberSeries.findUnique({ where: { id: series.id } });
    expect(dbSeries?.currentValue).toBe(initialVal);
  });

  // Scenario F: Branding upload success
  it('Scenario F: Valid PNG logo upload succeeds, saves storage reference, and updates branding', async () => {
    const validPngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);

    const uploadRes = await request(app)
      .post(`/api/v1/configuration/branding/upload?school_id=${schoolId}&asset_type=logo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', validPngBytes, 'school-logo.png');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.values.logo_file_id).toBeDefined();
    expect(uploadRes.body.values.logo_storage_key).toContain(`schools/${schoolId}/branding/logo`);
  });

  // Scenario G: Branding upload invalid file rejection
  it('Scenario G: Branding upload rejects fake png, executable, and spoofed files with 422', async () => {
    // 1. Text file
    const fakeTxt = Buffer.from('PLAIN TEXT CONTENT');
    const resTxt = await request(app)
      .post(`/api/v1/configuration/branding/upload?school_id=${schoolId}&asset_type=logo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', fakeTxt, 'fake.txt');

    expect(resTxt.status).toBe(422);
    expect(resTxt.body.error.code).toBe('VALIDATION_ERROR');

    // 2. Text file spoofed as .png
    const spoofedPng = Buffer.from('NOT_REAL_PNG_DATA');
    const resSpoofed = await request(app)
      .post(`/api/v1/configuration/branding/upload?school_id=${schoolId}&asset_type=logo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', spoofedPng, 'fake.png');

    expect(resSpoofed.status).toBe(422);
    expect(resSpoofed.body.error.code).toBe('VALIDATION_ERROR');

    // 3. Executable
    const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
    const resExe = await request(app)
      .post(`/api/v1/configuration/branding/upload?school_id=${schoolId}&asset_type=logo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', exeBuffer, 'program.exe');

    expect(resExe.status).toBe(422);
    expect(resExe.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Scenario H: Cross-tenant / Cross-school isolation
  it('Scenario H: Cross-tenant access is strictly forbidden or not found', async () => {
    // Tenant B attempts to read School A config
    const res = await request(app)
      .get(`/api/v1/configuration/school?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${tenantBToken}`);

    // School A does not belong to Tenant B -> 404
    expect(res.status).toBe(404);

    // Tenant B attempts to create Academic Year in School A
    const ayRes = await request(app)
      .post('/api/v1/academic-years')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .send({
        school_id: schoolId,
        name: 'Hacked AY',
        start_date: '2026-04-01',
        end_date: '2027-03-31',
      });

    expect(ayRes.status).toBe(404);
  });

  // Scenario I: Concurrency conflict (Optimistic locking)
  it('Scenario I: Concurrency conflict returns 409 when client submits stale version', async () => {
    // 1. Client A loads current version
    const getRes = await request(app)
      .get(`/api/v1/configuration/school?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const v1 = getRes.body.version;

    // 2. Client B updates to v2
    const updateB = await request(app)
      .patch(`/api/v1/configuration/school?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: v1,
        values: { legal_name: 'Greenwood High Trust Updated' },
      });
    expect(updateB.status).toBe(200);
    const v2 = updateB.body.version;
    expect(v2).toBe(v1 + 1);

    // 3. Client A attempts update with stale v1 -> 409 Conflict
    const staleUpdate = await request(app)
      .patch(`/api/v1/configuration/school?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: v1,
        values: { legal_name: 'Conflicting Name' },
      });

    expect(staleUpdate.status).toBe(409);
    expect(staleUpdate.body.error.code).toBe('CONFLICT');

    // 4. Client A reloads and updates with v2 -> success v3
    const freshUpdate = await request(app)
      .patch(`/api/v1/configuration/school?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: v2,
        values: { legal_name: 'Greenwood High School Trust' },
      });

    expect(freshUpdate.status).toBe(200);
    expect(freshUpdate.body.version).toBe(v2 + 1);
  });
});
