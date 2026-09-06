import path from 'node:path';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { encryptSecret, decryptSecret } from '../../lib/crypto.js';
import { FinanceService } from '../finance/finance.service.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { getStorageProvider } from '../../services/storage.service.js';

export interface ScopeContext {
  tenantId: string;
  schoolId: string;
  userId: string;
  ipAddress?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
}

export class HrService {
  /**
   * Mask sensitive bank account number: e.g. "•••• 4821"
   */
  public static maskAccountNumber(accountNumber: string): string {
    const trimmed = (accountNumber || '').trim();
    if (trimmed.length <= 4) {
      return '••••';
    }
    return `•••• ${trimmed.slice(-4)}`;
  }

  // =========================================================================
  // EMPLOYEE MASTER DATA
  // =========================================================================

  /**
   * Create new employee with sequential atomic employeeNumber and encrypted bank details
   */
  public static async createEmployee(
    ctx: ScopeContext,
    input: any
  ): Promise<any> {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    // Check email uniqueness within school
    const existingEmail = await prisma.employee.findFirst({
      where: { schoolId, email: input.email },
    });
    if (existingEmail) {
      throw new ConflictError(`EMPLOYEE_EMAIL_EXISTS: An employee with email ${input.email} already exists in this school`);
    }

    // Check userId linkage uniqueness
    if (input.userId) {
      const existingUser = await prisma.employee.findUnique({
        where: { userId: input.userId },
      });
      if (existingUser) {
        throw new ConflictError(`USER_ALREADY_LINKED_TO_EMPLOYEE: User ${input.userId} is already linked to another employee`);
      }
    }

    return await prisma.$transaction(async (tx) => {
      // Atomic sequential employee number
      const employeeNumber = await FinanceService.getNextNumber(
        tenantId,
        schoolId,
        'EMPLOYEE',
        'EMP-{YYYY}-',
        6,
        tx
      );

      const displayName = input.displayName || `${input.firstName} ${input.lastName}`.trim();

      const employee = await tx.employee.create({
        data: {
          tenantId,
          schoolId,
          employeeNumber,
          userId: input.userId || null,
          firstName: input.firstName,
          middleName: input.middleName || null,
          lastName: input.lastName,
          displayName,
          gender: input.gender || null,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          phone: input.phone,
          alternatePhone: input.alternatePhone || null,
          email: input.email,
          permanentAddress: input.permanentAddress || null,
          currentAddress: input.currentAddress || null,
          emergencyContactName: input.emergencyContactName || null,
          emergencyContactPhone: input.emergencyContactPhone || null,
          emergencyContactRelation: input.emergencyContactRelation || null,
          bloodGroup: input.bloodGroup || null,
          maritalStatus: input.maritalStatus || null,
          nationality: input.nationality || 'Indian',
          joiningDate: new Date(input.joiningDate),
          confirmationDate: input.confirmationDate ? new Date(input.confirmationDate) : null,
          probationPeriodMonths: input.probationPeriodMonths || null,
          employmentType: input.employmentType || 'PERMANENT',
          departmentId: input.departmentId || null,
          designationId: input.designationId || null,
          reportingManagerId: input.reportingManagerId || null,
          status: input.status || 'ACTIVE',
        },
      });

      // Initial EmploymentHistory record (TEST 01, Safeguard 12)
      let desigName = 'Staff';
      if (input.designationId) {
        const d = await tx.designation.findUnique({ where: { id: input.designationId } });
        if (d) desigName = d.name;
      }
      let deptName: string | null = null;
      if (input.departmentId) {
        const d = await tx.department.findUnique({ where: { id: input.departmentId } });
        if (d) deptName = d.name;
      }

      await tx.employmentHistory.create({
        data: {
          tenantId,
          schoolId,
          employeeId: employee.id,
          companyName: 'EVOLIX School',
          designation: desigName,
          department: deptName,
          startDate: new Date(input.joiningDate),
          remarks: 'Initial appointment',
        },
      });

      // Bank account if provided
      if (input.bankAccount && input.bankAccount.accountNumber) {
        const rawAcc = input.bankAccount.accountNumber.trim();
        const encryptedAccountNumber = encryptSecret(rawAcc);
        const maskedAccountNumber = HrService.maskAccountNumber(rawAcc);

        await tx.employeeBankAccount.create({
          data: {
            tenantId,
            schoolId,
            employeeId: employee.id,
            accountHolderName: input.bankAccount.accountHolderName || displayName,
            bankName: input.bankAccount.bankName,
            branchName: input.bankAccount.branchName || null,
            encryptedAccountNumber,
            maskedAccountNumber,
            ifscCode: input.bankAccount.ifscCode,
            accountType: input.bankAccount.accountType || 'SAVINGS',
            isPrimary: input.bankAccount.isPrimary ?? true,
          },
        });
      }

      // Emergency contacts if provided
      if (input.emergencyContacts && Array.isArray(input.emergencyContacts)) {
        for (const ec of input.emergencyContacts) {
          await tx.employeeEmergencyContact.create({
            data: {
              tenantId,
              schoolId,
              employeeId: employee.id,
              name: ec.name,
              relation: ec.relation,
              phone: ec.phone,
              alternatePhone: ec.alternatePhone || null,
              email: ec.email || null,
              address: ec.address || null,
              isPrimary: ec.isPrimary ?? false,
            },
          });
        }
      }

      // Audit log (sanitized, no full bank account or private credentials)
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'EMPLOYEE_CREATED',
        entityType: 'Employee',
        entityId: employee.id,
        beforeData: null,
        afterData: {
          employeeNumber,
          displayName,
          departmentId: employee.departmentId,
          designationId: employee.designationId,
          status: employee.status,
          joiningDate: employee.joiningDate,
        },
        metadataInfo: { actorUserId: userId },
        ipAddress,
      });

      return employee;
    });
  }

  /**
   * Update employee profile
   */
  public static async updateEmployee(
    ctx: ScopeContext,
    employeeId: string,
    input: any
  ): Promise<any> {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const existing = await prisma.employee.findFirst({
      where: { id: employeeId, schoolId, tenantId },
      include: { bankAccounts: true },
    });
    if (!existing) {
      throw new NotFoundError(`Employee ${employeeId} not found`);
    }

    if (input.email && input.email !== existing.email) {
      const emailConflict = await prisma.employee.findFirst({
        where: { schoolId, email: input.email, id: { not: employeeId } },
      });
      if (emailConflict) {
        throw new ConflictError(`EMPLOYEE_EMAIL_EXISTS: Email ${input.email} is already in use`);
      }
    }

    if (input.userId && input.userId !== existing.userId) {
      const userConflict = await prisma.employee.findUnique({
        where: { userId: input.userId },
      });
      if (userConflict && userConflict.id !== employeeId) {
        throw new ConflictError(`USER_ALREADY_LINKED_TO_EMPLOYEE: User ${input.userId} is already linked to another employee`);
      }
    }

    return await prisma.$transaction(async (tx) => {
      const isDesignationChanged = input.designationId !== undefined && input.designationId !== existing.designationId;
      const isDepartmentChanged = input.departmentId !== undefined && input.departmentId !== existing.departmentId;
      const isStatusChanged = input.status !== undefined && input.status !== existing.status;
      const isTypeChanged = input.employmentType !== undefined && input.employmentType !== existing.employmentType;

      const transitionDate = input.effectiveDate ? new Date(input.effectiveDate) : new Date();

      if (isDesignationChanged || isDepartmentChanged || isStatusChanged || isTypeChanged) {
        // Resolve target designation and department names
        let newDesigName = 'Staff';
        const targetDesigId = input.designationId !== undefined ? input.designationId : existing.designationId;
        if (targetDesigId) {
          const d = await tx.designation.findUnique({ where: { id: targetDesigId } });
          if (d) newDesigName = d.name;
        }

        let newDeptName: string | null = null;
        const targetDeptId = input.departmentId !== undefined ? input.departmentId : existing.departmentId;
        if (targetDeptId) {
          const d = await tx.department.findUnique({ where: { id: targetDeptId } });
          if (d) newDeptName = d.name;
        }

        // Close currently active history record
        await tx.employmentHistory.updateMany({
          where: { employeeId, endDate: null },
          data: { endDate: transitionDate },
        });

        // Insert new historical record
        const changeReasons: string[] = [];
        if (isDesignationChanged) changeReasons.push('Designation change');
        if (isDepartmentChanged) changeReasons.push('Department transfer');
        if (isStatusChanged) changeReasons.push(`Status changed to ${input.status}`);
        if (isTypeChanged) changeReasons.push(`Type changed to ${input.employmentType}`);

        await tx.employmentHistory.create({
          data: {
            tenantId,
            schoolId,
            employeeId,
            companyName: 'EVOLIX School',
            designation: newDesigName,
            department: newDeptName,
            startDate: transitionDate,
            remarks: changeReasons.join(', ') || 'Profile update transition',
          },
        });
      }

      const updated = await tx.employee.update({
        where: { id: employeeId },
        data: {
          firstName: input.firstName,
          middleName: input.middleName,
          lastName: input.lastName,
          displayName: input.displayName || (input.firstName ? `${input.firstName} ${input.lastName || existing.lastName}`.trim() : undefined),
          gender: input.gender,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          phone: input.phone,
          alternatePhone: input.alternatePhone,
          email: input.email,
          permanentAddress: input.permanentAddress,
          currentAddress: input.currentAddress,
          emergencyContactName: input.emergencyContactName,
          emergencyContactPhone: input.emergencyContactPhone,
          emergencyContactRelation: input.emergencyContactRelation,
          bloodGroup: input.bloodGroup,
          maritalStatus: input.maritalStatus,
          nationality: input.nationality,
          confirmationDate: input.confirmationDate ? new Date(input.confirmationDate) : undefined,
          probationPeriodMonths: input.probationPeriodMonths,
          employmentType: input.employmentType,
          departmentId: input.departmentId,
          designationId: input.designationId,
          reportingManagerId: input.reportingManagerId,
          status: input.status,
          exitDate: input.exitDate ? new Date(input.exitDate) : undefined,
          exitReason: input.exitReason,
          userId: input.userId !== undefined ? input.userId : undefined,
        },
        include: {
          department: true,
          designation: true,
          bankAccounts: {
            select: {
              id: true,
              accountHolderName: true,
              bankName: true,
              branchName: true,
              maskedAccountNumber: true,
              ifscCode: true,
              accountType: true,
              isPrimary: true,
              isVerified: true,
            },
          },
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'EMPLOYEE_UPDATED',
        entityType: 'Employee',
        entityId: employeeId,
        beforeData: { status: existing.status, departmentId: existing.departmentId, designationId: existing.designationId },
        afterData: { status: updated.status, departmentId: updated.departmentId, designationId: updated.designationId },
        metadataInfo: { actorUserId: userId },
        ipAddress,
      });

      return updated;
    });
  }

  /**
   * Get employee by ID with masked bank accounts & salary confidentiality
   */
  public static async getEmployeeById(
    ctx: ScopeContext,
    employeeId: string
  ): Promise<any> {
    const { schoolId, userId, permissions, isSuperAdmin } = ctx;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, schoolId },
      include: {
        department: true,
        designation: true,
        reportingManager: {
          select: { id: true, employeeNumber: true, displayName: true },
        },
        directReports: {
          select: { id: true, employeeNumber: true, displayName: true, status: true },
        },
        emergencyContacts: true,
        documents: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
            expiryDate: true,
            isVerified: true,
            createdAt: true,
          },
        },
        employmentHistories: {
          orderBy: { startDate: 'desc' },
        },
        bankAccounts: {
          select: {
            id: true,
            accountHolderName: true,
            bankName: true,
            branchName: true,
            maskedAccountNumber: true,
            ifscCode: true,
            accountType: true,
            isPrimary: true,
            isVerified: true,
            createdAt: true,
          },
        },
        salaryAssignments: {
          where: { isCurrent: true },
          include: { salaryStructure: true },
        },
        leaveBalances: {
          include: { leaveType: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError(`Employee ${employeeId} not found`);
    }

    // General HR authorization check (Safeguard 9, TEST 72, 73)
    const hasHrView =
      isSuperAdmin ||
      permissions?.includes('*') ||
      permissions?.includes('hr.employee.view') ||
      permissions?.includes('hr.view') ||
      permissions?.includes('settings.manage');

    if (!hasHrView && employee.userId !== userId) {
      throw new ForbiddenError('You are not authorized to view another employee profile');
    }

    // Salary confidentiality (Safeguard 9, TEST 76)
    // Users without payroll.view must NOT receive confidential salary data
    const hasPayrollView =
      isSuperAdmin ||
      permissions?.includes('*') ||
      permissions?.includes('payroll.view') ||
      permissions?.includes('payroll.run.view') ||
      permissions?.includes('payroll.salary.manage');

    const result: any = { ...employee };
    if (!hasPayrollView && employee.userId !== userId) {
      delete result.salaryAssignments;
    }

    return result;
  }

  /**
   * List employees with filtering and pagination
   */
  public static async listEmployees(
    ctx: ScopeContext,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      departmentId?: string;
      designationId?: string;
      status?: string;
      employmentType?: string;
    }
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const { schoolId } = ctx;
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {
      schoolId,
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.designationId ? { designationId: query.designationId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.employmentType ? { employmentType: query.employmentType } : {}),
      ...(query.search
        ? {
            OR: [
              { employeeNumber: { contains: query.search, mode: 'insensitive' } },
              { displayName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: true,
          designation: true,
          bankAccounts: {
            select: {
              id: true,
              bankName: true,
              maskedAccountNumber: true,
              ifscCode: true,
              isPrimary: true,
            },
          },
          salaryAssignments: {
            where: { isCurrent: true },
            select: { baseSalary: true, salaryStructure: { select: { id: true, name: true, code: true } } },
          },
        },
        orderBy: { employeeNumber: 'asc' },
      }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Add or update employee bank account (with AES-128-CBC + HMAC encryption)
   */
  public static async setEmployeeBankAccount(
    ctx: ScopeContext,
    employeeId: string,
    input: any
  ): Promise<any> {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, schoolId },
    });
    if (!employee) {
      throw new NotFoundError(`Employee ${employeeId} not found`);
    }

    const rawAcc = (input.accountNumber || '').trim();
    if (!rawAcc) {
      throw new BadRequestError('ACCOUNT_NUMBER_REQUIRED: Valid bank account number is required');
    }

    const encryptedAccountNumber = encryptSecret(rawAcc);
    const maskedAccountNumber = HrService.maskAccountNumber(rawAcc);

    return await prisma.$transaction(async (tx) => {
      // If primary, set other accounts of this employee to non-primary
      if (input.isPrimary) {
        await tx.employeeBankAccount.updateMany({
          where: { employeeId },
          data: { isPrimary: false },
        });
      }

      const bankAcc = await tx.employeeBankAccount.create({
        data: {
          tenantId,
          schoolId,
          employeeId,
          accountHolderName: input.accountHolderName || employee.displayName,
          bankName: input.bankName,
          branchName: input.branchName || null,
          encryptedAccountNumber,
          maskedAccountNumber,
          ifscCode: input.ifscCode,
          accountType: input.accountType || 'SAVINGS',
          isPrimary: input.isPrimary ?? true,
        },
        select: {
          id: true,
          accountHolderName: true,
          bankName: true,
          branchName: true,
          maskedAccountNumber: true,
          ifscCode: true,
          accountType: true,
          isPrimary: true,
          isVerified: true,
          createdAt: true,
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'EMPLOYEE_BANK_ACCOUNT_UPDATED',
        entityType: 'EmployeeBankAccount',
        entityId: bankAcc.id,
        beforeData: null,
        afterData: {
          employeeId,
          bankName: bankAcc.bankName,
          maskedAccountNumber,
          isPrimary: bankAcc.isPrimary,
        },
        metadataInfo: { actorUserId: userId },
        ipAddress,
      });

      return bankAcc;
    });
  }

  // =========================================================================
  // LEAVE POLICY & BALANCE LEDGER
  // =========================================================================

  /**
   * List staff leave types
   */
  public static async listStaffLeaveTypes(
    ctx: ScopeContext,
    isActiveOnly: boolean = true
  ): Promise<any[]> {
    const { schoolId } = ctx;
    return await prisma.staffLeaveType.findMany({
      where: {
        schoolId,
        ...(isActiveOnly ? { isActive: true } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create staff leave type
   */
  public static async createStaffLeaveType(
    ctx: ScopeContext,
    input: any
  ): Promise<any> {
    const { tenantId, schoolId } = ctx;

    const existing = await prisma.staffLeaveType.findFirst({
      where: { schoolId, code: input.code },
    });
    if (existing) {
      throw new ConflictError(`LEAVE_TYPE_EXISTS: Leave type with code ${input.code} already exists`);
    }

    return await prisma.staffLeaveType.create({
      data: {
        tenantId,
        schoolId,
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description || null,
        category: input.category || 'CASUAL',
        annualQuota: FinanceService.toDecimal(input.annualQuota),
        accrualFrequency: input.accrualFrequency || 'ANNUAL',
        allowCarryForward: input.allowCarryForward ?? false,
        maxCarryForwardDays: input.maxCarryForwardDays ? FinanceService.toDecimal(input.maxCarryForwardDays) : null,
        allowEncashment: input.allowEncashment ?? false,
        isUnpaid: input.isUnpaid ?? false,
        requiresApproval: input.requiresApproval ?? true,
        isActive: input.isActive ?? true,
      },
    });
  }

  /**
   * Allocate leave to employee with immutable LeaveBalanceTransaction
   */
  public static async allocateEmployeeLeave(
    ctx: ScopeContext,
    input: {
      employeeId: string;
      leaveTypeId: string;
      entitlementPeriod: string;
      allocatedDays: number | string | Prisma.Decimal;
      carryForwardDays?: number | string | Prisma.Decimal;
      remarks?: string;
    }
  ): Promise<any> {
    const { tenantId, schoolId, userId } = ctx;

    const [employee, leaveType] = await Promise.all([
      prisma.employee.findFirst({ where: { id: input.employeeId, schoolId } }),
      prisma.staffLeaveType.findFirst({ where: { id: input.leaveTypeId, schoolId } }),
    ]);

    if (!employee) throw new NotFoundError(`Employee ${input.employeeId} not found`);
    if (!leaveType) throw new NotFoundError(`LeaveType ${input.leaveTypeId} not found`);

    const allocatedDays = FinanceService.toDecimal(input.allocatedDays);
    const carryForwardDays = FinanceService.toDecimal(input.carryForwardDays || 0);

    return await prisma.$transaction(async (tx) => {
      let balance = await tx.employeeLeaveBalance.findUnique({
        where: {
          schoolId_employeeId_leaveTypeId_entitlementPeriod: {
            schoolId,
            employeeId: input.employeeId,
            leaveTypeId: input.leaveTypeId,
            entitlementPeriod: input.entitlementPeriod,
          },
        },
      });

      if (!balance) {
        const closingBalance = allocatedDays.add(carryForwardDays);
        balance = await tx.employeeLeaveBalance.create({
          data: {
            tenantId,
            schoolId,
            employeeId: input.employeeId,
            leaveTypeId: input.leaveTypeId,
            entitlementPeriod: input.entitlementPeriod,
            allocatedDays,
            carryForwardDays,
            usedDays: new Prisma.Decimal(0),
            pendingDays: new Prisma.Decimal(0),
            closingBalance,
          },
        });
      } else {
        const newAllocated = balance.allocatedDays.add(allocatedDays);
        const newClosing = balance.closingBalance.add(allocatedDays);
        balance = await tx.employeeLeaveBalance.update({
          where: { id: balance.id },
          data: {
            allocatedDays: newAllocated,
            closingBalance: newClosing,
          },
        });
      }

      // Record immutable balance transaction
      await tx.leaveBalanceTransaction.create({
        data: {
          tenantId,
          schoolId,
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          entitlementPeriod: input.entitlementPeriod,
          transactionType: 'ALLOCATION',
          days: allocatedDays,
          balanceAfter: balance.closingBalance,
          sourceType: 'MANUAL_ADJUSTMENT',
          sourceId: balance.id,
          remarks: input.remarks || 'Annual/Manual leave allocation',
          createdByUserId: userId,
        },
      });

      return balance;
    });
  }

  /**
   * Process StaffLeave approval with authoritative balance deduction idempotency
   */
  public static async processLeaveApproval(
    ctx: ScopeContext,
    staffLeaveId: string,
    entitlementPeriod: string = 'AY-2026-27'
  ): Promise<any> {
    const { tenantId, schoolId, userId } = ctx;

    const staffLeave = await prisma.staffLeave.findFirst({
      where: { id: staffLeaveId, schoolId },
    });
    if (!staffLeave) {
      throw new NotFoundError(`StaffLeave ${staffLeaveId} not found`);
    }

    // Check if already approved
    if (staffLeave.status === 'APPROVED') {
      return { status: 'APPROVED', message: 'Leave already approved' };
    }

    // Resolve employee linked to user or employee id
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffLeave.userId);
    const employee = await prisma.employee.findFirst({
      where: {
        schoolId,
        ...(isUserUuid ? { OR: [{ userId: staffLeave.userId }, { id: staffLeave.userId }] } : { employeeNumber: staffLeave.userId }),
      },
    });
    if (!employee) {
      throw new NotFoundError(`Employee profile for user ${staffLeave.userId} not found`);
    }

    // Resolve leave type
    const isTypeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffLeave.leaveType);
    const leaveType = await prisma.staffLeaveType.findFirst({
      where: {
        schoolId,
        ...(isTypeUuid ? { OR: [{ code: staffLeave.leaveType }, { id: staffLeave.leaveType }] } : { code: staffLeave.leaveType }),
      },
    });

    // Calculate duration in days
    const start = new Date(staffLeave.startDate);
    const end = new Date(staffLeave.endDate);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
    const daysToDeduct = new Prisma.Decimal(diffDays);

    return await prisma.$transaction(async (tx) => {
      // Idempotency check: prevent duplicate balance transaction
      const existingTx = await tx.leaveBalanceTransaction.findFirst({
        where: {
          schoolId,
          sourceType: 'STAFF_LEAVE',
          sourceId: staffLeaveId,
          transactionType: 'LEAVE_TAKEN',
        },
      });

      if (!existingTx && leaveType && !leaveType.isUnpaid) {
        // Find employee leave balance
        const balance = await tx.employeeLeaveBalance.findFirst({
          where: {
            schoolId,
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (balance) {
          const newUsed = balance.usedDays.add(daysToDeduct);
          const newClosing = balance.closingBalance.sub(daysToDeduct);

          await tx.employeeLeaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: newUsed,
              closingBalance: newClosing,
            },
          });

          await tx.leaveBalanceTransaction.create({
            data: {
              tenantId,
              schoolId,
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              entitlementPeriod,
              transactionType: 'LEAVE_TAKEN',
              days: daysToDeduct.negated(),
              balanceAfter: newClosing,
              sourceType: 'STAFF_LEAVE',
              sourceId: staffLeaveId,
              remarks: `Approved leave: ${staffLeave.reason.slice(0, 100)}`,
              createdByUserId: userId,
            },
          });
        }
      }

      // Mark staff leave as approved
      const updatedLeave = await tx.staffLeave.update({
        where: { id: staffLeaveId },
        data: {
          status: 'APPROVED',
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });

      return updatedLeave;
    });
  }

  /**
   * Process StaffLeave cancellation with authoritative balance restoration idempotency
   */
  public static async processLeaveCancellation(
    ctx: ScopeContext,
    staffLeaveId: string,
    entitlementPeriod: string = 'AY-2026-27'
  ): Promise<any> {
    const { tenantId, schoolId, userId } = ctx;

    const staffLeave = await prisma.staffLeave.findFirst({
      where: { id: staffLeaveId, schoolId },
    });
    if (!staffLeave) {
      throw new NotFoundError(`StaffLeave ${staffLeaveId} not found`);
    }

    if (staffLeave.status === 'CANCELLED') {
      return { status: 'CANCELLED', message: 'Leave already cancelled' };
    }

    const wasApproved = staffLeave.status === 'APPROVED';

    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffLeave.userId);
    const employee = await prisma.employee.findFirst({
      where: {
        schoolId,
        ...(isUserUuid ? { OR: [{ userId: staffLeave.userId }, { id: staffLeave.userId }] } : { employeeNumber: staffLeave.userId }),
      },
    });
    const isTypeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffLeave.leaveType);
    const leaveType = await prisma.staffLeaveType.findFirst({
      where: {
        schoolId,
        ...(isTypeUuid ? { OR: [{ code: staffLeave.leaveType }, { id: staffLeave.leaveType }] } : { code: staffLeave.leaveType }),
      },
    });

    const start = new Date(staffLeave.startDate);
    const end = new Date(staffLeave.endDate);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
    const daysToRestore = new Prisma.Decimal(diffDays);

    return await prisma.$transaction(async (tx) => {
      // Check if restoration was already posted
      const existingRestoration = await tx.leaveBalanceTransaction.findFirst({
        where: {
          schoolId,
          sourceType: 'STAFF_LEAVE',
          sourceId: staffLeaveId,
          transactionType: 'LEAVE_CANCELLED',
        },
      });

      if (!existingRestoration && wasApproved && employee && leaveType && !leaveType.isUnpaid) {
        const balance = await tx.employeeLeaveBalance.findFirst({
          where: {
            schoolId,
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (balance) {
          const newUsed = Prisma.Decimal.max(new Prisma.Decimal(0), balance.usedDays.sub(daysToRestore));
          const newClosing = balance.closingBalance.add(daysToRestore);

          await tx.employeeLeaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: newUsed,
              closingBalance: newClosing,
            },
          });

          await tx.leaveBalanceTransaction.create({
            data: {
              tenantId,
              schoolId,
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              entitlementPeriod,
              transactionType: 'LEAVE_CANCELLED',
              days: daysToRestore,
              balanceAfter: newClosing,
              sourceType: 'STAFF_LEAVE',
              sourceId: staffLeaveId,
              remarks: 'Restoration upon leave cancellation',
              createdByUserId: userId,
            },
          });
        }
      }

      return await tx.staffLeave.update({
        where: { id: staffLeaveId },
        data: {
          status: 'CANCELLED',
        },
      });
    });
  }

  // =========================================================================
  // SEPARATION & SETTLEMENT PREVIEW
  // =========================================================================

  /**
   * Initiate employee separation
   */
  public static async initiateSeparation(
    ctx: ScopeContext,
    input: any
  ): Promise<any> {
    const { tenantId, schoolId, userId } = ctx;

    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, schoolId },
    });
    if (!employee) throw new NotFoundError(`Employee ${input.employeeId} not found`);

    return await prisma.$transaction(async (tx) => {
      const separation = await tx.employeeSeparation.create({
        data: {
          tenantId,
          schoolId,
          employeeId: input.employeeId,
          noticeDate: new Date(input.noticeDate),
          resignationDate: input.resignationDate ? new Date(input.resignationDate) : null,
          expectedLastWorkingDate: new Date(input.expectedLastWorkingDate),
          separationType: input.separationType || 'RESIGNATION',
          reason: input.reason,
          status: 'INITIATED',
          initiatedByUserId: userId,
        },
      });

      await tx.employee.update({
        where: { id: input.employeeId },
        data: { status: 'NOTICE_PERIOD' },
      });

      return separation;
    });
  }

  /**
   * Settle employee separation preview (does not mutate GL directly; flows through payroll)
   */
  public static async settleSeparation(
    ctx: ScopeContext,
    separationId: string,
    input: any
  ): Promise<any> {
    const { schoolId, userId } = ctx;

    const separation = await prisma.employeeSeparation.findFirst({
      where: { id: separationId, schoolId },
    });
    if (!separation) throw new NotFoundError(`Separation ${separationId} not found`);

    const gratuity = FinanceService.toDecimal(input.gratuityAmount);
    const encashment = FinanceService.toDecimal(input.encashmentAmount);
    const noticePay = FinanceService.toDecimal(input.noticePayAmount);
    const otherAdd = FinanceService.toDecimal(input.otherAdditions);
    const otherDed = FinanceService.toDecimal(input.otherDeductions);

    const finalPayable = gratuity.add(encashment).add(noticePay).add(otherAdd).sub(otherDed);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.employeeSeparation.update({
        where: { id: separationId },
        data: {
          actualLastWorkingDate: new Date(input.actualLastWorkingDate),
          gratuityAmount: gratuity,
          encashmentAmount: encashment,
          noticePayAmount: noticePay,
          otherAdditions: otherAdd,
          otherDeductions: otherDed,
          finalPayableAmount: finalPayable,
          status: 'SETTLED',
          settledByUserId: userId,
          settledAt: new Date(),
          remarks: input.remarks || null,
        },
      });

      await tx.employee.update({
        where: { id: separation.employeeId },
        data: {
          status: 'RESIGNED',
          exitDate: new Date(input.actualLastWorkingDate),
          exitReason: separation.reason,
        },
      });

      // Close active employment history on separation (TEST 69, Safeguard 12)
      await tx.employmentHistory.updateMany({
        where: { employeeId: separation.employeeId, endDate: null },
        data: {
          endDate: new Date(input.actualLastWorkingDate),
          remarks: `Separation settled: ${separation.reason}`,
        },
      });

      return updated;
    });
  }

  // =========================================================================
  // EMPLOYEE DELETION / ARCHIVE SAFETY (Safeguard 1, TEST 09, 70)
  // =========================================================================

  /**
   * Delete or archive employee
   * If employee has ANY history, payroll, salary, documents, separations, hard delete is strictly BLOCKED.
   */
  public static async deleteEmployee(
    ctx: ScopeContext,
    employeeId: string,
    reason?: string
  ): Promise<any> {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, schoolId, tenantId },
      include: {
        employmentHistories: true,
        salaryAssignments: true,
        payrollRunEmployees: true,
        documents: true,
        separations: true,
      },
    });

    if (!employee) {
      throw new NotFoundError(`Employee ${employeeId} not found`);
    }

    const hasPayrollHistory = employee.payrollRunEmployees.length > 0;
    const hasEmploymentHistory = employee.employmentHistories.length > 1; // More than initial appointment
    const hasSalaryHistory = employee.salaryAssignments.length > 0;
    const hasDocuments = employee.documents.length > 0;
    const hasSeparations = employee.separations.length > 0;

    if (hasPayrollHistory || hasEmploymentHistory || hasSalaryHistory || hasDocuments || hasSeparations) {
      throw new BadRequestError(
        'EMPLOYEE_CANNOT_BE_DELETED: Cannot physically delete employee with employment, payroll, or document history. Use Archive or Separation workflow instead.'
      );
    }

    return await prisma.$transaction(async (tx) => {
      await tx.employmentHistory.deleteMany({ where: { employeeId } });
      await tx.employeeBankAccount.deleteMany({ where: { employeeId } });
      await tx.employeeEmergencyContact.deleteMany({ where: { employeeId } });
      await tx.employee.delete({ where: { id: employeeId } });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'EMPLOYEE_DELETED',
        entityType: 'Employee',
        entityId: employeeId,
        beforeData: { employeeNumber: employee.employeeNumber, displayName: employee.displayName },
        afterData: null,
        metadataInfo: { actorUserId: userId, reason: reason || 'Pristine record cleanup' },
        ipAddress,
      });

      return { success: true, message: 'Employee record successfully removed' };
    });
  }

  // =========================================================================
  // DOCUMENT MANAGEMENT & PRIVACY (Safeguard 2, TEST 10, 11, 12)
  // =========================================================================

  /**
   * Upload employee document with extension, MIME, and magic bytes validation
   */
  public static async uploadEmployeeDocument(
    ctx: ScopeContext,
    employeeId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    meta: {
      documentType: string;
      documentNumber?: string;
      expiryDate?: string;
    }
  ): Promise<any> {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, schoolId, tenantId },
    });
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    // Verify extension
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExts.includes(ext)) {
      throw new BadRequestError(`INVALID_DOCUMENT_FORMAT: Extension "${ext}" is not permitted. Allowed: PDF, PNG, JPEG, WebP`);
    }

    // Verify MIME
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestError(`INVALID_DOCUMENT_FORMAT: MIME type "${file.mimetype}" is not permitted`);
    }

    // Verify magic bytes
    const buf = file.buffer;
    let isValidMagic = false;
    if (buf && buf.length >= 4) {
      // PDF: %PDF (0x25 0x50 0x44 0x46)
      if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
        isValidMagic = file.mimetype === 'application/pdf';
      }
      // PNG: 0x89 0x50 0x4E 0x47
      else if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        isValidMagic = file.mimetype === 'image/png';
      }
      // JPEG: 0xFF 0xD8 0xFF
      else if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        isValidMagic = file.mimetype === 'image/jpeg';
      }
      // WebP: RIFF (0x52 0x49 0x46 0x46)
      else if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
        isValidMagic = file.mimetype === 'image/webp';
      }
    }

    if (!isValidMagic) {
      throw new BadRequestError('INVALID_DOCUMENT_FORMAT: File content does not match declared safe document type');
    }

    const storage = getStorageProvider();
    const fileId = crypto.randomUUID();
    const destinationPath = `hr/documents/${tenantId}/${schoolId}/${employeeId}/${fileId}${ext}`;
    await storage.upload(file.buffer, destinationPath, file.mimetype);

    const doc = await prisma.employeeDocument.create({
      data: {
        tenantId,
        schoolId,
        employeeId,
        documentType: meta.documentType,
        documentNumber: meta.documentNumber || null,
        fileKey: destinationPath,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        expiryDate: meta.expiryDate ? new Date(meta.expiryDate) : null,
      },
      select: {
        id: true,
        documentType: true,
        documentNumber: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        expiryDate: true,
        isVerified: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'EMPLOYEE_DOCUMENT_UPLOADED',
      entityType: 'EmployeeDocument',
      entityId: doc.id,
      beforeData: null,
      afterData: { employeeId, documentType: doc.documentType, fileName: doc.fileName },
      metadataInfo: { actorUserId: userId },
      ipAddress,
    });

    return doc;
  }

  /**
   * Get employee document with authorization and file streaming
   */
  public static async getEmployeeDocument(
    ctx: ScopeContext,
    employeeId: string,
    documentId: string
  ): Promise<{ doc: any; buffer: Buffer }> {
    const { schoolId, userId, permissions, isSuperAdmin } = ctx;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, schoolId },
    });
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    const isHrStaff =
      isSuperAdmin ||
      permissions?.includes('*') ||
      permissions?.includes('hr.employee.manage') ||
      permissions?.includes('hr.employee.view') ||
      permissions?.includes('hr.document.view') ||
      permissions?.includes('settings.manage');

    if (!isHrStaff && employee.userId !== userId) {
      throw new ForbiddenError('ACCESS_DENIED: You are not authorized to access this employee document');
    }

    const doc = await prisma.employeeDocument.findFirst({
      where: { id: documentId, employeeId, schoolId },
    });
    if (!doc) throw new NotFoundError(`Document ${documentId} not found`);

    const storage = getStorageProvider();
    const buffer = await storage.getBytes(doc.fileKey);
    if (!buffer) {
      throw new NotFoundError('Document file content not found in storage');
    }

    return { doc, buffer };
  }

  /**
   * List employee documents with authorization
   */
  public static async listEmployeeDocuments(
    ctx: ScopeContext,
    employeeId: string
  ): Promise<any[]> {
    const { schoolId, userId, permissions, isSuperAdmin } = ctx;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, schoolId },
    });
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    const isHrStaff =
      isSuperAdmin ||
      permissions?.includes('*') ||
      permissions?.includes('hr.employee.manage') ||
      permissions?.includes('hr.employee.view') ||
      permissions?.includes('hr.document.view') ||
      permissions?.includes('settings.manage');

    if (!isHrStaff && employee.userId !== userId) {
      throw new ForbiddenError('ACCESS_DENIED: You are not authorized to view documents for this employee');
    }

    return await prisma.employeeDocument.findMany({
      where: { employeeId, schoolId },
      select: {
        id: true,
        documentType: true,
        documentNumber: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        expiryDate: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =========================================================================
  // ATTENDANCE BRIDGE (Safeguard 3, TEST 16)
  // =========================================================================

  /**
   * Resolve employee attendance from Module 05 StaffAttendance via Employee.userId
   */
  public static async getEmployeeAttendance(
    ctx: ScopeContext,
    employeeId: string,
    query: { startDate?: string; endDate?: string }
  ): Promise<any> {
    const { schoolId, userId, permissions, isSuperAdmin } = ctx;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, schoolId },
    });
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    const isHrStaff =
      isSuperAdmin ||
      permissions?.includes('*') ||
      permissions?.includes('hr.employee.manage') ||
      permissions?.includes('hr.employee.view') ||
      permissions?.includes('hr.view') ||
      permissions?.includes('staff_attendance.manage') ||
      permissions?.includes('settings.manage');

    if (!isHrStaff && employee.userId !== userId) {
      throw new ForbiddenError('ACCESS_DENIED: You are not authorized to view this employee attendance');
    }

    if (!employee.userId) {
      return {
        status: 'EMPLOYEE_USER_NOT_LINKED',
        message: 'Employee has no linked user login. Attendance is tracked via Module 05 user accounts.',
        records: [],
      };
    }

    const start = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const end = query.endDate ? new Date(query.endDate) : new Date();

    const attendances = await prisma.staffAttendance.findMany({
      where: {
        schoolId,
        userId: employee.userId,
        attendanceDate: { gte: start, lte: end },
      },
      orderBy: { attendanceDate: 'desc' },
    });

    return {
      status: 'LINKED',
      userId: employee.userId,
      employeeId: employee.id,
      records: attendances,
    };
  }

  // =========================================================================
  // MANUAL LEAVE BALANCE ADJUSTMENT (Safeguard 4, TEST 25)
  // =========================================================================

  /**
   * Manually adjust employee leave balance with reason, actor, and AuditLog
   */
  public static async adjustEmployeeLeave(
    ctx: ScopeContext,
    input: {
      employeeId: string;
      leaveTypeId: string;
      days: number | string | Prisma.Decimal;
      reason: string;
      entitlementPeriod?: string;
    }
  ): Promise<any> {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    if (!input.reason || input.reason.trim().length === 0) {
      throw new BadRequestError('REASON_REQUIRED: A valid reason is required for manual leave adjustment');
    }

    const adjDays = FinanceService.toDecimal(input.days);
    if (adjDays.isZero()) {
      throw new BadRequestError('ADJUSTMENT_ZERO: Adjustment amount cannot be zero');
    }

    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, schoolId },
    });
    if (!employee) throw new NotFoundError(`Employee ${input.employeeId} not found`);

    const leaveType = await prisma.staffLeaveType.findFirst({
      where: { id: input.leaveTypeId, schoolId },
    });
    if (!leaveType) throw new NotFoundError(`Leave type ${input.leaveTypeId} not found`);

    const entitlementPeriod = input.entitlementPeriod || new Date().getFullYear().toString();

    return await prisma.$transaction(async (tx) => {
      let balance = await tx.employeeLeaveBalance.findFirst({
        where: {
          schoolId,
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!balance) {
        balance = await tx.employeeLeaveBalance.create({
          data: {
            tenantId,
            schoolId,
            employeeId: input.employeeId,
            leaveTypeId: input.leaveTypeId,
            entitlementPeriod,
            allocatedDays: adjDays.greaterThan(0) ? adjDays : new Prisma.Decimal(0),
            usedDays: new Prisma.Decimal(0),
            carryForwardDays: new Prisma.Decimal(0),
            closingBalance: adjDays,
          },
        });
      } else {
        const newClosing = balance.closingBalance.add(adjDays);
        balance = await tx.employeeLeaveBalance.update({
          where: { id: balance.id },
          data: {
            allocatedDays: balance.allocatedDays.add(adjDays),
            closingBalance: newClosing,
          },
        });
      }

      const txRecord = await tx.leaveBalanceTransaction.create({
        data: {
          tenantId,
          schoolId,
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          entitlementPeriod,
          transactionType: 'ADJUSTMENT',
          days: adjDays,
          balanceAfter: balance.closingBalance,
          sourceType: 'MANUAL_ADJUSTMENT',
          sourceId: null,
          remarks: input.reason,
          createdByUserId: userId,
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'LEAVE_BALANCE_ADJUSTED',
        entityType: 'EmployeeLeaveBalance',
        entityId: balance.id,
        beforeData: null,
        afterData: {
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          days: adjDays.toString(),
          reason: input.reason,
          newClosingBalance: balance.closingBalance.toString(),
        },
        metadataInfo: { actorUserId: userId, reason: input.reason },
        ipAddress,
      });

      return { balance, transaction: txRecord };
    });
  }

  // =========================================================================
  // HR REPORTS & CSV EXPORT (Safeguards 8, 9, 10, TEST 78, 79, 82)
  // =========================================================================

  /**
   * Employee register report with filtering and secure CSV export
   */
  public static async getEmployeeRegisterReport(
    ctx: ScopeContext,
    query: {
      departmentId?: string;
      designationId?: string;
      status?: string;
      joiningDateFrom?: string;
      joiningDateTo?: string;
      format?: string;
    }
  ): Promise<any> {
    const { schoolId, tenantId, userId, ipAddress, permissions, isSuperAdmin } = ctx;

    const where: Prisma.EmployeeWhereInput = {
      schoolId,
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.designationId ? { designationId: query.designationId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.joiningDateFrom || query.joiningDateTo
        ? {
            joiningDate: {
              ...(query.joiningDateFrom ? { gte: new Date(query.joiningDateFrom) } : {}),
              ...(query.joiningDateTo ? { lte: new Date(query.joiningDateTo) } : {}),
            },
          }
        : {}),
    };

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: true,
        designation: true,
        bankAccounts: {
          select: {
            id: true,
            bankName: true,
            branchName: true,
            maskedAccountNumber: true,
            ifscCode: true,
            isPrimary: true,
          },
        },
      },
      orderBy: { employeeNumber: 'asc' },
    });

    if (query.format === 'csv') {
      const hasExportPerm =
        isSuperAdmin ||
        permissions?.includes('*') ||
        permissions?.includes('hr.export') ||
        permissions?.includes('hr.employee.manage');
      if (!hasExportPerm) {
        throw new ForbiddenError('ACCESS_DENIED: You lack hr.export permission to export employee reports');
      }

      let csv = 'Employee Number,Display Name,Email,Phone,Department,Designation,Status,Employment Type,Joining Date,Bank Name,Masked Account\n';
      for (const emp of employees) {
        const primaryBank = emp.bankAccounts.find((b) => b.isPrimary) || emp.bankAccounts[0];
        const maskedBank = primaryBank ? primaryBank.maskedAccountNumber : 'N/A';
        csv += `"${emp.employeeNumber}","${emp.displayName}","${emp.email}","${emp.phone}","${emp.department?.name || ''}","${emp.designation?.name || ''}","${emp.status}","${emp.employmentType}","${emp.joiningDate.toISOString().slice(0, 10)}","${primaryBank?.bankName || ''}","${maskedBank}"\n`;
      }

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'EMPLOYEE_REPORT_EXPORTED',
        entityType: 'Employee',
        entityId: 'ALL',
        beforeData: null,
        afterData: { format: 'csv', recordCount: employees.length },
        metadataInfo: { actorUserId: userId },
        ipAddress,
      });

      return { format: 'csv', data: csv, count: employees.length };
    }

    return employees;
  }

  /**
   * Leave balance summary report
   */
  public static async getLeaveBalanceSummaryReport(
    ctx: ScopeContext,
    query: { leaveTypeId?: string; entitlementPeriod?: string; format?: string }
  ): Promise<any> {
    const { schoolId, tenantId, userId, ipAddress, permissions, isSuperAdmin } = ctx;

    const balances = await prisma.employeeLeaveBalance.findMany({
      where: {
        schoolId,
        ...(query.leaveTypeId ? { leaveTypeId: query.leaveTypeId } : {}),
        ...(query.entitlementPeriod ? { entitlementPeriod: query.entitlementPeriod } : {}),
      },
      include: {
        employee: {
          include: { department: true, designation: true },
        },
        leaveType: true,
      },
      orderBy: { employee: { employeeNumber: 'asc' } },
    });

    if (query.format === 'csv') {
      const hasExportPerm =
        isSuperAdmin ||
        permissions?.includes('*') ||
        permissions?.includes('hr.export') ||
        permissions?.includes('hr.leave.manage') ||
        permissions?.includes('hr.employee.manage');
      if (!hasExportPerm) {
        throw new ForbiddenError('ACCESS_DENIED: You lack hr.export permission to export leave reports');
      }

      let csv = 'Employee Number,Employee Name,Department,Designation,Leave Type,Period,Allocated,Used,Closing Balance\n';
      for (const b of balances) {
        csv += `"${b.employee.employeeNumber}","${b.employee.displayName}","${b.employee.department?.name || ''}","${b.employee.designation?.name || ''}","${b.leaveType.name}","${b.entitlementPeriod}",${b.allocatedDays},${b.usedDays},${b.closingBalance}\n`;
      }

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'LEAVE_REPORT_EXPORTED',
        entityType: 'EmployeeLeaveBalance',
        entityId: 'ALL',
        beforeData: null,
        afterData: { format: 'csv', recordCount: balances.length },
        metadataInfo: { actorUserId: userId },
        ipAddress,
      });

      return { format: 'csv', data: csv, count: balances.length };
    }

    return balances;
  }

  // =========================================================================
  // DEPARTMENTS & DESIGNATIONS (AUTO-PROVISIONING & REFERENCE)
  // =========================================================================

  /**
   * Ensures default baseline departments and designations are provisioned for a school.
   * Auto-provisions Administration, Academics & Teaching, Accounts & Finance, and Transport.
   * Idempotent and thread-safe via upsert on [schoolId_code].
   */
  public static async ensureDefaultDepartmentsAndDesignations(
    tenantId: string,
    schoolId: string
  ): Promise<void> {
    const defaultDepartments = [
      { name: 'Administration', code: 'ADMIN', description: 'Administrative and operational staff' },
      { name: 'Academics & Teaching', code: 'ACADEMICS', description: 'Academic instruction and curriculum faculty' },
      { name: 'Accounts & Finance', code: 'ACCOUNTS', description: 'Billing, accounting, and financial management' },
      { name: 'Transport', code: 'TRANSPORT', description: 'School transportation and fleet logistics' },
    ];

    const deptMap: Record<string, string> = {};
    for (const dep of defaultDepartments) {
      const record = await prisma.department.upsert({
        where: { schoolId_code: { schoolId, code: dep.code } },
        update: { isActive: true },
        create: {
          tenantId,
          schoolId,
          name: dep.name,
          code: dep.code,
          description: dep.description,
          isActive: true,
        },
      });
      deptMap[dep.code] = record.id;
    }

    const defaultDesignations = [
      { name: 'Principal', code: 'PRINCIPAL', deptCode: 'ADMIN', displayOrder: 1 },
      { name: 'Teacher', code: 'TEACHER', deptCode: 'ACADEMICS', displayOrder: 2 },
      { name: 'Accountant', code: 'ACCOUNTANT', deptCode: 'ACCOUNTS', displayOrder: 3 },
      { name: 'Driver', code: 'DRIVER', deptCode: 'TRANSPORT', displayOrder: 4 },
    ];

    for (const des of defaultDesignations) {
      await prisma.designation.upsert({
        where: { schoolId_code: { schoolId, code: des.code } },
        update: {
          isActive: true,
          departmentId: deptMap[des.deptCode] || undefined,
        },
        create: {
          tenantId,
          schoolId,
          departmentId: deptMap[des.deptCode] || null,
          name: des.name,
          code: des.code,
          displayOrder: des.displayOrder,
          isActive: true,
        },
      });
    }
  }

  /**
   * List departments with auto-provisioning fallback if school has 0 departments
   */
  public static async listDepartments(tenantId: string, schoolId: string) {
    let list = await prisma.department.findMany({
      where: { schoolId, tenantId, archivedAt: null },
      include: { designations: true, _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });

    if (list.length === 0) {
      await HrService.ensureDefaultDepartmentsAndDesignations(tenantId, schoolId);
      list = await prisma.department.findMany({
        where: { schoolId, tenantId, archivedAt: null },
        include: { designations: true, _count: { select: { employees: true } } },
        orderBy: { name: 'asc' },
      });
    }

    return list;
  }

  /**
   * List designations with auto-provisioning fallback if school has 0 designations
   */
  public static async listDesignations(tenantId: string, schoolId: string) {
    let list = await prisma.designation.findMany({
      where: { schoolId, tenantId, archivedAt: null },
      include: { department: true, _count: { select: { employees: true } } },
      orderBy: { displayOrder: 'asc' },
    });

    if (list.length === 0) {
      await HrService.ensureDefaultDepartmentsAndDesignations(tenantId, schoolId);
      list = await prisma.designation.findMany({
        where: { schoolId, tenantId, archivedAt: null },
        include: { department: true, _count: { select: { employees: true } } },
        orderBy: { displayOrder: 'asc' },
      });
    }

    return list;
  }
}

