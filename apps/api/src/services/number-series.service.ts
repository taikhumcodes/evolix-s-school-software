import { prisma } from '../lib/prisma.js';

export async function generateNextNumber(
  tenantId: string,
  code: string,
  schoolId?: string | null
): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    // Acquire exclusive row-level lock via SELECT ... FOR UPDATE
    const rows = await tx.$queryRaw<
      Array<{ id: string; current_value: number; padding: number; prefix: string | null; suffix: string | null }>
    >`
      SELECT id, current_value, padding, prefix, suffix
      FROM number_series
      WHERE tenant_id = ${tenantId}::uuid AND code = ${code}
      FOR UPDATE
    `;

    if (!rows || rows.length === 0) {
      // Create initial series record
      const created = await tx.numberSeries.create({
        data: {
          tenantId,
          schoolId: schoolId || null,
          code,
          padding: 4,
          currentValue: 1,
        },
      });
      return String(1).padStart(created.padding, '0');
    }

    const row = rows[0];
    const nextValue = row.current_value + 1;

    await tx.$executeRaw`
      UPDATE number_series
      SET current_value = ${nextValue}, updated_at = NOW()
      WHERE id = ${row.id}::uuid
    `;

    const formattedNumber = String(nextValue).padStart(row.padding || 4, '0');
    return formattedNumber;
  });
}
