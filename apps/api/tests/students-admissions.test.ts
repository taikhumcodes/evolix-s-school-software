import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Major Module 03 — Student & Admission Management API', () => {
  let adminToken: string;
  let tenantId: string;
  let schoolAId: string;
  let schoolBId: string;
  let academicYearId: string;
  let classId: string;
  let sectionId: string;

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

    // Second school for isolation tests
    const secondSchool = await prisma.school.findFirst({
      where: { tenantId, id: { not: schoolAId } },
    });
    if (secondSchool) {
      schoolBId = secondSchool.id;
    } else {
      const created = await prisma.school.create({
        data: {
          tenantId,
          name: 'Isolation Test School',
          code: 'ISO-01',
          isActive: true,
        },
      });
      schoolBId = created.id;
    }

    // 2. Ensure academic year in School A
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

    // 3. Ensure Class and Section in School A
    const cls = await prisma.classMaster.upsert({
      where: {
        schoolId_code: {
          schoolId: schoolAId,
          code: 'M03-CLS',
        },
      },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        name: 'Class 10-A Alpha',
        code: 'M03-CLS',
        displayOrder: 10,
        academicLevel: 'Secondary',
      },
    });
    classId = cls.id;

    const sec = await prisma.sectionMaster.upsert({
      where: {
        schoolId_code: {
          schoolId: schoolAId,
          code: 'SEC-A',
        },
      },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        name: 'Section Alpha',
        code: 'SEC-A',
        displayOrder: 1,
      },
    });
    sectionId = sec.id;

    // Link class to section
    await prisma.classSection.upsert({
      where: {
        classId_sectionId: {
          classId,
          sectionId,
        },
      },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        classId,
        sectionId,
        capacity: 40,
        isActive: true,
      },
    });

    // Clean up test data from any previous test runs
    await prisma.studentDiscipline.deleteMany({
      where: { schoolId: schoolAId },
    });
    await prisma.studentNote.deleteMany({
      where: { schoolId: schoolAId },
    });
    await prisma.studentDocument.deleteMany({
      where: { schoolId: schoolAId },
    });
    await prisma.studentGuardian.deleteMany({
      where: { schoolId: schoolAId },
    });
    await prisma.studentEnrollment.deleteMany({
      where: { schoolId: schoolAId },
    });
    await prisma.student.deleteMany({
      where: { schoolId: schoolAId, firstName: { in: ['Zainab', 'Farhan'] } },
    });
    await prisma.admissionApplication.deleteMany({
      where: { schoolId: schoolAId, firstName: { in: ['Zainab', 'Farhan'] } },
    });

    await prisma.schoolConfiguration.upsert({
      where: { schoolId: schoolAId },
      update: { rollNumberFormat: '{SEQ}' },
      create: {
        tenantId,
        schoolId: schoolAId,
        rollNumberFormat: '{SEQ}',
      },
    });
  });

  // 1. Overview
  it('GET /api/v1/students/overview returns operational metric counts', async () => {
    const res = await request(app)
      .get('/api/v1/students/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalActiveStudents');
    expect(res.body).toHaveProperty('pendingAdmissions');
    expect(res.body).toHaveProperty('approvedAdmissions');
    expect(res.body).toHaveProperty('admissionsThisYear');
    expect(res.body).toHaveProperty('withdrawnStudents');
    expect(typeof res.body.totalActiveStudents).toBe('number');
  });

  // 2. Duplicate detection (initial clean state)
  it('POST /api/v1/admissions/check-duplicate reports no duplicate for unique applicant', async () => {
    const res = await request(app)
      .post('/api/v1/admissions/check-duplicate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        firstName: 'UniqueApplicant',
        lastName: 'Test',
        dateOfBirth: '2015-05-15',
        guardianPhone: '+91 98765 43210',
      });

    expect(res.status).toBe(200);
    expect(res.body.isExactDuplicate).toBe(false);
    expect(res.body.isPotentialDuplicate).toBe(false);
  });

  // 3. Create Admission Application
  let testAppId: string;
  let testAppNumber: string;

  it('POST /api/v1/admissions creates a new admission application with atomic sequence number', async () => {
    const res = await request(app)
      .post('/api/v1/admissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        appliedClassId: classId,
        firstName: 'Zainab',
        middleName: 'Ali',
        lastName: 'Merchant',
        gender: 'FEMALE',
        dateOfBirth: '2015-06-20',
        bloodGroup: 'B+',
        guardianName: 'Ali Merchant',
        guardianRelationship: 'FATHER',
        guardianPhone: '9820011223',
        guardianEmail: 'ali.merchant@test.com',
        addressLine1: '123 Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400020',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('applicationNumber');
    expect(res.body.status).toBe('SUBMITTED');
    expect(res.body.firstName).toBe('Zainab');
    expect(res.body.applicationNumber).toMatch(/^APP-/);

    testAppId = res.body.id;
    testAppNumber = res.body.applicationNumber;
  });

  // 4. Duplicate detection detects existing application
  it('POST /api/v1/admissions/check-duplicate catches exact duplicate application', async () => {
    const res = await request(app)
      .post('/api/v1/admissions/check-duplicate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        firstName: 'Zainab',
        lastName: 'Merchant',
        dateOfBirth: '2015-06-20',
        guardianPhone: '9820011223',
      });

    expect(res.status).toBe(200);
    expect(res.body.isExactDuplicate).toBe(true);
    expect(res.body.matches.length).toBeGreaterThan(0);
    expect(res.body.matches[0].type).toBe('EXACT_APPLICATION');
  });

  // 5. Admission status transition: SUBMITTED -> UNDER_REVIEW -> APPROVED
  it('POST /api/v1/admissions/:id/status transitions application to UNDER_REVIEW then APPROVED', async () => {
    const reviewRes = await request(app)
      .post(`/api/v1/admissions/${testAppId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        status: 'UNDER_REVIEW',
        reviewNotes: 'Initial document check verified',
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.status).toBe('UNDER_REVIEW');

    const approveRes = await request(app)
      .post(`/api/v1/admissions/${testAppId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        status: 'APPROVED',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('APPROVED');
  });

  // 5b. Direct SUBMITTED -> APPROVED transition
  it('POST /api/v1/admissions/:id/status allows direct transition from SUBMITTED to APPROVED', async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);
    // Create a new application
    const appRes = await request(app)
      .post('/api/v1/admissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        appliedClassId: classId,
        firstName: `Direct${uniqueSuffix}`,
        lastName: `Approved${uniqueSuffix}`,
        gender: 'MALE',
        dateOfBirth: '2016-01-01',
        guardianName: 'Parent',
        guardianRelationship: 'FATHER',
        guardianPhone: `99${uniqueSuffix}`,
      });

    expect(appRes.status).toBe(201);
    const directAppId = appRes.body.id;

    // Directly approve from SUBMITTED
    const directApproveRes = await request(app)
      .post(`/api/v1/admissions/${directAppId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        status: 'APPROVED',
        reviewNotes: 'Directly approved by principal',
      });

    expect(directApproveRes.status).toBe(200);
    expect(directApproveRes.body.status).toBe('APPROVED');
  });

  // 6. Suggest next roll number
  it('GET /api/v1/students/next-roll-number returns suggested sequential roll number', async () => {
    const res = await request(app)
      .get('/api/v1/students/next-roll-number')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academic_year_id: academicYearId,
        class_id: classId,
        section_id: sectionId,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rollNumber');
    expect(res.body.rollNumber).toBe('1');
  });

  // 7. Atomic conversion of Application to Student
  let convertedStudentId: string;
  let studentRefCode: string;

  it('POST /api/v1/admissions/:id/convert atomically converts approved application to student', async () => {
    const res = await request(app)
      .post(`/api/v1/admissions/${testAppId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        classId,
        sectionId,
        rollNumber: '1',
        admissionDate: '2026-06-01',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('studentId');
    expect(res.body).toHaveProperty('admissionNumber');
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.firstName).toBe('Zainab');
    expect(res.body.currentRollNumber).toBe('1');

    convertedStudentId = res.body.id;
    studentRefCode = res.body.studentId;

    // Verify application status changed to CONVERTED
    const appRecord = await prisma.admissionApplication.findUnique({
      where: { id: testAppId },
    });
    expect(appRecord?.status).toBe('CONVERTED');
  });

  // 8. Roll number conflict check
  it('Roll number uniqueness is enforced in class and section', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        classId,
        sectionId,
        rollNumber: '1', // Already taken by Zainab
        admissionDate: '2026-06-01',
        firstName: 'Farhan',
        lastName: 'Qureshi',
        gender: 'MALE',
        dateOfBirth: '2015-08-10',
        guardianName: 'Mr. Qureshi',
        guardianRelationship: 'FATHER',
        guardianPhone: '9833445566',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already taken');
  });

  // 9. Direct Student Creation with unique roll number
  let directStudentId: string;

  it('POST /api/v1/students creates direct student bypassing application workflow', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        classId,
        sectionId,
        rollNumber: '2',
        admissionDate: '2026-06-01',
        firstName: 'Farhan',
        lastName: 'Qureshi',
        gender: 'MALE',
        dateOfBirth: '2015-08-10',
        guardianName: 'Mr. Qureshi',
        guardianRelationship: 'FATHER',
        guardianPhone: '9833445566',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.studentId).toBeDefined();
    expect(res.body.admissionNumber).toBeDefined();
    expect(res.body.status).toBe('ACTIVE');

    directStudentId = res.body.id;
  });

  // 10. Student Lifecycle: Class/Section Change
  it('POST /api/v1/students/:id/enrollments records class and section transfer with history', async () => {
    const res = await request(app)
      .post(`/api/v1/students/${directStudentId}/enrollments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        classId,
        sectionId,
        rollNumber: '15',
        remarks: 'Mid-term section re-balancing',
      });

    expect(res.status).toBe(200);
    expect(res.body.currentRollNumber).toBe('15');

    // Check history length
    expect(res.body.enrollments.length).toBeGreaterThanOrEqual(2);
  });

  // 11. Student Lifecycle: Withdrawal
  it('POST /api/v1/students/:id/withdraw marks student as WITHDRAWN with mandatory reason', async () => {
    const res = await request(app)
      .post(`/api/v1/students/${directStudentId}/withdraw`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        effectiveDate: '2026-08-30',
        reason: 'Family relocating overseas',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('WITHDRAWN');
    expect(res.body.statusReason).toBe('Family relocating overseas');
  });

  // 12. Student Lifecycle: Reactivation
  it('POST /api/v1/students/:id/reactivate restores withdrawn student to active status', async () => {
    const res = await request(app)
      .post(`/api/v1/students/${directStudentId}/reactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        classId,
        sectionId,
        rollNumber: '25',
        reason: 'Family returned from overseas assignment',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.currentRollNumber).toBe('25');
  });

  // 13. Student Notes
  it('POST /api/v1/students/:id/notes adds internal staff note', async () => {
    const res = await request(app)
      .post(`/api/v1/students/${convertedStudentId}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        category: 'ACADEMIC',
        content: 'Demonstrates exceptional aptitude in mathematics competitions.',
      });

    expect(res.status).toBe(201);
    expect(res.body.content).toContain('exceptional aptitude');
    expect(res.body.category).toBe('ACADEMIC');
  });

  // 14. Confidential Discipline Record
  it('POST /api/v1/students/:id/discipline logs confidential incident record', async () => {
    const res = await request(app)
      .post(`/api/v1/students/${convertedStudentId}/discipline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        incidentDate: '2026-09-01',
        incidentType: 'MISCONDUCT',
        title: 'Hallway Disturbance',
        description: 'Engaged in loud arguing near exam hall during session.',
        severity: 'LOW',
        actionTaken: 'Verbal warning given by Vice Principal.',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Hallway Disturbance');
    expect(res.body.severity).toBe('LOW');
  });

  // 15. Deep Search integration
  it('GET /api/v1/search/deep matches student by name and student ID', async () => {
    const res = await request(app)
      .get('/api/v1/search/deep')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({ q: 'Zainab' });

    expect(res.status).toBe(200);
    const studentMatch = res.body.results.find(
      (r: any) => r.type === 'student' && r.title.includes('Zainab')
    );
    expect(studentMatch).toBeDefined();
    expect(studentMatch.subtitle).toContain('Class 10-A Alpha');
  });

  // 16. School Isolation Security (NON-NEGOTIABLE)
  it('Cross-school isolation: Student in School A is NOT accessible from School B context', async () => {
    const res = await request(app)
      .get(`/api/v1/students/${convertedStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolBId);

    // Must return 404 Not Found due to schoolId mismatch
    expect(res.status).toBe(404);
  });

  // 17. CSV Export
  it('GET /api/v1/students/export generates valid CSV file', async () => {
    const res = await request(app)
      .get('/api/v1/students/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('student_id');
    expect(res.text).toContain('first_name');
    expect(res.text).toContain('Zainab');
  });
});
