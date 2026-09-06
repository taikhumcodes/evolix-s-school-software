import { z } from 'zod';

export const createStudentSchema = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid().optional().nullable(),
  rollNumber: z.string().trim().max(50).optional().nullable(),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  middleName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  displayName: z.string().trim().max(200).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be YYYY-MM-DD'),
  placeOfBirth: z.string().trim().max(100).optional().nullable(),
  nationality: z.string().trim().max(50).default('IN').optional(),
  religionId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  casteId: z.string().uuid().optional().nullable(),
  bloodGroup: z.string().trim().max(10).optional().nullable(),
  primaryLanguage: z.string().trim().max(50).optional().nullable(),
  previousSchool: z.string().trim().max(255).optional().nullable(),
  previousClass: z.string().trim().max(100).optional().nullable(),
  addressLine1: z.string().trim().max(255).optional().nullable(),
  addressLine2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(50).default('IN').optional(),

  // Guardian
  guardianName: z.string().trim().min(1, 'Guardian name is required').max(200),
  guardianRelationship: z.string().trim().min(1, 'Guardian relationship is required').max(50),
  guardianPhone: z.string().trim().min(5, 'Guardian phone is required').max(30),
  guardianAltPhone: z.string().trim().max(30).optional().nullable(),
  guardianEmail: z.string().trim().email().optional().nullable().or(z.literal('')),
  guardianOccupation: z.string().trim().max(100).optional().nullable(),
  guardianId: z.string().uuid().optional().nullable(),

  confirmDuplicate: z.boolean().default(false).optional(),
});

export const updateStudentSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  middleName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().min(1).max(100).optional(),
  displayName: z.string().trim().max(200).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  placeOfBirth: z.string().trim().max(100).optional().nullable(),
  nationality: z.string().trim().max(50).optional(),
  religionId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  casteId: z.string().uuid().optional().nullable(),
  bloodGroup: z.string().trim().max(10).optional().nullable(),
  primaryLanguage: z.string().trim().max(50).optional().nullable(),
  previousSchool: z.string().trim().max(255).optional().nullable(),
  previousClass: z.string().trim().max(100).optional().nullable(),
  addressLine1: z.string().trim().max(255).optional().nullable(),
  addressLine2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(50).optional(),
});

export const changeClassSectionSchema = z.object({
  classId: z.string().uuid(),
  sectionId: z.string().uuid().optional().nullable(),
  rollNumber: z.string().trim().max(50).optional().nullable(),
  reason: z.string().trim().max(255).optional(),
});

export const withdrawStudentSchema = z.object({
  withdrawalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reason: z.string().trim().min(1, 'Withdrawal reason is mandatory').max(500),
  remarks: z.string().trim().max(500).optional(),
  destinationSchool: z.string().trim().max(255).optional(),
  lastAttendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const transferStudentSchema = z.object({
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reason: z.string().trim().min(1, 'Transfer reason is mandatory').max(500),
  destinationSchool: z.string().trim().max(255).optional(),
  remarks: z.string().trim().max(500).optional(),
});

export const reactivateStudentSchema = z.object({
  reason: z.string().trim().min(1, 'Reactivation reason is mandatory').max(500),
  academicYearId: z.string().uuid().optional(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid().optional().nullable(),
  rollNumber: z.string().trim().max(50).optional().nullable(),
});

export const linkGuardianSchema = z.object({
  guardianId: z.string().uuid().optional(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  relationship: z.string().trim().min(1).max(50),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  occupation: z.string().trim().max(100).optional(),
  isPrimary: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  hasPickupPermission: z.boolean().default(true),
  livesWithStudent: z.boolean().default(true),
});

export const documentVerifySchema = z.object({
  verificationStatus: z.enum(['VERIFIED', 'REJECTED']),
  verificationNotes: z.string().trim().max(500).optional(),
});

export const addNoteSchema = z.object({
  category: z.enum(['GENERAL', 'ACADEMIC', 'BEHAVIORAL', 'MEDICAL', 'ADMINISTRATIVE']).default('GENERAL'),
  content: z.string().trim().min(1, 'Note content is required'),
  isConfidential: z.boolean().default(false),
});

export const disciplineSchema = z.object({
  incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  incidentType: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  actionTaken: z.string().trim().max(500).optional(),
  status: z.enum(['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED']).default('OPEN').optional(),
  followUpNotes: z.string().trim().max(500).optional(),
});
