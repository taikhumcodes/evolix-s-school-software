import { z } from 'zod';

export const createGuardianSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional().nullable(),
  lastName: z.string().min(1, 'Last name is required').max(100),
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']),
  phone: z.string().min(7, 'Valid phone number is required').max(30),
  altPhone: z.string().max(30).optional().nullable(),
  email: z.string().email('Invalid email address').max(255).optional().nullable().or(z.literal('')),
  occupation: z.string().max(100).optional().nullable(),
  employer: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(50).default('IN'),
  preferredLanguage: z.enum(['en', 'hi', 'hinglish']).default('en'),
  emailNotification: z.boolean().default(true),
  smsNotification: z.boolean().default(true),
  whatsappNotification: z.boolean().default(false),
  emergencyContactPreference: z.enum(['PHONE', 'EMAIL', 'SMS']).default('PHONE'),
  // Optional initial link to a student
  studentId: z.string().uuid().optional().nullable(),
  isPrimary: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  hasPickupPermission: z.boolean().default(true),
  livesWithStudent: z.boolean().default(true),
});

export const updateGuardianSchema = createGuardianSchema.partial().omit({ studentId: true });

export const linkStudentSchema = z.object({
  studentId: z.string().uuid('Valid student ID is required'),
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']),
  isPrimary: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  hasPickupPermission: z.boolean().default(true),
  livesWithStudent: z.boolean().default(true),
});

export const updateStudentLinkSchema = z.object({
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']).optional(),
  isPrimary: z.boolean().optional(),
  isEmergencyContact: z.boolean().optional(),
  hasPickupPermission: z.boolean().optional(),
  livesWithStudent: z.boolean().optional(),
});

export const checkDuplicateSchema = z.object({
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  excludeGuardianId: z.string().uuid().optional().nullable(),
});

export const mergeGuardiansSchema = z.object({
  canonicalGuardianId: z.string().uuid('Canonical guardian ID is required'),
  duplicateGuardianId: z.string().uuid('Duplicate guardian ID is required'),
  resolvedFields: z
    .object({
      firstName: z.string().optional(),
      middleName: z.string().optional().nullable(),
      lastName: z.string().optional(),
      relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']).optional(),
      phone: z.string().optional(),
      altPhone: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      occupation: z.string().optional().nullable(),
      employer: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      postalCode: z.string().optional().nullable(),
      country: z.string().optional(),
      preferredLanguage: z.enum(['en', 'hi', 'hinglish']).optional(),
      emailNotification: z.boolean().optional(),
      smsNotification: z.boolean().optional(),
      whatsappNotification: z.boolean().optional(),
      emergencyContactPreference: z.enum(['PHONE', 'EMAIL', 'SMS']).optional(),
    })
    .optional(),
});

export const updatePreferencesSchema = z.object({
  preferredLanguage: z.enum(['en', 'hi', 'hinglish']).optional(),
  emailNotification: z.boolean().optional(),
  smsNotification: z.boolean().optional(),
  whatsappNotification: z.boolean().optional(),
  emergencyContactPreference: z.enum(['PHONE', 'EMAIL', 'SMS']).optional(),
});

export const verifyDocumentSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  verificationNotes: z.string().max(1000).optional().nullable(),
});

export const addNoteSchema = z.object({
  category: z.enum(['GENERAL', 'ADMINISTRATIVE', 'FINANCIAL', 'PARENT_REQUEST']).default('GENERAL'),
  content: z.string().min(1, 'Note content cannot be empty'),
  isConfidential: z.boolean().default(false),
});

export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;
export type UpdateGuardianInput = z.infer<typeof updateGuardianSchema>;
export type LinkStudentInput = z.infer<typeof linkStudentSchema>;
export type UpdateStudentLinkInput = z.infer<typeof updateStudentLinkSchema>;
export type CheckDuplicateInput = z.infer<typeof checkDuplicateSchema>;
export type MergeGuardiansInput = z.infer<typeof mergeGuardiansSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type VerifyDocumentInput = z.infer<typeof verifyDocumentSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
