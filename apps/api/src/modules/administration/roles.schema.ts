import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1),
  permission_ids: z.array(z.string().uuid()).default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  permission_ids: z.array(z.string().uuid()).optional(),
});
