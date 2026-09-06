import { z } from 'zod';

export const CreateVisitorSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  fullName: z.string().min(1).max(150).optional(),
  phone: z.string().min(3).max(30),
  email: z.string().email().optional().nullable(),
  visitorType: z.string().optional().nullable(),
  organization: z.string().max(150).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  photoFileKey: z.string().max(255).optional().nullable(),
  governmentIdType: z.string().max(50).optional().nullable(),
  governmentIdLast4: z.string().max(10).optional().nullable(),
});

export const UpdateVisitorSchema = CreateVisitorSchema.partial();

export const CheckInVisitorSchema = z.object({
  visitorId: z.string().uuid().optional(),
  // Or inline visitor creation if new visitor
  visitor: CreateVisitorSchema.optional(),
  purpose: z.string().min(1).max(150),
  personToMeetEmployeeId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  vehicleNumber: z.string().max(50).optional().nullable(),
  numberOfVisitors: z.number().int().min(1).default(1),
  badgeNumber: z.string().max(50).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
  expectedStatus: z.enum(['CHECKED_IN', 'EXPECTED']).default('CHECKED_IN'),
});

export const CheckOutVisitorSchema = z.object({
  remarks: z.string().max(255).optional().nullable(),
});

export const CancelOrDenyVisitSchema = z.object({
  status: z.enum(['CANCELLED', 'DENIED']),
  remarks: z.string().min(3).max(255),
});

export const StudentPickupReleaseSchema = z.object({
  studentId: z.string().uuid(),
  pickupSessionDate: z.string().optional(), // YYYY-MM-DD, defaults to today
  pickupSession: z.enum(['MORNING', 'AFTERNOON', 'EMERGENCY', 'SPECIAL']).default('AFTERNOON'),
  pickupType: z.enum(['AUTHORIZED_GUARDIAN', 'AUTHORIZED_PERSON', 'EXCEPTION']).default('AUTHORIZED_GUARDIAN'),
  guardianId: z.string().uuid().optional().nullable(),
  visitorId: z.string().uuid().optional().nullable(),
  authorizedPersonName: z.string().max(150).optional().nullable(),
  authorizedPersonPhone: z.string().max(30).optional().nullable(),
  reason: z.string().max(255).optional().nullable(),
  isOverride: z.boolean().default(false),
  overrideReason: z.string().max(500).optional().nullable(),
});
