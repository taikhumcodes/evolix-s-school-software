import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export class AnalyticsService {
  /**
   * Executive KPIs for the dashboard
   */
  static async getExecutiveKpis(tenantId: string, schoolId?: string) {
    const filters = schoolId ? Prisma.sql`AND "school_id" = ${schoolId}::uuid` : Prisma.sql``;

    // 1. Active Students
    const activeStudentsResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "student_enrollments"
      WHERE "tenant_id" = ${tenantId}::uuid
      ${filters}
      AND "status" = 'ACTIVE'
    `;
    const activeStudents = Number(activeStudentsResult[0]?.count || 0);

    // 2. Attendance % (excluding holidays/non-working days)
    // Assuming status in PRESENT, LATE, HALF_DAY are considered present or partially.
    // Actually, simple Present / (Present + Absent)
    const attendanceResult = await prisma.$queryRaw<{ present: bigint; total: bigint }[]>`
      SELECT 
        SUM(CASE WHEN "status" IN ('PRESENT', 'LATE', 'HALF_DAY') THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN "status" IN ('PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'MISSING') THEN 1 ELSE 0 END) as total
      FROM "student_attendance"
      WHERE "tenant_id" = ${tenantId}::uuid
      ${filters}
    `;
    const attPresent = Number(attendanceResult[0]?.present || 0);
    const attTotal = Number(attendanceResult[0]?.total || 0);
    const attendancePercentage = attTotal > 0 ? new Prisma.Decimal(attPresent).div(attTotal).mul(100).toDP(2) : new Prisma.Decimal(0);

    // 3. Outstanding Finance
    const outstandingResult = await prisma.$queryRaw<{ total_outstanding: Prisma.Decimal }[]>`
      SELECT COALESCE(SUM("outstanding_amount"), 0) as total_outstanding
      FROM "fee_invoices"
      WHERE "tenant_id" = ${tenantId}::uuid
      ${filters}
      AND "status" NOT IN ('DRAFT', 'CANCELLED', 'REVERSED')
    `;
    const outstanding = outstandingResult[0]?.total_outstanding || new Prisma.Decimal(0);

    // 4. Payroll Cost
    const payrollResult = await prisma.$queryRaw<{ total_cost: Prisma.Decimal }[]>`
      SELECT COALESCE(SUM("total_gross"), 0) as total_cost
      FROM "payroll_runs"
      WHERE "tenant_id" = ${tenantId}::uuid
      ${filters}
      AND "status" = 'POSTED'
    `;
    const payrollCost = payrollResult[0]?.total_cost || new Prisma.Decimal(0);

    return {
      activeStudents,
      attendancePercentage: attendancePercentage.toString(),
      outstandingAmount: outstanding.toString(),
      payrollCost: payrollCost.toString()
    };
  }

  static async getStudentAnalytics(tenantId: string, schoolId?: string, startDate?: string, endDate?: string) {
    const filters = schoolId ? Prisma.sql`AND "school_id" = ${schoolId}::uuid` : Prisma.sql``;
    
    // Enrollments by Class
    const enrollmentsByClass = await prisma.$queryRaw<{ class_name: string; count: bigint }[]>`
      SELECT c."name" as class_name, COUNT(e."id") as count
      FROM "student_enrollments" e
      JOIN "classes" c ON c."id" = e."class_id"
      WHERE e."tenant_id" = ${tenantId}::uuid
      ${filters}
      AND e."status" = 'ACTIVE'
      GROUP BY c."name"
    `;

    return {
      enrollmentsByClass: enrollmentsByClass.map(r => ({
        className: r.class_name,
        count: Number(r.count)
      }))
    };
  }

  static async getAttendanceAnalytics(tenantId: string, schoolId?: string, startDate?: string, endDate?: string) {
    const filters = schoolId ? Prisma.sql`AND "school_id" = ${schoolId}::uuid` : Prisma.sql``;

    const trend = await prisma.$queryRaw<{ date: string; present: bigint; absent: bigint }[]>`
      SELECT 
        "date"::text as date,
        SUM(CASE WHEN "status" IN ('PRESENT', 'LATE', 'HALF_DAY') THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN "status" IN ('ABSENT', 'MISSING') THEN 1 ELSE 0 END) as absent
      FROM "student_attendance"
      WHERE "tenant_id" = ${tenantId}::uuid
      ${filters}
      GROUP BY "date"
      ORDER BY "date" DESC
      LIMIT 30
    `;

    return {
      trend: trend.map(r => ({
        date: r.date,
        present: Number(r.present),
        absent: Number(r.absent)
      })).reverse()
    };
  }

  static async getFinanceAnalytics(tenantId: string, schoolId?: string, startDate?: string, endDate?: string) {
    const filters = schoolId ? Prisma.sql`AND "school_id" = ${schoolId}::uuid` : Prisma.sql``;

    const collectionTrend = await prisma.$queryRaw<{ date: string; total_collected: Prisma.Decimal }[]>`
      SELECT 
        DATE_TRUNC('day', "payment_date")::date::text as date,
        SUM("amount") as total_collected
      FROM "fee_payments"
      WHERE "tenant_id" = ${tenantId}::uuid
      ${filters}
      AND "status" = 'SUCCESS'
      GROUP BY DATE_TRUNC('day', "payment_date")::date
      ORDER BY date DESC
      LIMIT 30
    `;

    return {
      collectionTrend: collectionTrend.map(r => ({
        date: r.date,
        totalCollected: r.total_collected.toString()
      })).reverse()
    };
  }

  static async getHrAnalytics(tenantId: string, schoolId?: string, startDate?: string, endDate?: string) {
    const filters = schoolId ? Prisma.sql`AND "school_id" = ${schoolId}::uuid` : Prisma.sql``;

    const payrollTrend = await prisma.$queryRaw<{ run_number: string; total_cost: Prisma.Decimal }[]>`
      SELECT 
        "run_number" as run_number,
        "total_gross" as total_cost
      FROM "payroll_runs"
      WHERE "tenant_id" = ${tenantId}::uuid
      ${filters}
      AND "status" = 'POSTED'
      ORDER BY "created_at" DESC
      LIMIT 12
    `;

    return {
      payrollTrend: payrollTrend.map(r => ({
        runNumber: r.run_number,
        totalCost: r.total_cost.toString()
      })).reverse()
    };
  }
}
