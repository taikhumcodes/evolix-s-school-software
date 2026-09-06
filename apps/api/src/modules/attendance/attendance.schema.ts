import { z } from 'zod';

export const attendanceStatusEnum = z.enum([
  'PRESENT',
  'ABSENT',
  'LATE',
  'HALF_DAY',
  'EXCUSED',
  'LEAVE',
]);

export const holidayTypeEnum = z.enum([
  'PUBLIC_HOLIDAY',
  'SCHOOL_HOLIDAY',
  'VACATION',
  'EMERGENCY_CLOSURE',
  'OTHER',
]);

export const studentLeaveTypeEnum = z.enum([
  'SICK',
  'FAMILY',
  'PERSONAL',
  'MEDICAL',
  'OTHER',
]);

export const staffLeaveTypeEnum = z.enum([
  'CASUAL',
  'SICK',
  'EARNED',
  'MATERNITY',
  'PATERNITY',
  'BEREAVEMENT',
  'UNPAID',
  'OTHER',
]);

// 1. Holiday Schemas
export const createHolidaySchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(150),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD').optional().nullable(),
  academicYearId: z.string().uuid('Valid academicYearId is required'),
  type: holidayTypeEnum.default('PUBLIC_HOLIDAY'),
  description: z.string().trim().max(500).optional().nullable(),
  isWorkingOverride: z.boolean().default(false),
});

export const updateHolidaySchema = createHolidaySchema.partial();

// 2. Student Attendance Register Schemas
export const getRegisterQuerySchema = z.object({
  academicYearId: z.string().uuid('Valid academicYearId is required'),
  classId: z.string().uuid('Valid classId is required'),
  sectionId: z.string().uuid('Valid sectionId is required').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mode: z.enum(['DAILY', 'PERIOD']).default('DAILY'),
});

export const saveRegisterRecordSchema = z.object({
  studentId: z.string().uuid('Valid studentId is required'),
  status: attendanceStatusEnum,
  remarks: z.string().trim().max(255).optional().nullable(),
});

export const saveRegisterSchema = z.object({
  academicYearId: z.string().uuid('Valid academicYearId is required'),
  classId: z.string().uuid('Valid classId is required'),
  sectionId: z.string().uuid('Valid sectionId is required').optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mode: z.enum(['DAILY', 'PERIOD']).default('DAILY'),
  records: z.array(saveRegisterRecordSchema).min(1, 'At least one student record is required'),
});

export const correctAttendanceSchema = z.object({
  newStatus: attendanceStatusEnum,
  reason: z.string().trim().min(1, 'Correction reason is required').max(500),
});

// 3. Student Leave Schemas
export const createStudentLeaveSchema = z.object({
  studentId: z.string().uuid('Valid studentId is required'),
  academicYearId: z.string().uuid('Valid academicYearId is required').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  leaveType: studentLeaveTypeEnum,
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(1000),
});

export const reviewStudentLeaveSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().trim().max(500).optional().nullable(),
});

// 4. Staff Attendance Schemas
export const staffCheckInSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  remarks: z.string().trim().max(255).optional().nullable(),
});

export const staffCheckOutSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  remarks: z.string().trim().max(255).optional().nullable(),
});

export const manualStaffAttendanceSchema = z.object({
  userId: z.string().uuid('Valid userId is required').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE']),
  reason: z.string().trim().min(1, 'Correction reason is required').max(500).optional(),
  correctionReason: z.string().trim().min(1, 'Correction reason is required').max(500).optional(),
  remarks: z.string().trim().max(255).optional().nullable(),
});

// 5. Staff Leave Schemas
export const createStaffLeaveSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  leaveType: staffLeaveTypeEnum,
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(1000),
});

export const reviewStaffLeaveSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().trim().max(500).optional().nullable(),
});

// 6. Reports & Overview Schemas
export const reportsFilterSchema = z.object({
  academicYearId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2000).max(2100).optional(),
});
