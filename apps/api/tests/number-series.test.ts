import { describe, it, expect, beforeAll } from 'vitest';
import { generateNextNumber } from '../src/services/number-series.service.js';
import { prisma } from '../src/lib/prisma.js';

describe('Number Series Concurrency & Atomicity', () => {
  let tenantId: string;
  const testCode = `CONC_TEST_${Date.now()}`;

  beforeAll(async () => {
    const tenant = await prisma.tenant.findFirst();
    tenantId = tenant!.id;
  });

  it('should generate consecutive unique numbers under concurrent parallel invocations', async () => {
    const concurrency = 10;
    const promises = Array.from({ length: concurrency }, () =>
      generateNextNumber(tenantId, testCode)
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(concurrency);

    // Verify all generated numbers are unique
    const uniqueSet = new Set(results);
    expect(uniqueSet.size).toBe(concurrency);

    // Verify format and consecutive order
    const numericValues = results.map((n) => parseInt(n, 10)).sort((a, b) => a - b);
    for (let i = 0; i < concurrency; i++) {
      expect(numericValues[i]).toBe(i + 1);
    }
  });
});
