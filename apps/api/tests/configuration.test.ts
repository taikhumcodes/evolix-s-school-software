import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Configuration & Optimistic Concurrency', () => {
  let adminToken: string;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@evolix.local',
        password: 'Password123!',
      });
    adminToken = login.body.access_token;
  });

  it('should return configuration overview and effective configuration', async () => {
    const overviewRes = await request(app)
      .get('/api/v1/configuration')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.categories).toBeDefined();
    expect(overviewRes.body.school).toBeDefined();

    const effectiveRes = await request(app)
      .get('/api/v1/configuration/effective')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(effectiveRes.status).toBe(200);
    expect(effectiveRes.body.values).toBeDefined();
    expect(effectiveRes.body.version).toBeDefined();
  });

  it('should enforce optimistic concurrency version checks on configuration patches', async () => {
    const currentConfig = await request(app)
      .get('/api/v1/configuration/effective')
      .set('Authorization', `Bearer ${adminToken}`);

    const currentVersion = currentConfig.body.version;

    // 1. Patch with matching version -> succeeds and increments version
    const patchRes = await request(app)
      .patch('/api/v1/configuration/academic')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: currentVersion,
        values: {
          term_naming: 'SEMESTER',
        },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.version).toBe(currentVersion + 1);

    // 2. Patch with stale version -> returns 409 Conflict
    const staleRes = await request(app)
      .patch('/api/v1/configuration/academic')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: currentVersion, // Stale!
        values: {
          term_naming: 'TRIMESTER',
        },
      });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error.code).toBe('CONFLICT');
  });

  it('should validate branding upload magic bytes and reject invalid files', async () => {
    // 1. Upload invalid file content
    const invalidBuffer = Buffer.from('NOT_AN_IMAGE');
    const failRes = await request(app)
      .post('/api/v1/configuration/branding/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', invalidBuffer, 'fake.png');

    expect(failRes.status).toBe(422);
    expect(failRes.body.error.message).toContain('Unsupported or unsafe branding file');

    // 2. Upload valid PNG magic bytes
    const validPngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);

    const successRes = await request(app)
      .post('/api/v1/configuration/branding/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', validPngBytes, 'logo.png');

    expect(successRes.status).toBe(200);
    expect(successRes.body.values.logo_file_id).toBeDefined();
  });
});
