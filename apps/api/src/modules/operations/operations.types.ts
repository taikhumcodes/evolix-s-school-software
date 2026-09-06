export interface ScopeContext {
  tenantId: string;
  schoolId: string;
  userId: string;
  ipAddress?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
}

export function normalizeRegistration(reg: string): string {
  if (!reg) return '';
  return reg.replace(/[\s\-_]/g, '').toUpperCase();
}

/**
 * Returns movement multiplier: +1 for positive/inward movements, -1 for negative/outward movements
 */
export function getMovementMultiplier(type: string): number {
  switch (type) {
    case 'OPENING':
    case 'PURCHASE_RECEIPT':
    case 'INWARD':
    case 'RETURN':
    case 'TRANSFER_IN':
    case 'ADJUSTMENT_IN':
      return 1;
    case 'ISSUE':
    case 'TRANSFER_OUT':
    case 'ADJUSTMENT_OUT':
    case 'DAMAGE':
    case 'LOSS':
    case 'DISPOSAL':
      return -1;
    default:
      return 1;
  }
}

/**
 * Check if shifts overlap:
 * BOTH overlaps with MORNING, AFTERNOON, and BOTH.
 * MORNING overlaps with MORNING and BOTH.
 * AFTERNOON overlaps with AFTERNOON and BOTH.
 */
export function doShiftsOverlap(shiftA?: string | null, shiftB?: string | null): boolean {
  const sA = (shiftA || 'BOTH').toUpperCase();
  const sB = (shiftB || 'BOTH').toUpperCase();
  if (sA === 'BOTH' || sB === 'BOTH') return true;
  return sA === sB;
}

/**
 * Check if date ranges overlap: [startA, endA] and [startB, endB]
 */
export function doDateRangesOverlap(
  startA: Date,
  endA: Date | null | undefined,
  startB: Date,
  endB: Date | null | undefined
): boolean {
  const sA = new Date(startA).getTime();
  const eA = endA ? new Date(endA).getTime() : Infinity;
  const sB = new Date(startB).getTime();
  const eB = endB ? new Date(endB).getTime() : Infinity;

  return sA <= eB && sB <= eA;
}
