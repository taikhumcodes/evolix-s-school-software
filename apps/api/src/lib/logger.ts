import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-tenant-slug"]',
      'password',
      'hashed_password',
      'hashedPassword',
      'new_password',
      'current_password',
      'token',
      'access_token',
      'accessToken',
      'refresh_token',
      'refreshToken',
      'challenge_token',
      'challengeToken',
      'secret',
      'totp_secret',
      'totpSecret',
      'recovery_code',
      'recoveryCode',
      'recovery_codes',
      'recoveryCodes',
      'encryption_key',
    ],
    censor: '***REDACTED***',
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
