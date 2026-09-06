import { z } from 'zod';

export const CreateActivityCategorySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const UpdateActivityCategorySchema = CreateActivityCategorySchema.partial();

export const CreateSchoolEventSchema = z.object({
  categoryId: z.string().uuid(),
  academicYearId: z.string().uuid().optional().nullable(),
  eventCode: z.string().max(50).optional(),
  title: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  startDateTime: z.string(), // ISO string
  endDateTime: z.string(),   // ISO string
  venue: z.string().min(1).max(150),
  capacity: z.number().int().positive().optional().nullable(),
  estimatedBudget: z.number().min(0).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
});

export const UpdateSchoolEventSchema = CreateSchoolEventSchema.partial();

export const AssignEventCoordinatorSchema = z.object({
  employeeId: z.string().uuid(),
  role: z.string().max(100).optional().nullable(),
});

export const RegisterEventParticipantSchema = z.object({
  studentId: z.string().uuid(),
  classSectionId: z.string().uuid().optional().nullable(),
  teamName: z.string().max(100).optional().nullable(),
  houseName: z.string().max(100).optional().nullable(),
  participantType: z.enum(['INDIVIDUAL', 'TEAM', 'HOUSE']).default('INDIVIDUAL'),
  notes: z.string().max(255).optional().nullable(),
});

export const BulkRegisterSectionParticipantsSchema = z.object({
  classSectionId: z.string().uuid(),
  teamName: z.string().max(100).optional().nullable(),
  houseName: z.string().max(100).optional().nullable(),
  participantType: z.enum(['INDIVIDUAL', 'TEAM', 'HOUSE']).default('INDIVIDUAL'),
});

export const UpdateParticipantStatusSchema = z.object({
  status: z.enum(['REGISTERED', 'CONFIRMED', 'ATTENDED', 'ABSENT', 'WITHDRAWN', 'DISQUALIFIED', 'COMPLETED']),
  notes: z.string().max(255).optional().nullable(),
});

export const RecordAchievementSchema = z.object({
  participantId: z.string().uuid(),
  position: z.string().min(1).max(50),
  result: z.string().max(100).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const LinkEventExpenseSchema = z.object({
  expenseBillId: z.string().uuid(),
  notes: z.string().max(255).optional().nullable(),
});
