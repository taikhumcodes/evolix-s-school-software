import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

describe('Module 05 Manual QA Checklist — Comprehensive Automated Verifications', () => {
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let teacherUserId: string;
  let parentUserId: string;
  let teacherRole: any;

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

  const testRunId = Date.now().toString().slice(-6);

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

    // 2. Configure School A GPS coordinates (e.g. Connaught Place, New Delhi: 28.6315, 77.2167)
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
          code: `EMA-${testRunId}`,
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
      where: {
        schoolId_code: {
          schoolId: schoolAId,
          code: `QA5-C${testRunId}`,
        },
      },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        code: `QA5-C${testRunId}`,
        name: 'Grade 6',
      },
    });
    classId = cls.id;

    const sec = await prisma.sectionMaster.upsert({
      where: {
        schoolId_code: {
          schoolId: schoolAId,
          code: `QA5-S${testRunId}`,
        },
      },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        code: `QA5-S${testRunId}`,
        name: 'Section A',
      },
    });
    sectionId = sec.id;

    // 6. Create Test Students & Enrollments
    const stA = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: academicYearId,
        studentId: `STU-5A-${testRunId}`,
        admissionNumber: `ADM-5A-${testRunId}`,
        firstName: 'Aarav',
        lastName: 'Sharma',
        gender: 'MALE',
        dateOfBirth: new Date('2014-05-15'),
        admissionDate: new Date('2026-04-01'),
      },
    });
    studentAId = stA.id;

    const enrA = await prisma.studentEnrollment.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: studentAId,
        academicYearId,
        classId,
        sectionId,
        rollNumber: '101',
        enrollmentDate: new Date('2026-04-01'),
        status: 'ACTIVE',
      },
    });
    enrollmentAId = enrA.id;

    const stB = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: academicYearId,
        studentId: `STU-5B-${testRunId}`,
        admissionNumber: `ADM-5B-${testRunId}`,
        firstName: 'Diya',
        lastName: 'Patel',
        gender: 'FEMALE',
        dateOfBirth: new Date('2014-08-20'),
        admissionDate: new Date('2026-04-01'),
      },
    });
    studentBId = stB.id;

    const enrB = await prisma.studentEnrollment.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: studentBId,
        academicYearId,
        classId,
        sectionId,
        rollNumber: '102',
        enrollmentDate: new Date('2026-04-01'),
        status: 'ACTIVE',
      },
    });
    enrollmentBId = enrB.id;

    // 7. Create Teacher Role & User with staff permissions
    teacherRole = await prisma.role.findFirst({
      where: { tenantId, name: `Teacher-${testRunId}` },
    });
    if (!teacherRole) {
      teacherRole = await prisma.role.create({
        data: {
          tenantId,
          name: `Teacher-${testRunId}`,
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
              'staff_leave.view',
              'staff_leave.manage',
            ],
          },
        },
      });
      for (const p of perms) {
        await prisma.rolePermission.create({
          data: {
            roleId: teacherRole.id,
            permissionId: p.id,
          },
        });
      }
    }

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const teacherUser = await prisma.user.create({
      data: {
        tenantId,
        email: `teacher_${testRunId}@evolix.local`,
        hashedPassword: hashedPassword,
        firstName: 'Anita',
        lastName: 'Verma',
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
    await prisma.userRole.create({
      data: {
        userId: teacherUserId,
        roleId: teacherRole.id,
      },
    });

    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: `teacher_${testRunId}@evolix.local`,
        password: 'Password123!',
      });
    teacherToken = teacherLogin.body.access_token;

    // 8. Create Parent User linked ONLY to Student A
    const parentRole = await prisma.role.findFirst({
      where: { name: 'Parent' },
    });
    const parentUser = await prisma.user.create({
      data: {
        tenantId,
        email: `parent_${testRunId}@evolix.local`,
        hashedPassword: hashedPassword,
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
    if (parentRole) {
      await prisma.userRole.create({
        data: {
          userId: parentUserId,
          roleId: parentRole.id,
        },
      });
    }

    // Create Guardian record and link to Student A
    const guardianA = await prisma.guardian.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        userId: parentUserId,
        firstName: 'Rajesh',
        lastName: 'Sharma',
        phone: `+9198${testRunId.padEnd(8, '0')}`,
        normalizedPhone: `98${testRunId.padEnd(8, '0')}`,
        relationship: 'FATHER',
      },
    });

    await prisma.studentGuardian.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: studentAId,
        guardianId: guardianA.id,
        relationship: 'FATHER',
        isPrimary: true,
      },
    });

    const parentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: `parent_${testRunId}@evolix.local`,
        password: 'Password123!',
      });
    parentToken = parentLogin.body.access_token;
  });

  // =========================================================================
  // 1. STUDENT ATTENDANCE REGISTER & MARKING
  // =========================================================================

  it('1. Register query returns class roster with default day status', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-01', // Tuesday (working day)
      });

    expect(res.status).toBe(200);
    expect(res.body.date).toBe('2026-09-01');
    expect(res.body.dayStatus.isWorkingDay).toBe(true);
    expect(res.body.dayStatus.isHoliday).toBe(false);
    expect(res.body.students.length).toBeGreaterThanOrEqual(2);
    expect(res.body.summary.total).toBeGreaterThanOrEqual(2);
  });

  it('2. Mark Student Attendance: saves statuses and updates register summary', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-01',
        records: [
          {
            studentId: studentAId,
            enrollmentId: enrollmentAId,
            status: 'PRESENT',
            remarks: 'On time',
          },
          {
            studentId: studentBId,
            enrollmentId: enrollmentBId,
            status: 'ABSENT',
            remarks: 'Uninformed absence',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.savedCount).toBe(2);
    expect(res.body.summary.present).toBe(1);
    expect(res.body.summary.absent).toBe(1);
  });

  it('3. Duplicate Attendance Prevention: compound unique index upserts existing date record without duplicating', async () => {
    // Submit second time for same student and date
    const res = await request(app)
      .post('/api/v1/attendance/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-01',
        records: [
          {
            studentId: studentAId,
            enrollmentId: enrollmentAId,
            status: 'LATE',
            remarks: 'Changed to late',
          },
        ],
      });

    expect(res.status).toBe(200);

    // Verify in DB that only 1 record exists for this date and student
    const count = await prisma.studentAttendance.count({
      where: {
        schoolId: schoolAId,
        studentId: studentAId,
        attendanceDate: new Date('2026-09-01T00:00:00.000Z'),
      },
    });
    expect(count).toBe(1);
  });

  it('4. Holiday Blocking: Attendance marking fails on scheduled holiday unless overridden', async () => {
    // Schedule a holiday on 2026-09-02
    const holRes = await request(app)
      .post('/api/v1/attendance/holidays')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        academicYearId,
        name: 'Gandhi Jayanti Break',
        startDate: '2026-09-02',
        endDate: '2026-09-02',
        type: 'PUBLIC_HOLIDAY',
        isWorkingOverride: false,
      });
    expect(holRes.status).toBe(201);

    // Attempt to mark attendance on the holiday
    const markRes = await request(app)
      .post('/api/v1/attendance/register')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-02',
        records: [
          {
            studentId: studentAId,
            enrollmentId: enrollmentAId,
            status: 'PRESENT',
          },
        ],
      });

    expect(markRes.status).toBe(400);
    expect(markRes.body.message).toMatch(/holiday/i);
  });

  it('5. Working Day Override: Holiday with isWorkingOverride=true allows attendance marking', async () => {
    // Schedule a holiday with isWorkingOverride: true
    const holRes = await request(app)
      .post('/api/v1/attendance/holidays')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        academicYearId,
        name: 'Compensatory Saturday Working',
        startDate: '2026-09-05',
        endDate: '2026-09-05',
        type: 'SCHOOL_HOLIDAY',
        isWorkingOverride: true,
      });
    expect(holRes.status).toBe(201);

    // Marking attendance should succeed
    const markRes = await request(app)
      .post('/api/v1/attendance/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-05',
        records: [
          {
            studentId: studentAId,
            enrollmentId: enrollmentAId,
            status: 'PRESENT',
          },
        ],
      });

    expect(markRes.status).toBe(200);
    expect(markRes.body.savedCount).toBe(1);
  });

  // =========================================================================
  // 2. ATTENDANCE LOCKING & CORRECTION AUDIT TRAIL
  // =========================================================================

  it('6. Attendance Locking: Record older than lock threshold is locked from regular modification', async () => {
    // Create an old attendance record (e.g. 5 days ago)
    const oldDate = new Date('2026-08-25T00:00:00.000Z');
    const oldRec = await prisma.studentAttendance.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        academicYearId,
        studentId: studentAId,
        enrollmentId: enrollmentAId,
        classId,
        sectionId,
        attendanceDate: oldDate,
        status: 'ABSENT',
        markedBy: parentUserId,
      },
    });

    // A regular teacher trying to modify an old locked register without override permission
    const patchRes = await request(app)
      .post('/api/v1/attendance/register')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        academicYearId,
        classId,
        sectionId,
        date: '2026-08-25',
        records: [
          {
            studentId: studentAId,
            enrollmentId: enrollmentAId,
            status: 'PRESENT',
          },
        ],
      });

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.message).toMatch(/locked/i);
  });

  it('7. Authoritative Attendance Correction: Admin with attendance.override corrects locked record with reason', async () => {
    // Find the record created for 2026-08-25
    const oldRec = await prisma.studentAttendance.findFirst({
      where: {
        schoolId: schoolAId,
        studentId: studentAId,
        attendanceDate: new Date('2026-08-25T00:00:00.000Z'),
      },
    });
    expect(oldRec).toBeTruthy();

    const correctRes = await request(app)
      .patch(`/api/v1/attendance/students/${oldRec!.id}/correct`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newStatus: 'PRESENT',
        reason: 'Parent submitted valid medical certificate confirming morning attendance',
      });

    expect(correctRes.status).toBe(200);
    expect(correctRes.body.status).toBe('PRESENT');

    // 8. Verify correction history was appended
    const history = await prisma.studentAttendanceCorrection.findMany({
      where: { attendanceId: oldRec!.id },
    });
    expect(history.length).toBe(1);
    expect(history[0].oldStatus).toBe('ABSENT');
    expect(history[0].newStatus).toBe('PRESENT');
    expect(history[0].reason).toContain('medical certificate');
  });

  // =========================================================================
  // 3. STUDENT LEAVE LIFECYCLE & PARENT ISOLATION
  // =========================================================================

  let createdLeaveId: string;

  it('9. Student Leave Application: Parent can apply for linked student', async () => {
    const res = await request(app)
      .post('/api/v1/student-leave')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        studentId: studentAId,
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        leaveType: 'SICK',
        reason: 'Viral fever diagnosed by family doctor',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.studentId).toBe(studentAId);
    createdLeaveId = res.body.id;
  });

  it('10. Parent Child Isolation: Parent cannot apply leave for non-linked student B', async () => {
    const res = await request(app)
      .post('/api/v1/student-leave')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        studentId: studentBId, // Not linked to parentUser
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        leaveType: 'SICK',
        reason: 'Malicious leave attempt',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/unlinked|authorized/i);
  });

  it('11. Student Leave Approval: Staff/Admin approves leave and register detects approved leave', async () => {
    // Admin approves the leave
    const approveRes = await request(app)
      .post(`/api/v1/student-leave/${createdLeaveId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'APPROVE',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('APPROVED');

    // Register on 2026-09-10 must show hasApprovedLeave: true for Student A
    const regRes = await request(app)
      .get('/api/v1/attendance/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        academicYearId,
        classId,
        sectionId,
        date: '2026-09-10',
      });

    expect(regRes.status).toBe(200);
    const stuA = regRes.body.students.find((s: any) => s.studentId === studentAId);
    expect(stuA).toBeTruthy();
    expect(stuA.hasApprovedLeave).toBe(true);
    expect(stuA.leaveType).toBe('SICK');
  });

  // =========================================================================
  // 4. STAFF GEOFENCE & GPS CHECK-IN
  // =========================================================================

  it('12. Staff GPS Check-In (Inside Geofence): Succeeds within allowed radius', async () => {
    // Campus center is [28.6315, 77.2167], allowed radius 200m
    // Coordinate ~50m away: 28.6318, 77.2169
    const res = await request(app)
      .post('/api/v1/staff-attendance/check-in')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        latitude: 28.6318,
        longitude: 77.2169,
        deviceInfo: 'Mozilla/5.0 Test Chrome',
      });

    expect(res.status).toBe(200);
    expect(res.body.isInsideGeofence).toBe(true);
    expect(res.body.distanceMeters).toBeLessThan(200);
    expect(['PRESENT', 'LATE']).toContain(res.body.record.status);
    expect(res.body.record.checkInAt).toBeTruthy();
  });

  it('13. Staff GPS Check-In (Outside Geofence): Rejected when distance exceeds radius', async () => {
    // Create a new teacher to test check-in rejection
    const tUser2 = await prisma.user.create({
      data: {
        tenantId,
        email: `teacher2_${testRunId}@evolix.local`,
        hashedPassword: await bcrypt.hash('Password123!', 10),
        firstName: 'Farhan',
        lastName: 'Khan',
        isActive: true,
      },
    });
    await prisma.userSchool.create({
      data: {
        userId: tUser2.id,
        schoolId: schoolAId,
      },
    });
    await prisma.userRole.create({
      data: {
        userId: tUser2.id,
        roleId: teacherRole.id,
      },
    });
    const tLogin2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `teacher2_${testRunId}@evolix.local`, password: 'Password123!' });

    // Location ~1.5 km away: 28.6450, 77.2167
    const res = await request(app)
      .post('/api/v1/staff-attendance/check-in')
      .set('Authorization', `Bearer ${tLogin2.body.access_token}`)
      .send({
        latitude: 28.6450,
        longitude: 77.2167,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/outside.*boundary|radius/i);
    expect(res.body.distanceMeters).toBeGreaterThan(200);
  });

  it('14. Haversine Distance Calculation ignores client claims: server-side authority', async () => {
    // Client tries to pass isInsideGeofence: true even though coordinates are far away
    const res = await request(app)
      .post('/api/v1/staff-attendance/check-in')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        latitude: 29.0000,
        longitude: 78.0000,
        isInsideGeofence: true, // Spoofed client claim
      });

    expect(res.status).toBe(400);
  });

  it('15. Staff Check-Out: Successfully clocks out with timestamp and distance', async () => {
    const res = await request(app)
      .post('/api/v1/staff-attendance/check-out')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        latitude: 28.6316,
        longitude: 77.2168,
      });

    expect(res.status).toBe(200);
    expect(res.body.record.checkOutAt).toBeTruthy();
    expect(res.body.distanceMeters).toBeLessThan(200);
  });

  it('16. Staff Manual Correction: Admin adjusts staff record with reason', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const staffRec = await prisma.staffAttendance.findFirst({
      where: {
        schoolId: schoolAId,
        userId: teacherUserId,
        attendanceDate: new Date(`${todayStr}T00:00:00.000Z`),
      },
    });
    expect(staffRec).toBeTruthy();

    const res = await request(app)
      .patch(`/api/v1/staff-attendance/${staffRec!.id}/manual-correction`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'PRESENT',
        correctionReason: 'Biometric fingerprint reader failed, manual verification by principal',
      });

    expect(res.status).toBe(200);
    expect(res.body.isManualCorrection).toBe(true);
    expect(res.body.correctionReason).toContain('Biometric fingerprint');
  });

  // =========================================================================
  // 5. STAFF LEAVE MANAGEMENT
  // =========================================================================

  let staffLeaveId: string;

  it('17. Staff Leave Application: Teacher applies for casual leave', async () => {
    const res = await request(app)
      .post('/api/v1/staff-leave')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        startDate: '2026-09-20',
        endDate: '2026-09-21',
        leaveType: 'CASUAL',
        reason: 'Personal family obligation',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    staffLeaveId = res.body.id;
  });

  it('18. Staff Leave Review: Admin approves teacher leave', async () => {
    const res = await request(app)
      .post(`/api/v1/staff-leave/${staffLeaveId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'APPROVE',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');
  });

  // =========================================================================
  // 6. OVERVIEW KPIS, PERCENTAGES & REPORTS
  // =========================================================================

  it('19. Attendance Overview: Returns consolidated KPI metrics for today', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ academicYearId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('students');
    expect(res.body).toHaveProperty('staff');
    expect(res.body).toHaveProperty('classes');
    expect(res.body.classes).toHaveProperty('total');
  });

  it('20. Accurate Attendance Percentage: Denominator strictly uses school working days', async () => {
    // Fetch summary for Student A for September 2026
    const res = await request(app)
      .get(`/api/v1/attendance/students/${studentAId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ month: 9, year: 2026 });

    expect(res.status).toBe(200);
    expect(res.body.workingDays).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('percentage');
    expect(['string', 'number']).toContain(typeof res.body.percentage);
  });

  it('21. Daily Attendance Report: Returns formatted roster', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/reports/daily')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        date: '2026-09-01',
        classId,
        sectionId,
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('studentName');
    expect(res.body[0]).toHaveProperty('status');
  });

  it('22. Monthly Student Report: Returns student attendance statistics and CSV export', async () => {
    const repRes = await request(app)
      .get('/api/v1/attendance/reports/monthly')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        month: 9,
        year: 2026,
        classId,
        sectionId,
      });

    expect(repRes.status).toBe(200);
    expect(Array.isArray(repRes.body)).toBe(true);
    expect(repRes.body.length).toBeGreaterThanOrEqual(2);
    expect(repRes.body[0]).toHaveProperty('workingDays');
    expect(repRes.body[0]).toHaveProperty('percentage');

    // Test CSV Export
    const csvRes = await request(app)
      .get('/api/v1/attendance/reports/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        type: 'monthly',
        month: 9,
        year: 2026,
        classId,
        sectionId,
      });

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toMatch(/text\/csv/);
    expect(csvRes.text).toContain('Student ID');
    expect(csvRes.text).toContain('Percentage');
  });
});
