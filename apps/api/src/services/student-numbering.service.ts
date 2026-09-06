import { prisma } from '../lib/prisma.js';

export interface NumberInterpolationOptions {
  tenantId: string;
  schoolId: string;
  seriesCode: string;
  formatPattern?: string; // e.g. STU-{YYYY}-{SEQ:05}
  tx?: any;
}

export class StudentNumberingService {
  /**
   * Helper to format a number given a pattern string with {YYYY}, {YY}, {SEQ:XX}
   */
  public static interpolatePattern(pattern: string, sequence: number, date: Date = new Date()): string {
    const fullYear = date.getFullYear().toString();
    const shortYear = fullYear.slice(-2);

    let result = pattern
      .replace(/{YYYY}/gi, fullYear)
      .replace(/{YY}/gi, shortYear);

    // Match {SEQ} or {SEQ:05} or {SEQ:4}
    result = result.replace(/{SEQ(?::(\d+))?}/gi, (_, paddingStr) => {
      if (!paddingStr) return String(sequence);
      const padding = parseInt(paddingStr, 10);
      return String(sequence).padStart(padding, '0');
    });

    return result;
  }

  /**
   * Atomically get next sequence value for a given seriesCode using SELECT ... FOR UPDATE
   */
  public static async getNextSequenceValue(
    tenantId: string,
    schoolId: string,
    seriesCode: string,
    txClient?: any
  ): Promise<number> {
    const executeLock = async (tx: any) => {
      // Use queryRaw with FOR UPDATE for concurrency safety
      const rows = await tx.$queryRaw<
        Array<{ id: string; current_value: number; padding: number }>
      >`
        SELECT id, current_value, padding
        FROM number_series
        WHERE tenant_id = ${tenantId}::uuid
          AND (school_id = ${schoolId}::uuid OR school_id IS NULL)
          AND code = ${seriesCode}
        ORDER BY school_id NULLS LAST
        LIMIT 1
        FOR UPDATE
      `;

      if (!rows || rows.length === 0) {
        // Create initial record
        const created = await tx.numberSeries.create({
          data: {
            tenantId,
            schoolId,
            code: seriesCode,
            padding: 5,
            currentValue: 1,
          },
        });
        return created.currentValue;
      }

      const row = rows[0];
      const nextVal = row.current_value + 1;

      await tx.$executeRaw`
        UPDATE number_series
        SET current_value = ${nextVal}, updated_at = NOW()
        WHERE id = ${row.id}::uuid
      `;

      return nextVal;
    };

    if (txClient) {
      return await executeLock(txClient);
    } else {
      return await prisma.$transaction(async (tx) => {
        return await executeLock(tx);
      });
    }
  }

  /**
   * Generates next Application Number (e.g. APP-2026-00001)
   */
  public static async generateApplicationNumber(
    tenantId: string,
    schoolId: string,
    txClient?: any
  ): Promise<string> {
    const nextSeq = await this.getNextSequenceValue(tenantId, schoolId, 'APPLICATION_NUMBER', txClient);
    return this.interpolatePattern('APP-{YYYY}-{SEQ:05}', nextSeq);
  }

  /**
   * Generates next Student ID based on SchoolConfiguration.studentIdFormat
   */
  public static async generateStudentId(
    tenantId: string,
    schoolId: string,
    txClient?: any
  ): Promise<string> {
    const client = txClient || prisma;
    const config = await client.schoolConfiguration.findFirst({
      where: { tenantId, schoolId },
    });

    const format = config?.studentIdFormat || 'STU-{YYYY}-{SEQ:05}';
    const nextSeq = await this.getNextSequenceValue(tenantId, schoolId, 'STUDENT_ID', txClient);
    return this.interpolatePattern(format, nextSeq);
  }

  /**
   * Generates next Admission Number based on SchoolConfiguration.admissionNumberFormat
   */
  public static async generateAdmissionNumber(
    tenantId: string,
    schoolId: string,
    txClient?: any
  ): Promise<string> {
    const client = txClient || prisma;
    const config = await client.schoolConfiguration.findFirst({
      where: { tenantId, schoolId },
    });

    const format = config?.admissionNumberFormat || 'ADM-{YY}-{SEQ:04}';
    const nextSeq = await this.getNextSequenceValue(tenantId, schoolId, 'ADMISSION_NUMBER', txClient);
    return this.interpolatePattern(format, nextSeq);
  }

  /**
   * Generates next unique atomic Family Number (e.g. FAM-2026-00001)
   */
  public static async generateFamilyNumber(
    tenantId: string,
    schoolId: string,
    txClient?: any
  ): Promise<string> {
    const nextSeq = await this.getNextSequenceValue(tenantId, schoolId, 'FAMILY_NUMBER', txClient);
    return this.interpolatePattern('FAM-{YYYY}-{SEQ:05}', nextSeq);
  }

  /**
   * Auto-suggests next Roll Number based on configured rollNumberScope and rollNumberFormat
   */
  public static async suggestNextRollNumber(
    tenantId: string,
    schoolId: string,
    academicYearId: string,
    classId: string,
    sectionId?: string | null,
    txClient?: any
  ): Promise<string> {
    const client = txClient || prisma;
    const config = await client.schoolConfiguration.findFirst({
      where: { tenantId, schoolId },
    });

    const scope = config?.rollNumberScope || 'CLASS_SECTION_YEAR';
    const format = config?.rollNumberFormat || '{SEQ}';

    const whereClause: any = {
      tenantId,
      schoolId,
      academicYearId,
      classId,
      status: 'ACTIVE',
    };

    if (scope === 'CLASS_SECTION_YEAR' && sectionId) {
      whereClause.sectionId = sectionId;
    }

    const existingEnrollments = await client.studentEnrollment.findMany({
      where: whereClause,
      select: { rollNumber: true },
    });

    // Find highest integer in rollNumbers
    let maxRoll = 0;
    for (const e of existingEnrollments) {
      if (e.rollNumber) {
        const parsed = parseInt(e.rollNumber.replace(/\D/g, ''), 10);
        if (!isNaN(parsed) && parsed > maxRoll) {
          maxRoll = parsed;
        }
      }
    }

    const nextRoll = maxRoll + 1;
    return this.interpolatePattern(format, nextRoll);
  }
}
