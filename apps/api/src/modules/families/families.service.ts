import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError, ValidationError } from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { StudentNumberingService } from '../../services/student-numbering.service.js';
import {
  CreateFamilyInput,
  UpdateFamilyInput,
  AddFamilyMemberInput,
  RemoveFamilyMemberInput,
} from './families.schema.js';

export class FamiliesService {
  /**
   * Paginated Family Directory
   */
  public static async listFamilies(
    tenantId: string,
    schoolId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
    }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      schoolId,
      archivedAt: null,
    };

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { familyName: { contains: term, mode: 'insensitive' } },
        { familyNumber: { contains: term, mode: 'insensitive' } },
        {
          primaryGuardian: {
            OR: [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
              { phone: { contains: term, mode: 'insensitive' } },
            ],
          },
        },
        {
          students: {
            some: {
              student: {
                OR: [
                  { firstName: { contains: term, mode: 'insensitive' } },
                  { lastName: { contains: term, mode: 'insensitive' } },
                  { studentId: { contains: term, mode: 'insensitive' } },
                  { admissionNumber: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.family.count({ where }),
      prisma.family.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          primaryGuardian: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              phone: true,
              email: true,
              relationship: true,
            },
          },
          _count: {
            select: {
              guardians: true,
              students: true,
            },
          },
          students: {
            include: {
              student: {
                select: {
                  id: true,
                  studentId: true,
                  firstName: true,
                  lastName: true,
                  enrollments: {
                    where: { status: 'ACTIVE' },
                    take: 1,
                    include: { class: true, section: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = records.map((f) => ({
      ...f,
      primaryGuardianName: f.primaryGuardian
        ? [f.primaryGuardian.firstName, f.primaryGuardian.lastName].filter(Boolean).join(' ')
        : null,
      guardiansCount: f._count.guardians,
      studentsCount: f._count.students,
      studentNames: f.students.map((s) => `${s.student.firstName} ${s.student.lastName}`.trim()),
    }));

    return {
      data: formatted,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 360-Degree Family Household View
   */
  public static async getFamilyById(tenantId: string, schoolId: string, id: string) {
    const family = await prisma.family.findFirst({
      where: { id, tenantId, schoolId },
      include: {
        primaryGuardian: true,
        guardians: {
          include: {
            guardian: {
              include: {
                user: { select: { id: true, email: true, isActive: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        students: {
          include: {
            student: {
              include: {
                enrollments: {
                  where: { status: 'ACTIVE' },
                  take: 1,
                  include: {
                    class: true,
                    section: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!family) {
      throw new NotFoundError('Family not found');
    }

    const siblings = family.students.map((fs) => ({
      id: fs.student.id,
      studentId: fs.student.studentId,
      admissionNumber: fs.student.admissionNumber,
      firstName: fs.student.firstName,
      lastName: fs.student.lastName,
      status: fs.student.status,
      photoStorageKey: fs.student.photoStorageKey,
      currentClass: fs.student.enrollments[0]?.class?.name || null,
      currentSection: fs.student.enrollments[0]?.section?.name || null,
      rollNumber: fs.student.enrollments[0]?.rollNumber || null,
    }));

    return {
      ...family,
      siblings,
    };
  }

  /**
   * Create Family Household
   */
  public static async createFamily(
    tenantId: string,
    schoolId: string,
    input: CreateFamilyInput,
    actorId?: string,
    ipAddress?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Generate unique atomic familyNumber
      const familyNumber = await StudentNumberingService.generateFamilyNumber(tenantId, schoolId, tx);

      const family = await tx.family.create({
        data: {
          tenantId,
          schoolId,
          familyNumber,
          familyName: input.familyName.trim(),
          primaryGuardianId: input.primaryGuardianId || null,
          address: input.address ? input.address.trim() : null,
          city: input.city ? input.city.trim() : null,
          state: input.state ? input.state.trim() : null,
          postalCode: input.postalCode ? input.postalCode.trim() : null,
          country: input.country || 'IN',
          notes: input.notes ? input.notes.trim() : null,
        },
      });

      // Link primary guardian if provided
      const guardianIdsSet = new Set(input.guardianIds || []);
      if (input.primaryGuardianId) {
        guardianIdsSet.add(input.primaryGuardianId);
      }

      for (const gId of guardianIdsSet) {
        await tx.familyGuardian.create({
          data: {
            tenantId,
            schoolId,
            familyId: family.id,
            guardianId: gId,
            role: gId === input.primaryGuardianId ? 'PRIMARY' : 'MEMBER',
          },
        });
      }

      // Link initial students
      if (input.studentIds && input.studentIds.length > 0) {
        for (const sId of input.studentIds) {
          await tx.familyStudent.create({
            data: {
              tenantId,
              schoolId,
              familyId: family.id,
              studentId: sId,
            },
          });
        }
      }

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'FAMILY_CREATED',
        entityType: 'Family',
        entityId: family.id,
        afterData: family,
        ipAddress,
      });

      return family;
    });
  }

  /**
   * Update Family Household
   */
  public static async updateFamily(
    tenantId: string,
    schoolId: string,
    id: string,
    input: UpdateFamilyInput,
    actorId?: string,
    ipAddress?: string
  ) {
    const existing = await prisma.family.findFirst({
      where: { id, tenantId, schoolId },
    });
    if (!existing) throw new NotFoundError('Family not found');

    const updateData: any = {};
    if (input.familyName !== undefined) updateData.familyName = input.familyName.trim();
    if (input.primaryGuardianId !== undefined) updateData.primaryGuardianId = input.primaryGuardianId;
    if (input.address !== undefined) updateData.address = input.address ? input.address.trim() : null;
    if (input.city !== undefined) updateData.city = input.city ? input.city.trim() : null;
    if (input.state !== undefined) updateData.state = input.state ? input.state.trim() : null;
    if (input.postalCode !== undefined) updateData.postalCode = input.postalCode ? input.postalCode.trim() : null;
    if (input.country !== undefined) updateData.country = input.country;
    if (input.notes !== undefined) updateData.notes = input.notes ? input.notes.trim() : null;

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.family.update({
        where: { id },
        data: updateData,
      });

      // If primary guardian was updated, ensure they are in familyGuardians as PRIMARY
      if (input.primaryGuardianId) {
        await tx.familyGuardian.updateMany({
          where: { familyId: id, role: 'PRIMARY' },
          data: { role: 'MEMBER' },
        });

        await tx.familyGuardian.upsert({
          where: {
            familyId_guardianId: {
              familyId: id,
              guardianId: input.primaryGuardianId,
            },
          },
          update: { role: 'PRIMARY' },
          create: {
            tenantId,
            schoolId,
            familyId: id,
            guardianId: input.primaryGuardianId,
            role: 'PRIMARY',
          },
        });
      }

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'FAMILY_UPDATED',
        entityType: 'Family',
        entityId: id,
        beforeData: existing,
        afterData: updated,
        ipAddress,
      });

      return updated;
    });
  }

  /**
   * Add Member to Family
   */
  public static async addMember(
    tenantId: string,
    schoolId: string,
    familyId: string,
    input: AddFamilyMemberInput,
    actorId?: string,
    ipAddress?: string
  ) {
    const family = await prisma.family.findFirst({
      where: { id: familyId, tenantId, schoolId },
    });
    if (!family) throw new NotFoundError('Family not found');

    if (input.memberType === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { id: input.memberId, tenantId, schoolId },
      });
      if (!student) throw new NotFoundError('Student not found');

      const link = await prisma.familyStudent.upsert({
        where: {
          familyId_studentId: {
            familyId,
            studentId: input.memberId,
          },
        },
        update: {},
        create: {
          tenantId,
          schoolId,
          familyId,
          studentId: input.memberId,
        },
      });

      return link;
    } else {
      const guardian = await prisma.guardian.findFirst({
        where: { id: input.memberId, tenantId, schoolId },
      });
      if (!guardian) throw new NotFoundError('Guardian not found');

      const link = await prisma.familyGuardian.upsert({
        where: {
          familyId_guardianId: {
            familyId,
            guardianId: input.memberId,
          },
        },
        update: { role: input.role || 'MEMBER' },
        create: {
          tenantId,
          schoolId,
          familyId,
          guardianId: input.memberId,
          role: input.role || 'MEMBER',
        },
      });

      return link;
    }
  }

  /**
   * Remove Member from Family
   */
  public static async removeMember(
    tenantId: string,
    schoolId: string,
    familyId: string,
    input: RemoveFamilyMemberInput,
    actorId?: string,
    ipAddress?: string
  ) {
    const family = await prisma.family.findFirst({
      where: { id: familyId, tenantId, schoolId },
    });
    if (!family) throw new NotFoundError('Family not found');

    if (input.memberType === 'STUDENT') {
      await prisma.familyStudent.deleteMany({
        where: { familyId, studentId: input.memberId },
      });
    } else {
      await prisma.familyGuardian.deleteMany({
        where: { familyId, guardianId: input.memberId },
      });

      if (family.primaryGuardianId === input.memberId) {
        await prisma.family.update({
          where: { id: familyId },
          data: { primaryGuardianId: null },
        });
      }
    }

    return { success: true };
  }
}
