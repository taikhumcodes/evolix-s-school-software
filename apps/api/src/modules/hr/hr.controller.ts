import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { HrService, ScopeContext } from './hr.service.js';
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  QueryEmployeesSchema,
  CreateBankAccountSchema,
  CreateStaffLeaveTypeSchema,
  UpdateStaffLeaveTypeSchema,
  AllocateEmployeeLeaveSchema,
  InitiateSeparationSchema,
  SettleSeparationSchema,
} from './hr.schema.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../lib/errors.js';

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

export class HrController {
  // 1. Overview Dashboard
  public static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { schoolId } = ctx;

      const [totalEmployees, activeEmployees, probationEmployees, onLeaveEmployees, departmentsCount, designationsCount] = await Promise.all([
        prisma.employee.count({ where: { schoolId } }),
        prisma.employee.count({ where: { schoolId, status: 'ACTIVE' } }),
        prisma.employee.count({ where: { schoolId, status: 'PROBATION' } }),
        prisma.employee.count({ where: { schoolId, status: 'ON_LEAVE' } }),
        prisma.department.count({ where: { schoolId } }),
        prisma.designation.count({ where: { schoolId } }),
      ]);

      res.json({
        totalEmployees,
        activeEmployees,
        probationEmployees,
        onLeaveEmployees,
        departmentsCount,
        designationsCount,
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Employees Master
  public static async listEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const query = QueryEmployeesSchema.parse(req.query);
      const result = await HrService.listEmployees(ctx, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getEmployeeById(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const employee = await HrService.getEmployeeById(ctx, id);
      res.json(employee);
    } catch (err) {
      next(err);
    }
  }

  public static async createEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const input = CreateEmployeeSchema.parse(req.body);
      const employee = await HrService.createEmployee(ctx, input);
      res.status(201).json(employee);
    } catch (err) {
      next(err);
    }
  }

  public static async updateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const input = UpdateEmployeeSchema.parse(req.body);
      const employee = await HrService.updateEmployee(ctx, id, input);
      res.json(employee);
    } catch (err) {
      next(err);
    }
  }

  public static async setEmployeeBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const input = CreateBankAccountSchema.parse(req.body);
      const bankAccount = await HrService.setEmployeeBankAccount(ctx, id, input);
      res.status(201).json(bankAccount);
    } catch (err) {
      next(err);
    }
  }

  // 3. Departments & Designations Reference
  public static async listDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = (req.query.school_id as string) || req.schoolId!;
      const tenantId = req.user!.tenantId;
      const list = await HrService.listDepartments(tenantId, schoolId);
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, code, description } = req.body;
      const dept = await prisma.department.create({
        data: {
          tenantId: req.user!.tenantId,
          schoolId: req.schoolId!,
          name,
          code: code.toUpperCase(),
          description: description || null,
        },
      });
      res.status(201).json(dept);
    } catch (err) {
      next(err);
    }
  }

  public static async listDesignations(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = (req.query.school_id as string) || req.schoolId!;
      const tenantId = req.user!.tenantId;
      const list = await HrService.listDesignations(tenantId, schoolId);
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, code, departmentId, description, displayOrder } = req.body;
      const desig = await prisma.designation.create({
        data: {
          tenantId: req.user!.tenantId,
          schoolId: req.schoolId!,
          departmentId: departmentId || null,
          name,
          code: code.toUpperCase(),
          description: description || null,
          displayOrder: displayOrder || 0,
        },
      });
      res.status(201).json(desig);
    } catch (err) {
      next(err);
    }
  }

  // 4. Leave Policies & Balances
  public static async listStaffLeaveTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const list = await HrService.listStaffLeaveTypes(ctx, false);
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async createStaffLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const input = CreateStaffLeaveTypeSchema.parse(req.body);
      const leaveType = await HrService.createStaffLeaveType(ctx, input);
      res.status(201).json(leaveType);
    } catch (err) {
      next(err);
    }
  }

  public static async updateStaffLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const input = UpdateStaffLeaveTypeSchema.parse(req.body);
      const updated = await prisma.staffLeaveType.update({
        where: { id },
        data: input as any,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async allocateEmployeeLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const input = AllocateEmployeeLeaveSchema.parse(req.body);
      const balance = await HrService.allocateEmployeeLeave(ctx, input);
      res.status(201).json(balance);
    } catch (err) {
      next(err);
    }
  }

  public static async getEmployeeLeaveBalances(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const employeeId = String(req.params.employeeId);
      const { entitlementPeriod } = req.query;

      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, schoolId: ctx.schoolId },
      });
      if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

      const isHrStaff =
        ctx.isSuperAdmin ||
        ctx.permissions?.includes('*') ||
        ctx.permissions?.includes('hr.employee.view') ||
        ctx.permissions?.includes('hr.leave.view') ||
        ctx.permissions?.includes('settings.manage');

      if (!isHrStaff && employee.userId !== ctx.userId) {
        throw new ForbiddenError('ACCESS_DENIED: You are not authorized to view another employee leave balances');
      }

      const balances = await prisma.employeeLeaveBalance.findMany({
        where: {
          employeeId,
          schoolId: ctx.schoolId,
          ...(entitlementPeriod ? { entitlementPeriod: String(entitlementPeriod) } : {}),
        },
        include: { leaveType: true },
        orderBy: { leaveType: { name: 'asc' } },
      });
      res.json(balances);
    } catch (err) {
      next(err);
    }
  }

  public static async getLeaveBalanceHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const employeeId = String(req.params.employeeId);

      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, schoolId: ctx.schoolId },
      });
      if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

      const isHrStaff =
        ctx.isSuperAdmin ||
        ctx.permissions?.includes('*') ||
        ctx.permissions?.includes('hr.employee.view') ||
        ctx.permissions?.includes('hr.leave.view') ||
        ctx.permissions?.includes('settings.manage');

      if (!isHrStaff && employee.userId !== ctx.userId) {
        throw new ForbiddenError('ACCESS_DENIED: You are not authorized to view another employee leave balance history');
      }

      const history = await prisma.leaveBalanceTransaction.findMany({
        where: { employeeId, schoolId: ctx.schoolId },
        include: { leaveType: true, createdByUser: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json(history);
    } catch (err) {
      next(err);
    }
  }

  public static async approveStaffLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const result = await HrService.processLeaveApproval(ctx, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async cancelStaffLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const result = await HrService.processLeaveCancellation(ctx, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 5. Separations
  public static async listSeparations(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.schoolId!;
      const list = await prisma.employeeSeparation.findMany({
        where: { schoolId },
        include: {
          employee: { select: { id: true, employeeNumber: true, displayName: true, department: true, designation: true } },
          settlementPayrollRun: { select: { id: true, runNumber: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async initiateSeparation(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const input = InitiateSeparationSchema.parse(req.body);
      const sep = await HrService.initiateSeparation(ctx, input);
      res.status(201).json(sep);
    } catch (err) {
      next(err);
    }
  }

  public static async settleSeparation(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const input = SettleSeparationSchema.parse(req.body);
      const settled = await HrService.settleSeparation(ctx, id, input);
      res.json(settled);
    } catch (err) {
      next(err);
    }
  }

  // 6. Deletion Safety (Safeguard 1, TEST 09)
  public static async deleteEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const id = String(req.params.id);
      const reason = req.body?.reason ? String(req.body.reason) : undefined;
      const result = await HrService.deleteEmployee(ctx, id, reason);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 7. Documents (Safeguard 2, TEST 10, 11, 12)
  public static async uploadEmployeeDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const employeeId = String(req.params.id);
      const file = req.file;
      if (!file) {
        throw new BadRequestError('FILE_REQUIRED: Document file is required');
      }
      const doc = await HrService.uploadEmployeeDocument(
        ctx,
        employeeId,
        {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        {
          documentType: req.body.documentType || 'OTHER',
          documentNumber: req.body.documentNumber,
          expiryDate: req.body.expiryDate,
        }
      );
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  }

  public static async listEmployeeDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const employeeId = String(req.params.id);
      const docs = await HrService.listEmployeeDocuments(ctx, employeeId);
      res.json(docs);
    } catch (err) {
      next(err);
    }
  }

  public static async getEmployeeDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const employeeId = String(req.params.id);
      const documentId = String(req.params.docId);
      const { doc } = await HrService.getEmployeeDocument(ctx, employeeId, documentId);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  }

  public static async downloadEmployeeDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const employeeId = String(req.params.id);
      const documentId = String(req.params.docId);
      const { doc, buffer } = await HrService.getEmployeeDocument(ctx, employeeId, documentId);
      res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  // 8. Attendance (Safeguard 3, TEST 16)
  public static async getEmployeeAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const employeeId = String(req.params.id);
      const { startDate, endDate } = req.query;
      const result = await HrService.getEmployeeAttendance(ctx, employeeId, {
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 9. Manual Leave Adjustment (Safeguard 4, TEST 25)
  public static async adjustEmployeeLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { employeeId, leaveTypeId, days, reason, entitlementPeriod } = req.body;
      const result = await HrService.adjustEmployeeLeave(ctx, {
        employeeId: employeeId || String(req.params.id || req.params.employeeId),
        leaveTypeId,
        days,
        reason,
        entitlementPeriod,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  // 10. Reports (Safeguards 8, 9, 10, TEST 78, 79)
  public static async getEmployeeRegisterReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { departmentId, designationId, status, joiningDateFrom, joiningDateTo, format } = req.query;
      const report = await HrService.getEmployeeRegisterReport(ctx, {
        departmentId: departmentId ? String(departmentId) : undefined,
        designationId: designationId ? String(designationId) : undefined,
        status: status ? String(status) : undefined,
        joiningDateFrom: joiningDateFrom ? String(joiningDateFrom) : undefined,
        joiningDateTo: joiningDateTo ? String(joiningDateTo) : undefined,
        format: format ? String(format) : undefined,
      });
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="employee-register.csv"');
        return res.send(report.data);
      }
      res.json(report);
    } catch (err) {
      next(err);
    }
  }

  public static async getLeaveBalanceSummaryReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { leaveTypeId, entitlementPeriod, format } = req.query;
      const report = await HrService.getLeaveBalanceSummaryReport(ctx, {
        leaveTypeId: leaveTypeId ? String(leaveTypeId) : undefined,
        entitlementPeriod: entitlementPeriod ? String(entitlementPeriod) : undefined,
        format: format ? String(format) : undefined,
      });
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="leave-balances.csv"');
        return res.send(report.data);
      }
      res.json(report);
    } catch (err) {
      next(err);
    }
  }
}
