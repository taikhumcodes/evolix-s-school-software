import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Branding Configuration Save & Lifecycle Verification', () => {
  let adminToken: string;
  let schoolId: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@evolix.local', password: 'Password123!' });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.access_token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(meRes.status).toBe(200);
    schoolId = meRes.body.selected_school_id || meRes.body.schools[0].id;
  });

  // 1. Upload valid image returns storage reference
  it('1. upload valid image returns storage reference', async () => {
    const validPngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);

    const uploadRes = await request(app)
      .post(`/api/v1/configuration/branding/upload?school_id=${schoolId}&asset_type=compact_logo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', validPngBytes, 'compact-logo.png');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.values.compact_logo_file_id).toBeDefined();
    expect(uploadRes.body.version).toBeGreaterThan(0);
  });

  // 2 & 3. Branding configuration can persist uploaded reference & save then GET returns same
  it('2 & 3. Branding configuration can persist uploaded reference and GET returns identical state', async () => {
    // 1. Load current branding
    const getRes = await request(app)
      .get(`/api/v1/configuration/branding?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    const currentVersion = getRes.body.version;

    // 2. Save settings including uploaded reference, colors, letterhead, and empty footer
    const patchRes = await request(app)
      .patch(`/api/v1/configuration/branding?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: currentVersion,
        values: {
          ...getRes.body.values,
          primary_print_color: '#4A612B',
          accent_print_color: '#7DA447',
          letterhead_text: 'GREENWOOD HIGH SCHOOL - CBSE ACCREDITED',
          footer_text: '', // empty optional field
        },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.version).toBe(currentVersion + 1);
    expect(patchRes.body.values.primary_print_color).toBe('#4A612B');
    expect(patchRes.body.values.accent_print_color).toBe('#7DA447');
    expect(patchRes.body.values.letterhead_text).toBe('GREENWOOD HIGH SCHOOL - CBSE ACCREDITED');
    expect(patchRes.body.values.footer_text).toBeNull();

    // 3. Reload from GET and verify exact persistence in PostgreSQL
    const reloadRes = await request(app)
      .get(`/api/v1/configuration/branding?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reloadRes.status).toBe(200);
    expect(reloadRes.body.version).toBe(currentVersion + 1);
    expect(reloadRes.body.values.primary_print_color).toBe('#4A612B');
    expect(reloadRes.body.values.accent_print_color).toBe('#7DA447');
    expect(reloadRes.body.values.letterhead_text).toBe('GREENWOOD HIGH SCHOOL - CBSE ACCREDITED');
    expect(reloadRes.body.values.footer_text).toBeNull();
  });

  // 4. Optimistic concurrency still rejects stale versions
  it('4. optimistic concurrency still rejects stale versions', async () => {
    const getRes = await request(app)
      .get(`/api/v1/configuration/branding?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const v = getRes.body.version;

    // First update succeeds to v + 1
    const patch1 = await request(app)
      .patch(`/api/v1/configuration/branding?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: v,
        values: { primary_print_color: '#335511' },
      });
    expect(patch1.status).toBe(200);
    expect(patch1.body.version).toBe(v + 1);

    // Stale update using old version v fails with 409
    const patchStale = await request(app)
      .patch(`/api/v1/configuration/branding?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: v,
        values: { primary_print_color: '#990000' },
      });

    expect(patchStale.status).toBe(409);
    expect(patchStale.body.error.code).toBe('CONFLICT');
  });

  // 5. Replace logo works
  it('5. replace logo works and updates reference', async () => {
    const getBefore = await request(app)
      .get(`/api/v1/configuration/branding?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const oldLogoId = getBefore.body.values.logo_file_id;

    // Upload new logo
    const newPngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01,
    ]);

    const uploadRes = await request(app)
      .post(`/api/v1/configuration/branding/upload?school_id=${schoolId}&asset_type=logo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', newPngBytes, 'replaced-logo.png');

    expect(uploadRes.status).toBe(200);
    const newLogoId = uploadRes.body.values.logo_file_id;
    expect(newLogoId).toBeDefined();
    expect(newLogoId).not.toBe(oldLogoId);

    // Save with the new logo reference
    const saveRes = await request(app)
      .patch(`/api/v1/configuration/branding?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: uploadRes.body.version,
        values: uploadRes.body.values,
      });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.values.logo_file_id).toBe(newLogoId);

    // Verify on reload
    const reloadRes = await request(app)
      .get(`/api/v1/configuration/branding?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reloadRes.body.values.logo_file_id).toBe(newLogoId);
  });

  // 6. Remove logo works
  it('6. remove logo works and clears reference', async () => {
    // Delete compact_logo asset
    const deleteRes = await request(app)
      .delete(`/api/v1/configuration/branding/asset/compact_logo?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.values.compact_logo_file_id).toBeNull();

    // Save configuration with null compact_logo_file_id
    const saveRes = await request(app)
      .patch(`/api/v1/configuration/branding?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: deleteRes.body.version,
        values: deleteRes.body.values,
      });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.values.compact_logo_file_id).toBeNull();

    // Verify on reload
    const reloadRes = await request(app)
      .get(`/api/v1/configuration/branding?school_id=${schoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reloadRes.body.values.compact_logo_file_id).toBeNull();
  });

  // 7. Public asset retrieval for HTML <img> tag (no Authorization header required)
  it('7. public asset retrieval returns image without Authorization header for HTML img tags', async () => {
    // Re-upload logo to test public serving
    const validPngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    await request(app)
      .post(`/api/v1/configuration/branding/upload?school_id=${schoolId}&asset_type=logo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', validPngBytes, 'public-logo.png');

    // Request WITHOUT Authorization header (like a browser <img src="..." /> tag)
    const imgRes = await request(app)
      .get(`/api/v1/configuration/branding/asset/logo?school_id=${schoolId}`);

    expect(imgRes.status).toBe(200);
    expect(imgRes.headers['content-type']).toContain('image/png');
    expect(imgRes.body).toBeDefined();
  });
});
