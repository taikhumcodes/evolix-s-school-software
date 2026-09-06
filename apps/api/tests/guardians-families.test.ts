import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Major Module 04 — Parent & Family Management API', () => {
  let adminToken: string;
  let tenantId: string;
  let schoolAId: string;
  let schoolBId: string;
  let testStudent1Id: string;
  let testStudent2Id: string;

  beforeAll(async () => {
    // 1. Authenticate as admin
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

    // Second school for isolation tests
    let secondSchool = await prisma.school.findFirst({
      where: { tenantId, id: { not: schoolAId } },
    });
    if (!secondSchool) {
      secondSchool = await prisma.school.create({
        data: {
          tenantId,
          name: 'Isolation Test School B',
          code: 'ISOB-01',
          isActive: true,
        },
      });
    }
    schoolBId = secondSchool.id;

    // Academic Year
    let ay = await prisma.academicYear.findFirst({
      where: { schoolId: schoolAId, isCurrent: true },
    });
    if (!ay) {
      ay = await prisma.academicYear.create({
        data: {
          schoolId: schoolAId,
          name: '2026-2027',
          startDate: new Date('2026-04-01'),
          endDate: new Date('2027-03-31'),
          isCurrent: true,
        },
      });
    }

    // Class
    const cls = await prisma.classMaster.upsert({
      where: {
        schoolId_code: {
          schoolId: schoolAId,
          code: 'CL-04',
        },
      },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        code: 'CL-04',
        name: 'Grade 4',
      },
    });

    // Create 2 Test Students in School A
    const st1 = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: ay.id,
        studentId: `STU-TEST-${Date.now()}-1`,
        admissionNumber: `ADM-TEST-${Date.now()}-1`,
        firstName: 'Aarav',
        lastName: 'Sharma',
        dateOfBirth: new Date('2015-05-15'),
        gender: 'MALE',
        status: 'ACTIVE',
      },
    });
    testStudent1Id = st1.id;

    const st2 = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: ay.id,
        studentId: `STU-TEST-${Date.now()}-2`,
        admissionNumber: `ADM-TEST-${Date.now()}-2`,
        firstName: 'Ananya',
        lastName: 'Sharma',
        dateOfBirth: new Date('2017-08-20'),
        gender: 'FEMALE',
        status: 'ACTIVE',
      },
    });
    testStudent2Id = st2.id;
  });

  // 1. Overview KPIs
  it('GET /api/v1/guardians/overview returns factual KPI cards', async () => {
    const res = await request(app)
      .get('/api/v1/guardians/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalGuardians');
    expect(res.body).toHaveProperty('totalFamilies');
    expect(res.body).toHaveProperty('portalAccessCount');
    expect(res.body).toHaveProperty('noPortalAccessCount');
    expect(res.body).toHaveProperty('duplicateCandidatesCount');
    expect(res.body).toHaveProperty('languageDistribution');
  });

  // 2. Direct Guardian Creation
  let createdGuardianAId: string;
  const uniquePhoneA = `98765${Math.floor(10000 + Math.random() * 90000)}`;
  const uniqueEmailA = `rajesh.${Date.now()}@example.com`;

  it('POST /api/v1/guardians creates canonical guardian', async () => {
    const res = await request(app)
      .post('/api/v1/guardians')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        firstName: 'Rajesh',
        lastName: 'Sharma',
        relationship: 'FATHER',
        phone: uniquePhoneA,
        email: uniqueEmailA,
        occupation: 'Engineer',
        city: 'Mumbai',
        preferredLanguage: 'hi',
        studentId: testStudent1Id,
        isPrimary: true,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.firstName).toBe('Rajesh');
    expect(res.body.normalizedPhone).toContain('98765');
    createdGuardianAId = res.body.id;

    // Verify student link was created
    const link = await prisma.studentGuardian.findFirst({
      where: { guardianId: createdGuardianAId, studentId: testStudent1Id },
    });
    expect(link).not.toBeNull();
    expect(link?.isPrimary).toBe(true);
  });

  // 3. Duplicate Warning Check
  it('POST /api/v1/guardians/check-duplicate warns on existing phone/email', async () => {
    const res = await request(app)
      .post('/api/v1/guardians/check-duplicate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        phone: uniquePhoneA,
        email: uniqueEmailA,
      });

    expect(res.status).toBe(200);
    expect(res.body.hasExactMatch).toBe(true);
    expect(res.body.hasPotentialMatch).toBe(true);
    expect(res.body.duplicates.length).toBeGreaterThan(0);
    expect(res.body.duplicates[0].id).toBe(createdGuardianAId);
  });

  // 4. Primary Guardian Rule Enforcement
  it('POST /api/v1/guardians/:id/students links student and enforces 1 primary guardian rule', async () => {
    // Create second guardian (Mother)
    const motherPhone = `98111${Math.floor(10000 + Math.random() * 90000)}`;
    const motherRes = await request(app)
      .post('/api/v1/guardians')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        firstName: 'Pooja',
        lastName: 'Sharma',
        relationship: 'MOTHER',
        phone: motherPhone,
      });
    const motherId = motherRes.body.id;

    // Link Mother as Primary to testStudent1Id
    const linkRes = await request(app)
      .post(`/api/v1/guardians/${motherId}/students`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: testStudent1Id,
        relationship: 'MOTHER',
        isPrimary: true,
      });
    expect(linkRes.status).toBe(201);

    // Verify Mother is now primary, and Father is no longer primary
    const fatherLink = await prisma.studentGuardian.findFirst({
      where: { guardianId: createdGuardianAId, studentId: testStudent1Id },
    });
    const motherLink = await prisma.studentGuardian.findFirst({
      where: { guardianId: motherId, studentId: testStudent1Id },
    });
    expect(motherLink?.isPrimary).toBe(true);
    expect(fatherLink?.isPrimary).toBe(false);
  });

  // 5. Merge Duplicate Guardians
  it('POST /api/v1/guardians/merge merges duplicate into canonical', async () => {
    // Create duplicate guardian linked to testStudent2Id
    const dupPhone = `98222${Math.floor(10000 + Math.random() * 90000)}`;
    const dupRes = await request(app)
      .post('/api/v1/guardians')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        firstName: 'Rajesh K',
        lastName: 'Sharma',
        relationship: 'FATHER',
        phone: dupPhone,
        address: '123 New Linking Road',
        studentId: testStudent2Id,
      });
    const duplicateId = dupRes.body.id;

    // Merge duplicate into createdGuardianAId
    const mergeRes = await request(app)
      .post('/api/v1/guardians/merge')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        canonicalGuardianId: createdGuardianAId,
        duplicateGuardianId: duplicateId,
        resolvedFields: {
          address: '123 New Linking Road',
        },
      });

    expect(mergeRes.status).toBe(200);
    expect(mergeRes.body.guardian.address).toBe('123 New Linking Road');

    // Verify duplicate is ARCHIVED
    const dupAfter = await prisma.guardian.findUnique({ where: { id: duplicateId } });
    expect(dupAfter?.status).toBe('ARCHIVED');
    expect(dupAfter?.archivedAt).not.toBeNull();

    // Verify testStudent2Id is now linked to canonical guardian
    const link2 = await prisma.studentGuardian.findFirst({
      where: { guardianId: createdGuardianAId, studentId: testStudent2Id },
    });
    expect(link2).not.toBeNull();
  });

  // 6. Parent Portal Access Provisioning
  let tempPasswordGenerated: string;
  let parentUsername: string;

  it('POST /api/v1/guardians/:id/portal-access generates secure user credentials', async () => {
    const res = await request(app)
      .post(`/api/v1/guardians/${createdGuardianAId}/portal-access`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('temporaryPassword');
    expect(res.body).toHaveProperty('username');
    tempPasswordGenerated = res.body.temporaryPassword;
    parentUsername = res.body.username;

    // Verify User in DB has mustChangePassword: true
    const user = await prisma.user.findUnique({ where: { email: parentUsername } });
    expect(user).not.toBeNull();
    expect(user?.mustChangePassword).toBe(true);
    expect(user?.isActive).toBe(true);

    // Verify guardian.userId is linked
    const guardian = await prisma.guardian.findUnique({ where: { id: createdGuardianAId } });
    expect(guardian?.userId).toBe(user?.id);
  });

  // 7. Child Isolation Test
  it('Parent login enforces child-only access isolation', async () => {
    // Login as the parent user
    const parentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: parentUsername,
        password: tempPasswordGenerated,
      });

    expect(parentLogin.status).toBe(200);
    const parentToken = parentLogin.body.access_token;
    
    // Check me
    const parentMe = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(parentMe.body.must_change_password).toBe(true);

    // Create an unrelated student in School A
    const ay = await prisma.academicYear.findFirst({ where: { schoolId: schoolAId } });
    const unrelatedStudent = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: ay!.id,
        studentId: `STU-UNRELATED-${Date.now()}`,
        admissionNumber: `ADM-UNRELATED-${Date.now()}`,
        firstName: 'Stranger',
        lastName: 'Child',
        gender: 'OTHER',
        dateOfBirth: new Date('2016-01-01'),
        status: 'ACTIVE',
      },
    });

    // Parent attempts to access unrelated student record directly
    const accessRes = await request(app)
      .get(`/api/v1/students/${unrelatedStudent.id}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-school-id', schoolAId);

    // Should be Forbidden 403 because parent does not have students.view permission
    expect([401, 403]).toContain(accessRes.status);
  });

  // 8. Document Security: Reject .exe / disallowed formats
  it('POST /api/v1/guardians/:id/documents rejects malicious files', async () => {
    const res = await request(app)
      .post(`/api/v1/guardians/${createdGuardianAId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .attach('file', Buffer.from('malicious binary'), 'virus.exe')
      .field('documentType', 'ID_PROOF');

    expect(res.status).toBe(422);
    expect(res.body.message).toContain('strictly prohibited');
  });

  // 9. Document Upload & Verification
  it('POST /api/v1/guardians/:id/documents uploads valid pdf and verifies it', async () => {
    const uploadRes = await request(app)
      .post(`/api/v1/guardians/${createdGuardianAId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .attach('file', Buffer.from('%PDF-1.4 valid test pdf'), 'aadhaar_card.pdf')
      .field('documentType', 'ID_PROOF');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.verificationStatus).toBe('PENDING');
    const docId = uploadRes.body.id;

    // Verify document
    const verifyRes = await request(app)
      .patch(`/api/v1/guardians/${createdGuardianAId}/documents/${docId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        status: 'VERIFIED',
        verificationNotes: 'Aadhaar verified against national portal',
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verificationStatus).toBe('VERIFIED');
    expect(verifyRes.body.verifiedBy).not.toBeNull();
  });

  // 10. Staff Notes with Confidential Flag
  it('POST /api/v1/guardians/:id/notes records staff notes and protects confidentiality', async () => {
    const noteRes = await request(app)
      .post(`/api/v1/guardians/${createdGuardianAId}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        category: 'FINANCIAL',
        content: 'Requested installment payment plan due to family emergency.',
        isConfidential: true,
      });

    expect(noteRes.status).toBe(201);
    expect(noteRes.body.isConfidential).toBe(true);

    // Admin with guardians.manage can see confidential notes in profile
    const profileRes = await request(app)
      .get(`/api/v1/guardians/${createdGuardianAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(profileRes.status).toBe(200);
    const notes = profileRes.body.notes;
    expect(notes.some((n: any) => n.content.includes('Requested installment'))).toBe(true);
  });

  // 11. Family Household Creation & Number Series
  let createdFamilyId: string;

  it('POST /api/v1/families creates household with atomic familyNumber', async () => {
    const res = await request(app)
      .post('/api/v1/families')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        familyName: 'Sharma Household',
        primaryGuardianId: createdGuardianAId,
        studentIds: [testStudent1Id, testStudent2Id],
        address: 'B-102 Sunshine Heights',
        city: 'Mumbai',
        state: 'Maharashtra',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.familyNumber).toMatch(/^FAM-\d{4}-\d{5}$/);
    expect(res.body.familyName).toBe('Sharma Household');
    createdFamilyId = res.body.id;

    // Verify Sibling Query via GET /api/v1/families/:id
    const familyDetail = await request(app)
      .get(`/api/v1/families/${createdFamilyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(familyDetail.status).toBe(200);
    expect(familyDetail.body.siblings.length).toBe(2);
    expect(familyDetail.body.siblings.map((s: any) => s.firstName)).toContain('Aarav');
    expect(familyDetail.body.siblings.map((s: any) => s.firstName)).toContain('Ananya');
  });

  // 12. Communication Preferences
  it('PATCH /api/v1/guardians/:id/preferences updates language and channels', async () => {
    const res = await request(app)
      .patch(`/api/v1/guardians/${createdGuardianAId}/preferences`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        preferredLanguage: 'hinglish',
        whatsappNotification: true,
        emergencyContactPreference: 'SMS',
      });

    expect(res.status).toBe(200);
    expect(res.body.preferredLanguage).toBe('hinglish');
    expect(res.body.whatsappNotification).toBe(true);
    expect(res.body.emergencyContactPreference).toBe('SMS');
  });

  // 13. CSV Export
  it('GET /api/v1/guardians/export streams valid CSV with headers', async () => {
    const res = await request(app)
      .get('/api/v1/guardians/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('First Name,Middle Name,Last Name');
    expect(res.text).toContain('Rajesh');
  });

  // 14. CSV Import Preview & Duplicate Flagging
  it('POST /api/v1/guardians/import/preview validates rows and catches duplicate phones', async () => {
    const csvContent = [
      'First Name,Last Name,Relationship,Phone,Email',
      `DuplicateRow,User,FATHER,${uniquePhoneA},dup@test.com`,
      'NewPerson,Patel,MOTHER,9899911223,new@test.com',
    ].join('\n');

    const res = await request(app)
      .post('/api/v1/guardians/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .attach('file', Buffer.from(csvContent), 'guardians.csv');

    expect(res.status).toBe(200);
    expect(res.body.totalRows).toBe(2);
    expect(res.body.warningRows).toBeGreaterThan(0);
    expect(res.body.preview[0].warnings.length).toBeGreaterThan(0);
  });

  // 15. School & Tenant Isolation
  it('Enforces strict school isolation (School B cannot view School A guardians)', async () => {
    const res = await request(app)
      .get(`/api/v1/guardians/${createdGuardianAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolBId);

    expect(res.status).toBe(404);
  });
});
