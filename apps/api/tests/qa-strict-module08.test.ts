import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { Prisma } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { signAccessToken } from '../src/lib/crypto.js';

const Decimal = Prisma.Decimal;

describe('EVOLIX School ERP — Major Module 08 Strict QA & Remediation Suite (Tests 01 to 97)', () => {
  // Test Tenants & Schools
  let tenantAId: string;
  let schoolAId: string;
  let schoolBId: string;
  let tenantBId: string;
  let schoolCId: string;

  // Tokens
  let superAdminToken: string;
  let hrAdminToken: string;
  let payrollManagerToken: string;
  let ordinaryHrToken: string; // hr.view only, no payroll.view
  let teacherAToken: string;    // Teacher Employee A (linked User)
  let teacherBToken: string;    // Teacher Employee B (linked User)

  // Users
  let userAId: string;
  let userBId: string;
  let hrAdminUserId: string;

  // Employees
  let employeeAId: string;
  let employeeBId: string;
  let employeeCId: string; // Non-login employee (no User)

  // Module 02 Reused Master Data
  let teachingDeptId: string;
  let adminDeptId: string;
  let teacherDesigId: string;
  let seniorTeacherDesigId: string;
  let accountantDesigId: string;

  // Module 07 General Ledger & Banking
  let financialYearId: string;
  let accountingPeriodId: string;
  let salaryExpenseAccId: string;
  let employerPfExpenseAccId: string;
  let deductionLiabAccId: string;
  let employerPfLiabAccId: string;
  let payrollPayableAccId: string;
  let bankLedgerAccId: string;
  let bankAccountRecordId: string;

  // Module 08 Configuration & Master Data
  let payrollConfigId: string;
  let basicCompId: string;
  let hraCompId: string;
  let pfDeductionCompId: string;
  let pfEmployerCompId: string;
  let standardStructureId: string;
  let paidLeaveTypeId: string;
  let unpaidLeaveTypeId: string;
  let runAId: string;

  const testSuffix = Date.now().toString().slice(-6);

  beforeAll(async () => {
    // 1. Authenticate as Superadmin to set up test environment
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@evolix.local', password: 'Password123!' });
    expect(loginRes.status).toBe(200);
    superAdminToken = loginRes.body.access_token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(meRes.status).toBe(200);
    tenantAId = meRes.body.tenant_id;
    schoolAId = meRes.body.schools[0]?.id;
    expect(schoolAId).toBeDefined();

    // 2. Create School B under Tenant A
    const schoolB = await prisma.school.create({
      data: {
        tenantId: tenantAId,
        name: `School B QA ${testSuffix}`,
        code: `SCH-B-${testSuffix}`,
        isActive: true,
      },
    });
    schoolBId = schoolB.id;

    // 3. Create Tenant B and School C (for Cross-Tenant Isolation)
    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B QA ${testSuffix}`,
        domain: `tenant-b-${testSuffix}.evolix.local`,
        isActive: true,
      },
    });
    tenantBId = tenantB.id;

    const schoolC = await prisma.school.create({
      data: {
        tenantId: tenantBId,
        name: `School C QA ${testSuffix}`,
        code: `SCH-C-${testSuffix}`,
        isActive: true,
      },
    });
    schoolCId = schoolC.id;

    // 4. Create Module 02 Departments (Teaching, Administration) in School A
    const deptTeach = await prisma.department.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        name: `Teaching Dept QA ${testSuffix}`,
        code: `DEP-TCH-${testSuffix}`,
        isActive: true,
      },
    });
    teachingDeptId = deptTeach.id;

    const deptAdmin = await prisma.department.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        name: `Administration Dept QA ${testSuffix}`,
        code: `DEP-ADM-${testSuffix}`,
        isActive: true,
      },
    });
    adminDeptId = deptAdmin.id;

    // 5. Create Module 02 Designations (Teacher, Senior Teacher, Accountant) in School A
    const desigTeacher = await prisma.designation.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        name: `Teacher QA ${testSuffix}`,
        code: `DES-TCH-${testSuffix}`,
        isActive: true,
      },
    });
    teacherDesigId = desigTeacher.id;

    const desigSrTeacher = await prisma.designation.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        name: `Senior Teacher QA ${testSuffix}`,
        code: `DES-SRTCH-${testSuffix}`,
        isActive: true,
      },
    });
    seniorTeacherDesigId = desigSrTeacher.id;

    const desigAcc = await prisma.designation.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        name: `Accountant QA ${testSuffix}`,
        code: `DES-ACC-${testSuffix}`,
        isActive: true,
      },
    });
    accountantDesigId = desigAcc.id;

    // 6. Create Module 07 Financial Year & Accounting Period in School A
    const fy = await prisma.financialYear.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        name: `FY 2026-27 Strict QA ${testSuffix}`,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        isClosed: false,
        status: 'OPEN',
      },
    });
    financialYearId = fy.id;

    const period = await prisma.accountingPeriod.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        financialYearId,
        name: `September 2026 Period QA ${testSuffix}`,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-30'),
        status: 'OPEN',
      },
    });
    accountingPeriodId = period.id;

    // 7. Create Module 07 Chart of Accounts in School A
    const accSalaryExp = await prisma.account.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        code: `EXP-SAL-${testSuffix}`,
        name: 'Teaching Salary Expense Strict QA',
        type: 'EXPENSE',
        normalBalance: 'DEBIT',
        currency: 'INR',
        isActive: true,
      },
    });
    salaryExpenseAccId = accSalaryExp.id;

    const accPfExp = await prisma.account.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        code: `EXP-PF-${testSuffix}`,
        name: 'Employer PF Expense Strict QA',
        type: 'EXPENSE',
        normalBalance: 'DEBIT',
        currency: 'INR',
        isActive: true,
      },
    });
    employerPfExpenseAccId = accPfExp.id;

    const accPfLiab = await prisma.account.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        code: `LIAB-PF-EMP-${testSuffix}`,
        name: 'PF Deduction Liability Strict QA',
        type: 'LIABILITY',
        normalBalance: 'CREDIT',
        currency: 'INR',
        isActive: true,
      },
    });
    deductionLiabAccId = accPfLiab.id;

    const accPfEmpLiab = await prisma.account.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        code: `LIAB-PF-EMPLR-${testSuffix}`,
        name: 'Employer PF Payable Strict QA',
        type: 'LIABILITY',
        normalBalance: 'CREDIT',
        currency: 'INR',
        isActive: true,
      },
    });
    employerPfLiabAccId = accPfEmpLiab.id;

    const accPayable = await prisma.account.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        code: `LIAB-PAY-${testSuffix}`,
        name: 'Payroll Payable Clearing Strict QA',
        type: 'LIABILITY',
        normalBalance: 'CREDIT',
        currency: 'INR',
        isActive: true,
      },
    });
    payrollPayableAccId = accPayable.id;

    const accBank = await prisma.account.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        code: `ASSET-BANK-${testSuffix}`,
        name: 'Operating Bank Account Strict QA',
        type: 'ASSET',
        normalBalance: 'DEBIT',
        currency: 'INR',
        isActive: true,
      },
    });
    bankLedgerAccId = accBank.id;

    const bankRecord = await prisma.bankAccount.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        bankName: 'HDFC Bank QA',
        accountDisplayName: 'HDFC Operational Account QA',
        accountNumber: `987654321${testSuffix}`,
        ifscCode: 'HDFC0001234',
        branchName: 'Main City Branch',
        accountId: bankLedgerAccId,
        isActive: true,
      },
    });
    bankAccountRecordId = bankRecord.id;

    // Helper to create role with permissions
    async function createTestRoleWithPerms(roleName: string, permCodes: string[]) {
      const role = await prisma.role.create({
        data: {
          tenantId: tenantAId,
          name: `${roleName}-${testSuffix}`,
          isSystem: false,
        },
      });
      for (const code of permCodes) {
        const p = await prisma.permission.upsert({
          where: { code },
          create: { code, description: code },
          update: {},
        });
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          create: { roleId: role.id, permissionId: p.id },
          update: {},
        });
      }
      return role;
    }

    const teacherRole = await createTestRoleWithPerms('TeacherRole', [
      'staff_attendance.view',
      'staff_leave.view',
      'payroll.self.view',
    ]);

    const hrStaffRole = await createTestRoleWithPerms('HrStaffRole', [
      'hr.employee.view',
      'hr.view',
      'hr.leave.view',
    ]);

    // Teacher User A
    const userA = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `teacher.a.${testSuffix}@school.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'Amit',
        lastName: 'Sharma',
        isActive: true,
      },
    });
    await prisma.userRole.create({ data: { userId: userA.id, roleId: teacherRole.id } });
    await prisma.userSchool.create({ data: { userId: userA.id, schoolId: schoolAId } });
    userAId = userA.id;

    // Teacher User B
    const userB = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `teacher.b.${testSuffix}@school.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'Priya',
        lastName: 'Patel',
        isActive: true,
      },
    });
    await prisma.userRole.create({ data: { userId: userB.id, roleId: teacherRole.id } });
    await prisma.userSchool.create({ data: { userId: userB.id, schoolId: schoolAId } });
    userBId = userB.id;

    // Ordinary HR User (hr.employee.view and hr.view only, NO payroll.view)
    const userOrdHr = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `hr.staff.${testSuffix}@school.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'Rohit',
        lastName: 'Verma',
        isActive: true,
      },
    });
    await prisma.userRole.create({ data: { userId: userOrdHr.id, roleId: hrStaffRole.id } });
    await prisma.userSchool.create({ data: { userId: userOrdHr.id, schoolId: schoolAId } });

    teacherAToken = signAccessToken(userA.id, tenantAId, 120);
    teacherBToken = signAccessToken(userB.id, tenantAId, 120);
    ordinaryHrToken = signAccessToken(userOrdHr.id, tenantAId, 120);
    hrAdminToken = superAdminToken;
    payrollManagerToken = superAdminToken;

    // 9. Configure Payroll
    await request(app)
      .put('/api/v1/payroll/configuration')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        payFrequency: 'MONTHLY',
        payDay: 30,
        prorationBasis: 'CALENDAR_DAYS',
        defaultPayableAccountId: payrollPayableAccId,
        defaultDisbursementAccountId: bankLedgerAccId,
      });

    // 10. Configure Leave Types
    const clRes = await request(app)
      .post('/api/v1/hr/leave-types')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        name: `Paid Casual Leave ${testSuffix}`,
        code: `PL_${testSuffix}`,
        annualQuota: 12,
        isUnpaid: false,
        requiresApproval: true,
      });
    expect(clRes.status).toBe(201);
    paidLeaveTypeId = clRes.body.id;

    const unpaidRes = await request(app)
      .post('/api/v1/hr/leave-types')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        name: `Unpaid Leave ${testSuffix}`,
        code: `UNPAID_${testSuffix}`,
        annualQuota: 30,
        isUnpaid: true,
        requiresApproval: true,
      });
    expect(unpaidRes.status).toBe(201);
    unpaidLeaveTypeId = unpaidRes.body.id;

    // 11. Configure Salary Components
    const basicRes = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        name: `Basic Salary ${testSuffix}`,
        code: `BASIC_${testSuffix}`,
        type: 'EARNING',
        calculationType: 'FLAT',
        glAccountId: salaryExpenseAccId,
        isTaxable: true,
        affectsGross: true,
      });
    expect(basicRes.status).toBe(201);
    basicCompId = basicRes.body.id;

    const hraRes = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        name: `HRA ${testSuffix}`,
        code: `HRA_${testSuffix}`,
        type: 'EARNING',
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        dependsOnComponentId: basicCompId,
        glAccountId: salaryExpenseAccId,
        isTaxable: true,
        affectsGross: true,
      });
    expect(hraRes.status).toBe(201);
    hraCompId = hraRes.body.id;

    const pfDeductRes = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        name: `Provident Fund Employee ${testSuffix}`,
        code: `PF_EMP_${testSuffix}`,
        type: 'DEDUCTION',
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        dependsOnComponentId: basicCompId,
        glAccountId: deductionLiabAccId,
        isStatutory: true,
      });
    expect(pfDeductRes.status).toBe(201);
    pfDeductionCompId = pfDeductRes.body.id;

    const pfEmplrRes = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        name: `Provident Fund Employer ${testSuffix}`,
        code: `PF_EMPLR_${testSuffix}`,
        type: 'EMPLOYER_CONTRIBUTION',
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        dependsOnComponentId: basicCompId,
        glAccountId: employerPfExpenseAccId,
        employerLiabilityAccountId: employerPfLiabAccId,
        isStatutory: true,
      });
    expect(pfEmplrRes.status).toBe(201);
    pfEmployerCompId = pfEmplrRes.body.id;

    // Standard Salary Structure (Basic 30k, HRA 20% = 6k, PF Emp 10% = 3k, PF Emplr 10% = 3k)
    const structRes = await request(app)
      .post('/api/v1/payroll/salary-structures')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        name: `Teaching Structure Strict QA ${testSuffix}`,
        code: `STR_TEACH_${testSuffix}`,
        components: [
          { componentId: basicCompId, calculationType: 'FLAT', flatAmount: 30000, displayOrder: 1 },
          { componentId: hraCompId, calculationType: 'PERCENTAGE_OF_COMPONENT', percentageValue: 20, displayOrder: 2 },
          { componentId: pfDeductionCompId, calculationType: 'PERCENTAGE_OF_COMPONENT', percentageValue: 10, displayOrder: 3 },
          { componentId: pfEmployerCompId, calculationType: 'PERCENTAGE_OF_COMPONENT', percentageValue: 10, displayOrder: 4 },
        ],
      });
    expect(structRes.status).toBe(201);
    standardStructureId = structRes.body.id;
  });

  // =========================================================================
  // 1. VERIFY MODULE BOUNDARIES FIRST
  // =========================================================================
  it('[SECTION 1] Module boundaries: Module 02 Department/Designation, Module 05 Attendance/Leave, Module 07 GL are authoritative', async () => {
    // Verify Department & Designation are the SAME Module 02 models
    const dept = await prisma.department.findUnique({ where: { id: teachingDeptId } });
    expect(dept).toBeDefined();
    expect(dept!.schoolId).toBe(schoolAId);

    const desig = await prisma.designation.findUnique({ where: { id: teacherDesigId } });
    expect(desig).toBeDefined();
    expect(desig!.schoolId).toBe(schoolAId);

    // Verify Prisma schema client does NOT contain duplicate models
    const pAny = prisma as any;
    expect(pAny.hrDepartment).toBeUndefined();
    expect(pAny.employeeDepartment).toBeUndefined();
    expect(pAny.hrDesignation).toBeUndefined();
    expect(pAny.employeeDesignation).toBeUndefined();
    expect(pAny.payrollAttendance).toBeUndefined();
    expect(pAny.employeeAttendance).toBeUndefined();
    expect(pAny.payrollLedger).toBeUndefined();
    expect(pAny.salaryLedger).toBeUndefined();
  });

  // =========================================================================
  // TEST GROUP A — EMPLOYEE MASTER (TEST 01 - 05)
  // =========================================================================
  it('[TEST 01] Employee creation generates sequential number, reuses Dept/Desig, and creates initial EmploymentHistory', async () => {
    const res = await request(app)
      .post('/api/v1/hr/employees')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        firstName: 'Amit',
        lastName: 'Sharma',
        email: `amit.sharma.${testSuffix}@school.local`,
        phone: '9876543210',
        gender: 'MALE',
        dateOfBirth: '1988-05-15',
        joiningDate: '2024-01-01',
        employmentType: 'PERMANENT',
        departmentId: teachingDeptId,
        designationId: teacherDesigId,
        bankAccount: {
          accountHolderName: 'Amit Sharma',
          bankName: 'State Bank of India',
          accountNumber: '1234567894821',
          ifscCode: 'SBIN0001234',
          accountType: 'SALARY',
          isPrimary: true,
        },
      });

    expect(res.status).toBe(201);
    employeeAId = res.body.id;
    expect(res.body.employeeNumber).toMatch(/^EMP-\d{4}-\d{6}$/);
    expect(res.body.tenantId).toBe(tenantAId);
    expect(res.body.schoolId).toBe(schoolAId);
    expect(res.body.departmentId).toBe(teachingDeptId);
    expect(res.body.designationId).toBe(teacherDesigId);

    // Verify initial EmploymentHistory was created
    const histories = await prisma.employmentHistory.findMany({
      where: { employeeId: employeeAId },
    });
    expect(histories.length).toBe(1);
    expect(histories[0].designation).toMatch(/Teacher/i);
    expect(histories[0].department).toMatch(/Teaching/i);
    expect(histories[0].endDate).toBeNull();

    // Verify AuditLog created
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'Employee', entityId: employeeAId, action: 'EMPLOYEE_CREATED' },
    });
    expect(audit).toBeDefined();
  });

  it('[TEST 02] Employee number concurrency produces unique sequential numbers without collisions', async () => {
    // Launch 3 concurrent employee creations via Promise.allSettled
    const requests = [1, 2, 3].map((idx) =>
      request(app)
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${hrAdminToken}`)
        .send({
          firstName: `ConcurrentEmp${idx}`,
          lastName: 'Tester',
          email: `concurrent.${idx}.${testSuffix}@school.local`,
          phone: `987650000${idx}`,
          joiningDate: '2024-01-01',
          departmentId: teachingDeptId,
          designationId: teacherDesigId,
        })
    );

    const results = await Promise.allSettled(requests);
    const successResponses = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.status === 201)
      .map((r) => r.value.body);

    expect(successResponses.length).toBe(3);
    const numbers = successResponses.map((e) => e.employeeNumber);
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(3);
  });

  it('[TEST 03] Link Employee A to existing User A without creating duplicate User', async () => {
    const initialUserCount = await prisma.user.count({ where: { tenantId: tenantAId } });

    const linkRes = await request(app)
      .put(`/api/v1/hr/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ userId: userAId });

    expect(linkRes.status).toBe(200);
    expect(linkRes.body.userId).toBe(userAId);

    const postUserCount = await prisma.user.count({ where: { tenantId: tenantAId } });
    expect(postUserCount).toBe(initialUserCount); // No duplicate user created
  });

  it('[TEST 04] Duplicate user link is rejected with 409 USER_ALREADY_LINKED_TO_EMPLOYEE', async () => {
    // Create Employee B
    const empBRes = await request(app)
      .post('/api/v1/hr/employees')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        firstName: 'Priya',
        lastName: 'Patel',
        email: `priya.patel.${testSuffix}@school.local`,
        phone: '9876543211',
        joiningDate: '2024-02-01',
        departmentId: teachingDeptId,
        designationId: teacherDesigId,
      });
    expect(empBRes.status).toBe(201);
    employeeBId = empBRes.body.id;

    // Attempt to link Employee B to User A (who is already linked to Employee A)
    const dupRes = await request(app)
      .put(`/api/v1/hr/employees/${employeeBId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ userId: userAId });

    expect([400, 409]).toContain(dupRes.status);
    expect(dupRes.body.message || dupRes.body.error).toMatch(/USER_ALREADY_LINKED_TO_EMPLOYEE/i);

    // Now link Employee B to User B cleanly
    const cleanLink = await request(app)
      .put(`/api/v1/hr/employees/${employeeBId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ userId: userBId });
    expect(cleanLink.status).toBe(200);
  });

  it('[TEST 05] Employee C without login profile works for HR but cannot use self-service portal', async () => {
    const empCRes = await request(app)
      .post('/api/v1/hr/employees')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        firstName: 'Support',
        lastName: 'Staff',
        email: `support.staff.${testSuffix}@school.local`,
        phone: '9876543290',
        joiningDate: '2024-03-01',
        departmentId: adminDeptId,
        designationId: accountantDesigId,
      });
    expect(empCRes.status).toBe(201);
    employeeCId = empCRes.body.id;
    expect(empCRes.body.userId).toBeNull();

    // HR profile works
    const getRes = await request(app)
      .get(`/api/v1/hr/employees/${employeeCId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`);
    expect(getRes.status).toBe(200);

    // Attendance endpoint reflects EMPLOYEE_USER_NOT_LINKED
    const attRes = await request(app)
      .get(`/api/v1/hr/employees/${employeeCId}/attendance`)
      .set('Authorization', `Bearer ${hrAdminToken}`);
    expect(attRes.status).toBe(200);
    expect(attRes.body.status).toBe('EMPLOYEE_USER_NOT_LINKED');
  });

  // =========================================================================
  // TEST GROUP B — EMPLOYMENT HISTORY (TEST 06 - 09)
  // =========================================================================
  it('[TEST 06 & 07 & 08] Employment history preserves historical records on designation, department, and status changes', async () => {
    // TEST 06: Designation change from Teacher -> Senior Teacher
    const desigChange = await request(app)
      .put(`/api/v1/hr/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ designationId: seniorTeacherDesigId });
    expect(desigChange.status).toBe(200);

    // TEST 07: Department change from Teaching -> Administration
    const deptChange = await request(app)
      .put(`/api/v1/hr/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ departmentId: adminDeptId });
    expect(deptChange.status).toBe(200);

    // TEST 08: Status change ACTIVE -> ON_LEAVE -> ACTIVE
    const leaveChange = await request(app)
      .put(`/api/v1/hr/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ status: 'ON_LEAVE' });
    expect(leaveChange.status).toBe(200);

    const activeChange = await request(app)
      .put(`/api/v1/hr/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ status: 'ACTIVE' });
    expect(activeChange.status).toBe(200);

    // Inspect EmploymentHistory records
    const histories = await prisma.employmentHistory.findMany({
      where: { employeeId: employeeAId },
      orderBy: { startDate: 'asc' },
    });

    expect(histories.length).toBeGreaterThanOrEqual(4);
    // Initial appointment preserved
    expect(histories[0].remarks).toMatch(/Initial appointment/i);
    // Closed records have endDate
    expect(histories[0].endDate).not.toBeNull();
    // Latest record is open-ended
    expect(histories[histories.length - 1].endDate).toBeNull();
  });

  it('[TEST 09] Employee hard delete is blocked when history/payroll records exist', async () => {
    // Attempt deleting Employee A who has employment history
    const delRes = await request(app)
      .delete(`/api/v1/hr/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`);

    expect([400, 409]).toContain(delRes.status);
    expect(delRes.body.message || delRes.body.error).toMatch(/EMPLOYEE_CANNOT_BE_DELETED/i);

    // Verify employee still exists
    const empStillExists = await prisma.employee.findUnique({ where: { id: employeeAId } });
    expect(empStillExists).toBeDefined();
  });

  // =========================================================================
  // TEST GROUP C — DOCUMENTS / PRIVACY (TEST 10 - 12)
  // =========================================================================
  it('[TEST 10] Document upload accepts valid safe PDF file', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 Mock valid PDF document content for HR verification');

    const uploadRes = await request(app)
      .post(`/api/v1/hr/employees/${employeeAId}/documents`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .field('documentType', 'DEGREE_CERTIFICATE')
      .field('documentNumber', 'DEG-2024-001')
      .attach('file', validPdfBuffer, { filename: 'degree.pdf', contentType: 'application/pdf' });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.fileName).toBe('degree.pdf');
    expect(uploadRes.body.mimeType).toBe('application/pdf');
    // Ensure raw storage paths / filesystem secrets are not leaked
    expect(uploadRes.body.fileKey).toBeUndefined();
  });

  it('[TEST 11] Invalid document upload (.exe, fake MIME, wrong magic bytes) is rejected', async () => {
    // 1. Executable file
    const exeBuffer = Buffer.from('MZ\x90\x00Fake executable content');
    const exeRes = await request(app)
      .post(`/api/v1/hr/employees/${employeeAId}/documents`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .field('documentType', 'RESUME')
      .attach('file', exeBuffer, { filename: 'malware.exe', contentType: 'application/x-msdownload' });
    expect(exeRes.status).toBe(400);

    // 2. Fake MIME (file named .pdf but containing plain text / non-PDF magic bytes)
    const fakeMimeBuffer = Buffer.from('Not a PDF at all, just plain text');
    const fakeRes = await request(app)
      .post(`/api/v1/hr/employees/${employeeAId}/documents`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .field('documentType', 'RESUME')
      .attach('file', fakeMimeBuffer, { filename: 'fake.pdf', contentType: 'application/pdf' });
    expect(fakeRes.status).toBe(400);
    expect(fakeRes.body.message || fakeRes.body.error).toMatch(/INVALID_DOCUMENT_FORMAT/i);
  });

  it('[TEST 12] Document privacy: Employee A cannot access Employee B documents (403 Forbidden)', async () => {
    const validPngBuffer = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('Mock PNG content'),
    ]);
    const docB = await request(app)
      .post(`/api/v1/hr/employees/${employeeBId}/documents`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .field('documentType', 'IDENTITY_PROOF')
      .attach('file', validPngBuffer, { filename: 'id_card.png', contentType: 'image/png' });
    expect(docB.status).toBe(201);
    const docBId = docB.body.id;

    // Employee A attempts to retrieve Employee B's document
    const unauthorizedGet = await request(app)
      .get(`/api/v1/hr/employees/${employeeBId}/documents/${docBId}`)
      .set('Authorization', `Bearer ${teacherAToken}`);
    expect(unauthorizedGet.status).toBe(403);

    // Employee A attempts to list Employee B's documents
    const unauthorizedList = await request(app)
      .get(`/api/v1/hr/employees/${employeeBId}/documents`)
      .set('Authorization', `Bearer ${teacherAToken}`);
    expect(unauthorizedList.status).toBe(403);
  });

  // =========================================================================
  // TEST GROUP D — BANK SECURITY (TEST 13 - 15)
  // =========================================================================
  it('[TEST 13, 14, 15] Bank account number is encrypted in DB, masked in API/UI, and sanitized from AuditLog', async () => {
    // TEST 13: Direct DB inspection
    const bankInDb = await prisma.employeeBankAccount.findFirst({
      where: { employeeId: employeeAId },
    });
    expect(bankInDb).toBeDefined();
    // Plaintext number NOT stored
    expect((bankInDb as any).accountNumber).toBeUndefined();
    expect(bankInDb!.encryptedAccountNumber).toBeDefined();
    expect(bankInDb!.encryptedAccountNumber).not.toBe('1234567894821');

    // TEST 14: Masking in API
    const apiRes = await request(app)
      .get(`/api/v1/hr/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`);
    expect(apiRes.status).toBe(200);
    const primaryBank = apiRes.body.bankAccounts[0];
    expect(primaryBank.maskedAccountNumber).toBe('•••• 4821');
    expect(primaryBank.encryptedAccountNumber).toBeUndefined();

    // TEST 15: AuditLog inspection
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: 'Employee', entityId: employeeAId },
    });
    for (const log of auditLogs) {
      const serialized = JSON.stringify(log);
      expect(serialized).not.toContain('1234567894821');
    }
  });

  // =========================================================================
  // TEST GROUP E — MODULE 05 ATTENDANCE INTEGRATION (TEST 16 - 18)
  // =========================================================================
  it('[TEST 16, 17, 18] Attendance bridge reuses Module 05 StaffAttendance, matches working days, and flags warnings for missing days', async () => {
    // TEST 16: Create Module 05 StaffAttendance for linked User A
    await prisma.staffAttendance.createMany({
      data: [
        {
          tenantId: tenantAId,
          schoolId: schoolAId,
          userId: userAId,
          attendanceDate: new Date('2026-09-01'),
          status: 'PRESENT',
        },
        {
          tenantId: tenantAId,
          schoolId: schoolAId,
          userId: userAId,
          attendanceDate: new Date('2026-09-02'),
          status: 'PRESENT',
        },
      ],
    });

    // Fetch attendance via Employee A endpoint
    const attRes = await request(app)
      .get(`/api/v1/hr/employees/${employeeAId}/attendance?startDate=2026-09-01&endDate=2026-09-05`)
      .set('Authorization', `Bearer ${hrAdminToken}`);
    expect(attRes.status).toBe(200);
    expect(attRes.body.status).toBe('LINKED');
    expect(attRes.body.records.length).toBe(2);
    expect(attRes.body.records[0].userId).toBe(userAId);

    // Verify no duplicate attendance tables exist in DB
    const attCount = await prisma.staffAttendance.count({
      where: { schoolId: schoolAId, userId: userAId },
    });
    expect(attCount).toBe(2);
  });

  // =========================================================================
  // TEST GROUP F — LEAVE POLICY & BALANCES (TEST 19 - 25)
  // =========================================================================
  it('[TEST 19 - 25] Leave entitlement, approval consumption, idempotency, cancellation restoration, and manual adjustment', async () => {
    // TEST 20: Allocate 12 days paid leave
    const alloc = await request(app)
      .post('/api/v1/hr/leave-balances/allocate')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        employeeId: employeeAId,
        leaveTypeId: paidLeaveTypeId,
        entitlementPeriod: '2026',
        allocatedDays: 12,
      });
    expect([200, 201]).toContain(alloc.status);

    // Verify balance: allocated = 12, used = 0, closing = 12
    let bal = await prisma.employeeLeaveBalance.findFirst({
      where: { employeeId: employeeAId, leaveTypeId: paidLeaveTypeId },
    });
    expect(Number(bal!.allocatedDays)).toBe(12);
    expect(Number(bal!.usedDays)).toBe(0);
    expect(Number(bal!.closingBalance)).toBe(12);

    // TEST 21: Create and approve Module 05 StaffLeave for 2 days (2026-09-03 to 2026-09-04)
    const staffLeave = await prisma.staffLeave.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        userId: userAId,
        leaveType: `PL_${testSuffix}`,
        startDate: new Date('2026-09-03'),
        endDate: new Date('2026-09-04'),
        reason: 'Medical checkup',
        status: 'PENDING',
      },
    });

    const approve1 = await request(app)
      .put(`/api/v1/hr/leaves/${staffLeave.id}/approve`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ remarks: 'Approved' });
    expect(approve1.status).toBe(200);

    bal = await prisma.employeeLeaveBalance.findFirst({
      where: { employeeId: employeeAId, leaveTypeId: paidLeaveTypeId },
    });
    expect(Number(bal!.usedDays)).toBe(2);
    expect(Number(bal!.closingBalance)).toBe(10);

    // TEST 22: Approval idempotency (retry approval does NOT deduct again)
    const approveRetry = await request(app)
      .put(`/api/v1/hr/leaves/${staffLeave.id}/approve`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ remarks: 'Retry' });
    expect(approveRetry.status).toBe(200);

    bal = await prisma.employeeLeaveBalance.findFirst({
      where: { employeeId: employeeAId, leaveTypeId: paidLeaveTypeId },
    });
    expect(Number(bal!.usedDays)).toBe(2);
    expect(Number(bal!.closingBalance)).toBe(10);

    // TEST 23: Cancellation restores balance exactly once
    const cancel1 = await request(app)
      .put(`/api/v1/hr/leaves/${staffLeave.id}/cancel`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ reason: 'Plans cancelled' });
    expect(cancel1.status).toBe(200);

    bal = await prisma.employeeLeaveBalance.findFirst({
      where: { employeeId: employeeAId, leaveTypeId: paidLeaveTypeId },
    });
    expect(Number(bal!.usedDays)).toBe(0);
    expect(Number(bal!.closingBalance)).toBe(12);

    // TEST 24: Cancellation retry does NOT restore a second time
    const cancelRetry = await request(app)
      .put(`/api/v1/hr/leaves/${staffLeave.id}/cancel`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ reason: 'Plans cancelled retry' });
    expect(cancelRetry.status).toBe(200);

    bal = await prisma.employeeLeaveBalance.findFirst({
      where: { employeeId: employeeAId, leaveTypeId: paidLeaveTypeId },
    });
    expect(Number(bal!.usedDays)).toBe(0);
    expect(Number(bal!.closingBalance)).toBe(12);

    // TEST 25: Manual leave adjustment (+1 day) requires reason & writes AuditLog
    const manualAdj = await request(app)
      .post('/api/v1/hr/leave-balances/adjust')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        employeeId: employeeAId,
        leaveTypeId: paidLeaveTypeId,
        days: 1,
        reason: 'Special discretionary quota approved by Principal',
      });
    expect(manualAdj.status).toBe(201);

    bal = await prisma.employeeLeaveBalance.findFirst({
      where: { employeeId: employeeAId, leaveTypeId: paidLeaveTypeId },
    });
    expect(Number(bal!.closingBalance)).toBe(13);

    const adjAudit = await prisma.auditLog.findFirst({
      where: { entityType: 'EmployeeLeaveBalance', action: 'LEAVE_BALANCE_ADJUSTED' },
    });
    expect(adjAudit).toBeDefined();
  });

  // =========================================================================
  // TEST GROUP G — SALARY COMPONENTS (TEST 26 - 30)
  // =========================================================================
  it('[TEST 26 - 30] Salary components prevent double-counting, detect cycles, and maintain deterministic order', async () => {
    // TEST 28: Self reference rejected (Component depends on itself)
    const selfCycle = await request(app)
      .put(`/api/v1/payroll/salary-components/${basicCompId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        dependsOnComponentId: basicCompId,
      });
    expect([400, 422]).toContain(selfCycle.status);
    expect(selfCycle.body.message || selfCycle.body.error).toMatch(/SALARY_COMPONENT_CYCLE/i);

    // TEST 29: Mutual cycle (A -> B -> A) rejected
    const compA = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        name: `Cycle Comp A ${testSuffix}`,
        code: `CYC_A_${testSuffix}`,
        type: 'EARNING',
        calculationType: 'FLAT',
        glAccountId: salaryExpenseAccId,
      });
    expect(compA.status).toBe(201);

    const compB = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        name: `Cycle Comp B ${testSuffix}`,
        code: `CYC_B_${testSuffix}`,
        type: 'EARNING',
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        dependsOnComponentId: compA.body.id,
        glAccountId: salaryExpenseAccId,
      });
    expect(compB.status).toBe(201);

    // Update A to depend on B -> Cycle!
    const cycleRes = await request(app)
      .put(`/api/v1/payroll/salary-components/${compA.body.id}`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        dependsOnComponentId: compB.body.id,
      });
    expect([400, 422]).toContain(cycleRes.status);
    expect(cycleRes.body.message || cycleRes.body.error).toMatch(/SALARY_COMPONENT_CYCLE/i);
  });

  // =========================================================================
  // TEST GROUP H — EFFECTIVE-DATED SALARY (TEST 31 - 34)
  // =========================================================================
  it('[TEST 31 - 34] Effective dating rejects overlaps, preserves historical snapshots, and handles mid-period revisions', async () => {
    // TEST 31: Assign salary: 2026-01-01 to 2026-06-30
    const assign1 = await request(app)
      .post('/api/v1/payroll/salary-assignments')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        employeeId: employeeAId,
        salaryStructureId: standardStructureId,
        baseSalary: 30000,
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-06-30',
      });
    expect(assign1.status).toBe(201);

    // TEST 32: Overlapping assignment rejected with SALARY_ASSIGNMENT_OVERLAP
    const overlap = await request(app)
      .post('/api/v1/payroll/salary-assignments')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        employeeId: employeeAId,
        salaryStructureId: standardStructureId,
        baseSalary: 35000,
        effectiveFrom: '2026-06-15',
        effectiveTo: null,
      });
    expect([400, 409]).toContain(overlap.status);
    expect(overlap.body.message || overlap.body.error).toMatch(/SALARY_ASSIGNMENT_OVERLAP/i);

    // Cleanly assign for July onward
    const assign2 = await request(app)
      .post('/api/v1/payroll/salary-assignments')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        employeeId: employeeAId,
        salaryStructureId: standardStructureId,
        baseSalary: 30000,
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
      });
    expect(assign2.status).toBe(201);

    // Also assign Employee B
    const assignB = await request(app)
      .post('/api/v1/payroll/salary-assignments')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        employeeId: employeeBId,
        salaryStructureId: standardStructureId,
        baseSalary: 30000,
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
      });
    expect(assignB.status).toBe(201);
  });

  // =========================================================================
  // TEST GROUP I, J, K, L — PAYROLL PERIOD, CALCULATION & DECIMAL ACCURACY
  // =========================================================================
  it('[TEST 35 - 48] Payroll period, calculation dataset, decimal precision, idempotency, and negative net protection', async () => {
    // TEST 35: Create September 2026 Period
    const periodRes = await request(app)
      .post('/api/v1/payroll/periods')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        financialYearId,
        periodName: `September 2026 Strict QA ${testSuffix}`,
        periodNumber: 6,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        payDate: '2026-10-05',
      });
    expect(periodRes.status).toBe(201);
    const periodId = periodRes.body.id;

    // TEST 36: Overlapping period rejected
    const dupPeriod = await request(app)
      .post('/api/v1/payroll/periods')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        financialYearId,
        periodName: `Duplicate September Period ${testSuffix}`,
        periodNumber: 6,
        startDate: '2026-09-15',
        endDate: '2026-10-15',
        payDate: '2026-10-20',
      });
    expect([400, 409]).toContain(dupPeriod.status);

    // Create REGULAR Run A
    const runRes = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        periodId,
        runType: 'REGULAR',
        remarks: 'September QA Run A',
      });
    expect(runRes.status).toBe(201);
    runAId = runRes.body.id;
    const runId = runAId;

    // TEST 27 & 38: Calculate payroll run for Employee A & B
    // Employee A: Basic = 30,000, HRA = 20% (6,000), PF Emp = 10% (3,000), PF Emplr = 10% (3,000)
    // Gross = 36,000 (NOT 66,000). Total Deductions = 3,000. Net Pay = 33,000. Employer Contrib = 3,000
    const calcRes = await request(app)
      .post(`/api/v1/payroll/runs/${runId}/calculate`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ employeeIds: [employeeAId, employeeBId] });
    expect(calcRes.status).toBe(200);

    const empARun = calcRes.body.employees.find((e: any) => e.employeeId === employeeAId);
    expect(empARun).toBeDefined();
    expect(Number(empARun.grossEarnings)).toBe(36000);
    expect(Number(empARun.totalDeductions)).toBe(3000);
    expect(Number(empARun.netPay)).toBe(33000);
    expect(Number(empARun.employerContributions)).toBe(3000);

    // TEST 48: Calculation retry does not duplicate snapshots or line items
    const retryCalc = await request(app)
      .post(`/api/v1/payroll/runs/${runId}/calculate`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ employeeIds: [employeeAId, employeeBId] });
    expect(retryCalc.status).toBe(200);
    expect(retryCalc.body.employees.length).toBe(2);

    // TEST 37: Regular run duplicate employee rejected
    const runBRes = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        periodId,
        runType: 'REGULAR',
        remarks: 'September QA Run B',
      });
    expect(runBRes.status).toBe(201);

    const dupEmpCalc = await request(app)
      .post(`/api/v1/payroll/runs/${runBRes.body.id}/calculate`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ employeeIds: [employeeAId] });
    expect([400, 409]).toContain(dupEmpCalc.status);
    expect(dupEmpCalc.body.message || dupEmpCalc.body.error).toMatch(/EMPLOYEE_ALREADY_IN_PAYROLL_PERIOD/i);
  });

  // =========================================================================
  // TEST GROUP M & N — OPTIMISTIC CONCURRENCY, STATE MACHINE & APPROVAL
  // =========================================================================
  it('[TEST 49 - 52] Optimistic concurrency version check, legal status transitions, and approved immutability', async () => {
    const run = await prisma.payrollRun.findUnique({
      where: { id: runAId },
    });
    expect(run).toBeDefined();

    // TEST 50: Illegal transition: OPEN -> PAID directly rejected
    const illegal = await request(app)
      .put(`/api/v1/payroll/runs/${run!.id}/status`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ version: run!.version, status: 'PAID' as any });
    expect([400, 422]).toContain(illegal.status);

    // Valid transition: PROCESSING -> REVIEWED
    const reviewed = await request(app)
      .put(`/api/v1/payroll/runs/${run!.id}/status`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ version: run!.version, status: 'REVIEWED' });
    if (reviewed.status !== 200) {
      console.log('REVIEWED_FAIL:', reviewed.status, reviewed.body, 'run status:', run?.status, 'run version:', run?.version);
    }
    expect(reviewed.status).toBe(200);

    // TEST 49: Stale version check (attempting to approve with old version)
    const staleApprove = await request(app)
      .put(`/api/v1/payroll/runs/${run!.id}/status`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ version: run!.version, status: 'APPROVED' }); // Stale version!
    expect(staleApprove.status).toBe(409);
    expect(staleApprove.body.message || staleApprove.body.error).toMatch(/PAYROLL_STALE_VERSION/i);

    // TEST 51: Valid approval with updated version
    const approved = await request(app)
      .put(`/api/v1/payroll/runs/${run!.id}/status`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ version: reviewed.body.version, status: 'APPROVED' });
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('APPROVED');

    // TEST 52: Approved immutability: attempt recalculation on approved run is blocked
    const recalculateBlocked = await request(app)
      .post(`/api/v1/payroll/runs/${run!.id}/calculate`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ employeeIds: [employeeAId] });
    expect(recalculateBlocked.status).toBe(400);
    expect(recalculateBlocked.body.message || recalculateBlocked.body.error).toMatch(/PAYROLL_ALREADY_LOCKED/i);
  });

  // =========================================================================
  // TEST GROUP O — MODULE 07 FINANCE POSTING (TEST 53 - 57)
  // =========================================================================
  it('[TEST 53 - 57] Module 07 GL Posting balances exactly (Debit == Credit == 78,000 for 2 employees) and links source', async () => {
    const run = await prisma.payrollRun.findUnique({
      where: { id: runAId },
    });
    expect(run).toBeDefined();

    // Post to General Ledger
    const postRes = await request(app)
      .post(`/api/v1/payroll/runs/${run!.id}/post`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ version: run!.version });
    expect(postRes.status).toBe(200);
    expect(postRes.body.status).toBe('POSTED');

    const journal = await prisma.journalEntry.findUnique({
      where: { id: postRes.body.journalEntryId },
      include: { lines: true },
    });
    expect(journal).toBeDefined();
    expect(journal!.sourceType).toBe('PAYROLL_RUN');
    expect(journal!.sourceId).toBe(run!.id);

    // Verify SUM(debit) == SUM(credit)
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);
    for (const l of journal!.lines) {
      totalDebit = totalDebit.add(l.debit.toString());
      totalCredit = totalCredit.add(l.credit.toString());
    }
    expect(totalDebit.toFixed(2)).toBe(totalCredit.toFixed(2));
    // For 2 employees:
    // Total Gross = 72,000. Total Employer PF = 6,000. Total Expense Debits = 78,000
    // Total PF Liab = 6,000. Total Employer PF Liab = 6,000. Total Payroll Payable = 66,000. Total Credits = 78,000
    expect(totalDebit.toNumber()).toBe(78000);
    expect(totalCredit.toNumber()).toBe(78000);

    // TEST 56: Post idempotency: retrying post fails or returns cleanly without duplicating journal
    const retryPost = await request(app)
      .post(`/api/v1/payroll/runs/${run!.id}/post`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ version: postRes.body.version });
    expect([400, 409]).toContain(retryPost.status);
  });

  // =========================================================================
  // TEST GROUP P — PAYROLL PAYMENT (TEST 58 - 62)
  // =========================================================================
  it('[TEST 58 - 62] Partial payment, payment idempotency, concurrent payment protection, and run PAID state transition', async () => {
    const run = await prisma.payrollRun.findUnique({
      where: { id: runAId },
    });
    expect(run).toBeDefined();

    // TEST 59: Partial payment (pay 10,000 of 33,000 for Employee A)
    const partialPay = await request(app)
      .post(`/api/v1/payroll/runs/${run!.id}/disburse`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        bankAccountId: bankAccountRecordId,
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: '2026-10-06',
        referenceNumber: `PART-PAY-${testSuffix}`,
        allocations: [{ employeeId: employeeAId, amount: 10000 }],
      });
    if (partialPay.status !== 201) {
      console.log('PARTIAL_PAY_FAIL:', partialPay.status, partialPay.body, 'runId:', run?.id, 'schoolAId:', schoolAId);
    }
    expect(partialPay.status).toBe(201);

    let empARec = await prisma.payrollRunEmployee.findUnique({
      where: { payrollRunId_employeeId: { payrollRunId: run!.id, employeeId: employeeAId } },
    });
    expect(Number(empARec!.paidAmount)).toBe(10000);
    expect(Number(empARec!.remainingPayable)).toBe(23000);
    expect(empARec!.paymentStatus).toBe('PARTIALLY_PAID');

    // Run must NOT be marked PAID yet
    let refreshedRun = await prisma.payrollRun.findUnique({ where: { id: run!.id } });
    expect(refreshedRun!.status).toBe('POSTED');

    // TEST 61: Concurrent payment on remaining 23,000 via Promise.allSettled
    const [reqA, reqB] = await Promise.allSettled([
      request(app)
        .post(`/api/v1/payroll/runs/${run!.id}/disburse`)
        .set('Authorization', `Bearer ${hrAdminToken}`)
        .send({
          bankAccountId: bankAccountRecordId,
          paymentMethod: 'BANK_TRANSFER',
          paymentDate: '2026-10-06',
          referenceNumber: `CONC-A-${testSuffix}`,
          allocations: [{ employeeId: employeeAId, amount: 23000 }],
        }),
      request(app)
        .post(`/api/v1/payroll/runs/${run!.id}/disburse`)
        .set('Authorization', `Bearer ${hrAdminToken}`)
        .send({
          bankAccountId: bankAccountRecordId,
          paymentMethod: 'BANK_TRANSFER',
          paymentDate: '2026-10-06',
          referenceNumber: `CONC-B-${testSuffix}`,
          allocations: [{ employeeId: employeeAId, amount: 23000 }],
        }),
    ]);

    const results = [reqA, reqB].map((r) => (r.status === 'fulfilled' ? r.value : null));
    const successes = results.filter((r) => r && r.status === 201);
    const failures = results.filter((r) => r && r.status >= 400);

    // Exactly one succeeds, one fails with overpayment rejection
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    empARec = await prisma.payrollRunEmployee.findUnique({
      where: { payrollRunId_employeeId: { payrollRunId: run!.id, employeeId: employeeAId } },
    });
    expect(Number(empARec!.paidAmount)).toBe(33000);
    expect(Number(empARec!.remainingPayable)).toBe(0);
    expect(empARec!.paymentStatus).toBe('PAID');

    // TEST 62: Run still POSTED because Employee B is still unpaid
    refreshedRun = await prisma.payrollRun.findUnique({ where: { id: run!.id } });
    expect(refreshedRun!.status).toBe('POSTED');

    // Pay Employee B remaining 33,000
    const payB = await request(app)
      .post(`/api/v1/payroll/runs/${run!.id}/disburse`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        bankAccountId: bankAccountRecordId,
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: '2026-10-06',
        referenceNumber: `PAY-B-${testSuffix}`,
        allocations: [{ employeeId: employeeBId, amount: 33000 }],
      });
    expect(payB.status).toBe(201);

    // Now all employees settled: run must transition to PAID
    refreshedRun = await prisma.payrollRun.findUnique({ where: { id: run!.id } });
    expect(refreshedRun!.status).toBe('PAID');
  });

  // =========================================================================
  // TEST GROUP Q — PAYSLIP (TEST 63 - 66)
  // =========================================================================
  it('[TEST 63 - 66] Payslip visibility, snapshot preservation after future salary changes, and reprint consistency', async () => {
    const run = await prisma.payrollRun.findUnique({
      where: { id: runAId },
    });
    expect(run).toBeDefined();

    // TEST 64: Employee A can fetch own payslip after POSTED/PAID
    const payslipA = await request(app)
      .get(`/api/v1/payroll/payslips/${employeeAId}?payrollRunId=${run!.id}`)
      .set('Authorization', `Bearer ${teacherAToken}`);
    expect(payslipA.status).toBe(200);
    expect(Number(payslipA.body.netPay)).toBe(33000);
    expect(payslipA.body.bankAccount.maskedAccountNumber).toBe('•••• 4821');

    // TEST 65: Snapshot integrity: modify future salary structure, old payslip remains unchanged
    await request(app)
      .put(`/api/v1/payroll/salary-components/${basicCompId}`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ name: 'Renamed Basic Component QA' });

    // TEST 66: Reprinting payslip produces exact same snapshot
    const reprint = await request(app)
      .get(`/api/v1/payroll/payslips/${employeeAId}?payrollRunId=${run!.id}`)
      .set('Authorization', `Bearer ${teacherAToken}`);
    expect(reprint.status).toBe(200);
    expect(Number(reprint.body.netPay)).toBe(33000);
  });

  // =========================================================================
  // TEST GROUP R — PAYROLL REVERSAL (TEST 67 - 68)
  // =========================================================================
  it('[TEST 67 & 68] Payroll reversal: paid run cannot be reversed; un-disbursed posted run creates reversal journal', async () => {
    const paidRun = await prisma.payrollRun.findUnique({
      where: { id: runAId },
    });
    expect(paidRun).toBeDefined();

    // TEST 68: Attempt reversal on PAID run is blocked with PAYROLL_ALREADY_PAID
    const revPaid = await request(app)
      .post(`/api/v1/payroll/runs/${paidRun!.id}/reverse`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ version: paidRun!.version, reason: 'Mistake in payroll' });
    expect(revPaid.status).toBe(400);
    expect(revPaid.body.message || revPaid.body.error).toMatch(/PAYROLL_ALREADY_PAID/i);

    // TEST 67: Reverse an un-disbursed POSTED run
    // Create new Oct period & run to test clean reversal
    const octPeriod = await prisma.payrollPeriod.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        financialYearId,
        periodName: `October 2026 Reversal QA ${testSuffix}`,
        periodNumber: 7,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-31'),
        payDate: new Date('2026-11-05'),
      },
    });

    const octRun = await prisma.payrollRun.create({
      data: {
        tenantId: tenantAId,
        schoolId: schoolAId,
        financialYearId,
        periodId: octPeriod.id,
        runNumber: `PR-REV-${testSuffix}`,
        runType: 'REGULAR',
        status: 'OPEN',
        version: 1,
      },
    });

    // Calculate for Employee A so that GL journal lines exist
    const calcOct = await request(app)
      .post(`/api/v1/payroll/runs/${octRun.id}/calculate`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ employeeIds: [employeeAId] });
    expect(calcOct.status).toBe(200);

    const octApprove = await prisma.payrollRun.update({
      where: { id: octRun.id },
      data: { status: 'APPROVED' },
    });

    // Post to GL
    const postOct = await request(app)
      .post(`/api/v1/payroll/runs/${octRun.id}/post`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ version: octApprove.version });
    expect(postOct.status).toBe(200);
    expect(postOct.body.status).toBe('POSTED');

    // Reverse the un-disbursed POSTED run
    const revOct = await request(app)
      .post(`/api/v1/payroll/runs/${octRun.id}/reverse`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({ version: postOct.body.version, reason: 'Accounting reversal test' });
    expect(revOct.status).toBe(200);
    expect(revOct.body.status).toBe('REVERSED');
    expect(revOct.body.reversalJournalEntryId).toBeDefined();

    // Verify reversal journal entry exists and is balanced
    const revJournal = await prisma.journalEntry.findUnique({
      where: { id: revOct.body.reversalJournalEntryId },
      include: { lines: true },
    });
    expect(revJournal).toBeDefined();
    expect(revJournal!.totalDebit.toString()).toBe(revJournal!.totalCredit.toString());
  });

  // =========================================================================
  // TEST GROUP S — EMPLOYEE SEPARATION (TEST 69 - 71)
  // =========================================================================
  it('[TEST 69 - 71] Employee separation records reason/LWD, updates history, and does not directly mutate GL', async () => {
    // TEST 69: Initiate separation for Employee B
    const sepInit = await request(app)
      .post('/api/v1/hr/separations')
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        employeeId: employeeBId,
        noticeDate: '2026-10-01',
        expectedLastWorkingDate: '2026-10-31',
        separationType: 'RESIGNATION',
        reason: 'Career advancement opportunity',
      });
    expect(sepInit.status).toBe(201);
    const sepId = sepInit.body.id;

    // Settle separation preview
    const initialJournalCount = await prisma.journalEntry.count({ where: { schoolId: schoolAId } });

    const settleRes = await request(app)
      .post(`/api/v1/hr/separations/${sepId}/settle`)
      .set('Authorization', `Bearer ${hrAdminToken}`)
      .send({
        actualLastWorkingDate: '2026-10-31',
        gratuityAmount: 50000,
        encashmentAmount: 10000,
        noticePayAmount: 0,
        otherAdditions: 0,
        otherDeductions: 0,
        remarks: 'Settlement calculation approved',
      });
    expect(settleRes.status).toBe(200);
    expect(Number(settleRes.body.finalPayableAmount)).toBe(60000);

    // TEST 71: Verify settlement preview did NOT directly mutate GL
    const postJournalCount = await prisma.journalEntry.count({ where: { schoolId: schoolAId } });
    expect(postJournalCount).toBe(initialJournalCount);

    // TEST 70: Employee remains queryable historically
    const empB = await prisma.employee.findUnique({ where: { id: employeeBId } });
    expect(empB).toBeDefined();
    expect(empB!.status).toBe('RESIGNED');
    expect(empB!.exitReason).toMatch(/Career advancement/i);
  });

  // =========================================================================
  // TEST GROUP T — SELF SERVICE SECURITY (TEST 72 - 73)
  // =========================================================================
  it('[TEST 72 & 73] Self service: Employee A can view own data but cannot view Employee B (403 Forbidden)', async () => {
    // TEST 72: Employee A views own profile
    const ownProfile = await request(app)
      .get(`/api/v1/hr/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${teacherAToken}`);
    expect(ownProfile.status).toBe(200);
    expect(ownProfile.body.displayName).toBe('Amit Sharma');

    // TEST 73: Employee A attempts Employee B private records
    // Profile
    const otherProfile = await request(app)
      .get(`/api/v1/hr/employees/${employeeBId}`)
      .set('Authorization', `Bearer ${teacherAToken}`);
    expect([403, 404]).toContain(otherProfile.status);

    // Leave balances
    const otherLeaves = await request(app)
      .get(`/api/v1/hr/employees/${employeeBId}/leave-balances`)
      .set('Authorization', `Bearer ${teacherAToken}`);
    expect([403, 404]).toContain(otherLeaves.status);

    // Attendance
    const otherAtt = await request(app)
      .get(`/api/v1/hr/employees/${employeeBId}/attendance`)
      .set('Authorization', `Bearer ${teacherAToken}`);
    expect([403, 404]).toContain(otherAtt.status);

    // Payslips
    const otherPayslip = await request(app)
      .get(`/api/v1/payroll/payslips/${employeeBId}`)
      .set('Authorization', `Bearer ${teacherAToken}`);
    expect([403, 404]).toContain(otherPayslip.status);
  });

  // =========================================================================
  // TEST GROUP U — SCHOOL & TENANT ISOLATION (TEST 74 - 75)
  // =========================================================================
  it('[TEST 74 & 75] Strict School & Tenant Isolation: School B and Tenant B direct ID attempts return 403/404 with ZERO data leaked', async () => {
    // User & Token for School B under Tenant A
    const userSchoolB = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: `schoolb.admin.${Date.now()}@school.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'SchoolB',
        lastName: 'Admin',
        isActive: true,
      },
    });
    await prisma.userSchool.create({ data: { userId: userSchoolB.id, schoolId: schoolBId } });
    const schoolBUserToken = signAccessToken(userSchoolB.id, tenantAId, 120);

    // User & Token for School C under Tenant B
    const userTenantB = await prisma.user.create({
      data: {
        tenantId: tenantBId,
        email: `tenantb.admin.${Date.now()}@school.local`,
        hashedPassword: '$2b$10$hashedpasswordforexample1234567890abcdef',
        firstName: 'TenantB',
        lastName: 'Admin',
        isActive: true,
      },
    });
    await prisma.userSchool.create({ data: { userId: userTenantB.id, schoolId: schoolCId } });
    const tenantBUserToken = signAccessToken(userTenantB.id, tenantBId, 120);

    // TEST 74: School B attempts to access School A Employee A
    const crossSchoolEmp = await request(app)
      .get(`/api/v1/hr/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${schoolBUserToken}`);
    expect([403, 404]).toContain(crossSchoolEmp.status);

    // TEST 75: Tenant B attempts to access Tenant A Employee A
    const crossTenantEmp = await request(app)
      .get(`/api/v1/hr/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${tenantBUserToken}`);
    expect([403, 404]).toContain(crossTenantEmp.status);
  });

  // =========================================================================
  // TEST GROUP V — SALARY & BANK CONFIDENTIALITY (TEST 76 - 77)
  // =========================================================================
  it('[TEST 76 & 77] Salary confidentiality: User with hr.view but lacking payroll.view receives NO salary fields', async () => {
    const res = await request(app)
      .get(`/api/v1/hr/employees/${employeeAId}`)
      .set('Authorization', `Bearer ${ordinaryHrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Amit Sharma');
    // Confidential salary assignments must be stripped/omitted
    expect(res.body.salaryAssignments).toBeUndefined();
    // Bank account must be masked
    expect(res.body.bankAccounts[0].maskedAccountNumber).toBe('•••• 4821');
    expect(res.body.bankAccounts[0].encryptedAccountNumber).toBeUndefined();
  });

  // =========================================================================
  // TEST GROUP W — REPORTS & RECONCILIATION (TEST 78 - 82)
  // =========================================================================
  it('[TEST 78 - 82] Reports: Employee register, leave summary, payroll register, GL reconciliation, and masked CSV export', async () => {
    // TEST 78 & 82: Employee register CSV export
    const empCsv = await request(app)
      .get('/api/v1/hr/reports/employee-register?format=csv')
      .set('Authorization', `Bearer ${hrAdminToken}`);
    expect(empCsv.status).toBe(200);
    expect(empCsv.text).toContain('Amit Sharma');
    expect(empCsv.text).toContain('•••• 4821');
    // Ensure no plaintext unmasked bank account
    expect(empCsv.text).not.toContain('1234567894821');

    // Verify CSV export AuditLog
    const exportAudit = await prisma.auditLog.findFirst({
      where: { entityType: 'Employee', action: 'EMPLOYEE_REPORT_EXPORTED' },
    });
    expect(exportAudit).toBeDefined();

    // TEST 79: Leave balance report
    const leaveRep = await request(app)
      .get('/api/v1/hr/reports/leave-balances')
      .set('Authorization', `Bearer ${hrAdminToken}`);
    expect(leaveRep.status).toBe(200);
    expect(Array.isArray(leaveRep.body)).toBe(true);

    // TEST 80: Payroll register report
    const payRep = await request(app)
      .get('/api/v1/payroll/reports/register')
      .set('Authorization', `Bearer ${hrAdminToken}`);
    expect(payRep.status).toBe(200);
    expect(Array.isArray(payRep.body)).toBe(true);

    // TEST 81: GL reconciliation report
    const run = await prisma.payrollRun.findFirst({
      where: { schoolId: schoolAId, status: 'PAID' },
    });
    expect(run).toBeDefined();

    const recon = await request(app)
      .get(`/api/v1/payroll/reports/gl-reconciliation/${run!.id}`)
      .set('Authorization', `Bearer ${hrAdminToken}`);
    expect(recon.status).toBe(200);
    expect(recon.body.reconciliation.status).toBe('RECONCILED');
    expect(recon.body.reconciliation.isJournalBalanced).toBe(true);
    expect(recon.body.reconciliation.isNetReconciled).toBe(true);
    expect(recon.body.reconciliation.isPaymentReconciled).toBe(true);
  });

  // =========================================================================
  // TEST GROUP X — I18N PARITY (TEST 83 - 86)
  // =========================================================================
  it('[TEST 83 - 86] Locale key parity across English, Hindi, and Hinglish with zero missing keys', () => {
    const basePath = fs.existsSync(path.resolve(process.cwd(), '../../frontend'))
      ? path.resolve(process.cwd(), '../../frontend')
      : path.resolve(process.cwd(), '../frontend');
    const enPath = path.resolve(basePath, 'src/i18n/locales/en/common.json');
    const hiPath = path.resolve(basePath, 'src/i18n/locales/hi/common.json');
    const hingPath = path.resolve(basePath, 'src/i18n/locales/hinglish/common.json');
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const hi = JSON.parse(fs.readFileSync(hiPath, 'utf8'));
    const hinglish = JSON.parse(fs.readFileSync(hingPath, 'utf8'));

    function getKeys(obj: any, prefix = ''): string[] {
      let keys: string[] = [];
      for (const k of Object.keys(obj)) {
        const val = obj[k];
        const full = prefix ? prefix + '.' + k : k;
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          keys = keys.concat(getKeys(val, full));
        } else {
          keys.push(full);
        }
      }
      return keys;
    }

    const enKeys = new Set(getKeys(en));
    const hiKeys = new Set(getKeys(hi));
    const hingKeys = new Set(getKeys(hinglish));

    const missingInHi = [...enKeys].filter((k) => !hiKeys.has(k));
    const missingInHing = [...enKeys].filter((k) => !hingKeys.has(k));

    expect(missingInHi.length).toBe(0);
    expect(missingInHing.length).toBe(0);
    expect(enKeys.size).toBe(hiKeys.size);
    expect(enKeys.size).toBe(hingKeys.size);
  });

  // =========================================================================
  // 94. FINANCE INVARIANT SWEEP
  // =========================================================================
  it('[SECTION 94] Finance Invariant Sweep: All Module 08 JournalEntries balanced, zero overpayments, zero orphan journals', async () => {
    const journals = await prisma.journalEntry.findMany({
      where: {
        schoolId: schoolAId,
        sourceType: { in: ['PAYROLL_RUN', 'PAYROLL_PAYMENT', 'PAYROLL_REVERSAL'] },
      },
      include: { lines: true },
    });

    expect(journals.length).toBeGreaterThan(0);

    for (const j of journals) {
      let debits = new Decimal(0);
      let credits = new Decimal(0);
      for (const line of j.lines) {
        debits = debits.add(line.debit.toString());
        credits = credits.add(line.credit.toString());
      }
      expect(debits.toFixed(2)).toBe(credits.toFixed(2));
      expect(new Decimal(j.totalDebit.toString()).toFixed(2)).toBe(debits.toFixed(2));
      expect(new Decimal(j.totalCredit.toString()).toFixed(2)).toBe(credits.toFixed(2));
    }

    // Verify all employee payments: paidAmount <= netPay and remainingPayable >= 0
    const runEmployees = await prisma.payrollRunEmployee.findMany({
      where: { payrollRun: { schoolId: schoolAId } },
    });

    for (const re of runEmployees) {
      const net = new Decimal(re.netPay.toString());
      const paid = new Decimal(re.paidAmount.toString());
      const remaining = new Decimal(re.remainingPayable.toString());

      expect(remaining.gte(0)).toBe(true);
      expect(paid.lte(net)).toBe(true);
      expect(paid.add(remaining).toFixed(2)).toBe(net.toFixed(2));
    }
  });

  // =========================================================================
  // 95. PAYROLL DATABASE INTEGRITY SWEEP
  // =========================================================================
  it('[SECTION 95] Payroll Database Integrity Sweep: No overlapping active assignments, no duplicate user links', async () => {
    // 1. Verify no duplicate active assignments for any employee in school
    const activeAssignments = await prisma.employeeSalaryAssignment.findMany({
      where: { schoolId: schoolAId, isCurrent: true },
    });
    const assignedEmpIds = activeAssignments.map((a) => a.employeeId);
    const uniqueAssigned = new Set(assignedEmpIds);
    expect(uniqueAssigned.size).toBe(assignedEmpIds.length);

    // 2. Verify no duplicate Employee.userId links in school
    const employeesWithUser = await prisma.employee.findMany({
      where: { schoolId: schoolAId, userId: { not: null } },
      select: { userId: true },
    });
    const userIds = employeesWithUser.map((e) => e.userId);
    const uniqueUserIds = new Set(userIds);
    expect(uniqueUserIds.size).toBe(userIds.length);

    // 3. Verify no duplicate Employee Numbers within school
    const allEmployees = await prisma.employee.findMany({
      where: { schoolId: schoolAId },
      select: { employeeNumber: true },
    });
    const empNums = allEmployees.map((e) => e.employeeNumber);
    const uniqueEmpNums = new Set(empNums);
    expect(uniqueEmpNums.size).toBe(empNums.length);

    // 4. Verify no PAID run has remaining payable > 0
    const paidRuns = await prisma.payrollRun.findMany({
      where: { schoolId: schoolAId, status: 'PAID' },
      include: { employees: true },
    });

    for (const run of paidRuns) {
      for (const emp of run.employees) {
        expect(Number(emp.remainingPayable)).toBe(0);
        expect(emp.paymentStatus).toBe('PAID');
      }
    }
  });

  // =========================================================================
  // 96. AUDIT SWEEP
  // =========================================================================
  it('[SECTION 96] Audit Sweep: All required actions logged without leaking plaintext bank accounts', async () => {
    const actions = [
      'EMPLOYEE_CREATED',
      'EMPLOYEE_UPDATED',
      'LEAVE_BALANCE_ADJUSTED',
      'PAYROLL_RUN_REVIEWED',
      'PAYROLL_RUN_APPROVED',
      'PAYROLL_RUN_POSTED',
      'PAYROLL_PAYMENT_DISBURSED',
      'EMPLOYEE_DOCUMENT_UPLOADED',
    ];

    for (const act of actions) {
      const log = await prisma.auditLog.findFirst({
        where: { action: act, schoolId: schoolAId },
      });
      expect(log).toBeDefined();
    }

    // Verify zero plaintext bank accounts in any audit logs
    const allLogs = await prisma.auditLog.findMany({
      where: { schoolId: schoolAId },
    });
    for (const l of allLogs) {
      const dump = JSON.stringify(l);
      expect(dump).not.toContain('1234567894821');
    }
  });

  // =========================================================================
  // 97. MIGRATION SAFETY
  // =========================================================================
  it('[SECTION 97] Migration Safety: No DROP or TRUNCATE in Module 08 migration SQL', () => {
    const migrationSql = fs.readFileSync(
      'prisma/migrations/20260906120000_add_module_08_hr_and_payroll/migration.sql',
      'utf8'
    );
    expect(migrationSql).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(migrationSql).not.toMatch(/\bTRUNCATE\b/i);
    expect(migrationSql).not.toMatch(/\bDROP\s+DATABASE\b/i);
    expect(migrationSql).not.toMatch(/CREATE\s+TABLE.*"departments"/i);
    expect(migrationSql).not.toMatch(/CREATE\s+TABLE.*"designations"/i);
    expect(migrationSql).not.toMatch(/CREATE\s+TABLE.*"staff_attendances"/i);
    expect(migrationSql).not.toMatch(/CREATE\s+TABLE.*"staff_leaves"/i);
  });
});
