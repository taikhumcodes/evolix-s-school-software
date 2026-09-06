import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { HrService } from '../hr/hr.service.js';

export class MasterDataService {
  // ==========================================
  // 1. CLASSES
  // ==========================================
  static async listClasses(tenantId: string, schoolId: string, query?: { search?: string; isActive?: boolean; includeArchived?: boolean }) {
    const where: any = {
      tenantId,
      schoolId,
    };
    if (!query?.includeArchived) {
      where.archivedAt = null;
    }
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.classMaster.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        sections: {
          include: { section: true },
        },
        subjects: {
          include: { subject: true },
        },
      },
    });
  }

  static async getClassById(tenantId: string, schoolId: string, id: string) {
    const cls = await prisma.classMaster.findFirst({
      where: { id, tenantId, schoolId },
      include: {
        sections: { include: { section: true } },
        subjects: { include: { subject: true } },
      },
    });
    if (!cls) throw new NotFoundError('Class not found');
    return cls;
  }

  static async createClass(tenantId: string, schoolId: string, data: any, actorId?: string) {
    try {
      const existing = await prisma.classMaster.findFirst({
        where: {
          schoolId,
          OR: [
            { code: { equals: data.code, mode: 'insensitive' } },
            { name: { equals: data.name, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        if (!existing.archivedAt && existing.isActive) {
          throw new ConflictError('A class with this code or name already exists in this school.');
        }
        const restored = await prisma.classMaster.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            code: data.code,
            displayOrder: data.displayOrder ?? existing.displayOrder,
            academicLevel: data.academicLevel ?? existing.academicLevel,
            isActive: true,
            archivedAt: null,
          },
        });
        if (actorId) {
          await writeAuditLog({
            tenantId,
            schoolId,
            actorId,
            action: 'MASTER_CLASS_RESTORED',
            entityType: 'ClassMaster',
            entityId: restored.id,
            afterData: restored,
          });
        }
        return restored;
      }

      const created = await prisma.classMaster.create({
        data: {
          tenantId,
          schoolId,
          name: data.name,
          code: data.code,
          displayOrder: data.displayOrder ?? 0,
          academicLevel: data.academicLevel,
          isActive: data.isActive ?? true,
        },
      });

      if (actorId) {
        await writeAuditLog({
          tenantId,
          schoolId,
          actorId,
          action: 'MASTER_CLASS_CREATED',
          entityType: 'ClassMaster',
          entityId: created.id,
          afterData: created,
        });
      }

      return created;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictError('A class with this code or name already exists in this school.');
      }
      throw err;
    }
  }

  static async updateClass(tenantId: string, schoolId: string, id: string, data: any, actorId?: string) {
    const existing = await this.getClassById(tenantId, schoolId, id);

    if (data.code || data.name) {
      const duplicate = await prisma.classMaster.findFirst({
        where: {
          schoolId,
          id: { not: id },
          archivedAt: null,
          OR: [
            data.code ? { code: { equals: data.code, mode: 'insensitive' } } : {},
            data.name ? { name: { equals: data.name, mode: 'insensitive' } } : {},
          ],
        },
      });
      if (duplicate) {
        throw new ConflictError('Another class with this code or name already exists in this school.');
      }
    }

    const updated = await prisma.classMaster.update({
      where: { id },
      data,
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_CLASS_UPDATED',
        entityType: 'ClassMaster',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });
    }

    return updated;
  }

  static async archiveClass(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getClassById(tenantId, schoolId, id);
    const archived = await prisma.classMaster.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        isActive: false,
      },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_CLASS_ARCHIVED',
        entityType: 'ClassMaster',
        entityId: archived.id,
        beforeData: existing,
        afterData: archived,
      });
    }

    return archived;
  }

  static async restoreClass(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getClassById(tenantId, schoolId, id);
    const restored = await prisma.classMaster.update({
      where: { id },
      data: {
        archivedAt: null,
        isActive: true,
      },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_CLASS_RESTORED',
        entityType: 'ClassMaster',
        entityId: restored.id,
        beforeData: existing,
        afterData: restored,
      });
    }

    return restored;
  }

  // ==========================================
  // 2. SECTIONS
  // ==========================================
  static async listSections(tenantId: string, schoolId: string, query?: { search?: string; isActive?: boolean; includeArchived?: boolean }) {
    const where: any = { tenantId, schoolId };
    if (!query?.includeArchived) where.archivedAt = null;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.sectionMaster.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  static async getSectionById(tenantId: string, schoolId: string, id: string) {
    const section = await prisma.sectionMaster.findFirst({
      where: { id, tenantId, schoolId },
    });
    if (!section) throw new NotFoundError('Section not found');
    return section;
  }

  static async createSection(tenantId: string, schoolId: string, data: any, actorId?: string) {
    try {
      const existing = await prisma.sectionMaster.findFirst({
        where: {
          schoolId,
          OR: [
            { code: { equals: data.code, mode: 'insensitive' } },
            { name: { equals: data.name, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        if (!existing.archivedAt && existing.isActive) {
          throw new ConflictError('A section with this code or name already exists in this school.');
        }
        const restored = await prisma.sectionMaster.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            code: data.code,
            displayOrder: data.displayOrder ?? existing.displayOrder,
            isActive: true,
            archivedAt: null,
          },
        });
        if (actorId) {
          await writeAuditLog({
            tenantId,
            schoolId,
            actorId,
            action: 'MASTER_SECTION_RESTORED',
            entityType: 'SectionMaster',
            entityId: restored.id,
            afterData: restored,
          });
        }
        return restored;
      }

      const created = await prisma.sectionMaster.create({
        data: {
          tenantId,
          schoolId,
          name: data.name,
          code: data.code,
          displayOrder: data.displayOrder ?? 0,
          isActive: data.isActive ?? true,
        },
      });

      if (actorId) {
        await writeAuditLog({
          tenantId,
          schoolId,
          actorId,
          action: 'MASTER_SECTION_CREATED',
          entityType: 'SectionMaster',
          entityId: created.id,
          afterData: created,
        });
      }

      return created;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictError('A section with this code or name already exists in this school.');
      }
      throw err;
    }
  }

  static async updateSection(tenantId: string, schoolId: string, id: string, data: any, actorId?: string) {
    const existing = await this.getSectionById(tenantId, schoolId, id);

    if (data.code || data.name) {
      const duplicate = await prisma.sectionMaster.findFirst({
        where: {
          schoolId,
          id: { not: id },
          archivedAt: null,
          OR: [
            data.code ? { code: { equals: data.code, mode: 'insensitive' } } : {},
            data.name ? { name: { equals: data.name, mode: 'insensitive' } } : {},
          ],
        },
      });
      if (duplicate) {
        throw new ConflictError('Another section with this code or name already exists in this school.');
      }
    }

    const updated = await prisma.sectionMaster.update({
      where: { id },
      data,
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_SECTION_UPDATED',
        entityType: 'SectionMaster',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });
    }

    return updated;
  }

  static async archiveSection(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getSectionById(tenantId, schoolId, id);
    const archived = await prisma.sectionMaster.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        isActive: false,
      },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_SECTION_ARCHIVED',
        entityType: 'SectionMaster',
        entityId: archived.id,
        beforeData: existing,
        afterData: archived,
      });
    }

    return archived;
  }

  static async restoreSection(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getSectionById(tenantId, schoolId, id);
    const restored = await prisma.sectionMaster.update({
      where: { id },
      data: {
        archivedAt: null,
        isActive: true,
      },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_SECTION_RESTORED',
        entityType: 'SectionMaster',
        entityId: restored.id,
        beforeData: existing,
        afterData: restored,
      });
    }

    return restored;
  }

  // ==========================================
  // 3. CLASS-SECTION MAPPINGS
  // ==========================================
  static async listClassSections(tenantId: string, schoolId: string, classId?: string) {
    const where: any = { tenantId, schoolId };
    if (classId) where.classId = classId;
    return prisma.classSection.findMany({
      where,
      include: {
        class: true,
        section: true,
      },
      orderBy: [{ class: { displayOrder: 'asc' } }, { section: { displayOrder: 'asc' } }],
    });
  }

  static async createClassSection(tenantId: string, schoolId: string, data: { classId: string; sectionId: string; capacity?: number }, actorId?: string) {
    // Verify both belong to school
    await this.getClassById(tenantId, schoolId, data.classId);
    await this.getSectionById(tenantId, schoolId, data.sectionId);

    const existing = await prisma.classSection.findUnique({
      where: {
        classId_sectionId: {
          classId: data.classId,
          sectionId: data.sectionId,
        },
      },
    });
    if (existing) {
      throw new ConflictError('This section is already assigned to this class.');
    }

    const created = await prisma.classSection.create({
      data: {
        tenantId,
        schoolId,
        classId: data.classId,
        sectionId: data.sectionId,
        capacity: data.capacity ?? 40,
        isActive: true,
      },
      include: {
        class: true,
        section: true,
      },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'CLASS_SECTION_ASSIGNED',
        entityType: 'ClassSection',
        entityId: created.id,
        afterData: created,
      });
    }

    return created;
  }

  static async deleteClassSection(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await prisma.classSection.findFirst({
      where: { id, tenantId, schoolId },
    });
    if (!existing) throw new NotFoundError('Class section assignment not found');

    await prisma.classSection.delete({ where: { id } });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'CLASS_SECTION_REMOVED',
        entityType: 'ClassSection',
        entityId: id,
        beforeData: existing,
      });
    }

    return { success: true };
  }

  // ==========================================
  // 4. SUBJECTS
  // ==========================================
  static async listSubjects(tenantId: string, schoolId: string, query?: { search?: string; isActive?: boolean; includeArchived?: boolean }) {
    const where: any = { tenantId, schoolId };
    if (!query?.includeArchived) where.archivedAt = null;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.subjectMaster.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  static async getSubjectById(tenantId: string, schoolId: string, id: string) {
    const subject = await prisma.subjectMaster.findFirst({
      where: { id, tenantId, schoolId },
    });
    if (!subject) throw new NotFoundError('Subject not found');
    return subject;
  }

  static async createSubject(tenantId: string, schoolId: string, data: any, actorId?: string) {
    try {
      const existing = await prisma.subjectMaster.findFirst({
        where: {
          schoolId,
          OR: [
            { code: { equals: data.code, mode: 'insensitive' } },
            { name: { equals: data.name, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        if (!existing.archivedAt && existing.isActive) {
          throw new ConflictError('A subject with this code or name already exists in this school.');
        }
        const restored = await prisma.subjectMaster.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            code: data.code,
            type: data.type ?? existing.type,
            creditHours: data.creditHours ?? existing.creditHours,
            isActive: true,
            archivedAt: null,
          },
        });
        if (actorId) {
          await writeAuditLog({
            tenantId,
            schoolId,
            actorId,
            action: 'MASTER_SUBJECT_RESTORED',
            entityType: 'SubjectMaster',
            entityId: restored.id,
            afterData: restored,
          });
        }
        return restored;
      }

      const created = await prisma.subjectMaster.create({
        data: {
          tenantId,
          schoolId,
          name: data.name,
          code: data.code,
          type: data.type ?? 'THEORY',
          creditHours: data.creditHours,
          isActive: data.isActive ?? true,
        },
      });

      if (actorId) {
        await writeAuditLog({
          tenantId,
          schoolId,
          actorId,
          action: 'MASTER_SUBJECT_CREATED',
          entityType: 'SubjectMaster',
          entityId: created.id,
          afterData: created,
        });
      }

      return created;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictError('A subject with this code or name already exists in this school.');
      }
      throw err;
    }
  }

  static async updateSubject(tenantId: string, schoolId: string, id: string, data: any, actorId?: string) {
    const existing = await this.getSubjectById(tenantId, schoolId, id);

    if (data.code || data.name) {
      const duplicate = await prisma.subjectMaster.findFirst({
        where: {
          schoolId,
          id: { not: id },
          archivedAt: null,
          OR: [
            data.code ? { code: { equals: data.code, mode: 'insensitive' } } : {},
            data.name ? { name: { equals: data.name, mode: 'insensitive' } } : {},
          ],
        },
      });
      if (duplicate) {
        throw new ConflictError('Another subject with this code or name already exists in this school.');
      }
    }

    const updated = await prisma.subjectMaster.update({
      where: { id },
      data,
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_SUBJECT_UPDATED',
        entityType: 'SubjectMaster',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });
    }

    return updated;
  }

  static async archiveSubject(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getSubjectById(tenantId, schoolId, id);
    const archived = await prisma.subjectMaster.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        isActive: false,
      },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_SUBJECT_ARCHIVED',
        entityType: 'SubjectMaster',
        entityId: archived.id,
        beforeData: existing,
        afterData: archived,
      });
    }

    return archived;
  }

  static async restoreSubject(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getSubjectById(tenantId, schoolId, id);
    const restored = await prisma.subjectMaster.update({
      where: { id },
      data: {
        archivedAt: null,
        isActive: true,
      },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_SUBJECT_RESTORED',
        entityType: 'SubjectMaster',
        entityId: restored.id,
        beforeData: existing,
        afterData: restored,
      });
    }

    return restored;
  }

  // ==========================================
  // 5. CLASS-SUBJECT MAPPINGS
  // ==========================================
  static async listClassSubjects(tenantId: string, schoolId: string, classId?: string) {
    const where: any = { tenantId, schoolId };
    if (classId) where.classId = classId;
    return prisma.classSubject.findMany({
      where,
      include: {
        class: true,
        subject: true,
      },
      orderBy: [{ class: { displayOrder: 'asc' } }, { subject: { name: 'asc' } }],
    });
  }

  static async createClassSubject(tenantId: string, schoolId: string, data: { classId: string; subjectId: string; isElective?: boolean }, actorId?: string) {
    await this.getClassById(tenantId, schoolId, data.classId);
    await this.getSubjectById(tenantId, schoolId, data.subjectId);

    const existing = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId: data.classId,
          subjectId: data.subjectId,
        },
      },
    });
    if (existing) {
      throw new ConflictError('This subject is already assigned to this class.');
    }

    const created = await prisma.classSubject.create({
      data: {
        tenantId,
        schoolId,
        classId: data.classId,
        subjectId: data.subjectId,
        isElective: data.isElective ?? false,
        isActive: true,
      },
      include: {
        class: true,
        subject: true,
      },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'CLASS_SUBJECT_ASSIGNED',
        entityType: 'ClassSubject',
        entityId: created.id,
        afterData: created,
      });
    }

    return created;
  }

  static async deleteClassSubject(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await prisma.classSubject.findFirst({
      where: { id, tenantId, schoolId },
    });
    if (!existing) throw new NotFoundError('Class subject assignment not found');

    await prisma.classSubject.delete({ where: { id } });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'CLASS_SUBJECT_REMOVED',
        entityType: 'ClassSubject',
        entityId: id,
        beforeData: existing,
      });
    }

    return { success: true };
  }

  // ==========================================
  // 6. RELIGIONS
  // ==========================================
  static async listReligions(tenantId: string, query?: { search?: string; isActive?: boolean; includeArchived?: boolean }) {
    const where: any = { tenantId };
    if (!query?.includeArchived) where.archivedAt = null;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.religion.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  static async createReligion(tenantId: string, schoolId: string, data: { name: string; code?: string | null; isActive?: boolean }, actorId?: string) {
    try {
      const existing = await prisma.religion.findFirst({
        where: {
          tenantId,
          name: { equals: data.name, mode: 'insensitive' },
        },
      });

      if (existing) {
        if (!existing.archivedAt && existing.isActive) {
          throw new ConflictError('This religion already exists.');
        }
        const restored = await prisma.religion.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            code: data.code ?? existing.code,
            isActive: true,
            archivedAt: null,
          },
        });
        return restored;
      }

      const created = await prisma.religion.create({
        data: {
          tenantId,
          schoolId,
          name: data.name,
          code: data.code,
          isActive: data.isActive ?? true,
        },
      });

      if (actorId) {
        await writeAuditLog({
          tenantId,
          schoolId,
          actorId,
          action: 'MASTER_RELIGION_CREATED',
          entityType: 'Religion',
          entityId: created.id,
          afterData: created,
        });
      }

      return created;
    } catch (err: any) {
      if (err.code === 'P2002') throw new ConflictError('This religion already exists.');
      throw err;
    }
  }

  static async updateReligion(tenantId: string, id: string, data: any, actorId?: string) {
    const existing = await prisma.religion.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Religion not found');

    const updated = await prisma.religion.update({
      where: { id },
      data,
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_RELIGION_UPDATED',
        entityType: 'Religion',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });
    }

    return updated;
  }

  static async archiveReligion(tenantId: string, id: string, actorId?: string) {
    const existing = await prisma.religion.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Religion not found');

    const updated = await prisma.religion.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_RELIGION_ARCHIVED',
        entityType: 'Religion',
        entityId: updated.id,
        beforeData: existing,
      });
    }

    return updated;
  }

  static async restoreReligion(tenantId: string, id: string, actorId?: string) {
    const existing = await prisma.religion.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Religion not found');

    const restored = await prisma.religion.update({
      where: { id },
      data: { archivedAt: null, isActive: true },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_RELIGION_RESTORED',
        entityType: 'Religion',
        entityId: restored.id,
        beforeData: existing,
        afterData: restored,
      });
    }

    return restored;
  }

  // ==========================================
  // 7. CATEGORIES
  // ==========================================
  static async listCategories(tenantId: string, query?: { search?: string; isActive?: boolean; includeArchived?: boolean }) {
    const where: any = { tenantId };
    if (!query?.includeArchived) where.archivedAt = null;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.studentCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { castes: true },
    });
  }

  static async createCategory(tenantId: string, schoolId: string, data: { name: string; code?: string | null; isActive?: boolean }, actorId?: string) {
    try {
      const existing = await prisma.studentCategory.findFirst({
        where: {
          tenantId,
          name: { equals: data.name, mode: 'insensitive' },
        },
      });

      if (existing) {
        if (!existing.archivedAt && existing.isActive) {
          throw new ConflictError('This category already exists.');
        }
        const restored = await prisma.studentCategory.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            code: data.code ?? existing.code,
            isActive: true,
            archivedAt: null,
          },
        });
        return restored;
      }

      const created = await prisma.studentCategory.create({
        data: {
          tenantId,
          schoolId,
          name: data.name,
          code: data.code,
          isActive: data.isActive ?? true,
        },
      });

      if (actorId) {
        await writeAuditLog({
          tenantId,
          schoolId,
          actorId,
          action: 'MASTER_CATEGORY_CREATED',
          entityType: 'StudentCategory',
          entityId: created.id,
          afterData: created,
        });
      }

      return created;
    } catch (err: any) {
      if (err.code === 'P2002') throw new ConflictError('This category already exists.');
      throw err;
    }
  }

  static async updateCategory(tenantId: string, id: string, data: any, actorId?: string) {
    const existing = await prisma.studentCategory.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Category not found');

    const updated = await prisma.studentCategory.update({
      where: { id },
      data,
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_CATEGORY_UPDATED',
        entityType: 'StudentCategory',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });
    }

    return updated;
  }

  static async archiveCategory(tenantId: string, id: string, actorId?: string) {
    const existing = await prisma.studentCategory.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Category not found');

    const updated = await prisma.studentCategory.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_CATEGORY_ARCHIVED',
        entityType: 'StudentCategory',
        entityId: updated.id,
        beforeData: existing,
      });
    }

    return updated;
  }

  static async restoreCategory(tenantId: string, id: string, actorId?: string) {
    const existing = await prisma.studentCategory.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Category not found');

    const restored = await prisma.studentCategory.update({
      where: { id },
      data: { archivedAt: null, isActive: true },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_CATEGORY_RESTORED',
        entityType: 'StudentCategory',
        entityId: restored.id,
        beforeData: existing,
        afterData: restored,
      });
    }

    return restored;
  }

  // ==========================================
  // 8. CASTES
  // ==========================================
  static async listCastes(tenantId: string, query?: { search?: string; categoryId?: string; isActive?: boolean; includeArchived?: boolean }) {
    const where: any = { tenantId };
    if (!query?.includeArchived) where.archivedAt = null;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.categoryId) where.categoryId = query.categoryId;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.caste.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { category: true },
    });
  }

  static async createCaste(tenantId: string, schoolId: string, data: { name: string; code?: string | null; categoryId?: string | null; isActive?: boolean }, actorId?: string) {
    try {
      const existing = await prisma.caste.findFirst({
        where: {
          tenantId,
          name: { equals: data.name, mode: 'insensitive' },
        },
      });

      if (existing) {
        if (!existing.archivedAt && existing.isActive) {
          throw new ConflictError('This caste already exists.');
        }
        const restored = await prisma.caste.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            code: data.code ?? existing.code,
            categoryId: data.categoryId !== undefined ? data.categoryId : existing.categoryId,
            isActive: true,
            archivedAt: null,
          },
          include: { category: true },
        });
        return restored;
      }

      const created = await prisma.caste.create({
        data: {
          tenantId,
          schoolId,
          name: data.name,
          code: data.code,
          categoryId: data.categoryId,
          isActive: data.isActive ?? true,
        },
        include: { category: true },
      });

      if (actorId) {
        await writeAuditLog({
          tenantId,
          schoolId,
          actorId,
          action: 'MASTER_CASTE_CREATED',
          entityType: 'Caste',
          entityId: created.id,
          afterData: created,
        });
      }

      return created;
    } catch (err: any) {
      if (err.code === 'P2002') throw new ConflictError('This caste already exists.');
      throw err;
    }
  }

  static async updateCaste(tenantId: string, id: string, data: any, actorId?: string) {
    const existing = await prisma.caste.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Caste not found');

    const updated = await prisma.caste.update({
      where: { id },
      data,
      include: { category: true },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_CASTE_UPDATED',
        entityType: 'Caste',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });
    }

    return updated;
  }

  static async archiveCaste(tenantId: string, id: string, actorId?: string) {
    const existing = await prisma.caste.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Caste not found');

    const updated = await prisma.caste.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_CASTE_ARCHIVED',
        entityType: 'Caste',
        entityId: updated.id,
        beforeData: existing,
      });
    }

    return updated;
  }

  static async restoreCaste(tenantId: string, id: string, actorId?: string) {
    const existing = await prisma.caste.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Caste not found');

    const restored = await prisma.caste.update({
      where: { id },
      data: { archivedAt: null, isActive: true },
      include: { category: true },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_CASTE_RESTORED',
        entityType: 'Caste',
        entityId: restored.id,
        beforeData: existing,
        afterData: restored,
      });
    }

    return restored;
  }

  // ==========================================
  // 9. VEHICLE TYPES
  // ==========================================
  static async listVehicleTypes(tenantId: string, query?: { search?: string; isActive?: boolean; includeArchived?: boolean }) {
    const where: any = { tenantId };
    if (!query?.includeArchived) where.archivedAt = null;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.vehicleType.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  static async createVehicleType(tenantId: string, schoolId: string, data: any, actorId?: string) {
    try {
      const existing = await prisma.vehicleType.findFirst({
        where: {
          tenantId,
          name: { equals: data.name, mode: 'insensitive' },
        },
      });

      if (existing) {
        if (!existing.archivedAt && existing.isActive) {
          throw new ConflictError('This vehicle type already exists.');
        }
        const restored = await prisma.vehicleType.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            code: data.code ?? existing.code,
            capacity: data.capacity !== undefined ? data.capacity : existing.capacity,
            description: data.description ?? existing.description,
            isActive: true,
            archivedAt: null,
          },
        });
        return restored;
      }

      const created = await prisma.vehicleType.create({
        data: {
          tenantId,
          schoolId,
          name: data.name,
          code: data.code,
          capacity: data.capacity,
          description: data.description,
          isActive: data.isActive ?? true,
        },
      });

      if (actorId) {
        await writeAuditLog({
          tenantId,
          schoolId,
          actorId,
          action: 'MASTER_VEHICLE_TYPE_CREATED',
          entityType: 'VehicleType',
          entityId: created.id,
          afterData: created,
        });
      }

      return created;
    } catch (err: any) {
      if (err.code === 'P2002') throw new ConflictError('This vehicle type already exists.');
      throw err;
    }
  }

  static async updateVehicleType(tenantId: string, id: string, data: any, actorId?: string) {
    const existing = await prisma.vehicleType.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Vehicle type not found');

    const updated = await prisma.vehicleType.update({
      where: { id },
      data,
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_VEHICLE_TYPE_UPDATED',
        entityType: 'VehicleType',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });
    }

    return updated;
  }

  static async archiveVehicleType(tenantId: string, id: string, actorId?: string) {
    const existing = await prisma.vehicleType.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Vehicle type not found');

    const updated = await prisma.vehicleType.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_VEHICLE_TYPE_ARCHIVED',
        entityType: 'VehicleType',
        entityId: updated.id,
        beforeData: existing,
      });
    }

    return updated;
  }

  static async restoreVehicleType(tenantId: string, id: string, actorId?: string) {
    const existing = await prisma.vehicleType.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Vehicle type not found');

    const restored = await prisma.vehicleType.update({
      where: { id },
      data: { archivedAt: null, isActive: true },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        actorId,
        action: 'MASTER_VEHICLE_TYPE_RESTORED',
        entityType: 'VehicleType',
        entityId: restored.id,
        beforeData: existing,
        afterData: restored,
      });
    }

    return restored;
  }

  // ==========================================
  // 10. FEE HEADS
  // ==========================================
  static async listFeeHeads(tenantId: string, schoolId: string, query?: { search?: string; isActive?: boolean; includeArchived?: boolean }) {
    const where: any = { tenantId, schoolId };
    if (!query?.includeArchived) where.archivedAt = null;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.feeHead.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  static async getFeeHeadById(tenantId: string, schoolId: string, id: string) {
    const head = await prisma.feeHead.findFirst({
      where: { id, tenantId, schoolId },
    });
    if (!head) throw new NotFoundError('Fee head not found');
    return head;
  }

  static async createFeeHead(tenantId: string, schoolId: string, data: any, actorId?: string) {
    try {
      const existing = await prisma.feeHead.findFirst({
        where: {
          schoolId,
          OR: [
            { code: { equals: data.code, mode: 'insensitive' } },
            { name: { equals: data.name, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        if (!existing.archivedAt && existing.isActive) {
          throw new ConflictError('A fee head with this code or name already exists in this school.');
        }
        const restored = await prisma.feeHead.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            code: data.code,
            description: data.description ?? existing.description,
            displayOrder: data.displayOrder ?? existing.displayOrder,
            isRefundable: data.isRefundable ?? existing.isRefundable,
            isActive: true,
            archivedAt: null,
          },
        });
        return restored;
      }

      const created = await prisma.feeHead.create({
        data: {
          tenantId,
          schoolId,
          name: data.name,
          code: data.code,
          description: data.description,
          displayOrder: data.displayOrder ?? 0,
          isRefundable: data.isRefundable ?? false,
          isActive: data.isActive ?? true,
        },
      });

      if (actorId) {
        await writeAuditLog({
          tenantId,
          schoolId,
          actorId,
          action: 'MASTER_FEE_HEAD_CREATED',
          entityType: 'FeeHead',
          entityId: created.id,
          afterData: created,
        });
      }

      return created;
    } catch (err: any) {
      if (err.code === 'P2002') throw new ConflictError('A fee head with this code or name already exists in this school.');
      throw err;
    }
  }

  static async updateFeeHead(tenantId: string, schoolId: string, id: string, data: any, actorId?: string) {
    const existing = await this.getFeeHeadById(tenantId, schoolId, id);

    if (data.code || data.name) {
      const duplicate = await prisma.feeHead.findFirst({
        where: {
          schoolId,
          id: { not: id },
          archivedAt: null,
          OR: [
            data.code ? { code: { equals: data.code, mode: 'insensitive' } } : {},
            data.name ? { name: { equals: data.name, mode: 'insensitive' } } : {},
          ],
        },
      });
      if (duplicate) throw new ConflictError('Another fee head with this code or name already exists in this school.');
    }

    const updated = await prisma.feeHead.update({
      where: { id },
      data,
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_FEE_HEAD_UPDATED',
        entityType: 'FeeHead',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });
    }

    return updated;
  }

  static async archiveFeeHead(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getFeeHeadById(tenantId, schoolId, id);
    const archived = await prisma.feeHead.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_FEE_HEAD_ARCHIVED',
        entityType: 'FeeHead',
        entityId: archived.id,
        beforeData: existing,
      });
    }

    return archived;
  }

  static async restoreFeeHead(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getFeeHeadById(tenantId, schoolId, id);
    const restored = await prisma.feeHead.update({
      where: { id },
      data: { archivedAt: null, isActive: true },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_FEE_HEAD_RESTORED',
        entityType: 'FeeHead',
        entityId: restored.id,
        beforeData: existing,
        afterData: restored,
      });
    }

    return restored;
  }

  // ==========================================
  // 11. EXPENSE HEADS
  // ==========================================
  static async listExpenseHeads(tenantId: string, schoolId: string, query?: { search?: string; isActive?: boolean; includeArchived?: boolean }) {
    const where: any = { tenantId, schoolId };
    if (!query?.includeArchived) where.archivedAt = null;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.expenseHead.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  static async getExpenseHeadById(tenantId: string, schoolId: string, id: string) {
    const head = await prisma.expenseHead.findFirst({
      where: { id, tenantId, schoolId },
    });
    if (!head) throw new NotFoundError('Expense head not found');
    return head;
  }

  static async createExpenseHead(tenantId: string, schoolId: string, data: any, actorId?: string) {
    try {
      const existing = await prisma.expenseHead.findFirst({
        where: {
          schoolId,
          OR: [
            { code: { equals: data.code, mode: 'insensitive' } },
            { name: { equals: data.name, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        if (!existing.archivedAt && existing.isActive) {
          throw new ConflictError('An expense head with this code or name already exists in this school.');
        }
        const restored = await prisma.expenseHead.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            code: data.code,
            description: data.description ?? existing.description,
            displayOrder: data.displayOrder ?? existing.displayOrder,
            isActive: true,
            archivedAt: null,
          },
        });
        return restored;
      }

      const created = await prisma.expenseHead.create({
        data: {
          tenantId,
          schoolId,
          name: data.name,
          code: data.code,
          description: data.description,
          displayOrder: data.displayOrder ?? 0,
          isActive: data.isActive ?? true,
        },
      });

      if (actorId) {
        await writeAuditLog({
          tenantId,
          schoolId,
          actorId,
          action: 'MASTER_EXPENSE_HEAD_CREATED',
          entityType: 'ExpenseHead',
          entityId: created.id,
          afterData: created,
        });
      }

      return created;
    } catch (err: any) {
      if (err.code === 'P2002') throw new ConflictError('An expense head with this code or name already exists in this school.');
      throw err;
    }
  }

  static async updateExpenseHead(tenantId: string, schoolId: string, id: string, data: any, actorId?: string) {
    const existing = await this.getExpenseHeadById(tenantId, schoolId, id);

    if (data.code || data.name) {
      const duplicate = await prisma.expenseHead.findFirst({
        where: {
          schoolId,
          id: { not: id },
          archivedAt: null,
          OR: [
            data.code ? { code: { equals: data.code, mode: 'insensitive' } } : {},
            data.name ? { name: { equals: data.name, mode: 'insensitive' } } : {},
          ],
        },
      });
      if (duplicate) throw new ConflictError('Another expense head with this code or name already exists in this school.');
    }

    const updated = await prisma.expenseHead.update({
      where: { id },
      data,
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_EXPENSE_HEAD_UPDATED',
        entityType: 'ExpenseHead',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });
    }

    return updated;
  }

  static async archiveExpenseHead(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getExpenseHeadById(tenantId, schoolId, id);
    const archived = await prisma.expenseHead.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_EXPENSE_HEAD_ARCHIVED',
        entityType: 'ExpenseHead',
        entityId: archived.id,
        beforeData: existing,
      });
    }

    return archived;
  }

  static async restoreExpenseHead(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getExpenseHeadById(tenantId, schoolId, id);
    const restored = await prisma.expenseHead.update({
      where: { id },
      data: { archivedAt: null, isActive: true },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_EXPENSE_HEAD_RESTORED',
        entityType: 'ExpenseHead',
        entityId: restored.id,
        beforeData: existing,
        afterData: restored,
      });
    }

    return restored;
  }

  // ==========================================
  // 12. DEPARTMENTS
  // ==========================================
  static async listDepartments(tenantId: string, schoolId: string, query?: { search?: string; isActive?: boolean; includeArchived?: boolean }) {
    const totalCount = await prisma.department.count({ where: { schoolId, tenantId, archivedAt: null } });
    if (totalCount === 0) {
      await HrService.ensureDefaultDepartmentsAndDesignations(tenantId, schoolId);
    }

    const where: any = { tenantId, schoolId };
    if (!query?.includeArchived) where.archivedAt = null;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { designations: true },
    });
  }

  static async getDepartmentById(tenantId: string, schoolId: string, id: string) {
    const dep = await prisma.department.findFirst({
      where: { id, tenantId, schoolId },
      include: { designations: true },
    });
    if (!dep) throw new NotFoundError('Department not found');
    return dep;
  }

  static async createDepartment(tenantId: string, schoolId: string, data: any, actorId?: string) {
    try {
      const existing = await prisma.department.findFirst({
        where: {
          schoolId,
          OR: [
            { code: { equals: data.code, mode: 'insensitive' } },
            { name: { equals: data.name, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        if (!existing.archivedAt && existing.isActive) {
          throw new ConflictError('A department with this code or name already exists in this school.');
        }
        const restored = await prisma.department.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            code: data.code,
            description: data.description ?? existing.description,
            isActive: true,
            archivedAt: null,
          },
        });
        return restored;
      }

      const created = await prisma.department.create({
        data: {
          tenantId,
          schoolId,
          name: data.name,
          code: data.code,
          description: data.description,
          isActive: data.isActive ?? true,
        },
      });

      if (actorId) {
        await writeAuditLog({
          tenantId,
          schoolId,
          actorId,
          action: 'MASTER_DEPARTMENT_CREATED',
          entityType: 'Department',
          entityId: created.id,
          afterData: created,
        });
      }

      return created;
    } catch (err: any) {
      if (err.code === 'P2002') throw new ConflictError('A department with this code or name already exists in this school.');
      throw err;
    }
  }

  static async updateDepartment(tenantId: string, schoolId: string, id: string, data: any, actorId?: string) {
    const existing = await this.getDepartmentById(tenantId, schoolId, id);

    if (data.code || data.name) {
      const duplicate = await prisma.department.findFirst({
        where: {
          schoolId,
          id: { not: id },
          archivedAt: null,
          OR: [
            data.code ? { code: { equals: data.code, mode: 'insensitive' } } : {},
            data.name ? { name: { equals: data.name, mode: 'insensitive' } } : {},
          ],
        },
      });
      if (duplicate) throw new ConflictError('Another department with this code or name already exists in this school.');
    }

    const updated = await prisma.department.update({
      where: { id },
      data,
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_DEPARTMENT_UPDATED',
        entityType: 'Department',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });
    }

    return updated;
  }

  static async archiveDepartment(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getDepartmentById(tenantId, schoolId, id);
    const archived = await prisma.department.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_DEPARTMENT_ARCHIVED',
        entityType: 'Department',
        entityId: archived.id,
        beforeData: existing,
      });
    }

    return archived;
  }

  static async restoreDepartment(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getDepartmentById(tenantId, schoolId, id);
    const restored = await prisma.department.update({
      where: { id },
      data: { archivedAt: null, isActive: true },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_DEPARTMENT_RESTORED',
        entityType: 'Department',
        entityId: restored.id,
        beforeData: existing,
        afterData: restored,
      });
    }

    return restored;
  }

  // ==========================================
  // 13. DESIGNATIONS
  // ==========================================
  static async listDesignations(tenantId: string, schoolId: string, query?: { search?: string; departmentId?: string; isActive?: boolean; includeArchived?: boolean }) {
    const totalCount = await prisma.designation.count({ where: { schoolId, tenantId, archivedAt: null } });
    if (totalCount === 0) {
      await HrService.ensureDefaultDepartmentsAndDesignations(tenantId, schoolId);
    }

    const where: any = { tenantId, schoolId };
    if (!query?.includeArchived) where.archivedAt = null;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.departmentId) where.departmentId = query.departmentId;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.designation.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { department: true },
    });
  }

  static async getDesignationById(tenantId: string, schoolId: string, id: string) {
    const des = await prisma.designation.findFirst({
      where: { id, tenantId, schoolId },
      include: { department: true },
    });
    if (!des) throw new NotFoundError('Designation not found');
    return des;
  }

  static async createDesignation(tenantId: string, schoolId: string, data: any, actorId?: string) {
    try {
      const existing = await prisma.designation.findFirst({
        where: {
          schoolId,
          OR: [
            { code: { equals: data.code, mode: 'insensitive' } },
            { name: { equals: data.name, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        if (!existing.archivedAt && existing.isActive) {
          throw new ConflictError('A designation with this code or name already exists in this school.');
        }
        const restored = await prisma.designation.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            code: data.code,
            departmentId: data.departmentId !== undefined ? data.departmentId : existing.departmentId,
            description: data.description ?? existing.description,
            displayOrder: data.displayOrder ?? existing.displayOrder,
            isActive: true,
            archivedAt: null,
          },
          include: { department: true },
        });
        return restored;
      }

      const created = await prisma.designation.create({
        data: {
          tenantId,
          schoolId,
          name: data.name,
          code: data.code,
          departmentId: data.departmentId,
          description: data.description,
          displayOrder: data.displayOrder ?? 0,
          isActive: data.isActive ?? true,
        },
        include: { department: true },
      });

      if (actorId) {
        await writeAuditLog({
          tenantId,
          schoolId,
          actorId,
          action: 'MASTER_DESIGNATION_CREATED',
          entityType: 'Designation',
          entityId: created.id,
          afterData: created,
        });
      }

      return created;
    } catch (err: any) {
      if (err.code === 'P2002') throw new ConflictError('A designation with this code or name already exists in this school.');
      throw err;
    }
  }

  static async updateDesignation(tenantId: string, schoolId: string, id: string, data: any, actorId?: string) {
    const existing = await this.getDesignationById(tenantId, schoolId, id);

    if (data.code || data.name) {
      const duplicate = await prisma.designation.findFirst({
        where: {
          schoolId,
          id: { not: id },
          archivedAt: null,
          OR: [
            data.code ? { code: { equals: data.code, mode: 'insensitive' } } : {},
            data.name ? { name: { equals: data.name, mode: 'insensitive' } } : {},
          ],
        },
      });
      if (duplicate) throw new ConflictError('Another designation with this code or name already exists in this school.');
    }

    const updated = await prisma.designation.update({
      where: { id },
      data,
      include: { department: true },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_DESIGNATION_UPDATED',
        entityType: 'Designation',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });
    }

    return updated;
  }

  static async archiveDesignation(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getDesignationById(tenantId, schoolId, id);
    const archived = await prisma.designation.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_DESIGNATION_ARCHIVED',
        entityType: 'Designation',
        entityId: archived.id,
        beforeData: existing,
      });
    }

    return archived;
  }

  static async restoreDesignation(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const existing = await this.getDesignationById(tenantId, schoolId, id);
    const restored = await prisma.designation.update({
      where: { id },
      data: { archivedAt: null, isActive: true },
      include: { department: true },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'MASTER_DESIGNATION_RESTORED',
        entityType: 'Designation',
        entityId: restored.id,
        beforeData: existing,
        afterData: restored,
      });
    }

    return restored;
  }

  // ==========================================
  // 14. LOCATIONS (COUNTRIES, STATES, CITIES)
  // ==========================================
  static async listCountries() {
    return prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  static async createCountry(data: { name: string; isoCode: string; dialCode?: string | null; currency?: string | null }) {
    return prisma.country.create({
      data: {
        name: data.name,
        isoCode: data.isoCode,
        dialCode: data.dialCode,
        currency: data.currency,
        isActive: true,
      },
    });
  }

  static async updateCountry(id: string, data: any) {
    const existing = await prisma.country.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Country not found');
    return prisma.country.update({
      where: { id },
      data,
    });
  }

  static async listStates(countryId?: string) {
    const where: any = { isActive: true };
    if (countryId) where.countryId = countryId;
    return prisma.state.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { country: true },
    });
  }

  static async createState(data: { countryId: string; name: string; code?: string | null }) {
    return prisma.state.create({
      data: {
        countryId: data.countryId,
        name: data.name,
        code: data.code,
        isActive: true,
      },
    });
  }

  static async updateState(id: string, data: any) {
    const existing = await prisma.state.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('State not found');
    return prisma.state.update({
      where: { id },
      data,
    });
  }

  static async listCities(stateId?: string) {
    const where: any = { isActive: true };
    if (stateId) where.stateId = stateId;
    return prisma.city.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { state: true },
    });
  }

  static async createCity(data: { stateId: string; name: string }) {
    return prisma.city.create({
      data: {
        stateId: data.stateId,
        name: data.name,
        isActive: true,
      },
    });
  }

  static async updateCity(id: string, data: any) {
    const existing = await prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('City not found');
    return prisma.city.update({
      where: { id },
      data,
    });
  }
}
