import { prisma } from '../../lib/prisma.js';
import {
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  getTotpUri,
  verifyTotp,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  normalizeRecoveryCode,
} from '../../lib/crypto.js';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  AppError,
} from '../../lib/errors.js';
import {
  validatePasswordComplexity,
  checkPasswordHistory,
  savePasswordHistory,
  logSecurityEvent,
  getOrCreatePolicy,
} from '../../services/security.service.js';
import { AuthenticatedUser } from '../../middleware/auth.js';

export class SecurityModuleService {
  static async changePassword(
    userId: string,
    tenantId: string,
    currentPass: string,
    newPass: string
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValid = await verifyPassword(currentPass, user.hashedPassword);
    if (!isValid) {
      throw new ValidationError('Incorrect current password');
    }

    await validatePasswordComplexity(tenantId, newPass);
    await checkPasswordHistory(userId, tenantId, newPass);

    const newHash = await hashPassword(newPass);
    await prisma.user.update({
      where: { id: userId },
      data: {
        hashedPassword: newHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });

    await savePasswordHistory(userId, newHash);
    await logSecurityEvent(tenantId, 'PASSWORD_CHANGED', { userId });

    return { status: 'ok' };
  }

  static async setup2fa(user: AuthenticatedUser) {
    const existing = await prisma.userTwoFactor.findUnique({
      where: { userId: user.id },
    });

    if (existing && existing.isActive) {
      throw new ValidationError('2FA is already enabled');
    }

    const secret = generateTotpSecret();
    const uri = getTotpUri(secret, user.email);
    const encryptedSecret = encryptSecret(secret);

    await prisma.userTwoFactor.upsert({
      where: { userId: user.id },
      update: {
        totpSecret: encryptedSecret,
        isActive: false,
      },
      create: {
        userId: user.id,
        totpSecret: encryptedSecret,
        isActive: false,
      },
    });

    // Delete existing unused recovery codes
    await prisma.userRecoveryCode.deleteMany({
      where: { userId: user.id },
    });

    // Generate new recovery codes
    const plaintextCodes = generateRecoveryCodes(8);
    for (const code of plaintextCodes) {
      const normalized = normalizeRecoveryCode(code);
      const hashedCode = await hashPassword(normalized);
      await prisma.userRecoveryCode.create({
        data: {
          userId: user.id,
          hashedCode,
          isActive: true,
        },
      });
    }

    return {
      secret,
      uri,
      recovery_codes: plaintextCodes,
    };
  }

  static async regenerateRecoveryCodes(userId: string) {
    const tf = await prisma.userTwoFactor.findUnique({
      where: { userId },
    });

    if (!tf || !tf.isActive) {
      throw new ValidationError('2FA must be active to regenerate recovery codes');
    }

    // Invalidate old unused recovery codes
    await prisma.userRecoveryCode.deleteMany({
      where: { userId, usedAt: null },
    });

    // Generate new set of recovery codes
    const plaintextCodes = generateRecoveryCodes(8);
    for (const code of plaintextCodes) {
      const normalized = normalizeRecoveryCode(code);
      const hashedCode = await hashPassword(normalized);
      await prisma.userRecoveryCode.create({
        data: {
          userId,
          hashedCode,
          isActive: true,
        },
      });
    }

    return {
      recovery_codes: plaintextCodes,
    };
  }

  static async verify2faSetup(userId: string, tenantId: string, code: string) {
    const tf = await prisma.userTwoFactor.findUnique({
      where: { userId },
    });

    if (!tf || tf.isActive) {
      throw new ValidationError('Invalid 2FA setup state');
    }

    const decryptedSecret = decryptSecret(tf.totpSecret);
    const isValid = verifyTotp(decryptedSecret, code);
    if (!isValid) {
      throw new ValidationError('Invalid code');
    }

    await prisma.userTwoFactor.update({
      where: { userId },
      data: { isActive: true },
    });

    await logSecurityEvent(tenantId, '2FA_ENABLED', { userId });
    return { status: 'ok' };
  }

  static async disable2fa(userId: string, tenantId: string) {
    await prisma.$transaction([
      prisma.userTwoFactor.deleteMany({ where: { userId } }),
      prisma.userRecoveryCode.deleteMany({ where: { userId } }),
    ]);

    await logSecurityEvent(tenantId, '2FA_DISABLED', { userId });
    return { status: 'ok' };
  }

  static async listSessions(userId: string) {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        isRevoked: false,
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      ip_address: s.ipAddress,
      user_agent: s.userAgent,
      last_activity_at: s.lastActivityAt.toISOString(),
      expires_at: s.expiresAt.toISOString(),
    }));
  }

  static async revokeSession(sessionId: string, userId: string) {
    const session = await prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (session) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });

      if (session.refreshTokenId) {
        await prisma.refreshToken.updateMany({
          where: { id: session.refreshTokenId },
          data: { isRevoked: true },
        });
      }
    }

    return { status: 'ok' };
  }

  // --- Admin Security ---

  static async getPolicy(tenantId: string) {
    return await getOrCreatePolicy(tenantId);
  }

  static async updatePolicy(tenantId: string, userId: string, data: any) {
    const policy = await getOrCreatePolicy(tenantId);

    const updateData: any = {};
    if (data.password_min_length !== undefined) updateData.passwordMinLength = data.password_min_length;
    if (data.password_require_uppercase !== undefined) updateData.passwordRequireUppercase = data.password_require_uppercase;
    if (data.password_require_lowercase !== undefined) updateData.passwordRequireLowercase = data.password_require_lowercase;
    if (data.password_require_number !== undefined) updateData.passwordRequireNumber = data.password_require_number;
    if (data.password_require_special !== undefined) updateData.passwordRequireSpecial = data.password_require_special;
    if (data.password_history_count !== undefined) updateData.passwordHistoryCount = data.password_history_count;
    if (data.password_expiry_days !== undefined) updateData.passwordExpiryDays = data.password_expiry_days;
    if (data.max_failed_attempts !== undefined) updateData.maxFailedAttempts = data.max_failed_attempts;
    if (data.lockout_minutes !== undefined) updateData.lockoutMinutes = data.lockout_minutes;
    if (data.ip_restriction_mode !== undefined) updateData.ipRestrictionMode = data.ip_restriction_mode;
    if (data.require_2fa_for_admins !== undefined) updateData.require2faForAdmins = data.require_2fa_for_admins;

    const updated = await prisma.securityPolicy.update({
      where: { id: policy.id },
      data: updateData,
    });

    await logSecurityEvent(tenantId, 'POLICY_UPDATED', { userId });
    return updated;
  }

  static async listIpRestrictions(tenantId: string) {
    return await prisma.ipRestriction.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createIpRestriction(
    tenantId: string,
    userId: string,
    data: { network_cidr: string; rule_type: string; description?: string | null }
  ) {
    // Validate CIDR format
    const [range, bitsStr] = data.network_cidr.split('/');
    if (!range) throw new ValidationError('Invalid CIDR format');
    if (bitsStr !== undefined) {
      const bits = parseInt(bitsStr, 10);
      if (isNaN(bits) || bits < 0 || bits > 32) {
        throw new ValidationError('Invalid CIDR format');
      }
    }

    const rule = await prisma.ipRestriction.create({
      data: {
        tenantId,
        networkCidr: data.network_cidr,
        ruleType: data.rule_type,
        description: data.description || null,
        isEnabled: true,
      },
    });

    await logSecurityEvent(tenantId, 'IP_RULE_ADDED', {
      userId,
      metadataInfo: data.network_cidr,
    });

    return rule;
  }

  static async deleteIpRestriction(ruleId: string, tenantId: string, userId: string) {
    const rule = await prisma.ipRestriction.findFirst({
      where: { id: ruleId, tenantId },
    });

    if (rule) {
      await prisma.ipRestriction.delete({ where: { id: rule.id } });
      await logSecurityEvent(tenantId, 'IP_RULE_DELETED', { userId });
    }

    return { status: 'ok' };
  }

  static async listSecurityEvents(tenantId: string) {
    return await prisma.securityEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  static async adminRevokeSession(sessionId: string, tenantId: string) {
    const session = await prisma.userSession.findFirst({
      where: { id: sessionId, tenantId },
    });

    if (session) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });

      if (session.refreshTokenId) {
        await prisma.refreshToken.updateMany({
          where: { id: session.refreshTokenId },
          data: { isRevoked: true },
        });
      }

      await logSecurityEvent(tenantId, 'SESSION_REVOKED_ADMIN', {
        userId: session.userId,
      });
    }

    return { status: 'ok' };
  }

  static async adminReset2fa(targetUserId: string, tenantId: string) {
    const user = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.$transaction([
      prisma.userTwoFactor.deleteMany({ where: { userId: user.id } }),
      prisma.userRecoveryCode.deleteMany({ where: { userId: user.id } }),
    ]);

    await logSecurityEvent(tenantId, '2FA_DISABLED_ADMIN', { userId: user.id });
    return { status: 'ok' };
  }

  static async adminUnlockUser(targetUserId: string, tenantId: string) {
    const user = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    await logSecurityEvent(tenantId, 'ACCOUNT_UNLOCKED_ADMIN', { userId: user.id });
    return { status: 'ok' };
  }
}
