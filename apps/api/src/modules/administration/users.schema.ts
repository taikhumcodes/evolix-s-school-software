import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().min(1),
  last_name: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  role_ids: z.array(z.string().uuid()).default([]),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  role_ids: z.array(z.string().uuid()).optional(),
});
