import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { getStorageProvider } from '../../services/storage.service.js';
import {
  CreateGuardianInput,
  UpdateGuardianInput,
  LinkStudentInput,
  UpdateStudentLinkInput,
  CheckDuplicateInput,
  MergeGuardiansInput,
  UpdatePreferencesInput,
  AddNoteInput,
} from './guardians.schema.js';

export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

export function normalizeEmailAddress(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export class GuardiansService {
  /**
   * KPI / Overview Metrics
   */
  public static async getOverview(tenantId: string, schoolId: string) {
    const [totalGuardians, totalFamilies, portalAccessCount, allGuardians] = await Promise.all([
      prisma.guardian.count({
        where: { tenantId, schoolId, archivedAt: null, status: 'ACTIVE' },
      }),
      prisma.family.count({
        where: { tenantId, schoolId, archivedAt: null },
      }),
      prisma.guardian.count({
        where: { tenantId, schoolId, archivedAt: null, userId: { not: null } },
      }),
      prisma.guardian.findMany({
        where: { tenantId, schoolId, archivedAt: null },
        select: { normalizedPhone: true, normalizedEmail: true, preferredLanguage: true },
      }),
    ]);

    const phoneCounts = new Map<string, number>();
    const langCounts = { en: 0, hi: 0, hinglish: 0 };

    for (const g of allGuardians) {
      if (g.normalizedPhone) {
        phoneCounts.set(g.normalizedPhone, (phoneCounts.get(g.normalizedPhone) || 0) + 1);
      }
      const lang = (g.preferredLanguage || 'en') as 'en' | 'hi' | 'hinglish';
      if (lang in langCounts) {
        langCounts[lang]++;
      } else {
        langCounts.en++;
      }
    }

    let duplicateCandidatesCount = 0;
    for (const count of phoneCounts.values()) {
      if (count > 1) {
        duplicateCandidatesCount += count;
      }
    }

    return {
      totalGuardians,
      totalFamilies,
      portalAccessCount,
      noPortalAccessCount: Math.max(0, totalGuardians - portalAccessCount),
      duplicateCandidatesCount,
      languageDistribution: langCounts,
    };
  }

  /**
   * Server-side paginated list with deep search and filters
   */
  public static async listGuardians(
    tenantId: string,
    schoolId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      relationship?: string;
      hasPortalAccess?: string | boolean;
      isEmergencyContact?: string | boolean;
      hasPickupPermission?: string | boolean;
      preferredLanguage?: string;
    }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      schoolId,
    };

    // Status filter
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
      if (query.status === 'ARCHIVED') {
        where.archivedAt = { not: null };
      } else {
        where.archivedAt = null;
      }
    } else if (!query.status || query.status === 'ACTIVE') {
      where.status = 'ACTIVE';
      where.archivedAt = null;
    }

    // Relationship filter
    if (query.relationship && query.relationship !== 'ALL') {
      where.relationship = query.relationship;
    }

    // Portal access filter
    if (query.hasPortalAccess !== undefined && query.hasPortalAccess !== '') {
      const hasAccess = String(query.hasPortalAccess) === 'true';
      where.userId = hasAccess ? { not: null } : null;
    }

    // Preferred language filter
    if (query.preferredLanguage && query.preferredLanguage !== 'ALL') {
      where.preferredLanguage = query.preferredLanguage;
    }

    // Student link flags filter
    if (
      (query.isEmergencyContact !== undefined && query.isEmergencyContact !== '') ||
      (query.hasPickupPermission !== undefined && query.hasPickupPermission !== '')
    ) {
      const studentGuardianWhere: any = {};
      if (query.isEmergencyContact !== undefined && query.isEmergencyContact !== '') {
        studentGuardianWhere.isEmergencyContact = String(query.isEmergencyContact) === 'true';
      }
      if (query.hasPickupPermission !== undefined && query.hasPickupPermission !== '') {
        studentGuardianWhere.hasPickupPermission = String(query.hasPickupPermission) === 'true';
      }
      where.students = { some: studentGuardianWhere };
    }

    // Multi-field search
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      const normDigits = term.replace(/\D/g, '');
      const searchConditions: any[] = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { middleName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
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

      if (normDigits.length > 3) {
        searchConditions.push({ normalizedPhone: { contains: normDigits } });
        searchConditions.push({ phone: { contains: term } });
      }

      where.OR = searchConditions;
    }

    const [total, records] = await Promise.all([
      prisma.guardian.count({ where }),
      prisma.guardian.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
              mustChangePassword: true,
            },
          },
          students: {
            include: {
              student: {
                select: {
                  id: true,
                  studentId: true,
                  admissionNumber: true,
                  firstName: true,
                  lastName: true,
                  status: true,
                  photoStorageKey: true,
                  enrollments: {
                    where: { status: 'ACTIVE' },
                    take: 1,
                    include: {
                      class: { select: { id: true, name: true } },
                      section: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
          familyGuardians: {
            include: {
              family: {
                select: {
                  id: true,
                  familyNumber: true,
                  familyName: true,
                },
              },
            },
          },
          _count: {
            select: {
              documents: true,
              notes: true,
            },
          },
        },
      }),
    ]);

    const formatted = (records as any[]).map((g) => ({
      ...g,
      fullName: [g.firstName, g.middleName, g.lastName].filter(Boolean).join(' '),
      hasPortalAccess: !!g.userId,
      childrenCount: g.students.length,
      children: g.students.map((sg: any) => ({
        studentId: sg.student.id,
        code: sg.student.studentId,
        admissionNumber: sg.student.admissionNumber,
        name: `${sg.student.firstName} ${sg.student.lastName}`.trim(),
        status: sg.student.status,
        relationship: sg.relationship,
        isPrimary: sg.isPrimary,
        isEmergencyContact: sg.isEmergencyContact,
        hasPickupPermission: sg.hasPickupPermission,
        livesWithStudent: sg.livesWithStudent,
        currentClass: sg.student.enrollments[0]?.class?.name || null,
        currentSection: sg.student.enrollments[0]?.section?.name || null,
      })),
      families: g.familyGuardians.map((fg: any) => ({
        id: fg.family.id,
        familyNumber: fg.family.familyNumber,
        familyName: fg.family.familyName,
        role: fg.role,
      })),
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
   * 360-Degree Profile for a Single Guardian
   */
  public static async getGuardianById(
    tenantId: string,
    schoolId: string,
    id: string,
    canViewConfidentialNotes: boolean = false
  ) {
    const guardian = await prisma.guardian.findFirst({
      where: { id, tenantId, schoolId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            mustChangePassword: true,
            createdAt: true,
          },
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
        },
        familyGuardians: {
          include: {
            family: {
              include: {
                primaryGuardian: {
                  select: { id: true, firstName: true, lastName: true, phone: true },
                },
                guardians: {
                  include: {
                    guardian: {
                      select: { id: true, firstName: true, lastName: true, relationship: true, phone: true },
                    },
                  },
                },
                students: {
                  include: {
                    student: {
                      select: {
                        id: true,
                        studentId: true,
                        admissionNumber: true,
                        firstName: true,
                        lastName: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        documents: {
          where: { archivedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          where: canViewConfidentialNotes ? {} : { isConfidential: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!guardian) {
      throw new NotFoundError('Guardian not found');
    }

    // Collect all siblings from linked children and shared families
    const studentIds = new Set(guardian.students.map((s) => s.studentId));
    const siblingMap = new Map<string, any>();

    for (const fg of guardian.familyGuardians) {
      for (const fs of fg.family.students) {
        if (!studentIds.has(fs.student.id) && !siblingMap.has(fs.student.id)) {
          siblingMap.set(fs.student.id, {
            id: fs.student.id,
            studentId: fs.student.studentId,
            admissionNumber: fs.student.admissionNumber,
            name: `${fs.student.firstName} ${fs.student.lastName}`.trim(),
            status: fs.student.status,
            sourceFamily: fg.family.familyName,
          });
        }
      }
    }

    return {
      ...guardian,
      fullName: [guardian.firstName, guardian.middleName, guardian.lastName].filter(Boolean).join(' '),
      hasPortalAccess: !!guardian.userId,
      householdSiblings: Array.from(siblingMap.values()),
    };
  }

  /**
   * Check Duplicate Guardians
   */
  public static async checkDuplicate(tenantId: string, schoolId: string, input: CheckDuplicateInput) {
    const normPhone = input.phone ? normalizePhoneNumber(input.phone) : '';
    const normEmail = input.email ? normalizeEmailAddress(input.email) : null;

    const conditions: any[] = [];
    if (normPhone && normPhone.length >= 7) {
      conditions.push({ normalizedPhone: normPhone });
    }
    if (normEmail) {
      conditions.push({ normalizedEmail: normEmail });
    }

    if (conditions.length === 0 && input.firstName && input.lastName) {
      conditions.push({
        firstName: { equals: input.firstName.trim(), mode: 'insensitive' },
        lastName: { equals: input.lastName.trim(), mode: 'insensitive' },
      });
    }

    if (conditions.length === 0) {
      return { duplicates: [], hasExactMatch: false, hasPotentialMatch: false };
    }

    const where: any = {
      tenantId,
      schoolId,
      archivedAt: null,
      OR: conditions,
    };

    if (input.excludeGuardianId) {
      where.id = { not: input.excludeGuardianId };
    }

    const duplicates = await prisma.guardian.findMany({
      where,
      take: 10,
      include: {
        students: {
          include: {
            student: {
              select: { id: true, studentId: true, admissionNumber: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    const hasExactMatch = duplicates.some(
      (d) => (normPhone && d.normalizedPhone === normPhone) || (normEmail && d.normalizedEmail === normEmail)
    );

    return {
      duplicates: duplicates.map((d) => ({
        id: d.id,
        name: [d.firstName, d.middleName, d.lastName].filter(Boolean).join(' '),
        relationship: d.relationship,
        phone: d.phone,
        email: d.email,
        status: d.status,
        children: d.students.map((s) => `${s.student.firstName} ${s.student.lastName}`.trim()),
      })),
      hasExactMatch,
      hasPotentialMatch: duplicates.length > 0,
    };
  }

  /**
   * Direct Guardian Creation
   */
  public static async createGuardian(
    tenantId: string,
    schoolId: string,
    input: CreateGuardianInput,
    actorId?: string,
    ipAddress?: string
  ) {
    const normalizedPhone = normalizePhoneNumber(input.phone);
    const normalizedEmail = normalizeEmailAddress(input.email);

    return await prisma.$transaction(async (tx) => {
      // 1. Create Guardian
      const guardian = await tx.guardian.create({
        data: {
          tenantId,
          schoolId,
          firstName: input.firstName.trim(),
          middleName: input.middleName ? input.middleName.trim() : null,
          lastName: input.lastName.trim(),
          relationship: input.relationship,
          phone: input.phone.trim(),
          normalizedPhone,
          altPhone: input.altPhone ? input.altPhone.trim() : null,
          email: input.email ? input.email.trim() : null,
          normalizedEmail,
          occupation: input.occupation ? input.occupation.trim() : null,
          employer: input.employer ? input.employer.trim() : null,
          address: input.address ? input.address.trim() : null,
          city: input.city ? input.city.trim() : null,
          state: input.state ? input.state.trim() : null,
          postalCode: input.postalCode ? input.postalCode.trim() : null,
          country: input.country || 'IN',
          preferredLanguage: input.preferredLanguage || 'en',
          emailNotification: input.emailNotification ?? true,
          smsNotification: input.smsNotification ?? true,
          whatsappNotification: input.whatsappNotification ?? false,
          emergencyContactPreference: input.emergencyContactPreference || 'PHONE',
        },
      });

      // 2. Link initial student if provided
      if (input.studentId) {
        // Enforce 1 primary guardian rule
        if (input.isPrimary) {
          await tx.studentGuardian.updateMany({
            where: { tenantId, schoolId, studentId: input.studentId },
            data: { isPrimary: false },
          });
        }

        await tx.studentGuardian.create({
          data: {
            tenantId,
            schoolId,
            studentId: input.studentId,
            guardianId: guardian.id,
            relationship: input.relationship,
            isPrimary: input.isPrimary ?? false,
            isEmergencyContact: input.isEmergencyContact ?? false,
            hasPickupPermission: input.hasPickupPermission ?? true,
            livesWithStudent: input.livesWithStudent ?? true,
          },
        });
      }

      // Audit Log
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'GUARDIAN_CREATED',
        entityType: 'Guardian',
        entityId: guardian.id,
        afterData: guardian,
        ipAddress,
      });

      return guardian;
    });
  }

  /**
   * Update Guardian
   */
  public static async updateGuardian(
    tenantId: string,
    schoolId: string,
    id: string,
    input: UpdateGuardianInput,
    actorId?: string,
    ipAddress?: string
  ) {
    const existing = await prisma.guardian.findFirst({
      where: { id, tenantId, schoolId },
    });

    if (!existing) {
      throw new NotFoundError('Guardian not found');
    }

    const updateData: any = {};
    if (input.firstName !== undefined) updateData.firstName = input.firstName.trim();
    if (input.middleName !== undefined) updateData.middleName = input.middleName ? input.middleName.trim() : null;
    if (input.lastName !== undefined) updateData.lastName = input.lastName.trim();
    if (input.relationship !== undefined) updateData.relationship = input.relationship;
    if (input.phone !== undefined) {
      updateData.phone = input.phone.trim();
      updateData.normalizedPhone = normalizePhoneNumber(input.phone);
    }
    if (input.altPhone !== undefined) updateData.altPhone = input.altPhone ? input.altPhone.trim() : null;
    if (input.email !== undefined) {
      updateData.email = input.email ? input.email.trim() : null;
      updateData.normalizedEmail = normalizeEmailAddress(input.email);
    }
    if (input.occupation !== undefined) updateData.occupation = input.occupation ? input.occupation.trim() : null;
    if (input.employer !== undefined) updateData.employer = input.employer ? input.employer.trim() : null;
    if (input.address !== undefined) updateData.address = input.address ? input.address.trim() : null;
    if (input.city !== undefined) updateData.city = input.city ? input.city.trim() : null;
    if (input.state !== undefined) updateData.state = input.state ? input.state.trim() : null;
    if (input.postalCode !== undefined) updateData.postalCode = input.postalCode ? input.postalCode.trim() : null;
    if (input.country !== undefined) updateData.country = input.country;
    if (input.preferredLanguage !== undefined) updateData.preferredLanguage = input.preferredLanguage;
    if (input.emailNotification !== undefined) updateData.emailNotification = input.emailNotification;
    if (input.smsNotification !== undefined) updateData.smsNotification = input.smsNotification;
    if (input.whatsappNotification !== undefined) updateData.whatsappNotification = input.whatsappNotification;
    if (input.emergencyContactPreference !== undefined) updateData.emergencyContactPreference = input.emergencyContactPreference;

    const updated = await prisma.guardian.update({
      where: { id },
      data: updateData,
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'GUARDIAN_UPDATED',
      entityType: 'Guardian',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  /**
   * Soft Archive Guardian
   */
  public static async archiveGuardian(tenantId: string, schoolId: string, id: string, actorId?: string, ipAddress?: string) {
    const existing = await prisma.guardian.findFirst({
      where: { id, tenantId, schoolId },
    });
    if (!existing) throw new NotFoundError('Guardian not found');

    const updated = await prisma.guardian.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'GUARDIAN_ARCHIVED',
      entityType: 'Guardian',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  /**
   * Restore Archived Guardian
   */
  public static async restoreGuardian(tenantId: string, schoolId: string, id: string, actorId?: string, ipAddress?: string) {
    const existing = await prisma.guardian.findFirst({
      where: { id, tenantId, schoolId },
    });
    if (!existing) throw new NotFoundError('Guardian not found');

    const updated = await prisma.guardian.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        archivedAt: null,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'GUARDIAN_RESTORED',
      entityType: 'Guardian',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  /**
   * Merge Duplicate Guardian into Canonical Guardian
   */
  public static async mergeGuardians(
    tenantId: string,
    schoolId: string,
    input: MergeGuardiansInput,
    actorId?: string,
    ipAddress?: string
  ) {
    const { canonicalGuardianId, duplicateGuardianId, resolvedFields } = input;

    if (canonicalGuardianId === duplicateGuardianId) {
      throw new ValidationError('Canonical and duplicate guardian IDs must be different');
    }

    const [canonical, duplicate] = await Promise.all([
      prisma.guardian.findFirst({
        where: { id: canonicalGuardianId, tenantId, schoolId },
        include: { students: true, familyGuardians: true },
      }),
      prisma.guardian.findFirst({
        where: { id: duplicateGuardianId, tenantId, schoolId },
        include: { students: true, familyGuardians: true },
      }),
    ]);

    if (!canonical) throw new NotFoundError('Canonical guardian not found');
    if (!duplicate) throw new NotFoundError('Duplicate guardian not found');

    return await prisma.$transaction(async (tx) => {
      // 1. Move StudentGuardian relationships
      for (const dupLink of duplicate.students) {
        const existingCanonicalLink = canonical.students.find((cs) => cs.studentId === dupLink.studentId);
        if (existingCanonicalLink) {
          // Merge flags
          await tx.studentGuardian.update({
            where: { id: existingCanonicalLink.id },
            data: {
              isEmergencyContact: existingCanonicalLink.isEmergencyContact || dupLink.isEmergencyContact,
              hasPickupPermission: existingCanonicalLink.hasPickupPermission || dupLink.hasPickupPermission,
              livesWithStudent: existingCanonicalLink.livesWithStudent || dupLink.livesWithStudent,
            },
          });
          // Delete duplicate link
          await tx.studentGuardian.delete({
            where: { id: dupLink.id },
          });
        } else {
          // Re-point link to canonical
          await tx.studentGuardian.update({
            where: { id: dupLink.id },
            data: { guardianId: canonicalGuardianId },
          });
        }
      }

      // 2. Move Documents
      await tx.guardianDocument.updateMany({
        where: { guardianId: duplicateGuardianId },
        data: { guardianId: canonicalGuardianId },
      });

      // 3. Move Notes
      await tx.guardianNote.updateMany({
        where: { guardianId: duplicateGuardianId },
        data: { guardianId: canonicalGuardianId },
      });

      // 4. Move FamilyGuardian links
      for (const dupFg of duplicate.familyGuardians) {
        const canonicalInFamily = canonical.familyGuardians.some((cfg) => cfg.familyId === dupFg.familyId);
        if (canonicalInFamily) {
          await tx.familyGuardian.delete({ where: { id: dupFg.id } });
        } else {
          await tx.familyGuardian.update({
            where: { id: dupFg.id },
            data: { guardianId: canonicalGuardianId },
          });
        }
      }

      // 5. Update Primary Family references if duplicate was primary
      await tx.family.updateMany({
        where: { primaryGuardianId: duplicateGuardianId },
        data: { primaryGuardianId: canonicalGuardianId },
      });

      // 6. User account transfer if canonical has none and duplicate has one
      if (!canonical.userId && duplicate.userId) {
        await tx.guardian.update({
          where: { id: duplicateGuardianId },
          data: { userId: null },
        });
        await tx.guardian.update({
          where: { id: canonicalGuardianId },
          data: { userId: duplicate.userId },
        });
      }

      // 7. Apply selected/resolved fields to canonical guardian
      const updateData: any = {};
      if (resolvedFields) {
        if (resolvedFields.firstName) updateData.firstName = resolvedFields.firstName.trim();
        if (resolvedFields.middleName !== undefined) updateData.middleName = resolvedFields.middleName;
        if (resolvedFields.lastName) updateData.lastName = resolvedFields.lastName.trim();
        if (resolvedFields.relationship) updateData.relationship = resolvedFields.relationship;
        if (resolvedFields.phone) {
          updateData.phone = resolvedFields.phone.trim();
          updateData.normalizedPhone = normalizePhoneNumber(resolvedFields.phone);
        }
        if (resolvedFields.altPhone !== undefined) updateData.altPhone = resolvedFields.altPhone;
        if (resolvedFields.email !== undefined) {
          updateData.email = resolvedFields.email ? resolvedFields.email.trim() : null;
          updateData.normalizedEmail = normalizeEmailAddress(resolvedFields.email);
        }
        if (resolvedFields.occupation !== undefined) updateData.occupation = resolvedFields.occupation;
        if (resolvedFields.employer !== undefined) updateData.employer = resolvedFields.employer;
        if (resolvedFields.address !== undefined) updateData.address = resolvedFields.address;
        if (resolvedFields.city !== undefined) updateData.city = resolvedFields.city;
        if (resolvedFields.state !== undefined) updateData.state = resolvedFields.state;
        if (resolvedFields.postalCode !== undefined) updateData.postalCode = resolvedFields.postalCode;
        if (resolvedFields.country) updateData.country = resolvedFields.country;
        if (resolvedFields.preferredLanguage) updateData.preferredLanguage = resolvedFields.preferredLanguage;
        if (resolvedFields.emailNotification !== undefined) updateData.emailNotification = resolvedFields.emailNotification;
        if (resolvedFields.smsNotification !== undefined) updateData.smsNotification = resolvedFields.smsNotification;
        if (resolvedFields.whatsappNotification !== undefined) updateData.whatsappNotification = resolvedFields.whatsappNotification;
        if (resolvedFields.emergencyContactPreference) updateData.emergencyContactPreference = resolvedFields.emergencyContactPreference;
      }

      const updatedCanonical = await tx.guardian.update({
        where: { id: canonicalGuardianId },
        data: updateData,
      });

      // 8. Mark duplicate as ARCHIVED
      await tx.guardian.update({
        where: { id: duplicateGuardianId },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
        },
      });

      // 9. Add system note on canonical documenting the merge
      await tx.guardianNote.create({
        data: {
          tenantId,
          schoolId,
          guardianId: canonicalGuardianId,
          category: 'ADMINISTRATIVE',
          content: `Merged duplicate guardian "${duplicate.firstName} ${duplicate.lastName}" (Phone: ${duplicate.phone}, ID: ${duplicate.id}) into this record.`,
          isConfidential: false,
          createdBy: actorId || null,
        },
      });

      // 10. Write Audit Log
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'GUARDIAN_MERGED',
        entityType: 'Guardian',
        entityId: canonicalGuardianId,
        metadataInfo: {
          canonicalGuardianId,
          duplicateGuardianId,
          duplicateName: `${duplicate.firstName} ${duplicate.lastName}`,
          duplicatePhone: duplicate.phone,
        },
        ipAddress,
      });

      return updatedCanonical;
    });
  }

  /**
   * Link Student to Guardian
   */
  public static async linkStudent(
    tenantId: string,
    schoolId: string,
    guardianId: string,
    input: LinkStudentInput,
    actorId?: string,
    ipAddress?: string
  ) {
    const [guardian, student] = await Promise.all([
      prisma.guardian.findFirst({ where: { id: guardianId, tenantId, schoolId } }),
      prisma.student.findFirst({ where: { id: input.studentId, tenantId, schoolId } }),
    ]);

    if (!guardian) throw new NotFoundError('Guardian not found');
    if (!student) throw new NotFoundError('Student not found');

    return await prisma.$transaction(async (tx) => {
      // 1. Enforce 1 primary guardian rule per student
      if (input.isPrimary) {
        await tx.studentGuardian.updateMany({
          where: { tenantId, schoolId, studentId: input.studentId },
          data: { isPrimary: false },
        });
      }

      // 2. Upsert link
      const link = await tx.studentGuardian.upsert({
        where: {
          studentId_guardianId: {
            studentId: input.studentId,
            guardianId,
          },
        },
        update: {
          relationship: input.relationship,
          isPrimary: input.isPrimary ?? false,
          isEmergencyContact: input.isEmergencyContact ?? false,
          hasPickupPermission: input.hasPickupPermission ?? true,
          livesWithStudent: input.livesWithStudent ?? true,
        },
        create: {
          tenantId,
          schoolId,
          studentId: input.studentId,
          guardianId,
          relationship: input.relationship,
          isPrimary: input.isPrimary ?? false,
          isEmergencyContact: input.isEmergencyContact ?? false,
          hasPickupPermission: input.hasPickupPermission ?? true,
          livesWithStudent: input.livesWithStudent ?? true,
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'STUDENT_GUARDIAN_LINKED',
        entityType: 'StudentGuardian',
        entityId: link.id,
        metadataInfo: { studentId: input.studentId, guardianId },
        ipAddress,
      });

      return link;
    });
  }

  /**
   * Update Student-Guardian Relationship Flags
   */
  public static async updateStudentLink(
    tenantId: string,
    schoolId: string,
    guardianId: string,
    studentId: string,
    input: UpdateStudentLinkInput,
    actorId?: string,
    ipAddress?: string
  ) {
    const link = await prisma.studentGuardian.findFirst({
      where: { guardianId, studentId, tenantId, schoolId },
    });

    if (!link) throw new NotFoundError('Student guardian link not found');

    return await prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.studentGuardian.updateMany({
          where: { tenantId, schoolId, studentId, NOT: { id: link.id } },
          data: { isPrimary: false },
        });
      }

      const updated = await tx.studentGuardian.update({
        where: { id: link.id },
        data: input,
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'STUDENT_GUARDIAN_UPDATED',
        entityType: 'StudentGuardian',
        entityId: link.id,
        beforeData: link,
        afterData: updated,
        ipAddress,
      });

      return updated;
    });
  }

  /**
   * Unlink Student from Guardian
   */
  public static async unlinkStudent(
    tenantId: string,
    schoolId: string,
    guardianId: string,
    studentId: string,
    actorId?: string,
    ipAddress?: string
  ) {
    const link = await prisma.studentGuardian.findFirst({
      where: { guardianId, studentId, tenantId, schoolId },
    });

    if (!link) throw new NotFoundError('Student guardian link not found');

    await prisma.studentGuardian.delete({
      where: { id: link.id },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'STUDENT_GUARDIAN_UNLINKED',
      entityType: 'StudentGuardian',
      entityId: link.id,
      metadataInfo: { studentId, guardianId },
      ipAddress,
    });

    return { success: true };
  }

  /**
   * Parent Portal Access Provisioning
   */
  public static async createPortalAccess(
    tenantId: string,
    schoolId: string,
    guardianId: string,
    actorId?: string,
    ipAddress?: string
  ) {
    const guardian = await prisma.guardian.findFirst({
      where: { id: guardianId, tenantId, schoolId },
      include: { user: true },
    });

    if (!guardian) throw new NotFoundError('Guardian not found');

    if (guardian.userId && guardian.user) {
      if (!guardian.user.isActive) {
        await prisma.user.update({
          where: { id: guardian.userId },
          data: { isActive: true },
        });
      }
      return {
        message: 'Portal access is already active for this guardian',
        username: guardian.user.email,
        isExisting: true,
      };
    }

    // Determine login username / email identifier
    let loginIdentifier = '';
    if (guardian.email && guardian.email.trim()) {
      loginIdentifier = guardian.email.trim().toLowerCase();
    } else {
      const phoneDigits = guardian.normalizedPhone || guardian.phone.replace(/\D/g, '');
      loginIdentifier = `${phoneDigits}@parent.evolix.local`;
    }

    // Check if user with this identifier exists
    const existingUser = await prisma.user.findFirst({
      where: { email: loginIdentifier, tenantId },
    });

    if (existingUser) {
      // Link to guardian
      await prisma.guardian.update({
        where: { id: guardianId },
        data: { userId: existingUser.id },
      });

      return {
        message: 'Linked guardian to existing user account',
        username: existingUser.email,
        isExisting: true,
      };
    }

    // Generate secure temporary password: 12 chars with upper, lower, digit, symbol
    const randomHex = crypto.randomBytes(4).toString('hex');
    const tempPassword = `Ev!${randomHex}8#`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    return await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          tenantId,
          email: loginIdentifier,
          hashedPassword,
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          isActive: true,
          mustChangePassword: true,
        },
      });

      // 2. Find or create dedicated Parent Role with only parent.children.view permission
      let parentRole = await tx.role.findFirst({
        where: { tenantId, name: { equals: 'Parent', mode: 'insensitive' } },
      });

      if (!parentRole) {
        parentRole = await tx.role.create({
          data: {
            tenantId,
            name: 'Parent',
            isSystem: true,
          },
        });

        const parentPerm = await tx.permission.findFirst({
          where: { code: 'parent.children.view' },
        });
        if (parentPerm) {
          await tx.rolePermission.create({
            data: {
              roleId: parentRole.id,
              permissionId: parentPerm.id,
            },
          });
        }
      }

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: parentRole.id,
        },
      });

      // 3. Link UserSchool
      await tx.userSchool.create({
        data: {
          userId: user.id,
          schoolId,
        },
      });

      // 4. Link Guardian -> User
      await tx.guardian.update({
        where: { id: guardianId },
        data: { userId: user.id },
      });

      // 5. Audit Log
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'PORTAL_ACCESS_PROVISIONED',
        entityType: 'Guardian',
        entityId: guardianId,
        metadataInfo: { username: loginIdentifier, userId: user.id },
        ipAddress,
      });

      return {
        message: 'Portal access created successfully',
        username: loginIdentifier,
        temporaryPassword: tempPassword,
        isExisting: false,
      };
    });
  }

  /**
   * Revoke / Disable Portal Access
   */
  public static async disablePortalAccess(
    tenantId: string,
    schoolId: string,
    guardianId: string,
    actorId?: string,
    ipAddress?: string
  ) {
    const guardian = await prisma.guardian.findFirst({
      where: { id: guardianId, tenantId, schoolId },
    });

    if (!guardian || !guardian.userId) {
      throw new NotFoundError('Guardian portal account not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: guardian.userId! },
        data: { isActive: false },
      });

      await tx.guardian.update({
        where: { id: guardianId },
        data: { userId: null },
      });
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'PORTAL_ACCESS_REVOKED',
      entityType: 'Guardian',
      entityId: guardianId,
      ipAddress,
    });

    return { message: 'Portal access revoked' };
  }

  /**
   * Update Communication Preferences
   */
  public static async updatePreferences(
    tenantId: string,
    schoolId: string,
    guardianId: string,
    input: UpdatePreferencesInput
  ) {
    const guardian = await prisma.guardian.findFirst({
      where: { id: guardianId, tenantId, schoolId },
    });
    if (!guardian) throw new NotFoundError('Guardian not found');

    return await prisma.guardian.update({
      where: { id: guardianId },
      data: input,
    });
  }

  /**
   * Document Upload
   */
  public static async uploadDocument(
    tenantId: string,
    schoolId: string,
    guardianId: string,
    file: Express.Multer.File,
    documentType: string,
    actorId?: string
  ) {
    const guardian = await prisma.guardian.findFirst({
      where: { id: guardianId, tenantId, schoolId },
    });
    if (!guardian) throw new NotFoundError('Guardian not found');

    const originalName = file.originalname || 'document.pdf';
    const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';

    // File security validation
    const disallowedExts = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'msi', 'vbs', 'scr', 'dll'];
    if (disallowedExts.includes(ext)) {
      throw new ValidationError(`File type .${ext} is strictly prohibited`);
    }

    const storageKey = `tenants/${tenantId}/schools/${schoolId}/guardians/${guardianId}/docs/${Date.now()}_${originalName.replace(/\s+/g, '_')}`;
    const storage = getStorageProvider();
    await storage.upload(file.buffer, storageKey, file.mimetype);

    const doc = await prisma.guardianDocument.create({
      data: {
        tenantId,
        schoolId,
        guardianId,
        documentType,
        originalFileName: originalName,
        storageKey,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedBy: actorId || null,
        verificationStatus: 'PENDING',
      },
    });

    return doc;
  }

  /**
   * Document Verification
   */
  public static async verifyDocument(
    tenantId: string,
    schoolId: string,
    guardianId: string,
    documentId: string,
    status: 'VERIFIED' | 'REJECTED',
    verificationNotes?: string,
    actorId?: string
  ) {
    const doc = await prisma.guardianDocument.findFirst({
      where: { id: documentId, guardianId, tenantId, schoolId },
    });
    if (!doc) throw new NotFoundError('Guardian document not found');

    return await prisma.guardianDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: status,
        verificationNotes: verificationNotes || null,
        verifiedBy: actorId || null,
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Staff Notes
   */
  public static async addNote(
    tenantId: string,
    schoolId: string,
    guardianId: string,
    input: AddNoteInput,
    actorId?: string
  ) {
    const guardian = await prisma.guardian.findFirst({
      where: { id: guardianId, tenantId, schoolId },
    });
    if (!guardian) throw new NotFoundError('Guardian not found');

    return await prisma.guardianNote.create({
      data: {
        tenantId,
        schoolId,
        guardianId,
        category: input.category || 'GENERAL',
        content: input.content.trim(),
        isConfidential: input.isConfidential ?? false,
        createdBy: actorId || null,
      },
    });
  }

  /**
   * CSV Export
   */
  public static async exportGuardians(tenantId: string, schoolId: string, query: any) {
    const guardians = await prisma.guardian.findMany({
      where: {
        tenantId,
        schoolId,
        archivedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        students: {
          include: {
            student: { select: { studentId: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const headers = [
      'First Name',
      'Middle Name',
      'Last Name',
      'Relationship',
      'Phone',
      'Alt Phone',
      'Email',
      'Occupation',
      'Employer',
      'Address',
      'City',
      'State',
      'Postal Code',
      'Country',
      'Preferred Language',
      'Has Portal Access',
      'Linked Students',
    ];

    const rows = guardians.map((g) => [
      `"${(g.firstName || '').replace(/"/g, '""')}"`,
      `"${(g.middleName || '').replace(/"/g, '""')}"`,
      `"${(g.lastName || '').replace(/"/g, '""')}"`,
      `"${(g.relationship || '').replace(/"/g, '""')}"`,
      `"${(g.phone || '').replace(/"/g, '""')}"`,
      `"${(g.altPhone || '').replace(/"/g, '""')}"`,
      `"${(g.email || '').replace(/"/g, '""')}"`,
      `"${(g.occupation || '').replace(/"/g, '""')}"`,
      `"${(g.employer || '').replace(/"/g, '""')}"`,
      `"${(g.address || '').replace(/"/g, '""')}"`,
      `"${(g.city || '').replace(/"/g, '""')}"`,
      `"${(g.state || '').replace(/"/g, '""')}"`,
      `"${(g.postalCode || '').replace(/"/g, '""')}"`,
      `"${(g.country || 'IN').replace(/"/g, '""')}"`,
      `"${(g.preferredLanguage || 'en').replace(/"/g, '""')}"`,
      g.userId ? 'Yes' : 'No',
      `"${g.students.map((s) => `${s.student.firstName} ${s.student.lastName} (${s.student.studentId})`).join('; ')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * CSV Import Preview
   */
  public static async previewImport(tenantId: string, schoolId: string, fileBuffer: Buffer) {
    const content = fileBuffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      throw new ValidationError('CSV file has no data rows');
    }

    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    const records: any[] = [];
    const seenPhonesInBatch = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.replace(/^["']|["']$/g, '').trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] || '';
      });

      const firstName = row['first name'] || row['firstname'] || '';
      const lastName = row['last name'] || row['lastname'] || '';
      const phone = row['phone'] || row['phone number'] || '';
      const relationship = (row['relationship'] || 'GUARDIAN').toUpperCase();
      const email = row['email'] || '';

      const studentIdentifier =
        row['student id'] ||
        row['studentid'] ||
        row['student_id'] ||
        row['admission number'] ||
        row['admission_number'] ||
        '';

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!firstName) errors.push('First name is required');
      if (!lastName) errors.push('Last name is required');
      if (!phone || phone.length < 7) errors.push('Valid phone number is required');

      const normPhone = normalizePhoneNumber(phone);
      if (seenPhonesInBatch.has(normPhone)) {
        warnings.push('Duplicate phone number detected within import batch');
      } else {
        seenPhonesInBatch.add(normPhone);
      }

      records.push({
        rowNumber: i + 1,
        firstName,
        lastName,
        relationship: ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'].includes(relationship) ? relationship : 'GUARDIAN',
        phone,
        email,
        studentId: studentIdentifier,
        address: row['address'] || '',
        city: row['city'] || '',
        occupation: row['occupation'] || '',
        errors,
        warnings,
      });
    }

    // Check duplicates against database
    const phonesToCheck = records.map((r) => normalizePhoneNumber(r.phone)).filter(Boolean);
    const existingGuardians = await prisma.guardian.findMany({
      where: {
        tenantId,
        schoolId,
        normalizedPhone: { in: phonesToCheck },
        archivedAt: null,
      },
      select: { normalizedPhone: true, firstName: true, lastName: true },
    });

    const dbPhones = new Map(existingGuardians.map((g) => [g.normalizedPhone, `${g.firstName} ${g.lastName}`]));

    for (const r of records) {
      const np = normalizePhoneNumber(r.phone);
      if (dbPhones.has(np)) {
        r.warnings.push(`Matches existing guardian "${dbPhones.get(np)}" in school database`);
      }
    }

    // Match students if studentId provided
    const studentIdsToCheck = records.map((r) => r.studentId).filter(Boolean);
    if (studentIdsToCheck.length > 0) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validUuids = studentIdsToCheck.filter((id) => uuidRegex.test(id));
      const orConditions: any[] = [
        { studentId: { in: studentIdsToCheck } },
        { admissionNumber: { in: studentIdsToCheck } },
      ];
      if (validUuids.length > 0) {
        orConditions.push({ id: { in: validUuids } });
      }

      const foundStudents = await prisma.student.findMany({
        where: {
          tenantId,
          schoolId,
          OR: orConditions,
        },
        select: { id: true, studentId: true, admissionNumber: true, firstName: true, lastName: true },
      });
      const studentMap = new Map<string, typeof foundStudents[0]>();
      for (const s of foundStudents) {
        studentMap.set(s.id, s);
        studentMap.set(s.studentId, s);
        studentMap.set(s.admissionNumber, s);
      }
      for (const r of records) {
        if (r.studentId) {
          const match = studentMap.get(r.studentId);
          if (match) {
            r.matchedStudent = `${match.firstName} ${match.lastName} (${match.studentId})`;
            r.resolvedStudentId = match.id;
          } else {
            r.warnings.push(`Student ID "${r.studentId}" not found in current school`);
          }
        }
      }
    }

    return {
      totalRows: records.length,
      validRows: records.filter((r) => r.errors.length === 0).length,
      errorRows: records.filter((r) => r.errors.length > 0).length,
      warningRows: records.filter((r) => r.warnings.length > 0).length,
      preview: records.slice(0, 50),
    };
  }

  /**
   * Commit CSV Import
   */
  public static async commitImport(
    tenantId: string,
    schoolId: string,
    records: Array<{
      firstName: string;
      lastName: string;
      relationship: string;
      phone: string;
      email?: string;
      studentId?: string;
      resolvedStudentId?: string;
      address?: string;
      city?: string;
      occupation?: string;
    }>,
    actorId?: string
  ) {
    let createdCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of records) {
        if (!item.firstName || !item.lastName || !item.phone) continue;

        const normalizedPhone = normalizePhoneNumber(item.phone);
        const normalizedEmail = normalizeEmailAddress(item.email);

        const createdGuardian = await tx.guardian.create({
          data: {
            tenantId,
            schoolId,
            firstName: item.firstName.trim(),
            lastName: item.lastName.trim(),
            relationship: ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'].includes(item.relationship)
              ? item.relationship
              : 'GUARDIAN',
            phone: item.phone.trim(),
            normalizedPhone,
            email: item.email ? item.email.trim() : null,
            normalizedEmail,
            address: item.address ? item.address.trim() : null,
            city: item.city ? item.city.trim() : null,
            occupation: item.occupation ? item.occupation.trim() : null,
          },
        });

        // If a student was identified, link student to guardian
        const targetStudentId = item.resolvedStudentId || item.studentId;
        if (targetStudentId) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const isUuid = uuidRegex.test(targetStudentId);
          const orConditions: any[] = [
            { studentId: targetStudentId },
            { admissionNumber: targetStudentId },
          ];
          if (isUuid) {
            orConditions.push({ id: targetStudentId });
          }

          const student = await tx.student.findFirst({
            where: {
              tenantId,
              schoolId,
              OR: orConditions,
            },
            select: { id: true },
          });

          if (student) {
            await tx.studentGuardian.create({
              data: {
                tenantId,
                schoolId,
                guardianId: createdGuardian.id,
                studentId: student.id,
                relationship: ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'].includes(item.relationship)
                  ? item.relationship
                  : 'GUARDIAN',
                isPrimary: false,
              },
            });
          }
        }

        createdCount++;
      }
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'GUARDIANS_IMPORTED',
      entityType: 'Guardian',
      metadataInfo: { count: createdCount },
    });

    return { createdCount };
  }
}
