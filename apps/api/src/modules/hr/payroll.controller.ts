import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { PayrollService } from './payroll.service.js';
import { ScopeContext } from './hr.service.js';
import {
  CreateSalaryComponentSchema,
  UpdateSalaryComponentSchema,
  CreateSalaryStructureSchema,
  AssignSalaryStructureSchema,
  PayrollConfigurationSchema,
  CreatePayrollPeriodSchema,
  CreatePayrollRunSchema,
  CalculatePayrollRunSchema,
  UpdatePayrollRunStatusSchema,
  PostPayrollRunSchema,
  ReversePayrollRunSchema,
  DisbursePayrollPaymentSchema,
} from './payroll.schema.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';

function getContext(req: Request): ScopeContext {
  const perms = req.user?.permissions;
  const permissions = perms instanceof Set ? Array.from(perms) : (Array.isArray(perms) ? perms : []);
  return {
    tenantId: req.user!.tenantId,
    schoolId: req.schoolId!,
    userId: req.user!.id,
    ipAddress: req.ip,
    permissions,
    isSuperAdmin: (req.user as any)?.isSuperadmin ?? false,
  };
}

export class PayrollController {
  // 1. Salary Components
  public static async listSalaryComponents(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const list = await PayrollService.listSalaryComponents(ctx);
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createSalaryComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const input = CreateSalaryComponentSchema.parse(req.body);
      const component = await PayrollService.createSalaryComponent(ctx, input);
      res.status(201).json(component);
    } catch (err) {
      next(err);
    }
  }

  public static async updateSalaryComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const input = UpdateSalaryComponentSchema.parse(req.body);
      const component = await PayrollService.updateSalaryComponent(ctx, id, input);
      res.json(component);
    } catch (err) {
      next(err);
    }
  }

  // 2. Salary Structures
  public static async listSalaryStructures(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const list = await PayrollService.listSalaryStructures(ctx);
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createSalaryStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const input = CreateSalaryStructureSchema.parse(req.body);
      const structure = await PayrollService.createSalaryStructure(ctx, input);
      res.status(201).json(structure);
    } catch (err) {
      next(err);
    }
  }

  public static async assignSalaryStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const input = AssignSalaryStructureSchema.parse(req.body);
      const assignment = await PayrollService.assignSalaryStructure(ctx, input);
      res.status(201).json(assignment);
    } catch (err) {
      next(err);
    }
  }

  // 3. Payroll Configuration & Periods
  public static async getPayrollConfiguration(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const config = await PayrollService.getPayrollConfiguration(ctx);
      res.json(config);
    } catch (err) {
      next(err);
    }
  }

  public static async updatePayrollConfiguration(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const input = PayrollConfigurationSchema.parse(req.body);
      const config = await PayrollService.updatePayrollConfiguration(ctx, input);
      res.json(config);
    } catch (err) {
      next(err);
    }
  }

  public static async listPayrollPeriods(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { financialYearId } = req.query;
      const list = await PayrollService.listPayrollPeriods(ctx, financialYearId as string);
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createPayrollPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const input = CreatePayrollPeriodSchema.parse(req.body);
      const period = await PayrollService.createPayrollPeriod(ctx, input);
      res.status(201).json(period);
    } catch (err) {
      next(err);
    }
  }

  // 4. Payroll Runs
  public static async listPayrollRuns(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const list = await prisma.payrollRun.findMany({
        where: { schoolId },
        include: {
          period: true,
          journalEntry: { select: { id: true, journalNumber: true } },
          reversalJournalEntry: { select: { id: true, journalNumber: true } },
          approvedByUser: { select: { firstName: true, lastName: true } },
          postedByUser: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async getPayrollRunById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const schoolId = req.schoolId!;
      const run = await prisma.payrollRun.findFirst({
        where: { id, schoolId },
        include: {
          period: true,
          journalEntry: true,
          reversalJournalEntry: true,
          employees: {
            include: {
              employee: {
                select: {
                  id: true,
                  employeeNumber: true,
                  displayName: true,
                  department: true,
                  designation: true,
                },
              },
              lineItems: true,
              paymentAllocations: {
                include: { payrollPayment: true },
              },
            },
            orderBy: { employee: { employeeNumber: 'asc' } },
          },
          payments: {
            include: {
              allocations: true,
              journalEntry: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!run) throw new NotFoundError(`PayrollRun ${id} not found`);
      res.json(run);
    } catch (err) {
      next(err);
    }
  }

  public static async createPayrollRun(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const input = CreatePayrollRunSchema.parse(req.body);
      const run = await PayrollService.createPayrollRun(ctx, input);
      res.status(201).json(run);
    } catch (err) {
      next(err);
    }
  }

  public static async calculatePayrollRun(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const input = CalculatePayrollRunSchema.parse(req.body || {});
      const result = await PayrollService.calculatePayrollRun(ctx, id, input.employeeIds);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async updatePayrollRunStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const input = UpdatePayrollRunStatusSchema.parse(req.body);
      const result = await PayrollService.updatePayrollRunStatus(ctx, id, input);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async postPayrollRun(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = getContext(req);
    const id = String(req.params.id);
    // Verify payroll run exists for the current school
    const run = await prisma.payrollRun.findFirst({
      where: { id, schoolId: ctx.schoolId },
    });
    if (!run) {
      throw new NotFoundError(`PayrollRun ${id} not found`);
    }
    const input = PostPayrollRunSchema.parse(req.body);
    const result = await PayrollService.postPayrollRun(ctx, id, input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

  public static async reversePayrollRun(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const input = ReversePayrollRunSchema.parse(req.body);
      const result = await PayrollService.reversePayrollRun(ctx, id, input);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async disbursePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const input = DisbursePayrollPaymentSchema.parse(req.body);
      const result = await PayrollService.disbursePayrollPayment(ctx, id, input);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  // 5. Payslips
  public static async getPayslip(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const payrollRunId = req.query.payrollRunId ? String(req.query.payrollRunId) : undefined;
      const payslip = await PayrollService.getPayslip(ctx, id, payrollRunId);
      res.json(payslip);
    } catch (err) {
      next(err);
    }
  }

  public static async listMyPayslips(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const employee = await prisma.employee.findFirst({
        where: { schoolId: ctx.schoolId, userId: ctx.userId },
      });

      if (!employee) {
        return res.json([]);
      }

      const runs = await prisma.payrollRunEmployee.findMany({
        where: {
          employeeId: employee.id,
          payrollRun: {
            schoolId: ctx.schoolId,
            status: { in: ['POSTED', 'PAID', 'CLOSED'] },
          },
        },
        include: {
          payrollRun: { include: { period: true } },
          lineItems: true,
        },
        orderBy: { payrollRun: { period: { startDate: 'desc' } } },
      });

      const data = runs.map((r) => ({
        id: r.id,
        runNumber: r.payrollRun.runNumber,
        periodName: r.payrollRun.period.periodName,
        payDate: r.payrollRun.period.payDate,
        grossEarnings: r.grossEarnings,
        totalDeductions: r.totalDeductions,
        netPay: r.netPay,
        paymentStatus: r.paymentStatus,
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 7. Reports (Safeguards 8, 16, TEST 80, 81, 82)
  public static async getPayrollRegisterReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { periodId, runId, format } = req.query;
      const report = await PayrollService.getPayrollRegisterReport(ctx, {
        periodId: periodId ? String(periodId) : undefined,
        runId: runId ? String(runId) : undefined,
        format: format ? String(format) : undefined,
      });
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="payroll-register.csv"');
        return res.send(report.data);
      }
      res.json(report);
    } catch (err) {
      next(err);
    }
  }

  public static async getGlReconciliationReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const runId = String(req.params.id || req.params.runId);
      const report = await PayrollService.getGlReconciliationReport(ctx, runId);
      res.json(report);
    } catch (err) {
      next(err);
    }
  }
}
