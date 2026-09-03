import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import {
  verifyPassword,
  signAccessToken,
  signChallengeToken,
  verifyJwtToken,
  decryptSecret,
  verifyTotp,
  normalizeRecoveryCode,
  ChallengeTokenPayload,
} from '../../lib/crypto.js';
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from '../../lib/errors.js';
import {
  getOrCreatePolicy,
  checkIpRestriction,
  logSecurityEvent,
} from '../../services/security.service.js';

export class AuthService {
  static async login(data: {
    email: string;
    password: string;
    ipAddress: string;
    userAgent?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        twoFactor: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedError('Incorrect email or password');
    }

    // 1. Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenError('Account is temporarily locked. Try again later.');
    }

    // 2. Check IP restriction
    const ipAllowed = await checkIpRestriction(user.tenantId, data.ipAddress);
    if (!ipAllowed) {
      await logSecurityEvent(user.tenantId, 'LOGIN_DENIED_IP', {
        userId: user.id,
        ipAddress: data.ipAddress,
        severity: 'WARNING',
      });
      throw new ForbiddenError('Login from this IP address is not permitted.');
    }

    // 3. Verify password
    const isPasswordValid = await verifyPassword(data.password, user.hashedPassword);
    if (!isPasswordValid) {
      const policy = await getOrCreatePolicy(user.tenantId);
      const attempts = user.failedLoginAttempts + 1;

      if (attempts >= policy.maxFailedAttempts) {
        const lockUntil = new Date(Date.now() + policy.lockoutMinutes * 60 * 1000);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            lockedUntil: lockUntil,
          },
        });
        await logSecurityEvent(user.tenantId, 'ACCOUNT_LOCKED', {
          userId: user.id,
          ipAddress: data.ipAddress,
          severity: 'CRITICAL',
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: attempts },
        });
        await logSecurityEvent(user.tenantId, 'LOGIN_FAILED', {
          userId: user.id,
          ipAddress: data.ipAddress,
          severity: 'INFO',
        });
      }

      throw new UnauthorizedError('Incorrect email or password');
    }

    // Password is valid; reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // 4. Check 2FA
    if (user.twoFactor && user.twoFactor.isActive) {
      const challengeToken = signChallengeToken(user.id, user.tenantId, 5);
      return {
        token_type: '2fa_challenge',
        challenge_token: challengeToken,
      };
    }

    // 5. Issue access & refresh tokens
    const accessToken = signAccessToken(user.id, user.tenantId, 60);
    const refreshToken = crypto.randomUUID();
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

    const rtRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    await prisma.userSession.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        refreshTokenId: rtRecord.id,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await logSecurityEvent(user.tenantId, 'LOGIN_SUCCESS', {
      userId: user.id,
      ipAddress: data.ipAddress,
      severity: 'INFO',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
    };
  }

  static async verify2fa(data: {
    challengeToken: string;
    totpCode: string;
    ipAddress: string;
    userAgent?: string;
  }) {
    let payload: ChallengeTokenPayload;
    try {
      payload = verifyJwtToken<ChallengeTokenPayload>(data.challengeToken);
      if (payload.type !== '2fa_challenge' || !payload.sub) {
        throw new UnauthorizedError('Invalid token type');
      }
    } catch {
      throw new UnauthorizedError('Invalid or expired challenge token');
    }

    const userId = payload.sub;
    const tf = await prisma.userTwoFactor.findUnique({
      where: { userId },
    });

    if (!tf || !tf.isActive) {
      throw new ValidationError('2FA is not enabled');
    }

    const decryptedSecret = decryptSecret(tf.totpSecret);
    const isValid = verifyTotp(decryptedSecret, data.totpCode);
    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA code');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const accessToken = signAccessToken(user.id, user.tenantId, 60);
    const refreshToken = crypto.randomUUID();
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

    const rtRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    await prisma.userSession.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        refreshTokenId: rtRecord.id,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await logSecurityEvent(user.tenantId, '2FA_LOGIN_SUCCESS', {
      userId: user.id,
      ipAddress: data.ipAddress,
      severity: 'INFO',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
    };
  }

  static async recoveryLogin(data: {
    challengeToken: string;
    recoveryCode: string;
    ipAddress: string;
    userAgent?: string;
  }) {
    let payload: ChallengeTokenPayload;
    try {
      payload = verifyJwtToken<ChallengeTokenPayload>(data.challengeToken);
      if (payload.type !== '2fa_challenge' || !payload.sub) {
        throw new UnauthorizedError('Invalid token type');
      }
    } catch (err: any) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired challenge token');
    }

    const userId = payload.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedError('Invalid user');
    }

    const normalizedCode = normalizeRecoveryCode(data.recoveryCode);
    if (!normalizedCode) {
      throw new UnauthorizedError('Invalid recovery code');
    }

    // Fetch all recovery codes for this user to check match and detect already used codes
    const allCodes = await prisma.userRecoveryCode.findMany({
      where: { userId },
    });

    let matchedRecord: (typeof allCodes)[0] | null = null;
    for (const record of allCodes) {
      if (await verifyPassword(normalizedCode, record.hashedCode)) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) {
      throw new UnauthorizedError('Invalid recovery code');
    }

    if (matchedRecord.usedAt !== null) {
      throw new UnauthorizedError('This recovery code has already been used');
    }

    const accessToken = signAccessToken(user.id, user.tenantId, 60);
    const refreshToken = crypto.randomUUID();
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

    // Atomically consume the recovery code and create the session in ONE transaction
    await prisma.$transaction(async (tx) => {
      const updated = await tx.userRecoveryCode.updateMany({
        where: {
          id: matchedRecord.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        throw new UnauthorizedError('This recovery code has already been used');
      }

      const rtRecord = await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt,
        },
      });

      await tx.userSession.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          refreshTokenId: rtRecord.id,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent || null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await tx.securityEvent.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          eventType: '2FA_RECOVERY_USED',
          ipAddress: data.ipAddress,
          severity: 'WARNING',
          metadataInfo: JSON.stringify({ ip_address: data.ipAddress }),
        },
      });
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
    };
  }

  static async refresh(data: { refreshToken: string; ipAddress: string }) {
    const rt = await prisma.refreshToken.findUnique({
      where: { token: data.refreshToken },
      include: { user: true },
    });

    if (!rt) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Token reuse detection!
    if (rt.isRevoked || rt.replacedBy) {
      if (rt.replacedBy) {
        await prisma.refreshToken.updateMany({
          where: { token: rt.replacedBy },
          data: { isRevoked: true },
        });
      }
      await logSecurityEvent(rt.user.tenantId, 'REFRESH_REUSE_DETECTED', {
        userId: rt.user.id,
        ipAddress: data.ipAddress,
        severity: 'WARNING',
      });
      throw new UnauthorizedError('Token reuse detected');
    }

    const currentEpoch = BigInt(Math.floor(Date.now() / 1000));
    if (rt.expiresAt < currentEpoch) {
      throw new UnauthorizedError('Refresh token expired');
    }

    const newRefresh = crypto.randomUUID();
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

    // Revoke old and create new in a transaction
    const newRtRecord = await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: rt.id },
        data: {
          isRevoked: true,
          replacedBy: newRefresh,
        },
      });

      const created = await tx.refreshToken.create({
        data: {
          userId: rt.userId,
          token: newRefresh,
          expiresAt,
        },
      });

      // Update session activity
      const session = await tx.userSession.findFirst({
        where: { refreshTokenId: rt.id },
      });

      if (session) {
        await tx.userSession.update({
          where: { id: session.id },
          data: {
            lastActivityAt: new Date(),
            ipAddress: data.ipAddress,
            refreshTokenId: created.id,
          },
        });
      }

      return created;
    });

    const accessToken = signAccessToken(rt.user.id, rt.user.tenantId, 60);

    return {
      access_token: accessToken,
      refresh_token: newRtRecord.token,
      token_type: 'bearer',
    };
  }

  static async logout(refreshToken: string) {
    const rt = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (rt) {
      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { id: rt.id },
          data: { isRevoked: true },
        }),
        prisma.userSession.updateMany({
          where: { refreshTokenId: rt.id },
          data: { isRevoked: true },
        }),
      ]);
    }

    return { status: 'ok' };
  }
}
