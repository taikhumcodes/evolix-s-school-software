import { prisma } from '../lib/prisma.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'hashed_password',
  'hashedpassword',
  'token',
  'refresh_token',
  'refreshtoken',
  'access_token',
  'accesstoken',
  'secret',
  'secret_key',
  'totp_secret',
  'totpsecret',
  'recovery_code',
  'recoverycode',
  'recovery_codes',
  'recoverycodes',
  'authorization',
]);

function redactData(data: any): string | null {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data !== 'object') {
    return String(data);
  }

  const safe: Record<string, any> = Array.isArray(data) ? [] : {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      safe[key] = '***REDACTED***';
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      safe[key] = JSON.parse(redactData(value) || '{}');
    } else {
      safe[key] = value;
    }
  }
  return JSON.stringify(safe);
}

export interface WriteAuditLogParams {
  tenantId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  schoolId?: string | null;
  beforeData?: any;
  afterData?: any;
  metadataInfo?: any;
  ipAddress?: string | null;
}

export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        schoolId: params.schoolId || null,
        userId: params.actorId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        beforeData: redactData(params.beforeData),
        afterData: redactData(params.afterData),
        metadataInfo: params.metadataInfo
          ? typeof params.metadataInfo === 'string'
            ? params.metadataInfo
            : JSON.stringify(params.metadataInfo)
          : null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    // Audit logging should not crash business operations, but should be logged
    console.error('Failed to write audit log:', err);
  }
}
