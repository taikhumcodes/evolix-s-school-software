import crypto from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';

export class FinanceService {
  /**
   * Safe Decimal helper from string, number, or Decimal
   */
  public static toDecimal(val: string | number | Prisma.Decimal | null | undefined): Prisma.Decimal {
    if (val === null || val === undefined) return new Prisma.Decimal(0);
    return new Prisma.Decimal(val.toString());
  }

  /**
   * Format decimal to standard 2-decimal string for canonical API output
   */
  public static formatMoney(val: string | number | Prisma.Decimal | null | undefined): string {
    return FinanceService.toDecimal(val).toFixed(2);
  }

  /**
   * Idempotency wrapper for high-risk operations
   */
  public static async withIdempotency<T>(
    tenantId: string,
    schoolId: string,
    operation: string,
    idempotencyKey: string | undefined | null,
    payload: any,
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    if (!idempotencyKey) {
      return await prisma.$transaction(async (tx) => {
        return await fn(tx);
      });
    }

    const payloadString = JSON.stringify(payload ?? {});
    const requestHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    // Check existing record
    const existing = await prisma.financialIdempotency.findUnique({
      where: {
        schoolId_key: {
          schoolId,
          key: idempotencyKey,
        },
      },
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictError('IDEMPOTENCY_KEY_REUSED: The same idempotency key was sent with a different payload');
      }
      return JSON.parse(existing.responseBody) as unknown as T;
    }

    // Execute in transaction and record idempotency key
    return await prisma.$transaction(async (tx) => {
      const result = await fn(tx);

      await tx.financialIdempotency.create({
        data: {
          tenantId,
          schoolId,
          key: idempotencyKey,
          operation,
          requestHash,
          responseStatus: 200,
          responseBody: JSON.stringify(result ?? {}),
        },
      });

      return result;
    });
  }

  /**
   * Atomically generate next sequence number for a number series
   */
  public static async getNextNumber(
    tenantId: string,
    schoolId: string,
    code: string,
    fallbackPrefix: string,
    fallbackPadding: number = 6,
    txClient?: Prisma.TransactionClient
  ): Promise<string> {
    const executeLock = async (tx: Prisma.TransactionClient) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; current_value: number; padding: number; prefix: string | null; suffix: string | null }>
      >`
        SELECT id, current_value, padding, prefix, suffix
        FROM number_series
        WHERE tenant_id = ${tenantId}::uuid
          AND (school_id = ${schoolId}::uuid OR school_id IS NULL)
          AND code = ${code}
        ORDER BY school_id NULLS LAST
        LIMIT 1
        FOR UPDATE
      `;

      const now = new Date();
      const fullYear = now.getFullYear().toString();
      const shortYear = fullYear.slice(-2);

      if (!rows || rows.length === 0) {
        const created = await tx.numberSeries.create({
          data: {
            tenantId,
            schoolId,
            code,
            prefix: fallbackPrefix,
            padding: fallbackPadding,
            currentValue: 1,
          },
        });
        let prefix = created.prefix || fallbackPrefix;
        prefix = prefix.replace(/{YYYY}/gi, fullYear).replace(/{YY}/gi, shortYear);
        const padded = String(1).padStart(created.padding || fallbackPadding, '0');
        return `${prefix}${padded}`;
      }

      const row = rows[0];
      const nextVal = row.current_value + 1;

      await tx.$executeRaw`
        UPDATE number_series
        SET current_value = ${nextVal}, updated_at = NOW()
        WHERE id = ${row.id}::uuid
      `;

      let prefix = row.prefix || fallbackPrefix;
      prefix = prefix.replace(/{YYYY}/gi, fullYear).replace(/{YY}/gi, shortYear);
      const padded = String(nextVal).padStart(row.padding || fallbackPadding, '0');
      const suffix = row.suffix ? row.suffix.replace(/{YYYY}/gi, fullYear).replace(/{YY}/gi, shortYear) : '';

      return `${prefix}${padded}${suffix}`;
    };

    if (txClient) {
      return await executeLock(txClient);
    } else {
      return await prisma.$transaction(async (tx) => {
        return await executeLock(tx);
      });
    }
  }

  /**
   * Assert that a transaction's posting date falls within an OPEN accounting period and financial year
   */
  public static async assertOpenPeriod(
    tenantId: string,
    schoolId: string,
    postingDate: Date,
    txClient?: Prisma.TransactionClient
  ): Promise<{ financialYearId: string; accountingPeriodId: string }> {
    const db = txClient || prisma;

    const period = await db.accountingPeriod.findFirst({
      where: {
        tenantId,
        schoolId,
        startDate: { lte: postingDate },
        endDate: { gte: postingDate },
      },
      include: {
        financialYear: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!period) {
      const openFy = await db.financialYear.findFirst({
        where: { tenantId, schoolId, status: 'OPEN' },
        include: { accountingPeriods: { where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      });

      if (!openFy || openFy.accountingPeriods.length === 0) {
        throw new BadRequestError('FINANCIAL_PERIOD_CLOSED: No open accounting period found for posting date');
      }

      return {
        financialYearId: openFy.id,
        accountingPeriodId: openFy.accountingPeriods[0].id,
      };
    }

    if (period.status !== 'OPEN' || period.financialYear.status !== 'OPEN') {
      throw new BadRequestError('FINANCIAL_PERIOD_CLOSED: The accounting period for this date is closed or locked');
    }

    return {
      financialYearId: period.financialYearId,
      accountingPeriodId: period.id,
    };
  }

  public static readonly STANDARD_ACCOUNTS = [
    // ASSET
    { code: '1010', name: 'Cash in Hand', type: 'ASSET', normalBalance: 'DEBIT', isSystem: true, description: 'Primary cash on hand account' },
    { code: '1020', name: 'State Bank of India (Main)', type: 'ASSET', normalBalance: 'DEBIT', isSystem: true, description: 'Main operating bank account' },
    { code: '1100', name: 'Student Fee Receivable', type: 'ASSET', normalBalance: 'DEBIT', isSystem: true, description: 'Total outstanding student dues' },
    // LIABILITY
    { code: '2010', name: 'Student Advance / Unapplied Credit', type: 'LIABILITY', normalBalance: 'CREDIT', isSystem: true, description: 'Prepayments and unapplied student fee credits' },
    { code: '2100', name: 'Vendor Accounts Payable', type: 'LIABILITY', normalBalance: 'CREDIT', isSystem: true, description: 'Outstanding payables to vendors' },
    // EQUITY
    { code: '3000', name: 'Opening Balance Equity', type: 'EQUITY', normalBalance: 'CREDIT', isSystem: true, description: 'Offset account for opening balance setup' },
    { code: '3100', name: 'General Fund / Retained Surplus', type: 'EQUITY', normalBalance: 'CREDIT', isSystem: true, description: 'Accumulated surplus and school funds' },
    // INCOME
    { code: '4010', name: 'Tuition Fee Income', type: 'INCOME', normalBalance: 'CREDIT', isSystem: true, description: 'Revenue from tuition fees' },
    { code: '4020', name: 'Admission Fee Income', type: 'INCOME', normalBalance: 'CREDIT', isSystem: true, description: 'Revenue from admission registration fees' },
    { code: '4030', name: 'Transport Fee Income', type: 'INCOME', normalBalance: 'CREDIT', isSystem: true, description: 'Revenue from bus and van transport fees' },
    { code: '4040', name: 'Examination Fee Income', type: 'INCOME', normalBalance: 'CREDIT', isSystem: true, description: 'Revenue from student exam assessments' },
    { code: '4100', name: 'Other Fee Income', type: 'INCOME', normalBalance: 'CREDIT', isSystem: true, description: 'Miscellaneous student fees' },
    // EXPENSE
    { code: '5010', name: 'Electricity & Utilities Expense', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'Power, water, and utility bills' },
    { code: '5020', name: 'Maintenance & Repairs Expense', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'Building and campus maintenance' },
    { code: '5030', name: 'Stationery & Printing Expense', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'Paper, books, exam stationery printing' },
    { code: '5100', name: 'Fee Concessions & Scholarships', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'Scholarships, sibling, and management discounts' },
    { code: '5200', name: 'Bad Debts / Write-Off Expense', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'Uncollectible dues write-off' },
    { code: '5300', name: 'General Administration Expense', type: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, description: 'General operational overheads' },
  ];

  /**
   * Ensures the standard chart of accounts exists for a school
   */
  public static async ensureStandardAccounts(
    tenantId: string,
    schoolId: string,
    txClient?: Prisma.TransactionClient
  ): Promise<any[]> {
    const db = txClient || prisma;
    const existingAccounts = await db.account.findMany({
      where: { schoolId },
      select: { code: true },
    });
    const existingCodes = new Set(existingAccounts.map((a) => a.code));

    const toCreate = FinanceService.STANDARD_ACCOUNTS.filter((acc) => !existingCodes.has(acc.code));
    if (toCreate.length > 0) {
      for (const acc of toCreate) {
        await db.account.create({
          data: {
            tenantId,
            schoolId,
            code: acc.code,
            name: acc.name,
            type: acc.type as any,
            normalBalance: acc.normalBalance as any,
            isSystemAccount: acc.isSystem,
            description: acc.description,
            isActive: true,
          },
        });
      }
    }

    // Link unlinked fee heads to default income account
    const tuitionAcc = await db.account.findFirst({ where: { schoolId, code: '4010' } });
    if (tuitionAcc) {
      await db.feeHead.updateMany({
        where: { schoolId, accountId: null },
        data: { accountId: tuitionAcc.id },
      });
    }

    return await db.account.findMany({ where: { schoolId }, orderBy: { code: 'asc' } });
  }

  /**
   * Resolves a system account by code or systemMapping fallback
   */
  public static async getSystemAccount(
    tenantId: string,
    schoolId: string,
    code: string,
    txClient?: Prisma.TransactionClient
  ): Promise<any> {
    const db = txClient || prisma;
    let account = await db.account.findFirst({
      where: {
        schoolId,
        code,
        isActive: true,
      },
    });

    if (!account) {
      await FinanceService.ensureStandardAccounts(tenantId, schoolId, txClient);
      account = await db.account.findFirst({
        where: {
          schoolId,
          code,
          isActive: true,
        },
      });
    }

    if (!account) {
      throw new NotFoundError(`SYSTEM_ACCOUNT_MISSING: System account with code ${code} was not found`);
    }

    return account;
  }

  // =========================================================================
  // AUTHORITATIVE DOUBLE-ENTRY JOURNAL POSTING SERVICE
  // =========================================================================

  /**
   * Post a balanced journal entry atomically
   */
  public static async postJournalEntry(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      schoolId: string;
      postingDate: Date;
      description: string;
      sourceType: string;
      sourceId?: string | null;
      lines: Array<{
        accountId: string;
        description?: string | null;
        debit: Prisma.Decimal | number | string;
        credit: Prisma.Decimal | number | string;
        studentId?: string | null;
        vendorId?: string | null;
        employeeId?: string | null;
      }>;
      actorUserId?: string | null;
    }
  ): Promise<any> {
    const { tenantId, schoolId, postingDate, description, sourceType, sourceId, lines, actorUserId } = params;

    if (!lines || lines.length < 2) {
      throw new BadRequestError('JOURNAL_INVALID: A journal entry must contain at least 2 lines');
    }

    const { financialYearId, accountingPeriodId } = await FinanceService.assertOpenPeriod(
      tenantId,
      schoolId,
      postingDate,
      tx
    );

    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    const validatedLines = lines.map((line) => {
      const debit = FinanceService.toDecimal(line.debit);
      const credit = FinanceService.toDecimal(line.credit);

      if (debit.isNegative() || credit.isNegative()) {
        throw new BadRequestError('JOURNAL_INVALID: Debits and credits cannot be negative');
      }
      if (debit.greaterThan(0) && credit.greaterThan(0)) {
        throw new BadRequestError('JOURNAL_INVALID: A single line cannot have both debit and credit amounts');
      }
      if (debit.isZero() && credit.isZero()) {
        throw new BadRequestError('JOURNAL_INVALID: Journal line amount cannot be zero');
      }

      totalDebit = totalDebit.add(debit);
      totalCredit = totalCredit.add(credit);

      return {
        ...line,
        debit,
        credit,
      };
    });

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestError(
        `JOURNAL_NOT_BALANCED: Total debit (${totalDebit.toFixed(2)}) does not equal total credit (${totalCredit.toFixed(2)})`
      );
    }

    const journalNumber = await FinanceService.getNextNumber(
      tenantId,
      schoolId,
      'JOURNAL',
      'JRN-{YYYY}-',
      6,
      tx
    );

    const entry = await tx.journalEntry.create({
      data: {
        tenantId,
        schoolId,
        financialYearId,
        accountingPeriodId,
        journalNumber,
        postingDate,
        description,
        sourceType,
        sourceId: sourceId || null,
        status: 'POSTED',
        totalDebit,
        totalCredit,
        postedAt: new Date(),
        postedByUserId: actorUserId || '00000000-0000-0000-0000-000000000004',
        lines: {
          create: validatedLines.map((line) => ({
            accountId: line.accountId,
            description: line.description || description,
            debit: line.debit,
            credit: line.credit,
            studentId: line.studentId || null,
            vendorId: line.vendorId || null,
            employeeId: line.employeeId || null,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    return entry;
  }

  /**
   * Reverse a posted journal entry
   */
  public static async reverseJournalEntry(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      schoolId: string;
      journalEntryId: string;
      reason: string;
      actorUserId?: string | null;
      reversalPostingDate?: Date;
    }
  ): Promise<any> {
    const { tenantId, schoolId, journalEntryId, reason, actorUserId, reversalPostingDate } = params;

    const original = await tx.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { lines: true },
    });

    if (!original || original.schoolId !== schoolId) {
      throw new NotFoundError('Journal entry not found');
    }
    if (original.status !== 'POSTED') {
      throw new BadRequestError(`Cannot reverse journal entry with status: ${original.status}`);
    }

    const postDate = reversalPostingDate || new Date();
    const { financialYearId, accountingPeriodId } = await FinanceService.assertOpenPeriod(
      tenantId,
      schoolId,
      postDate,
      tx
    );

    const reversalNumber = await FinanceService.getNextNumber(
      tenantId,
      schoolId,
      'JOURNAL',
      'JRN-{YYYY}-',
      6,
      tx
    );

    const reversalEntry = await tx.journalEntry.create({
      data: {
        tenantId,
        schoolId,
        financialYearId,
        accountingPeriodId,
        journalNumber: reversalNumber,
        postingDate: postDate,
        description: `Reversal of ${original.journalNumber}: ${reason}`,
        sourceType: 'REVERSAL',
        sourceId: original.id,
        status: 'POSTED',
        totalDebit: original.totalCredit,
        totalCredit: original.totalDebit,
        postedAt: new Date(),
        postedByUserId: actorUserId || '00000000-0000-0000-0000-000000000004',
        reversalOfId: original.id,
        reversalReason: reason,
        lines: {
          create: original.lines.map((l) => ({
            accountId: l.accountId,
            description: `Reversal: ${l.description}`,
            debit: l.credit,
            credit: l.debit,
            studentId: l.studentId,
            vendorId: l.vendorId,
          })),
        },
      },
      include: { lines: true },
    });

    await tx.journalEntry.update({
      where: { id: original.id },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedByUserId: actorUserId || '00000000-0000-0000-0000-000000000004',
        reversalReason: reason,
      },
    });

    return reversalEntry;
  }

  // =========================================================================
  // FEE INVOICES & GENERATION
  // =========================================================================

  /**
   * Create and post fee invoice atomically with double-entry GL journal
   */
  public static async createFeeInvoice(
    tenantId: string,
    schoolId: string,
    data: {
      studentId: string;
      academicYearId: string;
      financialYearId?: string;
      invoiceDate: Date;
      dueDate: Date;
      lines: Array<{
        feeHeadId: string;
        description: string;
        rate: number | string | Prisma.Decimal;
        quantity?: number;
        concession?: number | string | Prisma.Decimal;
      }>;
      installmentName?: string | null;
      generationSourceKey?: string | null;
      actorUserId?: string | null;
    },
    txClient?: Prisma.TransactionClient
  ): Promise<any> {
    const execute = async (tx: Prisma.TransactionClient) => {
      const student = await tx.student.findUnique({
        where: { id: data.studentId },
      });
      if (!student || student.schoolId !== schoolId) {
        throw new NotFoundError('Student not found in this school');
      }

      if (data.generationSourceKey) {
        const existingInvoice = await tx.feeInvoice.findFirst({
          where: {
            schoolId,
            generationSourceKey: data.generationSourceKey,
          },
          include: { lines: true },
        });
        if (existingInvoice) {
          return existingInvoice;
        }
      }

      const invoiceNumber = await FinanceService.getNextNumber(
        tenantId,
        schoolId,
        'INVOICE',
        'INV-{YYYY}-',
        6,
        tx
      );

      let subtotal = new Prisma.Decimal(0);
      let totalConcession = new Prisma.Decimal(0);

      const invoiceLines = data.lines.map((item) => {
        const rate = FinanceService.toDecimal(item.rate);
        const qty = item.quantity || 1;
        const lineGross = rate.mul(qty);
        const lineConcession = FinanceService.toDecimal(item.concession || 0);
        const netAmount = lineGross.sub(lineConcession);

        if (netAmount.isNegative()) {
          throw new BadRequestError('Line concession cannot exceed gross line amount');
        }

        subtotal = subtotal.add(lineGross);
        totalConcession = totalConcession.add(lineConcession);

        return {
          feeHeadId: item.feeHeadId,
          description: item.description,
          quantity: qty,
          rate,
          amount: lineGross,
          concessionAmount: lineConcession,
          netAmount,
        };
      });

      const totalAmount = subtotal.sub(totalConcession);
      const outstandingAmount = totalAmount;

      // Find active Financial Year if not provided
      let fyId = data.financialYearId;
      if (!fyId) {
        const periodInfo = await FinanceService.assertOpenPeriod(tenantId, schoolId, data.invoiceDate, tx);
        fyId = periodInfo.financialYearId;
      }

      const invoice = await tx.feeInvoice.create({
        data: {
          tenantId,
          schoolId,
          academicYearId: data.academicYearId,
          financialYearId: fyId,
          studentId: data.studentId,
          invoiceNumber,
          generationSourceKey: data.generationSourceKey || null,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          subtotal,
          concessionTotal: totalConcession,
          lateFeeAmount: new Prisma.Decimal(0),
          totalAmount,
          paidAmount: new Prisma.Decimal(0),
          outstandingAmount,
          status: 'POSTED',
          lines: {
            create: invoiceLines,
          },
        },
        include: {
          lines: {
            include: { feeHead: true },
          },
          student: true,
        },
      });

      // Post GL Journal Entry
      const receivableAccount = await FinanceService.getSystemAccount(tenantId, schoolId, '1100', tx);
      const concessionAccount = totalConcession.greaterThan(0)
        ? await FinanceService.getSystemAccount(tenantId, schoolId, '5100', tx)
        : null;

      const journalLines: Array<any> = [
        {
          accountId: receivableAccount.id,
          description: `Fee receivable for ${invoice.invoiceNumber} (${student.firstName} ${student.lastName})`,
          debit: totalAmount,
          credit: new Prisma.Decimal(0),
          studentId: student.id,
        },
      ];

      if (concessionAccount && totalConcession.greaterThan(0)) {
        journalLines.push({
          accountId: concessionAccount.id,
          description: `Concession discount for ${invoice.invoiceNumber}`,
          debit: totalConcession,
          credit: new Prisma.Decimal(0),
          studentId: student.id,
        });
      }

      for (const line of invoice.lines) {
        let incomeAccountId = line.feeHead?.accountId;
        if (!incomeAccountId) {
          const defaultIncome = await FinanceService.getSystemAccount(tenantId, schoolId, '4010', tx);
          incomeAccountId = defaultIncome.id;
        }

        journalLines.push({
          accountId: incomeAccountId,
          description: `${line.description} (${invoice.invoiceNumber})`,
          debit: new Prisma.Decimal(0),
          credit: line.amount,
          studentId: student.id,
        });
      }

      const journal = await FinanceService.postJournalEntry(tx, {
        tenantId,
        schoolId,
        postingDate: data.invoiceDate,
        description: `Fee Invoice ${invoice.invoiceNumber} - ${student.firstName} ${student.lastName}`,
        sourceType: 'FEE_INVOICE',
        sourceId: invoice.id,
        lines: journalLines,
        actorUserId: data.actorUserId,
      });

      const updatedInvoice = await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: { journalEntryId: journal.id },
        include: {
          lines: { include: { feeHead: true } },
          student: true,
          journalEntry: true,
        },
      });

      return updatedInvoice;
    };

    if (txClient) {
      return await execute(txClient);
    } else {
      return await prisma.$transaction(async (tx) => {
        return await execute(tx);
      });
    }
  }

  /**
   * Batch generate invoices for students of a class/section with idempotency
   */
  public static async batchGenerateInvoices(
    tenantId: string,
    schoolId: string,
    params: {
      academicYearId: string;
      financialYearId?: string;
      classId: string;
      sectionId?: string | null;
      installmentName: string;
      invoiceDate: Date;
      dueDate: Date;
      actorUserId?: string | null;
    }
  ): Promise<{ generatedCount: number; skippedCount: number; invoices: any[] }> {
    return await prisma.$transaction(async (tx) => {
      const enrollments = await tx.studentEnrollment.findMany({
        where: {
          schoolId,
          academicYearId: params.academicYearId,
          classId: params.classId,
          ...(params.sectionId ? { sectionId: params.sectionId } : {}),
          status: 'ACTIVE',
        },
        include: {
          student: true,
        },
      });

      const assignments = await tx.studentFeeAssignment.findMany({
        where: {
          schoolId,
          academicYearId: params.academicYearId,
          studentId: { in: enrollments.map((e) => e.studentId) },
        },
        include: {
          feeStructure: {
            include: {
              items: { include: { feeHead: true } },
              installments: true,
            },
          },
        },
      });

      const classStructure = await tx.feeStructure.findFirst({
        where: {
          schoolId,
          academicYearId: params.academicYearId,
          classId: params.classId,
          status: 'ACTIVE',
        },
        include: {
          items: { include: { feeHead: true } },
          installments: true,
        },
      });

      const generated: any[] = [];
      let skippedCount = 0;

      for (const enr of enrollments) {
        const studentId = enr.studentId;
        const assignment = assignments.find((a) => a.studentId === studentId);
        const structure = assignment?.feeStructure || classStructure;

        if (!structure || structure.items.length === 0) {
          skippedCount++;
          continue;
        }

        const sourceKey = `BATCH_${params.academicYearId}_${studentId}_${params.installmentName}`;

        const existing = await tx.feeInvoice.findFirst({
          where: { schoolId, generationSourceKey: sourceKey },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        const invoiceLines = structure.items.map((item) => ({
          feeHeadId: item.feeHeadId,
          description: item.feeHead.name,
          rate: item.amount,
          quantity: 1,
          concession: 0,
        }));

        const invoice = await FinanceService.createFeeInvoice(
          tenantId,
          schoolId,
          {
            studentId,
            academicYearId: params.academicYearId,
            financialYearId: params.financialYearId,
            invoiceDate: params.invoiceDate,
            dueDate: params.dueDate,
            installmentName: params.installmentName,
            generationSourceKey: sourceKey,
            lines: invoiceLines,
            actorUserId: params.actorUserId,
          },
          tx
        );

        generated.push(invoice);
      }

      return {
        generatedCount: generated.length,
        skippedCount,
        invoices: generated,
      };
    });
  }

  // =========================================================================
  // FEE COLLECTIONS, ALLOCATIONS & RECEIPTS
  // =========================================================================

  /**
   * Cashier collects student payment, allocates across open invoices,
   * handles advances, and posts GL journal atomically.
   */
  public static async collectFeePayment(
    tenantId: string,
    schoolId: string,
    params: {
      studentId: string;
      receivingAccountId: string;
      paymentDate: Date;
      paymentMethod: any;
      totalAmount: number | string | Prisma.Decimal;
      referenceNumber?: string | null;
      chequeNumber?: string | null;
      chequeDate?: Date | null;
      chequeBankName?: string | null;
      remarks?: string | null;
      allocations?: Array<{ invoiceId: string; allocatedAmount: number | string | Prisma.Decimal }>;
      actorUserId?: string | null;
      idempotencyKey?: string | null;
    }
  ): Promise<any> {
    return await FinanceService.withIdempotency(
      tenantId,
      schoolId,
      'COLLECT_FEE_PAYMENT',
      params.idempotencyKey,
      params,
      async (tx) => {
        const totalPayment = FinanceService.toDecimal(params.totalAmount);
        if (totalPayment.lessThanOrEqualTo(0)) {
          throw new BadRequestError('Payment amount must be greater than zero');
        }

        const receivingAccount = await tx.account.findUnique({
          where: { id: params.receivingAccountId },
        });
        if (!receivingAccount || receivingAccount.schoolId !== schoolId || !receivingAccount.isActive) {
          throw new BadRequestError('ACCOUNT_INACTIVE: Invalid or inactive receiving cash/bank account');
        }

        const student = await tx.student.findUnique({ where: { id: params.studentId } });
        if (!student || student.schoolId !== schoolId) {
          throw new NotFoundError('Student not found');
        }

        let targetInvoices: any[] = [];
        if (params.allocations && params.allocations.length > 0) {
          const invIds = params.allocations.map((a) => a.invoiceId);
          targetInvoices = await tx.$queryRaw<Array<any>>`
            SELECT id, invoice_number, outstanding_amount, paid_amount, total_amount, status
            FROM fee_invoices
            WHERE tenant_id = ${tenantId}::uuid
              AND school_id = ${schoolId}::uuid
              AND id = ANY(${invIds}::uuid[])
            FOR UPDATE
          `;
        } else {
          targetInvoices = await tx.$queryRaw<Array<any>>`
            SELECT id, invoice_number, outstanding_amount, paid_amount, total_amount, status
            FROM fee_invoices
            WHERE tenant_id = ${tenantId}::uuid
              AND school_id = ${schoolId}::uuid
              AND student_id = ${params.studentId}::uuid
              AND status IN ('POSTED', 'PARTIALLY_PAID')
              AND outstanding_amount > 0
            ORDER BY due_date ASC, created_at ASC
            FOR UPDATE
          `;
        }

        let remainingToAllocate = totalPayment;
        let totalAllocated = new Prisma.Decimal(0);
        const finalAllocations: Array<{ invoiceId: string; amount: Prisma.Decimal }> = [];

        if (params.allocations && params.allocations.length > 0) {
          for (const allocReq of params.allocations) {
            const inv = targetInvoices.find((i) => i.id === allocReq.invoiceId);
            if (!inv) {
              throw new NotFoundError(`Invoice ${allocReq.invoiceId} not found or not open for payment`);
            }
            const allocAmt = FinanceService.toDecimal(allocReq.allocatedAmount);
            const outstanding = FinanceService.toDecimal(inv.outstanding_amount);

            if (allocAmt.greaterThan(outstanding)) {
              throw new BadRequestError(
                `PAYMENT_EXCEEDS_OUTSTANDING: Allocation amount (${allocAmt.toFixed(2)}) exceeds invoice outstanding (${outstanding.toFixed(2)})`
              );
            }
            if (allocAmt.greaterThan(remainingToAllocate)) {
              throw new BadRequestError('PAYMENT_ALLOCATION_INVALID: Total allocations exceed payment amount');
            }

            remainingToAllocate = remainingToAllocate.sub(allocAmt);
            totalAllocated = totalAllocated.add(allocAmt);
            finalAllocations.push({ invoiceId: inv.id, amount: allocAmt });
          }
        } else {
          for (const inv of targetInvoices) {
            if (remainingToAllocate.isZero()) break;
            const outstanding = FinanceService.toDecimal(inv.outstanding_amount);
            const allocateThis = remainingToAllocate.greaterThan(outstanding) ? outstanding : remainingToAllocate;

            remainingToAllocate = remainingToAllocate.sub(allocateThis);
            totalAllocated = totalAllocated.add(allocateThis);
            finalAllocations.push({ invoiceId: inv.id, amount: allocateThis });
          }
        }

        for (const alloc of finalAllocations) {
          const inv = targetInvoices.find((i) => i.id === alloc.invoiceId)!;
          const currentPaid = FinanceService.toDecimal(inv.paid_amount);
          const currentOutstanding = FinanceService.toDecimal(inv.outstanding_amount);

          const newPaid = currentPaid.add(alloc.amount);
          const newOutstanding = currentOutstanding.sub(alloc.amount);
          const newStatus = newOutstanding.isZero() ? 'PAID' : 'PARTIALLY_PAID';

          await tx.feeInvoice.update({
            where: { id: alloc.invoiceId },
            data: {
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              status: newStatus,
            },
          });
        }

        const advanceAmount = remainingToAllocate;

        const receiptNumber = await FinanceService.getNextNumber(
          tenantId,
          schoolId,
          'RECEIPT',
          'RCPT-{YYYY}-',
          6,
          tx
        );

        const periodInfo = await FinanceService.assertOpenPeriod(tenantId, schoolId, params.paymentDate, tx);

        const feePayment = await tx.feePayment.create({
          data: {
            tenantId,
            schoolId,
            studentId: params.studentId,
            financialYearId: periodInfo.financialYearId,
            receivingAccountId: params.receivingAccountId,
            receiptNumber,
            paymentDate: params.paymentDate,
            paymentMethod: params.paymentMethod,
            totalAmount: totalPayment,
            allocatedAmount: totalAllocated,
            advanceAmount,
            transactionReference: params.referenceNumber || null,
            chequeNumber: params.chequeNumber || null,
            chequeDate: params.chequeDate || null,
            bankName: params.chequeBankName || null,
            chequeClearanceStatus: params.paymentMethod === 'CHEQUE' ? 'PENDING' : null,
            remarks: params.remarks || null,
            status: 'POSTED',
            receivedByUserId: params.actorUserId || '00000000-0000-0000-0000-000000000004',
            allocations: {
              create: finalAllocations.map((a) => ({
                feeInvoiceId: a.invoiceId,
                allocatedAmount: a.amount,
              })),
            },
            receipt: {
              create: {
                tenantId,
                schoolId,
                receiptNumber,
                receiptDate: params.paymentDate,
                studentSnapshot: {
                  studentId: student.id,
                  name: `${student.firstName} ${student.lastName}`,
                  admissionNumber: student.admissionNumber,
                },
                breakdownSnapshot: {
                  totalAmount: totalPayment.toFixed(2),
                  allocatedAmount: totalAllocated.toFixed(2),
                  advanceAmount: advanceAmount.toFixed(2),
                  paymentMethod: params.paymentMethod,
                },
              },
            },
          },
          include: {
            receipt: true,
            allocations: {
              include: { feeInvoice: true },
            },
            student: true,
          },
        });

        if (advanceAmount.greaterThan(0)) {
          await tx.studentAdvance.create({
            data: {
              tenantId,
              schoolId,
              studentId: params.studentId,
              sourcePaymentId: feePayment.id,
              totalCredit: advanceAmount,
              utilizedCredit: new Prisma.Decimal(0),
              balanceCredit: advanceAmount,
              status: 'ACTIVE',
            },
          });
        }

        // GL Posting
        const receivableAccount = await FinanceService.getSystemAccount(tenantId, schoolId, '1100', tx);
        const journalLines: Array<any> = [
          {
            accountId: receivingAccount.id,
            description: `Payment received ${receiptNumber} (${student.firstName} ${student.lastName})`,
            debit: totalPayment,
            credit: new Prisma.Decimal(0),
            studentId: params.studentId,
          },
        ];

        if (totalAllocated.greaterThan(0)) {
          journalLines.push({
            accountId: receivableAccount.id,
            description: `Fee receivable cleared via ${receiptNumber}`,
            debit: new Prisma.Decimal(0),
            credit: totalAllocated,
            studentId: params.studentId,
          });
        }

        if (advanceAmount.greaterThan(0)) {
          const advanceLiability = await FinanceService.getSystemAccount(tenantId, schoolId, '2010', tx);
          journalLines.push({
            accountId: advanceLiability.id,
            description: `Student unapplied advance credit via ${receiptNumber}`,
            debit: new Prisma.Decimal(0),
            credit: advanceAmount,
            studentId: params.studentId,
          });
        }

        const journal = await FinanceService.postJournalEntry(tx, {
          tenantId,
          schoolId,
          postingDate: params.paymentDate,
          description: `Fee Receipt ${receiptNumber} - ${student.firstName} ${student.lastName}`,
          sourceType: 'FEE_RECEIPT',
          sourceId: feePayment.id,
          lines: journalLines,
          actorUserId: params.actorUserId,
        });

        const updatedPayment = await tx.feePayment.update({
          where: { id: feePayment.id },
          data: { journalEntryId: journal.id },
          include: { receipt: true, allocations: true, advances: true },
        });

        return updatedPayment;
      }
    );
  }

  /**
   * Reverse a fee receipt / cheque bounce
   */
  public static async reverseFeeReceipt(
    tenantId: string,
    schoolId: string,
    params: {
      receiptId: string;
      reason: string;
      isBouncedCheque?: boolean;
      actorUserId?: string | null;
    }
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const receipt = await tx.feeReceipt.findUnique({
        where: { id: params.receiptId },
        include: {
          feePayment: {
            include: {
              allocations: { include: { feeInvoice: true } },
              advances: true,
            },
          },
        },
      });

      if (!receipt || receipt.schoolId !== schoolId) {
        throw new NotFoundError('Receipt not found');
      }
      if (receipt.isCancelled) {
        throw new BadRequestError('RECEIPT_ALREADY_REVERSED: Receipt is already reversed or cancelled');
      }

      const payment = receipt.feePayment;

      // Restore invoice balances
      for (const alloc of payment.allocations) {
        const inv = await tx.feeInvoice.findUnique({ where: { id: alloc.feeInvoiceId } });
        if (inv) {
          const newPaid = FinanceService.toDecimal(inv.paidAmount).sub(alloc.allocatedAmount);
          const newOutstanding = FinanceService.toDecimal(inv.outstandingAmount).add(alloc.allocatedAmount);
          const newStatus = newPaid.isZero() ? 'POSTED' : 'PARTIALLY_PAID';

          await tx.feeInvoice.update({
            where: { id: inv.id },
            data: {
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              status: newStatus,
            },
          });
        }
      }

      // Reverse advance credit
      await tx.studentAdvance.updateMany({
        where: { sourcePaymentId: payment.id },
        data: { status: 'REFUNDED', balanceCredit: new Prisma.Decimal(0) },
      });

      // Reverse Journal Entry
      if (payment.journalEntryId) {
        const reversalJournal = await FinanceService.reverseJournalEntry(tx, {
          tenantId,
          schoolId,
          journalEntryId: payment.journalEntryId,
          reason: params.isBouncedCheque
            ? `Cheque Bounced: ${params.reason}`
            : `Receipt Reversal: ${params.reason}`,
          actorUserId: params.actorUserId,
        });

        await tx.feePayment.update({
          where: { id: payment.id },
          data: { reversalJournalEntryId: reversalJournal.id },
        });
      }

      const updatedReceipt = await tx.feeReceipt.update({
        where: { id: receipt.id },
        data: {
          isCancelled: true,
          cancellationReason: params.reason,
          cancelledAt: new Date(),
          cancelledByUserId: params.actorUserId || null,
        },
      });

      await tx.feePayment.update({
        where: { id: payment.id },
        data: {
          status: params.isBouncedCheque ? 'BOUNCED' : 'REVERSED',
          chequeClearanceStatus: params.isBouncedCheque ? 'BOUNCED' : payment.chequeClearanceStatus,
          chequeBouncedAt: params.isBouncedCheque ? new Date() : null,
          chequeBounceReason: params.isBouncedCheque ? params.reason : null,
          reversedAt: new Date(),
          reversedByUserId: params.actorUserId || null,
          reversalReason: params.reason,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: params.actorUserId || null,
          action: params.isBouncedCheque ? 'CHEQUE_BOUNCED' : 'RECEIPT_REVERSED',
          entityType: 'FeeReceipt',
          entityId: receipt.id,
          metadataInfo: JSON.stringify({ reason: params.reason, receiptNumber: receipt.receiptNumber }),
        },
      });

      return updatedReceipt;
    });
  }

  // =========================================================================
  // CREDIT NOTES & WRITE-OFFS
  // =========================================================================

  public static async createCreditNote(
    tenantId: string,
    schoolId: string,
    params: {
      invoiceId: string;
      amount: number | string | Prisma.Decimal;
      reason: string;
      actorUserId?: string | null;
    }
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const inv = await tx.feeInvoice.findUnique({
        where: { id: params.invoiceId },
        include: { student: true },
      });

      if (!inv || inv.schoolId !== schoolId) {
        throw new NotFoundError('Invoice not found');
      }

      const creditAmt = FinanceService.toDecimal(params.amount);
      const currentOutstanding = FinanceService.toDecimal(inv.outstandingAmount);

      if (creditAmt.greaterThan(currentOutstanding)) {
        throw new BadRequestError(
          `CREDIT_NOTE_EXCEEDS_BALANCE: Credit note amount (${creditAmt.toFixed(2)}) exceeds invoice outstanding (${currentOutstanding.toFixed(2)})`
        );
      }

      const creditNoteNumber = await FinanceService.getNextNumber(
        tenantId,
        schoolId,
        'CREDIT_NOTE',
        'CN-{YYYY}-',
        5,
        tx
      );

      const creditNote = await tx.creditNote.create({
        data: {
          tenantId,
          schoolId,
          studentId: inv.studentId,
          feeInvoiceId: inv.id,
          creditNoteNumber,
          creditDate: new Date(),
          amount: creditAmt,
          reason: params.reason,
          status: 'POSTED',
          createdByUserId: params.actorUserId || '00000000-0000-0000-0000-000000000004',
        },
      });

      const newOutstanding = currentOutstanding.sub(creditAmt);
      const newStatus = newOutstanding.isZero() ? 'PAID' : inv.status;
      await tx.feeInvoice.update({
        where: { id: inv.id },
        data: {
          outstandingAmount: newOutstanding,
          status: newStatus,
        },
      });

      const receivableAccount = await FinanceService.getSystemAccount(tenantId, schoolId, '1100', tx);
      const concessionAccount = await FinanceService.getSystemAccount(tenantId, schoolId, '5100', tx);

      const journal = await FinanceService.postJournalEntry(tx, {
        tenantId,
        schoolId,
        postingDate: new Date(),
        description: `Credit Note ${creditNoteNumber} for Invoice ${inv.invoiceNumber}`,
        sourceType: 'CREDIT_NOTE',
        sourceId: creditNote.id,
        lines: [
          {
            accountId: concessionAccount.id,
            description: `Credit note allowance: ${params.reason}`,
            debit: creditAmt,
            credit: new Prisma.Decimal(0),
            studentId: inv.studentId,
          },
          {
            accountId: receivableAccount.id,
            description: `Receivable reduction via ${creditNoteNumber}`,
            debit: new Prisma.Decimal(0),
            credit: creditAmt,
            studentId: inv.studentId,
          },
        ],
        actorUserId: params.actorUserId,
      });

      const updatedCreditNote = await tx.creditNote.update({
        where: { id: creditNote.id },
        data: { journalEntryId: journal.id },
      });

      return updatedCreditNote;
    });
  }

  public static async writeOffInvoice(
    tenantId: string,
    schoolId: string,
    params: {
      invoiceId: string;
      amount: number | string | Prisma.Decimal;
      reason: string;
      actorUserId?: string | null;
    }
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const inv = await tx.feeInvoice.findUnique({
        where: { id: params.invoiceId },
        include: { student: true },
      });

      if (!inv || inv.schoolId !== schoolId) {
        throw new NotFoundError('Invoice not found');
      }

      const writeOffAmt = FinanceService.toDecimal(params.amount);
      const currentOutstanding = FinanceService.toDecimal(inv.outstandingAmount);

      if (writeOffAmt.greaterThan(currentOutstanding)) {
        throw new BadRequestError('WRITE_OFF_EXCEEDS_BALANCE: Write-off amount exceeds invoice outstanding');
      }

      const newOutstanding = currentOutstanding.sub(writeOffAmt);
      await tx.feeInvoice.update({
        where: { id: inv.id },
        data: {
          outstandingAmount: newOutstanding,
          status: newOutstanding.isZero() ? 'PAID' : inv.status,
        },
      });

      const receivableAccount = await FinanceService.getSystemAccount(tenantId, schoolId, '1100', tx);
      const badDebtAccount = await FinanceService.getSystemAccount(tenantId, schoolId, '5200', tx);

      const journal = await FinanceService.postJournalEntry(tx, {
        tenantId,
        schoolId,
        postingDate: new Date(),
        description: `Bad Debt Write-off for Invoice ${inv.invoiceNumber}: ${params.reason}`,
        sourceType: 'WRITE_OFF',
        sourceId: inv.id,
        lines: [
          {
            accountId: badDebtAccount.id,
            description: `Write-off expense: ${params.reason}`,
            debit: writeOffAmt,
            credit: new Prisma.Decimal(0),
            studentId: inv.studentId,
          },
          {
            accountId: receivableAccount.id,
            description: `Receivable written off for ${inv.invoiceNumber}`,
            debit: new Prisma.Decimal(0),
            credit: writeOffAmt,
            studentId: inv.studentId,
          },
        ],
        actorUserId: params.actorUserId,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: params.actorUserId || null,
          action: 'INVOICE_WRITE_OFF',
          entityType: 'FeeInvoice',
          entityId: inv.id,
          metadataInfo: JSON.stringify({ amount: writeOffAmt.toFixed(2), reason: params.reason }),
        },
      });

      return {
        success: true,
        journalEntryId: journal.id,
        writtenOffAmount: writeOffAmt.toFixed(2),
        newOutstanding: newOutstanding.toFixed(2),
      };
    });
  }

  // =========================================================================
  // REFUNDS
  // =========================================================================

  public static async createFeeRefund(
    tenantId: string,
    schoolId: string,
    params: {
      studentId: string;
      disbursingAccountId: string;
      feePaymentId?: string | null;
      amount: number | string | Prisma.Decimal;
      refundMethod: any;
      reason: string;
      actorUserId?: string | null;
    }
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: params.studentId } });
      if (!student || student.schoolId !== schoolId) {
        throw new NotFoundError('Student not found');
      }

      const refundAmt = FinanceService.toDecimal(params.amount);
      if (refundAmt.lessThanOrEqualTo(0)) {
        throw new BadRequestError('Refund amount must be greater than zero');
      }

      const disbursingAccount = await tx.account.findUnique({
        where: { id: params.disbursingAccountId },
      });
      if (!disbursingAccount || disbursingAccount.schoolId !== schoolId || !disbursingAccount.isActive) {
        throw new BadRequestError('ACCOUNT_INACTIVE: Disbursing bank/cash account is invalid or inactive');
      }

      if (params.feePaymentId) {
        const payment = await tx.feePayment.findUnique({
          where: { id: params.feePaymentId },
        });
        if (!payment || payment.schoolId !== schoolId) {
          throw new NotFoundError('Fee payment not found');
        }
        const priorRefunds = await tx.feeRefund.findMany({
          where: { feePaymentId: params.feePaymentId, status: { in: ['PROCESSED', 'APPROVED'] } },
        });
        const priorRefundedAmt = priorRefunds.reduce(
          (sum, r) => sum.plus(r.amount),
          new Prisma.Decimal(0)
        );
        const availableToRefund = new Prisma.Decimal(payment.totalAmount).minus(priorRefundedAmt);
        if (refundAmt.greaterThan(availableToRefund)) {
          throw new BadRequestError(
            `REFUND_EXCEEDS_PAYMENT: Refund amount ${refundAmt.toFixed(2)} exceeds available payment balance ${availableToRefund.toFixed(2)}`
          );
        }
      } else {
        const activeAdvances = await tx.studentAdvance.findMany({
          where: { schoolId, studentId: params.studentId, status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
        });
        const totalAvailableAdvance = activeAdvances.reduce(
          (sum, a) => sum.plus(a.balanceCredit),
          new Prisma.Decimal(0)
        );

        const studentPayments = await tx.feePayment.findMany({
          where: { schoolId, studentId: params.studentId, status: { notIn: ['REVERSED', 'BOUNCED'] } },
        });
        const totalPaid = studentPayments.reduce((sum, p) => sum.plus(p.totalAmount), new Prisma.Decimal(0));

        const priorStudentRefunds = await tx.feeRefund.findMany({
          where: { schoolId, studentId: params.studentId, status: { in: ['PROCESSED', 'APPROVED'] } },
        });
        const totalPriorRefunded = priorStudentRefunds.reduce((sum, r) => sum.plus(r.amount), new Prisma.Decimal(0));

        const netPaymentBalance = Prisma.Decimal.max(0, totalPaid.minus(totalPriorRefunded));
        const availableBalance = totalAvailableAdvance.greaterThan(0)
          ? totalAvailableAdvance
          : netPaymentBalance;

        if (refundAmt.greaterThan(availableBalance)) {
          throw new BadRequestError(
            `REFUND_EXCEEDS_BALANCE: Refund amount ${refundAmt.toFixed(2)} exceeds available advance/payment balance ${availableBalance.toFixed(2)}`
          );
        }

        if (totalAvailableAdvance.greaterThan(0)) {
          let remainingToDeduct = refundAmt;
          for (const adv of activeAdvances) {
            if (remainingToDeduct.lessThanOrEqualTo(0)) break;
            const deduct = Prisma.Decimal.min(adv.balanceCredit, remainingToDeduct);
            const newBalance = adv.balanceCredit.minus(deduct);
            const newUtilized = adv.utilizedCredit.plus(deduct);
            const newStatus = newBalance.isZero() ? 'REFUNDED' : 'ACTIVE';
            await tx.studentAdvance.update({
              where: { id: adv.id },
              data: {
                balanceCredit: newBalance,
                utilizedCredit: newUtilized,
                status: newStatus,
              },
            });
            remainingToDeduct = remainingToDeduct.minus(deduct);
          }
        }
      }

      const refundNumber = await FinanceService.getNextNumber(
        tenantId,
        schoolId,
        'REFUND',
        'REF-{YYYY}-',
        5,
        tx
      );

      const refund = await tx.feeRefund.create({
        data: {
          tenantId,
          schoolId,
          studentId: params.studentId,
          disbursingAccountId: params.disbursingAccountId,
          feePaymentId: params.feePaymentId || null,
          refundNumber,
          refundDate: new Date(),
          amount: refundAmt,
          refundMethod: params.refundMethod,
          reason: params.reason,
          status: 'PROCESSED',
          requestedByUserId: params.actorUserId || '00000000-0000-0000-0000-000000000004',
          approvedByUserId: params.actorUserId || '00000000-0000-0000-0000-000000000004',
          approvedAt: new Date(),
        },
      });

      const adjustmentAccount = await FinanceService.getSystemAccount(tenantId, schoolId, '5100', tx);

      const journal = await FinanceService.postJournalEntry(tx, {
        tenantId,
        schoolId,
        postingDate: new Date(),
        description: `Student Fee Refund ${refundNumber} - ${student.firstName} ${student.lastName}`,
        sourceType: 'FEE_REFUND',
        sourceId: refund.id,
        lines: [
          {
            accountId: adjustmentAccount.id,
            description: `Refund payout: ${params.reason}`,
            debit: refundAmt,
            credit: new Prisma.Decimal(0),
            studentId: student.id,
          },
          {
            accountId: disbursingAccount.id,
            description: `Disbursed via ${params.refundMethod}`,
            debit: new Prisma.Decimal(0),
            credit: refundAmt,
            studentId: student.id,
          },
        ],
        actorUserId: params.actorUserId,
      });

      const updatedRefund = await tx.feeRefund.update({
        where: { id: refund.id },
        data: { journalEntryId: journal.id },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: params.actorUserId || null,
          action: 'FEE_REFUND_PROCESSED',
          entityType: 'FeeRefund',
          entityId: refund.id,
          metadataInfo: JSON.stringify({ refundNumber, amount: refundAmt.toFixed(2), reason: params.reason }),
        },
      });

      return updatedRefund;
    });
  }

  // =========================================================================
  // STUDENT FINANCIAL LEDGER & AGING
  // =========================================================================

  public static async getStudentLedger(
    tenantId: string,
    schoolId: string,
    studentId: string
  ): Promise<{
    summary: {
      totalCharges: string;
      totalPaid: string;
      totalConcessions: string;
      totalRefunds: string;
      outstandingBalance: string;
      advanceBalance: string;
      overdueAmount: string;
    };
    entries: Array<{
      date: string;
      type: string;
      reference: string;
      description: string;
      debit: string;
      credit: string;
      runningBalance: string;
    }>;
  }> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student || student.schoolId !== schoolId) {
      throw new NotFoundError('Student not found');
    }

    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId, studentId, status: { notIn: ['CANCELLED', 'REVERSED'] } },
      orderBy: { invoiceDate: 'asc' },
    });

    const payments = await prisma.feePayment.findMany({
      where: { schoolId, studentId, status: 'POSTED' },
      include: { receipt: true },
      orderBy: { paymentDate: 'asc' },
    });

    const creditNotes = await prisma.creditNote.findMany({
      where: { schoolId, studentId, status: 'POSTED' },
      orderBy: { creditDate: 'asc' },
    });

    const refunds = await prisma.feeRefund.findMany({
      where: { schoolId, studentId, status: 'PROCESSED' },
      orderBy: { refundDate: 'asc' },
    });

    interface RawLedgerItem {
      date: Date;
      type: string;
      reference: string;
      description: string;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
    }

    const rawItems: RawLedgerItem[] = [];

    for (const inv of invoices) {
      rawItems.push({
        date: inv.invoiceDate,
        type: 'INVOICE',
        reference: inv.invoiceNumber,
        description: 'Fee Invoice',
        debit: inv.totalAmount,
        credit: new Prisma.Decimal(0),
      });
    }

    for (const p of payments) {
      rawItems.push({
        date: p.paymentDate,
        type: 'PAYMENT',
        reference: p.receipt?.receiptNumber || p.receiptNumber || 'PAYMENT',
        description: `Fee Payment (${p.paymentMethod})`,
        debit: new Prisma.Decimal(0),
        credit: p.totalAmount,
      });
    }

    for (const cn of creditNotes) {
      rawItems.push({
        date: cn.creditDate,
        type: 'CREDIT_NOTE',
        reference: cn.creditNoteNumber,
        description: `Credit Note: ${cn.reason}`,
        debit: new Prisma.Decimal(0),
        credit: cn.amount,
      });
    }

    for (const r of refunds) {
      rawItems.push({
        date: r.refundDate,
        type: 'REFUND',
        reference: r.refundNumber,
        description: `Fee Refund: ${r.reason}`,
        debit: r.amount,
        credit: new Prisma.Decimal(0),
      });
    }

    rawItems.sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = new Prisma.Decimal(0);
    let totalCharges = new Prisma.Decimal(0);
    let totalPaid = new Prisma.Decimal(0);
    let totalConcessions = new Prisma.Decimal(0);
    let totalRefunds = new Prisma.Decimal(0);

    const entries = rawItems.map((item) => {
      running = running.add(item.debit).sub(item.credit);

      if (item.type === 'INVOICE') totalCharges = totalCharges.add(item.debit);
      if (item.type === 'PAYMENT') totalPaid = totalPaid.add(item.credit);
      if (item.type === 'CREDIT_NOTE') totalConcessions = totalConcessions.add(item.credit);
      if (item.type === 'REFUND') totalRefunds = totalRefunds.add(item.debit);

      return {
        date: item.date.toISOString().split('T')[0],
        type: item.type,
        reference: item.reference,
        description: item.description,
        debit: item.debit.toFixed(2),
        credit: item.credit.toFixed(2),
        runningBalance: running.toFixed(2),
      };
    });

    const now = new Date();
    let overdueAmount = new Prisma.Decimal(0);
    let outstandingBalance = new Prisma.Decimal(0);

    for (const inv of invoices) {
      outstandingBalance = outstandingBalance.add(inv.outstandingAmount);
      if (inv.dueDate < now && inv.outstandingAmount.greaterThan(0)) {
        overdueAmount = overdueAmount.add(inv.outstandingAmount);
      }
    }

    const advances = await prisma.studentAdvance.findMany({
      where: { schoolId, studentId, status: 'ACTIVE' },
    });
    const advanceBalance = advances.reduce(
      (acc, a) => acc.add(a.balanceCredit),
      new Prisma.Decimal(0)
    );

    return {
      summary: {
        totalCharges: totalCharges.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalConcessions: totalConcessions.toFixed(2),
        totalRefunds: totalRefunds.toFixed(2),
        outstandingBalance: outstandingBalance.toFixed(2),
        advanceBalance: advanceBalance.toFixed(2),
        overdueAmount: overdueAmount.toFixed(2),
      },
      entries,
    };
  }

  public static async getAgingReport(
    tenantId: string,
    schoolId: string,
    filters?: { academicYearId?: string; classId?: string }
  ): Promise<{
    totals: { current: string; days30: string; days60: string; days90: string; days90Plus: string; total: string };
    items: Array<{
      studentId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      current: string;
      days30: string;
      days60: string;
      days90: string;
      days90Plus: string;
      total: string;
    }>;
  }> {
    const openInvoices = await prisma.feeInvoice.findMany({
      where: {
        schoolId,
        status: { in: ['POSTED', 'PARTIALLY_PAID'] },
        outstandingAmount: { gt: 0 },
        ...(filters?.academicYearId ? { academicYearId: filters.academicYearId } : {}),
      },
      include: {
        student: {
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { class: true, section: true },
            },
          },
        },
      },
    });

    const now = new Date();
    const studentMap = new Map<string, any>();

    let totCurrent = new Prisma.Decimal(0);
    let tot30 = new Prisma.Decimal(0);
    let tot60 = new Prisma.Decimal(0);
    let tot90 = new Prisma.Decimal(0);
    let tot90Plus = new Prisma.Decimal(0);

    for (const inv of openInvoices) {
      const student = inv.student;
      const enrollment = student.enrollments[0];
      if (filters?.classId && enrollment?.classId !== filters.classId) {
        continue;
      }

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber || '',
          className: enrollment ? `${enrollment.class.name} - ${enrollment.section?.name || ''}` : 'N/A',
          current: new Prisma.Decimal(0),
          days30: new Prisma.Decimal(0),
          days60: new Prisma.Decimal(0),
          days90: new Prisma.Decimal(0),
          days90Plus: new Prisma.Decimal(0),
          total: new Prisma.Decimal(0),
        });
      }

      const entry = studentMap.get(student.id);
      const outstanding = inv.outstandingAmount;
      const diffMs = now.getTime() - inv.dueDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        entry.current = entry.current.add(outstanding);
        totCurrent = totCurrent.add(outstanding);
      } else if (diffDays <= 30) {
        entry.days30 = entry.days30.add(outstanding);
        tot30 = tot30.add(outstanding);
      } else if (diffDays <= 60) {
        entry.days60 = entry.days60.add(outstanding);
        tot60 = tot60.add(outstanding);
      } else if (diffDays <= 90) {
        entry.days90 = entry.days90.add(outstanding);
        tot90 = tot90.add(outstanding);
      } else {
        entry.days90Plus = entry.days90Plus.add(outstanding);
        tot90Plus = tot90Plus.add(outstanding);
      }

      entry.total = entry.total.add(outstanding);
    }

    const items = Array.from(studentMap.values()).map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      admissionNumber: s.admissionNumber,
      className: s.className,
      current: s.current.toFixed(2),
      days30: s.days30.toFixed(2),
      days60: s.days60.toFixed(2),
      days90: s.days90.toFixed(2),
      days90Plus: s.days90Plus.toFixed(2),
      total: s.total.toFixed(2),
    }));

    const totalOverall = totCurrent.add(tot30).add(tot60).add(tot90).add(tot90Plus);

    return {
      totals: {
        current: totCurrent.toFixed(2),
        days30: tot30.toFixed(2),
        days60: tot60.toFixed(2),
        days90: tot90.toFixed(2),
        days90Plus: tot90Plus.toFixed(2),
        total: totalOverall.toFixed(2),
      },
      items,
    };
  }

  // =========================================================================
  // EXPENSES & VENDOR PAYMENTS
  // =========================================================================

  public static async createExpenseBill(
    tenantId: string,
    schoolId: string,
    params: {
      vendorId?: string | null;
      billDate: Date;
      dueDate?: Date | null;
      description: string;
      lines: Array<{
        expenseHeadId?: string | null;
        accountId: string;
        description: string;
        amount: number | string | Prisma.Decimal;
      }>;
      attachmentUrl?: string | null;
      isImmediatePayment?: boolean;
      disbursingAccountId?: string | null;
      paymentMethod?: any;
      actorUserId?: string | null;
    }
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // Find fallback default expense head if none provided
      const defaultExpHead = await tx.expenseHead.findFirst({ where: { schoolId } });
      const fallbackExpenseHeadId = defaultExpHead ? defaultExpHead.id : (params.lines[0]?.expenseHeadId || '');

      let totalAmount = new Prisma.Decimal(0);
      const billLines = params.lines.map((l) => {
        const amt = FinanceService.toDecimal(l.amount);
        if (amt.lessThanOrEqualTo(0)) {
          throw new BadRequestError('Expense line amount must be greater than zero');
        }
        totalAmount = totalAmount.add(amt);
        return {
          expenseHeadId: l.expenseHeadId || fallbackExpenseHeadId,
          accountId: l.accountId,
          description: l.description,
          amount: amt,
        };
      });

      const billNumber = await FinanceService.getNextNumber(
        tenantId,
        schoolId,
        'EXPENSE',
        'EXP-{YYYY}-',
        5,
        tx
      );

      const periodInfo = await FinanceService.assertOpenPeriod(tenantId, schoolId, params.billDate, tx);

      const expenseBill = await tx.expenseBill.create({
        data: {
          tenantId,
          schoolId,
          financialYearId: periodInfo.financialYearId,
          vendorId: params.vendorId || null,
          billNumber,
          billDate: params.billDate,
          dueDate: params.dueDate || null,
          description: params.description,
          totalAmount,
          paidAmount: params.isImmediatePayment ? totalAmount : new Prisma.Decimal(0),
          outstandingAmount: params.isImmediatePayment ? new Prisma.Decimal(0) : totalAmount,
          attachmentPath: params.attachmentUrl || null,
          status: params.isImmediatePayment ? 'PAID' : 'POSTED',
          createdByUserId: params.actorUserId || '00000000-0000-0000-0000-000000000004',
          lines: {
            create: billLines,
          },
        },
        include: { lines: true, vendor: true },
      });

      let creditAccountId: string;
      if (params.isImmediatePayment) {
        if (!params.disbursingAccountId) {
          throw new BadRequestError('disbursingAccountId is required for immediate payment');
        }
        const disbAccount = await tx.account.findUnique({ where: { id: params.disbursingAccountId } });
        if (!disbAccount || disbAccount.schoolId !== schoolId || !disbAccount.isActive) {
          throw new BadRequestError('ACCOUNT_INACTIVE: Disbursing account is invalid');
        }
        creditAccountId = disbAccount.id;
      } else {
        const vendorPayable = await FinanceService.getSystemAccount(tenantId, schoolId, '2100', tx);
        creditAccountId = vendorPayable.id;
      }

      const journalLines: Array<any> = expenseBill.lines.map((l) => ({
        accountId: l.accountId,
        description: `${l.description} (${billNumber})`,
        debit: l.amount,
        credit: new Prisma.Decimal(0),
        vendorId: params.vendorId || null,
      }));

      journalLines.push({
        accountId: creditAccountId,
        description: params.isImmediatePayment
          ? `Immediate payment for ${billNumber}`
          : `Vendor payable for ${billNumber}`,
        debit: new Prisma.Decimal(0),
        credit: totalAmount,
        vendorId: params.vendorId || null,
      });

      const journal = await FinanceService.postJournalEntry(tx, {
        tenantId,
        schoolId,
        postingDate: params.billDate,
        description: `Expense Bill ${billNumber}: ${params.description}`,
        sourceType: 'EXPENSE_BILL',
        sourceId: expenseBill.id,
        lines: journalLines,
        actorUserId: params.actorUserId,
      });

      const updatedBill = await tx.expenseBill.update({
        where: { id: expenseBill.id },
        data: { journalEntryId: journal.id },
        include: { lines: true, vendor: true },
      });

      return updatedBill;
    });
  }

  public static async createVendorPayment(
    tenantId: string,
    schoolId: string,
    params: {
      vendorId: string;
      disbursingAccountId: string;
      paymentDate: Date;
      paymentMethod: any;
      amount: number | string | Prisma.Decimal;
      referenceNumber?: string | null;
      remarks?: string | null;
      expenseBillId?: string | null;
      actorUserId?: string | null;
      idempotencyKey?: string | null;
    }
  ): Promise<any> {
    return await FinanceService.withIdempotency(
      tenantId,
      schoolId,
      'VENDOR_PAYMENT',
      params.idempotencyKey,
      params,
      async (tx) => {
        const paymentAmt = FinanceService.toDecimal(params.amount);
        const disbAccount = await tx.account.findUnique({ where: { id: params.disbursingAccountId } });
        if (!disbAccount || disbAccount.schoolId !== schoolId || !disbAccount.isActive) {
          throw new BadRequestError('ACCOUNT_INACTIVE: Disbursing cash/bank account is invalid');
        }

        const vendor = await tx.vendor.findUnique({ where: { id: params.vendorId } });
        if (!vendor || vendor.schoolId !== schoolId) {
          throw new NotFoundError('Vendor not found');
        }

        if (params.expenseBillId) {
          const bill = await tx.expenseBill.findUnique({ where: { id: params.expenseBillId } });
          if (bill) {
            const newPaid = bill.paidAmount.add(paymentAmt);
            const newOutstanding = bill.outstandingAmount.sub(paymentAmt);
            await tx.expenseBill.update({
              where: { id: bill.id },
              data: {
                paidAmount: newPaid,
                outstandingAmount: newOutstanding,
                status: newOutstanding.isZero() ? 'PAID' : 'PARTIALLY_PAID',
              },
            });
          }
        }

        const paymentNumber = await FinanceService.getNextNumber(
          tenantId,
          schoolId,
          'VENDOR_PAYMENT',
          'VPAY-{YYYY}-',
          5,
          tx
        );

        const vendorPayment = await tx.vendorPayment.create({
          data: {
            tenantId,
            schoolId,
            vendorId: params.vendorId,
            expenseBillId: params.expenseBillId || null,
            disbursingAccountId: params.disbursingAccountId,
            paymentNumber,
            paymentDate: params.paymentDate,
            amount: paymentAmt,
            paymentMethod: params.paymentMethod,
            referenceNumber: params.referenceNumber || null,
            remarks: params.remarks || null,
            idempotencyKey: params.idempotencyKey || null,
            createdByUserId: params.actorUserId || '00000000-0000-0000-0000-000000000004',
          },
          include: { vendor: true },
        });

        const vendorPayable = await FinanceService.getSystemAccount(tenantId, schoolId, '2100', tx);

        const journal = await FinanceService.postJournalEntry(tx, {
          tenantId,
          schoolId,
          postingDate: params.paymentDate,
          description: `Vendor Payment ${paymentNumber} to ${vendor.name}`,
          sourceType: 'VENDOR_PAYMENT',
          sourceId: vendorPayment.id,
          lines: [
            {
              accountId: vendorPayable.id,
              description: `Payable settled for ${vendor.name}`,
              debit: paymentAmt,
              credit: new Prisma.Decimal(0),
              vendorId: params.vendorId,
            },
            {
              accountId: disbAccount.id,
              description: `Vendor payment via ${params.paymentMethod}`,
              debit: new Prisma.Decimal(0),
              credit: paymentAmt,
              vendorId: params.vendorId,
            },
          ],
          actorUserId: params.actorUserId,
        });

        const updatedVendorPayment = await tx.vendorPayment.update({
          where: { id: vendorPayment.id },
          data: { journalEntryId: journal.id },
          include: { vendor: true },
        });

        return updatedVendorPayment;
      }
    );
  }

  // =========================================================================
  // BANK TRANSFERS & RECONCILIATION
  // =========================================================================

  public static async createBankTransfer(
    tenantId: string,
    schoolId: string,
    params: {
      fromAccountId: string;
      toAccountId: string;
      transferDate: Date;
      amount: number | string | Prisma.Decimal;
      referenceNumber?: string | null;
      remarks?: string | null;
      actorUserId?: string | null;
      idempotencyKey?: string | null;
    }
  ): Promise<any> {
    return await FinanceService.withIdempotency(
      tenantId,
      schoolId,
      'BANK_TRANSFER',
      params.idempotencyKey,
      params,
      async (tx) => {
        if (params.fromAccountId === params.toAccountId) {
          throw new BadRequestError('Source and destination accounts cannot be identical');
        }

        const transferAmt = FinanceService.toDecimal(params.amount);
        if (transferAmt.lessThanOrEqualTo(0)) {
          throw new BadRequestError('Transfer amount must be greater than zero');
        }

        const [fromAcc, toAcc] = await Promise.all([
          tx.account.findUnique({ where: { id: params.fromAccountId } }),
          tx.account.findUnique({ where: { id: params.toAccountId } }),
        ]);

        if (!fromAcc || !toAcc || fromAcc.schoolId !== schoolId || toAcc.schoolId !== schoolId) {
          throw new NotFoundError('One or both transfer accounts were not found');
        }
        if (!fromAcc.isActive || !toAcc.isActive) {
          throw new BadRequestError('ACCOUNT_INACTIVE: Both transfer accounts must be active');
        }

        const transferNumber = await FinanceService.getNextNumber(
          tenantId,
          schoolId,
          'BANK_TRANSFER',
          'BT-{YYYY}-',
          5,
          tx
        );

        const periodInfo = await FinanceService.assertOpenPeriod(tenantId, schoolId, params.transferDate, tx);

        const transfer = await tx.bankTransfer.create({
          data: {
            tenantId,
            schoolId,
            financialYearId: periodInfo.financialYearId,
            fromAccountId: params.fromAccountId,
            toAccountId: params.toAccountId,
            transferNumber,
            transferDate: params.transferDate,
            amount: transferAmt,
            reference: params.referenceNumber || null,
            description: params.remarks || null,
            createdByUserId: params.actorUserId || '00000000-0000-0000-0000-000000000004',
          },
        });

        const journal = await FinanceService.postJournalEntry(tx, {
          tenantId,
          schoolId,
          postingDate: params.transferDate,
          description: `Internal Fund Transfer ${transferNumber} (${fromAcc.name} -> ${toAcc.name})`,
          sourceType: 'BANK_TRANSFER',
          sourceId: transfer.id,
          lines: [
            {
              accountId: toAcc.id,
              description: `Transfer in from ${fromAcc.name}`,
              debit: transferAmt,
              credit: new Prisma.Decimal(0),
            },
            {
              accountId: fromAcc.id,
              description: `Transfer out to ${toAcc.name}`,
              debit: new Prisma.Decimal(0),
              credit: transferAmt,
            },
          ],
          actorUserId: params.actorUserId,
        });

        const updatedTransfer = await tx.bankTransfer.update({
          where: { id: transfer.id },
          data: { journalEntryId: journal.id },
        });

        return updatedTransfer;
      }
    );
  }

  public static async importBankStatement(
    tenantId: string,
    schoolId: string,
    params: {
      bankAccountId: string;
      statementStartDate: Date;
      statementEndDate: Date;
      lines: Array<{
        transactionDate: Date;
        description: string;
        referenceNumber?: string | null;
        debit: number | string | Prisma.Decimal;
        credit: number | string | Prisma.Decimal;
        balanceAfter?: number | string | Prisma.Decimal | null;
      }>;
      actorUserId?: string | null;
    }
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const bankAccount = await tx.bankAccount.findUnique({
        where: { id: params.bankAccountId },
      });
      if (!bankAccount || bankAccount.schoolId !== schoolId) {
        throw new NotFoundError('Bank account not found');
      }

      const statementImport = await tx.bankStatementImport.create({
        data: {
          tenantId,
          schoolId,
          bankAccountId: params.bankAccountId,
          filename: `statement_${new Date().toISOString().split('T')[0]}.csv`,
          startDate: params.statementStartDate,
          endDate: params.statementEndDate,
          totalLines: params.lines.length,
          status: 'COMPLETED',
          importedByUserId: params.actorUserId || '00000000-0000-0000-0000-000000000004',
        },
      });

      const processedLines: any[] = [];

      for (const line of params.lines) {
        const debit = FinanceService.toDecimal(line.debit);
        const credit = FinanceService.toDecimal(line.credit);
        const dateStr = line.transactionDate.toISOString().split('T')[0];

        const lineFingerprint = crypto
          .createHash('sha256')
          .update(`${params.bankAccountId}|${dateStr}|${line.description}|${debit.toFixed(2)}|${credit.toFixed(2)}|${line.referenceNumber || ''}`)
          .digest('hex');

        const existingLine = await tx.bankStatementLine.findFirst({
          where: {
            bankAccountId: params.bankAccountId,
            lineFingerprint,
          },
        });

        if (existingLine) {
          throw new ConflictError(
            `BANK_STATEMENT_DUPLICATE: Duplicate statement line detected: ${line.description} on ${dateStr}`
          );
        }

        const createdLine = await tx.bankStatementLine.create({
          data: {
            importId: statementImport.id,
            bankAccountId: params.bankAccountId,
            transactionDate: line.transactionDate,
            description: line.description,
            reference: line.referenceNumber || null,
            debit,
            credit,
            balance: line.balanceAfter ? FinanceService.toDecimal(line.balanceAfter) : null,
            status: 'UNMATCHED',
            lineFingerprint,
          },
        });

        processedLines.push(createdLine);
      }

      return {
        importId: statementImport.id,
        importedLines: processedLines.length,
      };
    });
  }

  // =========================================================================
  // FINANCIAL REPORTS (TRIAL BALANCE, P&L, BALANCE SHEET)
  // =========================================================================

  public static async getTrialBalance(
    tenantId: string,
    schoolId: string,
    asOfDate: Date = new Date()
  ): Promise<{
    asOfDate: string;
    isBalanced: boolean;
    totalDebit: string;
    totalCredit: string;
    accounts: Array<{
      id: string;
      code: string;
      name: string;
      type: string;
      normalBalance: string;
      totalDebit: string;
      totalCredit: string;
      closingBalance: string;
    }>;
  }> {
    const accounts = await prisma.account.findMany({
      where: { schoolId, isActive: true },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              postingDate: { lte: asOfDate },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    let overallDebit = new Prisma.Decimal(0);
    let overallCredit = new Prisma.Decimal(0);

    const resultAccounts = accounts.map((acc) => {
      let accDebit = new Prisma.Decimal(0);
      let accCredit = new Prisma.Decimal(0);

      for (const line of acc.journalLines) {
        accDebit = accDebit.add(line.debit);
        accCredit = accCredit.add(line.credit);
      }

      overallDebit = overallDebit.add(accDebit);
      overallCredit = overallCredit.add(accCredit);

      let closing = new Prisma.Decimal(0);
      if (acc.normalBalance === 'DEBIT') {
        closing = accDebit.sub(accCredit);
      } else {
        closing = accCredit.sub(accDebit);
      }

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        totalDebit: accDebit.toFixed(2),
        totalCredit: accCredit.toFixed(2),
        closingBalance: closing.toFixed(2),
      };
    });

    return {
      asOfDate: asOfDate.toISOString().split('T')[0],
      isBalanced: overallDebit.equals(overallCredit),
      totalDebit: overallDebit.toFixed(2),
      totalCredit: overallCredit.toFixed(2),
      accounts: resultAccounts,
    };
  }

  public static async getProfitAndLoss(
    tenantId: string,
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    startDate: string;
    endDate: string;
    totalIncome: string;
    totalExpense: string;
    netSurplus: string;
    incomeAccounts: Array<{ code: string; name: string; amount: string }>;
    expenseAccounts: Array<{ code: string; name: string; amount: string }>;
  }> {
    const accounts = await prisma.account.findMany({
      where: {
        schoolId,
        type: { in: ['INCOME', 'EXPENSE'] },
        isActive: true,
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              postingDate: { gte: startDate, lte: endDate },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    let totalIncome = new Prisma.Decimal(0);
    let totalExpense = new Prisma.Decimal(0);

    const incomeAccounts: any[] = [];
    const expenseAccounts: any[] = [];

    for (const acc of accounts) {
      let debit = new Prisma.Decimal(0);
      let credit = new Prisma.Decimal(0);
      for (const l of acc.journalLines) {
        debit = debit.add(l.debit);
        credit = credit.add(l.credit);
      }

      if (acc.type === 'INCOME') {
        const net = credit.sub(debit);
        totalIncome = totalIncome.add(net);
        incomeAccounts.push({ code: acc.code, name: acc.name, amount: net.toFixed(2) });
      } else {
        const net = debit.sub(credit);
        totalExpense = totalExpense.add(net);
        expenseAccounts.push({ code: acc.code, name: acc.name, amount: net.toFixed(2) });
      }
    }

    const netSurplus = totalIncome.sub(totalExpense);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      netSurplus: netSurplus.toFixed(2),
      incomeAccounts,
      expenseAccounts,
    };
  }

  public static async getBalanceSheet(
    tenantId: string,
    schoolId: string,
    asOfDate: Date = new Date()
  ): Promise<{
    asOfDate: string;
    totalAssets: string;
    totalLiabilities: string;
    totalEquity: string;
    totalLiabilitiesAndEquity: string;
    isBalanced: boolean;
    assets: Array<{ code: string; name: string; balance: string }>;
    liabilities: Array<{ code: string; name: string; balance: string }>;
    equity: Array<{ code: string; name: string; balance: string }>;
  }> {
    const accounts = await prisma.account.findMany({
      where: {
        schoolId,
        isActive: true,
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              postingDate: { lte: asOfDate },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    let totalAssets = new Prisma.Decimal(0);
    let totalLiabilities = new Prisma.Decimal(0);
    let totalEquity = new Prisma.Decimal(0);
    let totalIncome = new Prisma.Decimal(0);
    let totalExpense = new Prisma.Decimal(0);

    const assetList: any[] = [];
    const liabilityList: any[] = [];
    const equityList: any[] = [];

    for (const acc of accounts) {
      let debit = new Prisma.Decimal(0);
      let credit = new Prisma.Decimal(0);
      for (const l of acc.journalLines) {
        debit = debit.add(l.debit);
        credit = credit.add(l.credit);
      }

      if (acc.type === 'ASSET') {
        const bal = debit.sub(credit);
        totalAssets = totalAssets.add(bal);
        assetList.push({ code: acc.code, name: acc.name, balance: bal.toFixed(2) });
      } else if (acc.type === 'LIABILITY') {
        const bal = credit.sub(debit);
        totalLiabilities = totalLiabilities.add(bal);
        liabilityList.push({ code: acc.code, name: acc.name, balance: bal.toFixed(2) });
      } else if (acc.type === 'EQUITY') {
        const bal = credit.sub(debit);
        totalEquity = totalEquity.add(bal);
        equityList.push({ code: acc.code, name: acc.name, balance: bal.toFixed(2) });
      } else if (acc.type === 'INCOME') {
        totalIncome = totalIncome.add(credit.sub(debit));
      } else if (acc.type === 'EXPENSE') {
        totalExpense = totalExpense.add(debit.sub(credit));
      }
    }

    const retainedSurplus = totalIncome.sub(totalExpense);
    totalEquity = totalEquity.add(retainedSurplus);
    equityList.push({
      code: 'SURPLUS',
      name: 'Accumulated Operational Surplus / (Deficit)',
      balance: retainedSurplus.toFixed(2),
    });

    const totalLiabilitiesAndEquity = totalLiabilities.add(totalEquity);

    return {
      asOfDate: asOfDate.toISOString().split('T')[0],
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      totalEquity: totalEquity.toFixed(2),
      totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.toFixed(2),
      isBalanced: totalAssets.equals(totalLiabilitiesAndEquity),
      assets: assetList,
      liabilities: liabilityList,
      equity: equityList,
    };
  }

  public static async getOverviewMetrics(
    tenantId: string,
    schoolId: string
  ): Promise<{
    feeDemand: string;
    collected: string;
    outstanding: string;
    overdue: string;
    collectionRate: string;
    todayCollection: string;
    monthExpenses: string;
    cashBalance: string;
    bankBalance: string;
  }> {
    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId, status: { notIn: ['CANCELLED', 'REVERSED'] } },
    });

    let feeDemand = new Prisma.Decimal(0);
    let collected = new Prisma.Decimal(0);
    let outstanding = new Prisma.Decimal(0);
    let overdue = new Prisma.Decimal(0);
    const now = new Date();

    for (const inv of invoices) {
      feeDemand = feeDemand.add(inv.totalAmount);
      collected = collected.add(inv.paidAmount);
      outstanding = outstanding.add(inv.outstandingAmount);
      if (inv.dueDate < now && inv.outstandingAmount.greaterThan(0)) {
        overdue = overdue.add(inv.outstandingAmount);
      }
    }

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayPayments = await prisma.feePayment.findMany({
      where: {
        schoolId,
        status: 'POSTED',
        paymentDate: { gte: startOfToday },
      },
    });
    const todayCollection = todayPayments.reduce((acc, p) => acc.add(p.totalAmount), new Prisma.Decimal(0));

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthExpensesBills = await prisma.expenseBill.findMany({
      where: {
        schoolId,
        status: { in: ['POSTED', 'PAID', 'PARTIALLY_PAID'] },
        billDate: { gte: startOfMonth },
      },
    });
    const monthExpenses = monthExpensesBills.reduce((acc, b) => acc.add(b.totalAmount), new Prisma.Decimal(0));

    const cashAcc = await prisma.account.findFirst({ where: { schoolId, code: '1010' } });
    const bankAcc = await prisma.account.findFirst({ where: { schoolId, code: '1020' } });

    const getAccountBalance = async (accId?: string) => {
      if (!accId) return '0.00';
      const lines = await prisma.journalLine.findMany({
        where: { accountId: accId, journalEntry: { status: 'POSTED' } },
      });
      const bal = lines.reduce((acc, l) => acc.add(l.debit).sub(l.credit), new Prisma.Decimal(0));
      return bal.toFixed(2);
    };

    const cashBalance = await getAccountBalance(cashAcc?.id);
    const bankBalance = await getAccountBalance(bankAcc?.id);

    const collectionRate = feeDemand.greaterThan(0)
      ? collected.mul(100).div(feeDemand).toFixed(1)
      : '0.0';

    return {
      feeDemand: feeDemand.toFixed(2),
      collected: collected.toFixed(2),
      outstanding: outstanding.toFixed(2),
      overdue: overdue.toFixed(2),
      collectionRate: `${collectionRate}%`,
      todayCollection: todayCollection.toFixed(2),
      monthExpenses: monthExpenses.toFixed(2),
      cashBalance,
      bankBalance,
    };
  }

  public static async assertParentChildAccess(
    parentUserId: string,
    studentId: string
  ): Promise<void> {
    const parentGuardian = await prisma.guardian.findFirst({
      where: { userId: parentUserId },
    });

    if (!parentGuardian) {
      throw new ForbiddenError('PARENT_FINANCE_ACCESS_DENIED: You are not registered as a parent/guardian');
    }

    const studentGuardian = await prisma.studentGuardian.findFirst({
      where: {
        guardianId: parentGuardian.id,
        studentId,
      },
    });

    if (!studentGuardian) {
      throw new ForbiddenError('PARENT_FINANCE_ACCESS_DENIED: You are not authorized to view financial records for this student');
    }
  }
}
