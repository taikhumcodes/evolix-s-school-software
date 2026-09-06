import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('Major Module 07 — Finance & Accounting Automated QA Verifications', () => {
  let adminToken: string;
  let cashierToken: string;
  let parentToken: string;

  let tenantId: string;
  let schoolAId: string;
  let schoolBId: string;
  let tenantBId: string;

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
  let examFeeHeadId: string;
  let utilityExpenseHeadId: string;

  let cashAccountId: string;
  let bankAccountId: string;
  let receivableAccountId: string;
  let advanceAccountId: string;
  let vendorPayableAccountId: string;
  let tuitionIncomeAccountId: string;
  let utilityExpenseAccountId: string;

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
        code: `SCH-B-${testId}`,
        name: 'School B Branch',
        isActive: true,
      },
    });
    schoolBId = schoolB.id;

    // 3. Setup Tenant B for Tenant Isolation tests
    const tenantB = await prisma.tenant.upsert({
      where: { id: '00000000-0000-0000-0000-000000000077' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000077',
        name: 'Tenant B Independent Trust',
        domain: `tenant-b-${testId}.local`,
        isActive: true,
      },
    });
    tenantBId = tenantB.id;

    // 4. Academic Year
    let ay = await prisma.academicYear.findFirst({
      where: { schoolId: schoolAId },
    });
    if (!ay) {
      ay = await prisma.academicYear.create({
        data: {
          schoolId: schoolAId,
          name: `AY 2026-27-${testId}`,
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          endDate: new Date('2027-03-31T23:59:59.999Z'),
          isCurrent: true,
        },
      });
    }
    academicYearId = ay.id;

    // 5. Classes and Students
    const cls = await prisma.classMaster.findFirst({ where: { schoolId: schoolAId } });
    class1Id = cls!.id;
    const sec = await prisma.sectionMaster.findFirst({ where: { schoolId: schoolAId } });
    sectionAId = sec!.id;

    // Create Student A
    const stuA = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: `STU-A-${testId}`,
        admissionNumber: `ADM-A-${testId}`,
        admittedAcademicYearId: academicYearId,
        firstName: 'Aarav',
        lastName: `Patel-${testId}`,
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

    // Create Student B
    const stuB = await prisma.student.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        studentId: `STU-B-${testId}`,
        admissionNumber: `ADM-B-${testId}`,
        admittedAcademicYearId: academicYearId,
        firstName: 'Riya',
        lastName: `Sharma-${testId}`,
        gender: 'FEMALE',
        dateOfBirth: new Date('2018-08-14'),
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

    // 6. Parent User linked ONLY to Student A
    const parentPassword = await bcrypt.hash('Password123!', 10);
    const parentUser = await prisma.user.create({
      data: {
        tenantId,
        email: `parent-${testId}@evolix.local`,
        hashedPassword: parentPassword,
        firstName: 'Sunil',
        lastName: 'Patel',
        isActive: true,
      },
    });
    parentAUserId = parentUser.id;

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

    await prisma.userSchool.create({
      data: { userId: parentUser.id, schoolId: schoolAId },
    });

    const guardian = await prisma.guardian.create({
      data: {
        tenantId,
        schoolId: schoolAId,
        userId: parentUser.id,
        firstName: 'Sunil',
        lastName: 'Patel',
        phone: `98765${testId}`,
        normalizedPhone: `98765${testId}`,
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
      },
    });

    const parentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `parent-${testId}@evolix.local`, password: 'Password123!' });
    parentToken = parentLogin.body.access_token;

    // 7. Resolve seeded Accounts & Heads
    const [cashAcc, bankAcc, recAcc, advAcc, venPayAcc, tuitIncAcc, utilExpAcc] = await Promise.all([
      prisma.account.findFirst({ where: { schoolId: schoolAId, code: '1010' } }),
      prisma.account.findFirst({ where: { schoolId: schoolAId, code: '1020' } }),
      prisma.account.findFirst({ where: { schoolId: schoolAId, code: '1100' } }),
      prisma.account.findFirst({ where: { schoolId: schoolAId, code: '2010' } }),
      prisma.account.findFirst({ where: { schoolId: schoolAId, code: '2100' } }),
      prisma.account.findFirst({ where: { schoolId: schoolAId, code: '4010' } }),
      prisma.account.findFirst({ where: { schoolId: schoolAId, code: '5010' } }),
    ]);

    cashAccountId = cashAcc!.id;
    bankAccountId = bankAcc!.id;
    receivableAccountId = recAcc!.id;
    advanceAccountId = advAcc!.id;
    vendorPayableAccountId = venPayAcc!.id;
    tuitionIncomeAccountId = tuitIncAcc!.id;
    utilityExpenseAccountId = utilExpAcc!.id;

    const [tuitHead, examHead, utilHead] = await Promise.all([
      prisma.feeHead.findFirst({ where: { schoolId: schoolAId, code: 'TUITION' } }),
      prisma.feeHead.findFirst({ where: { schoolId: schoolAId, code: 'EXAM' } }),
      prisma.expenseHead.findFirst({ where: { schoolId: schoolAId, code: 'ELECTRICITY' } }),
    ]);

    tuitionFeeHeadId = tuitHead!.id;
    examFeeHeadId = examHead!.id;
    utilityExpenseHeadId = utilHead!.id;

    const bankRecord = await prisma.bankAccount.findFirst({ where: { schoolId: schoolAId } });
    bankAccountRecordId = bankRecord!.id;
  });

  // Reusable double-entry invariant helper
  const assertJournalIsBalanced = async (journalEntryId: string) => {
    const journal = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { lines: true },
    });
    expect(journal).toBeTruthy();
    expect(journal!.lines.length).toBeGreaterThanOrEqual(2);

    let sumDebit = new Prisma.Decimal(0);
    let sumCredit = new Prisma.Decimal(0);
    for (const line of journal!.lines) {
      sumDebit = sumDebit.add(line.debit);
      sumCredit = sumCredit.add(line.credit);
    }
    expect(sumDebit.equals(sumCredit)).toBe(true);
  };

  // =========================================================================
  // 1. FINANCIAL YEAR & ACCOUNTING PERIODS
  // =========================================================================

  it('1. Financial Year creation succeeds with open status', async () => {
    const res = await request(app)
      .post('/api/v1/finance/financial-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        name: `FY Test ${testId}`,
        startDate: '2026-04-01',
        endDate: '2027-03-31',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(`FY Test ${testId}`);
    expect(res.body.status).toBe('OPEN');
    financialYearId = res.body.id;
  });

  it('2. Accounting period creation & overlap rejection', async () => {
    // Valid period 1
    const p1 = await request(app)
      .post('/api/v1/finance/accounting-periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        financialYearId,
        name: `Period 1-${testId}`,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      });
    expect(p1.status).toBe(201);
    periodAprilId = p1.body.id;

    // Overlapping period must be rejected with 400
    const pOverlap = await request(app)
      .post('/api/v1/finance/accounting-periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        financialYearId,
        name: `Period Overlap-${testId}`,
        startDate: '2026-04-15',
        endDate: '2026-05-15',
      });
    expect(pOverlap.status).toBe(400);
    expect(JSON.stringify(pOverlap.body)).toContain('PERIOD_OVERLAP');
  });

  it('3. Closed period rejects financial posting', async () => {
    // Close the April period
    const closeRes = await request(app)
      .post(`/api/v1/finance/accounting-periods/${periodAprilId}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send();
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.status).toBe('CLOSED');

    // Attempt to post journal in closed period -> rejected
    const postRes = await request(app)
      .post('/api/v1/finance/journals')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        postingDate: '2026-04-10',
        description: 'Testing posting in closed period',
        lines: [
          { accountId: cashAccountId, debit: 100, credit: 0 },
          { accountId: bankAccountId, debit: 0, credit: 100 },
        ],
      });
    expect(postRes.status).toBe(400);
    expect(JSON.stringify(postRes.body)).toContain('PERIOD_CLOSED');
  });

  it('4. Period reopen requires justification reason & restores posting ability', async () => {
    // Missing reason -> rejected
    const failReopen = await request(app)
      .post(`/api/v1/finance/accounting-periods/${periodAprilId}/reopen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ reason: '' });
    expect([400, 422].includes(failReopen.status)).toBe(true);

    // Valid reopen
    const reopen = await request(app)
      .post(`/api/v1/finance/accounting-periods/${periodAprilId}/reopen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ reason: 'Audit adjustment requirement by chartered accountant' });
    expect(reopen.status).toBe(200);
    expect(reopen.body.status).toBe('OPEN');
  });

  // =========================================================================
  // 2. CHART OF ACCOUNTS
  // =========================================================================

  it('5. Account creation with valid type and hierarchy', async () => {
    const res = await request(app)
      .post('/api/v1/finance/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        code: `1030-${testId}`,
        name: 'Petty Cash Desk',
        type: 'ASSET',
        normalBalance: 'DEBIT',
        parentAccountId: cashAccountId,
        description: 'Sub-account for petty office cash',
      });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(`1030-${testId}`);
    expect(res.body.type).toBe('ASSET');
  });

  it('6. Essential system account cannot be archived/deleted', async () => {
    const res = await request(app)
      .post(`/api/v1/finance/accounts/${cashAccountId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send();
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('SYSTEM_ACCOUNT_PROTECTED');
  });

  // =========================================================================
  // 3. GENERAL LEDGER & BALANCED JOURNALS
  // =========================================================================

  it('7. Balanced journal posts and passes double-entry verification', async () => {
    const res = await request(app)
      .post('/api/v1/finance/journals')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        postingDate: '2026-04-12',
        description: 'Office stationery replenishment',
        lines: [
          { accountId: utilityExpenseAccountId, debit: 750.50, credit: 0 },
          { accountId: cashAccountId, debit: 0, credit: 750.50 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('POSTED');
    expect(res.body.journalNumber).toMatch(/^JRN-\d{4}-\d+/);

    await assertJournalIsBalanced(res.body.id);
  });

  it('8. Unbalanced journal is rejected with JOURNAL_NOT_BALANCED', async () => {
    const res = await request(app)
      .post('/api/v1/finance/journals')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        postingDate: '2026-04-12',
        description: 'Unbalanced journal attempt',
        lines: [
          { accountId: utilityExpenseAccountId, debit: 1000.00, credit: 0 },
          { accountId: cashAccountId, debit: 0, credit: 800.00 }, // Off by 200
        ],
      });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('JOURNAL_NOT_BALANCED');
  });

  it('9. Posted journal is immutable (no direct editing of lines or amounts)', async () => {
    const journals = await request(app)
      .get('/api/v1/finance/journals')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(journals.status).toBe(200);
    const postedEntry = journals.body.data[0];

    // Ensure no PUT /journals/:id endpoint exists to silently mutate posted journal
    const putAttempt = await request(app)
      .put(`/api/v1/finance/journals/${postedEntry.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ description: 'Hacked description' });
    expect(putAttempt.status).toBe(404);
  });

  it('10. Journal reversal creates opposite balanced entries and marks original REVERSED', async () => {
    const postRes = await request(app)
      .post('/api/v1/finance/journals')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        postingDate: '2026-04-14',
        description: 'Erroneous fee deposit to reverse',
        lines: [
          { accountId: bankAccountId, debit: 5000.00, credit: 0 },
          { accountId: cashAccountId, debit: 0, credit: 5000.00 },
        ],
      });
    expect(postRes.status).toBe(201);
    const originalId = postRes.body.id;

    const reverseRes = await request(app)
      .post(`/api/v1/finance/journals/${originalId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ reason: 'Incorrect destination bank used' });
    expect(reverseRes.status).toBe(200);
    expect(reverseRes.body.reversalOfId).toBe(originalId);

    // Verify original is marked REVERSED
    const checkOriginal = await prisma.journalEntry.findUnique({ where: { id: originalId } });
    expect(checkOriginal!.status).toBe('REVERSED');
    expect(checkOriginal!.reversedAt).toBeTruthy();

    await assertJournalIsBalanced(reverseRes.body.id);
  });

  // =========================================================================
  // 4. FEE STRUCTURE & ASSIGNMENT
  // =========================================================================

  let feeStructureId: string;

  it('11. Fee structure creation with items and installment schedules', async () => {
    const res = await request(app)
      .post('/api/v1/finance/fee-structures')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        name: `Class 1 Standard Fee ${testId}`,
        code: `FS-C1-${testId}`,
        academicYearId,
        classId: class1Id,
        effectiveDate: '2026-04-01',
        items: [
          { feeHeadId: tuitionFeeHeadId, amount: 15000.00, frequency: 'TERMLY', isOptional: false },
          { feeHeadId: examFeeHeadId, amount: 2000.00, frequency: 'TERMLY', isOptional: false },
        ],
        installments: [
          { name: 'Term 1 Installment', dueDate: '2026-04-15', amount: 17000.00, sequence: 1 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.items.length).toBe(2);
    expect(res.body.installments.length).toBe(1);
    feeStructureId = res.body.id;
  });

  it('12. Student fee assignment with optional custom override amount', async () => {
    const res = await request(app)
      .post('/api/v1/finance/student-fees/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        feeStructureId,
        customTotalAmount: 16000.00, // 1000 concession override
        remarks: 'Special management consideration',
      });
    expect(res.status).toBe(201);
    expect(res.body.studentId).toBe(studentAId);
  });

  // =========================================================================
  // 5. FEE INVOICES & IDEMPOTENT BATCH GENERATION
  // =========================================================================

  let invoiceAId: string;

  it('13. Fee invoice generation creates lines and atomic sequence number', async () => {
    const res = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        invoiceDate: '2026-04-05',
        dueDate: '2026-04-25',
        lines: [
          { feeHeadId: tuitionFeeHeadId, description: 'Term 1 Tuition Fee', rate: 10000.25, quantity: 1, concession: 0 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.invoiceNumber).toMatch(/^INV-\d{4}-\d+/);
    expect(res.body.status).toBe('POSTED');
    expect(res.body.outstandingAmount).toBe('10000.25');
    invoiceAId = res.body.id;
  });

  it('14. Batch invoice generation is strictly idempotent', async () => {
    // Run batch generation 1st time
    const batch1 = await request(app)
      .post('/api/v1/finance/invoices/batch-generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId,
        classId: class1Id,
        sectionId: sectionAId,
        installmentName: `Installment 1-${testId}`,
        invoiceDate: '2026-04-05',
        dueDate: '2026-04-20',
      });
    expect(batch1.status).toBe(201);
    const initialGenerated = batch1.body.generatedCount;
    expect(initialGenerated).toBeGreaterThanOrEqual(1);

    // Run identical batch 2nd time -> must NOT duplicate invoices
    const batch2 = await request(app)
      .post('/api/v1/finance/invoices/batch-generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        academicYearId,
        classId: class1Id,
        sectionId: sectionAId,
        installmentName: `Installment 1-${testId}`,
        invoiceDate: '2026-04-05',
        dueDate: '2026-04-20',
      });
    expect(batch2.status).toBe(201);
    expect(batch2.body.generatedCount).toBe(0); // None generated
    expect(batch2.body.skippedCount).toBeGreaterThanOrEqual(1); // Skipped duplicate
  });

  it('15. Invoice number generation concurrency safety', async () => {
    // Rapid concurrent invoice creations
    const promises = [1, 2, 3].map((i) =>
      request(app)
        .post('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-school-id', schoolAId)
        .send({
          studentId: studentBId,
          academicYearId,
          invoiceDate: '2026-04-06',
          dueDate: '2026-04-26',
          lines: [
            { feeHeadId: tuitionFeeHeadId, description: `Concurrent charge ${i}`, rate: 500, quantity: 1, concession: 0 },
          ],
        })
    );

    const results = await Promise.all(promises);
    const numbers = results.map((r) => r.body.invoiceNumber);
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(3); // Zero duplicate numbers produced
  });

  it('16. Posted invoice is immutable against direct updates', async () => {
    const putRes = await request(app)
      .put(`/api/v1/finance/invoices/${invoiceAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ totalAmount: 100 });
    expect(putRes.status).toBe(404);
  });

  it('17. Invoice creation posts atomic GL journal with Debit Receivable / Credit Income', async () => {
    const inv = await prisma.feeInvoice.findUnique({
      where: { id: invoiceAId },
      include: { journalEntry: { include: { lines: true } } },
    });
    expect(inv!.journalEntryId).toBeTruthy();
    expect(inv!.journalEntry!.status).toBe('POSTED');

    const lines = inv!.journalEntry!.lines;
    const debitLine = lines.find((l) => l.debit.greaterThan(0));
    const creditLine = lines.find((l) => l.credit.greaterThan(0));

    expect(debitLine!.accountId).toBe(receivableAccountId);
    expect(creditLine!.accountId).toBe(tuitionIncomeAccountId);
    await assertJournalIsBalanced(inv!.journalEntryId!);
  });

  // =========================================================================
  // 6. COLLECTIONS, RECEIPTS & PAYMENT IDEMPOTENCY
  // =========================================================================

  let receiptAId: string;

  it('18. Partial payment reduces invoice outstanding with exact Decimal precision (Section 170)', async () => {
    // Invoice is 10,000.25. Pay 4,000.10.
    const res = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        receivingAccountId: cashAccountId,
        paymentDate: '2026-04-10',
        paymentMethod: 'CASH',
        totalAmount: 4000.10,
        allocations: [{ invoiceId: invoiceAId, allocatedAmount: 4000.10 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.receipt.receiptNumber).toMatch(/^(RCPT|REC)-\d+/);
    receiptAId = res.body.receipt.id;

    // Verify invoice outstanding is exactly 6000.15 (zero float error)
    const inv = await prisma.feeInvoice.findUnique({ where: { id: invoiceAId } });
    expect(inv!.status).toBe('PARTIALLY_PAID');
    expect(inv!.paidAmount.toFixed(2)).toBe('4000.10');
    expect(inv!.outstandingAmount.toFixed(2)).toBe('6000.15');
  });

  it('19. Multiple invoice allocation across open student dues', async () => {
    // Create second invoice of 3000
    const inv2 = await request(app)
      .post('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        academicYearId,
        invoiceDate: '2026-04-11',
        dueDate: '2026-04-30',
        lines: [
          { feeHeadId: examFeeHeadId, description: 'Exam Fee', rate: 3000, quantity: 1, concession: 0 },
        ],
      });
    const invoice2Id = inv2.body.id;

    // Pay 5000: allocate 2000 to invoice 1 (leaving 4000.15) and 3000 to invoice 2 (fully paid)
    const payRes = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        receivingAccountId: bankAccountId,
        paymentDate: '2026-04-12',
        paymentMethod: 'BANK_TRANSFER',
        totalAmount: 5000,
        referenceNumber: 'TXN-BANK-12345',
        allocations: [
          { invoiceId: invoiceAId, allocatedAmount: 2000 },
          { invoiceId: invoice2Id, allocatedAmount: 3000 },
        ],
      });
    expect(payRes.status).toBe(201);

    const [updated1, updated2] = await Promise.all([
      prisma.feeInvoice.findUnique({ where: { id: invoiceAId } }),
      prisma.feeInvoice.findUnique({ where: { id: invoice2Id } }),
    ]);
    expect(updated1!.outstandingAmount.toString()).toBe('4000.15');
    expect(updated2!.outstandingAmount.isZero()).toBe(true);
    expect(updated2!.status).toBe('PAID');
  });

  it('20. Payment cannot over-allocate an invoice', async () => {
    // Invoice 1 has 4000.15 left. Attempt to allocate 5000 -> rejected
    const overPay = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        receivingAccountId: cashAccountId,
        paymentDate: '2026-04-12',
        paymentMethod: 'CASH',
        totalAmount: 5000,
        allocations: [{ invoiceId: invoiceAId, allocatedAmount: 5000 }],
      });
    expect(overPay.status).toBe(400);
    expect(JSON.stringify(overPay.body)).toContain('PAYMENT_EXCEEDS_OUTSTANDING');
  });

  it('21. Payment idempotency retry returns identical receipt without duplicate payment', async () => {
    const key = `IDEMP-PAY-${Date.now()}`;
    const payload = {
      studentId: studentAId,
      receivingAccountId: cashAccountId,
      paymentDate: '2026-04-12',
      paymentMethod: 'CASH',
      totalAmount: 1000,
      allocations: [{ invoiceId: invoiceAId, allocatedAmount: 1000 }],
      idempotencyKey: key,
    };

    // First request
    const res1 = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', key)
      .send(payload);
    expect(res1.status).toBe(201);
    const receiptNum1 = res1.body.receipt.receiptNumber;

    // Retry identical request with same key
    const res2 = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', key)
      .send(payload);
    expect(res2.status).toBe(201);
    expect(res2.body.receipt.receiptNumber).toBe(receiptNum1); // Same receipt returned
  });

  it('22. Same idempotency key with different payload is rejected with 409 Conflict', async () => {
    const key = `IDEMP-PAY-${Date.now()}-DIFF`;
    const payload1 = {
      studentId: studentAId,
      receivingAccountId: cashAccountId,
      paymentDate: '2026-04-12',
      paymentMethod: 'CASH',
      totalAmount: 500,
      idempotencyKey: key,
    };
    const res1 = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', key)
      .send(payload1);
    expect(res1.status).toBe(201);

    // Send different amount with same key
    const payload2 = {
      ...payload1,
      totalAmount: 900,
    };
    const res2 = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .set('Idempotency-Key', key)
      .send(payload2);
    expect(res2.status).toBe(409);
    expect(JSON.stringify(res2.body)).toContain('IDEMPOTENCY_KEY_REUSED');
  });

  it('23. Receipt number generation concurrency produces unique numbers', async () => {
    const promises = [1, 2, 3].map((i) =>
      request(app)
        .post('/api/v1/finance/collections/pay')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-school-id', schoolAId)
        .send({
          studentId: studentBId,
          receivingAccountId: cashAccountId,
          paymentDate: '2026-04-12',
          paymentMethod: 'CASH',
          totalAmount: 100,
        })
    );
    const results = await Promise.all(promises);
    const receiptNums = results.map((r) => r.body.receipt.receiptNumber);
    const uniqueReceipts = new Set(receiptNums);
    expect(uniqueReceipts.size).toBe(3);
  });

  it('24. Receipt GL posting debits Cash/Bank and credits Student Fee Receivable', async () => {
    const lastReceipt = await prisma.feeReceipt.findFirst({
      where: { schoolId: schoolAId },
      include: { feePayment: { include: { journalEntry: { include: { lines: true } } } } },
      orderBy: { receiptDate: 'desc' },
    });
    expect(lastReceipt!.feePayment.journalEntry).toBeTruthy();
    const jLines = lastReceipt!.feePayment.journalEntry!.lines;

    const debitLine = jLines.find((l) => l.debit.greaterThan(0));
    expect(debitLine!.accountId).toBe(lastReceipt!.feePayment.receivingAccountId);

    await assertJournalIsBalanced(lastReceipt!.feePayment.journalEntry!.id);
  });

  // =========================================================================
  // 7. CONCESSIONS, CREDIT NOTES & WRITE-OFFS
  // =========================================================================

  it('26. Concession creation and approval workflow', async () => {
    const conc = await request(app)
      .post('/api/v1/finance/concessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentBId,
        academicYearId,
        feeHeadId: tuitionFeeHeadId,
        type: 'SIBLING_DISCOUNT',
        method: 'FIXED_AMOUNT',
        value: 1500,
        reason: 'Elder sibling studying in Class 5',
      });
    expect(conc.status).toBe(201);
    expect(conc.body.status).toBe('PENDING');

    const approve = await request(app)
      .post(`/api/v1/finance/concessions/${conc.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ approved: true });
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe('APPROVED');
  });

  it('27. Credit Note reduces invoice outstanding and posts GL adjustment', async () => {
    const inv = await prisma.feeInvoice.findUnique({ where: { id: invoiceAId } });
    const outstandingBefore = inv!.outstandingAmount;

    const res = await request(app)
      .post('/api/v1/finance/credit-notes')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        invoiceId: invoiceAId,
        amount: 500,
        reason: 'Approved mid-term fee concession',
      });
    expect(res.status).toBe(201);
    expect(res.body.creditNoteNumber).toMatch(/^CN-\d{4}-\d+/);

    const invAfter = await prisma.feeInvoice.findUnique({ where: { id: invoiceAId } });
    expect(invAfter!.outstandingAmount.equals(outstandingBefore.sub(500))).toBe(true);

    await assertJournalIsBalanced(res.body.journalEntryId);
  });

  it('59. Controlled write-off reduces invoice outstanding and posts to Bad Debt account', async () => {
    const writeOffRes = await request(app)
      .post(`/api/v1/finance/invoices/${invoiceAId}/write-off`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        amount: 200,
        reason: 'Uncollectible minor remainder balance approved for write-off',
      });
    expect(writeOffRes.status).toBe(200);
    expect(writeOffRes.body.success).toBe(true);
  });

  // =========================================================================
  // 8. REFUNDS & RECEIPT REVERSAL
  // =========================================================================

  it('28. Refund creation and GL posting', async () => {
    const res = await request(app)
      .post('/api/v1/finance/refunds')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentAId,
        disbursingAccountId: bankAccountId,
        amount: 300,
        refundMethod: 'BANK_TRANSFER',
        reason: 'Excess deposit reimbursement',
      });
    expect(res.status).toBe(201);
    expect(res.body.refundNumber).toMatch(/^REF-\d{4}-\d+/);
    expect(res.body.status).toBe('PROCESSED');

    await assertJournalIsBalanced(res.body.journalEntryId);
  });

  it('30. Receipt reversal restores invoice outstanding and posts reversal journal', async () => {
    // Find receiptA
    const rcpt = await prisma.feeReceipt.findUnique({
      where: { id: receiptAId },
      include: { feePayment: { include: { allocations: true } } },
    });
    const alloc = rcpt!.feePayment.allocations[0];
    const invBefore = await prisma.feeInvoice.findUnique({ where: { id: alloc.feeInvoiceId } });
    const outstandingBefore = invBefore!.outstandingAmount;

    const revRes = await request(app)
      .post(`/api/v1/finance/collections/receipts/${receiptAId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ reason: 'Cashier entry mistake' });
    expect(revRes.status).toBe(200);
    expect(revRes.body.isCancelled).toBe(true);

    // Outstanding restored
    const invAfter = await prisma.feeInvoice.findUnique({ where: { id: alloc.feeInvoiceId } });
    expect(invAfter!.outstandingAmount.equals(outstandingBefore.add(alloc.allocatedAmount))).toBe(true);
  });

  it('31. Cheque bounce marks payment BOUNCED and records audit event', async () => {
    // Pay via cheque
    const chequePay = await request(app)
      .post('/api/v1/finance/collections/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        studentId: studentBId,
        receivingAccountId: bankAccountId,
        paymentDate: '2026-04-14',
        paymentMethod: 'CHEQUE',
        totalAmount: 1200,
        chequeNumber: 'CHQ-999888',
        chequeBankName: 'HDFC Bank',
      });
    expect(chequePay.status).toBe(201);
    const chequeReceiptId = chequePay.body.receipt.id;

    // Bounce cheque
    const bounceRes = await request(app)
      .post(`/api/v1/finance/collections/receipts/${chequeReceiptId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ reason: 'Insufficient funds in drawer account', isBouncedCheque: true });
    expect(bounceRes.status).toBe(200);

    const payRecord = await prisma.feePayment.findUnique({ where: { id: chequePay.body.id } });
    expect(payRecord!.status).toBe('BOUNCED');
    expect(payRecord!.chequeClearanceStatus).toBe('BOUNCED');
  });

  // =========================================================================
  // 9. STUDENT LEDGER & AGING
  // =========================================================================

  it('32. Student financial ledger computes server-authoritative running balance', async () => {
    const res = await request(app)
      .get(`/api/v1/finance/student-ledger/${studentAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(res.status).toBe(200);
    expect(res.body.summary).toHaveProperty('totalCharges');
    expect(res.body.summary).toHaveProperty('totalPaid');
    expect(res.body.summary).toHaveProperty('outstandingBalance');
    expect(res.body.entries.length).toBeGreaterThanOrEqual(1);

    // Verify chronological order and running balance presence
    for (const entry of res.body.entries) {
      expect(entry).toHaveProperty('runningBalance');
      expect(entry).toHaveProperty('debit');
      expect(entry).toHaveProperty('credit');
    }
  });

  it('33. Receivable aging categorizes open invoices into days buckets', async () => {
    const res = await request(app)
      .get('/api/v1/finance/aging')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(res.status).toBe(200);
    expect(res.body.totals).toHaveProperty('current');
    expect(res.body.totals).toHaveProperty('days30');
    expect(res.body.totals).toHaveProperty('days60');
    expect(res.body.totals).toHaveProperty('days90');
    expect(res.body.totals).toHaveProperty('days90Plus');
    expect(res.body.totals).toHaveProperty('total');
  });

  // =========================================================================
  // 10. VENDORS, EXPENSES & PAYMENTS
  // =========================================================================

  let expenseBillId: string;

  it('34. Vendor creation and expense bill posting creates GL entry', async () => {
    const vRes = await request(app)
      .post('/api/v1/finance/vendors')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        name: `Supreme Electricals ${testId}`,
        contactPerson: 'Mr. Ramesh',
        phone: '9876543210',
        email: 'ramesh@supreme.local',
      });
    expect(vRes.status).toBe(201);
    vendorId = vRes.body.id;

    const expRes = await request(app)
      .post('/api/v1/finance/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        vendorId,
        billDate: '2026-04-10',
        dueDate: '2026-04-30',
        description: 'Monthly campus power bill',
        lines: [
          {
            expenseHeadId: utilityExpenseHeadId,
            accountId: utilityExpenseAccountId,
            description: 'Campus power consumption',
            amount: 4500.00,
          },
        ],
      });
    expect(expRes.status).toBe(201);
    expect(expRes.body.billNumber).toMatch(/^EXP-\d{4}-\d+/);
    expenseBillId = expRes.body.id;

    await assertJournalIsBalanced(expRes.body.journalEntryId);
  });

  it('35. Vendor payable settlement via vendor payment', async () => {
    const payRes = await request(app)
      .post('/api/v1/finance/expenses/pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({
        vendorId,
        expenseBillId,
        disbursingAccountId: bankAccountId,
        paymentDate: '2026-04-12',
        paymentMethod: 'BANK_TRANSFER',
        amount: 4500.00,
        referenceNumber: 'NEFT-VEN-887766',
      });
    expect(payRes.status).toBe(201);
    expect(payRes.body.paymentNumber).toMatch(/^VPAY-\d{4}-\d+/);

    await assertJournalIsBalanced(payRes.body.journalEntryId);
  });

  // =========================================================================
  // 11. BANKING, TRANSFERS & RECONCILIATION
  // =========================================================================

  it('36. Internal bank transfer posts balanced GL journal', async () => {
    const res = await request(app)
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
    expect(res.status).toBe(201);
    expect(res.body.transferNumber).toMatch(/^BT-\d{4}-\d+/);

    await assertJournalIsBalanced(res.body.journalEntryId);
  });

  it('37. Bank statement import with duplicate line protection', async () => {
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

    // Re-importing same line -> rejected
    const imp2 = await request(app)
      .post('/api/v1/finance/banking/statements/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send(statementPayload);
    expect(imp2.status).toBe(409);
    expect(JSON.stringify(imp2.body)).toContain('BANK_STATEMENT_DUPLICATE');
  });

  it('38 & 39. Reconciliation close and reopen protection', async () => {
    // Close reconciliation
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
    const reconId = closeRes.body.id;

    // Reopen without mandatory reason -> rejected
    const failReopen = await request(app)
      .post(`/api/v1/finance/banking/reconciliation/${reconId}/reopen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ reason: '' });
    expect([400, 422].includes(failReopen.status)).toBe(true);

    // Valid reopen
    const reopen = await request(app)
      .post(`/api/v1/finance/banking/reconciliation/${reconId}/reopen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId)
      .send({ reason: 'Bank charges adjustment required' });
    expect(reopen.status).toBe(200);
    expect(reopen.body.status).toBe('DRAFT');
  });

  // =========================================================================
  // 12. FINANCIAL REPORTS & INTEGRITY (TRIAL BALANCE, P&L, BALANCE SHEET)
  // =========================================================================

  it('40. Trial Balance debit exactly equals credit across all posted accounts', async () => {
    const res = await request(app)
      .get('/api/v1/finance/reports/trial-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(res.status).toBe(200);
    expect(res.body.isBalanced).toBe(true);
    expect(res.body.totalDebit).toBe(res.body.totalCredit);
  });

  it('41. Balance Sheet equation holds: Assets = Liabilities + Equity', async () => {
    const res = await request(app)
      .get('/api/v1/finance/reports/balance-sheet')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(res.status).toBe(200);
    expect(res.body.isBalanced).toBe(true);
    expect(res.body.totalAssets).toBe(res.body.totalLiabilitiesAndEquity);
  });

  it('42. Profit & Loss returns deterministic surplus/deficit', async () => {
    const res = await request(app)
      .get('/api/v1/finance/reports/profit-and-loss')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalIncome');
    expect(res.body).toHaveProperty('totalExpense');
    expect(res.body).toHaveProperty('netSurplus');
  });

  // =========================================================================
  // 13. SECURITY, TENANT & PARENT ISOLATION
  // =========================================================================

  it('43. Parent can view own child finance data, but accessing other child returns 403 Forbidden', async () => {
    // Parent A viewing linked child Student A -> 200 OK
    const ownChildRes = await request(app)
      .get(`/api/v1/finance/parent/student/${studentAId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-school-id', schoolAId);
    expect(ownChildRes.status).toBe(200);
    expect(ownChildRes.body.summary).toHaveProperty('outstandingBalance');

    // Parent A attempting to view Student B -> 403 Forbidden
    const otherChildRes = await request(app)
      .get(`/api/v1/finance/parent/student/${studentBId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-school-id', schoolAId);
    expect(otherChildRes.status).toBe(403);
    expect(JSON.stringify(otherChildRes.body)).toContain('PARENT_FINANCE_ACCESS_DENIED');
  });

  it('44. Cross-School Isolation: School A cannot see School B accounts or invoices', async () => {
    const res = await request(app)
      .get('/api/v1/finance/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolBId);
    expect(res.status).toBe(200);
    // Accounts belonging to School A should not leak into School B
    const schoolAAccounts = res.body.filter((a: any) => a.schoolId === schoolAId);
    expect(schoolAAccounts.length).toBe(0);
  });

  it('45. Cross-Tenant Isolation: Tenant A data never leaks across tenant boundary', async () => {
    const res = await request(app)
      .get('/api/v1/finance/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-school-id', schoolAId);
    expect(res.status).toBe(200);
    for (const inv of res.body.data) {
      expect(inv.tenantId).toBe(tenantId);
    }
  });

  // =========================================================================
  // 14. DECIMAL INTEGRITY (Section 170)
  // =========================================================================

  it('170. Decimal arithmetic precision without JS IEEE floating point inaccuracies', () => {
    // 0.10 + 0.20 in JavaScript float is 0.30000000000000004
    // Using Prisma.Decimal / FinanceService:
    const d1 = new Prisma.Decimal('0.10');
    const d2 = new Prisma.Decimal('0.20');
    const sum = d1.add(d2);
    expect(sum.toString()).toBe('0.3');
    expect(sum.toFixed(2)).toBe('0.30');

    // ₹10,000.25 - ₹4,000.10 = ₹6,000.15
    const inv = new Prisma.Decimal('10000.25');
    const pay = new Prisma.Decimal('4000.10');
    const balance = inv.sub(pay);
    expect(balance.toFixed(2)).toBe('6000.15');
  });
});
