import { z } from 'zod';

export const createFamilySchema = z.object({
  familyName: z.string().min(1, 'Family name is required').max(150),
  primaryGuardianId: z.string().uuid().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(50).default('IN'),
  notes: z.string().max(2000).optional().nullable(),
  guardianIds: z.array(z.string().uuid()).optional().default([]),
  studentIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateFamilySchema = z.object({
  familyName: z.string().min(1).max(150).optional(),
  primaryGuardianId: z.string().uuid().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(50).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const addFamilyMemberSchema = z.object({
  memberType: z.enum(['STUDENT', 'GUARDIAN']),
  memberId: z.string().uuid('Valid member ID is required'),
  role: z.enum(['PRIMARY', 'SECONDARY', 'MEMBER']).optional().default('MEMBER'),
});

export const removeFamilyMemberSchema = z.object({
  memberType: z.enum(['STUDENT', 'GUARDIAN']),
  memberId: z.string().uuid('Valid member ID is required'),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>;
export type AddFamilyMemberInput = z.infer<typeof addFamilyMemberSchema>;
export type RemoveFamilyMemberInput = z.infer<typeof removeFamilyMemberSchema>;
