import { z } from 'zod';

export const createAcademicYearSchema = z.object({
  school_id: z.string().uuid().optional(),
  name: z.string().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_current: z.boolean().default(false),
  is_closed: z.boolean().default(false),
});

export const updateAcademicYearSchema = z.object({
  name: z.string().min(1).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_current: z.boolean().optional(),
  is_closed: z.boolean().optional(),
});
