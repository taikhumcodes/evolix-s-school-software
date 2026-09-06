import { z } from 'zod';

export const EmployeeEmploymentTypeEnum = z.enum([
  'PERMANENT',
  'PROBATION',
  'CONTRACT',
  'PART_TIME',
  'TEMPORARY',
  'INTERN',
]);

export const EmployeeStatusEnum = z.enum([
  'ACTIVE',
  'ON_LEAVE',
  'PROBATION',
  'SUSPENDED',
  'NOTICE_PERIOD',
  'RESIGNED',
  'TERMINATED',
  'RETIRED',
]);

export const BankAccountTypeEnum = z.enum(['SAVINGS', 'CURRENT', 'SALARY']);

export const CreateBankAccountSchema = z.object({
  accountHolderName: z.string().min(2).max(150),
  bankName: z.string().min(2).max(100),
  branchName: z.string().max(100).optional().nullable(),
  accountNumber: z.string().min(6).max(40),
  ifscCode: z.string().min(4).max(30),
  accountType: BankAccountTypeEnum.default('SAVINGS'),
  isPrimary: z.boolean().default(true),
});

export const CreateEmergencyContactSchema = z.object({
  name: z.string().min(2).max(100),
  relation: z.string().min(1).max(50),
  phone: z.string().min(5).max(30),
  alternatePhone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
});

export const CreateEmploymentHistorySchema = z.object({
  companyName: z.string().min(2).max(150),
  designation: z.string().min(2).max(100),
  department: z.string().max(100).optional().nullable(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const CreateEmployeeDocumentSchema = z.object({
  documentType: z.string().min(2).max(50),
  documentNumber: z.string().max(100).optional().nullable(),
  fileKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(100).optional().nullable(),
  fileSize: z.number().int().positive().optional().nullable(),
  expiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
});

export const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional().nullable(),
  lastName: z.string().min(1).max(100),
  displayName: z.string().max(200).optional(),
  gender: z.string().max(20).optional().nullable(),
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  phone: z.string().min(5).max(30),
  alternatePhone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(150),
  permanentAddress: z.string().optional().nullable(),
  currentAddress: z.string().optional().nullable(),
  emergencyContactName: z.string().max(100).optional().nullable(),
  emergencyContactPhone: z.string().max(30).optional().nullable(),
  emergencyContactRelation: z.string().max(50).optional().nullable(),
  bloodGroup: z.string().max(10).optional().nullable(),
  maritalStatus: z.string().max(20).optional().nullable(),
  nationality: z.string().max(50).default('Indian'),
  joiningDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  confirmationDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  probationPeriodMonths: z.number().int().nonnegative().optional().nullable(),
  employmentType: EmployeeEmploymentTypeEnum.default('PERMANENT'),
  departmentId: z.string().uuid().optional().nullable(),
  designationId: z.string().uuid().optional().nullable(),
  reportingManagerId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  status: EmployeeStatusEnum.default('ACTIVE'),
  bankAccount: CreateBankAccountSchema.optional(),
  emergencyContacts: z.array(CreateEmergencyContactSchema).optional(),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().extend({
  exitDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  exitReason: z.string().max(255).optional().nullable(),
});

export const QueryEmployeesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  designationId: z.string().uuid().optional(),
  status: z.string().optional(),
  employmentType: z.string().optional(),
});

// Leave Policy & Allocation Schemas
export const CreateStaffLeaveTypeSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  description: z.string().max(255).optional().nullable(),
  category: z.string().max(30).default('CASUAL'),
  annualQuota: z.coerce.number().min(0).max(365),
  accrualFrequency: z.string().max(20).default('ANNUAL'),
  allowCarryForward: z.boolean().default(false),
  maxCarryForwardDays: z.coerce.number().min(0).optional().nullable(),
  allowEncashment: z.boolean().default(false),
  isUnpaid: z.boolean().default(false),
  requiresApproval: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const UpdateStaffLeaveTypeSchema = CreateStaffLeaveTypeSchema.partial();

export const AllocateEmployeeLeaveSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  entitlementPeriod: z.string().min(2).max(50),
  allocatedDays: z.coerce.number().min(0),
  carryForwardDays: z.coerce.number().min(0).default(0),
  remarks: z.string().max(255).optional(),
});

export const StaffLeaveActionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  rejectionReason: z.string().max(500).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

// Separation Schemas
export const InitiateSeparationSchema = z.object({
  employeeId: z.string().uuid(),
  noticeDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  resignationDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  expectedLastWorkingDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  separationType: z.string().max(30).default('RESIGNATION'),
  reason: z.string().min(5),
});

export const SettleSeparationSchema = z.object({
  actualLastWorkingDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  gratuityAmount: z.coerce.number().min(0).default(0),
  encashmentAmount: z.coerce.number().min(0).default(0),
  noticePayAmount: z.coerce.number().min(0).default(0),
  otherAdditions: z.coerce.number().min(0).default(0),
  otherDeductions: z.coerce.number().min(0).default(0),
  remarks: z.string().max(255).optional().nullable(),
});
