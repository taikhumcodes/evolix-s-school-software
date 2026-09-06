import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { FinanceService } from '../finance/finance.service.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { ScopeContext } from './operations.types.js';

export class EventsService {
  // ==========================================
  // 1. Categories
  // ==========================================
  public static async listCategories(ctx: ScopeContext) {
    const { tenantId, schoolId } = ctx;
    return prisma.activityCategory.findMany({
      where: { tenantId, schoolId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { events: true } },
      },
    });
  }

  public static async createCategory(
    ctx: ScopeContext,
    data: { name: string; code: string; description?: string | null; isActive?: boolean }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;
    const code = data.code.trim().toUpperCase();

    const existing = await prisma.activityCategory.findFirst({
      where: { schoolId, code },
    });
    if (existing) {
      const err: any = new Error(`Activity category code '${code}' already exists in this school`);
      err.statusCode = 409;
      err.code = 'DUPLICATE_CODE';
      throw err;
    }

    const category = await prisma.activityCategory.create({
      data: {
        tenantId,
        schoolId,
        name: data.name.trim(),
        code,
        description: data.description?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'CREATE',
      entityType: 'ActivityCategory',
      entityId: category.id,
      afterData: category,
      ipAddress,
    });

    return category;
  }

  // ==========================================
  // 2. Events CRUD
  // ==========================================
  public static async listEvents(
    ctx: ScopeContext,
    query: {
      categoryId?: string;
      status?: string;
      search?: string;
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
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status) where.status = query.status;
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { eventCode: { contains: q, mode: 'insensitive' } },
        { venue: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (query.fromDate || query.toDate) {
      where.startDateTime = {};
      if (query.fromDate) where.startDateTime.gte = new Date(query.fromDate);
      if (query.toDate) where.startDateTime.lte = new Date(query.toDate);
    }

    const [total, events] = await Promise.all([
      prisma.schoolEvent.count({ where }),
      prisma.schoolEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDateTime: 'asc' },
        include: {
          category: { select: { id: true, name: true, code: true } },
          academicYear: { select: { id: true, name: true } },
          _count: { select: { participants: true, coordinators: true, achievements: true, expenseLinks: true } },
        },
      }),
    ]);

    return {
      items: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getEventById(ctx: ScopeContext, id: string) {
    const { tenantId, schoolId } = ctx;
    const event = await prisma.schoolEvent.findFirst({
      where: { id, tenantId, schoolId },
      include: {
        category: true,
        academicYear: true,
        coordinators: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                department: { select: { name: true } },
                designation: { select: { name: true } },
              },
            },
          },
        },
        participants: {
          take: 100,
          orderBy: { registeredAt: 'asc' },
          include: {
            student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
            classSection: {
              select: {
                id: true,
                section: { select: { name: true } },
                class: { select: { name: true } },
              },
            },
            achievements: true,
          },
        },
        achievements: {
          include: {
            participant: {
              include: {
                student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
              },
            },
          },
        },
        expenseLinks: {
          include: {
            expenseBill: {
              select: {
                id: true,
                billNumber: true,
                vendor: { select: { name: true } },
                billDate: true,
                totalAmount: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      const err: any = new Error('School event not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return event;
  }

  public static async createEvent(
    ctx: ScopeContext,
    data: {
      categoryId: string;
      academicYearId?: string | null;
      eventCode?: string;
      title: string;
      description?: string | null;
      startDateTime: string;
      endDateTime: string;
      venue: string;
      capacity?: number | null;
      estimatedBudget?: number | null;
      status?: 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const start = new Date(data.startDateTime);
    const end = new Date(data.endDateTime);
    if (end < start) {
      const err: any = new Error('Event end date/time cannot be before start date/time');
      err.statusCode = 400;
      err.code = 'INVALID_DATES';
      throw err;
    }

    const category = await prisma.activityCategory.findFirst({
      where: { id: data.categoryId, tenantId, schoolId, isActive: true },
    });
    if (!category) {
      const err: any = new Error('Activity category not found or inactive in this school');
      err.statusCode = 400;
      err.code = 'INVALID_CATEGORY';
      throw err;
    }

    return prisma.$transaction(async (tx) => {
      let eventCode = data.eventCode?.trim().toUpperCase();
      if (!eventCode) {
        eventCode = await FinanceService.getNextNumber(
          tenantId,
          schoolId,
          'EVENT_CODE',
          'EVT-{YYYY}-',
          5,
          tx
        );
      } else {
        const dup = await tx.schoolEvent.findFirst({
          where: { schoolId, eventCode },
        });
        if (dup) {
          const err: any = new Error(`Event code '${eventCode}' already exists in this school`);
          err.statusCode = 409;
          err.code = 'DUPLICATE_EVENT_CODE';
          throw err;
        }
      }

      const event = await tx.schoolEvent.create({
        data: {
          tenantId,
          schoolId,
          categoryId: data.categoryId,
          academicYearId: data.academicYearId || null,
          eventCode,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          startDateTime: start,
          endDateTime: end,
          venue: data.venue.trim(),
          capacity: data.capacity !== undefined ? data.capacity : null,
          estimatedBudget: data.estimatedBudget !== undefined && data.estimatedBudget !== null
            ? new Prisma.Decimal(data.estimatedBudget)
            : null,
          status: data.status || 'DRAFT',
          createdByUserId: userId,
        },
        include: {
          category: true,
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'CREATE',
        entityType: 'SchoolEvent',
        entityId: event.id,
        afterData: event,
        ipAddress,
      });

      return event;
    });
  }

  public static async updateEvent(
    ctx: ScopeContext,
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      startDateTime: string;
      endDateTime: string;
      venue: string;
      capacity: number | null;
      estimatedBudget: number | null;
      status: string;
    }>
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;
    const existing = await prisma.schoolEvent.findFirst({
      where: { id, tenantId, schoolId },
    });

    if (!existing) {
      const err: any = new Error('School event not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await prisma.schoolEvent.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.startDateTime && { startDateTime: new Date(data.startDateTime) }),
        ...(data.endDateTime && { endDateTime: new Date(data.endDateTime) }),
        ...(data.venue && { venue: data.venue.trim() }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.estimatedBudget !== undefined && {
          estimatedBudget: data.estimatedBudget !== null ? new Prisma.Decimal(data.estimatedBudget) : null,
        }),
        ...(data.status && { status: data.status }),
      },
      include: { category: true },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'UPDATE',
      entityType: 'SchoolEvent',
      entityId: updated.id,
      beforeData: existing,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  // ==========================================
  // 3. Coordinators
  // ==========================================
  public static async assignCoordinator(
    ctx: ScopeContext,
    eventId: string,
    data: { employeeId: string; role?: string | null }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const event = await prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, schoolId },
    });
    if (!event) {
      const err: any = new Error('Event not found in this school');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, tenantId, schoolId },
    });
    if (!employee) {
      const err: any = new Error('Employee not found in this school');
      err.statusCode = 400;
      err.code = 'INVALID_EMPLOYEE';
      throw err;
    }

    const coordinator = await prisma.eventCoordinator.upsert({
      where: {
        eventId_employeeId: {
          eventId,
          employeeId: data.employeeId,
        },
      },
      update: {
        role: data.role?.trim() || null,
      },
      create: {
        tenantId,
        schoolId,
        eventId,
        employeeId: data.employeeId,
        role: data.role?.trim() || null,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'CREATE',
      entityType: 'EventCoordinator',
      entityId: coordinator.id,
      afterData: coordinator,
      ipAddress,
    });

    return coordinator;
  }

  public static async removeCoordinator(ctx: ScopeContext, eventId: string, employeeId: string) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const coordinator = await prisma.eventCoordinator.findFirst({
      where: { eventId, employeeId, tenantId, schoolId },
    });
    if (!coordinator) {
      const err: any = new Error('Event coordinator not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    await prisma.eventCoordinator.delete({
      where: { id: coordinator.id },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'DELETE',
      entityType: 'EventCoordinator',
      entityId: coordinator.id,
      beforeData: coordinator,
      ipAddress,
    });

    return { success: true };
  }

  // ==========================================
  // 4. Participants & Concurrency Protection
  // ==========================================
  public static async registerParticipant(
    ctx: ScopeContext,
    eventId: string,
    data: {
      studentId: string;
      classSectionId?: string | null;
      teamName?: string | null;
      houseName?: string | null;
      participantType?: 'INDIVIDUAL' | 'TEAM' | 'HOUSE';
      notes?: string | null;
    }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return prisma.$transaction(async (tx) => {
      const eventRows: any[] = await tx.$queryRawUnsafe(
        `SELECT id, capacity, status, title FROM school_events WHERE id = $1::uuid AND tenant_id = $2::uuid AND school_id = $3::uuid FOR UPDATE`,
        eventId,
        tenantId,
        schoolId
      );

      if (!eventRows.length) {
        const err: any = new Error('School event not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      const event = eventRows[0];
      if (['CANCELLED', 'ARCHIVED', 'COMPLETED'].includes(event.status)) {
        const err: any = new Error(`Cannot register participants for event in status ${event.status}`);
        err.statusCode = 400;
        err.code = 'INVALID_EVENT_STATUS';
        throw err;
      }

      const student = await tx.student.findFirst({
        where: { id: data.studentId, tenantId, schoolId },
      });
      if (!student) {
        const err: any = new Error('Student not found in this school');
        err.statusCode = 400;
        err.code = 'INVALID_STUDENT';
        throw err;
      }

      const existing = await tx.eventParticipant.findFirst({
        where: { eventId, studentId: data.studentId },
      });

      if (existing) {
        if (['WITHDRAWN', 'DISQUALIFIED'].includes(existing.status)) {
          const reactivated = await tx.eventParticipant.update({
            where: { id: existing.id },
            data: {
              status: 'REGISTERED',
              teamName: data.teamName || existing.teamName,
              houseName: data.houseName || existing.houseName,
              notes: data.notes || existing.notes,
            },
            include: {
              student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
            },
          });
          return reactivated;
        }

        const err: any = new Error('Student is already registered for this event');
        err.statusCode = 409;
        err.code = 'ALREADY_REGISTERED';
        throw err;
      }

      if (event.capacity !== null && event.capacity !== undefined) {
        const activeCount = await tx.eventParticipant.count({
          where: {
            eventId,
            status: { notIn: ['WITHDRAWN', 'DISQUALIFIED'] },
          },
        });

        if (activeCount >= event.capacity) {
          const err: any = new Error(
            `Event capacity of ${event.capacity} participants has been reached`
          );
          err.statusCode = 400;
          err.code = 'EVENT_CAPACITY_EXCEEDED';
          throw err;
        }
      }

      const participant = await tx.eventParticipant.create({
        data: {
          tenantId,
          schoolId,
          eventId,
          studentId: data.studentId,
          classSectionId: data.classSectionId || null,
          teamName: data.teamName?.trim() || null,
          houseName: data.houseName?.trim() || null,
          participantType: data.participantType || 'INDIVIDUAL',
          status: 'REGISTERED',
          notes: data.notes?.trim() || null,
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'CREATE',
        entityType: 'EventParticipant',
        entityId: participant.id,
        afterData: participant,
        ipAddress,
      });

      return participant;
    });
  }

  public static async bulkRegisterSection(
    ctx: ScopeContext,
    eventId: string,
    data: {
      classSectionId: string;
      teamName?: string | null;
      houseName?: string | null;
      participantType?: 'INDIVIDUAL' | 'TEAM' | 'HOUSE';
    }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return prisma.$transaction(async (tx) => {
      const eventRows: any[] = await tx.$queryRawUnsafe(
        `SELECT id, capacity, status, title FROM school_events WHERE id = $1::uuid AND tenant_id = $2::uuid AND school_id = $3::uuid FOR UPDATE`,
        eventId,
        tenantId,
        schoolId
      );

      if (!eventRows.length) {
        const err: any = new Error('School event not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }
      const event = eventRows[0];

      const section = await tx.classSection.findFirst({
        where: { id: data.classSectionId, tenantId, schoolId },
      });
      if (!section) {
        const err: any = new Error('Class section not found in this school');
        err.statusCode = 400;
        err.code = 'INVALID_SECTION';
        throw err;
      }

      const enrollments = await tx.studentEnrollment.findMany({
        where: {
          sectionId: data.classSectionId,
          status: 'ACTIVE',
          tenantId,
          schoolId,
        },
        include: {
          student: true,
        },
      });

      const existingParticipants = await tx.eventParticipant.findMany({
        where: { eventId },
        select: { studentId: true, status: true },
      });
      const registeredStudentIds = new Set(
        existingParticipants
          .filter((p) => !['WITHDRAWN', 'DISQUALIFIED'].includes(p.status))
          .map((p) => p.studentId)
      );

      const eligible = enrollments.filter((e) => !registeredStudentIds.has(e.studentId));

      let availableSlots = Infinity;
      if (event.capacity !== null && event.capacity !== undefined) {
        const currentActive = registeredStudentIds.size;
        availableSlots = Math.max(0, event.capacity - currentActive);
        if (availableSlots <= 0) {
          const err: any = new Error(`Event capacity of ${event.capacity} is already full`);
          err.statusCode = 400;
          err.code = 'EVENT_CAPACITY_EXCEEDED';
          throw err;
        }
      }

      let createdCount = 0;
      let skippedCount = enrollments.length - eligible.length;
      let failedCapacityCount = 0;
      const createdItems: any[] = [];

      for (const enr of eligible) {
        if (createdCount >= availableSlots) {
          failedCapacityCount++;
          continue;
        }

        const participant = await tx.eventParticipant.create({
          data: {
            tenantId,
            schoolId,
            eventId,
            studentId: enr.studentId,
            classSectionId: data.classSectionId,
            teamName: data.teamName?.trim() || null,
            houseName: data.houseName?.trim() || null,
            participantType: data.participantType || 'INDIVIDUAL',
            status: 'REGISTERED',
          },
        });
        createdItems.push(participant);
        createdCount++;
      }

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'CREATE',
        entityType: 'EventParticipantBulk',
        entityId: eventId,
        afterData: { createdCount, skippedCount, failedCapacityCount },
        ipAddress,
      });

      return {
        created: createdCount,
        skipped: skippedCount,
        failedCapacity: failedCapacityCount,
        participants: createdItems,
      };
    });
  }

  public static async updateParticipantStatus(
    ctx: ScopeContext,
    eventId: string,
    participantId: string,
    data: {
      status: 'REGISTERED' | 'CONFIRMED' | 'ATTENDED' | 'ABSENT' | 'WITHDRAWN' | 'DISQUALIFIED' | 'COMPLETED';
      notes?: string | null;
    }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const participant = await prisma.eventParticipant.findFirst({
      where: { id: participantId, eventId, tenantId, schoolId },
    });
    if (!participant) {
      const err: any = new Error('Event participant not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await prisma.eventParticipant.update({
      where: { id: participantId },
      data: {
        status: data.status,
        attendedAt: data.status === 'ATTENDED' ? new Date() : participant.attendedAt,
        notes: data.notes !== undefined ? data.notes?.trim() || null : participant.notes,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'UPDATE',
      entityType: 'EventParticipant',
      entityId: updated.id,
      beforeData: participant,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  // ==========================================
  // 5. Achievements
  // ==========================================
  public static async recordAchievement(
    ctx: ScopeContext,
    eventId: string,
    data: {
      participantId: string;
      position: string;
      result?: string | null;
      remarks?: string | null;
    }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const participant = await prisma.eventParticipant.findFirst({
      where: { id: data.participantId, eventId, tenantId, schoolId },
    });
    if (!participant) {
      const err: any = new Error('Participant not found for this event');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const achievement = await prisma.eventAchievement.create({
      data: {
        tenantId,
        schoolId,
        eventId,
        participantId: data.participantId,
        position: data.position.trim(),
        result: data.result?.trim() || null,
        remarks: data.remarks?.trim() || null,
      },
      include: {
        participant: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          },
        },
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'CREATE',
      entityType: 'EventAchievement',
      entityId: achievement.id,
      afterData: achievement,
      ipAddress,
    });

    return achievement;
  }

  // ==========================================
  // 6. Expense Links (Finance Reference Only)
  // ==========================================
  public static async linkExpenseBill(
    ctx: ScopeContext,
    eventId: string,
    data: { expenseBillId: string; notes?: string | null }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const event = await prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, schoolId },
    });
    if (!event) {
      const err: any = new Error('Event not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const bill = await prisma.expenseBill.findFirst({
      where: { id: data.expenseBillId, tenantId, schoolId },
    });
    if (!bill) {
      const err: any = new Error('Expense bill not found in this school');
      err.statusCode = 404;
      err.code = 'EXPENSE_BILL_NOT_FOUND';
      throw err;
    }

    const link = await prisma.eventExpenseLink.upsert({
      where: {
        eventId_expenseBillId: {
          eventId,
          expenseBillId: data.expenseBillId,
        },
      },
      update: {
        notes: data.notes?.trim() || null,
      },
      create: {
        tenantId,
        schoolId,
        eventId,
        expenseBillId: data.expenseBillId,
        notes: data.notes?.trim() || null,
      },
      include: {
        expenseBill: {
          select: {
            id: true,
            billNumber: true,
            vendor: { select: { name: true } },
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'CREATE',
      entityType: 'EventExpenseLink',
      entityId: link.id,
      afterData: link,
      ipAddress,
    });

    return link;
  }

  public static async unlinkExpenseBill(ctx: ScopeContext, eventId: string, expenseBillId: string) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const link = await prisma.eventExpenseLink.findFirst({
      where: { eventId, expenseBillId, tenantId, schoolId },
    });
    if (!link) {
      const err: any = new Error('Expense link not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    await prisma.eventExpenseLink.delete({
      where: { id: link.id },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'DELETE',
      entityType: 'EventExpenseLink',
      entityId: link.id,
      beforeData: link,
      ipAddress,
    });

    return { success: true };
  }
}
