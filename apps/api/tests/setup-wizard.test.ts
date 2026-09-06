import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/crypto.js';

let adminToken: string;
let schoolId: string;

describe('Major Module 02 — School Setup Wizard API Integration', () => {
  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@evolix.local', password: 'Password123!' });

    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.access_token;

    // Create a fresh dedicated school for wizard testing
    const schoolRes = await request(app)
      .post('/api/v1/schools')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: `WIZ-${Date.now()}`, name: 'Wizard Onboarding Academy' });
    expect(schoolRes.status).toBe(201);
    schoolId = schoolRes.body.id;
  });

  it('should fetch initial setup status and reflect empty state for new school', async () => {
    const res = await request(app)
      .get('/api/v1/setup/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolId });

    expect(res.status).toBe(200);
    expect(res.body.progress.setupStatus).toBe('IN_PROGRESS');
    expect(res.body.progress.currentStep).toBe('school_name');
    expect(res.body.progress.completedSteps).toEqual([]);
    expect(res.body.summary.classesCount).toBe(0);
  });

  it('should execute school_name step and persist to School and SchoolConfiguration', async () => {
    const res = await request(app)
      .post('/api/v1/setup/step/school_name')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolId })
      .send({
        name: 'Wizard Academy International',
        shortName: 'WAI',
        board: 'ICSE',
        contactEmail: 'contact@wai.edu',
        contactPhone: '+919876543210',
        address: 'Plot 42, Knowledge Park',
      });

    expect(res.status).toBe(200);
    expect(res.body.progress.completedSteps).toContain('school_name');
    expect(res.body.progress.currentStep).toBe('logo');
    expect(res.body.summary.school.name).toBe('Wizard Academy International');
    expect(res.body.summary.school.board).toBe('ICSE');
  });

  it('should execute academic_year step and create the current academic year', async () => {
    const res = await request(app)
      .post('/api/v1/setup/step/academic_year')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolId })
      .send({
        name: '2026-2027',
        startDate: '2026-04-01T00:00:00.000Z',
        endDate: '2027-03-31T00:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.progress.completedSteps).toContain('academic_year');
    expect(res.body.summary.hasAcademicYear).toBe(true);
    expect(res.body.summary.academicYearsCount).toBeGreaterThan(0);
  });

  it('should execute classes, sections, and subjects steps writing to underlying master data', async () => {
    // Classes step
    const classRes = await request(app)
      .post('/api/v1/setup/step/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolId })
      .send({
        classes: [
          { name: 'Grade 1', code: 'G-1', displayOrder: 1 },
          { name: 'Grade 2', code: 'G-2', displayOrder: 2 },
        ],
      });
    expect(classRes.status).toBe(200);
    expect(classRes.body.summary.classesCount).toBe(2);

    // Sections step
    const secRes = await request(app)
      .post('/api/v1/setup/step/sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolId })
      .send({
        mappings: [
          { classCode: 'G-1', sectionNames: ['A', 'B'] },
          { classCode: 'G-2', sectionNames: ['A'] },
        ],
      });
    expect(secRes.status).toBe(200);
    expect(secRes.body.summary.classSectionsCount).toBe(3);

    // Subjects step
    const subRes = await request(app)
      .post('/api/v1/setup/step/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolId })
      .send({
        subjects: [
          { name: 'English Literature', code: 'ENG-LIT', type: 'THEORY', classCodes: ['G-1', 'G-2'] },
          { name: 'Mathematics Fundamentals', code: 'MATH-FND', type: 'THEORY', classCodes: ['G-1'] },
        ],
      });
    expect(subRes.status).toBe(200);
    expect(subRes.body.summary.subjectsCount).toBe(2);
  });

  it('should execute fee structure and transport steps and complete setup', async () => {
    // Fee structure step
    const feeRes = await request(app)
      .post('/api/v1/setup/step/fee_structure')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolId })
      .send({
        feeHeads: [
          { name: 'Annual Tuition Fee', code: 'ANN-TUI', isRefundable: false },
          { name: 'Registration Fee', code: 'REG-FEE', isRefundable: false },
        ],
      });
    expect(feeRes.status).toBe(200);
    expect(feeRes.body.summary.feeHeadsCount).toBe(2);

    // Transport step
    const transRes = await request(app)
      .post('/api/v1/setup/step/transport')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolId })
      .send({
        transportEnabled: true,
        vehicleTypes: [
          { name: 'Standard Bus', code: 'STD_BUS', capacity: 45 },
        ],
      });
    expect(transRes.status).toBe(200);

    // Complete setup
    const completeRes = await request(app)
      .post('/api/v1/setup/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ school_id: schoolId });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.progress.setupStatus).toBe('COMPLETED');
    expect(completeRes.body.progress.completedAt).not.toBeNull();
    expect(completeRes.body.summary.isCompleted).toBe(true);
  });

  describe('Security & Staff Credential Hardening', () => {
    let staff1Email: string;
    let staff2Email: string;
    let staff1TempPassword: string;
    let staff2TempPassword: string;

    it('1. staff users do not share a hardcoded password and receive unique server-generated passwords', async () => {
      const timestamp = Date.now();
      staff1Email = `staff1_${timestamp}@evolix.local`;
      staff2Email = `staff2_${timestamp}@evolix.local`;

      const userRes = await request(app)
        .post('/api/v1/setup/step/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ school_id: schoolId })
        .send({
          users: [
            { fullName: 'Alice Johnson', email: staff1Email, roleCode: 'teacher' },
            { fullName: 'Bob Smith', email: staff2Email, roleCode: 'accountant' },
          ],
        });

      expect(userRes.status).toBe(200);
      expect(userRes.body.createdUsers).toBeDefined();
      expect(userRes.body.createdUsers.length).toBe(2);

      const u1 = userRes.body.createdUsers.find((u: any) => u.email === staff1Email);
      const u2 = userRes.body.createdUsers.find((u: any) => u.email === staff2Email);

      expect(u1).toBeDefined();
      expect(u2).toBeDefined();

      staff1TempPassword = u1.temporaryPassword;
      staff2TempPassword = u2.temporaryPassword;

      // Ensure neither user has hardcoded Welcome123!
      expect(staff1TempPassword).not.toBe('Welcome123!');
      expect(staff2TempPassword).not.toBe('Welcome123!');

      // Ensure passwords are unique per user
      expect(staff1TempPassword).not.toBe(staff2TempPassword);
      expect(staff1TempPassword.length).toBeGreaterThanOrEqual(16);
    });

    it('2. generated temporary password meets existing password policy complexity', () => {
      expect(staff1TempPassword.length).toBeGreaterThanOrEqual(8);
      expect(/[A-Z]/.test(staff1TempPassword)).toBe(true); // Uppercase
      expect(/[a-z]/.test(staff1TempPassword)).toBe(true); // Lowercase
      expect(/\d/.test(staff1TempPassword)).toBe(true); // Number
      expect(/[!@#$%^&*(),.?":{}|<>]/.test(staff1TempPassword)).toBe(true); // Special character
    });

    it('3. plaintext password is not stored in the database', async () => {
      const dbUser = await prisma.user.findUnique({ where: { email: staff1Email } });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.hashedPassword).not.toBe(staff1TempPassword);
      expect(dbUser!.hashedPassword.startsWith('$2')).toBe(true); // Bcrypt hash
    });

    it('4. must-change-password flag is set on the staff user record', async () => {
      const dbUser = await prisma.user.findUnique({ where: { email: staff1Email } });
      expect(dbUser!.mustChangePassword).toBe(true);
    });

    it('5. staff user can authenticate with generated temporary password', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: staff1Email, password: staff1TempPassword });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.access_token).toBeDefined();
      expect(loginRes.body.must_change_password).toBe(true);
    });

    it('6. first-login password change requirement blocks normal access until changed', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: staff1Email, password: staff1TempPassword });

      const staffToken = loginRes.body.access_token;

      // Accessing normal routes before password change is blocked with 403
      const blockedRes = await request(app)
        .get('/api/v1/setup/status')
        .set('Authorization', `Bearer ${staffToken}`)
        .query({ school_id: schoolId });

      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.error?.code || blockedRes.body.code).toBe('PASSWORD_CHANGE_REQUIRED');

      // Staff changes password using current temporary password and new password
      const changeRes = await request(app)
        .patch('/api/v1/security/password')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          current_password: staff1TempPassword,
          new_password: 'PermanentSecurePassword2026!',
        });

      expect(changeRes.status).toBe(200);

      // Verify in DB that mustChangePassword is now false
      const updatedUser = await prisma.user.findUnique({ where: { email: staff1Email } });
      expect(updatedUser!.mustChangePassword).toBe(false);

      // Now re-authenticating with the new password works
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: staff1Email, password: 'PermanentSecurePassword2026!' });

      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.must_change_password).toBe(false);
    });

    it('7. unauthorized user without school.create cannot create school', async () => {
      const plainUserEmail = `plain_${Date.now()}@evolix.local`;
      const pass = 'PlainUserPassword123!';
      const hash = await hashPassword(pass);
      const tenant = await prisma.tenant.findFirst();

      await prisma.user.create({
        data: {
          tenantId: tenant!.id,
          email: plainUserEmail,
          firstName: 'Plain',
          lastName: 'User',
          hashedPassword: hash,
          isActive: true,
          mustChangePassword: false,
        },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: plainUserEmail, password: pass });

      const plainToken = loginRes.body.access_token;

      const createSchoolRes = await request(app)
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${plainToken}`)
        .send({ name: 'Unauthorized Academy', code: `UNAUTH-${Date.now().toString().slice(-4)}` });

      expect(createSchoolRes.status).toBe(403);
    });

    it('8. authorized permission holder with school.create can create school within tenant', async () => {
      const managerEmail = `school_creator_${Date.now()}@evolix.local`;
      const pass = 'CreatorPassword123!';
      const hash = await hashPassword(pass);
      const tenant = await prisma.tenant.findFirst();

      const schoolCreatePerm = await prisma.permission.findUnique({ where: { code: 'school.create' } });
      expect(schoolCreatePerm).not.toBeNull();

      const creatorRole = await prisma.role.create({
        data: {
          tenantId: tenant!.id,
          name: `SchoolManager_${Date.now()}`,
          rolePermissions: {
            create: [{ permissionId: schoolCreatePerm!.id }],
          },
        },
      });

      await prisma.user.create({
        data: {
          tenantId: tenant!.id,
          email: managerEmail,
          firstName: 'School',
          lastName: 'Manager',
          hashedPassword: hash,
          isActive: true,
          mustChangePassword: false,
          userRoles: {
            create: [{ roleId: creatorRole.id }],
          },
        },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: managerEmail, password: pass });

      const creatorToken = loginRes.body.access_token;

      const schoolCode = `SCH-${Date.now().toString().slice(-4)}`;
      const createSchoolRes = await request(app)
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ name: 'Legitimate Branch School', code: schoolCode });

      expect(createSchoolRes.status).toBe(201);
      expect(createSchoolRes.body.id).toBeDefined();

      // Verify tenant scoping: school belongs to user's tenant
      const createdDbSchool = await prisma.school.findUnique({ where: { id: createSchoolRes.body.id } });
      expect(createdDbSchool!.tenantId).toBe(tenant!.id);
    });

    it('9. role name alone (e.g., OWNER / SUPER_ADMIN) without permission does not bypass authorization', async () => {
      const fakeOwnerEmail = `fake_owner_${Date.now()}@evolix.local`;
      const pass = 'FakeOwner123!';
      const hash = await hashPassword(pass);
      const tenant = await prisma.tenant.findFirst();

      // Create a role named "OWNER" but with ZERO permissions attached
      const unprivilegedOwnerRole = await prisma.role.create({
        data: {
          tenantId: tenant!.id,
          name: `OWNER_${Date.now()}`,
        },
      });

      await prisma.user.create({
        data: {
          tenantId: tenant!.id,
          email: fakeOwnerEmail,
          firstName: 'Fake',
          lastName: 'Owner',
          hashedPassword: hash,
          isActive: true,
          mustChangePassword: false,
          userRoles: {
            create: [{ roleId: unprivilegedOwnerRole.id }],
          },
        },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: fakeOwnerEmail, password: pass });

      const fakeOwnerToken = loginRes.body.access_token;

      // Role name alone without the authoritative school.create permission must be rejected
      const res = await request(app)
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${fakeOwnerToken}`)
        .send({ name: 'Exploit School', code: `EXP-${Date.now().toString().slice(-4)}` });

      expect(res.status).toBe(403);
    });
  });
});
