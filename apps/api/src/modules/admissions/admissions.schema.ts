import { z } from 'zod';

export const createAdmissionSchema = z.object({
  academicYearId: z.string().uuid(),
  appliedClassId: z.string().uuid(),
  applicationDate: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED').optional(),
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

  // Override flag if user confirms partial duplicate warning
  confirmDuplicate: z.boolean().default(false).optional(),
});

export const updateAdmissionSchema = createAdmissionSchema.partial();

export const checkDuplicateSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guardianPhone: z.string().trim().min(5),
  guardianEmail: z.string().trim().email().optional().nullable().or(z.literal('')),
});

export const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  rejectionReason: z.string().trim().max(500).optional(),
  reviewNotes: z.string().trim().optional(),
});

export const convertAdmissionSchema = z.object({
  classId: z.string().uuid().optional(), // if changing from appliedClassId
  sectionId: z.string().uuid().optional().nullable(),
  rollNumber: z.string().trim().max(50).optional().nullable(),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
