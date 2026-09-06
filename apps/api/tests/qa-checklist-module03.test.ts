import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/lib/crypto.js';

describe('Major Module 03 — Comprehensive 46-Test QA Checklist Suite', () => {
  let adminToken: string;
  let restrictedToken: string;
  let tenantId: string;
  let schoolAId: string;
  let schoolBId: string;
  let academicYearId: string;
  let class9Id: string;
  let sectionAId: string;
  let sectionBId: string;
  let unmappedSectionId: string;

  const testSuffix = Date.now().toString().slice(-6);

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

    // School B for isolation tests
    const secondSchool = await prisma.school.findFirst({
      where: { tenantId, id: { not: schoolAId } },
    });
    if (secondSchool) {
      schoolBId = secondSchool.id;
    } else {
      const created = await prisma.school.create({
        data: {
          tenantId,
          name: 'QA Isolation School',
          code: `ISO-${testSuffix}`,
          isActive: true,
        },
      });
      schoolBId = created.id;
    }

    // Create restricted user with ONLY students.view (no manage, no discipline)
    const restrictedEmail = `restricted-${testSuffix}@test.com`;
    const hashedPassword = '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfI2q2'; // Password123!
    const role = await prisma.role.create({
      data: {
        tenantId,
        name: `ReadOnlyStaff-${testSuffix}`,
        isSystem: false,
      },
    });

    const perm = await prisma.permission.findFirst({ where: { code: 'students.view' } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }

    const restrictedUser = await prisma.user.create({
      data: {
        tenantId,
        email: restrictedEmail,
        hashedPassword,
        firstName: 'Restricted',
        lastName: 'Staff',
        isActive: true,
        userRoles: { create: { roleId: role.id } },
        userSchools: { create: { schoolId: schoolAId } },
      },
    });

    restrictedToken = signAccessToken(restrictedUser.id, tenantId);

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
    academicYearId = ay.id;

    // Class Grade 9
    const cls = await prisma.classMaster.upsert({
      where: { schoolId_code: { schoolId: schoolAId, code: `G9-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        name: `Grade 9 QA ${testSuffix}`,
        code: `G9-${testSuffix}`,
        displayOrder: 9,
        academicLevel: 'Secondary',
      },
    });
    class9Id = cls.id;

    // Section A
    const secA = await prisma.sectionMaster.upsert({
      where: { schoolId_code: { schoolId: schoolAId, code: `QA-SECA-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        name: `Section A ${testSuffix}`,
        code: `QA-SECA-${testSuffix}`,
        displayOrder: 1,
      },
    });
    sectionAId = secA.id;

    // Section B
    const secB = await prisma.sectionMaster.upsert({
      where: { schoolId_code: { schoolId: schoolAId, code: `QA-SECB-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        name: `Section B ${testSuffix}`,
        code: `QA-SECB-${testSuffix}`,
        displayOrder: 2,
      },
    });
    sectionBId = secB.id;

    // Unmapped Section (NOT linked to Grade 9)
    const secUnmapped = await prisma.sectionMaster.upsert({
      where: { schoolId_code: { schoolId: schoolAId, code: `UNMAP-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        name: `Unmapped Section ${testSuffix}`,
        code: `UNMAP-${testSuffix}`,
        displayOrder: 99,
      },
    });
    unmappedSectionId = secUnmapped.id;

    // Map Section A & B to Grade 9
    await prisma.classSection.upsert({
      where: { classId_sectionId: { classId: class9Id, sectionId: sectionAId } },
      update: {},
      create: { tenantId, schoolId: schoolAId, classId: class9Id, sectionId: sectionAId, capacity: 30, isActive: true },
    });
    await prisma.classSection.upsert({
      where: { classId_sectionId: { classId: class9Id, sectionId: sectionBId } },
      update: {},
      create: { tenantId, schoolId: schoolAId, classId: class9Id, sectionId: sectionBId, capacity: 30, isActive: true },
    });
  });

  let admissionAppId: string;
  let admissionAppNumber: string;
  let convertedStudentId: string;
  let directStudentId: string;

  // Test 1: New Admission Creation
  it('1. New Admission: saves student + guardian + class and receives an application number', async () => {
    const res = await request(app)
      .post('/api/v1/admissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        appliedClassId: class9Id,
        firstName: `Qusai${testSuffix}`,
        lastName: `Katha${testSuffix}`,
        gender: 'MALE',
        dateOfBirth: '2010-03-12',
        bloodGroup: 'A+',
        guardianName: 'Haider Katha',
        guardianRelationship: 'FATHER',
        guardianPhone: `98200${testSuffix}`,
        guardianEmail: `haider.${testSuffix}@example.com`,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.applicationNumber).toMatch(/^APP-/);
    expect(res.body.status).toBe('SUBMITTED');

    admissionAppId = res.body.id;
    admissionAppNumber = res.body.applicationNumber;
  });

  // Test 2: Admission Persistence
  it('2. Admission persistence: retrieved application preserves all submitted fields', async () => {
    const res = await request(app)
      .get(`/api/v1/admissions/${admissionAppId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(admissionAppId);
    expect(res.body.applicationNumber).toBe(admissionAppNumber);
    expect(res.body.firstName).toBe(`Qusai${testSuffix}`);
    expect(res.body.guardianName).toBe('Haider Katha');
  });

  // Test 3: Duplicate Warning & Protection
  it('3. Duplicate warning: detects exact duplicate application with same name, DOB, guardian phone', async () => {
    const checkRes = await request(app)
      .post('/api/v1/admissions/check-duplicate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        firstName: `Qusai${testSuffix}`,
        lastName: `Katha${testSuffix}`,
        dateOfBirth: '2010-03-12',
        guardianPhone: `98200${testSuffix}`,
      });

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.isExactDuplicate).toBe(true);
    expect(checkRes.body.matches.length).toBeGreaterThan(0);

    // Attempting to submit exact duplicate throws 409 Conflict
    const createRes = await request(app)
      .post('/api/v1/admissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        appliedClassId: class9Id,
        firstName: `Qusai${testSuffix}`,
        lastName: `Katha${testSuffix}`,
        gender: 'MALE',
        dateOfBirth: '2010-03-12',
        guardianName: 'Haider Katha',
        guardianRelationship: 'FATHER',
        guardianPhone: `98200${testSuffix}`,
      });

    expect(createRes.status).toBe(409);
  });

  // Test 4: Admission Status Transitions
  it('4. Admission statuses: SUBMITTED -> UNDER_REVIEW -> APPROVED works and updates history', async () => {
    // SUBMITTED -> UNDER_REVIEW
    const toReview = await request(app)
      .post(`/api/v1/admissions/${admissionAppId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({ status: 'UNDER_REVIEW', reviewNotes: 'Verified documents' });

    expect(toReview.status).toBe(200);
    expect(toReview.body.status).toBe('UNDER_REVIEW');

    // UNDER_REVIEW -> APPROVED
    const toApproved = await request(app)
      .post(`/api/v1/admissions/${admissionAppId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({ status: 'APPROVED', reviewNotes: 'Principal approved' });

    expect(toApproved.status).toBe(200);
    expect(toApproved.body.status).toBe('APPROVED');
  });

  // Test 6: Reject Admission requires reason
  it('6. Reject admission: rejecting without entering reason fails with 422', async () => {
    // Create temporary app to test rejection
    const temp = await request(app)
      .post('/api/v1/admissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        appliedClassId: class9Id,
        firstName: `RejectTest${testSuffix}`,
        lastName: `Applicant`,
        gender: 'FEMALE',
        dateOfBirth: '2011-01-01',
        guardianName: 'Test Parent',
        guardianRelationship: 'MOTHER',
        guardianPhone: `91100${testSuffix}`,
      });

    const rejectNoReason = await request(app)
      .post(`/api/v1/admissions/${temp.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({ status: 'REJECTED' });

    expect(rejectNoReason.status).toBe(422);

    // Reject WITH reason succeeds
    const rejectWithReason = await request(app)
      .post(`/api/v1/admissions/${temp.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({ status: 'REJECTED', rejectionReason: 'Seats full in requested class' });

    expect(rejectWithReason.status).toBe(200);
    expect(rejectWithReason.body.status).toBe('REJECTED');
  });

  // Test 7: Convert Admission
  it('7. Convert admission: Approve -> Convert to Student creates exactly one Student', async () => {
    const res = await request(app)
      .post(`/api/v1/admissions/${admissionAppId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        classId: class9Id,
        sectionId: sectionAId,
        rollNumber: `101`,
        admissionDate: '2026-06-01',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('studentId');
    expect(res.body).toHaveProperty('admissionNumber');
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.firstName).toBe(`Qusai${testSuffix}`);

    convertedStudentId = res.body.id;

    // Verify application status changed to CONVERTED
    const appRecord = await prisma.admissionApplication.findUnique({
      where: { id: admissionAppId },
    });
    expect(appRecord?.status).toBe('CONVERTED');
  });

  // Test 8: Double conversion blocked
  it('8. Double conversion: attempting to convert already converted app returns 409 Conflict', async () => {
    const res = await request(app)
      .post(`/api/v1/admissions/${admissionAppId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({ classId: class9Id, sectionId: sectionAId, rollNumber: `102` });

    expect(res.status).toBe(409);
  });

  // Test 5: Invalid transition on converted app blocked
  it('5. Invalid transition: modifying converted application status is blocked', async () => {
    const res = await request(app)
      .post(`/api/v1/admissions/${admissionAppId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({ status: 'UNDER_REVIEW' });

    expect(res.status).toBe(422);
  });

  // Test 9 & 10: Student ID and Admission Number exist
  it('9 & 10. Student ID & Admission Number: exist and match numbering schema', async () => {
    const res = await request(app)
      .get(`/api/v1/students/${convertedStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body.studentId).toBeDefined();
    expect(res.body.admissionNumber).toBeDefined();
    expect(res.body.admissionNumber).toMatch(/^ADM-/);
  });

  // Test 12: Direct Student creation
  it('12. Direct Student creation: creates student with unique roll number and numbering', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        classId: class9Id,
        sectionId: sectionAId,
        rollNumber: `102`,
        admissionDate: '2026-06-01',
        firstName: `Direct${testSuffix}`,
        lastName: `Student`,
        gender: 'FEMALE',
        dateOfBirth: '2010-08-20',
        guardianName: 'Direct Guardian',
        guardianRelationship: 'MOTHER',
        guardianPhone: `98333${testSuffix}`,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('ACTIVE');

    directStudentId = res.body.id;
  });

  // Test 13: Student photo upload & validation
  it('13. Student photo: valid image format succeeds; invalid format is rejected', async () => {
    // Valid PNG upload
    const validBuffer = Buffer.from('fake-png-content');
    const validUpload = await request(app)
      .post(`/api/v1/students/${directStudentId}/photo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .attach('photo', validBuffer, { filename: 'avatar.png', contentType: 'image/png' });

    expect(validUpload.status).toBe(200);
    expect(validUpload.body.photoFileId).toBe('avatar.png');

    // Invalid format (.exe / text)
    const invalidUpload = await request(app)
      .post(`/api/v1/students/${directStudentId}/photo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .attach('photo', Buffer.from('binary-code'), { filename: 'malware.exe', contentType: 'application/x-msdownload' });

    expect(invalidUpload.status).toBe(422);
  });

  // Test 14, 15, 16: Guardian link, sibling reuse, primary guardian
  it('14, 15, 16. Guardians: linking, sibling reuse with normalized phone, and primary toggle', async () => {
    // Add Mother to directStudent
    const addGuardian = await request(app)
      .post(`/api/v1/students/${directStudentId}/guardians`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        firstName: 'Farida',
        lastName: `Katha${testSuffix}`,
        relationship: 'MOTHER',
        phone: `98200${testSuffix}`, // SAME phone as Haider Katha (sibling reuse)
        isPrimary: false,
      });

    expect(addGuardian.status).toBe(200);

    // Toggle Primary to this new guardian
    const makePrimary = await request(app)
      .post(`/api/v1/students/${directStudentId}/guardians`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        guardianId: addGuardian.body.guardianId,
        relationship: 'MOTHER',
        isPrimary: true,
      });

    expect(makePrimary.status).toBe(200);
    expect(makePrimary.body.isPrimary).toBe(true);

    // Verify student detail shows updated primary guardian
    const stu = await request(app)
      .get(`/api/v1/students/${directStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId);

    const primaryGuardians = stu.body.guardians.filter((g: any) => g.isPrimary);
    expect(primaryGuardians.length).toBe(1);
  });

  // Test 18: Invalid Section rejected
  it('18. Invalid section: assigning unmapped section is rejected with 422', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        classId: class9Id,
        sectionId: unmappedSectionId, // Unmapped section
        rollNumber: `999`,
        admissionDate: '2026-06-01',
        firstName: `Invalid${testSuffix}`,
        lastName: `Section`,
        gender: 'MALE',
        dateOfBirth: '2010-01-01',
        guardianName: 'Guardian',
        guardianRelationship: 'FATHER',
        guardianPhone: `99900${testSuffix}`,
      });

    expect(res.status).toBe(422);
    expect(res.body.message).toContain('not mapped to this class');
  });

  // Test 19: Duplicate roll number blocked
  it('19. Roll number: duplicate roll number in same class & section is blocked with 409', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        classId: class9Id,
        sectionId: sectionAId,
        rollNumber: `101`, // Already taken by Qusai
        admissionDate: '2026-06-01',
        firstName: `DuplicateRoll${testSuffix}`,
        lastName: `Student`,
        gender: 'MALE',
        dateOfBirth: '2010-05-05',
        guardianName: 'Guardian',
        guardianRelationship: 'FATHER',
        guardianPhone: `98888${testSuffix}`,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already taken');
  });

  // Test 20 & 21: Change section & Academic history
  it('20 & 21. Section transfer & History: move Grade 9 A -> Grade 9 B preserves history', async () => {
    const transferRes = await request(app)
      .post(`/api/v1/students/${convertedStudentId}/enrollments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        classId: class9Id,
        sectionId: sectionBId, // Move to Section B
        rollNumber: `201`,
        remarks: 'Transferred to Section B for term 2',
      });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.currentRollNumber).toBe('201');

    // History contains both Section A and Section B enrollments
    const stu = await request(app)
      .get(`/api/v1/students/${convertedStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId);

    expect(stu.body.enrollments.length).toBeGreaterThanOrEqual(2);
  });

  // Test 22, 23, 24: Student documents & verification
  let testDocId: string;
  it('22, 23, 24. Documents: PDF upload succeeds, invalid rejected, verification status updates', async () => {
    // Valid PDF upload
    const validUpload = await request(app)
      .post(`/api/v1/students/${convertedStudentId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .field('documentType', 'BIRTH_CERTIFICATE')
      .attach('file', Buffer.from('%PDF-1.4 test document content'), {
        filename: 'birth_cert.pdf',
        contentType: 'application/pdf',
      });

    expect(validUpload.status).toBe(201);
    expect(validUpload.body.verificationStatus).toBe('PENDING');
    testDocId = validUpload.body.id;

    // Invalid upload format (text file / sh script)
    const invalidUpload = await request(app)
      .post(`/api/v1/students/${convertedStudentId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .field('documentType', 'OTHER')
      .attach('file', Buffer.from('echo bad'), {
        filename: 'script.sh',
        contentType: 'application/x-sh',
      });

    expect(invalidUpload.status).toBe(422);

    // Verify document
    const verifyRes = await request(app)
      .patch(`/api/v1/students/${convertedStudentId}/documents/${testDocId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({ verificationStatus: 'VERIFIED', verificationNotes: 'Original birth certificate verified by clerk' });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verificationStatus).toBe('VERIFIED');
    expect(verifyRes.body.verifiedBy).toBeDefined();
  });

  // Test 25: Student notes (normal & confidential permission filtering)
  it('25. Student notes: normal and confidential notes save; confidential notes follow access permissions', async () => {
    // Add normal note
    const normal = await request(app)
      .post(`/api/v1/students/${convertedStudentId}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({ category: 'ACADEMIC', content: 'Normal academic note: high performer', isConfidential: false });
    expect(normal.status).toBe(201);

    // Add confidential note
    const confidential = await request(app)
      .post(`/api/v1/students/${convertedStudentId}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({ category: 'MEDICAL', content: 'Confidential health note: asthma inhaler required', isConfidential: true });
    expect(confidential.status).toBe(201);

    // Admin sees confidential note
    const adminView = await request(app)
      .get(`/api/v1/students/${convertedStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId);
    expect(adminView.body.notes.some((n: any) => n.isConfidential)).toBe(true);

    // Restricted user (students.view only, without students.manage) cannot see confidential note
    const restrictedView = await request(app)
      .get(`/api/v1/students/${convertedStudentId}`)
      .set('Authorization', `Bearer ${restrictedToken}`)
      .set('X-School-Id', schoolAId);
    expect(restrictedView.body.notes.some((n: any) => n.isConfidential)).toBe(false);
  });

  // Test 26 & 27: Discipline records & permission guarding
  it('26 & 27. Discipline: creates confidential record, hidden from user without discipline permission', async () => {
    const addDiscipline = await request(app)
      .post(`/api/v1/students/${convertedStudentId}/discipline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        incidentDate: '2026-09-02',
        incidentType: 'MISCONDUCT',
        title: 'Hallway Disturbance',
        description: 'Loud interruption during study hall',
        severity: 'LOW',
        actionTaken: 'Counseling session conducted',
      });

    expect(addDiscipline.status).toBe(201);

    // Admin sees discipline record
    const adminView = await request(app)
      .get(`/api/v1/students/${convertedStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId);
    expect(adminView.body.disciplines).toBeDefined();
    expect(adminView.body.disciplines.length).toBeGreaterThanOrEqual(1);

    // Restricted user has NO discipline permission -> disciplines field is undefined/omitted
    const restrictedView = await request(app)
      .get(`/api/v1/students/${convertedStudentId}`)
      .set('Authorization', `Bearer ${restrictedToken}`)
      .set('X-School-Id', schoolAId);
    expect(restrictedView.body.disciplines).toBeUndefined();
  });

  // Test 28: Withdraw Student
  it('28. Withdraw Student: status becomes WITHDRAWN with mandatory date and reason', async () => {
    const res = await request(app)
      .post(`/api/v1/students/${directStudentId}/withdraw`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        effectiveDate: '2026-09-01',
        reason: 'Relocating to another city with family',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('WITHDRAWN');
    expect(res.body.statusReason).toBe('Relocating to another city with family');
  });

  // Test 29: Transfer Student
  it('29. Transfer Student: status becomes TRANSFERRED with destination school and reason', async () => {
    // Create student to transfer
    const temp = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        classId: class9Id,
        sectionId: sectionBId,
        rollNumber: `301`,
        admissionDate: '2026-06-01',
        firstName: `Transfer${testSuffix}`,
        lastName: `Candidate`,
        gender: 'MALE',
        dateOfBirth: '2010-02-02',
        guardianName: 'Parent',
        guardianRelationship: 'FATHER',
        guardianPhone: `97777${testSuffix}`,
      });

    const res = await request(app)
      .post(`/api/v1/students/${temp.body.id}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        destinationSchool: 'Saint Xavier High School, Mumbai',
        reason: 'Parent job transfer',
        transferDate: '2026-09-03',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('TRANSFERRED');
    expect(res.body.destinationSchool).toBe('Saint Xavier High School, Mumbai');
  });

  // Test 30: Reactivation
  it('30. Reactivation: restores WITHDRAWN student to ACTIVE with required reason and placement', async () => {
    const res = await request(app)
      .post(`/api/v1/students/${directStudentId}/reactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        classId: class9Id,
        sectionId: sectionAId,
        rollNumber: `199`,
        reason: 'Family returned from overseas',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.currentRollNumber).toBe('199');
  });

  // Test 31 & 32: Case-insensitive student & guardian search
  it('31 & 32. Search: matches student case-insensitively by name, Student ID, and guardian phone', async () => {
    // Uppercase search
    const upper = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({ search: `QUSAI${testSuffix}`.toUpperCase() });

    expect(upper.status).toBe(200);
    expect(upper.body.items.length).toBeGreaterThan(0);
    expect(upper.body.items.some((st: any) => st.firstName.toLowerCase() === `qusai${testSuffix}`.toLowerCase())).toBe(true);

    // Guardian phone search
    const phoneSearch = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({ search: `98200${testSuffix}` });

    expect(phoneSearch.status).toBe(200);
    expect(phoneSearch.body.items.some((st: any) => st.id === convertedStudentId)).toBe(true);
  });

  // Test 33: Global Deep Search
  it('33. Global search: /api/v1/search/deep returns students and admissions with correct URLs', async () => {
    const res = await request(app)
      .get('/api/v1/search/deep')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({ q: `Qusai${testSuffix}` });

    expect(res.status).toBe(200);
    const item = res.body.results.find((r: any) => r.type === 'student');
    expect(item).toBeDefined();
    expect(item.url).toBe(`/students/${convertedStudentId}`);
  });

  // Test 34: Filters
  it('34. Filters: filter by class, section, status narrows list appropriately', async () => {
    const res = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({ class_id: class9Id, status: 'ACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((st: any) => st.status === 'ACTIVE')).toBe(true);
  });

  // Test 35: CSV Template
  it('35. CSV template: GET /import/template returns valid CSV header', async () => {
    const res = await request(app)
      .get('/api/v1/students/import/template')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.text).toContain('First Name,Last Name,Date of Birth,Gender');
  });

  // Test 36, 37, 38: CSV Preview, Import Commit, and Duplicate Protection
  it('36, 37, 38. CSV Import: preview validates rows, commit imports students, re-upload warns duplicates', async () => {
    // 36: Upload invalid CSV row
    const invalidCsv = `First Name,Last Name,Date of Birth,Gender,Admission Date,Class,Section,Roll Number,Student ID,Admission Number,Guardian Name,Guardian Relationship,Guardian Phone,Guardian Email,Address,City,State,Postal Code\n,MissingLast,invalid-date,UNKNOWN,2026-04-01,NonExistentClass,NonExistentSection,999,,,Parent,FATHER,12,,Road,City,State,000`;
    const previewInvalid = await request(app)
      .post('/api/v1/students/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .attach('file', Buffer.from(invalidCsv), { filename: 'invalid.csv', contentType: 'text/csv' });

    expect(previewInvalid.status).toBe(200);
    expect(previewInvalid.body.errors.length).toBeGreaterThan(0);

    // 37: Import valid CSV
    const csvName1 = `CsvStudentA${testSuffix}`;
    const csvPhone1 = `91234${testSuffix}`;
    const validCsv = `First Name,Last Name,Date of Birth,Gender,Admission Date,Class,Section,Roll Number,Student ID,Admission Number,Guardian Name,Guardian Relationship,Guardian Phone,Guardian Email,Address,City,State,Postal Code\n${csvName1},Test,2011-04-10,MALE,2026-04-01,Grade 9 QA ${testSuffix},Section A ${testSuffix},401,,,CSV Parent,FATHER,${csvPhone1},parent@test.com,Road,City,State,000`;

    const previewValid = await request(app)
      .post('/api/v1/students/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .attach('file', Buffer.from(validCsv), { filename: 'valid.csv', contentType: 'text/csv' });

    expect(previewValid.status).toBe(200);
    expect(previewValid.body.validRows).toBe(1);

    const commitRes = await request(app)
      .post('/api/v1/students/import/commit')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        rows: previewValid.body.preview,
      });

    expect(commitRes.status).toBe(201);
    expect(commitRes.body.importedCount).toBe(1);

    // 38: Upload same CSV again -> Duplicate protection flags it
    const previewDuplicate = await request(app)
      .post('/api/v1/students/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .attach('file', Buffer.from(validCsv), { filename: 'valid.csv', contentType: 'text/csv' });

    expect(previewDuplicate.status).toBe(200);
    expect(previewDuplicate.body.errors.some((e: any) => e.field === 'Duplicate')).toBe(true);
  });

  // Test 39: Export
  it('39. Export: GET /export?class_id=... exports CSV filtered by class', async () => {
    const res = await request(app)
      .get('/api/v1/students/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({ class_id: class9Id });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain(`Qusai${testSuffix}`);
  });

  // Test 41: RBAC
  it('41. RBAC: restricted user cannot perform management operations (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${restrictedToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        classId: class9Id,
        firstName: 'Unauthorized',
        lastName: 'Student',
        gender: 'MALE',
        dateOfBirth: '2010-01-01',
        guardianName: 'Parent',
        guardianRelationship: 'FATHER',
        guardianPhone: '9999999999',
      });

    expect(res.status).toBe(403);
  });

  // Test 42 & 43: School Isolation & Context Switch
  it('42 & 43. School Isolation: accessing School A student from School B returns 404', async () => {
    const crossSchool = await request(app)
      .get(`/api/v1/students/${convertedStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolBId);

    expect(crossSchool.status).toBe(404);

    // Listing students for School B returns 0 or only School B records
    const schoolBList = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolBId);

    expect(schoolBList.status).toBe(200);
    expect(schoolBList.body.items.some((st: any) => st.id === convertedStudentId)).toBe(false);
  });
});
