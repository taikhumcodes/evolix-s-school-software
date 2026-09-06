import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;

describe('EVOLIX School ERP — Major Module 08 HR & Payroll Integrity QA Suite (Amendments A to Q + Invariant Sweep)', () => {
  let adminToken: string;
  let tenantId: string;
  let schoolId: string;
  let financialYearId: string;

  // Chart of accounts
  let salaryExpenseAccId: string;
  let employerPfExpenseAccId: string;
  let deductionLiabAccId: string;
  let employerPfLiabAccId: string;
  let payrollPayableAccId: string;
  let bankLedgerAccId: string;
  let bankAccountRecordId: string;

  // Master HR & Payroll IDs
  let payrollConfigId: string;
  let periodSepId: string;
  let basicCompId: string;
  let hraCompId: string;
  let splAllowanceCompId: string;
  let pfDeductionCompId: string;
  let pfEmployerCompId: string;
  let structureId: string;
  let casualLeaveTypeId: string;
  let unpaidLeaveTypeId: string;

  let employee1Id: string;
  let employee2Id: string;
  let emp1UserId: string;

  const testSuffix = Date.now().toString().slice(-6);

  beforeAll(async () => {
    // 1. Login as Admin
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@evolix.local', password: 'Password123!' });
    expect(login.status).toBe(200);
    adminToken = login.body.access_token;

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(me.status).toBe(200);
    tenantId = me.body.tenant_id;
    schoolId = me.body.schools[0]?.id;
    expect(schoolId).toBeDefined();

    // 2. Create Isolated Financial Year for QA run
    const fy = await prisma.financialYear.create({
      data: {
        tenantId,
        schoolId,
        name: `FY 2026-27 QA ${testSuffix}`,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        isClosed: false,
      },
    });
    financialYearId = fy.id;

    // 3. Resolve or Create General Ledger Accounts for Payroll
    const accSalaryExp = await prisma.account.upsert({
      where: { schoolId_code: { schoolId, code: `EXP-SAL-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId,
        code: `EXP-SAL-${testSuffix}`,
        name: 'Staff Salary Expense QA',
        type: 'EXPENSE',
        normalBalance: 'DEBIT',
        currency: 'INR',
        isActive: true,
      },
    });
    salaryExpenseAccId = accSalaryExp.id;

    const accPfExp = await prisma.account.upsert({
      where: { schoolId_code: { schoolId, code: `EXP-PF-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId,
        code: `EXP-PF-${testSuffix}`,
        name: 'Employer PF Expense QA',
        type: 'EXPENSE',
        normalBalance: 'DEBIT',
        currency: 'INR',
        isActive: true,
      },
    });
    employerPfExpenseAccId = accPfExp.id;

    const accPfLiab = await prisma.account.upsert({
      where: { schoolId_code: { schoolId, code: `LIAB-PF-EMP-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId,
        code: `LIAB-PF-EMP-${testSuffix}`,
        name: 'PF Deduction Liability QA',
        type: 'LIABILITY',
        normalBalance: 'CREDIT',
        currency: 'INR',
        isActive: true,
      },
    });
    deductionLiabAccId = accPfLiab.id;

    const accPfEmpLiab = await prisma.account.upsert({
      where: { schoolId_code: { schoolId, code: `LIAB-PF-EMPLR-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId,
        code: `LIAB-PF-EMPLR-${testSuffix}`,
        name: 'Employer PF Payable QA',
        type: 'LIABILITY',
        normalBalance: 'CREDIT',
        currency: 'INR',
        isActive: true,
      },
    });
    employerPfLiabAccId = accPfEmpLiab.id;

    const accPayable = await prisma.account.upsert({
      where: { schoolId_code: { schoolId, code: `LIAB-PAYROLL-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId,
        code: `LIAB-PAYROLL-${testSuffix}`,
        name: 'Payroll Clearing Payable QA',
        type: 'LIABILITY',
        normalBalance: 'CREDIT',
        currency: 'INR',
        isActive: true,
      },
    });
    payrollPayableAccId = accPayable.id;

    const accBankLedger = await prisma.account.upsert({
      where: { schoolId_code: { schoolId, code: `ASSET-BANK-${testSuffix}` } },
      update: {},
      create: {
        tenantId,
        schoolId,
        code: `ASSET-BANK-${testSuffix}`,
        name: 'HDFC Operating Bank QA',
        type: 'ASSET',
        normalBalance: 'DEBIT',
        currency: 'INR',
        isActive: true,
      },
    });
    bankLedgerAccId = accBankLedger.id;

    // 4. Create Module 07 BankAccount linked to Ledger Account
    const bankRecord = await prisma.bankAccount.create({
      data: {
        tenantId,
        schoolId,
        bankName: 'HDFC Bank QA',
        accountDisplayName: 'HDFC Main Operational QA',
        accountNumber: `987654321${testSuffix}`,
        ifscCode: 'HDFC0001234',
        branchName: 'Main City',
        accountId: bankLedgerAccId,
        isActive: true,
      },
    });
    bankAccountRecordId = bankRecord.id;

    // 5. Configure Payroll Configuration
    const configRes = await request(app)
      .put('/api/v1/payroll/configuration')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        payFrequency: 'MONTHLY',
        payDay: 30,
        prorationBasis: 'CALENDAR_DAYS',
        defaultPayableAccountId: payrollPayableAccId,
        defaultDisbursementAccountId: bankLedgerAccId,
      });
    expect(configRes.status).toBe(200);
    payrollConfigId = configRes.body.id;

    // 6. Setup Payroll Period (Sep 2026: 2026-09-01 to 2026-09-30)
    const periodRes = await request(app)
      .post('/api/v1/payroll/periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        financialYearId,
        periodName: `September 2026 QA ${testSuffix}`,
        periodNumber: 6,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        payDate: '2026-10-05',
      });
    expect(periodRes.status).toBe(201);
    periodSepId = periodRes.body.id;

    // 7. Setup Salary Components
    // Basic (Earning, FLAT)
    const basicRes = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Basic Salary QA',
        code: `BASIC_${testSuffix}`,
        type: 'EARNING',
        calculationType: 'FLAT',
        glAccountId: salaryExpenseAccId,
        isTaxable: true,
        isStatutory: false,
        affectsGross: true,
      });
    expect(basicRes.status).toBe(201);
    basicCompId = basicRes.body.id;

    // Special Allowance (Earning, FLAT)
    const splRes = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Special Allowance QA',
        code: `SPL_${testSuffix}`,
        type: 'EARNING',
        calculationType: 'FLAT',
        glAccountId: salaryExpenseAccId,
        isTaxable: true,
        isStatutory: false,
        affectsGross: true,
      });
    expect(splRes.status).toBe(201);
    splAllowanceCompId = splRes.body.id;

    // HRA (Earning, PERCENTAGE_OF_COMPONENT on Basic)
    const hraRes = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'HRA QA',
        code: `HRA_${testSuffix}`,
        type: 'EARNING',
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        dependsOnComponentId: basicCompId,
        glAccountId: salaryExpenseAccId,
        isTaxable: true,
        isStatutory: false,
        affectsGross: true,
      });
    expect(hraRes.status).toBe(201);
    hraCompId = hraRes.body.id;

    // PF Deduction (Deduction, PERCENTAGE_OF_COMPONENT on Basic)
    const pfDeductRes = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Provident Fund Employee QA',
        code: `PF_EMP_${testSuffix}`,
        type: 'DEDUCTION',
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        dependsOnComponentId: basicCompId,
        glAccountId: deductionLiabAccId,
        isStatutory: true,
      });
    expect(pfDeductRes.status).toBe(201);
    pfDeductionCompId = pfDeductRes.body.id;

    // PF Employer Contribution (EMPLOYER_CONTRIBUTION, PERCENTAGE_OF_COMPONENT on Basic)
    const pfEmplrRes = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Provident Fund Employer QA',
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

    // 8. Setup Salary Structure
    const structRes = await request(app)
      .post('/api/v1/payroll/salary-structures')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Standard Teaching Structure QA ${testSuffix}`,
        code: `STR_TEACH_${testSuffix}`,
        description: 'Standard teaching salary structure with statutory benefits',
        components: [
          { componentId: basicCompId, calculationType: 'FLAT', flatAmount: 30000, displayOrder: 1 },
          { componentId: hraCompId, calculationType: 'PERCENTAGE_OF_COMPONENT', percentageValue: 20, displayOrder: 2 }, // 20% of 30,000 = 6,000
          { componentId: pfDeductionCompId, calculationType: 'PERCENTAGE_OF_COMPONENT', percentageValue: 10, displayOrder: 3 }, // 10% of 30,000 = 3,000
          { componentId: pfEmployerCompId, calculationType: 'PERCENTAGE_OF_COMPONENT', percentageValue: 10, displayOrder: 4 }, // 10% of 30,000 = 3,000
        ],
      });
    expect(structRes.status).toBe(201);
    structureId = structRes.body.id;

    // 9. Setup Leave Types
    const clRes = await request(app)
      .post('/api/v1/hr/leave-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Casual Leave QA ${testSuffix}`,
        code: `CL_${testSuffix}`,
        annualQuota: 12,
        isUnpaid: false,
        requiresApproval: true,
      });
    expect(clRes.status).toBe(201);
    casualLeaveTypeId = clRes.body.id;

    const unpaidRes = await request(app)
      .post('/api/v1/hr/leave-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Unpaid Leave QA ${testSuffix}`,
        code: `LWP_${testSuffix}`,
        annualQuota: 30,
        isUnpaid: true,
        requiresApproval: true,
      });
    expect(unpaidRes.status).toBe(201);
    unpaidLeaveTypeId = unpaidRes.body.id;

    // 10. Create Employees
    const emp1User = await prisma.user.create({
      data: {
        tenantId,
        email: `amit.sharma.${testSuffix}@school.local`,
        hashedPassword: 'hashedpassword123',
        firstName: 'Amit',
        lastName: 'Sharma',
        isActive: true,
      },
    });
    emp1UserId = emp1User.id;

    const emp1Res = await request(app)
      .post('/api/v1/hr/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: emp1User.id,
        firstName: 'Amit',
        lastName: 'Sharma',
        email: `amit.sharma.${testSuffix}@school.local`,
        phone: '9876543210',
        gender: 'MALE',
        dateOfBirth: '1988-05-15',
        joiningDate: '2024-01-01',
        employmentType: 'PERMANENT',
        bankAccount: {
          accountHolderName: 'Amit Sharma',
          bankName: 'State Bank of India',
          accountNumber: '12345678901234',
          ifscCode: 'SBIN0001234',
          accountType: 'SALARY',
          isPrimary: true,
        },
      });
    expect(emp1Res.status).toBe(201);
    employee1Id = emp1Res.body.id;

    const emp2Res = await request(app)
      .post('/api/v1/hr/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Priya',
        lastName: 'Patel',
        email: `priya.patel.${testSuffix}@school.local`,
        phone: '9876543211',
        gender: 'FEMALE',
        dateOfBirth: '1992-08-20',
        joiningDate: '2024-02-01',
        employmentType: 'PROBATION',
        bankAccount: {
          accountHolderName: 'Priya Patel',
          bankName: 'ICICI Bank',
          accountNumber: '99887766554433',
          ifscCode: 'ICIC0005678',
          accountType: 'SALARY',
          isPrimary: true,
        },
      });
    expect(emp2Res.status).toBe(201);
    employee2Id = emp2Res.body.id;
  });

  // =========================================================================
  // AMENDMENT B: SALARY COMPONENT SELF-REFERENCE REJECTED
  // =========================================================================
  it('[AMENDMENT B] Salary component self-reference rejected', async () => {
    // Attempt to update Basic component to depend on itself
    const res = await request(app)
      .put(`/api/v1/payroll/salary-components/${basicCompId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        dependsOnComponentId: basicCompId,
      });

    expect([400, 422]).toContain(res.status);
    expect(res.body.message || res.body.error).toMatch(/SALARY_COMPONENT_CYCLE|cannot depend on itself/i);
  });

  // =========================================================================
  // AMENDMENT C: SALARY COMPONENT DEPENDENCY CYCLE REJECTED
  // =========================================================================
  it('[AMENDMENT C] Salary component dependency cycle rejected (A -> B -> A)', async () => {
    // Create Component X
    const compX = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Cycle Comp X ${testSuffix}`,
        code: `CYC_X_${testSuffix}`,
        type: 'EARNING',
        calculationType: 'FLAT',
        glAccountId: salaryExpenseAccId,
      });
    expect(compX.status).toBe(201);

    // Create Component Y depending on X
    const compY = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Cycle Comp Y ${testSuffix}`,
        code: `CYC_Y_${testSuffix}`,
        type: 'EARNING',
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        dependsOnComponentId: compX.body.id,
        glAccountId: salaryExpenseAccId,
      });
    expect(compY.status).toBe(201);

    // Now try to update X to depend on Y -> Creates Cycle!
    const cycleRes = await request(app)
      .put(`/api/v1/payroll/salary-components/${compX.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        dependsOnComponentId: compY.body.id,
      });

    expect([400, 422]).toContain(cycleRes.status);
    expect(cycleRes.body.message || cycleRes.body.error).toMatch(/SALARY_COMPONENT_CYCLE/i);
  });

  // =========================================================================
  // AMENDMENT E: SALARY ASSIGNMENT OVERLAP REJECTED
  // =========================================================================
  it('[AMENDMENT E] Salary assignment overlap rejected with SALARY_ASSIGNMENT_OVERLAP', async () => {
    // Assign structure to Employee 1: 2026-01-01 to 2026-06-30
    const assign1 = await request(app)
      .post('/api/v1/payroll/salary-assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: employee1Id,
        salaryStructureId: structureId,
        baseSalary: 30000,
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-06-30',
      });
    expect(assign1.status).toBe(201);

    // Attempt overlapping assignment: 2026-06-15 to null
    const overlapRes = await request(app)
      .post('/api/v1/payroll/salary-assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: employee1Id,
        salaryStructureId: structureId,
        baseSalary: 35000,
        effectiveFrom: '2026-06-15',
        effectiveTo: null,
      });

    expect([400, 409]).toContain(overlapRes.status);
    expect(overlapRes.body.message || overlapRes.body.error).toMatch(/SALARY_ASSIGNMENT_OVERLAP/i);
  });

  // =========================================================================
  // AMENDMENT A: BASIC SALARY IS NOT DOUBLE COUNTED
  // =========================================================================
  it('[AMENDMENT A] Basic salary is not double-counted (baseSalary 30k + Basic 30k -> Gross 30k + HRA 6k = 36k, NOT 66k)', async () => {
    // Create valid active assignment for Employee 2: effectiveFrom 2026-08-01 onwards
    // baseSalary = 30000, structure has Basic = 30,000 (flat), HRA = 20% (6,000), PF Emp = 10% (3,000), PF Emplr = 10% (3,000)
    const assign2 = await request(app)
      .post('/api/v1/payroll/salary-assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: employee2Id,
        salaryStructureId: structureId,
        baseSalary: 30000,
        effectiveFrom: '2026-08-01',
        effectiveTo: null,
      });
    expect(assign2.status).toBe(201);

    // Also assign Employee 1 for Sep 2026 (starting 2026-07-01)
    const assign1Valid = await request(app)
      .post('/api/v1/payroll/salary-assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: employee1Id,
        salaryStructureId: structureId,
        baseSalary: 30000,
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
      });
    expect(assign1Valid.status).toBe(201);

    // Create a regular payroll run for September 2026
    const runRes = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodId: periodSepId,
        runType: 'REGULAR',
        remarks: 'September 2026 QA Run',
      });
    expect(runRes.status).toBe(201);
    const runId = runRes.body.id;

    // Calculate payroll run
    const calcRes = await request(app)
      .post(`/api/v1/payroll/runs/${runId}/calculate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeIds: [employee2Id] });
    expect(calcRes.status).toBe(200);

    const emp2Run = calcRes.body.employees.find((e: any) => e.employeeId === employee2Id);
    expect(emp2Run).toBeDefined();

    // Gross should be Basic (30,000) + HRA (6,000) = 36,000.
    // It must NOT be baseSalary (30,000) + Basic (30,000) + HRA (6,000) = 66,000!
    expect(Number(emp2Run.grossEarnings)).toBe(36000);
    // Employee deduction = PF 3,000
    expect(Number(emp2Run.totalDeductions)).toBe(3000);
    // Net Pay = 36,000 - 3,000 = 33,000
    expect(Number(emp2Run.netPay)).toBe(33000);
    // Employer contribution = PF 3,000 (must NOT reduce Net Pay)
    expect(Number(emp2Run.employerContributions)).toBe(3000);
  });

  // =========================================================================
  // AMENDMENT G: CALCULATE RETRY DOES NOT DUPLICATE SNAPSHOTS
  // =========================================================================
  it('[AMENDMENT G] Calculate retry does not duplicate snapshots or line items', async () => {
    const runs = await prisma.payrollRun.findMany({
      where: { periodId: periodSepId },
      include: { employees: { include: { lineItems: true } } },
    });
    const run = runs[0];
    expect(run).toBeDefined();

    const initialEmpCount = run.employees.length;
    const initialLineItemsCount = run.employees.reduce((sum, e) => sum + e.lineItems.length, 0);

    // Re-calculate the exact same run with same employees
    const retryCalc = await request(app)
      .post(`/api/v1/payroll/runs/${run.id}/calculate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeIds: [employee2Id] });
    expect(retryCalc.status).toBe(200);

    const updatedRun = await prisma.payrollRun.findUnique({
      where: { id: run.id },
      include: { employees: { include: { lineItems: true } } },
    });

    // Both employee count and line items must NOT double
    expect(updatedRun!.employees.length).toBe(initialEmpCount);
    const newLineItemsCount = updatedRun!.employees.reduce((sum, e) => sum + e.lineItems.length, 0);
    expect(newLineItemsCount).toBe(initialLineItemsCount);
  });

  // =========================================================================
  // AMENDMENT F: DUPLICATE REGULAR PAYROLL FOR SAME PERIOD REJECTED
  // =========================================================================
  it('[AMENDMENT F] Duplicate REGULAR payroll for same employee/period rejected', async () => {
    // Create a second REGULAR payroll run for September 2026
    const runBRes = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodId: periodSepId,
        runType: 'REGULAR',
        remarks: 'Run B for September',
      });
    expect(runBRes.status).toBe(201);
    const runBId = runBRes.body.id;

    // Attempt to calculate run B including Employee 2 (who is already in Run A)
    const dupCalc = await request(app)
      .post(`/api/v1/payroll/runs/${runBId}/calculate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeIds: [employee2Id] });

    expect([400, 409]).toContain(dupCalc.status);
    expect(dupCalc.body.message || dupCalc.body.error).toMatch(/EMPLOYEE_ALREADY_IN_PAYROLL_PERIOD/i);
  });

  // =========================================================================
  // AMENDMENT H & I: OPTIMISTIC CONCURRENCY AND STATE MACHINE
  // =========================================================================
  it('[AMENDMENT H & I] Optimistic concurrency version check (409) and illegal state transitions', async () => {
    const run = await prisma.payrollRun.findFirst({
      where: { periodId: periodSepId },
    });
    expect(run).toBeDefined();

    // Illegal transition: OPEN -> PAID directly
    const illegalTransition = await request(app)
      .put(`/api/v1/payroll/runs/${run!.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: run!.version,
        status: 'PAID' as any,
      });
    expect([400, 422]).toContain(illegalTransition.status);

    // Valid transition: OPEN -> REVIEWED
    const reviewRes = await request(app)
      .put(`/api/v1/payroll/runs/${run!.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: run!.version,
        status: 'REVIEWED',
        remarks: 'Reviewed by HR Manager',
      });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.status).toBe('REVIEWED');
    expect(reviewRes.body.version).toBe(run!.version + 1);

    // Stale version check: attempt to APPROVE using stale version
    const staleRes = await request(app)
      .put(`/api/v1/payroll/runs/${run!.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: run!.version, // Stale!
        status: 'APPROVED',
      });
    expect(staleRes.status).toBe(409);
    expect(staleRes.body.message || staleRes.body.error).toMatch(/PAYROLL_STALE_VERSION/i);

    // Successful APPROVAL with new version
    const approveRes = await request(app)
      .put(`/api/v1/payroll/runs/${run!.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: reviewRes.body.version,
        status: 'APPROVED',
      });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('APPROVED');
  });

  // =========================================================================
  // AMENDMENT Q: PAYSLIP VISIBILITY BEFORE POSTED/PAID
  // =========================================================================
  it('[AMENDMENT Q] Payslip unavailable before authorized payroll visibility state (POSTED/PAID)', async () => {
    const run = await prisma.payrollRun.findFirst({
      where: { periodId: periodSepId, status: 'APPROVED' },
    });
    expect(run).toBeDefined();

    // Fetching payslip when run is only APPROVED must fail
    const payslipRes = await request(app)
      .get(`/api/v1/payroll/payslips/${employee2Id}?payrollRunId=${run!.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([400, 403]).toContain(payslipRes.status);
    expect(payslipRes.body.message || payslipRes.body.error).toMatch(/PAYSLIP_UNAVAILABLE|PAYSLIP_NOT_PUBLISHED|not available/i);
  });

  // =========================================================================
  // AMENDMENT M: PAYROLL POSTING GL TOTALS EQUAL SNAPSHOT TOTALS
  // =========================================================================
  it('[AMENDMENT M] Payroll posting GL totals equal snapshot totals and balance exactly', async () => {
    const run = await prisma.payrollRun.findFirst({
      where: { periodId: periodSepId, status: 'APPROVED' },
    });
    expect(run).toBeDefined();

    // Post the payroll run to General Ledger
    const postRes = await request(app)
      .post(`/api/v1/payroll/runs/${run!.id}/post`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        version: run!.version,
        remarks: 'Posting September Payroll to GL',
      });
    expect(postRes.status).toBe(200);
    expect(postRes.body.status).toBe('POSTED');
    expect(postRes.body.journalEntryId).toBeDefined();

    // Fetch the generated journal entry
    const journal = await prisma.journalEntry.findUnique({
      where: { id: postRes.body.journalEntryId },
      include: { lines: true },
    });
    expect(journal).toBeDefined();

    // Verify Journal balance: SUM(Debit) == SUM(Credit)
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);
    for (const line of journal!.lines) {
      totalDebit = totalDebit.add(line.debit.toString());
      totalCredit = totalCredit.add(line.credit.toString());
    }

    expect(totalDebit.toFixed(2)).toBe(totalCredit.toFixed(2));
    expect(new Decimal(journal!.totalDebit.toString()).toFixed(2)).toBe(totalDebit.toFixed(2));

    // Verify reconciliation with run snapshot:
    // DR Salary Expense (36,000) + DR Employer PF Expense (3,000) = 39,000
    // CR Deduction Liability (3,000) + CR Employer PF Liability (3,000) + CR Payroll Payable (33,000) = 39,000
    expect(totalDebit.toNumber()).toBe(39000);
    expect(totalCredit.toNumber()).toBe(39000);

    // Now payslip should be visible
    const payslipRes = await request(app)
      .get(`/api/v1/payroll/payslips/${employee2Id}?payrollRunId=${run!.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (payslipRes.status !== 200) {
      console.error('PAYSLIP ERROR IN AMENDMENT M:', payslipRes.body);
    }
    expect(payslipRes.status).toBe(200);
    expect(Number(payslipRes.body.netPay)).toBe(33000);
  });

  // =========================================================================
  // AMENDMENT N & O & P: CONCURRENT SALARY PAYMENT AND DISBURSEMENT SAFETY
  // =========================================================================
  it('[AMENDMENT N, O, P] Concurrent salary payment cannot overpay, resolves LedgerAccount, and marks run PAID only on zero balance', async () => {
    const run = await prisma.payrollRun.findFirst({
      where: { periodId: periodSepId, status: 'POSTED' },
      include: { employees: true },
    });
    expect(run).toBeDefined();

    const emp2Run = run!.employees.find(e => e.employeeId === employee2Id);
    expect(emp2Run).toBeDefined();
    const netPayable = Number(emp2Run!.remainingPayable);
    expect(netPayable).toBe(33000);

    // Two concurrent payment requests of 33,000 via Promise.allSettled
    const [reqA, reqB] = await Promise.allSettled([
      request(app)
        .post(`/api/v1/payroll/runs/${run!.id}/disburse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bankAccountId: bankAccountRecordId,
          paymentMethod: 'BANK_TRANSFER',
          paymentDate: '2026-10-01',
          referenceNumber: `CONC-A-${testSuffix}`,
          allocations: [{ employeeId: employee2Id, amount: 33000 }],
        }),
      request(app)
        .post(`/api/v1/payroll/runs/${run!.id}/disburse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bankAccountId: bankAccountRecordId,
          paymentMethod: 'BANK_TRANSFER',
          paymentDate: '2026-10-01',
          referenceNumber: `CONC-B-${testSuffix}`,
          allocations: [{ employeeId: employee2Id, amount: 33000 }],
        }),
    ]);

    const results = [reqA, reqB].map(r => r.status === 'fulfilled' ? r.value : null);
    const successCount = results.filter(r => r && r.status === 201).length;
    const failCount = results.filter(r => r && r.status >= 400).length;

    // Exactly one must succeed, one must fail with overpayment / remaining payable error
    expect(successCount).toBe(1);
    expect(failCount).toBe(1);

    // Verify employee record state in DB
    const refreshedEmp = await prisma.payrollRunEmployee.findUnique({
      where: { payrollRunId_employeeId: { payrollRunId: run!.id, employeeId: employee2Id } },
    });
    expect(refreshedEmp).toBeDefined();
    expect(Number(refreshedEmp!.paidAmount)).toBe(33000);
    expect(Number(refreshedEmp!.remainingPayable)).toBe(0);
    expect(refreshedEmp!.paymentStatus).toBe('PAID');

    // Verify run status is now PAID
    const refreshedRun = await prisma.payrollRun.findUnique({
      where: { id: run!.id },
    });
    expect(refreshedRun!.status).toBe('PAID');

    // Verify payment journal entry references bankLedgerAccId, NOT bankAccountRecordId
    const payment = await prisma.payrollPayment.findFirst({
      where: { payrollRunId: run!.id },
      include: { journalEntry: { include: { lines: true } } },
    });
    expect(payment).toBeDefined();
    expect(payment!.journalEntry).toBeDefined();

    const bankCreditLine = payment!.journalEntry!.lines.find(l => l.credit.greaterThan(0));
    expect(bankCreditLine).toBeDefined();
    expect(bankCreditLine!.accountId).toBe(bankLedgerAccId);
    expect(bankCreditLine!.accountId).not.toBe(bankAccountRecordId);
  });

  // =========================================================================
  // AMENDMENT K & L: LEAVE APPROVAL AND CANCELLATION IDEMPOTENCY
  // =========================================================================
  it('[AMENDMENT K & L] StaffLeave approval and cancellation idempotency with source tracking', async () => {
    // Allocate 12 days Casual Leave to Employee 1
    const allocRes = await request(app)
      .post('/api/v1/hr/leave-balances/allocate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: employee1Id,
        leaveTypeId: casualLeaveTypeId,
        entitlementPeriod: '2026',
        allocatedDays: 12,
      });
    expect([200, 201]).toContain(allocRes.status);

    // Apply for 2 days leave (2026-11-02 to 2026-11-03) via StaffLeave
    const staffLeave = await prisma.staffLeave.create({
      data: {
        tenantId,
        schoolId,
        userId: emp1UserId,
        leaveType: `CL_${testSuffix}`,
        startDate: new Date('2026-11-02'),
        endDate: new Date('2026-11-03'),
        reason: 'Family function',
        status: 'PENDING',
      },
    });
    const leaveId = staffLeave.id;

    // Approve leave first time
    const approve1 = await request(app)
      .put(`/api/v1/hr/leaves/${leaveId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ remarks: 'Approved' });
    expect(approve1.status).toBe(200);

    // Verify balance: used = 2, remaining = 10
    let bal = await prisma.employeeLeaveBalance.findFirst({
      where: { employeeId: employee1Id, leaveTypeId: casualLeaveTypeId },
    });
    expect(Number(bal!.usedDays)).toBe(2);
    expect(Number(bal!.closingBalance)).toBe(10);

    // Retry approval of the SAME leave
    const approveRetry = await request(app)
      .put(`/api/v1/hr/leaves/${leaveId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ remarks: 'Retry approval' });
    expect(approveRetry.status).toBe(200);

    // Balance must STILL be used = 2, NOT 4!
    bal = await prisma.employeeLeaveBalance.findFirst({
      where: { employeeId: employee1Id, leaveTypeId: casualLeaveTypeId },
    });
    expect(Number(bal!.usedDays)).toBe(2);
    expect(Number(bal!.closingBalance)).toBe(10);

    // Cancel the approved leave
    const cancel1 = await request(app)
      .put(`/api/v1/hr/leaves/${leaveId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Plans changed' });
    expect(cancel1.status).toBe(200);

    // Balance restored: used = 0, remaining = 12
    bal = await prisma.employeeLeaveBalance.findFirst({
      where: { employeeId: employee1Id, leaveTypeId: casualLeaveTypeId },
    });
    expect(Number(bal!.usedDays)).toBe(0);
    expect(Number(bal!.closingBalance)).toBe(12);

    // Retry cancellation
    const cancelRetry = await request(app)
      .put(`/api/v1/hr/leaves/${leaveId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Plans changed retry' });
    expect(cancelRetry.status).toBe(200);

    // Balance must STILL be used = 0, remaining = 12 (not restored twice to 14)
    bal = await prisma.employeeLeaveBalance.findFirst({
      where: { employeeId: employee1Id, leaveTypeId: casualLeaveTypeId },
    });
    expect(Number(bal!.usedDays)).toBe(0);
    expect(Number(bal!.closingBalance)).toBe(12);
  });

  // =========================================================================
  // AMENDMENT J: ATTENDANCE & LEAVE DOUBLE DEDUCTION PROTECTION
  // =========================================================================
  it('[AMENDMENT J] Employee unpaid leave + absence on same date causes loss-of-pay ONCE', async () => {
    // Record StaffAttendance ABSENT for Employee 1 on 2026-10-15
    await prisma.staffAttendance.upsert({
      where: {
        schoolId_userId_attendanceDate: {
          schoolId,
          userId: emp1UserId,
          attendanceDate: new Date('2026-10-15'),
        },
      },
      update: { status: 'ABSENT' },
      create: {
        tenantId,
        schoolId,
        userId: emp1UserId,
        attendanceDate: new Date('2026-10-15'),
        status: 'ABSENT',
        remarks: 'Uninformed absence',
      },
    });

    // Also record approved UNPAID leave for Employee 1 on the exact same date: 2026-10-15
    const unpaidLeave = await prisma.staffLeave.create({
      data: {
        tenantId,
        schoolId,
        userId: emp1UserId,
        leaveType: `LWP_${testSuffix}`,
        startDate: new Date('2026-10-15'),
        endDate: new Date('2026-10-15'),
        reason: 'Emergency unpaid leave',
        status: 'PENDING',
      },
    });

    await request(app)
      .put(`/api/v1/hr/staff-leave/${unpaidLeave.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ remarks: 'Approved LWP' });

    // Setup Oct 2026 period
    const periodOct = await request(app)
      .post('/api/v1/payroll/periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        financialYearId,
        periodName: `October 2026 QA ${testSuffix}`,
        periodNumber: 7,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        payDate: '2026-11-05',
      });
    expect(periodOct.status).toBe(201);

    // Create and calculate Oct payroll run for Employee 1
    const runOct = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodId: periodOct.body.id,
        runType: 'REGULAR',
        remarks: 'October 2026 LOP Check',
      });
    expect(runOct.status).toBe(201);

    const calcOct = await request(app)
      .post(`/api/v1/payroll/runs/${runOct.body.id}/calculate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeIds: [employee1Id] });
    expect(calcOct.status).toBe(200);

    const emp1Oct = calcOct.body.employees.find((e: any) => e.employeeId === employee1Id);
    expect(emp1Oct).toBeDefined();

    // Oct 2026 has 27 working days (excluding Sundays). Employee was absent + unpaid leave on 2026-10-15.
    // Precedence rule: loss-of-pay days must be 1, NOT 2!
    expect(Number(emp1Oct.lossOfPayDays)).toBe(1);
    expect(Number(emp1Oct.workingDays)).toBe(27);
    expect(Number(emp1Oct.workingDays) - Number(emp1Oct.lossOfPayDays)).toBe(26);
  });

  // =========================================================================
  // AMENDMENT D: MID-PERIOD SALARY REVISION SEGMENTS
  // =========================================================================
  it('[AMENDMENT D] Mid-period salary revision handles effective-dated segments cleanly', async () => {
    // Setup Nov 2026 period (30 days)
    const periodNov = await request(app)
      .post('/api/v1/payroll/periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        financialYearId,
        periodName: `November 2026 QA ${testSuffix}`,
        periodNumber: 8,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        payDate: '2026-12-05',
      });
    expect(periodNov.status).toBe(201);

    // Employee 1 gets revision mid-month on Nov 16:
    // Nov 1 - Nov 15: 30,000 basis
    // Nov 16 - Nov 30: 36,000 basis
    // Close previous assignment on 2026-11-15
    await prisma.employeeSalaryAssignment.updateMany({
      where: { employeeId: employee1Id, effectiveTo: null },
      data: { effectiveTo: new Date('2026-11-15') },
    });

    // Create new structure with 36,000 flat basic
    const newBasicComp = await request(app)
      .post('/api/v1/payroll/salary-components')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Basic Salary 36k QA',
        code: `BASIC_36K_${testSuffix}`,
        type: 'EARNING',
        calculationType: 'FLAT',
        glAccountId: salaryExpenseAccId,
      });

    const struct36k = await request(app)
      .post('/api/v1/payroll/salary-structures')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Structure 36k QA ${testSuffix}`,
        code: `STR_36K_${testSuffix}`,
        components: [
          { componentId: newBasicComp.body.id, calculationType: 'FLAT', flatAmount: 36000, displayOrder: 1 },
        ],
      });

    // Assign new structure starting 2026-11-16
    const assignNov16 = await request(app)
      .post('/api/v1/payroll/salary-assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: employee1Id,
        salaryStructureId: struct36k.body.id,
        baseSalary: 36000,
        effectiveFrom: '2026-11-16',
        effectiveTo: null,
      });
    expect(assignNov16.status).toBe(201);

    // Run payroll for Nov 2026
    const runNov = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodId: periodNov.body.id,
        runType: 'REGULAR',
        remarks: 'November Mid-Period Revision QA',
      });
    expect(runNov.status).toBe(201);

    const calcNov = await request(app)
      .post(`/api/v1/payroll/runs/${runNov.body.id}/calculate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeIds: [employee1Id] });
    expect(calcNov.status).toBe(200);

    const emp1Nov = calcNov.body.employees.find((e: any) => e.employeeId === employee1Id);
    expect(emp1Nov).toBeDefined();

    // Nov 1 - 15 (15 days at 36,000 gross with basic+hra) = 18,000
    // Nov 16 - 30 (15 days at 36,000 gross with single basic) = 18,000
    // Total Gross = 36,000
    expect(Number(emp1Nov.grossEarnings)).toBe(36000);
  });

  // =========================================================================
  // SECTION 29: FINANCE INVARIANT SWEEP
  // =========================================================================
  it('[SECTION 29] Finance Invariant Sweep across all Module 08 postings', async () => {
    // 1. All JournalEntries generated by Module 08
    const payrollJournals = await prisma.journalEntry.findMany({
      where: {
        schoolId,
        sourceType: { in: ['PAYROLL_RUN', 'PAYROLL_PAYMENT', 'PAYROLL_REVERSAL'] },
      },
      include: { lines: true },
    });

    expect(payrollJournals.length).toBeGreaterThan(0);

    for (const j of payrollJournals) {
      let debitSum = new Decimal(0);
      let creditSum = new Decimal(0);
      for (const l of j.lines) {
        debitSum = debitSum.add(l.debit.toString());
        creditSum = creditSum.add(l.credit.toString());
      }
      // Check Debit == Credit
      expect(debitSum.toFixed(2)).toBe(creditSum.toFixed(2));
      expect(new Decimal(j.totalDebit.toString()).toFixed(2)).toBe(debitSum.toFixed(2));
      expect(new Decimal(j.totalCredit.toString()).toFixed(2)).toBe(creditSum.toFixed(2));
    }

    // 2. Verify no employee paid beyond net payable or negative remaining payable
    const allRunEmployees = await prisma.payrollRunEmployee.findMany({
      where: { payrollRun: { schoolId } },
    });

    for (const re of allRunEmployees) {
      const net = new Decimal(re.netPay.toString());
      const paid = new Decimal(re.paidAmount.toString());
      const remaining = new Decimal(re.remainingPayable.toString());

      expect(remaining.gte(0)).toBe(true);
      expect(paid.lte(net)).toBe(true);
      expect(paid.add(remaining).toFixed(2)).toBe(net.toFixed(2));
    }

    // 3. Verify no orphan PayrollRun or PayrollPayment journal entries
    const postedRuns = await prisma.payrollRun.findMany({
      where: { schoolId, status: { in: ['POSTED', 'PAID'] } },
    });
    for (const r of postedRuns) {
      expect(r.journalEntryId).not.toBeNull();
      const linkedJ = await prisma.journalEntry.findUnique({ where: { id: r.journalEntryId! } });
      expect(linkedJ).toBeDefined();
    }

    const payments = await prisma.payrollPayment.findMany({
      where: { schoolId },
    });
    for (const p of payments) {
      expect(p.journalEntryId).not.toBeNull();
      const linkedJ = await prisma.journalEntry.findUnique({ where: { id: p.journalEntryId! } });
      expect(linkedJ).toBeDefined();
    }
  });
});
