import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { FinanceService } from './finance.service.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { Prisma } from '@prisma/client';

export class FinanceController {
  // 1. Dashboard Overview
  public static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const metrics = await FinanceService.getOverviewMetrics(tenantId, schoolId);
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }

  // 2. Financial Years
  public static async listFinancialYears(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const list = await prisma.financialYear.findMany({
        where: { schoolId },
        include: { accountingPeriods: { orderBy: { startDate: 'asc' } } },
        orderBy: { startDate: 'desc' },
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createFinancialYear(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { name, startDate, endDate } = req.body;

      const fy = await prisma.financialYear.create({
        data: {
          tenantId,
          schoolId,
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'OPEN',
        },
      });

      res.status(201).json(fy);
    } catch (err) {
      next(err);
    }
  }

  // 3. Accounting Periods
  public static async listAccountingPeriods(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const { financialYearId } = req.query;
      const list = await prisma.accountingPeriod.findMany({
        where: {
          schoolId,
          ...(financialYearId ? { financialYearId: String(financialYearId) } : {}),
        },
        include: { financialYear: true },
        orderBy: { startDate: 'asc' },
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createAccountingPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { financialYearId, name, startDate, endDate } = req.body;

      const sDate = new Date(startDate);
      const eDate = new Date(endDate);

      const overlap = await prisma.accountingPeriod.findFirst({
        where: {
          schoolId,
          financialYearId,
          OR: [
            { startDate: { lte: eDate }, endDate: { gte: sDate } },
          ],
        },
      });

      if (overlap) {
        throw new BadRequestError('PERIOD_OVERLAP: Accounting period overlaps with an existing period');
      }

      const period = await prisma.accountingPeriod.create({
        data: {
          tenantId,
          schoolId,
          financialYearId,
          name,
          startDate: sDate,
          endDate: eDate,
          status: 'OPEN',
        },
      });

      res.status(201).json(period);
    } catch (err) {
      next(err);
    }
  }

  public static async closeAccountingPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const periodId = req.params.id as string;
      const schoolId = req.schoolId!;
      const tenantId = req.user!.tenantId;

      const period = await prisma.accountingPeriod.findUnique({ where: { id: periodId } });
      if (!period || period.schoolId !== schoolId) {
        throw new NotFoundError('Accounting period not found');
      }

      const updated = await prisma.accountingPeriod.update({
        where: { id: periodId },
        data: {
          status: 'CLOSED',
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: req.user!.id,
          action: 'ACCOUNTING_PERIOD_CLOSED',
          entityType: 'AccountingPeriod',
          entityId: periodId,
          metadataInfo: JSON.stringify({ name: period.name }),
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async reopenAccountingPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const periodId = req.params.id as string;
      const schoolId = req.schoolId!;
      const tenantId = req.user!.tenantId;
      const { reason } = req.body;

      if (!reason || reason.trim().length < 3) {
        throw new BadRequestError('Mandatory justification reason is required to reopen a period');
      }

      const period = await prisma.accountingPeriod.findUnique({ where: { id: periodId } });
      if (!period || period.schoolId !== schoolId) {
        throw new NotFoundError('Accounting period not found');
      }

      const updated = await prisma.accountingPeriod.update({
        where: { id: periodId },
        data: {
          status: 'OPEN',
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: req.user!.id,
          action: 'ACCOUNTING_PERIOD_REOPENED',
          entityType: 'AccountingPeriod',
          entityId: periodId,
          metadataInfo: JSON.stringify({ name: period.name, reason }),
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  // 4. Chart of Accounts
  public static async listAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { type, isActive } = req.query;

      let accounts = await prisma.account.findMany({
        where: {
          schoolId,
          ...(type ? { type: type as any } : {}),
          ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
        },
        include: {
          parentAccount: true,
          subAccounts: true,
        },
        orderBy: { code: 'asc' },
      });

      // Auto-provision standard accounts if school has 0 accounts
      if (accounts.length === 0 && !type) {
        await FinanceService.ensureStandardAccounts(tenantId, schoolId);
        accounts = await prisma.account.findMany({
          where: {
            schoolId,
            ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
          },
          include: {
            parentAccount: true,
            subAccounts: true,
          },
          orderBy: { code: 'asc' },
        });
      }

      res.json(accounts);
    } catch (err) {
      next(err);
    }
  }

  public static async initializeDefaultAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const accounts = await FinanceService.ensureStandardAccounts(tenantId, schoolId);
      res.json({ message: 'Standard accounts provisioned successfully', count: accounts.length, accounts });
    } catch (err) {
      next(err);
    }
  }

  public static async createAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { code, name, type, normalBalance, parentAccountId, description, systemMapping } = req.body;

      const existing = await prisma.account.findUnique({
        where: { schoolId_code: { schoolId, code } },
      });
      if (existing) {
        throw new BadRequestError(`An account with code ${code} already exists`);
      }

      const acc = await prisma.account.create({
        data: {
          tenantId,
          schoolId,
          code,
          name,
          type,
          normalBalance,
          parentAccountId: parentAccountId || null,
          description: description || null,
          systemMapping: systemMapping || null,
          isActive: true,
        },
      });

      res.status(201).json(acc);
    } catch (err) {
      next(err);
    }
  }

  public static async archiveAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = req.params.id as string;
      const schoolId = req.schoolId!;

      const acc = await prisma.account.findUnique({
        where: { id: accountId },
        include: { journalLines: { take: 1 } },
      });

      if (!acc || acc.schoolId !== schoolId) {
        throw new NotFoundError('Account not found');
      }
      if (acc.isSystemAccount) {
        throw new BadRequestError('SYSTEM_ACCOUNT_PROTECTED: Essential system accounts cannot be archived or deleted');
      }

      const updated = await prisma.account.update({
        where: { id: accountId },
        data: {
          isActive: false,
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  // 5. General Ledger Journals
  public static async listJournals(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [total, items] = await Promise.all([
        prisma.journalEntry.count({ where: { schoolId } }),
        prisma.journalEntry.findMany({
          where: { schoolId },
          include: {
            lines: { include: { account: true } },
            financialYear: true,
            accountingPeriod: true,
          },
          orderBy: { postingDate: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      res.json({
        data: items,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createJournalEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { postingDate, description, lines } = req.body;

      const entry = await prisma.$transaction(async (tx) => {
        return await FinanceService.postJournalEntry(tx, {
          tenantId,
          schoolId,
          postingDate: new Date(postingDate),
          description,
          sourceType: 'MANUAL',
          lines,
          actorUserId: req.user!.id,
        });
      });

      res.status(201).json(entry);
    } catch (err) {
      next(err);
    }
  }

  public static async reverseJournalEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const journalEntryId = req.params.id as string;
      const { reason, postingDate } = req.body;

      const reversal = await prisma.$transaction(async (tx) => {
        return await FinanceService.reverseJournalEntry(tx, {
          tenantId,
          schoolId,
          journalEntryId,
          reason,
          actorUserId: req.user!.id,
          reversalPostingDate: postingDate ? new Date(postingDate) : undefined,
        });
      });

      res.json(reversal);
    } catch (err) {
      next(err);
    }
  }

  // 6. Fee Structures & Installments
  public static async listFeeStructures(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const list = await prisma.feeStructure.findMany({
        where: { schoolId },
        include: {
          academicYear: true,
          class: true,
          studentCategory: true,
          items: { include: { feeHead: true } },
          installments: { orderBy: { sequence: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createFeeStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { name, code, academicYearId, classId, studentCategoryId, effectiveDate, items, installments } = req.body;

      const fsCode = code || `FS-${Date.now().toString().slice(-6)}`;

      const structure = await prisma.feeStructure.create({
        data: {
          tenantId,
          schoolId,
          academicYearId,
          classId: classId || null,
          studentCategoryId: studentCategoryId || null,
          name,
          code: fsCode,
          effectiveDate: new Date(effectiveDate),
          status: 'ACTIVE',
          items: {
            create: items.map((it: any, idx: number) => ({
              feeHeadId: it.feeHeadId,
              amount: FinanceService.toDecimal(it.amount),
              isOptional: it.isOptional || false,
              displayOrder: it.displayOrder ?? idx + 1,
            })),
          },
          installments: installments
            ? {
                create: installments.map((ins: any, idx: number) => ({
                  tenantId,
                  schoolId,
                  name: ins.name,
                  dueDate: new Date(ins.dueDate),
                  amount: FinanceService.toDecimal(ins.amount || 0),
                  sequence: ins.sequence ?? idx + 1,
                })),
              }
            : undefined,
        },
        include: {
          items: { include: { feeHead: true } },
          installments: true,
        },
      });

      res.status(201).json(structure);
    } catch (err) {
      next(err);
    }
  }

  // 7. Student Fee Assignment
  public static async listStudentFeeAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const { academicYearId, studentId } = req.query;

      const list = await prisma.studentFeeAssignment.findMany({
        where: {
          schoolId,
          ...(academicYearId ? { academicYearId: String(academicYearId) } : {}),
          ...(studentId ? { studentId: String(studentId) } : {}),
        },
        include: {
          student: true,
          feeStructure: { include: { items: { include: { feeHead: true } }, installments: true } },
        },
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async assignStudentFee(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { studentId, academicYearId, feeStructureId, customTotalAmount, remarks } = req.body;

      const assignment = await prisma.studentFeeAssignment.upsert({
        where: {
          schoolId_studentId_academicYearId_feeStructureId: {
            schoolId,
            studentId,
            academicYearId,
            feeStructureId,
          },
        },
        update: {
          overrideAmount: customTotalAmount ? FinanceService.toDecimal(customTotalAmount) : null,
          overrideReason: remarks || null,
        },
        create: {
          tenantId,
          schoolId,
          studentId,
          academicYearId,
          feeStructureId,
          overrideAmount: customTotalAmount ? FinanceService.toDecimal(customTotalAmount) : null,
          overrideReason: remarks || null,
          status: 'ACTIVE',
        },
        include: { feeStructure: true, student: true },
      });

      res.status(201).json(assignment);
    } catch (err) {
      next(err);
    }
  }

  // 8. Fee Invoices
  public static async listInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { studentId, status, search } = req.query;

      const where: Prisma.FeeInvoiceWhereInput = {
        schoolId,
        ...(studentId ? { studentId: String(studentId) } : {}),
        ...(status ? { status: status as any } : {}),
        ...(search
          ? {
              OR: [
                { invoiceNumber: { contains: String(search), mode: 'insensitive' } },
                { student: { firstName: { contains: String(search), mode: 'insensitive' } } },
                { student: { lastName: { contains: String(search), mode: 'insensitive' } } },
              ],
            }
          : {}),
      };

      const [total, items] = await Promise.all([
        prisma.feeInvoice.count({ where }),
        prisma.feeInvoice.findMany({
          where,
          include: {
            student: true,
            lines: { include: { feeHead: true } },
            allocations: { include: { feePayment: true } },
          },
          orderBy: { invoiceDate: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      res.json({
        data: items,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceId = req.params.id as string;
      const schoolId = req.schoolId!;

      const invoice = await prisma.feeInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          student: true,
          lines: { include: { feeHead: true } },
          allocations: { include: { feePayment: true } },
          creditNotes: true,
          journalEntry: { include: { lines: { include: { account: true } } } },
        },
      });

      if (!invoice || invoice.schoolId !== schoolId) {
        throw new NotFoundError('Invoice not found');
      }

      res.json(invoice);
    } catch (err) {
      next(err);
    }
  }

  public static async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const invoice = await FinanceService.createFeeInvoice(tenantId, schoolId, {
        ...req.body,
        invoiceDate: new Date(req.body.invoiceDate),
        dueDate: new Date(req.body.dueDate),
        actorUserId: req.user!.id,
      });
      res.status(201).json(invoice);
    } catch (err) {
      next(err);
    }
  }

  public static async batchGenerateInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const result = await FinanceService.batchGenerateInvoices(tenantId, schoolId, {
        ...req.body,
        invoiceDate: new Date(req.body.invoiceDate),
        dueDate: new Date(req.body.dueDate),
        actorUserId: req.user!.id,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  // 9. Collections & Receipts
  public static async collectFeePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body.idempotencyKey as string);

      const result = await FinanceService.collectFeePayment(tenantId, schoolId, {
        ...req.body,
        paymentDate: new Date(req.body.paymentDate),
        chequeDate: req.body.chequeDate ? new Date(req.body.chequeDate) : null,
        actorUserId: req.user!.id,
        idempotencyKey,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async listReceipts(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { studentId, search } = req.query;

      const where: Prisma.FeeReceiptWhereInput = {
        schoolId,
        ...(studentId ? { feePayment: { studentId: String(studentId) } } : {}),
        ...(search
          ? {
              receiptNumber: { contains: String(search), mode: 'insensitive' },
            }
          : {}),
      };

      const [total, items] = await Promise.all([
        prisma.feeReceipt.count({ where }),
        prisma.feeReceipt.findMany({
          where,
          include: {
            feePayment: {
              include: {
                student: true,
                receivingAccount: true,
                allocations: { include: { feeInvoice: true } },
              },
            },
          },
          orderBy: { receiptDate: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      res.json({
        data: items,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async reverseReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const receiptId = req.params.id as string;
      const { reason, isBouncedCheque } = req.body;

      const result = await FinanceService.reverseFeeReceipt(tenantId, schoolId, {
        receiptId,
        reason,
        isBouncedCheque,
        actorUserId: req.user!.id,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 10. Concessions
  public static async listConcessions(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const { studentId, academicYearId } = req.query;

      const list = await prisma.feeConcession.findMany({
        where: {
          schoolId,
          ...(studentId ? { studentId: String(studentId) } : {}),
          ...(academicYearId ? { academicYearId: String(academicYearId) } : {}),
        },
        include: { student: true, feeHead: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createConcession(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { studentId, academicYearId, feeHeadId, type, method, value, reason, name } = req.body;

      const concession = await prisma.feeConcession.create({
        data: {
          tenantId,
          schoolId,
          studentId,
          academicYearId,
          feeHeadId: feeHeadId || null,
          name: name || type || 'Fee Concession',
          concessionType: method === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT',
          value: FinanceService.toDecimal(value),
          reason,
          status: 'PENDING',
        },
        include: { student: true, feeHead: true },
      });

      res.status(201).json(concession);
    } catch (err) {
      next(err);
    }
  }

  public static async approveConcession(req: Request, res: Response, next: NextFunction) {
    try {
      const concessionId = req.params.id as string;
      const schoolId = req.schoolId!;
      const { approved } = req.body;

      const concession = await prisma.feeConcession.findUnique({ where: { id: concessionId } });
      if (!concession || concession.schoolId !== schoolId) {
        throw new NotFoundError('Concession not found');
      }

      const updated = await prisma.feeConcession.update({
        where: { id: concessionId },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          approvedByUserId: approved ? req.user!.id : null,
          approvedAt: approved ? new Date() : null,
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  // 11. Credit Notes & Write-Offs
  public static async createCreditNote(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const result = await FinanceService.createCreditNote(tenantId, schoolId, {
        ...req.body,
        actorUserId: req.user!.id,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async writeOffInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const invoiceId = (req.params.id as string) || req.body.invoiceId;
      const result = await FinanceService.writeOffInvoice(tenantId, schoolId, {
        ...req.body,
        invoiceId,
        actorUserId: req.user!.id,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 12. Refunds
  public static async listRefunds(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const list = await prisma.feeRefund.findMany({
        where: { schoolId },
        include: { student: true, disbursingAccount: true },
        orderBy: { refundDate: 'desc' },
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const refund = await FinanceService.createFeeRefund(tenantId, schoolId, {
        ...req.body,
        actorUserId: req.user!.id,
      });
      res.status(201).json(refund);
    } catch (err) {
      next(err);
    }
  }

  // 13. Student Ledger & Aging
  public static async getStudentLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const studentId = req.params.studentId as string;

      const ledger = await FinanceService.getStudentLedger(tenantId, schoolId, studentId);
      res.json(ledger);
    } catch (err) {
      next(err);
    }
  }

  public static async getAgingReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { academicYearId, classId } = req.query;

      const report = await FinanceService.getAgingReport(tenantId, schoolId, {
        academicYearId: academicYearId ? String(academicYearId) : undefined,
        classId: classId ? String(classId) : undefined,
      });
      res.json(report);
    } catch (err) {
      next(err);
    }
  }

  // 14. Vendors
  public static async listVendors(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const list = await prisma.vendor.findMany({
        where: { schoolId },
        orderBy: { name: 'asc' },
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const code = req.body.code || `VEN-${Date.now().toString().slice(-5)}`;
      const vendor = await prisma.vendor.create({
        data: {
          tenantId,
          schoolId,
          code,
          name: req.body.name,
          contactPerson: req.body.contactPerson || null,
          phone: req.body.phone || null,
          email: req.body.email || null,
          address: req.body.address || null,
          taxId: req.body.taxId || null,
        },
      });
      res.status(201).json(vendor);
    } catch (err) {
      next(err);
    }
  }

  // 15. Expense Bills & Vendor Payments
  public static async listExpenseBills(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [total, items] = await Promise.all([
        prisma.expenseBill.count({ where: { schoolId } }),
        prisma.expenseBill.findMany({
          where: { schoolId },
          include: {
            vendor: true,
            lines: { include: { account: true, expenseHead: true } },
          },
          orderBy: { billDate: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      res.json({
        data: items,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createExpenseBill(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const bill = await FinanceService.createExpenseBill(tenantId, schoolId, {
        ...req.body,
        billDate: new Date(req.body.billDate),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        actorUserId: req.user!.id,
      });
      res.status(201).json(bill);
    } catch (err) {
      next(err);
    }
  }

  public static async createVendorPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body.idempotencyKey as string);

      const payment = await FinanceService.createVendorPayment(tenantId, schoolId, {
        ...req.body,
        paymentDate: new Date(req.body.paymentDate),
        actorUserId: req.user!.id,
        idempotencyKey,
      });

      res.status(201).json(payment);
    } catch (err) {
      next(err);
    }
  }

  // 16. Banking & Internal Transfers
  public static async listBankAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const list = await prisma.bankAccount.findMany({
        where: { schoolId },
        include: { account: true },
        orderBy: { bankName: 'asc' },
      });

      const masked = list.map((b) => ({
        ...b,
        accountNumber: b.accountNumber.length > 4
          ? `•••• ${b.accountNumber.slice(-4)}`
          : b.accountNumber,
      }));

      res.json(masked);
    } catch (err) {
      next(err);
    }
  }

  public static async createBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const bank = await prisma.bankAccount.create({
        data: {
          tenantId,
          schoolId,
          ...req.body,
        },
        include: { account: true },
      });
      res.status(201).json(bank);
    } catch (err) {
      next(err);
    }
  }

  public static async createBankTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body.idempotencyKey as string);

      const transfer = await FinanceService.createBankTransfer(tenantId, schoolId, {
        ...req.body,
        transferDate: new Date(req.body.transferDate),
        actorUserId: req.user!.id,
        idempotencyKey,
      });

      res.status(201).json(transfer);
    } catch (err) {
      next(err);
    }
  }

  // 17. Bank Statement Import & Reconciliation
  public static async importBankStatement(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const result = await FinanceService.importBankStatement(tenantId, schoolId, {
        bankAccountId: req.body.bankAccountId,
        statementStartDate: new Date(req.body.statementStartDate),
        statementEndDate: new Date(req.body.statementEndDate),
        lines: req.body.lines.map((l: any) => ({
          ...l,
          transactionDate: new Date(l.transactionDate),
        })),
        actorUserId: req.user!.id,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async listStatementLines(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const { bankAccountId, matchStatus } = req.query;

      const lines = await prisma.bankStatementLine.findMany({
        where: {
          bankAccount: { schoolId },
          ...(bankAccountId ? { bankAccountId: String(bankAccountId) } : {}),
          ...(matchStatus ? { status: String(matchStatus) } : {}),
        },
        orderBy: { transactionDate: 'desc' },
      });
      res.json(lines);
    } catch (err) {
      next(err);
    }
  }

  public static async matchStatementLine(req: Request, res: Response, next: NextFunction) {
    try {
      const { statementLineId, journalLineId } = req.body;
      const schoolId = req.schoolId!;

      const stmtLine = await prisma.bankStatementLine.findUnique({
        where: { id: statementLineId },
        include: { bankAccount: true },
      });

      if (!stmtLine || stmtLine.bankAccount.schoolId !== schoolId) {
        throw new NotFoundError('Statement line not found');
      }

      const updated = await prisma.bankStatementLine.update({
        where: { id: statementLineId },
        data: {
          status: 'MATCHED',
          matchedJournalLineId: journalLineId,
          matchedAt: new Date(),
          matchedByUserId: req.user!.id,
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async closeReconciliation(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { bankAccountId, periodEndDate, closingBalanceBank } = req.body;

      const recon = await prisma.bankReconciliation.create({
        data: {
          tenantId,
          schoolId,
          bankAccountId,
          reconciliationDate: new Date(periodEndDate),
          statementClosingBalance: FinanceService.toDecimal(closingBalanceBank),
          bookClosingBalance: new Prisma.Decimal(0),
          difference: new Prisma.Decimal(0),
          status: 'CLOSED',
          closedAt: new Date(),
          closedByUserId: req.user!.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: req.user!.id,
          action: 'BANK_RECONCILIATION_CLOSED',
          entityType: 'BankReconciliation',
          entityId: recon.id,
        },
      });

      res.status(201).json(recon);
    } catch (err) {
      next(err);
    }
  }

  public static async reopenReconciliation(req: Request, res: Response, next: NextFunction) {
    try {
      const reconId = req.params.id as string;
      const schoolId = req.schoolId!;
      const tenantId = req.user!.tenantId;
      const { reason } = req.body;

      if (!reason || reason.trim().length < 3) {
        throw new BadRequestError('Mandatory reason required to reopen bank reconciliation');
      }

      const recon = await prisma.bankReconciliation.findUnique({ where: { id: reconId } });
      if (!recon || recon.schoolId !== schoolId) {
        throw new NotFoundError('Reconciliation record not found');
      }

      const updated = await prisma.bankReconciliation.update({
        where: { id: reconId },
        data: {
          status: 'DRAFT',
          closedAt: null,
          closedByUserId: null,
          reopenedAt: new Date(),
          reopenedByUserId: req.user!.id,
          reopenReason: reason,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: req.user!.id,
          action: 'BANK_RECONCILIATION_REOPENED',
          entityType: 'BankReconciliation',
          entityId: reconId,
          metadataInfo: JSON.stringify({ reason }),
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  // 18. Financial Reports
  public static async getTrialBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const asOfDate = req.query.asOfDate ? new Date(String(req.query.asOfDate)) : new Date();

      const report = await FinanceService.getTrialBalance(tenantId, schoolId, asOfDate);
      res.json(report);
    } catch (err) {
      next(err);
    }
  }

  public static async getProfitAndLoss(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const now = new Date();
      const startDate = req.query.startDate
        ? new Date(String(req.query.startDate))
        : new Date(now.getFullYear(), 0, 1);
      const endDate = req.query.endDate
        ? new Date(String(req.query.endDate))
        : new Date(now.getFullYear(), 11, 31);

      const report = await FinanceService.getProfitAndLoss(tenantId, schoolId, startDate, endDate);
      res.json(report);
    } catch (err) {
      next(err);
    }
  }

  public static async getBalanceSheet(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const asOfDate = req.query.asOfDate ? new Date(String(req.query.asOfDate)) : new Date();

      const report = await FinanceService.getBalanceSheet(tenantId, schoolId, asOfDate);
      res.json(report);
    } catch (err) {
      next(err);
    }
  }

  // 19. Opening Balances
  public static async postOpeningBalances(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { postingDate, description, lines } = req.body;

      const openingEquity = await FinanceService.getSystemAccount(tenantId, schoolId, '3000');

      let totalDebit = new Prisma.Decimal(0);
      let totalCredit = new Prisma.Decimal(0);

      const journalLines: any[] = [];
      for (const l of lines) {
        const d = FinanceService.toDecimal(l.debit);
        const c = FinanceService.toDecimal(l.credit);
        totalDebit = totalDebit.add(d);
        totalCredit = totalCredit.add(c);
        journalLines.push({
          accountId: l.accountId,
          description: l.description || 'Opening Balance',
          debit: d,
          credit: c,
        });
      }

      if (!totalDebit.equals(totalCredit)) {
        if (totalDebit.greaterThan(totalCredit)) {
          journalLines.push({
            accountId: openingEquity.id,
            description: 'Opening Balance Equity Offset',
            debit: new Prisma.Decimal(0),
            credit: totalDebit.sub(totalCredit),
          });
        } else {
          journalLines.push({
            accountId: openingEquity.id,
            description: 'Opening Balance Equity Offset',
            debit: totalCredit.sub(totalDebit),
            credit: new Prisma.Decimal(0),
          });
        }
      }

      const journal = await prisma.$transaction(async (tx) => {
        return await FinanceService.postJournalEntry(tx, {
          tenantId,
          schoolId,
          postingDate: new Date(postingDate),
          description: `Opening Balance Setup: ${description}`,
          sourceType: 'OPENING_BALANCE',
          lines: journalLines,
          actorUserId: req.user!.id,
        });
      });

      res.status(201).json(journal);
    } catch (err) {
      next(err);
    }
  }

  // 20. Parent Access View
  public static async getParentChildFinance(req: Request, res: Response, next: NextFunction) {
    try {
      const parentUserId = req.user!.id;
      const studentId = req.params.studentId as string;
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;

      await FinanceService.assertParentChildAccess(parentUserId, studentId);

      const ledger = await FinanceService.getStudentLedger(tenantId, schoolId, studentId);
      const invoices = await prisma.feeInvoice.findMany({
        where: { schoolId, studentId, status: { notIn: ['CANCELLED', 'REVERSED'] } },
        include: { lines: { include: { feeHead: true } } },
        orderBy: { dueDate: 'asc' },
      });
      const receipts = await prisma.feeReceipt.findMany({
        where: { schoolId, feePayment: { studentId } },
        include: { feePayment: true },
        orderBy: { receiptDate: 'desc' },
      });

      res.json({
        summary: ledger.summary,
        invoices,
        receipts,
        statement: ledger.entries,
      });
    } catch (err) {
      next(err);
    }
  }

  // 21. CSV Export with Audit Log
  public static async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const { exportType } = req.query;

      let csvContent = '';
      if (exportType === 'INVOICES') {
        const invoices = await prisma.feeInvoice.findMany({
          where: { schoolId },
          include: { student: true },
          orderBy: { invoiceDate: 'desc' },
        });
        csvContent = 'Invoice Number,Student,Invoice Date,Due Date,Total,Paid,Outstanding,Status\n';
        for (const i of invoices) {
          csvContent += `"${i.invoiceNumber}","${i.student.firstName} ${i.student.lastName}","${i.invoiceDate.toISOString().split('T')[0]}","${i.dueDate.toISOString().split('T')[0]}","${i.totalAmount}","${i.paidAmount}","${i.outstandingAmount}","${i.status}"\n`;
        }
      } else if (exportType === 'COLLECTIONS') {
        const receipts = await prisma.feeReceipt.findMany({
          where: { schoolId },
          include: { feePayment: { include: { student: true } } },
          orderBy: { receiptDate: 'desc' },
        });
        csvContent = 'Receipt Number,Student,Date,Method,Amount\n';
        for (const r of receipts) {
          csvContent += `"${r.receiptNumber}","${r.feePayment.student.firstName} ${r.feePayment.student.lastName}","${r.receiptDate.toISOString().split('T')[0]}","${r.feePayment.paymentMethod}","${r.feePayment.totalAmount}"\n`;
        }
      } else {
        csvContent = 'Date,Reference,Debit,Credit\n';
      }

      await prisma.auditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: req.user!.id,
          action: 'FINANCE_CSV_EXPORT',
          entityType: 'FinanceExport',
          metadataInfo: JSON.stringify({ exportType: String(exportType || 'GENERAL') }),
        },
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${exportType || 'finance'}_export.csv"`);
      res.send(csvContent);
    } catch (err) {
      next(err);
    }
  }
}
