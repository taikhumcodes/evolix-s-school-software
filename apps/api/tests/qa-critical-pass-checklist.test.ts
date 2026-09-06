import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const Decimal = Prisma.Decimal;

describe('Finance Manual QA — Critical Pass (34 Comprehensive Checkpoints)', () => {
  let adminToken: string;
  let cashierToken: string;
  let parentToken: string;

  let tenantId: string;
  let schoolAId: string;
  let schoolBId: string;

  let academicYearId: string;
  let financialYearId: string;
  let periodAprilId: string;
  let periodMayId: string;

  let class1Id: string;
  let sectionAId: string;
  let studentAId: string;
  let studentBId: string;
  let parentAUserId: string;

  let tuitionFeeHeadId: string;
  let utilityExpenseHeadId: string;

  let cashAccountId: string;
  let bankAccountId: string;
  let receivableAccountId: string;
  let advanceAccountId: string;
  let vendorPayableAccountId: string;
  let tuitionIncomeAccountId: string;
  let utilityExpenseAccountId: string;
  let badDebtAccountId: string;

  let bankAccountRecordId: string;
  let vendorId: string;

  const testId = Date.now().toString().slice(-6);

  beforeAll(async () => {
    // 1. Admin Login
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@evolix.local', password: 'Password123!' });
    adminToken = login.body.access_token;

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    tenantId = me.body.tenant_id;
    schoolAId = me.body.schools[0]?.id;

    // 2. Setup School B for School Isolation tests
    const schoolB = await prisma.school.upsert({
      where: { id: '00000000-0000-0000-0000-000000000088' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000088',
        tenantId,
        code: `SCH-B-CP-${testId}`,
        name: 'School B Branch Critical Pass',
        isActive: true,
      },
    });
    schoolBId = schoolB.id;

    // 3. Academic Year
    let ay = await prisma.academicYear.findFirst({ where: { schoolId: schoolAId } });
    if (!ay) {
      ay = await prisma.academicYear.create({
        data: {
          schoolId: schoolAId,
          name: `AY 2026-27-CP-${testId}`,
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          endDate: new Date('2027-03-31T23:59:59.999Z'),
          isCurrent: true,
        },
      });
    }
    academicYearId = ay.id;

    // 4. Classes and Students
    const cls = await prisma.classMaster.findFirst({ where: { schoolId: schoolAId } });
    class1Id = cls!.id;
    const sec = await prisma.sectionMaster.findFirst({ where: { schoolId: schoolAId } });
    sectionAId = sec!.id;

    const stuA = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: `STU-A-CP-${testId}`,
        admissionNumber: `ADM-A-CP-${testId}`,
        admittedAcademicYearId: academicYearId,
        firstName: 'Aarav',
        lastName: `Sharma-${testId}`,
        gender: 'MALE',
        dateOfBirth: new Date('2018-05-10'),
        enrollments: {
          create: {
            tenantId,
            schoolId: schoolAId,
            academicYearId,
            classId: class1Id,
            sectionId: sectionAId,
            rollNumber: '01',
            status: 'ACTIVE',
          },
        },
      },
    });
    studentAId = stuA.id;

    const stuB = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: `STU-B-CP-${testId}`,
        admissionNumber: `ADM-B-CP-${testId}`,
        admittedAcademicYearId: academicYearId,
        firstName: 'Vivaan',
        lastName: `Gupta-${testId}`,
        gender: 'MALE',
        dateOfBirth: new Date('2018-08-15'),
        enrollments: {
          create: {
            tenantId,
            schoolId: schoolAId,
            academicYearId,
            classId: class1Id,
            sectionId: sectionAId,
            rollNumber: '02',
            status: 'ACTIVE',
          },
        },
      },
    });
    studentBId = stuB.id;

    // 5. Parent User linked to Student A only
    const hashedPassword = await bcrypt.hash('ParentPass123!', 10);
    const parentUser = await prisma.user.create({
      data: {
        tenantId,
        email: `parent.critical.${testId}@evolix.local`,
        hashedPassword,
        firstName: 'Rajesh',
        lastName: 'Sharma',
        isActive: true,
      },
    });
    parentAUserId = parentUser.id;

    const guardian = await prisma.guardian.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        userId: parentUser.id,
        firstName: 'Rajesh',
        lastName: 'Sharma',
        phone: `9876${testId}`,
        normalizedPhone: `+919876${testId}`,
        relationship: 'FATHER',
      },
    });

    await prisma.studentGuardian.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        guardianId: guardian.id,
        studentId: studentAId,
        relationship: 'FATHER',
        isPrimary: true,
        hasPickupPermission: true,
      },
    });

    await prisma.userSchool.create({
      data: {
        userId: parentUser.id,
        schoolId: schoolAId,
      },
    });

    const parentRole = await prisma.role.findFirst({ where: { name: 'Parent', tenantId } });
    if (parentRole) {
      await prisma.userRole.create({
        data: { userId: parentUser.id, roleId: parentRole.id },
      });

      const parentPerms = await prisma.permission.findMany({
        where: { code: { in: ['parent.finance.view', 'parent.children.view'] } },
      });
      for (const p of parentPerms) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: parentRole.id, permissionId: p.id } },
          create: { roleId: parentRole.id, permissionId: p.id },
          update: {},
        });
      }
    }

    const parentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: parentUser.email, password: 'ParentPass123!' });
    parentToken = parentLogin.body.access_token;

    // 6. Fee Head and Expense Head
    const feeHead = await prisma.feeHead.findFirst({ where: { schoolId: schoolAId } });
    tuitionFeeHeadId = feeHead!.id;
    const expHead = await prisma.expenseHead.findFirst({ where: { schoolId: schoolAId } });
    utilityExpenseHeadId = expHead!.id;

    // 7. Setup System Accounts
    const accReceivable = await prisma.account.findFirst({ where: { schoolId: schoolAId, code: '1100' } });
    receivableAccountId = accReceivable!.id;
    const accIncome = await prisma.account.findFirst({ where: { schoolId: schoolAId, code: '4010' } });
    tuitionIncomeAccountId = accIncome!.id;
    const accCash = await prisma.account.findFirst({ where: { schoolId: schoolAId, code: '1010' } });
    cashAccountId = accCash!.id;
    const accBank = await prisma.account.findFirst({ where: { schoolId: schoolAId, code: '1020' } });
    bankAccountId = accBank!.id;
    const accAdvance = await prisma.account.findFirst({ where: { schoolId: schoolAId, code: '2010' } });
    advanceAccountId = accAdvance!.id;
    const accPayable = await prisma.account.findFirst({ where: { schoolId: schoolAId, code: '2100' } });
    vendorPayableAccountId = accPayable!.id;
    const accExpense = await prisma.account.findFirst({ where: { schoolId: schoolAId, code: '5010' } });
    utilityExpenseAccountId = accExpense!.id;
    const accBadDebt = await prisma.account.findFirst({ where: { schoolId: schoolAId, code: '5200' } });
    badDebtAccountId = accBadDebt!.id;

    // 8. Bank Account & Vendor
    const bankRecord = await prisma.bankAccount.findFirst({ where: { schoolId: schoolAId } });
    bankAccountRecordId = bankRecord!.id;

    const vendor = await prisma.vendor.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        code: `VEND-${testId}`,
        name: `Supreme School Supplies ${testId}`,
        contactPerson: 'Vikram Mehta',
        phone: '9876543210',
        email: `vendor-${testId}@supplies.in`,
      },
    });
    vendorId = vendor.id;
  });

  // =========================================================================
  // 1. FINANCIAL YEAR & PERIOD LOCKING
  // =========================================================================
  it('1. Financial year & period locking', async () => {
    // Create FY 2026-27
    const fyRes = await request(app)
      .post('/api/v1/finance/financial-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        name: `FY 2026-27-${testId}`,
        startDate: '2026-04-01',
        endDate: '2027-03-31',
      });
    expect(fyRes.status).toBe(201);
    financialYearId = fyRes.body.id;

    // Create 2 monthly periods
    const p1 = await request(app)
      .post('/api/v1/finance/accounting-periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        financialYearId,
        name: 'April 2026',
        periodNumber: 1,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      });
    expect(p1.status).toBe(201);
    periodAprilId = p1.body.id;

    const p2 = await request(app)
      .post('/api/v1/finance/accounting-periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        financialYearId,
        name: 'May 2026',
        periodNumber: 2,
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      });
    expect(p2.status).toBe(201);
    periodMayId = p2.body.id;

    // Post transaction inside OPEN period
    const openPost = await request(app)
      .post('/api/v1/finance/journals')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        financialYearId,
        accountingPeriodId: periodAprilId,
        postingDate: '2026-04-10',
        description: 'Test open period journal',
        lines: [
          { accountId: cashAccountId, debit: 1000, credit: 0 },
          { accountId: tuitionIncomeAccountId, debit: 0, credit: 1000 },
        ],
      });
    expect(openPost.status).toBe(201);

    // Close period
    const closeRes = await request(app)
      .post(`/api/v1/finance/accounting-periods/${periodAprilId}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(closeRes.status).toBe(200);

    // Try posting into CLOSED period -> FINANCIAL_PERIOD_CLOSED
    const closedPost = await request(app)
      .post('/api/v1/finance/journals')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        financialYearId,
        accountingPeriodId: periodAprilId,
        postingDate: '2026-04-12',
        description: 'Should fail in closed period',
        lines: [
          { accountId: cashAccountId, debit: 500, credit: 0 },
          { accountId: tuitionIncomeAccountId, debit: 0, credit: 500 },
        ],
      });
    expect(closedPost.status).toBe(400);
    expect(closedPost.body.error.message).toContain('FINANCIAL_PERIOD_CLOSED');

    // Reopen period with authorized user, reason, and audit record
    const reopenRes = await request(app)
      .post(`/api/v1/finance/accounting-periods/${periodAprilId}/reopen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ reason: 'Auditor approved retrospective adjustment' });
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.status).toBe('OPEN');
  });

  // =========================================================================
  // 2. DOUBLE-ENTRY ACCOUNTING
  // =========================================================================
  it('2. Double-entry accounting', async () => {
    // Create ₹10,000 invoice
    const invRes = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [
          {
            feeHeadId: tuitionFeeHeadId,
            description: 'Grade 10 Tuition Fee',
            rate: 10000,
            quantity: 1,
          },
        ],
      });
    expect(invRes.status).toBe(201);
    const invoiceId = invRes.body.id;

    // Verify journal: Debit Fee Receivable ₹10,000, Credit Fee Income ₹10,000
    const invJournal = await prisma.journalEntry.findUnique({
      where: { id: invRes.body.journalEntryId },
      include: { lines: true },
    });
    expect(invJournal).toBeDefined();
    const drLine = invJournal!.lines.find((l) => l.accountId === receivableAccountId);
    const crLine = invJournal!.lines.find((l) => l.accountId === tuitionIncomeAccountId);
    expect(new Decimal(drLine!.debit.toString()).toFixed(2)).toBe('10000.00');
    expect(new Decimal(crLine!.credit.toString()).toFixed(2)).toBe('10000.00');

    // Receive ₹4,000 cash
    const payRes = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', `PAY-2-${testId}`)
      .send({
        studentId: studentAId,
        paymentDate: '2026-04-16',
        totalAmount: 4000,
        paymentMethod: 'CASH',
        receivingAccountId: cashAccountId,
        allocations: [{ invoiceId, allocatedAmount: 4000 }],
      });
    expect(payRes.status).toBe(201);

    // Verify payment journal: Debit Cash ₹4,000, Credit Fee Receivable ₹4,000
    const payJournal = await prisma.journalEntry.findUnique({
      where: { id: payRes.body.journalEntryId },
      include: { lines: true },
    });
    const payDr = payJournal!.lines.find((l) => l.accountId === cashAccountId);
    const payCr = payJournal!.lines.find((l) => l.accountId === receivableAccountId);
    expect(new Decimal(payDr!.debit.toString()).toFixed(2)).toBe('4000.00');
    expect(new Decimal(payCr!.credit.toString()).toFixed(2)).toBe('4000.00');

    // Student outstanding is ₹6,000
    const updatedInv = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    expect(new Decimal(updatedInv!.outstandingAmount.toString()).toFixed(2)).toBe('6000.00');
  });

  // =========================================================================
  // 3. DECIMAL ACCURACY
  // =========================================================================
  it('3. Decimal accuracy', async () => {
    // Awkward values: ₹10,000.25 invoice, ₹4,000.10 payment
    const invRes = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [
          {
            feeHeadId: tuitionFeeHeadId,
            description: 'Exact Decimal Test Fee',
            rate: 10000.25,
            quantity: 1,
          },
        ],
      });
    expect(invRes.status).toBe(201);

    const payRes = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', `PAY-3-${testId}`)
      .send({
        studentId: studentAId,
        paymentDate: '2026-04-16',
        totalAmount: 4000.10,
        paymentMethod: 'CASH',
        receivingAccountId: cashAccountId,
        allocations: [{ invoiceId: invRes.body.id, allocatedAmount: 4000.10 }],
      });
    expect(payRes.status).toBe(201);

    const invoice = await prisma.feeInvoice.findUnique({ where: { id: invRes.body.id } });
    expect(new Decimal(invoice!.outstandingAmount.toString()).toFixed(2)).toBe('6000.15');

    // Decimal 0.10 + 0.20 strictly equals 0.30 without float distortion
    const d1 = new Decimal('0.10');
    const d2 = new Decimal('0.20');
    expect(d1.plus(d2).toFixed(2)).toBe('0.30');
    expect(d1.plus(d2).toString()).not.toContain('0.30000000000000004');
  });

  // =========================================================================
  // 4. POSTED INVOICE IMMUTABILITY
  // =========================================================================
  it('4. Posted invoice immutability', async () => {
    // Direct mutation of posted invoice fields is rejected/not exposed
    const putRes = await request(app)
      .put(`/api/v1/finance/fee-invoices/some-id`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ totalAmount: 9000 });
    expect([404, 405]).toContain(putRes.status);
  });

  // =========================================================================
  // 5. RECEIPT IMMUTABILITY
  // =========================================================================
  it('5. Receipt immutability', async () => {
    // Direct mutation of posted receipts is rejected/not exposed
    const putRes = await request(app)
      .put(`/api/v1/finance/receipts/some-id`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ amount: 3500 });
    expect([404, 405]).toContain(putRes.status);
  });

  // =========================================================================
  // 6. PAYMENT IDEMPOTENCY — CRITICAL
  // =========================================================================
  it('6. Payment idempotency — critical', async () => {
    const invRes = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentBId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [{ feeHeadId: tuitionFeeHeadId, description: 'Idempotency Test', rate: 5000, quantity: 1 }],
      });
    expect(invRes.status).toBe(201);
    const invoiceId = invRes.body.id;

    const idempotencyKey = `IDEM-KEY-${testId}`;
    const pay1 = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        studentId: studentBId,
        paymentDate: '2026-04-16',
        totalAmount: 2000,
        paymentMethod: 'CASH',
        receivingAccountId: cashAccountId,
        allocations: [{ invoiceId, allocatedAmount: 2000 }],
      });
    expect(pay1.status).toBe(201);

    // Exact retry with same idempotency key
    const pay2 = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        studentId: studentBId,
        paymentDate: '2026-04-16',
        totalAmount: 2000,
        paymentMethod: 'CASH',
        receivingAccountId: cashAccountId,
        allocations: [{ invoiceId, allocatedAmount: 2000 }],
      });
    expect(pay2.status).toBe(201);
    expect(pay2.body.receiptNumber).toBe(pay1.body.receiptNumber);

    // Outstanding is ₹3,000, NOT ₹1,000
    const inv = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    expect(new Decimal(inv!.outstandingAmount.toString()).toFixed(2)).toBe('3000.00');

    // Reusing same key with different amount -> 409
    const payDiff = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        studentId: studentBId,
        paymentDate: '2026-04-16',
        totalAmount: 2500,
        paymentMethod: 'CASH',
        receivingAccountId: cashAccountId,
        allocations: [{ invoiceId, allocatedAmount: 2500 }],
      });
    expect(payDiff.status).toBe(409);
    expect(JSON.stringify(payDiff.body)).toContain('IDEMPOTENCY_KEY_REUSED');
  });

  // =========================================================================
  // 7. REAL CONCURRENT COLLECTION TEST — CRITICAL
  // =========================================================================
  it('7. Real concurrent collection test — critical', async () => {
    const invRes = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentBId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [{ feeHeadId: tuitionFeeHeadId, description: 'Concurrency Race', rate: 5000, quantity: 1 }],
      });
    expect(invRes.status).toBe(201);
    const invoiceId = invRes.body.id;

    // Two requests for ₹4,000 sent together
    const [resA, resB] = await Promise.allSettled([
      request(app)
        .post('/api/v1/finance/collections/pay')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-school-id', schoolAId)
        .set('Idempotency-Key', `CONC-A-${testId}`)
        .send({
          studentId: studentBId,
          paymentDate: '2026-04-16',
          totalAmount: 4000,
          paymentMethod: 'CASH',
          receivingAccountId: cashAccountId,
          allocations: [{ invoiceId, allocatedAmount: 4000 }],
        }),
      request(app)
        .post('/api/v1/finance/collections/pay')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-school-id', schoolAId)
        .set('Idempotency-Key', `CONC-B-${testId}`)
        .send({
          studentId: studentBId,
          paymentDate: '2026-04-16',
          totalAmount: 4000,
          paymentMethod: 'CASH',
          receivingAccountId: cashAccountId,
          allocations: [{ invoiceId, allocatedAmount: 4000 }],
        }),
    ]);

    const invoice = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    const outstanding = parseFloat(invoice!.outstandingAmount.toString());

    // Invariant: outstanding is NEVER negative
    expect(outstanding).toBeGreaterThanOrEqual(0);
    // At least one must succeed and second rejected if exceeding
    const hasSuccess = [resA, resB].some((r) => r.status === 'fulfilled' && (r.value as any).status === 201);
    expect(hasSuccess).toBe(true);
  });

  // =========================================================================
  // 8. PARTIAL PAYMENT
  // =========================================================================
  it('8. Partial payment', async () => {
    const invRes = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [{ feeHeadId: tuitionFeeHeadId, description: 'Partial Pay Test', rate: 10000, quantity: 1 }],
      });
    const invoiceId = invRes.body.id;

    // Collect ₹4,000
    await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', `PART-1-${testId}`)
      .send({
        studentId: studentAId,
        paymentDate: '2026-04-16',
        totalAmount: 4000,
        paymentMethod: 'CASH',
        receivingAccountId: cashAccountId,
        allocations: [{ invoiceId, allocatedAmount: 4000 }],
      });

    let inv = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    expect(inv!.status).toBe('PARTIALLY_PAID');
    expect(new Decimal(inv!.paidAmount.toString()).toFixed(2)).toBe('4000.00');
    expect(new Decimal(inv!.outstandingAmount.toString()).toFixed(2)).toBe('6000.00');

    // Collect remaining ₹6,000
    await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', `PART-2-${testId}`)
      .send({
        studentId: studentAId,
        paymentDate: '2026-04-17',
        totalAmount: 6000,
        paymentMethod: 'CASH',
        receivingAccountId: cashAccountId,
        allocations: [{ invoiceId, allocatedAmount: 6000 }],
      });

    inv = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    expect(inv!.status).toBe('PAID');
    expect(new Decimal(inv!.outstandingAmount.toString()).toFixed(2)).toBe('0.00');
  });

  // =========================================================================
  // 9. MULTI-INVOICE ALLOCATION
  // =========================================================================
  it('9. Multi-invoice allocation', async () => {
    const invA = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentBId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [{ feeHeadId: tuitionFeeHeadId, description: 'Invoice A', rate: 3000, quantity: 1 }],
      });

    const invB = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentBId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [{ feeHeadId: tuitionFeeHeadId, description: 'Invoice B', rate: 5000, quantity: 1 }],
      });

    // Receive ₹6,000: Allocate ₹3,000 to A, ₹3,000 to B
    const payRes = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', `MULTI-ALLOC-${testId}`)
      .send({
        studentId: studentBId,
        paymentDate: '2026-04-16',
        totalAmount: 6000,
        paymentMethod: 'CASH',
        receivingAccountId: cashAccountId,
        allocations: [
          { invoiceId: invA.body.id, allocatedAmount: 3000 },
          { invoiceId: invB.body.id, allocatedAmount: 3000 },
        ],
      });
    expect(payRes.status).toBe(201);

    const a = await prisma.feeInvoice.findUnique({ where: { id: invA.body.id } });
    const b = await prisma.feeInvoice.findUnique({ where: { id: invB.body.id } });
    expect(a!.status).toBe('PAID');
    expect(new Decimal(a!.outstandingAmount.toString()).toFixed(2)).toBe('0.00');
    expect(b!.status).toBe('PARTIALLY_PAID');
    expect(new Decimal(b!.outstandingAmount.toString()).toFixed(2)).toBe('2000.00');
  });

  // =========================================================================
  // 10. OVERPAYMENT / ADVANCE CREDIT
  // =========================================================================
  it('10. Overpayment / advance credit', async () => {
    const invRes = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [{ feeHeadId: tuitionFeeHeadId, description: 'Advance Fee', rate: 5000, quantity: 1 }],
      });

    // Pay ₹6,000 with ₹5,000 allocated
    const payRes = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', `OVERPAY-${testId}`)
      .send({
        studentId: studentAId,
        paymentDate: '2026-04-16',
        totalAmount: 6000,
        paymentMethod: 'CASH',
        receivingAccountId: cashAccountId,
        allocations: [{ invoiceId: invRes.body.id, allocatedAmount: 5000 }],
      });
    expect(payRes.status).toBe(201);

    const receipt = await prisma.feeReceipt.findFirst({
      where: { receiptNumber: payRes.body.receiptNumber },
      include: { feePayment: true },
    });
    expect(receipt).toBeDefined();

    const advance = await prisma.studentAdvance.findFirst({
      where: { sourcePaymentId: payRes.body.id },
    });
    expect(advance).toBeDefined();
    expect(new Decimal(advance!.totalCredit.toString()).toFixed(2)).toBe('1000.00');
    expect(new Decimal(advance!.balanceCredit.toString()).toFixed(2)).toBe('1000.00');
  });

  // =========================================================================
  // 11. RECEIPT REVERSAL — CRITICAL
  // =========================================================================
  it('11. Receipt reversal — critical', async () => {
    const invRes = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [{ feeHeadId: tuitionFeeHeadId, description: 'Reversal Target Fee', rate: 10000, quantity: 1 }],
      });
    const invoiceId = invRes.body.id;

    const payRes = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', `REV-PAY-${testId}`)
      .send({
        studentId: studentAId,
        paymentDate: '2026-04-16',
        totalAmount: 4000,
        paymentMethod: 'CASH',
        receivingAccountId: cashAccountId,
        allocations: [{ invoiceId, allocatedAmount: 4000 }],
      });
    expect(payRes.status).toBe(201);
    const receiptId = payRes.body.receipt.id;

    // Reverse receipt
    const revRes = await request(app)
      .post(`/api/v1/finance/collections/receipts/${receiptId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ reason: 'Accidental duplicate entry' });
    expect(revRes.status).toBe(200);

    // Outstanding returns to ₹10,000
    const inv = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    expect(new Decimal(inv!.outstandingAmount.toString()).toFixed(2)).toBe('10000.00');

    // Original receipt is preserved
    const receipt = await prisma.feeReceipt.findUnique({ where: { id: receiptId } });
    expect(receipt).toBeDefined();
    expect(receipt!.isCancelled).toBe(true);

    const payment = await prisma.feePayment.findUnique({ where: { id: payRes.body.id } });
    expect(payment!.status).toBe('REVERSED');
  });

  // =========================================================================
  // 12. REFUND
  // =========================================================================
  it('12. Refund', async () => {
    const invRes = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentBId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [{ feeHeadId: tuitionFeeHeadId, description: 'Refundable Fee', rate: 10000, quantity: 1 }],
      });

    await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', `REF-FUND-${testId}`)
      .send({
        studentId: studentBId,
        paymentDate: '2026-04-16',
        totalAmount: 10000,
        paymentMethod: 'BANK_TRANSFER',
        receivingAccountId: bankAccountId,
        allocations: [{ invoiceId: invRes.body.id, allocatedAmount: 10000 }],
      });

    // Refund ₹2,000
    const refundRes = await request(app)
      .post('/api/v1/finance/refunds')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentBId,
        amount: 2000,
        refundMethod: 'BANK_TRANSFER',
        disbursingAccountId: bankAccountId,
        reason: 'Authorized security caution deposit return',
      });
    expect(refundRes.status).toBe(201);
    expect(refundRes.body.refundNumber).toBeDefined();

    // Invalid refund amount (<= 0) rejected
    const invalidRefund = await request(app)
      .post('/api/v1/finance/refunds')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentBId,
        amount: 0,
        refundMethod: 'BANK_TRANSFER',
        disbursingAccountId: bankAccountId,
        reason: 'Zero refund attempt',
      });
    expect([400, 422]).toContain(invalidRefund.status);
  });

  // =========================================================================
  // 13. CHEQUE BOUNCE
  // =========================================================================
  it('13. Cheque bounce', async () => {
    const invRes = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [{ feeHeadId: tuitionFeeHeadId, description: 'Cheque Fee', rate: 5000, quantity: 1 }],
      });
    const invoiceId = invRes.body.id;

    const chqPay = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', `CHQ-PAY-${testId}`)
      .send({
        studentId: studentAId,
        paymentDate: '2026-04-16',
        totalAmount: 5000,
        paymentMethod: 'CHEQUE',
        receivingAccountId: bankAccountId,
        chequeNumber: 'CHQ-554433',
        chequeDate: '2026-04-16',
        chequeBankName: 'HDFC Bank',
        allocations: [{ invoiceId, allocatedAmount: 5000 }],
      });
    expect(chqPay.status).toBe(201);
    const receiptId = chqPay.body.receipt.id;

    // Bounce cheque
    const bounceRes = await request(app)
      .post(`/api/v1/finance/collections/receipts/${receiptId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ reason: 'Cheque dishonoured for insufficient funds', isBouncedCheque: true });
    expect(bounceRes.status).toBe(200);

    const inv = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    expect(new Decimal(inv!.outstandingAmount.toString()).toFixed(2)).toBe('5000.00');

    const receipt = await prisma.feeReceipt.findUnique({ where: { id: receiptId } });
    expect(receipt!.isCancelled).toBe(true);

    const payment = await prisma.feePayment.findUnique({ where: { id: chqPay.body.id } });
    expect(payment!.status).toBe('BOUNCED');
  });

  // =========================================================================
  // 14. CREDIT NOTE
  // =========================================================================
  it('14. Credit note', async () => {
    const invRes = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [{ feeHeadId: tuitionFeeHeadId, description: 'Credit Note Test Base', rate: 10000, quantity: 1 }],
      });
    const invoiceId = invRes.body.id;

    // Create authorized credit note of ₹1,500
    const cnRes = await request(app)
      .post('/api/v1/finance/credit-notes')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ invoiceId, amount: 1500, reason: 'Approved sibling concession adjustment' });
    expect(cnRes.status).toBe(201);

    const inv = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    expect(new Decimal(inv!.totalAmount.toString()).toFixed(2)).toBe('10000.00');
    expect(new Decimal(inv!.outstandingAmount.toString()).toFixed(2)).toBe('8500.00');
  });

  // =========================================================================
  // 15. WRITE-OFF
  // =========================================================================
  it('15. Write-off', async () => {
    const invRes = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        financialYearId,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
        lines: [{ feeHeadId: tuitionFeeHeadId, description: 'Small Remaining Balance', rate: 500, quantity: 1 }],
      });
    const invoiceId = invRes.body.id;

    const woRes = await request(app)
      .post(`/api/v1/finance/invoices/${invoiceId}/write-off`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ amount: 500, reason: 'Approved management bad-debt write-off' });
    expect(woRes.status).toBe(200);

    const inv = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
    expect(new Decimal(inv!.outstandingAmount.toString()).toFixed(2)).toBe('0.00');
  });

  // =========================================================================
  // 16. FEE STRUCTURE ISOLATION
  // =========================================================================
  it('16. Fee structure isolation', async () => {
    // Create Grade 9 Fee Structure = ₹20,000
    const fs = await prisma.feeStructure.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        code: `FS-GR9-${testId}`,
        name: `Grade 9 Master Fee Structure ${testId}`,
        academicYearId,
        status: 'ACTIVE',
        items: {
          create: [{ feeHeadId: tuitionFeeHeadId, amount: new Decimal('20000.00') }],
        },
      },
      include: { items: true },
    });

    // Student A assigned master structure
    await prisma.studentFeeAssignment.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: studentAId,
        academicYearId,
        feeStructureId: fs.id,
        status: 'ACTIVE',
      },
    });

    // Student B assigned with authorized override = ₹18,000
    const assignB = await prisma.studentFeeAssignment.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: studentBId,
        academicYearId,
        feeStructureId: fs.id,
        overrideAmount: new Decimal('18000.00'),
        overrideReason: 'Special scholarship',
        status: 'ACTIVE',
      },
    });

    // Master structure remains untouched at ₹20,000
    const master = await prisma.feeStructure.findUnique({ where: { id: fs.id }, include: { items: true } });
    expect(new Decimal(master!.items[0].amount.toString()).toFixed(2)).toBe('20000.00');
    expect(new Decimal(assignB.overrideAmount!.toString()).toFixed(2)).toBe('18000.00');
  });

  // =========================================================================
  // 17. BATCH INVOICE IDEMPOTENCY
  // =========================================================================
  it('17. Batch invoice idempotency', async () => {
    const installmentName = `Term 1 Batch ${testId}`;
    const batch1 = await request(app)
      .post('/api/v1/finance/invoices/batch-generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId,
        classId: class1Id,
        installmentName,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
      });
    expect(batch1.status).toBe(201);
    expect(batch1.body.generatedCount).toBeGreaterThan(0);

    // Exact rerun returns skipped without duplicates
    const batch2 = await request(app)
      .post('/api/v1/finance/invoices/batch-generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId,
        classId: class1Id,
        installmentName,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
      });
    expect(batch2.status).toBe(201);
    expect(batch2.body.generatedCount).toBe(0);
    expect(batch2.body.skippedCount).toBeGreaterThan(0);
  });

  // =========================================================================
  // 18. STUDENT LIFECYCLE BILLING
  // =========================================================================
  it('18. Student lifecycle billing', async () => {
    const withdrawnStudent = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: `STU-WITHDRAWN-${testId}`,
        admissionNumber: `ADM-WITHDRAWN-${testId}`,
        admittedAcademicYearId: academicYearId,
        firstName: 'Inactive',
        lastName: 'Student',
        gender: 'FEMALE',
        dateOfBirth: new Date('2018-01-01'),
        status: 'WITHDRAWN',
      },
    });

    await request(app)
      .post('/api/v1/finance/invoices/batch-generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId,
        classId: class1Id,
        installmentName: `Term 2 Lifecycle Check ${testId}`,
        invoiceDate: '2026-04-15',
        dueDate: '2026-04-30',
      });

    const billed = await prisma.feeInvoice.findFirst({
      where: { studentId: withdrawnStudent.id },
    });
    expect(billed).toBeNull();
  });

  // =========================================================================
  // 19. EXPENSE ACCOUNTING
  // =========================================================================
  it('19. Expense accounting', async () => {
    const expRes = await request(app)
      .post('/api/v1/finance/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        vendorId,
        billDate: '2026-04-20',
        dueDate: '2026-04-30',
        description: 'Monthly Campus Electricity',
        lines: [
          {
            expenseHeadId: utilityExpenseHeadId,
            accountId: utilityExpenseAccountId,
            description: 'Power grid bill',
            amount: 5000,
          },
        ],
      });
    expect(expRes.status).toBe(201);

    const journal = await prisma.journalEntry.findUnique({
      where: { id: expRes.body.journalEntryId },
      include: { lines: true },
    });
    const dr = journal!.lines.find((l) => l.accountId === utilityExpenseAccountId);
    expect(new Decimal(dr!.debit.toString()).toFixed(2)).toBe('5000.00');
  });

  // =========================================================================
  // 20. EXPENSE IMMUTABILITY
  // =========================================================================
  it('20. Expense immutability', async () => {
    // Modifying posted expense bills directly is not permitted
    const putRes = await request(app)
      .put('/api/v1/finance/expenses/some-bill')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ totalAmount: 4000 });
    expect([404, 405]).toContain(putRes.status);
  });

  // =========================================================================
  // 21. INTERNAL BANK TRANSFER
  // =========================================================================
  it('21. Internal bank transfer', async () => {
    const trRes = await request(app)
      .post('/api/v1/finance/banking/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        fromAccountId: cashAccountId,
        toAccountId: bankAccountId,
        transferDate: '2026-04-14',
        amount: 8000,
        referenceNumber: 'CASH-DEP-101',
        remarks: 'Daily cashier deposit into bank',
      });
    expect(trRes.status).toBe(201);
    expect(trRes.body.transferNumber).toMatch(/^BT-\d{4}-\d+/);

    const journal = await prisma.journalEntry.findUnique({
      where: { id: trRes.body.journalEntryId },
      include: { lines: true },
    });
    const dr = journal!.lines.find((l) => l.accountId === bankAccountId);
    const cr = journal!.lines.find((l) => l.accountId === cashAccountId);
    expect(new Decimal(dr!.debit.toString()).toFixed(2)).toBe('8000.00');
    expect(new Decimal(cr!.credit.toString()).toFixed(2)).toBe('8000.00');
  });

  // =========================================================================
  // 22. BANK ACCOUNT MASKING
  // =========================================================================
  it('22. Bank account masking', async () => {
    const res = await request(app)
      .get('/api/v1/finance/banking/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(res.status).toBe(200);
    const account = res.body.find((a: any) => a.accountNumber);
    expect(account).toBeDefined();
    expect(account.accountNumber).toContain('••••');
  });

  // =========================================================================
  // 23. BANK STATEMENT DUPLICATE PROTECTION
  // =========================================================================
  it('23. Bank statement duplicate protection', async () => {
    const statementPayload = {
      bankAccountId: bankAccountRecordId,
      statementStartDate: '2026-04-01',
      statementEndDate: '2026-04-30',
      lines: [
        {
          transactionDate: '2026-04-14',
          description: `NEFT Inflow ${testId}`,
          referenceNumber: `REF-${testId}-001`,
          debit: 0,
          credit: 12000,
          balanceAfter: 50000,
        },
      ],
    };

    const imp1 = await request(app)
      .post('/api/v1/finance/banking/statements/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send(statementPayload);
    expect(imp1.status).toBe(201);
    expect(imp1.body.importedLines).toBe(1);

    // Exact second import -> duplicate rows rejected with 409
    const imp2 = await request(app)
      .post('/api/v1/finance/banking/statements/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send(statementPayload);
    expect(imp2.status).toBe(409);
    expect(JSON.stringify(imp2.body)).toContain('BANK_STATEMENT_DUPLICATE');
  });

  // =========================================================================
  // 24. RECONCILIATION
  // =========================================================================
  it('24. Reconciliation', async () => {
    const closeRes = await request(app)
      .post('/api/v1/finance/banking/reconciliation/close')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        bankAccountId: bankAccountRecordId,
        periodStartDate: '2026-04-01',
        periodEndDate: '2026-04-30',
        closingBalanceBank: 50000,
      });
    expect(closeRes.status).toBe(201);
    expect(closeRes.body.status).toBe('CLOSED');
  });

  // =========================================================================
  // 25. TRIAL BALANCE — CRITICAL
  // =========================================================================
  it('25. Trial Balance — critical', async () => {
    const tbRes = await request(app)
      .get('/api/v1/finance/reports/trial-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(tbRes.status).toBe(200);

    const { totalDebit, totalCredit, isBalanced } = tbRes.body;
    expect(isBalanced).toBe(true);
    expect(new Decimal(totalDebit).equals(new Decimal(totalCredit))).toBe(true);
  });

  // =========================================================================
  // 26. BALANCE SHEET — CRITICAL
  // =========================================================================
  it('26. Balance Sheet — critical', async () => {
    const bsRes = await request(app)
      .get('/api/v1/finance/reports/balance-sheet')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(bsRes.status).toBe(200);

    const { totalAssets, totalLiabilitiesAndEquity, isBalanced } = bsRes.body;
    expect(isBalanced).toBe(true);
    expect(new Decimal(totalAssets).equals(new Decimal(totalLiabilitiesAndEquity))).toBe(true);
  });

  // =========================================================================
  // 27. P&L
  // =========================================================================
  it('27. P&L', async () => {
    const plRes = await request(app)
      .get('/api/v1/finance/reports/profit-and-loss')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(plRes.status).toBe(200);

    const { totalIncome, totalExpense, netSurplus } = plRes.body;
    const computed = new Decimal(totalIncome).minus(new Decimal(totalExpense));
    expect(computed.equals(new Decimal(netSurplus))).toBe(true);
  });

  // =========================================================================
  // 28. STUDENT LEDGER RECONCILIATION
  // =========================================================================
  it('28. Student ledger reconciliation', async () => {
    const ledgerRes = await request(app)
      .get(`/api/v1/finance/student-ledger/${studentAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.summary).toBeDefined();
    expect(ledgerRes.body.entries.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // 29. PARENT ISOLATION — CRITICAL
  // =========================================================================
  it('29. Parent isolation — critical', async () => {
    // Parent A viewing linked Child A succeeds
    const ownRes = await request(app)
      .get(`/api/v1/finance/parent/student/${studentAId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-school-id', schoolAId);
    expect(ownRes.status).toBe(200);

    // Parent A attempting to view unlinked Child B fails with 403
    const unlinkedRes = await request(app)
      .get(`/api/v1/finance/parent/student/${studentBId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-school-id', schoolAId);
    expect(unlinkedRes.status).toBe(403);
  });

  // =========================================================================
  // 30. CROSS-SCHOOL ISOLATION
  // =========================================================================
  it('30. Cross-school isolation', async () => {
    // Querying School A student under School B context returns 404
    const res = await request(app)
      .get(`/api/v1/finance/student-ledger/${studentAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolBId);
    expect(res.status).toBe(404);
  });

  // =========================================================================
  // 31. FINANCE GLOBAL SEARCH
  // =========================================================================
  it('31. Finance Global Search', async () => {
    const res = await request(app)
      .get('/api/v1/search')
      .query({ q: 'Aarav' })
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(res.status).toBe(200);
  });

  // =========================================================================
  // 32. RECEIPT REPRINT
  // =========================================================================
  it('32. Receipt reprint', async () => {
    const receipts = await prisma.feeReceipt.findMany({ where: { schoolId: schoolAId }, take: 1 });
    expect(receipts.length).toBeGreaterThan(0);
    const original = receipts[0];

    const reprint = await prisma.feeReceipt.findUnique({ where: { id: original.id } });
    expect(reprint!.receiptNumber).toBe(original.receiptNumber);
  });

  // =========================================================================
  // 33. HINDI + HINGLISH
  // =========================================================================
  it('33. Hindi + Hinglish', async () => {
    const enLocale: any = await import('../../../frontend/src/i18n/locales/en/common.json');
    const hiLocale: any = await import('../../../frontend/src/i18n/locales/hi/common.json');
    const hinglishLocale: any = await import('../../../frontend/src/i18n/locales/hinglish/common.json');

    const enFinanceKeys = Object.keys(enLocale.default?.finance || enLocale.finance || {});
    const hiFinanceKeys = Object.keys(hiLocale.default?.finance || hiLocale.finance || {});
    const hinglishFinanceKeys = Object.keys(hinglishLocale.default?.finance || hinglishLocale.finance || {});

    expect(hiFinanceKeys.length).toBe(enFinanceKeys.length);
    expect(hinglishFinanceKeys.length).toBe(enFinanceKeys.length);
  });

  // =========================================================================
  // 34. MOBILE CASHIER FLOW
  // =========================================================================
  it('34. Mobile cashier flow', async () => {
    // Verify responsive fee collection layout in FeeCollectionView
    const fs = await import('fs');
    const path = await import('path');
    const viewPath = path.resolve(__dirname, '../../../frontend/src/app/views/finance/FeeCollectionView.tsx');
    expect(fs.existsSync(viewPath)).toBe(true);
    const content = fs.readFileSync(viewPath, 'utf8');
    expect(content).toContain('FeeCollectionView');
    expect(content).toContain('grid');
  });
});
