import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../lib/crypto.js';
import { isIpInCidr } from '../lib/ip.js';
import { ValidationError } from '../lib/errors.js';

export async function logSecurityEvent(
  tenantId: string,
  eventType: string,
  options: {
    userId?: string | null;
    ipAddress?: string | null;
    severity?: string;
    metadataInfo?: any;
  } = {}
) {
  try {
    return await prisma.securityEvent.create({
      data: {
        tenantId,
        userId: options.userId || null,
        eventType,
        ipAddress: options.ipAddress || null,
        severity: options.severity || 'INFO',
        metadataInfo: options.metadataInfo
          ? typeof options.metadataInfo === 'string'
            ? options.metadataInfo
            : JSON.stringify(options.metadataInfo)
          : null,
      },
    });
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
}

export async function getOrCreatePolicy(tenantId: string) {
  let policy = await prisma.securityPolicy.findUnique({
    where: { tenantId },
  });

  if (!policy) {
    policy = await prisma.securityPolicy.create({
      data: {
        tenantId,
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumber: true,
        passwordRequireSpecial: false,
        passwordHistoryCount: 3,
        passwordExpiryDays: 0,
        maxFailedAttempts: 5,
        lockoutMinutes: 15,
        ipRestrictionMode: 'DISABLED',
        require2faForAdmins: false,
      },
    });
  }

  return policy;
}

export async function validatePasswordComplexity(tenantId: string, password: string): Promise<boolean> {
  const policy = await getOrCreatePolicy(tenantId);

  if (password.length < policy.passwordMinLength) {
    throw new ValidationError(`Password must be at least ${policy.passwordMinLength} characters`);
  }
  if (policy.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    throw new ValidationError('Password must contain an uppercase letter');
  }
  if (policy.passwordRequireLowercase && !/[a-z]/.test(password)) {
    throw new ValidationError('Password must contain a lowercase letter');
  }
  if (policy.passwordRequireNumber && !/\d/.test(password)) {
    throw new ValidationError('Password must contain a number');
  }
  if (policy.passwordRequireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new ValidationError('Password must contain a special character');
  }

  return true;
}

export async function checkPasswordHistory(
  userId: string,
  tenantId: string,
  newPassword: string
): Promise<boolean> {
  const policy = await getOrCreatePolicy(tenantId);
  if (policy.passwordHistoryCount <= 0) {
    return true;
  }

  const history = await prisma.userPasswordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: policy.passwordHistoryCount,
  });

  for (const record of history) {
    if (await verifyPassword(newPassword, record.hashedPassword)) {
      throw new ValidationError('Password was used recently');
    }
  }

  return true;
}

export async function savePasswordHistory(userId: string, hashedPassword: string): Promise<void> {
  await prisma.userPasswordHistory.create({
    data: {
      userId,
      hashedPassword,
    },
  });
}

export async function checkIpRestriction(tenantId: string, ipAddress: string): Promise<boolean> {
  if (!ipAddress) return true;

  const policy = await getOrCreatePolicy(tenantId);
  if (policy.ipRestrictionMode === 'DISABLED') {
    return true;
  }

  const restrictions = await prisma.ipRestriction.findMany({
    where: {
      tenantId,
      isEnabled: true,
    },
  });

  if (restrictions.length === 0) {
    return policy.ipRestrictionMode === 'DENY';
  }

  let isAllowed = false;
  let isDenied = false;

  for (const rule of restrictions) {
    if (isIpInCidr(ipAddress, rule.networkCidr)) {
      if (rule.ruleType === 'DENY') {
        isDenied = true;
      } else if (rule.ruleType === 'ALLOW') {
        isAllowed = true;
      }
    }
  }

  if (policy.ipRestrictionMode === 'ALLOW') {
    if (isDenied) return false;
    if (isAllowed) return true;
    return false;
  } else if (policy.ipRestrictionMode === 'DENY') {
    if (isDenied) return false;
    return true;
  }

  return true;
}
