import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { FinanceService } from '../finance/finance.service.js';
import { AttendanceService } from '../attendance/attendance.service.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { ScopeContext } from './hr.service.js';

export class PayrollService {
  // =========================================================================
  // SALARY COMPONENTS & TOPOLOGICAL DEPENDENCY SORTING
  // =========================================================================

  /**
   * Detect dependency cycles and sort components topologically
   */
  public static sortComponentsTopologically(components: any[]): any[] {
    const compMap = new Map<string, any>();
    const adj = new Map<string, string[]>();

    for (const c of components) {
      compMap.set(c.id, c);
      adj.set(c.id, []);
    }

    // Build edges: dependsOnComponentId -> component
    for (const c of components) {
      if (c.calculationType === 'PERCENTAGE_OF_COMPONENT' || c.dependsOnComponentId) {
        if (c.dependsOnComponentId) {
          if (c.dependsOnComponentId === c.id) {
            throw new BadRequestError(`SALARY_COMPONENT_CYCLE: Self-referencing salary component "${c.name}" (${c.code})`);
          }
          if (adj.has(c.dependsOnComponentId)) {
            adj.get(c.dependsOnComponentId)!.push(c.id);
          }
        }
      }
    }

    // Standard topological sort (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    for (const [id] of compMap) {
      inDegree.set(id, 0);
    }
    for (const [_, targets] of adj) {
      for (const target of targets) {
        inDegree.set(target, (inDegree.get(target) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const sorted: any[] = [];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      sorted.push(compMap.get(currentId)!);

      for (const neighbor of adj.get(currentId) || []) {
        const newDeg = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (sorted.length !== components.length) {
      throw new BadRequestError('SALARY_COMPONENT_CYCLE: Dependency cycle detected in salary components');
    }

    return sorted;
  }

  /**
   * Create salary component
   */
  public static async createSalaryComponent(ctx: ScopeContext, input: any): Promise<any> {
    const { tenantId, schoolId } = ctx;

    const existing = await prisma.salaryComponent.findFirst({
      where: { schoolId, code: input.code },
    });
    if (existing) {
      throw new ConflictError(`COMPONENT_CODE_EXISTS: Salary component with code ${input.code} already exists`);
    }

    if (input.calculationType === 'PERCENTAGE_OF_COMPONENT') {
      if (!input.dependsOnComponentId) {
        throw new BadRequestError('COMPONENT_DEPENDENCY_REQUIRED: dependsOnComponentId is required for PERCENTAGE_OF_COMPONENT');
      }
      const allComps = await prisma.salaryComponent.findMany({ where: { schoolId } });
      const simulated = [
        ...allComps,
        {
          id: 'temp-new-id',
          name: input.name,
          code: input.code,
          calculationType: input.calculationType,
          dependsOnComponentId: input.dependsOnComponentId,
        },
      ];
      PayrollService.sortComponentsTopologically(simulated);
    }

    return await prisma.salaryComponent.create({
      data: {
        tenantId,
        schoolId,
        name: input.name,
        code: input.code.toUpperCase(),
        type: input.type,
        calculationType: input.calculationType,
        formulaExpression: input.formulaExpression || null,
        dependsOnComponentId: input.dependsOnComponentId || null,
        isTaxable: input.isTaxable ?? true,
        isStatutory: input.isStatutory ?? false,
        affectsGross: input.affectsGross ?? true,
        affectsNet: input.affectsNet ?? true,
        glAccountId: input.glAccountId || null,
        employerLiabilityAccountId: input.employerLiabilityAccountId || null,
        displayOrder: input.displayOrder || 0,
        isActive: input.isActive ?? true,
      },
    });
  }

  /**
   * Update salary component with cycle and self-dependency protection (Amendments 2, B, C)
   */
  public static async updateSalaryComponent(ctx: ScopeContext, id: string, input: any): Promise<any> {
    const { schoolId } = ctx;

    const comp = await prisma.salaryComponent.findFirst({
      where: { id, schoolId },
    });
    if (!comp) {
      throw new NotFoundError(`Salary component ${id} not found`);
    }

    if (input.dependsOnComponentId && input.dependsOnComponentId === id) {
      throw new BadRequestError(`SALARY_COMPONENT_CYCLE: Component ${comp.code} cannot depend on itself`);
    }

    // Check for dependency cycle
    if (input.dependsOnComponentId || input.calculationType === 'PERCENTAGE_OF_COMPONENT') {
      const allComps = await prisma.salaryComponent.findMany({ where: { schoolId } });
      const simulated = allComps.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            calculationType: input.calculationType ?? c.calculationType,
            dependsOnComponentId: input.dependsOnComponentId !== undefined ? input.dependsOnComponentId : c.dependsOnComponentId,
          };
        }
        return c;
      });
      PayrollService.sortComponentsTopologically(simulated);
    }

    return await prisma.salaryComponent.update({
      where: { id },
      data: {
        name: input.name ?? comp.name,
        code: input.code ? input.code.toUpperCase() : comp.code,
        type: input.type ?? comp.type,
        calculationType: input.calculationType ?? comp.calculationType,
        formulaExpression: input.formulaExpression !== undefined ? input.formulaExpression : comp.formulaExpression,
        dependsOnComponentId: input.dependsOnComponentId !== undefined ? input.dependsOnComponentId : comp.dependsOnComponentId,
        isTaxable: input.isTaxable !== undefined ? input.isTaxable : comp.isTaxable,
        isStatutory: input.isStatutory !== undefined ? input.isStatutory : comp.isStatutory,
        affectsGross: input.affectsGross !== undefined ? input.affectsGross : comp.affectsGross,
        affectsNet: input.affectsNet !== undefined ? input.affectsNet : comp.affectsNet,
        glAccountId: input.glAccountId !== undefined ? input.glAccountId : comp.glAccountId,
        employerLiabilityAccountId: input.employerLiabilityAccountId !== undefined ? input.employerLiabilityAccountId : comp.employerLiabilityAccountId,
        displayOrder: input.displayOrder !== undefined ? input.displayOrder : comp.displayOrder,
        isActive: input.isActive !== undefined ? input.isActive : comp.isActive,
      },
    });
  }

  /**
   * List salary components
   */
  public static async listSalaryComponents(ctx: ScopeContext): Promise<any[]> {
    const { schoolId } = ctx;
    return await prisma.salaryComponent.findMany({
      where: { schoolId },
      include: {
        glAccount: { select: { id: true, code: true, name: true } },
        employerLiabilityAccount: { select: { id: true, code: true, name: true } },
        parentComponent: { select: { id: true, code: true, name: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  // =========================================================================
  // SALARY STRUCTURES & ASSIGNMENTS
  // =========================================================================

  /**
   * Create salary structure with validation against cycles
   */
  public static async createSalaryStructure(ctx: ScopeContext, input: any): Promise<any> {
    const { tenantId, schoolId } = ctx;

    const existing = await prisma.salaryStructure.findFirst({
      where: { schoolId, code: input.code },
    });
    if (existing) {
      throw new ConflictError(`STRUCTURE_CODE_EXISTS: Salary structure with code ${input.code} already exists`);
    }

    // Fetch components to validate cycles
    const compIds = input.components.map((c: any) => c.componentId);
    const dbComponents = await prisma.salaryComponent.findMany({
      where: { schoolId, id: { in: compIds } },
    });
    if (dbComponents.length !== compIds.length) {
      throw new NotFoundError('One or more salary components were not found');
    }

    // Validate cycle protection
    PayrollService.sortComponentsTopologically(dbComponents);

    return await prisma.$transaction(async (tx) => {
      const structure = await tx.salaryStructure.create({
        data: {
          tenantId,
          schoolId,
          name: input.name,
          code: input.code.toUpperCase(),
          description: input.description || null,
          isDefault: input.isDefault ?? false,
          isActive: input.isActive ?? true,
        },
      });

      for (const comp of input.components) {
        await tx.salaryStructureComponent.create({
          data: {
            salaryStructureId: structure.id,
            componentId: comp.componentId,
            calculationType: comp.calculationType || null,
            flatAmount: comp.flatAmount !== undefined && comp.flatAmount !== null ? FinanceService.toDecimal(comp.flatAmount) : null,
            percentageValue: comp.percentageValue !== undefined && comp.percentageValue !== null ? FinanceService.toDecimal(comp.percentageValue) : null,
            formulaExpression: comp.formulaExpression || null,
            displayOrder: comp.displayOrder || 0,
          },
        });
      }

      return structure;
    });
  }

  /**
   * List salary structures
   */
  public static async listSalaryStructures(ctx: ScopeContext): Promise<any[]> {
    const { schoolId } = ctx;
    return await prisma.salaryStructure.findMany({
      where: { schoolId },
      include: {
        components: {
          include: { component: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Assign salary structure to employee with overlap prevention and historical closure
   */
  public static async assignSalaryStructure(ctx: ScopeContext, input: any): Promise<any> {
    const { tenantId, schoolId } = ctx;

    const [employee, structure] = await Promise.all([
      prisma.employee.findFirst({ where: { id: input.employeeId, schoolId } }),
      prisma.salaryStructure.findFirst({ where: { id: input.salaryStructureId, schoolId } }),
    ]);
    if (!employee) throw new NotFoundError(`Employee ${input.employeeId} not found`);
    if (!structure) throw new NotFoundError(`SalaryStructure ${input.salaryStructureId} not found`);

    const newEffectiveFrom = new Date(input.effectiveFrom);
    const baseSalary = FinanceService.toDecimal(input.baseSalary);

    return await prisma.$transaction(async (tx) => {
      // Check for overlap against all assignments of this employee
      const newEffectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : null;
      const allExisting = await tx.employeeSalaryAssignment.findMany({
        where: {
          schoolId,
          employeeId: input.employeeId,
        },
      });

      for (const existing of allExisting) {
        const existFrom = new Date(existing.effectiveFrom);
        const existTo = existing.effectiveTo ? new Date(existing.effectiveTo) : null;

        // If existing has a fixed end date and new range overlaps with it
        if (existTo) {
          const overlaps = (newEffectiveTo === null || newEffectiveTo >= existFrom) && newEffectiveFrom <= existTo;
          if (overlaps) {
            throw new BadRequestError('SALARY_ASSIGNMENT_OVERLAP: Salary assignment date range overlaps with an existing assignment');
          }
        } else {
          // Existing is open-ended
          if (newEffectiveFrom <= existFrom) {
            throw new BadRequestError('SALARY_ASSIGNMENT_OVERLAP: New effective date must be later than current assignment effective date');
          }
          // Close previous open-ended assignment cleanly on the day before the new one starts
          const prevEffectiveTo = new Date(newEffectiveFrom);
          prevEffectiveTo.setDate(prevEffectiveTo.getDate() - 1);

          await tx.employeeSalaryAssignment.update({
            where: { id: existing.id },
            data: {
              effectiveTo: prevEffectiveTo,
              isCurrent: false,
            },
          });
        }
      }

      // Ensure only one assignment is marked isCurrent: true for this employee
      await tx.employeeSalaryAssignment.updateMany({
        where: {
          employeeId: input.employeeId,
          isCurrent: true,
        },
        data: { isCurrent: false },
      });

      const created = await tx.employeeSalaryAssignment.create({
        data: {
          tenantId,
          schoolId,
          employeeId: input.employeeId,
          salaryStructureId: input.salaryStructureId,
          baseSalary,
          effectiveFrom: newEffectiveFrom,
          effectiveTo: newEffectiveTo,
          remarks: input.remarks || null,
          isCurrent: true,
        },
      });

      return created;
    });
  }

  // =========================================================================
  // PAYROLL CONFIGURATION & PERIODS
  // =========================================================================

  /**
   * Get or initialize school payroll configuration
   */
  public static async getPayrollConfiguration(ctx: ScopeContext): Promise<any> {
    const { tenantId, schoolId } = ctx;

    let config = await prisma.payrollConfiguration.findUnique({
      where: { schoolId },
      include: {
        defaultExpenseAccount: true,
        defaultPayableAccount: true,
        defaultDisbursementAccount: true,
      },
    });

    if (!config) {
      config = await prisma.payrollConfiguration.create({
        data: {
          tenantId,
          schoolId,
          payFrequency: 'MONTHLY',
          payDay: 30,
          prorationBasis: 'WORKING_DAYS',
          attendanceCutoffDay: 25,
        },
        include: {
          defaultExpenseAccount: true,
          defaultPayableAccount: true,
          defaultDisbursementAccount: true,
        },
      });
    }

    return {
      ...config,
      payrollFrequency: config.payFrequency,
      salaryProrationBasis: config.prorationBasis,
      payrollPayableAccountId: config.defaultPayableAccountId,
      salaryExpenseClearingAccountId: config.defaultExpenseAccountId,
      autoPostToFinance: true,
      payslipVisibilityState: 'POSTED',
    };
  }

  /**
   * Update school payroll configuration
   */
  public static async updatePayrollConfiguration(ctx: ScopeContext, input: any): Promise<any> {
    const { schoolId, tenantId } = ctx;

    const updated = await prisma.payrollConfiguration.upsert({
      where: { schoolId },
      update: {
        payFrequency: input.payFrequency,
        payDay: input.payDay,
        prorationBasis: input.prorationBasis,
        attendanceCutoffDay: input.attendanceCutoffDay,
        defaultExpenseAccountId: input.defaultExpenseAccountId,
        defaultPayableAccountId: input.defaultPayableAccountId,
        defaultDisbursementAccountId: input.defaultDisbursementAccountId,
        epfEnabled: input.epfEnabled,
        epfEmployerRate: input.epfEmployerRate ? FinanceService.toDecimal(input.epfEmployerRate) : null,
        epfEmployeeRate: input.epfEmployeeRate ? FinanceService.toDecimal(input.epfEmployeeRate) : null,
        esicEnabled: input.esicEnabled,
        esicEmployerRate: input.esicEmployerRate ? FinanceService.toDecimal(input.esicEmployerRate) : null,
        esicEmployeeRate: input.esicEmployeeRate ? FinanceService.toDecimal(input.esicEmployeeRate) : null,
        tdsEnabled: input.tdsEnabled,
        autoLockAfterDays: input.autoLockAfterDays,
      },
      create: {
        tenantId,
        schoolId,
        payFrequency: input.payFrequency,
        payDay: input.payDay,
        prorationBasis: input.prorationBasis,
        attendanceCutoffDay: input.attendanceCutoffDay,
        defaultExpenseAccountId: input.defaultExpenseAccountId,
        defaultPayableAccountId: input.defaultPayableAccountId,
        defaultDisbursementAccountId: input.defaultDisbursementAccountId,
        epfEnabled: input.epfEnabled,
        epfEmployerRate: input.epfEmployerRate ? FinanceService.toDecimal(input.epfEmployerRate) : null,
        epfEmployeeRate: input.epfEmployeeRate ? FinanceService.toDecimal(input.epfEmployeeRate) : null,
        esicEnabled: input.esicEnabled,
        esicEmployerRate: input.esicEmployerRate ? FinanceService.toDecimal(input.esicEmployerRate) : null,
        esicEmployeeRate: input.esicEmployeeRate ? FinanceService.toDecimal(input.esicEmployeeRate) : null,
        tdsEnabled: input.tdsEnabled,
        autoLockAfterDays: input.autoLockAfterDays,
      },
      include: {
        defaultExpenseAccount: true,
        defaultPayableAccount: true,
        defaultDisbursementAccount: true,
      },
    });

    return {
      ...updated,
      payrollFrequency: updated.payFrequency,
      salaryProrationBasis: updated.prorationBasis,
      payrollPayableAccountId: updated.defaultPayableAccountId,
      salaryExpenseClearingAccountId: updated.defaultExpenseAccountId,
      autoPostToFinance: input.autoPostToFinance ?? true,
      payslipVisibilityState: input.payslipVisibilityState ?? 'POSTED',
    };
  }

  /**
   * Create payroll period
   */
  public static async createPayrollPeriod(ctx: ScopeContext, input: any): Promise<any> {
    const { tenantId, schoolId } = ctx;

    const existing = await prisma.payrollPeriod.findFirst({
      where: {
        schoolId,
        financialYearId: input.financialYearId,
        periodNumber: input.periodNumber,
      },
    });
    if (existing) {
      throw new ConflictError(`PERIOD_EXISTS: Payroll period number ${input.periodNumber} already exists in this financial year`);
    }

    return await prisma.payrollPeriod.create({
      data: {
        tenantId,
        schoolId,
        financialYearId: input.financialYearId,
        periodNumber: input.periodNumber,
        periodName: input.periodName,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        payDate: new Date(input.payDate),
      },
    });
  }

  /**
   * List payroll periods
   */
  public static async listPayrollPeriods(ctx: ScopeContext, financialYearId?: string): Promise<any[]> {
    const { schoolId } = ctx;
    return await prisma.payrollPeriod.findMany({
      where: {
        schoolId,
        ...(financialYearId ? { financialYearId } : {}),
      },
      orderBy: { periodNumber: 'asc' },
    });
  }

  // =========================================================================
  // PAYROLL RUNS & CALCULATION ENGINE
  // =========================================================================

  /**
   * Create payroll run
   */
  public static async createPayrollRun(ctx: ScopeContext, input: any): Promise<any> {
    const { tenantId, schoolId } = ctx;

    const period = await prisma.payrollPeriod.findFirst({
      where: { id: input.periodId, schoolId },
      include: { financialYear: true },
    });
    if (!period) throw new NotFoundError(`PayrollPeriod ${input.periodId} not found`);
    if (period.isClosed) throw new BadRequestError('PAYROLL_PERIOD_CLOSED: Cannot create payroll run for a closed period');

    // Run type validation
    const runType = input.runType || 'REGULAR';

    return await prisma.$transaction(async (tx) => {
      const runNumber = await FinanceService.getNextNumber(
        tenantId,
        schoolId,
        'PAYROLL_RUN',
        'PR-{YYYY}-',
        6,
        tx
      );

      return await tx.payrollRun.create({
        data: {
          tenantId,
          schoolId,
          periodId: period.id,
          financialYearId: period.financialYearId,
          runNumber,
          runType,
          status: 'OPEN',
          version: 1,
          calculationBasis: input.calculationBasis || 'WORKING_DAYS',
          remarks: input.remarks || null,
        },
      });
    });
  }

  /**
   * Authoritative calculation engine with:
   * 1. Single source of truth for salary (baseSalary is basis only)
   * 2. Component topological sorting and cycle detection
   * 3. Mid-period salary revision segmentation
   * 4. Duplicate regular run protection
   * 5. Double deduction prevention between attendance absence and unpaid leave
   * 6. Distinct missing attendance handling (warnings, no automatic deduction)
   * 7. Calculation idempotency before approval
   */
  public static async calculatePayrollRun(
    ctx: ScopeContext,
    payrollRunId: string,
    targetEmployeeIds?: string[]
  ): Promise<any> {
    const { schoolId } = ctx;

    const run = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, schoolId },
      include: { period: true },
    });
    if (!run) throw new NotFoundError(`PayrollRun ${payrollRunId} not found`);

    // Lock check (Amendment 6)
    if (['APPROVED', 'POSTED', 'PAID', 'CLOSED'].includes(run.status)) {
      throw new BadRequestError(`PAYROLL_ALREADY_LOCKED: Cannot recalculate payroll run in status ${run.status}`);
    }

    const startDate = new Date(run.period.startDate);
    const endDate = new Date(run.period.endDate);

    // Fetch active employees
    const employees = await prisma.employee.findMany({
      where: {
        schoolId,
        status: { in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'ON_LEAVE'] },
        ...(targetEmployeeIds && targetEmployeeIds.length > 0 ? { id: { in: targetEmployeeIds } } : {}),
      },
      include: {
        salaryAssignments: {
          where: {
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: startDate } },
            ],
            effectiveFrom: { lte: endDate },
          },
          include: {
            salaryStructure: {
              include: {
                components: {
                  include: { component: true },
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
          },
          orderBy: { effectiveFrom: 'asc' },
        },
      },
    });

    // Duplicate REGULAR payroll protection (Amendment 5)
    if (run.runType === 'REGULAR') {
      const conflictingRuns = await prisma.payrollRun.findMany({
        where: {
          schoolId,
          periodId: run.periodId,
          runType: 'REGULAR',
          id: { not: run.id },
          status: { notIn: ['REVERSED'] },
        },
        include: { employees: { select: { employeeId: true } } },
      });

      const alreadyIncludedEmployeeIds = new Set<string>();
      for (const cr of conflictingRuns) {
        for (const emp of cr.employees) {
          alreadyIncludedEmployeeIds.add(emp.employeeId);
        }
      }

      for (const emp of employees) {
        if (alreadyIncludedEmployeeIds.has(emp.id)) {
          throw new ConflictError(
            `EMPLOYEE_ALREADY_IN_PAYROLL_PERIOD: Employee ${emp.displayName} (${emp.employeeNumber}) is already included in another regular payroll run for this period`
          );
        }
      }
    }

    // Determine calendar and working days in period (Amendment 19)
    const calendarDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
    let totalWorkingDays = 0;
    const workingDaysMap = new Map<string, boolean>();

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayStatus = await AttendanceService.checkDayStatus(schoolId, dateStr, 'MON_SAT');
      workingDaysMap.set(dateStr, dayStatus.isWorkingDay);
      if (dayStatus.isWorkingDay) {
        totalWorkingDays++;
      }
    }
    if (totalWorkingDays === 0) totalWorkingDays = calendarDays; // Fallback

    return await prisma.$transaction(async (tx) => {
      // Clear existing calculations for this run cleanly (Amendment 6: Idempotent replacement)
      await tx.payrollLineItem.deleteMany({
        where: { payrollRunEmployee: { payrollRunId: run.id } },
      });
      await tx.payrollRunEmployee.deleteMany({
        where: { payrollRunId: run.id },
      });

      let runTotalGross = new Prisma.Decimal(0);
      let runTotalDeductions = new Prisma.Decimal(0);
      let runTotalEmployerContrib = new Prisma.Decimal(0);
      let runTotalNetPay = new Prisma.Decimal(0);
      let runEmployeeCount = 0;

      // Pre-fetch unpaid leave types for accurate Loss-Of-Pay classification
      const unpaidLeaveTypes = await tx.staffLeaveType.findMany({
        where: { schoolId, isUnpaid: true },
        select: { id: true, code: true },
      });
      const unpaidTypeSet = new Set<string>(['UNPAID', 'LWP']);
      for (const ult of unpaidLeaveTypes) {
        unpaidTypeSet.add(ult.id);
        unpaidTypeSet.add(ult.code.toUpperCase());
      }

      for (const emp of employees) {
        if (!emp.salaryAssignments || emp.salaryAssignments.length === 0) {
          continue; // Skip employee without salary setup
        }

        // Attendance & Leave evaluation (Amendment 17 & 18)
        const userIds = [emp.userId, emp.id].filter(Boolean) as string[];
        const staffAttendances = userIds.length > 0
          ? await tx.staffAttendance.findMany({
              where: {
                schoolId,
                userId: { in: userIds },
                attendanceDate: { gte: startDate, lte: endDate },
              },
            })
          : [];
        const attendanceMap = new Map<string, string>();
        for (const att of staffAttendances) {
          const dStr = att.attendanceDate.toISOString().slice(0, 10);
          attendanceMap.set(dStr, att.status);
        }

        const approvedLeaves = userIds.length > 0
          ? await tx.staffLeave.findMany({
              where: {
                schoolId,
                userId: { in: userIds },
                status: 'APPROVED',
                startDate: { lte: endDate },
                endDate: { gte: startDate },
              },
            })
          : [];

        // Check each working day for absence and unpaid leave
        let presentDays = 0;
        let paidLeaveDays = 0;
        let unpaidLeaveDays = 0;
        let absentDays = 0;
        let lossOfPayDays = 0;
        const missingAttendanceDays: string[] = [];

        for (const [dateStr, isWorkingDay] of workingDaysMap) {
          if (!isWorkingDay) continue;

          const attStatus = attendanceMap.get(dateStr);
          const curDate = new Date(`${dateStr}T00:00:00.000Z`);

          // Check if date falls in approved leave
          const matchingLeave = approvedLeaves.find((l) => {
            const lStart = new Date(l.startDate);
            const lEnd = new Date(l.endDate);
            return curDate >= lStart && curDate <= lEnd;
          });

          if (matchingLeave) {
            // Check if unpaid leave (Amendment 17)
            const ltStr = (matchingLeave.leaveType || '').toUpperCase();
            const isUnpaid =
              unpaidTypeSet.has(matchingLeave.leaveType) ||
              unpaidTypeSet.has(ltStr) ||
              ltStr.includes('UNPAID') ||
              ltStr.includes('LWP');
            if (isUnpaid) {
              unpaidLeaveDays++;
              // Precedence rule: If marked ABSENT and UNPAID LEAVE, count LOP once (Amendment 17)
              lossOfPayDays++;
            } else {
              paidLeaveDays++;
            }
          } else if (attStatus === 'PRESENT') {
            presentDays++;
          } else if (attStatus === 'ABSENT') {
            absentDays++;
            lossOfPayDays++; // Unexcused absence causes loss of pay
          } else if (attStatus === 'HALF_DAY') {
            presentDays += 0.5;
            absentDays += 0.5;
            lossOfPayDays += 0.5;
          } else if (!attStatus) {
            // Missing attendance: flagged as review warning, NOT deducted automatically (Amendment 18)
            missingAttendanceDays.push(dateStr);
            presentDays++; // Default assumed present for salary unless policy enforces otherwise
          } else {
            presentDays++;
          }
        }

        // Mid-period salary revision segmentation (Amendment 3)
        // Partition period into segments based on effective salary assignments
        const segments: Array<{
          assignment: any;
          segmentStart: Date;
          segmentEnd: Date;
          segmentWorkingDays: number;
        }> = [];

        for (const sa of emp.salaryAssignments) {
          const segStart = new Date(Math.max(startDate.getTime(), new Date(sa.effectiveFrom).getTime()));
          const segEnd = sa.effectiveTo
            ? new Date(Math.min(endDate.getTime(), new Date(sa.effectiveTo).getTime()))
            : endDate;

          if (segStart <= segEnd) {
            let segWorking = 0;
            for (let d = new Date(segStart); d <= segEnd; d.setDate(d.getDate() + 1)) {
              const dStr = d.toISOString().slice(0, 10);
              if (workingDaysMap.get(dStr)) segWorking++;
            }
            segments.push({
              assignment: sa,
              segmentStart: segStart,
              segmentEnd: segEnd,
              segmentWorkingDays: segWorking,
            });
          }
        }

        // Calculate line items across segments
        const aggregatedLineItems = new Map<string, {
          component: any;
          amount: Prisma.Decimal;
          rateApplied?: Prisma.Decimal;
        }>();

        let empGrossEarnings = new Prisma.Decimal(0);
        let empTotalDeductions = new Prisma.Decimal(0);
        let empTotalEmployerContrib = new Prisma.Decimal(0);

        for (const seg of segments) {
          const structureComponents = seg.assignment.salaryStructure.components;
          const rawComponents = structureComponents.map((sc: any) => sc.component);
          const sortedComponents = PayrollService.sortComponentsTopologically(rawComponents);

          // Proration factor for this segment
          const segmentWeight = totalWorkingDays > 0 ? seg.segmentWorkingDays / totalWorkingDays : 1;
          const lopRatio = totalWorkingDays > 0 ? (totalWorkingDays - lossOfPayDays) / totalWorkingDays : 1;
          const effectiveProration = segmentWeight * Math.max(0, lopRatio);

          const evaluatedAmounts = new Map<string, Prisma.Decimal>();
          const baseSalaryDecimal = seg.assignment.baseSalary;

          for (const comp of sortedComponents) {
            const scConfig = structureComponents.find((sc: any) => sc.componentId === comp.id);
            let compAmount = new Prisma.Decimal(0);
            let rate: Prisma.Decimal | undefined = undefined;

            const calcType = scConfig?.calculationType || comp.calculationType;

            if (calcType === 'FLAT') {
              const flat = scConfig?.flatAmount || new Prisma.Decimal(0);
              compAmount = flat.mul(effectiveProration);
            } else if (calcType === 'PERCENTAGE_OF_BASIC') {
              rate = scConfig?.percentageValue || new Prisma.Decimal(0);
              compAmount = baseSalaryDecimal.mul(rate).div(100).mul(effectiveProration);
            } else if (calcType === 'PERCENTAGE_OF_GROSS') {
              rate = scConfig?.percentageValue || new Prisma.Decimal(0);
              // Percentage of gross calculated so far
              let currentGross = new Prisma.Decimal(0);
              for (const [id, amt] of evaluatedAmounts) {
                const c = sortedComponents.find((x: any) => x.id === id);
                if (c && c.type === 'EARNING') currentGross = currentGross.add(amt);
              }
              const rateValue = rate || new Prisma.Decimal(0);
              compAmount = currentGross.mul(rateValue).div(100);
            } else if (calcType === 'PERCENTAGE_OF_COMPONENT') {
              rate = scConfig?.percentageValue || new Prisma.Decimal(0);
              const parentAmount = comp.dependsOnComponentId ? evaluatedAmounts.get(comp.dependsOnComponentId) || new Prisma.Decimal(0) : new Prisma.Decimal(0);
              compAmount = parentAmount.mul(rate || 0).div(100);
            }

            evaluatedAmounts.set(comp.id, compAmount);

            // Aggregate into employee line items
            const existingAgg = aggregatedLineItems.get(comp.id);
            if (existingAgg) {
              existingAgg.amount = existingAgg.amount.add(compAmount);
            } else {
              aggregatedLineItems.set(comp.id, {
                component: comp,
                amount: compAmount,
                rateApplied: rate,
              });
            }
          }
        }

        // Single source of truth (Amendment 1):
        // Gross Earnings = SUM(calculated EARNING PayrollLineItems). baseSalary is NOT added again.
        for (const [_, item] of aggregatedLineItems) {
          const roundedAmount = FinanceService.toDecimal(item.amount.toFixed(2));
          item.amount = roundedAmount;

          if (item.component.type === 'EARNING') {
            empGrossEarnings = empGrossEarnings.add(roundedAmount);
          } else if (item.component.type === 'DEDUCTION') {
            empTotalDeductions = empTotalDeductions.add(roundedAmount);
          } else if (item.component.type === 'EMPLOYER_CONTRIBUTION') {
            empTotalEmployerContrib = empTotalEmployerContrib.add(roundedAmount);
          }
        }

        // Net Pay = Gross Earnings - Employee Deductions (Employer contributions do NOT reduce net pay)
        // Safeguard 7, TEST 47: Do NOT silently clamp to zero. Record exact arithmetic & warning.
        const empNetPay = empGrossEarnings.sub(empTotalDeductions);
        const hasNegativeNetPay = empNetPay.isNegative();

        // Primary salary structure (latest segment)
        const primaryStructureId = segments[segments.length - 1].assignment.salaryStructureId;
        const primaryBaseSalary = segments[segments.length - 1].assignment.baseSalary;

        // Create PayrollRunEmployee
        const runEmployee = await tx.payrollRunEmployee.create({
          data: {
            payrollRunId: run.id,
            employeeId: emp.id,
            salaryStructureId: primaryStructureId,
            baseSalary: primaryBaseSalary,
            workingDays: new Prisma.Decimal(totalWorkingDays),
            presentDays: new Prisma.Decimal(presentDays),
            paidLeaveDays: new Prisma.Decimal(paidLeaveDays),
            absentDays: new Prisma.Decimal(absentDays),
            unpaidLeaveDays: new Prisma.Decimal(unpaidLeaveDays),
            lossOfPayDays: new Prisma.Decimal(lossOfPayDays),
            grossEarnings: empGrossEarnings,
            totalDeductions: empTotalDeductions,
            employerContributions: empTotalEmployerContrib,
            netPay: empNetPay,
            paidAmount: new Prisma.Decimal(0),
            remainingPayable: empNetPay.greaterThan(0) ? empNetPay : new Prisma.Decimal(0),
            paymentStatus: 'UNPAID',
            calculationSnapshot: {
              segments: segments.map((s) => ({
                effectiveFrom: s.segmentStart.toISOString(),
                effectiveTo: s.segmentEnd.toISOString(),
                baseSalary: s.assignment.baseSalary.toString(),
                workingDays: s.segmentWorkingDays,
              })),
              attendance: {
                totalWorkingDays,
                presentDays,
                paidLeaveDays,
                absentDays,
                unpaidLeaveDays,
                lossOfPayDays,
                missingAttendanceDays,
              },
              warnings: [
                ...(missingAttendanceDays.length > 0 ? [`Missing attendance for ${missingAttendanceDays.length} days`] : []),
                ...(hasNegativeNetPay ? ['PAYROLL_NEGATIVE_NET_PAY: Total deductions exceed gross earnings'] : []),
              ],
            },
          },
        });

        // Create line items
        for (const [_, item] of aggregatedLineItems) {
          await tx.payrollLineItem.create({
            data: {
              payrollRunEmployeeId: runEmployee.id,
              componentId: item.component.id,
              componentName: item.component.name,
              componentCode: item.component.code,
              componentType: item.component.type,
              calculatedAmount: item.amount,
              rateApplied: item.rateApplied || null,
            },
          });
        }

        runTotalGross = runTotalGross.add(empGrossEarnings);
        runTotalDeductions = runTotalDeductions.add(empTotalDeductions);
        runTotalEmployerContrib = runTotalEmployerContrib.add(empTotalEmployerContrib);
        runTotalNetPay = runTotalNetPay.add(empNetPay);
        runEmployeeCount++;
      }

      // Update PayrollRun summary
      const updatedRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: 'PROCESSING',
          totalEmployees: runEmployeeCount,
          totalGross: runTotalGross,
          totalDeductions: runTotalDeductions,
          totalEmployerContributions: runTotalEmployerContrib,
          totalNetPay: runTotalNetPay,
          totalPaid: new Prisma.Decimal(0),
          totalRemainingPayable: runTotalNetPay,
        },
        include: {
          employees: {
            include: {
              employee: { select: { id: true, employeeNumber: true, displayName: true } },
              lineItems: true,
            },
          },
        },
      });

      return updatedRun;
    });
  }

  // =========================================================================
  // STATE MACHINE & OPTIMISTIC CONCURRENCY
  // =========================================================================

  /**
   * Update payroll run status with state machine and optimistic concurrency (version) validation
   */
  public static async updatePayrollRunStatus(
    ctx: ScopeContext,
    payrollRunId: string,
    input: { version: number; status: 'REVIEWED' | 'APPROVED'; remarks?: string | null }
  ): Promise<any> {
    const { schoolId, userId, ipAddress } = ctx;

    const run = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, schoolId },
    });
    if (!run) throw new NotFoundError(`PayrollRun ${payrollRunId} not found`);

    // Concurrency check (Amendment 7)
    if (run.version !== input.version) {
      throw new ConflictError(`PAYROLL_STALE_VERSION: Payroll run version mismatch (current: ${run.version}, provided: ${input.version})`);
    }

    // State machine check (Amendment 8)
    const validNextStates: Record<string, string[]> = {
      OPEN: ['PROCESSING'],
      PROCESSING: ['REVIEWED'],
      REVIEWED: ['APPROVED'],
    };

    const allowed = validNextStates[run.status] || [];
    if (!allowed.includes(input.status)) {
      throw new BadRequestError(
        `INVALID_PAYROLL_STATUS_TRANSITION: Cannot transition payroll run from ${run.status} to ${input.status}`
      );
    }

    // Negative Net Pay check (Safeguard 7, TEST 47)
    if (['REVIEWED', 'APPROVED'].includes(input.status)) {
      const negativeEmployees = await prisma.payrollRunEmployee.findMany({
        where: {
          payrollRunId: run.id,
          netPay: { lt: 0 },
        },
      });
      if (negativeEmployees.length > 0) {
        throw new BadRequestError('PAYROLL_NEGATIVE_NET_PAY: Cannot review or approve payroll run with negative net pay');
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: input.status,
          version: run.version + 1,
          approvedByUserId: input.status === 'APPROVED' ? userId : run.approvedByUserId,
          approvedAt: input.status === 'APPROVED' ? new Date() : run.approvedAt,
          remarks: input.remarks || run.remarks,
        },
      });

      await writeAuditLog({
        tenantId: ctx.tenantId,
        schoolId,
        actorId: userId,
        action: `PAYROLL_RUN_${input.status}`,
        entityType: 'PayrollRun',
        entityId: run.id,
        beforeData: { status: run.status, version: run.version },
        afterData: { status: updated.status, version: updated.version },
        metadataInfo: { actorUserId: userId },
        ipAddress,
      });

      return updated;
    });
  }

  // =========================================================================
  // GENERAL LEDGER INTEGRATION (POSTING & REVERSAL)
  // =========================================================================

  /**
   * Post PayrollRun to General Ledger with:
   * 1. GL account mapping validation (Amendment 15)
   * 2. Shared Module 07 Idempotency (Amendment 13)
   * 3. Balanced double-entry reconciliation (DR Salary Expense + DR Employer Contrib Expense == CR Deduction Liab + CR Employer Contrib Liab + CR Payroll Payable) (Amendment 16)
   */
  public static async postPayrollRun(
    ctx: ScopeContext,
    payrollRunId: string,
    input: { version: number; idempotencyKey?: string | null; remarks?: string | null }
  ): Promise<any> {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const run = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, schoolId },
      include: {
        period: true,
        employees: {
          include: {
            lineItems: true,
          },
        },
      },
    });
    if (!run) throw new NotFoundError(`PayrollRun ${payrollRunId} not found`);

    if (run.version !== input.version) {
      throw new ConflictError(`PAYROLL_STALE_VERSION: Payroll run version mismatch (current: ${run.version}, provided: ${input.version})`);
    }

    if (run.status !== 'APPROVED') {
      throw new BadRequestError(`INVALID_PAYROLL_STATUS_TRANSITION: Only APPROVED payroll runs can be posted to ledger (current: ${run.status})`);
    }

    // Negative Net Pay check (Safeguard 7, TEST 47)
    const hasNegative = run.employees.some((e: any) => new Prisma.Decimal(e.netPay.toString()).isNegative());
    if (hasNegative) {
      throw new BadRequestError('PAYROLL_NEGATIVE_NET_PAY: Cannot post payroll run containing employees with negative net pay');
    }

    // Resolve payroll configuration & payable account
    const config = await prisma.payrollConfiguration.findUnique({
      where: { schoolId },
    });
    const payableAccountId = config?.defaultPayableAccountId;
    if (!payableAccountId) {
      throw new BadRequestError('SALARY_COMPONENT_GL_MAPPING_MISSING: Payroll payable account is not configured');
    }

    const components = await prisma.salaryComponent.findMany({
      where: { schoolId },
    });
    const compMap = new Map(components.map((c) => [c.id, c]));

    // Validate GL mapping for every line item component (Amendment 15)
    for (const emp of run.employees) {
      for (const item of emp.lineItems) {
        const comp = compMap.get(item.componentId);
        if (!comp) continue;
        if (comp.type === 'EARNING' && !comp.glAccountId) {
          throw new BadRequestError(`SALARY_COMPONENT_GL_MAPPING_MISSING: Earning component "${comp.name}" (${comp.code}) lacks an Expense GL account`);
        }
        if (comp.type === 'DEDUCTION' && !comp.glAccountId) {
          throw new BadRequestError(`SALARY_COMPONENT_GL_MAPPING_MISSING: Deduction component "${comp.name}" (${comp.code}) lacks a Liability GL account`);
        }
        if (comp.type === 'EMPLOYER_CONTRIBUTION') {
          if (!comp.glAccountId || !comp.employerLiabilityAccountId) {
            throw new BadRequestError(`SALARY_COMPONENT_GL_MAPPING_MISSING: Employer contribution "${comp.name}" (${comp.code}) requires both Expense and Liability GL accounts`);
          }
        }
      }
    }

    // Execute with shared financial idempotency (Amendment 13)
    return await FinanceService.withIdempotency(
      tenantId,
      schoolId,
      'POST_PAYROLL_RUN',
      input.idempotencyKey,
      { payrollRunId, version: input.version },
      async (tx) => {
        // Build balanced journal lines
        const journalLines: Array<{
          accountId: string;
          description: string;
          debit: Prisma.Decimal;
          credit: Prisma.Decimal;
          employeeId?: string | null;
        }> = [];

        // Aggregate component debit & credit amounts across all employees
        const expenseLines = new Map<string, Prisma.Decimal>();
        const liabilityLines = new Map<string, Prisma.Decimal>();
        let totalNetPay = new Prisma.Decimal(0);

        for (const emp of run.employees) {
          totalNetPay = totalNetPay.add(emp.netPay);

          for (const item of emp.lineItems) {
            const comp = compMap.get(item.componentId);
            if (!comp) continue;
            const amt = item.calculatedAmount;

            if (comp.type === 'EARNING') {
              const accId = comp.glAccountId!;
              expenseLines.set(accId, (expenseLines.get(accId) || new Prisma.Decimal(0)).add(amt));
            } else if (comp.type === 'DEDUCTION') {
              const accId = comp.glAccountId!;
              liabilityLines.set(accId, (liabilityLines.get(accId) || new Prisma.Decimal(0)).add(amt));
            } else if (comp.type === 'EMPLOYER_CONTRIBUTION') {
              const expAccId = comp.glAccountId!;
              const liabAccId = comp.employerLiabilityAccountId!;
              expenseLines.set(expAccId, (expenseLines.get(expAccId) || new Prisma.Decimal(0)).add(amt));
              liabilityLines.set(liabAccId, (liabilityLines.get(liabAccId) || new Prisma.Decimal(0)).add(amt));
            }
          }
        }

        // Add debits for salary & employer contribution expenses
        for (const [accId, amt] of expenseLines) {
          if (amt.greaterThan(0)) {
            journalLines.push({
              accountId: accId,
              description: `Payroll ${run.runNumber} - Expenses`,
              debit: amt,
              credit: new Prisma.Decimal(0),
            });
          }
        }

        // Add credits for deduction liabilities & employer contribution liabilities
        for (const [accId, amt] of liabilityLines) {
          if (amt.greaterThan(0)) {
            journalLines.push({
              accountId: accId,
              description: `Payroll ${run.runNumber} - Liabilities / Withholdings`,
              debit: new Prisma.Decimal(0),
              credit: amt,
            });
          }
        }

        // Add credit for net payroll payable
        if (totalNetPay.greaterThan(0)) {
          journalLines.push({
            accountId: payableAccountId,
            description: `Payroll ${run.runNumber} - Net Salaries Payable`,
            debit: new Prisma.Decimal(0),
            credit: totalNetPay,
          });
        }

        // Post balanced journal entry via Module 07
        let journal;
        try {
          journal = await FinanceService.postJournalEntry(tx, {
            tenantId,
            schoolId,
            postingDate: new Date(run.period.payDate),
            description: `Payroll Run ${run.runNumber} - ${run.period.periodName}`,
            sourceType: 'PAYROLL_RUN',
            sourceId: run.id,
            lines: journalLines,
            actorUserId: userId,
          });
        } catch (err: any) {
          if (err?.message?.includes('FINANCIAL_PERIOD_CLOSED')) {
            throw new BadRequestError(`PAYROLL_FINANCIAL_PERIOD_CLOSED: ${err.message}`);
          }
          throw err;
        }

        // Update PayrollRun status to POSTED
        const postedRun = await tx.payrollRun.update({
          where: { id: run.id },
          data: {
            status: 'POSTED',
            journalEntryId: journal.id,
            postedByUserId: userId,
            postedAt: new Date(),
            version: run.version + 1,
          },
        });

        await writeAuditLog({
          tenantId,
          schoolId,
          actorId: userId,
          action: 'PAYROLL_RUN_POSTED',
          entityType: 'PayrollRun',
          entityId: run.id,
          beforeData: { status: 'APPROVED', version: run.version },
          afterData: { status: 'POSTED', journalNumber: journal.journalNumber, version: postedRun.version },
          metadataInfo: { actorUserId: userId },
          ipAddress,
        });

        return postedRun;
      }
    );
  }

  /**
   * Reverse posted PayrollRun (Amendment 9)
   */
  public static async reversePayrollRun(
    ctx: ScopeContext,
    payrollRunId: string,
    input: { version: number; reason: string }
  ): Promise<any> {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const run = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, schoolId },
      include: { journalEntry: true },
    });
    if (!run) throw new NotFoundError(`PayrollRun ${payrollRunId} not found`);

    if (run.version !== input.version) {
      throw new ConflictError(`PAYROLL_STALE_VERSION: Payroll run version mismatch (current: ${run.version}, provided: ${input.version})`);
    }

    if (run.status === 'PAID') {
      throw new BadRequestError('PAYROLL_ALREADY_PAID: Cannot reverse a payroll run that is marked PAID');
    }

    if (run.status !== 'POSTED') {
      throw new BadRequestError(`INVALID_PAYROLL_STATUS_TRANSITION: Only POSTED payroll runs can be reversed (current: ${run.status})`);
    }

    // Block if payments have already been disbursed
    const paymentsCount = await prisma.payrollPayment.count({
      where: { payrollRunId: run.id },
    });
    if (paymentsCount > 0) {
      throw new BadRequestError('PAYROLL_ALREADY_PAID: Cannot reverse a payroll run with settled payments');
    }

    return await prisma.$transaction(async (tx) => {
      let reversalJournalId: string | null = null;
      if (run.journalEntryId) {
        const reversalJournal = await FinanceService.reverseJournalEntry(tx, {
          tenantId,
          schoolId,
          journalEntryId: run.journalEntryId,
          reason: input.reason,
          actorUserId: userId,
        });
        reversalJournalId = reversalJournal.id;
      }

      const reversedRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: 'REVERSED',
          reversalJournalEntryId: reversalJournalId,
          reversalReason: input.reason,
          reversedByUserId: userId,
          reversedAt: new Date(),
          version: run.version + 1,
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'PAYROLL_RUN_REVERSED',
        entityType: 'PayrollRun',
        entityId: run.id,
        beforeData: { status: 'POSTED', version: run.version },
        afterData: { status: 'REVERSED', version: reversedRun.version },
        metadataInfo: { actorUserId: userId, reason: input.reason },
        ipAddress,
      });

      return reversedRun;
    });
  }

  // =========================================================================
  // SALARY DISBURSEMENTS & CONCURRENCY PROTECTION
  // =========================================================================

  /**
   * Disburse payroll payments with:
   * 1. SELECT ... FOR UPDATE row-level locking on PayrollRunEmployee (Amendment 12)
   * 2. Atomic remainingPayable check to prevent overpayment (Amendment 10, 11)
   * 3. BankAccount to LedgerAccount resolution (Amendment 14)
   * 4. PayrollRun transitions to PAID only when all employees settle (Amendment 10)
   * 5. Shared Module 07 Idempotency (Amendment 13)
   */
  public static async disbursePayrollPayment(
    ctx: ScopeContext,
    payrollRunId: string,
    input: any
  ): Promise<any> {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const run = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, schoolId },
    });
    if (!run) throw new NotFoundError(`PayrollRun ${payrollRunId} not found`);

    if (run.status !== 'POSTED') {
      throw new BadRequestError(`INVALID_PAYROLL_STATUS_TRANSITION: Cannot make payment for payroll run in status ${run.status}`);
    }

    // Resolve disbursing Ledger Account (Amendment 14)
    let disbursingAccountId = input.disbursingAccountId;
    if (input.bankAccountId) {
      const bankAcc = await prisma.bankAccount.findFirst({
        where: { id: input.bankAccountId, schoolId },
      });
      if (!bankAcc) throw new NotFoundError(`BankAccount ${input.bankAccountId} not found`);
      disbursingAccountId = bankAcc.accountId; // Resolve linked Ledger Account!
    }

    if (!disbursingAccountId) {
      const config = await prisma.payrollConfiguration.findUnique({ where: { schoolId } });
      disbursingAccountId = config?.defaultDisbursementAccountId;
      if (!disbursingAccountId) {
        // Fallback to primary cash/bank account
        const cashAcc = await FinanceService.getSystemAccount(tenantId, schoolId, '1010');
        disbursingAccountId = cashAcc.id;
      }
    }

    const config = await prisma.payrollConfiguration.findUnique({ where: { schoolId } });
    const payableAccountId = config?.defaultPayableAccountId;
    if (!payableAccountId) {
      throw new BadRequestError('SALARY_COMPONENT_GL_MAPPING_MISSING: Payroll payable account is not configured');
    }

    return await FinanceService.withIdempotency(
      tenantId,
      schoolId,
      'DISBURSE_PAYROLL_PAYMENT',
      input.idempotencyKey,
      { payrollRunId, ...input },
      async (tx) => {
        const paymentNumber = await FinanceService.getNextNumber(
          tenantId,
          schoolId,
          'PAYROLL_PAYMENT',
          'PAY-{YYYY}-',
          6,
          tx
        );

        // Fetch employees in run with row-level locks (Amendment 12: SELECT ... FOR UPDATE)
        const lockedRows = await tx.$queryRaw<Array<{
          id: string;
          employee_id: string;
          net_pay: Prisma.Decimal;
          paid_amount: Prisma.Decimal;
          remaining_payable: Prisma.Decimal;
        }>>`
          SELECT id, employee_id, net_pay, paid_amount, remaining_payable
          FROM payroll_run_employees
          WHERE payroll_run_id = ${run.id}::uuid
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new BadRequestError('No employees found in payroll run');
        }

        const employeeMap = new Map<string, typeof lockedRows[0]>();
        for (const row of lockedRows) {
          employeeMap.set(row.employee_id, row);
        }

        // Determine allocations
        const allocationsToProcess: Array<{
          employeeId: string;
          runEmployeeId: string;
          amount: Prisma.Decimal;
        }> = [];

        if (input.allocations && input.allocations.length > 0) {
          for (const alloc of input.allocations) {
            const row = employeeMap.get(alloc.employeeId);
            if (!row) throw new NotFoundError(`Employee ${alloc.employeeId} is not in this payroll run`);

            const amt = FinanceService.toDecimal(alloc.amount);
            const remaining = FinanceService.toDecimal(row.remaining_payable);

            if (amt.greaterThan(remaining)) {
              throw new BadRequestError(
                `PAYMENT_OVERFLOW: Payment amount (${amt.toFixed(2)}) exceeds remaining payable (${remaining.toFixed(2)}) for employee ${alloc.employeeId}`
              );
            }

            allocationsToProcess.push({
              employeeId: alloc.employeeId,
              runEmployeeId: row.id,
              amount: amt,
            });
          }
        } else {
          // Default: Disburse full remaining payable for all unpaid/partially paid employees
          for (const row of lockedRows) {
            const remaining = FinanceService.toDecimal(row.remaining_payable);
            if (remaining.greaterThan(0)) {
              allocationsToProcess.push({
                employeeId: row.employee_id,
                runEmployeeId: row.id,
                amount: remaining,
              });
            }
          }
        }

        if (allocationsToProcess.length === 0) {
          throw new BadRequestError('No outstanding payable balances to disburse');
        }

        let totalPaymentAmount = new Prisma.Decimal(0);
        for (const a of allocationsToProcess) {
          totalPaymentAmount = totalPaymentAmount.add(a.amount);
        }

        // Post disbursement journal entry: DR Payroll Payable, CR Disbursing Account
        const journal = await FinanceService.postJournalEntry(tx, {
          tenantId,
          schoolId,
          postingDate: new Date(input.paymentDate),
          description: `Disbursement ${paymentNumber} - Run ${run.runNumber}`,
          sourceType: 'PAYROLL_PAYMENT',
          lines: [
            {
              accountId: payableAccountId,
              description: `Settlement of Payroll Payable - ${paymentNumber}`,
              debit: totalPaymentAmount,
              credit: new Prisma.Decimal(0),
            },
            {
              accountId: disbursingAccountId,
              description: `Disbursing Account Payout - ${paymentNumber}`,
              debit: new Prisma.Decimal(0),
              credit: totalPaymentAmount,
            },
          ],
          actorUserId: userId,
        });

        // Create PayrollPayment record
        const payment = await tx.payrollPayment.create({
          data: {
            tenantId,
            schoolId,
            payrollRunId: run.id,
            paymentNumber,
            paymentDate: new Date(input.paymentDate),
            paymentMethod: input.paymentMethod || 'BANK_TRANSFER',
            disbursingAccountId,
            bankAccountId: input.bankAccountId || null,
            totalAmount: totalPaymentAmount,
            referenceNumber: input.referenceNumber || null,
            remarks: input.remarks || null,
            idempotencyKey: input.idempotencyKey || null,
            journalEntryId: journal.id,
            createdByUserId: userId,
          },
        });

        // Create allocations and update employee balances
        for (const a of allocationsToProcess) {
          await tx.payrollPaymentAllocation.create({
            data: {
              payrollPaymentId: payment.id,
              payrollRunEmployeeId: a.runEmployeeId,
              employeeId: a.employeeId,
              amount: a.amount,
            },
          });

          const row = employeeMap.get(a.employeeId)!;
          const newPaid = FinanceService.toDecimal(row.paid_amount).add(a.amount);
          const newRemaining = FinanceService.toDecimal(row.remaining_payable).sub(a.amount);
          const newStatus = newRemaining.isZero() ? 'PAID' : 'PARTIALLY_PAID';

          await tx.payrollRunEmployee.update({
            where: { id: a.runEmployeeId },
            data: {
              paidAmount: newPaid,
              remainingPayable: newRemaining,
              paymentStatus: newStatus,
            },
          });
        }

        // Recalculate PayrollRun totals and status (Amendment 10)
        const updatedEmployees = await tx.payrollRunEmployee.findMany({
          where: { payrollRunId: run.id },
          select: { netPay: true, paidAmount: true, remainingPayable: true },
        });

        let totalPaidSum = new Prisma.Decimal(0);
        let allEmployeesZeroRemaining = true;

        for (const ue of updatedEmployees) {
          totalPaidSum = totalPaidSum.add(ue.paidAmount);
          if (!ue.remainingPayable.isZero()) {
            allEmployeesZeroRemaining = false;
          }
        }

        const newRunStatus = allEmployeesZeroRemaining ? 'PAID' : 'POSTED';

        await tx.payrollRun.update({
          where: { id: run.id },
          data: {
            totalPaid: totalPaidSum,
            totalRemainingPayable: run.totalNetPay.sub(totalPaidSum),
            status: newRunStatus,
            paidAt: allEmployeesZeroRemaining ? new Date() : null,
          },
        });

        await writeAuditLog({
          tenantId,
          schoolId,
          actorId: userId,
          action: 'PAYROLL_PAYMENT_DISBURSED',
          entityType: 'PayrollPayment',
          entityId: payment.id,
          beforeData: null,
          afterData: { paymentNumber, totalAmount: totalPaymentAmount.toString(), runStatus: newRunStatus },
          metadataInfo: { actorUserId: userId },
          ipAddress,
        });

        return payment;
      }
    );
  }

  // =========================================================================
  // PAYSLIPS & SELF-SERVICE VISIBILITY
  // =========================================================================

  /**
   * Get employee payslip with visibility state and authorization check (Amendment 24)
   */
  public static async getPayslip(
    ctx: ScopeContext,
    idOrEmployeeId: string,
    payrollRunId?: string
  ): Promise<any> {
    const { schoolId, userId, permissions } = ctx;

    const runEmployee = await prisma.payrollRunEmployee.findFirst({
      where: {
        OR: [
          { id: idOrEmployeeId },
          {
            employeeId: idOrEmployeeId,
            ...(payrollRunId ? { payrollRunId } : {}),
          },
        ],
        payrollRun: { schoolId },
      },
      include: {
        payrollRun: {
          include: { period: true },
        },
        employee: {
          include: {
            department: true,
            designation: true,
            bankAccounts: { where: { isPrimary: true } },
          },
        },
        lineItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!runEmployee || runEmployee.employee.schoolId !== schoolId) {
      throw new NotFoundError(`Payslip ${idOrEmployeeId} not found`);
    }

    // Visibility rule: Payslip visible ONLY when run is POSTED or PAID (Amendment 24)
    const runStatus = runEmployee.payrollRun.status;
    if (!['POSTED', 'PAID', 'CLOSED'].includes(runStatus)) {
      throw new ForbiddenError('PAYSLIP_UNAVAILABLE: Payslip is only visible after payroll is POSTED or PAID');
    }

    // Privacy rule: Employee can only view own payslip unless possessing hr.employee.view / payroll.run.view / payroll.payslip.view
    const isHrAdmin =
      ctx.isSuperAdmin ||
      permissions?.includes('*') ||
      permissions?.includes('payroll.run.view') ||
      permissions?.includes('hr.employee.view') ||
      permissions?.includes('payroll.payslip.view') ||
      permissions?.includes('payroll.run.post') ||
      permissions?.includes('settings.manage');
    if (!isHrAdmin && runEmployee.employee.userId !== userId) {
      throw new ForbiddenError('ACCESS_DENIED: You are not authorized to view this payslip');
    }

    // Mask bank account in payslip
    const bankAcc = runEmployee.employee.bankAccounts[0];
    const maskedBank = bankAcc ? {
      bankName: bankAcc.bankName,
      branchName: bankAcc.branchName,
      maskedAccountNumber: bankAcc.maskedAccountNumber,
      ifscCode: bankAcc.ifscCode,
    } : null;

    return {
      id: runEmployee.id,
      runNumber: runEmployee.payrollRun.runNumber,
      periodName: runEmployee.payrollRun.period.periodName,
      payDate: runEmployee.payrollRun.period.payDate,
      employee: {
        id: runEmployee.employee.id,
        employeeNumber: runEmployee.employee.employeeNumber,
        displayName: runEmployee.employee.displayName,
        department: runEmployee.employee.department?.name,
        designation: runEmployee.employee.designation?.name,
        joiningDate: runEmployee.employee.joiningDate,
      },
      attendance: {
        workingDays: runEmployee.workingDays,
        presentDays: runEmployee.presentDays,
        paidLeaveDays: runEmployee.paidLeaveDays,
        lossOfPayDays: runEmployee.lossOfPayDays,
      },
      earnings: runEmployee.lineItems.filter((li) => li.componentType === 'EARNING'),
      deductions: runEmployee.lineItems.filter((li) => li.componentType === 'DEDUCTION'),
      employerContributions: runEmployee.lineItems.filter((li) => li.componentType === 'EMPLOYER_CONTRIBUTION'),
      grossEarnings: runEmployee.grossEarnings,
      totalDeductions: runEmployee.totalDeductions,
      netPay: runEmployee.netPay,
      bankAccount: maskedBank,
      paymentStatus: runEmployee.paymentStatus,
      paidAmount: runEmployee.paidAmount,
      remainingPayable: runEmployee.remainingPayable,
    };
  }

  // =========================================================================
  // PAYROLL REPORTS & RECONCILIATION (Safeguards 8, 16, TEST 80, 81, 82)
  // =========================================================================

  /**
   * Payroll register report with secure CSV export
   */
  public static async getPayrollRegisterReport(
    ctx: ScopeContext,
    query: { periodId?: string; runId?: string; format?: string }
  ): Promise<any> {
    const { schoolId, tenantId, userId, ipAddress, permissions } = ctx;

    const runs = await prisma.payrollRun.findMany({
      where: {
        schoolId,
        ...(query.periodId ? { periodId: query.periodId } : {}),
        ...(query.runId ? { id: query.runId } : {}),
      },
      include: {
        period: true,
        employees: {
          include: {
            employee: {
              include: {
                department: true,
                designation: true,
                bankAccounts: { where: { isPrimary: true } },
              },
            },
            lineItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (query.format === 'csv') {
      const hasExport =
        ctx.isSuperAdmin ||
        permissions?.includes('*') ||
        permissions?.includes('payroll.export') ||
        permissions?.includes('payroll.run.manage');
      if (!hasExport) {
        throw new ForbiddenError('ACCESS_DENIED: You lack payroll.export permission to export payroll reports');
      }

      let csv = 'Run Number,Period,Employee Number,Employee Name,Department,Designation,Working Days,Paid Days,Gross Earnings,Total Deductions,Net Pay,Payment Status,Bank Name,Masked Account\n';
      for (const run of runs) {
        for (const emp of run.employees) {
          const bank = emp.employee.bankAccounts[0];
          const maskedAcc = bank?.maskedAccountNumber || 'N/A';
          csv += `"${run.runNumber}","${run.period.periodName}","${emp.employee.employeeNumber}","${emp.employee.displayName}","${emp.employee.department?.name || ''}","${emp.employee.designation?.name || ''}",${emp.workingDays},${emp.presentDays},${emp.grossEarnings},${emp.totalDeductions},${emp.netPay},"${emp.paymentStatus}","${bank?.bankName || ''}","${maskedAcc}"\n`;
        }
      }

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'PAYROLL_REPORT_EXPORTED',
        entityType: 'PayrollRun',
        entityId: query.runId || query.periodId || 'ALL',
        beforeData: null,
        afterData: { format: 'csv', runCount: runs.length },
        metadataInfo: { actorUserId: userId },
        ipAddress,
      });

      return { format: 'csv', data: csv, count: runs.length };
    }

    return runs;
  }

  /**
   * GL reconciliation report (verifies Debit == Credit, snapshot == GL, and payment reconciliation)
   */
  public static async getGlReconciliationReport(
    ctx: ScopeContext,
    payrollRunId: string
  ): Promise<any> {
    const { schoolId } = ctx;

    const run = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, schoolId },
      include: {
        journalEntry: {
          include: { lines: { include: { account: true } } },
        },
        employees: true,
        payments: {
          include: {
            journalEntry: {
              include: { lines: { include: { account: true } } },
            },
          },
        },
      },
    });

    if (!run) throw new NotFoundError(`PayrollRun ${payrollRunId} not found`);

    let journalTotalDebit = new Prisma.Decimal(0);
    let journalTotalCredit = new Prisma.Decimal(0);

    if (run.journalEntry) {
      for (const line of run.journalEntry.lines) {
        journalTotalDebit = journalTotalDebit.add(line.debit);
        journalTotalCredit = journalTotalCredit.add(line.credit);
      }
    }

    let totalDisbursed = new Prisma.Decimal(0);
    for (const p of run.payments) {
      totalDisbursed = totalDisbursed.add(p.totalAmount);
    }

    let employeeTotalNet = new Prisma.Decimal(0);
    let employeeTotalPaid = new Prisma.Decimal(0);
    let employeeTotalRemaining = new Prisma.Decimal(0);

    for (const emp of run.employees) {
      employeeTotalNet = employeeTotalNet.add(emp.netPay);
      employeeTotalPaid = employeeTotalPaid.add(emp.paidAmount);
      employeeTotalRemaining = employeeTotalRemaining.add(emp.remainingPayable);
    }

    const isJournalBalanced = journalTotalDebit.equals(journalTotalCredit);
    const isNetReconciled = employeeTotalNet.equals(run.totalNetPay);
    const isPaymentReconciled = employeeTotalPaid.equals(totalDisbursed);

    return {
      payrollRunId: run.id,
      runNumber: run.runNumber,
      status: run.status,
      snapshot: {
        totalGross: run.totalGross,
        totalDeductions: run.totalDeductions,
        totalEmployerContributions: run.totalEmployerContributions,
        totalNetPay: run.totalNetPay,
        totalPaid: run.totalPaid,
      },
      journal: run.journalEntry ? {
        journalNumber: run.journalEntry.journalNumber,
        postingDate: run.journalEntry.postingDate,
        totalDebit: journalTotalDebit,
        totalCredit: journalTotalCredit,
        isBalanced: isJournalBalanced,
        linesCount: run.journalEntry.lines.length,
      } : null,
      disbursements: {
        paymentsCount: run.payments.length,
        totalDisbursed,
        employeeTotalPaid,
        employeeTotalRemaining,
        isPaymentReconciled,
      },
      reconciliation: {
        isJournalBalanced,
        isNetReconciled,
        isPaymentReconciled,
        status: (isJournalBalanced && isNetReconciled && isPaymentReconciled) ? 'RECONCILED' : 'DISCREPANCY',
      },
    };
  }
}
