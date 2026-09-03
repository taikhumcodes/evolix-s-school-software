import { z } from 'zod';

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(1),
});

export const verifyTotpSchema = z.object({
  code: z.string().min(1),
});

export const updatePolicySchema = z.object({
  password_min_length: z.number().int().min(4).max(64).optional(),
  password_require_uppercase: z.boolean().optional(),
  password_require_lowercase: z.boolean().optional(),
  password_require_number: z.boolean().optional(),
  password_require_special: z.boolean().optional(),
  password_history_count: z.number().int().min(0).max(24).optional(),
  password_expiry_days: z.number().int().min(0).optional(),
  max_failed_attempts: z.number().int().min(1).max(50).optional(),
  lockout_minutes: z.number().int().min(1).max(1440).optional(),
  ip_restriction_mode: z.enum(['DISABLED', 'ALLOW', 'DENY']).optional(),
  require_2fa_for_admins: z.boolean().optional(),
});

export const createIpRestrictionSchema = z.object({
  network_cidr: z.string().min(1),
  rule_type: z.enum(['ALLOW', 'DENY']),
  description: z.string().optional().nullable(),
});
