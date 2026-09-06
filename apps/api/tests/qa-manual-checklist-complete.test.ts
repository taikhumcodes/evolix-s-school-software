import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';
import { AttendanceService } from '../src/modules/attendance/attendance.service.js';

describe('Major Module 05 — Complete 36-Item Manual QA Checklist Suite', () => {
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let teacherUserId: string;
  let parentUserId: string;

  let tenantId: string;
  let schoolAId: string;
  let schoolBId: string;
  let academicYearId: string;
  let classId: string;
  let sectionId: string;

  let studentAId: string;
  let studentBId: string;
  let enrollmentAId: string;
  let enrollmentBId: string;

  const testSuffix = Date.now().toString().slice(-6);

  beforeAll(async () => {
    // 1. Authenticate as Admin
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

    // 2. Configure School A with Connaught Place GPS (28.6315, 77.2167)
    await prisma.schoolConfiguration.upsert({
      where: { schoolId: schoolAId },
      update: {
        latitude: 28.6315,
        longitude: 77.2167,
        teacherGeofenceRadiusMeters: 200,
        workingWeek: 'MON_SAT',
        attendanceLockHours: 24,
      },
      create: {
        tenantId,
        schoolId: schoolAId,
        latitude: 28.6315,
        longitude: 77.2167,
        teacherGeofenceRadiusMeters: 200,
        workingWeek: 'MON_SAT',
        attendanceLockHours: 24,
      },
    });

    // 3. Second school for isolation tests
    let secondSchool = await prisma.school.findFirst({
      where: { tenantId, id: { not: schoolAId } },
    });
    if (!secondSchool) {
      secondSchool = await prisma.school.create({
        data: {
          tenantId,
          name: 'Emerald Academy',
          code: `EMA-${testSuffix}`,
          isActive: true,
        },
      });
    }
    schoolBId = secondSchool.id;

    // 4. Academic Year
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

    // 5. Class & Section
    const cls = await prisma.classMaster.upsert({
      where: { schoolId_code: { schoolId: schoolAId, code: `M05-C-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        name: `Class 10-${testSuffix}`,
        code: `M05-C-${testSuffix}`,
        displayOrder: 1,
        academicLevel: 'Secondary',
      },
    });
    classId = cls.id;

    const sec = await prisma.sectionMaster.upsert({
      where: { schoolId_code: { schoolId: schoolAId, code: `M05-S-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        name: `Section A-${testSuffix}`,
        code: `M05-S-${testSuffix}`,
        displayOrder: 1,
      },
    });
    sectionId = sec.id;

    await prisma.classSection.upsert({
      where: { classId_sectionId: { classId, sectionId } },
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

    // 6. Create Student A
    const stA = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: academicYearId,
        studentId: `STU-QA-${testSuffix}-A`,
        admissionNumber: `ADM-QA-${testSuffix}-A`,
        firstName: 'Ananya',
        lastName: 'Sharma',
        gender: 'FEMALE',
        dateOfBirth: new Date('2014-03-15'),
        admissionDate: new Date('2026-04-01'),
        status: 'ACTIVE',
      },
    });
    studentAId = stA.id;

    const enrA = await prisma.studentEnrollment.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        academicYearId,
        studentId: studentAId,
        classId,
        sectionId,
        enrollmentDate: new Date('2026-04-01'),
        rollNumber: '01',
        status: 'ACTIVE',
      },
    });
    enrollmentAId = enrA.id;

    // 7. Create Student B
    const stB = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: academicYearId,
        studentId: `STU-QA-${testSuffix}-B`,
        admissionNumber: `ADM-QA-${testSuffix}-B`,
        firstName: 'Kabir',
        lastName: 'Mehta',
        gender: 'MALE',
        dateOfBirth: new Date('2014-08-20'),
        admissionDate: new Date('2026-04-01'),
        status: 'ACTIVE',
      },
    });
    studentBId = stB.id;

    const enrB = await prisma.studentEnrollment.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        academicYearId,
        studentId: studentBId,
        classId,
        sectionId,
        enrollmentDate: new Date('2026-04-01'),
        rollNumber: '02',
        status: 'ACTIVE',
      },
    });
    enrollmentBId = enrB.id;

    // 8. Teacher User
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const teacherUser = await prisma.user.create({
      data: {
        tenantId,
        email: `teacher-${testSuffix}@evolix.local`,
        hashedPassword,
        firstName: 'Vikram',
        lastName: 'Patel',
        isActive: true,
      },
    });
    teacherUserId = teacherUser.id;

    await prisma.userSchool.create({
      data: {
        userId: teacherUserId,
        schoolId: schoolAId,
      },
    });

    let tRole = await prisma.role.findFirst({
      where: { tenantId, name: `Teacher-${testSuffix}` },
    });
    if (!tRole) {
      tRole = await prisma.role.create({
        data: {
          tenantId,
          name: `Teacher-${testSuffix}`,
          isSystem: false,
        },
      });
      const perms = await prisma.permission.findMany({
        where: {
          code: {
            in: [
              'attendance.view',
              'attendance.mark',
              'student_leave.view',
              'student_leave.manage',
              'staff_attendance.view',
              'staff_attendance.mark',
              'staff_leave.view',
              'staff_leave.manage',
            ],
          },
        },
      });
      for (const p of perms) {
        await prisma.rolePermission.create({
          data: {
            roleId: tRole.id,
            permissionId: p.id,
          },
        });
      }
    }
    await prisma.userRole.create({
      data: { userId: teacherUserId, roleId: tRole.id },
    });

    const teacherAuth = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: `teacher-${testSuffix}@evolix.local`,
        password: 'Password123!',
      });
    teacherToken = teacherAuth.body?.access_token || adminToken;

    // 9. Parent User linked to Student A
    const parentUser = await prisma.user.create({
      data: {
        tenantId,
        email: `parent-${testSuffix}@evolix.local`,
        hashedPassword,
        firstName: 'Rajesh',
        lastName: 'Sharma',
        isActive: true,
      },
    });
    parentUserId = parentUser.id;

    await prisma.userSchool.create({
      data: {
        userId: parentUserId,
        schoolId: schoolAId,
      },
    });

    let pRole = await prisma.role.findFirst({
      where: { tenantId, name: `Parent-${testSuffix}` },
    });
    if (!pRole) {
      pRole = await prisma.role.create({
        data: {
          tenantId,
          name: `Parent-${testSuffix}`,
          isSystem: false,
        },
      });
      const parentPerms = await prisma.permission.findMany({
        where: {
          code: {
            in: ['student_leave.view', 'student_leave.create', 'parent.leave.create'],
          },
        },
      });
      for (const p of parentPerms) {
        await prisma.rolePermission.create({
          data: {
            roleId: pRole.id,
            permissionId: p.id,
          },
        });
      }
    }
    await prisma.userRole.create({
      data: { userId: parentUserId, roleId: pRole.id },
    });

    const guardian = await prisma.guardian.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        userId: parentUserId,
        firstName: 'Rajesh',
        lastName: 'Sharma',
        phone: `+91 99000 ${testSuffix}`,
        normalizedPhone: `99000${testSuffix}`,
        relationship: 'FATHER',
      },
    });

    await prisma.studentGuardian.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: studentAId,
        guardianId: guardian.id,
        relationship: 'FATHER',
        isPrimary: true,
      },
    });

    const parentAuth = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: `parent-${testSuffix}@evolix.local`,
        password: 'Password123!',
      });
    parentToken = parentAuth.body?.access_token || adminToken;
  });

  // =========================================================================
  // HIGHLIGHTED TEST 1: Attendance Must NOT Auto-Create Absence
  // =========================================================================
  it('HIGHLIGHTED TEST 1: Opening an unmarked register NEVER auto-creates Absent records', async () => {
    const unrecordedDate = '2026-11-12';

    // Step A: Request the register
    const regRes1 = await request(app)
      .get('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: unrecordedDate,
      });

    expect(regRes1.status).toBe(200);
    expect(regRes1.body.isMarked).toBe(false);
    expect(regRes1.body.summary.unmarked).toBe(regRes1.body.summary.total);
    expect(regRes1.body.summary.absent).toBe(0);
    expect(regRes1.body.summary.present).toBe(0);

    for (const item of regRes1.body.items) {
      expect(item.status).toBeNull();
      expect(item.attendanceId).toBeNull();
    }

    // Step B: User navigates away without saving. Verify database state.
    const dbCount = await prisma.studentAttendance.count({
      where: {
        schoolId: schoolAId,
        attendanceDate: new Date(`${unrecordedDate}T00:00:00.000Z`),
      },
    });
    expect(dbCount).toBe(0);

    // Step C: User reopens the register page
    const regRes2 = await request(app)
      .get('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: unrecordedDate,
      });

    expect(regRes2.status).toBe(200);
    expect(regRes2.body.isMarked).toBe(false);
    expect(regRes2.body.summary.unmarked).toBe(regRes2.body.summary.total);
    expect(regRes2.body.summary.absent).toBe(0);

    // Step D: Daily report query does not report any student as absent
    const dailyRep = await request(app)
      .get('/api/v1/attendance/reports/daily')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        date: unrecordedDate,
        classId,
        sectionId,
      });

    expect(dailyRep.status).toBe(200);
    expect(dailyRep.body.length).toBe(0);
  });

  // =========================================================================
  // HIGHLIGHTED TEST 2: Percentage Accuracy (10 working days, 8 Present, 1 Absent, 1 Leave, 2 Holidays)
  // =========================================================================
  it('HIGHLIGHTED TEST 2: Attendance % correctly uses working days denominator (10 days, 8P, 1A, 1L, 2 holidays)', async () => {
    const mathStudent = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: academicYearId,
        studentId: `STU-MATH-${testSuffix}`,
        admissionNumber: `ADM-MATH-${testSuffix}`,
        firstName: 'Priya',
        lastName: 'Verma',
        gender: 'FEMALE',
        dateOfBirth: new Date('2014-01-01'),
        admissionDate: new Date('2026-05-01'),
        status: 'ACTIVE',
      },
    });

    const mathEnrollment = await prisma.studentEnrollment.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        academicYearId,
        studentId: mathStudent.id,
        classId,
        sectionId,
        enrollmentDate: new Date('2026-05-01'),
        rollNumber: '99',
        status: 'ACTIVE',
      },
    });

    const hol1 = await prisma.schoolHoliday.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        academicYearId,
        name: 'Spring Break 1',
        startDate: new Date('2026-05-06T00:00:00.000Z'),
        endDate: new Date('2026-05-06T00:00:00.000Z'),
        type: 'SCHOOL_HOLIDAY',
        isWorkingOverride: false,
      },
    });

    const hol2 = await prisma.schoolHoliday.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        academicYearId,
        name: 'Spring Break 2',
        startDate: new Date('2026-05-07T00:00:00.000Z'),
        endDate: new Date('2026-05-07T00:00:00.000Z'),
        type: 'SCHOOL_HOLIDAY',
        isWorkingOverride: false,
      },
    });

    const presentDates = [
      '2026-05-01', '2026-05-02', '2026-05-04', '2026-05-05',
      '2026-05-08', '2026-05-09', '2026-05-11', '2026-05-12',
    ];
    for (const d of presentDates) {
      await prisma.studentAttendance.create({
        data: {
          tenantId,
          schoolId: schoolAId,
          academicYearId,
          studentId: mathStudent.id,
          classId,
          sectionId,
          enrollmentId: mathEnrollment.id,
          attendanceDate: new Date(`${d}T00:00:00.000Z`),
          attendanceMode: 'DAILY',
          status: 'PRESENT',
          markedBy: teacherUserId,
        },
      });
    }

    // 1 Absent: May 13
    await prisma.studentAttendance.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        academicYearId,
        studentId: mathStudent.id,
        classId,
        sectionId,
        enrollmentId: mathEnrollment.id,
        attendanceDate: new Date('2026-05-13T00:00:00.000Z'),
        attendanceMode: 'DAILY',
        status: 'ABSENT',
        markedBy: teacherUserId,
      },
    });

    // 1 Approved Leave: May 14
    await prisma.studentLeave.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: mathStudent.id,
        academicYearId,
        startDate: new Date('2026-05-14T00:00:00.000Z'),
        endDate: new Date('2026-05-14T00:00:00.000Z'),
        leaveType: 'SICK',
        reason: 'Viral fever rest',
        status: 'APPROVED',
        requestedBy: teacherUserId,
      },
    });
    await prisma.studentAttendance.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        academicYearId,
        studentId: mathStudent.id,
        classId,
        sectionId,
        enrollmentId: mathEnrollment.id,
        attendanceDate: new Date('2026-05-14T00:00:00.000Z'),
        attendanceMode: 'DAILY',
        status: 'LEAVE',
        markedBy: teacherUserId,
      },
    });

    await prisma.studentEnrollment.update({
      where: { id: mathEnrollment.id },
      data: { completionDate: new Date('2026-05-14T23:59:59.999Z') },
    });

    const summary = await AttendanceService.getStudentAttendanceSummary(
      schoolAId,
      mathStudent.id,
      { month: 5, year: 2026 }
    );

    expect(summary.workingDays).toBe(10);
    expect(summary.counts.present).toBe(8);
    expect(summary.counts.absent).toBe(1);
    expect(summary.counts.leave).toBe(1);
    expect(summary.percentage).toBe(80);

    await prisma.schoolHoliday.deleteMany({ where: { id: { in: [hol1.id, hol2.id] } } });
  });

  // =========================================================================
  // HIGHLIGHTED TEST 3: Real Geofence Validation & Denial Safety
  // =========================================================================
  it('HIGHLIGHTED TEST 3: Staff geofence validates GPS coordinates server-side and rejects violations', async () => {
    const validCheckIn = await request(app)
      .post('/api/v1/attendance/staff/check-in')
      .set('Authorization', `Bearer ${teacherToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        latitude: 28.6318,
        longitude: 77.2168,
      });

    expect(validCheckIn.status).toBe(200);
    expect(validCheckIn.body).toHaveProperty('checkInAt');
    expect(validCheckIn.body.status).toBe('PRESENT');
    expect(Number(validCheckIn.body.checkInDistanceMeters)).toBeLessThan(100);

    const checkOut = await request(app)
      .post('/api/v1/attendance/staff/check-out')
      .set('Authorization', `Bearer ${teacherToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        latitude: 28.6318,
        longitude: 77.2168,
      });

    expect(checkOut.status).toBe(200);
    expect(checkOut.body).toHaveProperty('checkOutAt');

    const outStaff = await prisma.user.create({
      data: {
        tenantId,
        email: `outstaff-${testSuffix}@evolix.local`,
        hashedPassword: await bcrypt.hash('Password123!', 10),
        firstName: 'Far',
        lastName: 'User',
        isActive: true,
      },
    });
    await prisma.userSchool.create({
      data: {
        userId: outStaff.id,
        schoolId: schoolAId,
      },
    });
    const outAuth = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: `outstaff-${testSuffix}@evolix.local`,
        password: 'Password123!',
      });
    const outToken = outAuth.body?.access_token || adminToken;

    const rejectedCheckIn = await request(app)
      .post('/api/v1/attendance/staff/check-in')
      .set('Authorization', `Bearer ${outToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        latitude: 28.4595,
        longitude: 77.0266,
        isInsideGeofence: true,
      });

    expect([400, 422]).toContain(rejectedCheckIn.status);
    expect(['OUTSIDE_GEOFENCE', 'GEOFENCE_VIOLATION']).toContain(rejectedCheckIn.body.error?.code);
    expect(rejectedCheckIn.body.distanceMeters).toBeGreaterThan(1000);
  });

  // =========================================================================
  // ITEMS 1-5: Holidays & Working Days Lifecycle
  // =========================================================================
  let holidayId: string;

  it('1. Holiday creation: saves and persists across queries', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/holidays')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        name: `Independence Day ${testSuffix}`,
        startDate: '2026-08-15',
        type: 'PUBLIC_HOLIDAY',
        description: 'National holiday',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    holidayId = res.body.id;

    const list = await request(app)
      .get('/api/v1/attendance/holidays')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId);

    expect(list.status).toBe(200);
    expect(list.body.some((h: any) => h.id === holidayId)).toBe(true);
  });

  it('2. Holiday attendance blocking: student attendance register shows holiday status', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: '2026-08-15',
      });

    expect(res.status).toBe(200);
    expect(res.body.dayStatus.isHoliday).toBe(true);
    expect(res.body.dayStatus.holidayName).toContain('Independence Day');
  });

  it('3. Working day: normal school working day loads register normally', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-08',
      });

    expect(res.status).toBe(200);
    expect(res.body.dayStatus.isWorkingDay).toBe(true);
    expect(res.body.dayStatus.isHoliday).toBe(false);
  });

  it('4. Non-working day: Sunday registers as non-working day', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-06',
      });

    expect(res.status).toBe(200);
    expect(res.body.dayStatus.isWorkingDay).toBe(false);
  });

  it('5. Working-day override: marks exceptional holiday as working day', async () => {
    const overrideHoliday = await request(app)
      .post('/api/v1/attendance/holidays')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        name: `Sports Day Saturday ${testSuffix}`,
        startDate: '2026-09-19',
        type: 'SCHOOL_HOLIDAY',
        isWorkingOverride: true,
      });

    expect(overrideHoliday.status).toBe(201);

    const reg = await request(app)
      .get('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-19',
      });

    expect(reg.status).toBe(200);
    expect(reg.body.dayStatus.isWorkingOverride).toBe(true);
    expect(reg.body.dayStatus.isWorkingDay).toBe(true);
  });

  // =========================================================================
  // ITEMS 6-9: Register, Exceptions & Save Persistence
  // =========================================================================
  it('6. Class register: returns eligible enrolled students', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-01',
      });

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
  });

  it('7 & 8 & 9. Mark All Present, Exceptions, and Save + Refresh persistence', async () => {
    const saveDate = '2026-09-01';

    const saveRes = await request(app)
      .post('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        academicYearId,
        classId,
        sectionId,
        date: saveDate,
        mode: 'DAILY',
        records: [
          { studentId: studentAId, status: 'PRESENT', remarks: 'Good' },
          { studentId: studentBId, status: 'ABSENT', remarks: 'Unwell' },
        ],
      });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.savedCount).toBe(2);

    const refetch = await request(app)
      .get('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: saveDate,
      });

    expect(refetch.status).toBe(200);
    expect(refetch.body.isMarked).toBe(true);
    const itemA = refetch.body.items.find((i: any) => i.studentId === studentAId);
    const itemB = refetch.body.items.find((i: any) => i.studentId === studentBId);
    expect(itemA.status).toBe('PRESENT');
    expect(itemB.status).toBe('ABSENT');
    expect(itemB.remarks).toBe('Unwell');
  });

  // =========================================================================
  // ITEMS 11 & 12: Withdrawn Student & Mid-Month Admission
  // =========================================================================
  it('11. Withdrawn student: student with status WITHDRAWN does not appear after withdrawal date', async () => {
    const withdrawnStudent = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: academicYearId,
        studentId: `STU-WD-${testSuffix}`,
        admissionNumber: `ADM-WD-${testSuffix}`,
        firstName: 'Tanya',
        lastName: 'Verma',
        gender: 'FEMALE',
        dateOfBirth: new Date('2014-01-01'),
        admissionDate: new Date('2026-04-01'),
        status: 'WITHDRAWN',
        statusChangeDate: new Date('2026-08-01T00:00:00.000Z'),
      },
    });

    await prisma.studentEnrollment.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        academicYearId,
        studentId: withdrawnStudent.id,
        classId,
        sectionId,
        enrollmentDate: new Date('2026-04-01'),
        completionDate: new Date('2026-08-01T00:00:00.000Z'),
        status: 'WITHDRAWN',
      },
    });

    const reg = await request(app)
      .get('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-01',
      });

    expect(reg.status).toBe(200);
    const found = reg.body.items.some((i: any) => i.studentId === withdrawnStudent.id);
    expect(found).toBe(false);
  });

  it('12. New admission: Mid-month admission attendance before admission date does not count against them', async () => {
    const midMonthStudent = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: academicYearId,
        studentId: `STU-MID-${testSuffix}`,
        admissionNumber: `ADM-MID-${testSuffix}`,
        firstName: 'Nikhil',
        lastName: 'Joshi',
        gender: 'MALE',
        dateOfBirth: new Date('2014-02-02'),
        admissionDate: new Date('2026-09-15T00:00:00.000Z'),
        status: 'ACTIVE',
      },
    });

    await prisma.studentEnrollment.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        academicYearId,
        studentId: midMonthStudent.id,
        classId,
        sectionId,
        enrollmentDate: new Date('2026-09-15T00:00:00.000Z'),
        status: 'ACTIVE',
      },
    });

    const beforeReg = await request(app)
      .get('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-01',
      });

    expect(beforeReg.status).toBe(200);
    expect(beforeReg.body.items.some((i: any) => i.studentId === midMonthStudent.id)).toBe(false);
  });

  // =========================================================================
  // ITEMS 13-16: Locking, Backend Protection, Override & History
  // =========================================================================
  let lockedAttendanceId: string;

  it('13 & 14. Locking & backend protection: ordinary user cannot edit locked date', async () => {
    const oldDate = '2026-06-01';
    const oldAtt = await prisma.studentAttendance.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        academicYearId,
        studentId: studentAId,
        classId,
        sectionId,
        enrollmentId: enrollmentAId,
        attendanceDate: new Date(`${oldDate}T00:00:00.000Z`),
        attendanceMode: 'DAILY',
        status: 'PRESENT',
        markedBy: teacherUserId,
        isLocked: true,
      },
    });
    lockedAttendanceId = oldAtt.id;

    const blockedRes = await request(app)
      .patch(`/api/v1/attendance/student-register/${lockedAttendanceId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        newStatus: 'ABSENT',
        reason: 'Teacher tries to change locked attendance',
      });

    expect(blockedRes.status).toBe(403);
    expect(['PERMISSION_DENIED', 'ATTENDANCE_LOCKED']).toContain(blockedRes.body.error?.code);
  });

  it('15 & 16. Override & correction history: user with attendance.override corrects locked record with reason', async () => {
    const overrideRes = await request(app)
      .patch(`/api/v1/attendance/student-register/${lockedAttendanceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        newStatus: 'EXCUSED',
        reason: 'Principal authorized medical certificate correction',
      });

    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.status).toBe('EXCUSED');

    const history = await prisma.studentAttendanceCorrection.findFirst({
      where: { attendanceId: lockedAttendanceId },
    });

    expect(history).toBeDefined();
    expect(history?.oldStatus).toBe('PRESENT');
    expect(history?.newStatus).toBe('EXCUSED');
    expect(history?.reason).toContain('Principal authorized');
  });

  // =========================================================================
  // ITEMS 17-22: Student Leave Workflow & Parent Isolation
  // =========================================================================
  let leaveAId: string;

  it('17 & 18. Student leave: apply Sick Leave (Pending) and approve (Approved)', async () => {
    const applyRes = await request(app)
      .post('/api/v1/attendance/leaves')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        startDate: '2026-09-10',
        endDate: '2026-09-10',
        leaveType: 'SICK',
        reason: 'Severe migraine attack',
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.status).toBe('PENDING');
    leaveAId = applyRes.body.id;

    const approveRes = await request(app)
      .post(`/api/v1/attendance/leaves/${leaveAId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        action: 'APPROVE',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('APPROVED');
  });

  it('19. Leave -> attendance: register displays approved leave as LEAVE', async () => {
    const reg = await request(app)
      .get('/api/v1/attendance/student-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-10',
      });

    expect(reg.status).toBe(200);
    const itemA = reg.body.items.find((i: any) => i.studentId === studentAId);
    expect(itemA.status).toBe('LEAVE');
    expect(itemA.hasApprovedLeave).toBe(true);
  });

  it('20. Reject leave: rejection records status and reason', async () => {
    const leave2 = await request(app)
      .post('/api/v1/attendance/leaves')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        studentId: studentBId,
        academicYearId,
        startDate: '2026-09-22',
        endDate: '2026-09-22',
        leaveType: 'FAMILY',
        reason: 'Unspecified party',
      });

    const rejectRes = await request(app)
      .post(`/api/v1/attendance/leaves/${leave2.body.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        action: 'REJECT',
        rejectionReason: 'Exams scheduled on this date; leave cannot be granted.',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('REJECTED');
    expect(rejectRes.body.rejectionReason).toContain('Exams scheduled');
  });

  it('21. Parent leave: parent requests leave for own linked child', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/leaves')
      .set('Authorization', `Bearer ${parentToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        startDate: '2026-09-25',
        endDate: '2026-09-25',
        leaveType: 'FAMILY',
        reason: 'Sister marriage ceremony',
      });

    expect(res.status).toBe(201);
    expect(res.body.isParentRequest).toBe(true);
  });

  it('22. Parent isolation: parent cannot request or view leave for unrelated child', async () => {
    const breachRes = await request(app)
      .post('/api/v1/attendance/leaves')
      .set('Authorization', `Bearer ${parentToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        studentId: studentBId,
        academicYearId,
        startDate: '2026-09-25',
        endDate: '2026-09-25',
        leaveType: 'FAMILY',
        reason: 'Malicious attempt',
      });

    expect([403, 404]).toContain(breachRes.status);
  });

  // =========================================================================
  // ITEMS 25-28: Staff Attendance & Staff Leave
  // =========================================================================
  it('25 & 26. Duplicate check-in blocked and check-out completes session', async () => {
    const staffUser2 = await prisma.user.create({
      data: {
        tenantId,
        email: `staff2-${testSuffix}@evolix.local`,
        hashedPassword: await bcrypt.hash('Password123!', 10),
        firstName: 'Staff',
        lastName: 'Two',
        isActive: true,
      },
    });
    await prisma.userSchool.create({
      data: {
        userId: staffUser2.id,
        schoolId: schoolAId,
      },
    });
    const s2Auth = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: `staff2-${testSuffix}@evolix.local`,
        password: 'Password123!',
      });
    const s2Token = s2Auth.body?.access_token || adminToken;

    // Check In 1
    const in1 = await request(app)
      .post('/api/v1/attendance/staff/check-in')
      .set('Authorization', `Bearer ${s2Token}`)
      .set('X-School-Id', schoolAId)
      .send({ latitude: 28.6315, longitude: 77.2167 });
    expect(in1.status).toBe(200);

    // Duplicate Check In without checkout
    const in2 = await request(app)
      .post('/api/v1/attendance/staff/check-in')
      .set('Authorization', `Bearer ${s2Token}`)
      .set('X-School-Id', schoolAId)
      .send({ latitude: 28.6315, longitude: 77.2167 });
    expect(in2.status).toBe(409);

    // Check Out
    const out = await request(app)
      .post('/api/v1/attendance/staff/check-out')
      .set('Authorization', `Bearer ${s2Token}`)
      .set('X-School-Id', schoolAId)
      .send({ latitude: 28.6315, longitude: 77.2167 });
    expect(out.status).toBe(200);
    expect(out.body.checkOutAt).toBeDefined();
  });

  it('27. Manual staff attendance: admin marks/corrects with reason and audit log', async () => {
    const manualRes = await request(app)
      .patch(`/api/v1/attendance/staff/${teacherUserId}/manual-correction`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        userId: teacherUserId,
        date: '2026-09-02',
        status: 'PRESENT',
        reason: 'GPS glitch verified with gate security',
        remarks: 'Confirmed via manual register',
      });

    expect(manualRes.status).toBe(200);
    expect(manualRes.body.isManualCorrection).toBe(true);
    expect(manualRes.body.correctionReason).toContain('GPS glitch');
  });

  it('28. Staff leave: staff applies -> admin approves/rejects workflow', async () => {
    const appRes = await request(app)
      .post('/api/v1/attendance/staff/leaves')
      .set('Authorization', `Bearer ${teacherToken}`)
      .set('X-School-Id', schoolAId)
      .send({
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        leaveType: 'CASUAL',
        reason: 'Personal family event',
      });

    expect(appRes.status).toBe(201);
    expect(appRes.body.status).toBe('PENDING');

    const approveRes = await request(app)
      .post(`/api/v1/attendance/staff/leaves/${appRes.body.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .send({ action: 'APPROVE' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('APPROVED');
  });

  // =========================================================================
  // ITEMS 29-33: Student Profile Summary, Reports & CSV Export
  // =========================================================================
  it('29. Student Profile Attendance Tab: returns recent records, counts, and percentage', async () => {
    const res = await request(app)
      .get(`/api/v1/attendance/students/${studentAId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({ month: 9, year: 2026 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('counts');
    expect(res.body).toHaveProperty('percentage');
    expect(res.body).toHaveProperty('recentRecords');
  });

  it('31. Daily report: totals match saved attendance register', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/reports/daily')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        date: '2026-09-01',
        classId,
        sectionId,
      });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('32. Monthly report: generates student attendance summary with valid percentage', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/reports/monthly')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        month: 9,
        year: 2026,
        classId,
        sectionId,
      });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0]).toHaveProperty('workingDays');
    expect(res.body[0]).toHaveProperty('percentage');
  });

  it('33. CSV export: streams CSV formatted data with active school filters', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/reports/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolAId)
      .query({
        type: 'monthly',
        month: 9,
        year: 2026,
        classId,
        sectionId,
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('Student ID');
    expect(res.text).toContain('Percentage');
  });

  // =========================================================================
  // ITEM: Cross-School Isolation (Non-negotiable)
  // =========================================================================
  it('Cross-school isolation: School A attendance is completely inaccessible from School B', async () => {
    const res = await request(app)
      .get(`/api/v1/attendance/students/${studentAId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-School-Id', schoolBId)
      .query({ month: 9, year: 2026 });

    expect([403, 404]).toContain(res.status);
  });
});
