import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export const verify2faSchema = z.object({
  challenge_token: z.string().min(1),
  totp_code: z.string().min(1),
});

export const recoveryLoginSchema = z.object({
  challenge_token: z.string().min(1),
  recovery_code: z.string().min(1),
});
