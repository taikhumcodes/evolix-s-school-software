import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { AuthenticatedUser } from '../../middleware/auth.js';

export class AcademicYearsService {
  private static async verifySchoolAccess(
    schoolId: string,
    currentUser: AuthenticatedUser
  ) {
    let targetId = schoolId;
    if (!targetId || targetId === currentUser.tenantId) {
      targetId = currentUser.selectedSchoolId || currentUser.schools[0]?.id;
    }

    const school = await prisma.school.findFirst({
      where: {
        id: targetId,
        tenantId: currentUser.tenantId,
        isDeleted: false,
      },
    });

    if (!school) {
      throw new NotFoundError('School not found');
    }

    if (!currentUser.isSuperadmin) {
      const hasAccess = currentUser.schools.some((s) => s.id === school.id);
      if (!hasAccess) {
        throw new ForbiddenError('School access denied');
      }
    }

    return school;
  }

  static async list(schoolId: string, currentUser: AuthenticatedUser) {
    await this.verifySchoolAccess(schoolId, currentUser);

    const years = await prisma.academicYear.findMany({
      where: {
        schoolId,
        isDeleted: false,
      },
      orderBy: { startDate: 'desc' },
    });

    return years.map((a) => ({
      id: a.id,
      school_id: a.schoolId,
      name: a.name,
      start_date: a.startDate.toISOString().split('T')[0],
      end_date: a.endDate.toISOString().split('T')[0],
      is_current: a.isCurrent,
      is_closed: a.isClosed,
    }));
  }

  static async create(
    data: {
      school_id: string;
      name: string;
      start_date: string;
      end_date: string;
      is_current?: boolean;
      is_closed?: boolean;
    },
    currentUser: AuthenticatedUser
  ) {
    await this.verifySchoolAccess(data.school_id, currentUser);

    const isCurrent = Boolean(data.is_current);

    const created = await prisma.$transaction(async (tx) => {
      if (isCurrent) {
        // Lock all academic years for this school to serialize concurrency
        await tx.$queryRaw`
          SELECT id, is_current
          FROM academic_years
          WHERE school_id = ${data.school_id}::uuid
          ORDER BY id
          FOR UPDATE
        `;

        // Deactivate any existing active year
        await tx.academicYear.updateMany({
          where: { schoolId: data.school_id },
          data: { isCurrent: false },
        });
      }

      return await tx.academicYear.create({
        data: {
          schoolId: data.school_id,
          name: data.name,
          startDate: new Date(data.start_date),
          endDate: new Date(data.end_date),
          isCurrent,
          isClosed: data.is_closed || false,
        },
      });
    });

    await writeAuditLog({
      tenantId: currentUser.tenantId,
      actorId: currentUser.id,
      action: 'ACADEMIC_YEAR_CREATED',
      entityType: 'AcademicYear',
      entityId: created.id,
      schoolId: data.school_id,
      afterData: {
        name: created.name,
        start_date: data.start_date,
        end_date: data.end_date,
        is_current: created.isCurrent,
      },
    });

    return {
      id: created.id,
      school_id: created.schoolId,
      name: created.name,
      start_date: created.startDate.toISOString().split('T')[0],
      end_date: created.endDate.toISOString().split('T')[0],
      is_current: created.isCurrent,
      is_closed: created.isClosed,
    };
  }

  static async update(
    ayId: string,
    data: {
      name?: string;
      start_date?: string;
      end_date?: string;
      is_current?: boolean;
      is_closed?: boolean;
    },
    currentUser: AuthenticatedUser
  ) {
    const ay = await prisma.academicYear.findFirst({
      where: {
        id: ayId,
        isDeleted: false,
        school: {
          tenantId: currentUser.tenantId,
        },
      },
      include: {
        school: true,
      },
    });

    if (!ay) {
      throw new NotFoundError('Academic year not found');
    }

    if (!currentUser.isSuperadmin) {
      const hasAccess = currentUser.schools.some((s) => s.id === ay.schoolId);
      if (!hasAccess) {
        throw new ForbiddenError('School access denied');
      }
    }

    const beforeData = {
      name: ay.name,
      start_date: ay.startDate.toISOString().split('T')[0],
      end_date: ay.endDate.toISOString().split('T')[0],
      is_current: ay.isCurrent,
      is_closed: ay.isClosed,
    };

    // Execute in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Handle activation serialization
      if (data.is_current !== undefined) {
        const beforeCurrent = ay.isCurrent;

        // Lock all academic years for this school
        await tx.$queryRaw`
          SELECT id, is_current
          FROM academic_years
          WHERE school_id = ${ay.schoolId}::uuid
          ORDER BY id
          FOR UPDATE
        `;

        if (data.is_current) {
          await tx.academicYear.updateMany({
            where: {
              schoolId: ay.schoolId,
              id: { not: ayId },
            },
            data: { isCurrent: false },
          });
        }

        await tx.academicYear.update({
          where: { id: ayId },
          data: { isCurrent: data.is_current },
        });

        if (data.is_current && !beforeCurrent) {
          await writeAuditLog({
            tenantId: currentUser.tenantId,
            actorId: currentUser.id,
            action: 'ACADEMIC_YEAR_ACTIVATED',
            entityType: 'AcademicYear',
            entityId: ayId,
            schoolId: ay.schoolId,
            beforeData: { is_current: false },
            afterData: { is_current: true },
          });
        }
      }

      // Handle closure
      if (data.is_closed !== undefined && data.is_closed !== ay.isClosed) {
        await tx.academicYear.update({
          where: { id: ayId },
          data: { isClosed: data.is_closed },
        });

        if (data.is_closed) {
          await writeAuditLog({
            tenantId: currentUser.tenantId,
            actorId: currentUser.id,
            action: 'ACADEMIC_YEAR_CLOSED',
            entityType: 'AcademicYear',
            entityId: ayId,
            schoolId: ay.schoolId,
            beforeData: { is_closed: false },
            afterData: { is_closed: true },
          });
        }
      }

      // Handle general updates
      const generalUpdates: any = {};
      if (data.name) generalUpdates.name = data.name;
      if (data.start_date) generalUpdates.startDate = new Date(data.start_date);
      if (data.end_date) generalUpdates.endDate = new Date(data.end_date);

      if (Object.keys(generalUpdates).length > 0) {
        await tx.academicYear.update({
          where: { id: ayId },
          data: generalUpdates,
        });
      }

      return await tx.academicYear.findUniqueOrThrow({
        where: { id: ayId },
      });
    });

    await writeAuditLog({
      tenantId: currentUser.tenantId,
      actorId: currentUser.id,
      action: 'ACADEMIC_YEAR_UPDATED',
      entityType: 'AcademicYear',
      entityId: ayId,
      schoolId: ay.schoolId,
      beforeData,
      afterData: {
        name: updated.name,
        start_date: updated.startDate.toISOString().split('T')[0],
        end_date: updated.endDate.toISOString().split('T')[0],
        is_current: updated.isCurrent,
        is_closed: updated.isClosed,
      },
    });

    return {
      id: updated.id,
      school_id: updated.schoolId,
      name: updated.name,
      start_date: updated.startDate.toISOString().split('T')[0],
      end_date: updated.endDate.toISOString().split('T')[0],
      is_current: updated.isCurrent,
      is_closed: updated.isClosed,
    };
  }
}
