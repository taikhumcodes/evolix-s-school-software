import { z } from 'zod';

export const SalaryComponentTypeEnum = z.enum(['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION']);

export const SalaryCalculationTypeEnum = z.enum([
  'FLAT',
  'PERCENTAGE_OF_BASIC',
  'PERCENTAGE_OF_GROSS',
  'PERCENTAGE_OF_COMPONENT',
  'FORMULA',
]);

export const CreateSalaryComponentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  type: SalaryComponentTypeEnum,
  calculationType: SalaryCalculationTypeEnum,
  formulaExpression: z.string().max(255).optional().nullable(),
  dependsOnComponentId: z.string().uuid().optional().nullable(),
  isTaxable: z.boolean().default(true),
  isStatutory: z.boolean().default(false),
  affectsGross: z.boolean().default(true),
  affectsNet: z.boolean().default(true),
  glAccountId: z.string().uuid().optional().nullable(),
  employerLiabilityAccountId: z.string().uuid().optional().nullable(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const UpdateSalaryComponentSchema = CreateSalaryComponentSchema.partial();

export const StructureComponentInputSchema = z.object({
  componentId: z.string().uuid(),
  calculationType: SalaryCalculationTypeEnum.optional().nullable(),
  flatAmount: z.coerce.number().min(0).optional().nullable(),
  percentageValue: z.coerce.number().min(0).max(100).optional().nullable(),
  formulaExpression: z.string().max(255).optional().nullable(),
  displayOrder: z.number().int().default(0),
});

export const CreateSalaryStructureSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  description: z.string().max(255).optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  components: z.array(StructureComponentInputSchema).min(1, 'At least one salary component is required'),
});

export const UpdateSalaryStructureSchema = CreateSalaryStructureSchema.partial();

export const AssignSalaryStructureSchema = z.object({
  employeeId: z.string().uuid(),
  salaryStructureId: z.string().uuid(),
  baseSalary: z.coerce.number().positive('Base salary must be greater than 0'),
  effectiveFrom: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  effectiveTo: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const PayrollConfigurationSchema = z
  .object({
    payFrequency: z.enum(['MONTHLY', 'BI_WEEKLY', 'WEEKLY']).optional(),
    payrollFrequency: z.enum(['MONTHLY', 'BI_WEEKLY', 'WEEKLY']).optional(),
    payDay: z.number().int().min(1).max(31).default(30),
    prorationBasis: z.enum(['WORKING_DAYS', 'CALENDAR_DAYS', 'FIXED_30']).optional(),
    salaryProrationBasis: z.enum(['WORKING_DAYS', 'CALENDAR_DAYS', 'FIXED_30']).optional(),
    attendanceCutoffDay: z.number().int().min(1).max(31).default(25),
    defaultExpenseAccountId: z.string().uuid().optional().nullable(),
    salaryExpenseClearingAccountId: z.string().uuid().optional().nullable(),
    defaultPayableAccountId: z.string().uuid().optional().nullable(),
    payrollPayableAccountId: z.string().uuid().optional().nullable(),
    defaultDisbursementAccountId: z.string().uuid().optional().nullable(),
    epfEnabled: z.boolean().default(false),
    epfEmployerRate: z.coerce.number().min(0).max(100).optional().nullable(),
    epfEmployeeRate: z.coerce.number().min(0).max(100).optional().nullable(),
    esicEnabled: z.boolean().default(false),
    esicEmployerRate: z.coerce.number().min(0).max(100).optional().nullable(),
    esicEmployeeRate: z.coerce.number().min(0).max(100).optional().nullable(),
    tdsEnabled: z.boolean().default(false),
    autoLockAfterDays: z.number().int().min(0).default(7),
    autoPostToFinance: z.boolean().optional(),
    payslipVisibilityState: z.string().optional(),
  })
  .transform((data) => ({
    payFrequency: (data.payFrequency || data.payrollFrequency || 'MONTHLY') as 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY',
    payDay: data.payDay ?? 30,
    prorationBasis: (data.prorationBasis || data.salaryProrationBasis || 'WORKING_DAYS') as 'WORKING_DAYS' | 'CALENDAR_DAYS' | 'FIXED_30',
    attendanceCutoffDay: data.attendanceCutoffDay ?? 25,
    defaultExpenseAccountId:
      data.defaultExpenseAccountId !== undefined
        ? data.defaultExpenseAccountId
        : data.salaryExpenseClearingAccountId ?? null,
    defaultPayableAccountId:
      data.defaultPayableAccountId !== undefined
        ? data.defaultPayableAccountId
        : data.payrollPayableAccountId ?? null,
    defaultDisbursementAccountId: data.defaultDisbursementAccountId ?? null,
    epfEnabled: data.epfEnabled ?? false,
    epfEmployerRate: data.epfEmployerRate,
    epfEmployeeRate: data.epfEmployeeRate,
    esicEnabled: data.esicEnabled ?? false,
    esicEmployerRate: data.esicEmployerRate,
    esicEmployeeRate: data.esicEmployeeRate,
    tdsEnabled: data.tdsEnabled ?? false,
    autoLockAfterDays: data.autoLockAfterDays ?? 7,
    autoPostToFinance: data.autoPostToFinance ?? true,
    payslipVisibilityState: data.payslipVisibilityState ?? 'POSTED',
  }));

export const CreatePayrollPeriodSchema = z.object({
  financialYearId: z.string().uuid(),
  periodNumber: z.number().int().positive(),
  periodName: z.string().min(2).max(100),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  payDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const CreatePayrollRunSchema = z.object({
  periodId: z.string().uuid(),
  runType: z.enum(['REGULAR', 'ADJUSTMENT', 'OFF_CYCLE']).default('REGULAR'),
  calculationBasis: z.enum(['WORKING_DAYS', 'CALENDAR_DAYS', 'FIXED_30']).default('WORKING_DAYS'),
  remarks: z.string().max(255).optional().nullable(),
});

export const CalculatePayrollRunSchema = z.object({
  employeeIds: z.array(z.string().uuid()).optional(),
});

export const UpdatePayrollRunStatusSchema = z.object({
  version: z.number().int().positive('Payroll run version is required for concurrency safety'),
  status: z.enum(['REVIEWED', 'APPROVED']),
  remarks: z.string().max(255).optional().nullable(),
});

export const PostPayrollRunSchema = z.object({
  version: z.number().int().positive('Payroll run version is required for concurrency safety'),
  idempotencyKey: z.string().max(128).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const ReversePayrollRunSchema = z.object({
  version: z.number().int().positive('Payroll run version is required for concurrency safety'),
  reason: z.string().min(5, 'Reversal reason must be at least 5 characters'),
});

export const PaymentAllocationInputSchema = z.object({
  employeeId: z.string().uuid(),
  amount: z.coerce.number().positive(),
});

export const DisbursePayrollPaymentSchema = z.object({
  disbursingAccountId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional().nullable(),
  paymentMethod: z.enum(['BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI', 'NEFT', 'RTGS']).default('BANK_TRANSFER'),
  paymentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  referenceNumber: z.string().max(100).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
  idempotencyKey: z.string().max(128).optional().nullable(),
  allocations: z.array(PaymentAllocationInputSchema).optional(),
});

export const CreatePayrollAdjustmentSchema = z.object({
  employeeId: z.string().uuid(),
  periodId: z.string().uuid(),
  type: z.enum(['ADDITION', 'DEDUCTION']),
  name: z.string().min(2).max(100),
  amount: z.coerce.number().positive(),
  reason: z.string().min(3).max(255),
});
