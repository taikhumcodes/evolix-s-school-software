import { z } from 'zod';

export const CreateClassSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().min(1, 'Code is required').max(50).transform((s) => s.trim().toUpperCase()),
  displayOrder: z.number().int().default(0),
  academicLevel: z.string().max(50).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateClassSchema = CreateClassSchema.partial();

export const CreateSectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().min(1, 'Code is required').max(50).transform((s) => s.trim().toUpperCase()),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const UpdateSectionSchema = CreateSectionSchema.partial();

export const CreateClassSectionSchema = z.object({
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  capacity: z.number().int().positive().default(40),
  isActive: z.boolean().default(true),
});

export const CreateSubjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().min(1, 'Code is required').max(50).transform((s) => s.trim().toUpperCase()),
  type: z.enum(['THEORY', 'PRACTICAL', 'BOTH']).default('THEORY'),
  creditHours: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateSubjectSchema = CreateSubjectSchema.partial();

export const CreateClassSubjectSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  isElective: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const CreateReligionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().max(50).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateReligionSchema = CreateReligionSchema.partial();

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().max(50).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const CreateCasteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().max(50).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateCasteSchema = CreateCasteSchema.partial();

export const CreateCountrySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  isoCode: z.string().min(2).max(3).transform((s) => s.trim().toUpperCase()),
  dialCode: z.string().max(10).nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateCountrySchema = CreateCountrySchema.partial();

export const CreateStateSchema = z.object({
  countryId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().max(20).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateStateSchema = CreateStateSchema.partial();

export const CreateCitySchema = z.object({
  stateId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  isActive: z.boolean().default(true),
});

export const UpdateCitySchema = CreateCitySchema.partial();

export const CreateVehicleTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().max(50).nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  description: z.string().max(255).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateVehicleTypeSchema = CreateVehicleTypeSchema.partial();

export const CreateFeeHeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().min(1, 'Code is required').max(50).transform((s) => s.trim().toUpperCase()),
  description: z.string().max(255).nullable().optional(),
  displayOrder: z.number().int().default(0),
  isRefundable: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const UpdateFeeHeadSchema = CreateFeeHeadSchema.partial();

export const CreateExpenseHeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().min(1, 'Code is required').max(50).transform((s) => s.trim().toUpperCase()),
  description: z.string().max(255).nullable().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const UpdateExpenseHeadSchema = CreateExpenseHeadSchema.partial();

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().min(1, 'Code is required').max(50).transform((s) => s.trim().toUpperCase()),
  description: z.string().max(255).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateDepartmentSchema = CreateDepartmentSchema.partial();

export const CreateDesignationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).transform((s) => s.trim()),
  code: z.string().min(1, 'Code is required').max(50).transform((s) => s.trim().toUpperCase()),
  departmentId: z.string().uuid().nullable().optional(),
  description: z.string().max(255).nullable().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const UpdateDesignationSchema = CreateDesignationSchema.partial();
