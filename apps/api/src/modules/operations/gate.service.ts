import { prisma } from '../../lib/prisma.js';
import { FinanceService } from '../finance/finance.service.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { ScopeContext } from './operations.types.js';

export class GateService {
  // ==========================================
  // 1. Visitors
  // ==========================================
  public static async listVisitors(
    ctx: ScopeContext,
    query: { search?: string; page?: number; limit?: number }
  ) {
    const { tenantId, schoolId } = ctx;
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId, schoolId };
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { organization: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, visitors] = await Promise.all([
      prisma.visitor.count({ where }),
      prisma.visitor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { visits: true } },
        },
      }),
    ]);

    return {
      items: visitors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getVisitorById(ctx: ScopeContext, id: string) {
    const { tenantId, schoolId } = ctx;
    const visitor = await prisma.visitor.findFirst({
      where: { id, tenantId, schoolId },
      include: {
        visits: {
          take: 10,
          orderBy: { checkInAt: 'desc' },
          include: {
            personToMeet: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!visitor) {
      const err: any = new Error('Visitor not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return visitor;
  }

  public static async createVisitor(
    ctx: ScopeContext,
    data: {
      name: string;
      phone: string;
      email?: string | null;
      organization?: string | null;
      address?: string | null;
      photoFileKey?: string | null;
      governmentIdType?: string | null;
      governmentIdLast4?: string | null;
    }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const visitorName = (data.name || (data as any).fullName || 'Visitor').trim();

    const visitor = await prisma.visitor.create({
      data: {
        tenantId,
        schoolId,
        name: visitorName,
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        organization: data.organization?.trim() || null,
        address: data.address?.trim() || null,
        photoFileKey: data.photoFileKey || null,
        governmentIdType: data.governmentIdType || null,
        governmentIdLast4: data.governmentIdLast4 || null,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'CREATE',
      entityType: 'Visitor',
      entityId: visitor.id,
      afterData: visitor,
      ipAddress,
    });

    return visitor;
  }

  public static async updateVisitor(
    ctx: ScopeContext,
    id: string,
    data: Partial<{
      name: string;
      phone: string;
      email: string | null;
      organization: string | null;
      address: string | null;
      photoFileKey: string | null;
      governmentIdType: string | null;
      governmentIdLast4: string | null;
    }>
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;
    const existing = await prisma.visitor.findFirst({
      where: { id, tenantId, schoolId },
    });

    if (!existing) {
      const err: any = new Error('Visitor not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await prisma.visitor.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.phone && { phone: data.phone.trim() }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.organization !== undefined && { organization: data.organization?.trim() || null }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.photoFileKey !== undefined && { photoFileKey: data.photoFileKey }),
        ...(data.governmentIdType !== undefined && { governmentIdType: data.governmentIdType }),
        ...(data.governmentIdLast4 !== undefined && { governmentIdLast4: data.governmentIdLast4 }),
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'UPDATE',
      entityType: 'Visitor',
      entityId: updated.id,
      beforeData: existing,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  // ==========================================
  // 2. Visits & State Machine
  // ==========================================
  public static async listVisits(
    ctx: ScopeContext,
    query: {
      status?: string;
      visitorId?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { tenantId, schoolId } = ctx;
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId, schoolId };
    if (query.status) where.status = query.status;
    if (query.visitorId) where.visitorId = query.visitorId;
    if (query.fromDate || query.toDate) {
      where.checkInAt = {};
      if (query.fromDate) where.checkInAt.gte = new Date(query.fromDate);
      if (query.toDate) where.checkInAt.lte = new Date(query.toDate);
    }

    const [total, visits] = await Promise.all([
      prisma.visitorVisit.count({ where }),
      prisma.visitorVisit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { checkInAt: 'desc' },
        include: {
          visitor: true,
          personToMeet: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
          department: { select: { id: true, name: true } },
          checkedInByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          checkedOutByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    return {
      items: visits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getVisitById(ctx: ScopeContext, id: string) {
    const { tenantId, schoolId } = ctx;
    const visit = await prisma.visitorVisit.findFirst({
      where: { id, tenantId, schoolId },
      include: {
        visitor: true,
        personToMeet: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        department: { select: { id: true, name: true } },
        checkedInByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        checkedOutByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!visit) {
      const err: any = new Error('Visit not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return visit;
  }

  public static async checkInVisitor(
    ctx: ScopeContext,
    data: {
      visitorId?: string;
      visitor?: {
        name: string;
        phone: string;
        email?: string | null;
        organization?: string | null;
        address?: string | null;
        photoFileKey?: string | null;
        governmentIdType?: string | null;
        governmentIdLast4?: string | null;
      };
      purpose: string;
      personToMeetEmployeeId?: string | null;
      departmentId?: string | null;
      vehicleNumber?: string | null;
      numberOfVisitors?: number;
      badgeNumber?: string | null;
      remarks?: string | null;
      expectedStatus?: 'CHECKED_IN' | 'EXPECTED';
    }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return prisma.$transaction(async (tx) => {
      let visitorId = data.visitorId;

      if (!visitorId) {
        if (!data.visitor) {
          const err: any = new Error('Either visitorId or visitor details must be provided');
          err.statusCode = 400;
          err.code = 'BAD_REQUEST';
          throw err;
        }

        let visitor = await tx.visitor.findFirst({
          where: { tenantId, schoolId, phone: data.visitor.phone.trim() },
        });

        if (!visitor) {
          visitor = await tx.visitor.create({
            data: {
              tenantId,
              schoolId,
              name: data.visitor.name.trim(),
              phone: data.visitor.phone.trim(),
              email: data.visitor.email?.trim() || null,
              organization: data.visitor.organization?.trim() || null,
              address: data.visitor.address?.trim() || null,
              photoFileKey: data.visitor.photoFileKey || null,
              governmentIdType: data.visitor.governmentIdType || null,
              governmentIdLast4: data.visitor.governmentIdLast4 || null,
            },
          });
        }
        visitorId = visitor.id;
      } else {
        const existing = await tx.visitor.findFirst({
          where: { id: visitorId, tenantId, schoolId },
        });
        if (!existing) {
          const err: any = new Error('Visitor not found in this school');
          err.statusCode = 404;
          err.code = 'NOT_FOUND';
          throw err;
        }
      }

      if (data.personToMeetEmployeeId) {
        const emp = await tx.employee.findFirst({
          where: { id: data.personToMeetEmployeeId, tenantId, schoolId },
        });
        if (!emp) {
          const err: any = new Error('Employee to meet not found in this school');
          err.statusCode = 400;
          err.code = 'INVALID_EMPLOYEE';
          throw err;
        }
      }

      if (data.departmentId) {
        const dept = await tx.department.findFirst({
          where: { id: data.departmentId, tenantId, schoolId },
        });
        if (!dept) {
          const err: any = new Error('Department not found in this school');
          err.statusCode = 400;
          err.code = 'INVALID_DEPARTMENT';
          throw err;
        }
      }

      const status = data.expectedStatus || 'CHECKED_IN';
      const visitNumber = await FinanceService.getNextNumber(
        tenantId,
        schoolId,
        'VISIT_NUMBER',
        'VIS-{YYYY}-',
        6,
        tx
      );

      const visit = await tx.visitorVisit.create({
        data: {
          tenantId,
          schoolId,
          visitorId,
          visitNumber,
          purpose: data.purpose.trim(),
          personToMeetEmployeeId: data.personToMeetEmployeeId || null,
          departmentId: data.departmentId || null,
          checkInAt: new Date(),
          vehicleNumber: data.vehicleNumber?.trim() || null,
          numberOfVisitors: data.numberOfVisitors || 1,
          badgeNumber: data.badgeNumber?.trim() || null,
          remarks: data.remarks?.trim() || null,
          status,
          checkedInByUserId: userId,
        },
        include: {
          visitor: true,
          personToMeet: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
          department: { select: { id: true, name: true } },
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'CREATE',
        entityType: 'VisitorVisit',
        entityId: visit.id,
        afterData: visit,
        ipAddress,
      });

      return visit;
    });
  }

  public static async checkOutVisitor(
    ctx: ScopeContext,
    id: string,
    data: { remarks?: string | null }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return prisma.$transaction(async (tx) => {
      const visit = await tx.visitorVisit.findFirst({
        where: { id, tenantId, schoolId },
        include: { visitor: true },
      });

      if (!visit) {
        const err: any = new Error('Visit not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (visit.status !== 'CHECKED_IN') {
        const err: any = new Error(`Cannot check out visit with status ${visit.status}`);
        err.statusCode = 400;
        err.code = 'INVALID_STATE_TRANSITION';
        throw err;
      }

      const checkOutAt = new Date();
      if (checkOutAt < visit.checkInAt) {
        const err: any = new Error('Check-out timestamp cannot be earlier than check-in timestamp');
        err.statusCode = 400;
        err.code = 'INVALID_TIMESTAMP';
        throw err;
      }

      const updated = await tx.visitorVisit.update({
        where: { id },
        data: {
          status: 'CHECKED_OUT',
          checkOutAt,
          checkedOutByUserId: userId,
          remarks: data.remarks ? `${visit.remarks ? visit.remarks + ' | ' : ''}${data.remarks}` : visit.remarks,
        },
        include: {
          visitor: true,
          personToMeet: { select: { id: true, firstName: true, lastName: true } },
          checkedInByUser: { select: { id: true, firstName: true, lastName: true } },
          checkedOutByUser: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'UPDATE',
        entityType: 'VisitorVisit',
        entityId: updated.id,
        beforeData: visit,
        afterData: updated,
        ipAddress,
      });

      return updated;
    });
  }

  public static async cancelOrDenyVisit(
    ctx: ScopeContext,
    id: string,
    data: { status: 'CANCELLED' | 'DENIED'; remarks: string }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return prisma.$transaction(async (tx) => {
      const visit = await tx.visitorVisit.findFirst({
        where: { id, tenantId, schoolId },
      });

      if (!visit) {
        const err: any = new Error('Visit not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (visit.status !== 'EXPECTED') {
        const err: any = new Error(`Only visits in EXPECTED status can be cancelled or denied. Current status: ${visit.status}`);
        err.statusCode = 400;
        err.code = 'INVALID_STATE_TRANSITION';
        throw err;
      }

      const updated = await tx.visitorVisit.update({
        where: { id },
        data: {
          status: data.status,
          remarks: data.remarks,
        },
        include: { visitor: true },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'UPDATE',
        entityType: 'VisitorVisit',
        entityId: updated.id,
        beforeData: visit,
        afterData: updated,
        ipAddress,
      });

      return updated;
    });
  }

  // ==========================================
  // 3. Student Pickup Release
  // ==========================================
  public static async releaseStudentPickup(
    ctx: ScopeContext,
    data: {
      studentId: string;
      pickupSessionDate?: string;
      pickupSession?: 'MORNING' | 'AFTERNOON' | 'EMERGENCY' | 'SPECIAL';
      pickupType: 'AUTHORIZED_GUARDIAN' | 'AUTHORIZED_PERSON' | 'EXCEPTION';
      guardianId?: string | null;
      visitorId?: string | null;
      authorizedPersonName?: string | null;
      authorizedPersonPhone?: string | null;
      reason?: string | null;
      isOverride?: boolean;
      overrideReason?: string | null;
    }
  ) {
    const { tenantId, schoolId, userId, ipAddress, permissions, isSuperAdmin } = ctx;

    return prisma.$transaction(async (tx) => {
      const student = await tx.student.findFirst({
        where: { id: data.studentId, tenantId, schoolId },
        select: { id: true, firstName: true, lastName: true, admissionNumber: true },
      });

      if (!student) {
        const err: any = new Error('Student not found in this school');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      const sessionDateStr = data.pickupSessionDate || new Date().toISOString().split('T')[0];
      const pickupSessionDate = new Date(`${sessionDateStr}T00:00:00.000Z`);
      const pickupSession = data.pickupSession || 'AFTERNOON';

      const existingRelease = await tx.studentPickupRelease.findFirst({
        where: {
          tenantId,
          schoolId,
          studentId: data.studentId,
          pickupSessionDate,
          pickupSession,
        },
      });

      if (existingRelease) {
        if (
          existingRelease.pickupType === data.pickupType &&
          ((data.guardianId && existingRelease.guardianId === data.guardianId) ||
            (!data.guardianId && existingRelease.authorizedPersonName === data.authorizedPersonName))
        ) {
          return existingRelease;
        }

        const err: any = new Error(
          `Student has already been picked up for session ${pickupSession} on ${sessionDateStr}`
        );
        err.statusCode = 409;
        err.code = 'DUPLICATE_PICKUP_SESSION';
        throw err;
      }

      let guardianSnapshotName: string | null = null;
      let guardianSnapshotPhone: string | null = null;

      if (data.pickupType === 'AUTHORIZED_GUARDIAN') {
        if (!data.guardianId) {
          const err: any = new Error('guardianId is required for AUTHORIZED_GUARDIAN pickup');
          err.statusCode = 400;
          err.code = 'BAD_REQUEST';
          throw err;
        }

        const link = await tx.studentGuardian.findFirst({
          where: {
            studentId: data.studentId,
            guardianId: data.guardianId,
            tenantId,
            schoolId,
          },
          include: {
            guardian: true,
          },
        });

        if (!link || !link.hasPickupPermission) {
          const err: any = new Error(
            'Guardian is not authorized to pick up this student or does not have pickup permission'
          );
          err.statusCode = 403;
          err.code = 'GUARDIAN_PICKUP_NOT_AUTHORIZED';
          throw err;
        }

        guardianSnapshotName = `${link.guardian.firstName} ${link.guardian.lastName}`.trim();
        guardianSnapshotPhone = link.guardian.phone;
      } else {
        if (data.isOverride) {
          const permsList = permissions || [];
          const hasOverridePerm = permsList.includes('gate.pickup.override') || isSuperAdmin;
          if (!hasOverridePerm) {
            const err: any = new Error(
              'User lacks gate.pickup.override permission required for exceptional student pickup release'
            );
            err.statusCode = 403;
            err.code = 'PERMISSION_DENIED';
            throw err;
          }

          if (!data.overrideReason || data.overrideReason.trim().length < 5) {
            const err: any = new Error('A detailed overrideReason is mandatory for exceptional pickup release');
            err.statusCode = 400;
            err.code = 'INVALID_OVERRIDE_REASON';
            throw err;
          }
        } else {
          const err: any = new Error(
            'Non-guardian pickup requires an authorized override with reason'
          );
          err.statusCode = 403;
          err.code = 'UNAUTHORIZED_PICKUP_ATTEMPT';
          throw err;
        }
      }

      if (data.visitorId) {
        const vis = await tx.visitor.findFirst({
          where: { id: data.visitorId, tenantId, schoolId },
        });
        if (!vis) {
          const err: any = new Error('Visitor not found in this school');
          err.statusCode = 400;
          err.code = 'INVALID_VISITOR';
          throw err;
        }
      }

      const release = await tx.studentPickupRelease.create({
        data: {
          tenantId,
          schoolId,
          studentId: data.studentId,
          pickupSessionDate,
          pickupSession,
          pickupType: data.pickupType,
          guardianId: data.guardianId || null,
          visitorId: data.visitorId || null,
          authorizedPersonName: guardianSnapshotName || data.authorizedPersonName || null,
          authorizedPersonPhone: guardianSnapshotPhone || data.authorizedPersonPhone || null,
          releasedAt: new Date(),
          releasedByUserId: userId,
          reason: data.reason || null,
          isOverride: Boolean(data.isOverride),
          overrideReason: data.overrideReason || null,
          status: 'RELEASED',
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          guardian: { select: { id: true, firstName: true, lastName: true, phone: true } },
          visitor: { select: { id: true, name: true, phone: true } },
          releasedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'CREATE',
        entityType: 'StudentPickupRelease',
        entityId: release.id,
        afterData: release,
        ipAddress,
      });

      return release;
    });
  }

  public static async listStudentPickupReleases(
    ctx: ScopeContext,
    query: {
      studentId?: string;
      pickupSessionDate?: string;
      pickupSession?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { tenantId, schoolId } = ctx;
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId, schoolId };
    if (query.studentId) where.studentId = query.studentId;
    if (query.pickupSession) where.pickupSession = query.pickupSession;
    if (query.pickupSessionDate) {
      where.pickupSessionDate = new Date(`${query.pickupSessionDate}T00:00:00.000Z`);
    }

    const [total, items] = await Promise.all([
      prisma.studentPickupRelease.count({ where }),
      prisma.studentPickupRelease.findMany({
        where,
        skip,
        take: limit,
        orderBy: { releasedAt: 'desc' },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          guardian: { select: { id: true, firstName: true, lastName: true, phone: true } },
          visitor: { select: { id: true, name: true, phone: true } },
          releasedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
