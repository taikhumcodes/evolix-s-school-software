import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

let adminToken: string;
let schoolAId: string;
let schoolBId: string;

describe('Major Module 02 — Master Data API Integration', () => {
  beforeAll(async () => {
    // Authenticate as default superadmin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@evolix.local', password: 'Password123!' });

    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.access_token;

    // Create dedicated fresh schools for clean master data testing
    const schoolResA = await request(app)
      .post('/api/v1/schools')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: `MD-A-${Date.now()}`, name: 'Master Data School A' });
    expect(schoolResA.status).toBe(201);
    schoolAId = schoolResA.body.id;

    const schoolResB = await request(app)
      .post('/api/v1/schools')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: `MD-B-${Date.now()}`, name: 'Master Data School B' });
    expect(schoolResB.status).toBe(201);
    schoolBId = schoolResB.body.id;
  });

  // 1. Classes CRUD & Ordering
  it('should create and list classes ordered by displayOrder', async () => {
    const res1 = await request(app)
      .post('/api/v1/master-data/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: 'Playgroup Alpha', code: 'PG-A', displayOrder: 1, academicLevel: 'Pre-Primary' });
    expect(res1.status).toBe(201);
    expect(res1.body.name).toBe('Playgroup Alpha');

    const res2 = await request(app)
      .post('/api/v1/master-data/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: 'UKG Beta', code: 'UKG-B', displayOrder: 3, academicLevel: 'Pre-Primary' });
    expect(res2.status).toBe(201);

    const listRes = await request(app)
      .get('/api/v1/master-data/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId });
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);

    const pg = listRes.body.find((c: any) => c.code === 'PG-A');
    const ukg = listRes.body.find((c: any) => c.code === 'UKG-B');
    expect(pg).toBeDefined();
    expect(ukg).toBeDefined();
    expect(pg.displayOrder).toBeLessThan(ukg.displayOrder);
  });

  // 2. Case-Insensitive Duplicate Prevention
  it('should reject duplicate class codes or names within the same school', async () => {
    const dupRes = await request(app)
      .post('/api/v1/master-data/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: 'Playgroup Alpha', code: 'pg-a-diff' });
    expect(dupRes.status).toBe(409);

    const dupCodeRes = await request(app)
      .post('/api/v1/master-data/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: 'Different Name', code: 'pg-a' });
    expect(dupCodeRes.status).toBe(409);
  });

  // 3. Sections & ClassSection Mapping
  it('should create section and assign it to a class', async () => {
    const secRes = await request(app)
      .post('/api/v1/master-data/sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: 'Rose', code: 'SEC-ROSE', displayOrder: 1 });
    expect(secRes.status).toBe(201);
    const sectionId = secRes.body.id;

    const classRes = await request(app)
      .get('/api/v1/master-data/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId });
    const classId = classRes.body[0].id;

    const mapRes = await request(app)
      .post('/api/v1/master-data/class-sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ classId, sectionId, capacity: 35 });
    expect(mapRes.status).toBe(201);
    expect(mapRes.body.capacity).toBe(35);

    // Duplicate mapping prevention
    const dupMap = await request(app)
      .post('/api/v1/master-data/class-sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ classId, sectionId });
    expect(dupMap.status).toBe(409);
  });

  // 4. Subjects & ClassSubject Mapping
  it('should create subject and map it to a class', async () => {
    const subRes = await request(app)
      .post('/api/v1/master-data/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: 'Robotics', code: 'ROBO-01', type: 'PRACTICAL', creditHours: 2 });
    expect(subRes.status).toBe(201);
    const subjectId = subRes.body.id;

    const classRes = await request(app)
      .get('/api/v1/master-data/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId });
    const classId = classRes.body[0].id;

    const mapRes = await request(app)
      .post('/api/v1/master-data/class-subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ classId, subjectId, isElective: true });
    expect(mapRes.status).toBe(201);
    expect(mapRes.body.isElective).toBe(true);
  });

  // 5. Demographics (Religion, Category, Caste) & Archiving
  it('should manage categories and castes with soft-archiving', async () => {
    const catRes = await request(app)
      .post('/api/v1/master-data/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: `Special Category ${Date.now()}` });
    expect(catRes.status).toBe(201);
    const categoryId = catRes.body.id;

    const casteRes = await request(app)
      .post('/api/v1/master-data/castes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: `Sub-Caste ${Date.now()}`, categoryId });
    expect(casteRes.status).toBe(201);
    const casteId = casteRes.body.id;

    // Archive caste
    const archiveRes = await request(app)
      .delete(`/api/v1/master-data/castes/${casteId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.isActive).toBe(false);
  });

  // 6. Financial Masters: Fee Heads & Expense Heads
  it('should create fee heads and enforce uniqueness per school', async () => {
    const uniqueCode = `FEE-${Date.now()}`;
    const feeRes = await request(app)
      .post('/api/v1/master-data/fee-heads')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: 'Laboratory Fee', code: uniqueCode, isRefundable: false });
    expect(feeRes.status).toBe(201);

    const dupFee = await request(app)
      .post('/api/v1/master-data/fee-heads')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: 'Different Lab Fee', code: uniqueCode });
    expect(dupFee.status).toBe(409);
  });

  // 7. HR: Departments & Designations
  it('should create department and designation', async () => {
    const depCode = `DEP-${Date.now()}`;
    const depRes = await request(app)
      .post('/api/v1/master-data/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: 'Sports Department', code: depCode });
    expect(depRes.status).toBe(201);

    const desCode = `DES-${Date.now()}`;
    const desRes = await request(app)
      .post('/api/v1/master-data/designations')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: 'Physical Education Coach', code: desCode, departmentId: depRes.body.id });
    expect(desRes.status).toBe(201);
    expect(desRes.body.departmentId).toBe(depRes.body.id);
  });

  // 8. Multi-Tenancy / School Isolation
  it('should strictly isolate school master data records', async () => {
    // Create class in School A
    const code = `ISO-${Date.now()}`;
    const classARes = await request(app)
      .post('/api/v1/master-data/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolAId })
      .send({ name: 'Isolation Class A', code });
    expect(classARes.status).toBe(201);

    // Verify School B cannot see School A's class
    const listSchoolB = await request(app)
      .get('/api/v1/master-data/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolBId });
    expect(listSchoolB.status).toBe(200);
    const found = listSchoolB.body.find((c: any) => c.code === code);
    expect(found).toBeUndefined();

    // Verify School B can use the SAME code without conflict
    const classBRes = await request(app)
      .post('/api/v1/master-data/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolBId })
      .send({ name: 'Isolation Class B', code });
    expect(classBRes.status).toBe(201);
  });
});
