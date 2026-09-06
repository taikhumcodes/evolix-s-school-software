import { z } from 'zod';

export const SetupStepNameSchema = z.enum([
  'school_name',
  'logo',
  'academic_year',
  'classes',
  'sections',
  'subjects',
  'fee_structure',
  'users',
  'transport',
  'done',
]);

export const SetupSchoolNameSchema = z.object({
  name: z.string().min(1, 'School name is required').max(200),
  shortName: z.string().max(50).nullable().optional(),
  board: z.string().max(50).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(20).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
});

export const SetupAcademicYearSchema = z.object({
  academicYearId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const SetupClassesSchema = z.object({
  classes: z.array(
    z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      displayOrder: z.number().int().default(0),
      academicLevel: z.string().nullable().optional(),
    })
  ).min(1, 'At least one class is required'),
});

export const SetupSectionsSchema = z.object({
  mappings: z.array(
    z.object({
      classCode: z.string().min(1),
      sectionNames: z.array(z.string().min(1)),
    })
  ).min(1, 'At least one section mapping is required'),
});

export const SetupSubjectsSchema = z.object({
  subjects: z.array(
    z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      type: z.enum(['THEORY', 'PRACTICAL', 'BOTH']).default('THEORY'),
      classCodes: z.array(z.string()).optional(),
    })
  ).min(1, 'At least one subject is required'),
});

export const SetupFeeStructureSchema = z.object({
  feeHeads: z.array(
    z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      description: z.string().nullable().optional(),
      isRefundable: z.boolean().default(false),
    })
  ).min(1, 'At least one fee head is required'),
});

export const SetupUsersSchema = z.object({
  users: z.array(
    z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().nullable().optional(),
      fullName: z.string().optional(),
      roleName: z.string().optional(),
      roleCode: z.string().optional(),
      roleId: z.string().uuid().optional(),
      password: z.string().min(6).optional(),
    })
  ).optional().default([]),
});

export const SetupTransportSchema = z.object({
  transportEnabled: z.boolean().default(false),
  vehicleTypes: z.array(
    z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      capacity: z.number().int().positive().nullable().optional(),
    })
  ).optional().default([]),
});
