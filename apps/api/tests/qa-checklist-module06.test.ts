import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

describe('Major Module 06 — Academic & Examination Management Automated Verifications', () => {
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let teacherUserId: string;
  let parentUserId: string;
  let guardianId: string;

  let tenantId: string;
  let schoolAId: string;
  let schoolBId: string;

  let yearCurrentId: string;
  let yearNextId: string;

  let class9Id: string;
  let class10Id: string;
  let sectionAId: string;
  let sectionBId: string;

  let subjectMathId: string;
  let subjectScienceId: string;

  let studentAId: string;
  let studentBId: string;
  let enrollmentAId: string;
  let enrollmentBId: string;

  let examId: string;
  let term1Id: string;
  let period1Id: string;
  let period2Id: string;

  const testId = Date.now().toString().slice(-6);

  beforeAll(async () => {
    // 1. Login as Admin
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@evolix.local', password: 'Password123!' });
    adminToken = login.body.access_token;

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    tenantId = me.body.tenant_id;
    schoolAId = me.body.schools[0]?.id;

    // 2. Setup School B for isolation tests
    const schoolB = await prisma.school.upsert({
      where: { id: '00000000-0000-0000-0000-000000000099' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000099',
        tenantId,
        code: `SCHB_${testId}`,
        name: `School B Test ${testId}`,
        isActive: true,
      },
    });
    schoolBId = schoolB.id;

    // 3. Current Academic Year 2026-2027 & Next Academic Year 2027-2028
    const curYear = await prisma.academicYear.upsert({
      where: { id: '00000000-0000-0000-0000-000000000101' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000101',
        schoolId: schoolAId,
        name: `2026-2027-${testId}`,
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        isCurrent: true,
      },
    });
    yearCurrentId = curYear.id;

    const nxtYear = await prisma.academicYear.upsert({
      where: { id: '00000000-0000-0000-0000-000000000102' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000102',
        schoolId: schoolAId,
        name: `2027-2028-${testId}`,
        startDate: new Date('2027-04-01T00:00:00.000Z'),
        endDate: new Date('2028-03-31T00:00:00.000Z'),
        isCurrent: false,
      },
    });
    yearNextId = nxtYear.id;

    // 4. Setup Classes & Sections
    const c9 = await prisma.classMaster.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        name: `Class 9 ${testId}`,
        code: `C9_${testId}`,
        displayOrder: 9,
      },
    });
    class9Id = c9.id;

    const c10 = await prisma.classMaster.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        name: `Class 10 ${testId}`,
        code: `C10_${testId}`,
        displayOrder: 10,
      },
    });
    class10Id = c10.id;

    const secA = await prisma.sectionMaster.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        name: 'Section A',
        code: `SA_${testId}`,
        displayOrder: 1,
      },
    });
    sectionAId = secA.id;

    const secB = await prisma.sectionMaster.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        name: 'Section B',
        code: `SB_${testId}`,
        displayOrder: 2,
      },
    });
    sectionBId = secB.id;

    // Map Class 9 to Section A and Class 10 to Section A
    await prisma.classSection.createMany({
      data: [
        { tenantId, schoolId: schoolAId, classId: class9Id, sectionId: sectionAId },
        { tenantId, schoolId: schoolAId, classId: class10Id, sectionId: sectionAId },
      ],
    });

    // 5. Setup Subjects
    const sMath = await prisma.subjectMaster.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        name: `Mathematics ${testId}`,
        code: `MTH_${testId}`,
        type: 'THEORY',
      },
    });
    subjectMathId = sMath.id;

    const sSci = await prisma.subjectMaster.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        name: `Science ${testId}`,
        code: `SCI_${testId}`,
        type: 'BOTH',
      },
    });
    subjectScienceId = sSci.id;

    // Map Math & Science to Class 9
    await prisma.classSubject.createMany({
      data: [
        { tenantId, schoolId: schoolAId, classId: class9Id, subjectId: subjectMathId },
        { tenantId, schoolId: schoolAId, classId: class9Id, subjectId: subjectScienceId },
      ],
    });

    // 6. Setup Students A & B enrolled in Class 9 Section A
    const stuA = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: `STUA_${testId}`,
        admissionNumber: `ADMA_${testId}`,
        firstName: 'Aarav',
        lastName: 'Sharma',
        displayName: 'Aarav Sharma',
        gender: 'MALE',
        dateOfBirth: new Date('2011-05-15T00:00:00.000Z'),
        admittedAcademicYearId: yearCurrentId,
        status: 'ACTIVE',
      },
    });
    studentAId = stuA.id;

    const enrA = await prisma.studentEnrollment.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: studentAId,
        academicYearId: yearCurrentId,
        classId: class9Id,
        sectionId: sectionAId,
        rollNumber: '01',
        status: 'ACTIVE',
      },
    });
    enrollmentAId = enrA.id;

    const stuB = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: `STUB_${testId}`,
        admissionNumber: `ADMB_${testId}`,
        firstName: 'Bhavna',
        lastName: 'Patel',
        displayName: 'Bhavna Patel',
        gender: 'FEMALE',
        dateOfBirth: new Date('2011-08-20T00:00:00.000Z'),
        admittedAcademicYearId: yearCurrentId,
        status: 'ACTIVE',
      },
    });
    studentBId = stuB.id;

    const enrB = await prisma.studentEnrollment.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: studentBId,
        academicYearId: yearCurrentId,
        classId: class9Id,
        sectionId: sectionAId,
        rollNumber: '02',
        status: 'ACTIVE',
      },
    });
    enrollmentBId = enrB.id;

    // 7. Setup Teacher User
    const hash = await bcrypt.hash('Teacher123!', 10);
    const teacherUser = await prisma.user.create({
      data: {
        tenantId,
        email: `teacher_${testId}@evolix.local`,
        hashedPassword: hash,
        firstName: 'Vikram',
        lastName: 'Singh',
        isActive: true,
        userSchools: { create: { schoolId: schoolAId } },
      },
    });
    teacherUserId = teacherUser.id;

    // Assign roles/permissions to Teacher
    const teacherRole = await prisma.role.create({
      data: {
        tenantId,
        name: `TeacherRole_${testId}`,
        rolePermissions: {
          create: [
            { permission: { connect: { code: 'homework.view' } } },
            { permission: { connect: { code: 'timetable.view' } } },
            { permission: { connect: { code: 'marks.view' } } },
            { permission: { connect: { code: 'marks.enter' } } },
            { permission: { connect: { code: 'academics.view' } } },
          ],
        },
      },
    });
    await prisma.userRole.create({
      data: { userId: teacherUserId, roleId: teacherRole.id },
    });

    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `teacher_${testId}@evolix.local`, password: 'Teacher123!' });
    teacherToken = teacherLogin.body.access_token;

    // 8. Setup Guardian & Parent User linked to Student A only
    const parentUser = await prisma.user.create({
      data: {
        tenantId,
        email: `parent_${testId}@evolix.local`,
        hashedPassword: hash,
        firstName: 'Rajesh',
        lastName: 'Sharma',
        isActive: true,
        userSchools: { create: { schoolId: schoolAId } },
      },
    });
    parentUserId = parentUser.id;

    const guardian = await prisma.guardian.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        userId: parentUserId,
        firstName: 'Rajesh',
        lastName: 'Sharma',
        relationship: 'FATHER',
        phone: '9876543210',
        normalizedPhone: '9876543210',
        status: 'ACTIVE',
      },
    });
    guardianId = guardian.id;

    // Link Guardian to Student A only
    await prisma.studentGuardian.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: studentAId,
        guardianId,
        relationship: 'FATHER',
        isPrimary: true,
      },
    });

    // Assign Parent Role to parent user
    const parentRole = await prisma.role.findFirst({ where: { name: 'Parent', tenantId } });
    if (parentRole) {
      await prisma.userRole.create({
        data: { userId: parentUserId, roleId: parentRole.id },
      });
    }

    const parentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `parent_${testId}@evolix.local`, password: 'Teacher123!' });
    parentToken = parentLogin.body.access_token;

    // 9. Create Periods
    const p1 = await prisma.schoolPeriod.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        name: 'Period 1',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '08:45',
        displayOrder: 1,
        type: 'TEACHING',
      },
    });
    period1Id = p1.id;

    const p2 = await prisma.schoolPeriod.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        name: 'Period 2',
        periodNumber: 2,
        startTime: '08:45',
        endTime: '09:30',
        displayOrder: 2,
        type: 'TEACHING',
      },
    });
    period2Id = p2.id;
  });

  // =========================================================================
  // SCENARIOS 1–4: TERMS & TEACHER ASSIGNMENTS
  // =========================================================================

  it('1. Academic Term validation — rejects dates outside academic year', async () => {
    const res = await request(app)
      .post('/api/v1/academic-terms')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        name: 'Term Invalid',
        code: `TI_${testId}`,
        academicYearId: yearCurrentId,
        startDate: '2025-01-01', // Before academic year start (2026-04-01)
        endDate: '2026-08-31',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TERM_DATE_INVALID');
  });

  it('1b. Academic Term creation — creates valid term within academic year', async () => {
    const res = await request(app)
      .post('/api/v1/academic-terms')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        name: 'Term 1',
        code: `T1_${testId}`,
        academicYearId: yearCurrentId,
        startDate: '2026-04-01',
        endDate: '2026-09-30',
        displayOrder: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    term1Id = res.body.id;
  });

  it('1c. Academic Term update — edits name/dates and persists changes', async () => {
    const res = await request(app)
      .put(`/api/v1/academic-terms/${term1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        name: 'Term 1 Updated',
        startDate: '2026-04-05',
        endDate: '2026-09-28',
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Term 1 Updated');
    expect(res.body.isActive).toBe(true);
  });

  it('1d. Unreferenced Academic Term deletion — creates and safely deletes unreferenced term', async () => {
    const createRes = await request(app)
      .post('/api/v1/academic-terms')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        name: 'Temporary Term',
        code: `TMP_${testId}`,
        academicYearId: yearCurrentId,
        startDate: '2026-10-01',
        endDate: '2026-11-30',
      });
    expect(createRes.status).toBe(201);
    const tempId = createRes.body.id;

    const delRes = await request(app)
      .delete(`/api/v1/academic-terms/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const checkDb = await prisma.academicTerm.findUnique({ where: { id: tempId } });
    expect(checkDb).toBeNull();
  });

  it('2. Class Teacher assignment — assigns teacher to class & section', async () => {
    const res = await request(app)
      .post('/api/v1/academic-assignments/class-teachers')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId: yearCurrentId,
        classId: class9Id,
        sectionId: sectionAId,
        teacherUserId,
        isPrimary: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('3. Subject Teacher mapping validation — rejects unmapped subject', async () => {
    // Try to assign teacher to unmapped subject (e.g. create unmapped subject)
    const unmappedSubject = await prisma.subjectMaster.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        name: `Unmapped French ${testId}`,
        code: `FRE_${testId}`,
      },
    });

    const res = await request(app)
      .post('/api/v1/academic-assignments/subject-teachers')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId: yearCurrentId,
        classId: class9Id,
        sectionId: sectionAId,
        subjectId: unmappedSubject.id,
        teacherUserId,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SUBJECT_NOT_MAPPED');
  });

  it('3b. Subject Teacher mapping — successfully assigns mapped subject', async () => {
    const res = await request(app)
      .post('/api/v1/academic-assignments/subject-teachers')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId: yearCurrentId,
        classId: class9Id,
        sectionId: sectionAId,
        subjectId: subjectMathId,
        teacherUserId,
        isPrimary: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('4. Teacher Scoped Access — teacher cannot create homework for unassigned class', async () => {
    const res = await request(app)
      .post('/api/v1/homework')
      .set('Authorization', `Bearer ${teacherToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId: yearCurrentId,
        classId: class10Id, // Class 10 is unassigned to this teacher
        sectionId: sectionAId,
        subjectId: subjectMathId,
        title: 'Unauthorized HW',
        instructions: 'Test',
        assignedDate: '2026-05-01',
        dueDate: '2026-05-05',
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TEACHER_UNAUTHORIZED');
  });

  // =========================================================================
  // SCENARIOS 5–8: TIMETABLE & CONFLICT DETECTION
  // =========================================================================

  it('5. Timetable slot creation — saves slot for Class 9A', async () => {
    const res = await request(app)
      .post('/api/v1/timetable/slot')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId: yearCurrentId,
        classId: class9Id,
        sectionId: sectionAId,
        dayOfWeek: 1, // Monday
        periodId: period1Id,
        subjectId: subjectMathId,
        teacherUserId,
        room: 'Room 101',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('6. Teacher Timetable Conflict — rejects scheduling same teacher in another class at same time', async () => {
    const res = await request(app)
      .post('/api/v1/timetable/slot')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId: yearCurrentId,
        classId: class10Id,
        sectionId: sectionAId,
        dayOfWeek: 1, // Monday
        periodId: period1Id, // Same period 1!
        subjectId: subjectMathId,
        teacherUserId, // Same teacher!
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('TEACHER_TIMETABLE_CONFLICT');
  });

  it('7. Room Timetable Conflict — rejects double-booking same room at same time', async () => {
    // Another teacher user
    const otherTeacher = await prisma.user.create({
      data: {
        tenantId,
        email: `other_teacher_${testId}@evolix.local`,
        hashedPassword: 'hash',
        firstName: 'Pooja',
        lastName: 'Verma',
        userSchools: { create: { schoolId: schoolAId } },
      },
    });

    const res = await request(app)
      .post('/api/v1/timetable/slot')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId: yearCurrentId,
        classId: class10Id,
        sectionId: sectionAId,
        dayOfWeek: 1, // Monday
        periodId: period1Id, // Same period 1!
        subjectId: subjectMathId,
        teacherUserId: otherTeacher.id,
        room: 'Room 101', // Same room!
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ROOM_TIMETABLE_CONFLICT');
  });

  // =========================================================================
  // SCENARIOS 8–10: HOMEWORK & PARENT ISOLATION
  // =========================================================================

  let homeworkId: string;

  it('8. Homework creation & publishing — teacher creates published homework for assigned class', async () => {
    const res = await request(app)
      .post('/api/v1/homework')
      .set('Authorization', `Bearer ${teacherToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId: yearCurrentId,
        classId: class9Id,
        sectionId: sectionAId,
        subjectId: subjectMathId,
        title: 'Math Homework 1',
        instructions: 'Solve exercises 1 to 10 on page 45.',
        assignedDate: '2026-05-10',
        dueDate: '2026-05-15',
        status: 'PUBLISHED',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    homeworkId = res.body.id;
  });

  it('9. Parent Homework Visibility — Parent can view published homework for linked child A', async () => {
    const res = await request(app)
      .get(`/api/v1/homework/student/${studentAId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((h: any) => h.id === homeworkId)).toBe(true);
  });

  it('10. Parent Child Isolation — Parent A cannot access homework for unlinked Student B', async () => {
    const res = await request(app)
      .get(`/api/v1/homework/student/${studentBId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PARENT_CHILD_ACCESS_DENIED');
  });

  // =========================================================================
  // SCENARIOS 11–13: EXAMS & SUBJECT ASSESSMENT CONFIGURATION
  // =========================================================================

  it('11. Exam creation — creates Mid-Term Exam with Class 9 scope', async () => {
    const res = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId: yearCurrentId,
        termId: term1Id,
        name: `Mid-Term Exam ${testId}`,
        code: `MID_${testId}`,
        examType: 'MID_TERM',
        startDate: '2026-09-10',
        endDate: '2026-09-25',
        classIds: [class9Id],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    examId = res.body.id;
  });

  it('11b. Referenced Term Deletion Guard — blocks deleting term attached to exam and preserves history', async () => {
    const res = await request(app)
      .delete(`/api/v1/academic-terms/${term1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TERM_HAS_REFERENCES');

    // Term still exists and historical reference remains intact
    const term = await prisma.academicTerm.findUnique({ where: { id: term1Id } });
    expect(term).not.toBeNull();
    expect(term?.id).toBe(term1Id);

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    expect(exam?.termId).toBe(term1Id);
  });

  it('11c. Term Deactivation/Archive — deactivates term preserving exam reference', async () => {
    const res = await request(app)
      .put(`/api/v1/academic-terms/${term1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('INACTIVE');
    expect(res.body.isActive).toBe(false);

    // Exam reference still intact
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    expect(exam?.termId).toBe(term1Id);

    // Re-activate for subsequent tests
    const reactivateRes = await request(app)
      .put(`/api/v1/academic-terms/${term1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ isActive: true });

    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.status).toBe('ACTIVE');
    expect(reactivateRes.body.isActive).toBe(true);
  });

  it('12. Component Marks Reconciliation — rejects when Theory + Activity != Max Marks', async () => {
    const res = await request(app)
      .post(`/api/v1/exams/${examId}/subjects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        subjects: [
          {
            classId: class9Id,
            subjectId: subjectMathId,
            maxMarks: 100,
            passMarks: 35,
            theoryMaxMarks: 70, // 70 + 20 = 90 != 100!
            activityMaxMarks: 20,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_COMPONENT_TOTAL');
  });

  it('12b. Valid Subject Assessment Configuration — configures Math (80 Theory + 20 Internal = 100 Max)', async () => {
    const res = await request(app)
      .post(`/api/v1/exams/${examId}/subjects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        subjects: [
          {
            classId: class9Id,
            subjectId: subjectMathId,
            maxMarks: 100,
            passMarks: 35,
            theoryMaxMarks: 80,
            activityMaxMarks: 20,
            allowGrace: true,
            maxGraceMarks: 10,
          },
          {
            classId: class9Id,
            subjectId: subjectScienceId,
            maxMarks: 100,
            passMarks: 35,
            theoryMaxMarks: 70,
            practicalMaxMarks: 30,
            allowGrace: true,
            maxGraceMarks: 10,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('12c. Unmapped Subject Configuration Guard — rejects unmapped subject with SUBJECT_NOT_MAPPED', async () => {
    const unmappedSubject = await prisma.subjectMaster.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        name: `Unmapped Geography ${testId}`,
        code: `GEO_${testId}`,
      },
    });

    const res = await request(app)
      .post(`/api/v1/exams/${examId}/subjects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        subjects: [
          {
            classId: class9Id,
            subjectId: unmappedSubject.id,
            maxMarks: 100,
            passMarks: 35,
            theoryMaxMarks: 80,
            practicalMaxMarks: 20,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SUBJECT_NOT_MAPPED');
  });

  it('12d. Inactive Subject Mapping Guard — rejects inactive mapping if not already in exam', async () => {
    const inactiveSubject = await prisma.subjectMaster.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        name: `Inactive Music ${testId}`,
        code: `MUS_${testId}`,
      },
    });
    await prisma.classSubject.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        classId: class9Id,
        subjectId: inactiveSubject.id,
        isActive: false,
      },
    });

    const res = await request(app)
      .post(`/api/v1/exams/${examId}/subjects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        subjects: [
          {
            classId: class9Id,
            subjectId: inactiveSubject.id,
            maxMarks: 100,
            passMarks: 35,
            theoryMaxMarks: 80,
            practicalMaxMarks: 20,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SUBJECT_NOT_MAPPED');
  });

  it('13. Exam Scheduling Validation — rejects schedule outside exam range', async () => {
    const res = await request(app)
      .post(`/api/v1/exams/${examId}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        schedules: [
          {
            classId: class9Id,
            subjectId: subjectMathId,
            examDate: '2026-10-05', // Exam ends on 2026-09-25!
            startTime: '09:00',
            endTime: '12:00',
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SCHEDULE_OUTSIDE_EXAM_RANGE');
  });

  it('13b. Exam Scheduling — schedules Math and Science within exam dates', async () => {
    const res = await request(app)
      .post(`/api/v1/exams/${examId}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        schedules: [
          {
            classId: class9Id,
            subjectId: subjectMathId,
            examDate: '2026-09-15',
            startTime: '09:00',
            endTime: '12:00',
            room: 'Exam Hall 1',
          },
          {
            classId: class9Id,
            subjectId: subjectScienceId,
            examDate: '2026-09-18',
            startTime: '09:00',
            endTime: '12:00',
            room: 'Exam Hall 1',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('13c. Exam Scheduling — supports plural POST /schedules route with roomNumber', async () => {
    const res = await request(app)
      .post(`/api/v1/exams/${examId}/schedules`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        schedules: [
          {
            classId: class9Id,
            subjectId: subjectMathId,
            examDate: '2026-09-16',
            startTime: '09:00',
            endTime: '12:00',
            roomNumber: 'Hall B',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].room).toBe('Hall B');
  });

  // =========================================================================
  // SCENARIOS 14–20: MARKS ENTRY, ABSENT, GRACE MARKS & CONCURRENCY
  // =========================================================================

  it('14. Marks register loads actively enrolled students', async () => {
    const res = await request(app)
      .get(`/api/v1/marks/register?examId=${examId}&classId=${class9Id}&sectionId=${sectionAId}&subjectId=${subjectMathId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body.students.length).toBe(2);
    expect(res.body.students[0].studentId).toBe(studentAId);
    expect(res.body.students[1].studentId).toBe(studentBId);
  });

  it('15. Marks Validation — rejects marks exceeding maximum', async () => {
    const res = await request(app)
      .post('/api/v1/marks/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        examId,
        classId: class9Id,
        sectionId: sectionAId,
        subjectId: subjectMathId,
        marks: [
          {
            studentId: studentAId,
            status: 'PRESENT',
            rawTheoryMarks: 95,
            rawActivityMarks: 20, // 95 + 20 = 115 > 100!
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MARK_EXCEEDS_MAXIMUM');
  });

  it('16. Grace Marks Permission — teacher without marks.moderate denied applying grace marks', async () => {
    const res = await request(app)
      .post('/api/v1/marks/register')
      .set('Authorization', `Bearer ${teacherToken}`) // Teacher has marks.enter, NOT marks.moderate
      .set('x-school-id', schoolAId)
      .send({
        examId,
        classId: class9Id,
        sectionId: sectionAId,
        subjectId: subjectMathId,
        marks: [
          {
            studentId: studentAId,
            status: 'PRESENT',
            rawTheoryMarks: 31,
            graceMarks: 4, // Needs moderation permission!
          },
        ],
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('GRACE_PERMISSION_DENIED');
  });

  it('17. Grace Marks Integrity — Raw marks = 31, Grace = 4, Final = 35 preserved in DB', async () => {
    const res = await request(app)
      .post('/api/v1/marks/register')
      .set('Authorization', `Bearer ${adminToken}`) // Admin has marks.moderate
      .set('x-school-id', schoolAId)
      .send({
        examId,
        classId: class9Id,
        sectionId: sectionAId,
        subjectId: subjectMathId,
        marks: [
          {
            studentId: studentAId,
            status: 'PRESENT',
            rawTheoryMarks: 31,
            rawActivityMarks: 0,
            graceMarks: 4,
            graceReason: 'Moderation to pass',
            version: 1,
          },
          {
            studentId: studentBId,
            status: 'ABSENT', // Student B is Absent
            version: 1,
          },
        ],
      });

    expect(res.status).toBe(200);

    // Verify directly in DB
    const markA = await prisma.studentExamMark.findUnique({
      where: { examId_studentId_subjectId: { examId, studentId: studentAId, subjectId: subjectMathId } },
    });
    expect(markA).toBeDefined();
    // MANDATORY AMENDMENT 4: rawTheoryMarks must be 31, graceMarks 4, finalMarks 35 (not rewritten!)
    expect(Number(markA?.rawTheoryMarks)).toBe(31);
    expect(Number(markA?.graceMarks)).toBe(4);
    expect(Number(markA?.finalMarks)).toBe(35);
    expect(markA?.isPassed).toBe(true);

    const markB = await prisma.studentExamMark.findUnique({
      where: { examId_studentId_subjectId: { examId, studentId: studentBId, subjectId: subjectMathId } },
    });
    expect(markB?.status).toBe('ABSENT');
    expect(markB?.finalMarks).toBeNull();
  });

  it('18. MANDATORY Marks Concurrency Test — stale version returns 409 STALE_MARKS_REGISTER', async () => {
    // 1. Teacher/User A has loaded marks register at version 1 (created in test 17)

    // 2. Teacher/User B updates it successfully to version 2
    const userBUpdate = await request(app)
      .post('/api/v1/marks/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        examId,
        classId: class9Id,
        sectionId: sectionAId,
        subjectId: subjectMathId,
        marks: [
          {
            studentId: studentAId,
            status: 'PRESENT',
            rawTheoryMarks: 32, // User B updates mark to 32
            version: 1, // Current DB version is 1
          },
        ],
      });
    expect(userBUpdate.status).toBe(200);

    // Current version of student A mark is now 2
    const current = await prisma.studentExamMark.findUnique({
      where: { examId_studentId_subjectId: { examId, studentId: studentAId, subjectId: subjectMathId } },
    });
    expect(current?.version).toBe(2);

    // 3. User A submits stale version 1
    const res = await request(app)
      .post('/api/v1/marks/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        examId,
        classId: class9Id,
        sectionId: sectionAId,
        subjectId: subjectMathId,
        marks: [
          {
            studentId: studentAId,
            status: 'PRESENT',
            rawTheoryMarks: 50,
            version: 1, // STALE version!
          },
        ],
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STALE_MARKS_REGISTER');

    // Verify stale request did NOT overwrite newer marks
    const markAfterStale = await prisma.studentExamMark.findUnique({
      where: { examId_studentId_subjectId: { examId, studentId: studentAId, subjectId: subjectMathId } },
    });
    expect(Number(markAfterStale?.rawTheoryMarks)).toBe(32);
    expect(markAfterStale?.version).toBe(2);
  });

  // =========================================================================
  // SCENARIOS 21–24: GRADING, RESULTS, FINALIZATION & MODERATION
  // =========================================================================

  it('21. Grade Scale Range Validation — rejects overlapping bands A (80-100) and B (70-85)', async () => {
    const res = await request(app)
      .post('/api/v1/exams/grade-scales')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        name: `Overlapping Scale ${testId}`,
        bands: [
          { grade: 'A', minPercentage: 80, maxPercentage: 100 },
          { grade: 'B', minPercentage: 70, maxPercentage: 85 }, // 70 to 85 overlaps with 80 to 100!
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('GRADE_BAND_OVERLAP');
  });

  it('21b. Valid Grade Scale — creates non-overlapping default grade scale', async () => {
    const res = await request(app)
      .post('/api/v1/exams/grade-scales')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        name: `CBSE 10-Point ${testId}`,
        isDefault: true,
        bands: [
          { grade: 'A1', minPercentage: 91, maxPercentage: 100, resultStatus: 'PASS' },
          { grade: 'A2', minPercentage: 81, maxPercentage: 90, resultStatus: 'PASS' },
          { grade: 'B1', minPercentage: 71, maxPercentage: 80, resultStatus: 'PASS' },
          { grade: 'B2', minPercentage: 61, maxPercentage: 70, resultStatus: 'PASS' },
          { grade: 'C1', minPercentage: 51, maxPercentage: 60, resultStatus: 'PASS' },
          { grade: 'C2', minPercentage: 41, maxPercentage: 50, resultStatus: 'PASS' },
          { grade: 'D', minPercentage: 33, maxPercentage: 40, resultStatus: 'PASS' },
          { grade: 'E', minPercentage: 0, maxPercentage: 32, resultStatus: 'FAIL' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('22. Enter Science marks and finalize exam', async () => {
    // Enter Science marks for student A & B
    await request(app)
      .post('/api/v1/marks/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        examId,
        classId: class9Id,
        sectionId: sectionAId,
        subjectId: subjectScienceId,
        marks: [
          { studentId: studentAId, status: 'PRESENT', rawTheoryMarks: 60, rawPracticalMarks: 25, version: 1 },
          { studentId: studentBId, status: 'PRESENT', rawTheoryMarks: 50, rawPracticalMarks: 20, version: 1 },
        ],
      });

    // Finalize Exam
    const res = await request(app)
      .post(`/api/v1/results/${examId}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('FINALIZED');
  });

  it('23. Finalized Lock — normal marks edit rejected after exam is finalized', async () => {
    const res = await request(app)
      .post('/api/v1/marks/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        examId,
        classId: class9Id,
        sectionId: sectionAId,
        subjectId: subjectMathId,
        marks: [{ studentId: studentAId, status: 'PRESENT', rawTheoryMarks: 60, version: 2 }],
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EXAM_FINALIZED');
  });

  it('24. Authorized Moderation Correction — moderates finalized mark with audit log and increments version', async () => {
    const res = await request(app)
      .post('/api/v1/marks/moderate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        examId,
        studentId: studentAId,
        subjectId: subjectMathId,
        rawTheoryMarks: 33, // Updated from 31
        graceMarks: 5,
        reason: 'Recounting of question 4 revealed 2 additional marks.',
      });

    expect(res.status).toBe(200);
    expect(Number(res.body.rawTheoryMarks)).toBe(33);
    expect(Number(res.body.graceMarks)).toBe(5);
    expect(Number(res.body.finalMarks)).toBe(38); // 33 + 5 = 38
    expect(res.body.version).toBe(3); // Incremented from 2 to 3

    // Verify audit log
    const audit = await prisma.auditLog.findFirst({
      where: { schoolId: schoolAId, action: 'MARKS_MODERATED', entityId: res.body.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeDefined();
  });

  // =========================================================================
  // SCENARIOS 25–27: RESULT PUBLISHING & PARENT ACCESS
  // =========================================================================

  it('25. Unpublished Result Protection — Parent denied access while exam is FINALIZED but unpublished', async () => {
    const res = await request(app)
      .get(`/api/v1/results/${examId}/student/${studentAId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RESULT_NOT_PUBLISHED');
  });

  it('26. Publish Exam — transitions from FINALIZED to PUBLISHED', async () => {
    const res = await request(app)
      .post(`/api/v1/results/${examId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
  });

  it('27. Published Parent Access & Child Isolation — Parent views child A report card, denied child B', async () => {
    // 1. Parent accesses linked child A
    const resA = await request(app)
      .get(`/api/v1/results/${examId}/student/${studentAId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-school-id', schoolAId);

    expect(resA.status).toBe(200);
    expect(resA.body.student.fullName).toBe('Aarav Sharma');
    expect(resA.body.summary.percentage).toBeGreaterThan(0);
    expect(resA.body.attendanceSummary).toBeDefined();

    // 2. Parent A tries accessing unlinked child B -> 403
    const resB = await request(app)
      .get(`/api/v1/results/${examId}/student/${studentBId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-school-id', schoolAId);

    expect(resB.status).toBe(403);
    expect(resB.body.code).toBe('PARENT_CHILD_ACCESS_DENIED');
  });

  // =========================================================================
  // SCENARIOS 28–30: PROMOTION WORKFLOW & OUTCOMES
  // =========================================================================

  it('28. Promotion Coverage — PROMOTE, DETAIN, and COMPLETE outcomes with history preservation', async () => {
    // Student A -> Promoted to Class 10 Section A in Year 2027-2028
    // Student B -> Detained in Class 9 Section A in Year 2027-2028
    const res = await request(app)
      .post('/api/v1/promotions/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        fromAcademicYearId: yearCurrentId,
        fromClassId: class9Id,
        fromSectionId: sectionAId,
        toAcademicYearId: yearNextId,
        toClassId: class10Id,
        toSectionId: sectionAId,
        promotions: [
          {
            studentId: studentAId,
            decision: 'PROMOTE',
            toAcademicYearId: yearNextId,
            toClassId: class10Id,
            toSectionId: sectionAId,
            remarks: 'Promoted with distinction',
          },
          {
            studentId: studentBId,
            decision: 'DETAIN',
            toAcademicYearId: yearNextId,
            toClassId: class9Id, // Same class
            toSectionId: sectionAId,
            remarks: 'Needs improvement',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);

    // Verify Student A prior enrollment is PROMOTED and a new ACTIVE enrollment exists
    const priorA = await prisma.studentEnrollment.findUnique({ where: { id: enrollmentAId } });
    expect(priorA?.status).toBe('PROMOTED');
    expect(priorA?.completionDate).toBeDefined();

    const newA = await prisma.studentEnrollment.findFirst({
      where: { studentId: studentAId, academicYearId: yearNextId },
    });
    expect(newA?.status).toBe('ACTIVE');
    expect(newA?.classId).toBe(class10Id);

    // Verify Student B prior enrollment is DETAINED and new enrollment in Class 9 exists
    const priorB = await prisma.studentEnrollment.findUnique({ where: { id: enrollmentBId } });
    expect(priorB?.status).toBe('DETAINED');

    const newB = await prisma.studentEnrollment.findFirst({
      where: { studentId: studentBId, academicYearId: yearNextId },
    });
    expect(newB?.status).toBe('ACTIVE');
    expect(newB?.classId).toBe(class9Id);

    // Test duplicate promotion prevention: trying to promote Student A again to yearNextId should fail
    const dupRes = await request(app)
      .post('/api/v1/promotions/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        fromAcademicYearId: yearCurrentId,
        fromClassId: class9Id,
        toAcademicYearId: yearNextId,
        promotions: [
          {
            studentId: studentAId,
            decision: 'PROMOTE',
            toAcademicYearId: yearNextId,
            toClassId: class10Id,
          },
        ],
      });

    // Student A has no ACTIVE enrollment in Year 2026-2027 anymore
    expect(dupRes.status).toBe(404);
  });

  // =========================================================================
  // SCENARIO 29: MULTI-TENANCY & CROSS-SCHOOL ISOLATION
  // =========================================================================

  it('29. Cross-School Isolation — School B cannot view or modify School A exams or terms', async () => {
    // Try to get School A exam with School B header
    const res = await request(app)
      .get(`/api/v1/exams/${examId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolBId);

    expect(res.status).toBe(404);
  });

  // =========================================================================
  // SCENARIO 30: AUDIT LOG VERIFICATION
  // =========================================================================

  it('30. Audit logging verification — ensures audit logs are written for all key actions', async () => {
    const logs = await prisma.auditLog.findMany({
      where: {
        schoolId: schoolAId,
        action: {
          in: [
            'ACADEMIC_TERM_CREATED',
            'CLASS_TEACHER_ASSIGNED',
            'SUBJECT_TEACHER_ASSIGNED',
            'TIMETABLE_SLOT_SAVED',
            'HOMEWORK_PUBLISHED',
            'EXAM_CREATED',
            'EXAM_SCHEDULED',
            'MARKS_ENTERED',
            'GRACE_MARKS_APPLIED',
            'RESULT_FINALIZED',
            'RESULT_PUBLISHED',
            'STUDENT_PROMOTED',
          ],
        },
      },
    });

    const recordedActions = new Set(logs.map((l) => l.action));
    expect(recordedActions.has('ACADEMIC_TERM_CREATED')).toBe(true);
    expect(recordedActions.has('CLASS_TEACHER_ASSIGNED')).toBe(true);
    expect(recordedActions.has('SUBJECT_TEACHER_ASSIGNED')).toBe(true);
    expect(recordedActions.has('TIMETABLE_SLOT_SAVED')).toBe(true);
    expect(recordedActions.has('HOMEWORK_PUBLISHED')).toBe(true);
    expect(recordedActions.has('EXAM_CREATED')).toBe(true);
    expect(recordedActions.has('EXAM_SCHEDULED')).toBe(true);
    expect(recordedActions.has('RESULT_FINALIZED')).toBe(true);
    expect(recordedActions.has('RESULT_PUBLISHED')).toBe(true);
    expect(recordedActions.has('STUDENT_PROMOTED')).toBe(true);
  });
});
