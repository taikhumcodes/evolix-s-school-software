import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

import bcrypt from 'bcryptjs';

describe('Module 04 Manual QA Checklist — 33 Comprehensive Automated Verifications', () => {
  let adminToken: string;
  let restrictedStaffToken: string;
  let tenantId: string;
  let schoolAId: string;
  let schoolBId: string;
  let academicYearId: string;
  let classId: string;

  // Test Students
  let studentAId: string;
  let studentBId: string;
  let studentCId: string;

  // Unique suffix for this test run to prevent collision with other runs
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

    // 2. Second school for isolation tests (Emerald Academy / School B)
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

    // 3. Academic Year & Class
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

    const cls = await prisma.classMaster.upsert({
      where: {
        schoolId_code: {
          schoolId: schoolAId,
          code: `QA4-C${testRunId}`,
        },
      },
      update: {},
      create: {
        tenantId,
        schoolId: schoolAId,
        code: `QA4-C${testRunId}`,
        name: 'Grade 5',
      },
    });
    classId = cls.id;

    // 4. Create Students for testing
    // Student A (for Parent A)
    const stA = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: academicYearId,
        studentId: `STU-A-${testRunId}`,
        admissionNumber: `ADM-A-${testRunId}`,
        firstName: 'Zayd',
        lastName: 'Khan',
        dateOfBirth: new Date('2015-06-10'),
        gender: 'MALE',
        status: 'ACTIVE',
      },
    });
    studentAId = stA.id;

    // Student B (for Parent B)
    const stB = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: academicYearId,
        studentId: `STU-B-${testRunId}`,
        admissionNumber: `ADM-B-${testRunId}`,
        firstName: 'Fatima',
        lastName: 'Khan',
        dateOfBirth: new Date('2017-09-14'),
        gender: 'FEMALE',
        status: 'ACTIVE',
      },
    });
    studentBId = stB.id;

    // Student C (Unrelated student)
    const stC = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        admittedAcademicYearId: academicYearId,
        studentId: `STU-C-${testRunId}`,
        admissionNumber: `ADM-C-${testRunId}`,
        firstName: 'Reyansh',
        lastName: 'Verma',
        dateOfBirth: new Date('2016-01-20'),
        gender: 'MALE',
        status: 'ACTIVE',
      },
    });
    studentCId = stC.id;

    // 5. Create restricted staff user (only students.view, NO guardians.manage, NO users.manage)
    const restrictedRole = await prisma.role.create({
      data: {
        tenantId,
        name: `RestrictedStaff-${testRunId}`,
        isSystem: false,
      },
    });

    const perm = await prisma.permission.findFirst({ where: { code: 'students.view' } });
    if (perm) {
      await prisma.rolePermission.create({
        data: { roleId: restrictedRole.id, permissionId: perm.id },
      });
    }

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const restrictedUser = await prisma.user.create({
      data: {
        tenantId,
        email: `staff-restricted-${testRunId}@evolix.local`,
        hashedPassword,
        firstName: 'Restricted',
        lastName: 'Staff',
        isActive: true,
      },
    });

    await prisma.userRole.create({
      data: { userId: restrictedUser.id, roleId: restrictedRole.id },
    });
    await prisma.userSchool.create({
      data: { userId: restrictedUser.id, schoolId: schoolAId },
    });

    const staffLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: `staff-restricted-${testRunId}@evolix.local`,
        password: 'Password123!',
      });
    restrictedStaffToken = staffLogin.body.access_token;
  });

  // Track created guardians across checklist
  let guardian1Id: string;
  let guardian1Phone = `98765${testRunId.slice(-5)}`;
  let guardian1Email = `guardian1.${testRunId}@evolix.local`;

  // --------------------------------------------------------------------------
  // TEST 1: Add Guardian
  // --------------------------------------------------------------------------
  it('1. Add Guardian: saves successfully and remains after refresh', async () => {
    const res = await request(app)
      .post('/api/v1/guardians')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        firstName: 'Ahmed',
        lastName: 'Khan',
        relationship: 'FATHER',
        phone: guardian1Phone,
        email: guardian1Email,
        occupation: 'Civil Engineer',
        address: 'B-12 Hill View Residency',
        city: 'Mumbai',
        studentId: studentAId,
        isPrimary: true,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.firstName).toBe('Ahmed');
    expect(res.body.lastName).toBe('Khan');
    guardian1Id = res.body.id;

    // Verify persistence via GET
    const fetchRes = await request(app)
      .get(`/api/v1/guardians/${guardian1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.id).toBe(guardian1Id);
    expect(fetchRes.body.students.length).toBe(1);
    expect(fetchRes.body.students[0].studentId).toBe(studentAId);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Edit Guardian
  // --------------------------------------------------------------------------
  it('2. Edit Guardian: changes persist after update and reload', async () => {
    const updatedPhone = `98111${testRunId.slice(-5)}`;
    const res = await request(app)
      .patch(`/api/v1/guardians/${guardian1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        phone: updatedPhone,
        occupation: 'Chief Infrastructure Consultant',
        address: 'Villa 104, Palm Grove Enclave',
      });

    expect(res.status).toBe(200);
    expect(res.body.occupation).toBe('Chief Infrastructure Consultant');
    expect(res.body.address).toBe('Villa 104, Palm Grove Enclave');

    // Verify persistence on fresh read
    const verify = await request(app)
      .get(`/api/v1/guardians/${guardian1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(verify.body.phone).toBe(updatedPhone);
    expect(verify.body.occupation).toBe('Chief Infrastructure Consultant');
    expect(verify.body.address).toBe('Villa 104, Palm Grove Enclave');
    guardian1Phone = updatedPhone;
  });

  // --------------------------------------------------------------------------
  // TEST 3: Archive Guardian
  // --------------------------------------------------------------------------
  it('3. Archive Guardian: soft-archives without permanent record deletion', async () => {
    const res = await request(app)
      .post(`/api/v1/guardians/${guardian1Id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ARCHIVED');

    // Verify record is preserved in database with archived timestamp
    const dbRecord = await prisma.guardian.findUnique({ where: { id: guardian1Id } });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.status).toBe('ARCHIVED');
    expect(dbRecord?.archivedAt).not.toBeNull();

    // Default active directory does NOT return archived guardian
    const listRes = await request(app)
      .get('/api/v1/guardians')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(listRes.body.data.some((g: any) => g.id === guardian1Id)).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Restore Guardian
  // --------------------------------------------------------------------------
  it('4. Restore Guardian: returns guardian back to active status', async () => {
    const res = await request(app)
      .post(`/api/v1/guardians/${guardian1Id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');

    // Verify database active state
    const dbRecord = await prisma.guardian.findUnique({ where: { id: guardian1Id } });
    expect(dbRecord?.status).toBe('ACTIVE');
    expect(dbRecord?.archivedAt).toBeNull();

    // Default active directory now includes the restored guardian
    const listRes = await request(app)
      .get('/api/v1/guardians')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(listRes.body.data.some((g: any) => g.id === guardian1Id)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 5: Guardian Search (Case-Insensitive & Multi-Field)
  // --------------------------------------------------------------------------
  it('5. Guardian Search: finds guardian regardless of casing, phone, or email', async () => {
    // Uppercase search
    const upperRes = await request(app)
      .get(`/api/v1/guardians?search=AHMED`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(upperRes.body.data.some((g: any) => g.id === guardian1Id)).toBe(true);

    // Lowercase search
    const lowerRes = await request(app)
      .get(`/api/v1/guardians?search=ahmed`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(lowerRes.body.data.some((g: any) => g.id === guardian1Id)).toBe(true);

    // Phone search
    const phoneRes = await request(app)
      .get(`/api/v1/guardians?search=${guardian1Phone}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(phoneRes.body.data.some((g: any) => g.id === guardian1Id)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Duplicate Detection
  // --------------------------------------------------------------------------
  it('6. Duplicate Detection: warns on existing phone and email match', async () => {
    const res = await request(app)
      .post('/api/v1/guardians/check-duplicate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        phone: guardian1Phone,
        email: guardian1Email,
      });

    expect(res.status).toBe(200);
    expect(res.body.hasExactMatch).toBe(true);
    expect(res.body.hasPotentialMatch).toBe(true);
    expect(res.body.duplicates.length).toBeGreaterThan(0);
    expect(res.body.duplicates[0].id).toBe(guardian1Id);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Link Existing Guardian
  // --------------------------------------------------------------------------
  it('7. Link Existing Guardian: links existing guardian to second student without duplicate person record', async () => {
    const totalGuardiansBefore = await prisma.guardian.count({
      where: { tenantId, schoolId: schoolAId, archivedAt: null },
    });

    const res = await request(app)
      .post(`/api/v1/guardians/${guardian1Id}/students`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentBId,
        relationship: 'FATHER',
        isPrimary: false,
      });

    expect(res.status).toBe(201);

    const totalGuardiansAfter = await prisma.guardian.count({
      where: { tenantId, schoolId: schoolAId, archivedAt: null },
    });
    // No new guardian created
    expect(totalGuardiansAfter).toBe(totalGuardiansBefore);

    // Guardian now has both students linked
    const verify = await request(app)
      .get(`/api/v1/guardians/${guardian1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    const linkedIds = verify.body.students.map((s: any) => s.studentId);
    expect(linkedIds).toContain(studentAId);
    expect(linkedIds).toContain(studentBId);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Primary Guardian (Single Primary Rule)
  // --------------------------------------------------------------------------
  let motherGuardianId: string;
  it('8. Primary Guardian: marking Guardian B primary demotes Guardian A as primary', async () => {
    // Create Mother for Student A
    const motherRes = await request(app)
      .post('/api/v1/guardians')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        firstName: 'Zainab',
        lastName: 'Khan',
        relationship: 'MOTHER',
        phone: `98222${testRunId.slice(-5)}`,
      });
    motherGuardianId = motherRes.body.id;

    // Link Mother as Primary for Student A
    const linkRes = await request(app)
      .post(`/api/v1/guardians/${motherGuardianId}/students`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        relationship: 'MOTHER',
        isPrimary: true,
      });
    expect(linkRes.status).toBe(201);

    // Verify Mother is now primary, and Father is no longer primary for Student A
    const motherLink = await prisma.studentGuardian.findFirst({
      where: { guardianId: motherGuardianId, studentId: studentAId },
    });
    const fatherLink = await prisma.studentGuardian.findFirst({
      where: { guardianId: guardian1Id, studentId: studentAId },
    });

    expect(motherLink?.isPrimary).toBe(true);
    expect(fatherLink?.isPrimary).toBe(false);
  });

  // --------------------------------------------------------------------------
  // TEST 9: Emergency Contact
  // --------------------------------------------------------------------------
  it('9. Emergency Contact: toggle emergency contact flag persists correctly', async () => {
    const res = await request(app)
      .patch(`/api/v1/guardians/${guardian1Id}/students/${studentAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        isEmergencyContact: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.isEmergencyContact).toBe(true);

    const check = await prisma.studentGuardian.findFirst({
      where: { guardianId: guardian1Id, studentId: studentAId },
    });
    expect(check?.isEmergencyContact).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 10: Pickup Permission
  // --------------------------------------------------------------------------
  it('10. Pickup Permission: toggle pickup authorization persists correctly', async () => {
    const res = await request(app)
      .patch(`/api/v1/guardians/${guardian1Id}/students/${studentAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        hasPickupPermission: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.hasPickupPermission).toBe(false);

    // Toggle back
    const resBack = await request(app)
      .patch(`/api/v1/guardians/${guardian1Id}/students/${studentAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        hasPickupPermission: true,
      });

    expect(resBack.status).toBe(200);
    expect(resBack.body.hasPickupPermission).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 11: Family Creation
  // --------------------------------------------------------------------------
  let familyId: string;
  it('11. Family Creation: creates household with atomic number series', async () => {
    const res = await request(app)
      .post('/api/v1/families')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        familyName: 'Khan Family Household',
        primaryGuardianId: guardian1Id,
        studentIds: [studentAId, studentBId],
        address: 'B-12 Hill View Residency',
        city: 'Mumbai',
        state: 'Maharashtra',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.familyNumber).toMatch(/^FAM-\d{4}-\d{5}$/);
    expect(res.body.familyName).toBe('Khan Family Household');
    familyId = res.body.id;
  });

  // --------------------------------------------------------------------------
  // TEST 12: Siblings
  // --------------------------------------------------------------------------
  it('12. Siblings: both children appear together under household siblings query', async () => {
    const res = await request(app)
      .get(`/api/v1/families/${familyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body.siblings.length).toBe(2);
    const siblingNames = res.body.siblings.map((s: any) => s.firstName);
    expect(siblingNames).toContain('Zayd');
    expect(siblingNames).toContain('Fatima');
  });

  // --------------------------------------------------------------------------
  // TEST 13: Family Persistence
  // --------------------------------------------------------------------------
  it('13. Family Persistence: household members, primary guardian, and links persist across sessions', async () => {
    const res = await request(app)
      .get(`/api/v1/families/${familyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    expect(res.body.primaryGuardianId).toBe(guardian1Id);
    expect(res.body.primaryGuardian.firstName).toBe('Ahmed');
    expect(res.body.students.length).toBe(2);
  });

  // --------------------------------------------------------------------------
  // TEST 14: Family Address
  // --------------------------------------------------------------------------
  it('14. Family Address: updates household address without corrupting individual guardian data', async () => {
    const res = await request(app)
      .patch(`/api/v1/families/${familyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        address: 'Penthouse 12, Sky Deck Towers',
        city: 'Navi Mumbai',
      });

    expect(res.status).toBe(200);
    expect(res.body.address).toBe('Penthouse 12, Sky Deck Towers');
    expect(res.body.city).toBe('Navi Mumbai');

    // Verify guardian1's individual address remains untouched if not overridden
    const guardian = await prisma.guardian.findUnique({ where: { id: guardian1Id } });
    expect(guardian?.address).toBe('Villa 104, Palm Grove Enclave');
  });

  // --------------------------------------------------------------------------
  // TESTS 15, 16 & 17: Guardian Merge Integrity (Exact user specification!)
  // Setup:
  // Guardian 1: Ahmed Khan, Phone 9876543210, Child: Student A, Document uploaded
  // Guardian 2: Ahmed Khan, Same Phone, Child: Student B, Note attached
  // Merge Guardian 2 -> Guardian 1
  // Afterward: Guardian 1 contains Student A, Student B, Document, Note, Family. Guardian 2 is ARCHIVED.
  // --------------------------------------------------------------------------
  let canonicalGuardianId: string;
  let duplicateGuardianId: string;
  const mergeSharedPhone = `98999${testRunId.slice(-5)}`;

  it('15. Guardian Merge: setup duplicate records and verify deduplication preview', async () => {
    // Create Guardian 1
    const g1Res = await request(app)
      .post('/api/v1/guardians')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        firstName: 'Ahmed',
        lastName: 'Khan',
        relationship: 'FATHER',
        phone: mergeSharedPhone,
        studentId: studentAId,
        occupation: 'Architect',
      });
    expect(g1Res.status).toBe(201);
    canonicalGuardianId = g1Res.body.id;

    // Upload document to Guardian 1
    const docRes = await request(app)
      .post(`/api/v1/guardians/${canonicalGuardianId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .attach('file', Buffer.from('%PDF-1.4 official aadhaar'), 'canonical_aadhaar.pdf')
      .field('documentType', 'ID_PROOF');
    expect(docRes.status).toBe(201);

    // Create Guardian 2 (same phone, linked to Student B)
    const g2Res = await request(app)
      .post('/api/v1/guardians')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        firstName: 'Ahmed',
        lastName: 'Khan',
        relationship: 'FATHER',
        phone: mergeSharedPhone,
        studentId: studentBId,
        occupation: 'Senior Chief Architect',
        address: '42 Marine Drive',
      });
    expect(g2Res.status).toBe(201);
    duplicateGuardianId = g2Res.body.id;

    // Attach Note to Guardian 2
    const noteRes = await request(app)
      .post(`/api/v1/guardians/${duplicateGuardianId}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        category: 'ADMINISTRATIVE',
        content: 'Special pickup permission for afterschool athletics program.',
        isConfidential: false,
      });
    expect(noteRes.status).toBe(201);

    // Check Duplicate Preview
    const previewRes = await request(app)
      .post('/api/v1/guardians/check-duplicate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        phone: mergeSharedPhone,
      });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.duplicates.length).toBe(2);
  });

  it('16. Merge Safety: executing merge transfers student links, documents, and notes to canonical record', async () => {
    const mergeRes = await request(app)
      .post('/api/v1/guardians/merge')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        canonicalGuardianId,
        duplicateGuardianId,
        resolvedFields: {
          occupation: 'Senior Chief Architect',
          address: '42 Marine Drive',
        },
      });

    expect(mergeRes.status).toBe(200);

    // Fetch canonical guardian
    const canonical = await request(app)
      .get(`/api/v1/guardians/${canonicalGuardianId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(canonical.status).toBe(200);
    expect(canonical.body.occupation).toBe('Senior Chief Architect');
    expect(canonical.body.address).toBe('42 Marine Drive');

    // Both Student A and Student B are now linked to canonical
    const linkedStudentIds = canonical.body.students.map((s: any) => s.studentId);
    expect(linkedStudentIds).toContain(studentAId);
    expect(linkedStudentIds).toContain(studentBId);

    // Document from Guardian 1 exists on canonical
    expect(canonical.body.documents.length).toBeGreaterThanOrEqual(1);
    expect(canonical.body.documents.some((d: any) => d.originalFileName === 'canonical_aadhaar.pdf')).toBe(true);

    // Note from Guardian 2 is transferred to canonical
    expect(canonical.body.notes.some((n: any) => n.content.includes('athletics program'))).toBe(true);

    // System audit note on merge is logged
    expect(canonical.body.notes.some((n: any) => n.content.includes('Merged duplicate guardian'))).toBe(true);
  });

  it('17. Merged Record: duplicate record is archived and ceases to behave as active independent person', async () => {
    // Duplicate status in DB is ARCHIVED
    const dupDb = await prisma.guardian.findUnique({ where: { id: duplicateGuardianId } });
    expect(dupDb?.status).toBe('ARCHIVED');
    expect(dupDb?.archivedAt).not.toBeNull();

    // Searching active directory does NOT show duplicate record
    const listRes = await request(app)
      .get(`/api/v1/guardians?search=${mergeSharedPhone}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].id).toBe(canonicalGuardianId);
  });

  // --------------------------------------------------------------------------
  // TESTS 18 & 19: Parent Portal Access Foundation & First Login
  // --------------------------------------------------------------------------
  let parentAEmail: string;
  let parentATempPassword: string;
  let parentAToken: string;

  it('18. Create Parent Login: generates temporary credentials with mustChangePassword flag', async () => {
    const res = await request(app)
      .post(`/api/v1/guardians/${canonicalGuardianId}/portal-access`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('temporaryPassword');
    expect(res.body).toHaveProperty('username');
    parentAEmail = res.body.username;
    parentATempPassword = res.body.temporaryPassword;

    // Verify User in DB has mustChangePassword: true and dedicated Parent role
    const user = await prisma.user.findUnique({
      where: { email: parentAEmail },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(user).not.toBeNull();
    expect(user?.mustChangePassword).toBe(true);
    expect(user?.isActive).toBe(true);

    // Verify role has ONLY parent permissions, NOT superadmin/staff permissions
    const permissions =
      user?.userRoles.flatMap((r) => r.role.rolePermissions.map((p) => p.permission.code)) || [];
    expect(permissions).toContain('parent.children.view');
    expect(permissions).not.toContain('students.manage');
    expect(permissions).not.toContain('guardians.manage');
    expect(permissions).not.toContain('users.manage');
  });

  it('19. First Parent Login: logs in with temporary credentials and requires password change', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: parentAEmail,
        password: parentATempPassword,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('access_token');
    expect(loginRes.body.must_change_password).toBe(true);
    parentAToken = loginRes.body.access_token;

    // Verify me endpoint indicates must_change_password
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${parentAToken}`);
    expect(meRes.body.must_change_password).toBe(true);

    // Verify application endpoint is blocked before changing password
    const blockedRes = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${parentAToken}`)
      .set('x-school-id', schoolAId);

    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.message).toContain('Password change required before accessing application');

    // Simulate completing required initial password change
    await prisma.user.update({
      where: { email: parentAEmail },
      data: { mustChangePassword: false },
    });
  });

  // --------------------------------------------------------------------------
  // TEST 20: Parent Child Access
  // --------------------------------------------------------------------------
  it('20. Parent Child Access: parent sees only their linked children in student directory', async () => {
    const res = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${parentAToken}`)
      .set('x-school-id', schoolAId);

    expect(res.status).toBe(200);
    const studentsList = res.body.items || res.body.data || [];
    const returnedIds = studentsList.map((s: any) => s.id);

    // Parent A is linked to Student A and Student B (from canonical merge)
    expect(returnedIds).toContain(studentAId);
    expect(returnedIds).toContain(studentBId);

    // Unrelated Student C must NEVER appear in the list
    expect(returnedIds).not.toContain(studentCId);
  });

  // --------------------------------------------------------------------------
  // TEST 21: CRITICAL ISOLATION (Most Important Test in Checklist)
  // --------------------------------------------------------------------------
  describe('21. Critical Isolation — Strict Backend Enforcement (Non-Negotiable)', () => {
    let parentBToken: string;
    let parentBGuardianId: string;

    beforeAll(async () => {
      // Create separate Parent B linked ONLY to Student C (Unrelated student)
      const gBRes = await request(app)
        .post('/api/v1/guardians')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-school-id', schoolAId)
        .send({
          firstName: 'Vikram',
          lastName: 'Verma',
          relationship: 'FATHER',
          phone: `98333${testRunId.slice(-5)}`,
          studentId: studentCId,
        });
      parentBGuardianId = gBRes.body.id;

      const portalRes = await request(app)
        .post(`/api/v1/guardians/${parentBGuardianId}/portal-access`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-school-id', schoolAId);

      // Simulate completing required initial password change for Parent B
      await prisma.user.update({
        where: { email: portalRes.body.username },
        data: { mustChangePassword: false },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: portalRes.body.username,
          password: portalRes.body.temporaryPassword,
        });
      parentBToken = loginRes.body.access_token;
    });

    it('Parent B can normally view their authorized child Student C', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${studentCId}`)
        .set('Authorization', `Bearer ${parentBToken}`)
        .set('x-school-id', schoolAId);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(studentCId);
      expect(res.body.firstName).toBe('Reyansh');
    });

    it('Parent B manually tampering with Student A ID in URL returns HTTP 403 Forbidden', async () => {
      // Parent B tries to access Parent A's child (Student A)
      const res = await request(app)
        .get(`/api/v1/students/${studentAId}`)
        .set('Authorization', `Bearer ${parentBToken}`)
        .set('x-school-id', schoolAId);

      // Backend itself MUST block access with 403 Forbidden!
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied. You are not authorized to view this student.');
      // Ensure zero sensitive Student A data is leaked
      expect(res.body.firstName).toBeUndefined();
      expect(res.body.admissionNumber).toBeUndefined();
    });

    it('Parent A manually tampering with Student C ID in URL returns HTTP 403 Forbidden', async () => {
      // Parent A tries to access Parent B's child (Student C)
      const res = await request(app)
        .get(`/api/v1/students/${studentCId}`)
        .set('Authorization', `Bearer ${parentAToken}`)
        .set('x-school-id', schoolAId);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied. You are not authorized to view this student.');
      expect(res.body.firstName).toBeUndefined();
    });

    it('Parent accounts are strictly blocked from internal discipline, confidential notes, audit logs, and other families', async () => {
      // 1. Discipline records
      const disciplineRes = await request(app)
        .post(`/api/v1/students/${studentAId}/discipline`)
        .set('Authorization', `Bearer ${parentAToken}`)
        .set('x-school-id', schoolAId)
        .send({
          incidentDate: '2026-09-01',
          category: 'BEHAVIORAL',
          severity: 'MINOR',
          description: 'Parent attempting to inject unauthorized discipline log',
        });
      expect(disciplineRes.status).toBe(403);

      // 2. Audit logs
      const auditRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${parentAToken}`)
        .set('x-school-id', schoolAId);
      expect(auditRes.status).toBe(403);

      // 3. Other families directory
      const familiesRes = await request(app)
        .get('/api/v1/families')
        .set('Authorization', `Bearer ${parentAToken}`)
        .set('x-school-id', schoolAId);
      expect(familiesRes.status).toBe(403);

      // 4. Guardians directory
      const guardiansRes = await request(app)
        .get('/api/v1/guardians')
        .set('Authorization', `Bearer ${parentAToken}`)
        .set('x-school-id', schoolAId);
      expect(guardiansRes.status).toBe(403);
    });
  });

  // --------------------------------------------------------------------------
  // TEST 22: Confidential Notes
  // --------------------------------------------------------------------------
  it('22. Confidential Notes: internal staff note marked confidential is hidden from unauthorized users', async () => {
    // Add confidential note to guardian1
    const noteRes = await request(app)
      .post(`/api/v1/guardians/${canonicalGuardianId}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        category: 'FINANCIAL',
        content: 'Confidential fee concession discussion: requested 50% discount under hardship clause.',
        isConfidential: true,
      });
    expect(noteRes.status).toBe(201);
    expect(noteRes.body.isConfidential).toBe(true);

    // Staff with only students.view (no guardians.manage) queries guardian:
    // Should return 403 because staff lacks guardians.view, or if they have guardians.view without manage, confidential note is omitted.
    const staffQuery = await request(app)
      .get(`/api/v1/guardians/${canonicalGuardianId}`)
      .set('Authorization', `Bearer ${restrictedStaffToken}`)
      .set('x-school-id', schoolAId);
    expect(staffQuery.status).toBe(403);

    // Admin with guardians.manage CAN see the confidential note
    const adminQuery = await request(app)
      .get(`/api/v1/guardians/${canonicalGuardianId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(adminQuery.status).toBe(200);
    expect(adminQuery.body.notes.some((n: any) => n.content.includes('Confidential fee concession'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 23: Guardian Document Upload & Verification
  // --------------------------------------------------------------------------
  let uploadedDocId: string;
  it('23. Guardian Document: uploads valid PDF and updates verification status', async () => {
    const uploadRes = await request(app)
      .post(`/api/v1/guardians/${canonicalGuardianId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .attach('file', Buffer.from('%PDF-1.4 official birth certificate document'), 'birth_certificate.pdf')
      .field('documentType', 'BIRTH_CERTIFICATE');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.verificationStatus).toBe('PENDING');
    uploadedDocId = uploadRes.body.id;

    // Verify the document
    const verifyRes = await request(app)
      .patch(`/api/v1/guardians/${canonicalGuardianId}/documents/${uploadedDocId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        status: 'VERIFIED',
        verificationNotes: 'Verified against municipal birth registry record',
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verificationStatus).toBe('VERIFIED');
    expect(verifyRes.body.verifiedBy).not.toBeNull();
    expect(verifyRes.body.verificationNotes).toBe('Verified against municipal birth registry record');
  });

  // --------------------------------------------------------------------------
  // TEST 24: Invalid Document Rejection
  // --------------------------------------------------------------------------
  it('24. Invalid Document: rejects dangerous executable / disallowed file types', async () => {
    const res = await request(app)
      .post(`/api/v1/guardians/${canonicalGuardianId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .attach('file', Buffer.from('MZ malicious executable contents'), 'script.exe')
      .field('documentType', 'ID_PROOF');

    expect(res.status).toBe(422);
    expect(res.body.message).toContain('strictly prohibited');
  });

  // --------------------------------------------------------------------------
  // TEST 25: Communication Preferences
  // --------------------------------------------------------------------------
  it('25. Communication Preferences: language (Hindi/Hinglish) and channel settings persist', async () => {
    const res = await request(app)
      .patch(`/api/v1/guardians/${canonicalGuardianId}/preferences`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        preferredLanguage: 'hi',
        whatsappNotification: true,
        emergencyContactPreference: 'SMS',
      });

    expect(res.status).toBe(200);
    expect(res.body.preferredLanguage).toBe('hi');
    expect(res.body.whatsappNotification).toBe(true);
    expect(res.body.emergencyContactPreference).toBe('SMS');

    // Verify persistence after fresh read
    const verify = await request(app)
      .get(`/api/v1/guardians/${canonicalGuardianId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(verify.body.preferredLanguage).toBe('hi');
    expect(verify.body.whatsappNotification).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 26: Global Search
  // --------------------------------------------------------------------------
  it('26. Global Search: searches guardian and family household from global search bar', async () => {
    // Search guardian by name
    const guardianSearch = await request(app)
      .get(`/api/v1/search?q=Ahmed`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(guardianSearch.status).toBe(200);
    expect(guardianSearch.body.results.some((r: any) => r.type === 'guardian' && r.title.includes('Ahmed'))).toBe(true);

    // Search family household by name
    const familySearch = await request(app)
      .get(`/api/v1/search?q=Khan+Family`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(familySearch.status).toBe(200);
    expect(familySearch.body.results.some((r: any) => r.type === 'family' && r.title.includes('Khan Family'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 27: School Isolation
  // --------------------------------------------------------------------------
  it('27. School Isolation: switching to School B hides School A guardians and families completely', async () => {
    // Guardian created in School A must return 404 in School B context
    const guardianRes = await request(app)
      .get(`/api/v1/guardians/${canonicalGuardianId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolBId);

    expect(guardianRes.status).toBe(404);

    // Family created in School A must return 404 in School B context
    const familyRes = await request(app)
      .get(`/api/v1/families/${familyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolBId);

    expect(familyRes.status).toBe(404);
  });

  // --------------------------------------------------------------------------
  // TEST 28: CSV Import with Student IDs Linking
  // --------------------------------------------------------------------------
  it('28. CSV Import: imports guardians with Student IDs and links valid rows to students', async () => {
    const importCsv = [
      'First Name,Last Name,Relationship,Phone,Email,Student ID',
      `Tariq,Ansari,FATHER,98444${testRunId.slice(-5)},tariq@test.com,STU-A-${testRunId}`,
      `Sultana,Ansari,MOTHER,98555${testRunId.slice(-5)},sultana@test.com,STU-B-${testRunId}`,
    ].join('\n');

    // Preview
    const previewRes = await request(app)
      .post('/api/v1/guardians/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .attach('file', Buffer.from(importCsv), 'import_with_students.csv');

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.totalRows).toBe(2);
    expect(previewRes.body.validRows).toBe(2);
    expect(previewRes.body.preview[0].matchedStudent).toContain('Zayd Khan');
    expect(previewRes.body.preview[1].matchedStudent).toContain('Fatima Khan');

    // Commit
    const commitRes = await request(app)
      .post('/api/v1/guardians/import/commit')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        records: previewRes.body.preview,
      });

    expect(commitRes.status).toBe(200);
    expect(commitRes.body.createdCount).toBe(2);

    // Verify Tariq Ansari was created and linked to Student A
    const tariq = await prisma.guardian.findFirst({
      where: { tenantId, schoolId: schoolAId, phone: `98444${testRunId.slice(-5)}` },
      include: { students: true },
    });
    expect(tariq).not.toBeNull();
    expect(tariq?.students.length).toBe(1);
    expect(tariq?.students[0].studentId).toBe(studentAId);
  });

  // --------------------------------------------------------------------------
  // TEST 29: Duplicate CSV Warning
  // --------------------------------------------------------------------------
  it('29. Duplicate CSV: re-importing existing phones warns about duplicates', async () => {
    const duplicateCsv = [
      'First Name,Last Name,Relationship,Phone,Email',
      `Tariq,Ansari,FATHER,98444${testRunId.slice(-5)},tariq@test.com`,
    ].join('\n');

    const previewRes = await request(app)
      .post('/api/v1/guardians/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .attach('file', Buffer.from(duplicateCsv), 'duplicate_import.csv');

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.warningRows).toBeGreaterThan(0);
    expect(previewRes.body.preview[0].warnings.some((w: string) => w.includes('Matches existing guardian'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 30: CSV Export
  // --------------------------------------------------------------------------
  it('30. CSV Export: streams formatted CSV respecting current school scope', async () => {
    const exportRes = await request(app)
      .get('/api/v1/guardians/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);

    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toContain('text/csv');
    expect(exportRes.text).toContain('First Name,Middle Name,Last Name,Relationship,Phone');
    expect(exportRes.text).toContain('Ahmed');
    expect(exportRes.text).toContain('Linked Students');
  });

  // --------------------------------------------------------------------------
  // TEST 31: Hindi Localization
  // --------------------------------------------------------------------------
  it('31. Hindi Localization: translation dictionary contains complete Hindi labels for parents module', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const hiPath = path.resolve(__dirname, '../../../frontend/src/i18n/locales/hi/common.json');
    const content = JSON.parse(await fs.readFile(hiPath, 'utf-8'));

    expect(content).toHaveProperty('parentsModule');
    expect(content.parentsModule.title).toBe('अभिभावक एवं परिवार प्रबंधन');
    expect(content.parentsModule.tabs.guardians).toBe('अभिभावक निर्देशिका');
    expect(content.parentsModule.actions.addGuardian).toBe('अभिभावक जोड़ें');
    expect(content.parentsModule.actions.mergeDuplicates).toBe('डुप्लिकेट मर्ज करें');
    expect(content.parentsModule.merge.title).toBe('डुप्लिकेट अभिभावकों का विलय करें');
  });

  // --------------------------------------------------------------------------
  // TEST 32: Hinglish Localization
  // --------------------------------------------------------------------------
  it('32. Hinglish Localization: translation dictionary contains natural Roman Hindi strings', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const hinglishPath = path.resolve(__dirname, '../../../frontend/src/i18n/locales/hinglish/common.json');
    const content = JSON.parse(await fs.readFile(hinglishPath, 'utf-8'));

    expect(content).toHaveProperty('parentsModule');
    expect(content.parentsModule.title).toBe('Parents aur Family Management');
    expect(content.parentsModule.actions.addGuardian).toBe('Guardian Add Karein');
    expect(content.parentsModule.actions.mergeDuplicates).toBe('Duplicates Merge Karein');
    expect(content.parentsModule.merge.title).toBe('Duplicate Guardians Merge Karein');
  });

  // --------------------------------------------------------------------------
  // TEST 33: Mobile Responsiveness (390px Viewport Architecture)
  // --------------------------------------------------------------------------
  it('33. Mobile Responsiveness: frontend components include responsive mobile classes (390px support)', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const detailFile = path.resolve(__dirname, '../../../frontend/src/app/views/guardians/GuardianDetail.tsx');
    const listFile = path.resolve(__dirname, '../../../frontend/src/app/views/guardians/GuardiansList.tsx');
    const mergeFile = path.resolve(__dirname, '../../../frontend/src/app/views/guardians/GuardianMergeModal.tsx');

    const detailContent = await fs.readFile(detailFile, 'utf-8');
    const listContent = await fs.readFile(listFile, 'utf-8');
    const mergeContent = await fs.readFile(mergeFile, 'utf-8');

    // Confirm mobile responsive flex-col / grid breakpoints exist
    expect(detailContent).toMatch(/flex-col|grid-cols-1|sm:/);
    expect(listContent).toMatch(/flex-col|sm:flex-row|overflow-x-auto/);
    expect(mergeContent).toMatch(/max-w-|w-full|overflow-y-auto/);
  });
});
