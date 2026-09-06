import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  ValidationError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { AttendanceService } from '../attendance/attendance.service.js';

export interface ScopeContext {
  tenantId: string;
  schoolId: string;
  userId: string;
  ipAddress?: string;
  permissions?: string[];
  isSuperadmin?: boolean;
}

export class AcademicsService {
  // =========================================================================
  // 1. ACADEMIC TERMS
  // =========================================================================

  static async getAcademicTerms(ctx: ScopeContext, academicYearId?: string) {
    const terms = await prisma.academicTerm.findMany({
      where: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        academicYear: { select: { id: true, name: true, startDate: true, endDate: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { startDate: 'asc' }],
    });
    return terms.map((t) => ({
      ...t,
      isActive: t.status === 'ACTIVE',
    }));
  }

  static async createAcademicTerm(
    ctx: ScopeContext,
    data: {
      name: string;
      code: string;
      academicYearId: string;
      startDate: string;
      endDate: string;
      displayOrder?: number;
      status?: string;
      isActive?: boolean;
    }
  ) {
    const year = await prisma.academicYear.findFirst({
      where: { id: data.academicYearId, schoolId: ctx.schoolId, isDeleted: false },
    });
    if (!year) {
      throw new NotFoundError('Academic year not found for this school', { code: 'YEAR_NOT_FOUND' });
    }

    const termStart = new Date(`${data.startDate}T00:00:00.000Z`);
    const termEnd = new Date(`${data.endDate}T00:00:00.000Z`);

    if (termStart >= termEnd) {
      throw new BadRequestError('Term start date must be before end date', { code: 'TERM_DATE_INVALID' });
    }

    const yearStart = new Date(year.startDate);
    const yearEnd = new Date(year.endDate);

    if (termStart < yearStart || termEnd > yearEnd) {
      throw new BadRequestError(
        'Term dates must fall within the academic year dates (' +
          year.startDate.toISOString().split('T')[0] +
          ' to ' +
          year.endDate.toISOString().split('T')[0] +
          ')',
        { code: 'TERM_DATE_INVALID' }
      );
    }

    const existingCode = await prisma.academicTerm.findFirst({
      where: {
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        code: data.code.trim().toUpperCase(),
      },
    });
    if (existingCode) {
      throw new ConflictError('A term with this code already exists for this academic year', {
        code: 'TERM_CODE_EXISTS',
      });
    }

    const status =
      data.status ?? (data.isActive !== undefined ? (data.isActive ? 'ACTIVE' : 'INACTIVE') : 'ACTIVE');

    const term = await prisma.academicTerm.create({
      data: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        startDate: termStart,
        endDate: termEnd,
        displayOrder: data.displayOrder ?? 0,
        status,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'ACADEMIC_TERM_CREATED',
      entityType: 'AcademicTerm',
      entityId: term.id,
      afterData: { name: term.name, code: term.code, startDate: data.startDate, endDate: data.endDate, status },
      ipAddress: ctx.ipAddress,
    });

    return {
      ...term,
      isActive: term.status === 'ACTIVE',
    };
  }

  static async updateAcademicTerm(
    ctx: ScopeContext,
    termId: string,
    data: {
      name?: string;
      code?: string;
      startDate?: string;
      endDate?: string;
      displayOrder?: number;
      status?: string;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.academicTerm.findFirst({
      where: { id: termId, schoolId: ctx.schoolId },
      include: { academicYear: true },
    });
    if (!existing) {
      throw new NotFoundError('Academic term not found', { code: 'NOT_FOUND' });
    }

    const newStart = data.startDate ? new Date(`${data.startDate}T00:00:00.000Z`) : existing.startDate;
    const newEnd = data.endDate ? new Date(`${data.endDate}T00:00:00.000Z`) : existing.endDate;

    if (newStart >= newEnd) {
      throw new BadRequestError('Term start date must be before end date', { code: 'TERM_DATE_INVALID' });
    }

    const yearStart = new Date(existing.academicYear.startDate);
    const yearEnd = new Date(existing.academicYear.endDate);

    if (newStart < yearStart || newEnd > yearEnd) {
      throw new BadRequestError('Term dates must fall within academic year dates', {
        code: 'TERM_DATE_INVALID',
      });
    }

    if (data.code && data.code.trim().toUpperCase() !== existing.code) {
      const codeConflict = await prisma.academicTerm.findFirst({
        where: {
          schoolId: ctx.schoolId,
          academicYearId: existing.academicYearId,
          code: data.code.trim().toUpperCase(),
          id: { not: termId },
        },
      });
      if (codeConflict) {
        throw new ConflictError('A term with this code already exists', { code: 'TERM_CODE_EXISTS' });
      }
    }

    const newStatus =
      data.status ??
      (data.isActive !== undefined ? (data.isActive ? 'ACTIVE' : 'INACTIVE') : existing.status);

    const updated = await prisma.academicTerm.update({
      where: { id: termId },
      data: {
        name: data.name?.trim(),
        code: data.code?.trim().toUpperCase(),
        startDate: newStart,
        endDate: newEnd,
        displayOrder: data.displayOrder,
        status: newStatus,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'ACADEMIC_TERM_UPDATED',
      entityType: 'AcademicTerm',
      entityId: termId,
      beforeData: { name: existing.name, code: existing.code, status: existing.status },
      afterData: { name: updated.name, code: updated.code, status: updated.status },
      ipAddress: ctx.ipAddress,
    });

    return {
      ...updated,
      isActive: updated.status === 'ACTIVE',
    };
  }

  static async deleteAcademicTerm(ctx: ScopeContext, termId: string) {
    const existing = await prisma.academicTerm.findFirst({
      where: { id: termId, schoolId: ctx.schoolId },
    });
    if (!existing) {
      throw new NotFoundError('Academic term not found', { code: 'NOT_FOUND' });
    }

    // Referential integrity protection: check if term is referenced by exams or timetables
    const [examCount, timetableCount] = await Promise.all([
      prisma.exam.count({ where: { termId, schoolId: ctx.schoolId } }),
      prisma.timetableSlot.count({ where: { termId, schoolId: ctx.schoolId } }),
    ]);

    if (examCount > 0 || timetableCount > 0) {
      throw new BadRequestError(
        'Cannot delete academic term because it is referenced by existing exams or timetable records. Please deactivate or archive the term instead to preserve historical records.',
        {
          code: 'TERM_HAS_REFERENCES',
          examCount,
          timetableCount,
        }
      );
    }

    await prisma.academicTerm.delete({
      where: { id: termId },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'ACADEMIC_TERM_DELETED',
      entityType: 'AcademicTerm',
      entityId: termId,
      beforeData: { name: existing.name, code: existing.code, status: existing.status },
      ipAddress: ctx.ipAddress,
    });

    return { success: true, message: 'Academic term deleted successfully' };
  }

  // =========================================================================
  // 2. TEACHER ACADEMIC ASSIGNMENTS
  // =========================================================================

  static async getClassTeacherAssignments(ctx: ScopeContext, academicYearId?: string, classId?: string) {
    return prisma.classTeacherAssignment.findMany({
      where: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        ...(academicYearId ? { academicYearId } : {}),
        ...(classId ? { classId } : {}),
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
        teacherUser: { select: { id: true, email: true, firstName: true, lastName: true } },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: [{ class: { displayOrder: 'asc' } }, { section: { displayOrder: 'asc' } }],
    });
  }

  static async assignClassTeacher(
    ctx: ScopeContext,
    data: {
      academicYearId: string;
      classId: string;
      sectionId: string;
      teacherUserId: string;
      isPrimary?: boolean;
    }
  ) {
    // 1. Verify user belongs to school
    const userSchool = await prisma.userSchool.findUnique({
      where: {
        userId_schoolId: { userId: data.teacherUserId, schoolId: ctx.schoolId },
      },
      include: { user: true },
    });
    if (!userSchool || !userSchool.user.isActive) {
      throw new BadRequestError('Teacher user is not active or authorized for this school', {
        code: 'TEACHER_NOT_IN_SCHOOL',
      });
    }

    // 2. Verify section is mapped to class
    const classSection = await prisma.classSection.findUnique({
      where: {
        classId_sectionId: { classId: data.classId, sectionId: data.sectionId },
      },
    });
    if (!classSection || classSection.schoolId !== ctx.schoolId || !classSection.isActive) {
      throw new BadRequestError('Section is not mapped or active for this class', {
        code: 'SECTION_NOT_MAPPED',
      });
    }

    // 3. Upsert assignment
    const assignment = await prisma.classTeacherAssignment.upsert({
      where: {
        schoolId_academicYearId_classId_sectionId_teacherUserId: {
          schoolId: ctx.schoolId,
          academicYearId: data.academicYearId,
          classId: data.classId,
          sectionId: data.sectionId,
          teacherUserId: data.teacherUserId,
        },
      },
      update: {
        isPrimary: data.isPrimary ?? true,
      },
      create: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        sectionId: data.sectionId,
        teacherUserId: data.teacherUserId,
        isPrimary: data.isPrimary ?? true,
      },
      include: {
        class: true,
        section: true,
        teacherUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'CLASS_TEACHER_ASSIGNED',
      entityType: 'ClassTeacherAssignment',
      entityId: assignment.id,
      afterData: {
        teacherUserId: data.teacherUserId,
        classId: data.classId,
        sectionId: data.sectionId,
        isPrimary: assignment.isPrimary,
      },
      ipAddress: ctx.ipAddress,
    });

    return assignment;
  }

  static async removeClassTeacher(ctx: ScopeContext, assignmentId: string) {
    const existing = await prisma.classTeacherAssignment.findFirst({
      where: { id: assignmentId, schoolId: ctx.schoolId },
    });
    if (!existing) {
      throw new NotFoundError('Class teacher assignment not found', { code: 'NOT_FOUND' });
    }

    await prisma.classTeacherAssignment.delete({ where: { id: assignmentId } });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'CLASS_TEACHER_REMOVED',
      entityType: 'ClassTeacherAssignment',
      entityId: assignmentId,
      beforeData: existing,
      ipAddress: ctx.ipAddress,
    });

    return { success: true };
  }

  static async getSubjectTeacherAssignments(
    ctx: ScopeContext,
    academicYearId?: string,
    classId?: string,
    sectionId?: string
  ) {
    return prisma.subjectTeacherAssignment.findMany({
      where: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        ...(academicYearId ? { academicYearId } : {}),
        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true, type: true } },
        teacherUser: { select: { id: true, email: true, firstName: true, lastName: true } },
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: [{ class: { displayOrder: 'asc' } }, { subject: { name: 'asc' } }],
    });
  }

  static async assignSubjectTeacher(
    ctx: ScopeContext,
    data: {
      academicYearId: string;
      classId: string;
      sectionId: string;
      subjectId: string;
      teacherUserId: string;
      isPrimary?: boolean;
    }
  ) {
    // 1. Verify user authorized for school
    const userSchool = await prisma.userSchool.findUnique({
      where: {
        userId_schoolId: { userId: data.teacherUserId, schoolId: ctx.schoolId },
      },
      include: { user: true },
    });
    if (!userSchool || !userSchool.user.isActive) {
      throw new BadRequestError('Teacher user is not active or authorized for this school', {
        code: 'TEACHER_NOT_IN_SCHOOL',
      });
    }

    // 2. Verify section mapped to class
    const classSection = await prisma.classSection.findUnique({
      where: { classId_sectionId: { classId: data.classId, sectionId: data.sectionId } },
    });
    if (!classSection || classSection.schoolId !== ctx.schoolId || !classSection.isActive) {
      throw new BadRequestError('Section is not mapped or active for this class', {
        code: 'SECTION_NOT_MAPPED',
      });
    }

    // 3. Verify subject mapped to class
    const classSubject = await prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId: data.classId, subjectId: data.subjectId } },
    });
    if (!classSubject || classSubject.schoolId !== ctx.schoolId || !classSubject.isActive) {
      throw new BadRequestError('Subject is not mapped or active for this class', {
        code: 'SUBJECT_NOT_MAPPED',
      });
    }

    const assignment = await prisma.subjectTeacherAssignment.upsert({
      where: {
        schoolId_academicYearId_classId_sectionId_subjectId_teacherUserId: {
          schoolId: ctx.schoolId,
          academicYearId: data.academicYearId,
          classId: data.classId,
          sectionId: data.sectionId,
          subjectId: data.subjectId,
          teacherUserId: data.teacherUserId,
        },
      },
      update: {
        isPrimary: data.isPrimary ?? true,
      },
      create: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        teacherUserId: data.teacherUserId,
        isPrimary: data.isPrimary ?? true,
      },
      include: {
        class: true,
        section: true,
        subject: true,
        teacherUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'SUBJECT_TEACHER_ASSIGNED',
      entityType: 'SubjectTeacherAssignment',
      entityId: assignment.id,
      afterData: {
        teacherUserId: data.teacherUserId,
        classId: data.classId,
        sectionId: data.sectionId,
        subjectId: data.subjectId,
      },
      ipAddress: ctx.ipAddress,
    });

    return assignment;
  }

  static async removeSubjectTeacher(ctx: ScopeContext, assignmentId: string) {
    const existing = await prisma.subjectTeacherAssignment.findFirst({
      where: { id: assignmentId, schoolId: ctx.schoolId },
    });
    if (!existing) {
      throw new NotFoundError('Subject teacher assignment not found', { code: 'NOT_FOUND' });
    }

    await prisma.subjectTeacherAssignment.delete({ where: { id: assignmentId } });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'SUBJECT_TEACHER_REMOVED',
      entityType: 'SubjectTeacherAssignment',
      entityId: assignmentId,
      beforeData: existing,
      ipAddress: ctx.ipAddress,
    });

    return { success: true };
  }

  /**
   * Scoped access check: returns lists of assigned classes and subjects for a teacher
   */
  static async getTeacherAssignments(ctx: ScopeContext, teacherUserId: string, academicYearId?: string) {
    const [classAssignments, subjectAssignments] = await Promise.all([
      prisma.classTeacherAssignment.findMany({
        where: {
          schoolId: ctx.schoolId,
          teacherUserId,
          ...(academicYearId ? { academicYearId } : {}),
        },
        include: { class: true, section: true },
      }),
      prisma.subjectTeacherAssignment.findMany({
        where: {
          schoolId: ctx.schoolId,
          teacherUserId,
          ...(academicYearId ? { academicYearId } : {}),
        },
        include: { class: true, section: true, subject: true },
      }),
    ]);

    return {
      classAssignments,
      subjectAssignments,
      assignedClassIds: Array.from(
        new Set([...classAssignments.map((c) => c.classId), ...subjectAssignments.map((s) => s.classId)])
      ),
      assignedSubjectIds: Array.from(new Set(subjectAssignments.map((s) => s.subjectId))),
    };
  }

  // =========================================================================
  // 3. PERIODS & BELL STRUCTURE
  // =========================================================================

  static async getSchoolPeriods(ctx: ScopeContext, dayOfWeek?: number) {
    return prisma.schoolPeriod.findMany({
      where: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        isActive: true,
        ...(dayOfWeek !== undefined ? { OR: [{ dayOfWeek: null }, { dayOfWeek }] } : {}),
      },
      orderBy: [{ displayOrder: 'asc' }, { startTime: 'asc' }],
    });
  }

  static async createSchoolPeriod(
    ctx: ScopeContext,
    data: {
      name: string;
      periodNumber?: number | null;
      startTime: string;
      endTime: string;
      displayOrder?: number;
      type?: string;
      dayOfWeek?: number | null;
      isActive?: boolean;
    }
  ) {
    if (data.startTime >= data.endTime) {
      throw new BadRequestError('Period start time must be earlier than end time', {
        code: 'PERIOD_TIME_INVALID',
      });
    }

    const period = await prisma.schoolPeriod.create({
      data: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        name: data.name.trim(),
        periodNumber: data.periodNumber,
        startTime: data.startTime,
        endTime: data.endTime,
        displayOrder: data.displayOrder ?? 0,
        type: data.type ?? 'TEACHING',
        dayOfWeek: data.dayOfWeek ?? null,
        isActive: data.isActive ?? true,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'PERIOD_CREATED',
      entityType: 'SchoolPeriod',
      entityId: period.id,
      afterData: period,
      ipAddress: ctx.ipAddress,
    });

    return period;
  }

  static async updateSchoolPeriod(
    ctx: ScopeContext,
    periodId: string,
    data: Partial<{
      name: string;
      periodNumber: number | null;
      startTime: string;
      endTime: string;
      displayOrder: number;
      type: string;
      dayOfWeek: number | null;
      isActive: boolean;
    }>
  ) {
    const existing = await prisma.schoolPeriod.findFirst({
      where: { id: periodId, schoolId: ctx.schoolId },
    });
    if (!existing) {
      throw new NotFoundError('School period not found', { code: 'NOT_FOUND' });
    }

    const startTime = data.startTime ?? existing.startTime;
    const endTime = data.endTime ?? existing.endTime;
    if (startTime >= endTime) {
      throw new BadRequestError('Period start time must be earlier than end time', {
        code: 'PERIOD_TIME_INVALID',
      });
    }

    const updated = await prisma.schoolPeriod.update({
      where: { id: periodId },
      data: {
        name: data.name?.trim(),
        periodNumber: data.periodNumber !== undefined ? data.periodNumber : existing.periodNumber,
        startTime,
        endTime,
        displayOrder: data.displayOrder ?? existing.displayOrder,
        type: data.type ?? existing.type,
        dayOfWeek: data.dayOfWeek !== undefined ? data.dayOfWeek : existing.dayOfWeek,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      },
    });

    return updated;
  }

  static async deleteSchoolPeriod(ctx: ScopeContext, periodId: string) {
    const existing = await prisma.schoolPeriod.findFirst({
      where: { id: periodId, schoolId: ctx.schoolId },
    });
    if (!existing) {
      throw new NotFoundError('School period not found', { code: 'NOT_FOUND' });
    }

    await prisma.schoolPeriod.update({
      where: { id: periodId },
      data: { isActive: false },
    });

    return { success: true };
  }

  // =========================================================================
  // 4. TIMETABLE ENGINE & CONFLICT DETECTION
  // =========================================================================

  static async getClassTimetable(
    ctx: ScopeContext,
    params: {
      academicYearId: string;
      classId: string;
      sectionId: string;
      termId?: string;
    }
  ) {
    return prisma.timetableSlot.findMany({
      where: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        academicYearId: params.academicYearId,
        classId: params.classId,
        sectionId: params.sectionId,
        ...(params.termId ? { termId: params.termId } : {}),
      },
      include: {
        period: true,
        subject: { select: { id: true, name: true, code: true, type: true } },
        teacherUser: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: { displayOrder: 'asc' } }],
    });
  }

  static async getTeacherTimetable(ctx: ScopeContext, teacherUserId: string, academicYearId: string) {
    return prisma.timetableSlot.findMany({
      where: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        academicYearId,
        teacherUserId,
      },
      include: {
        period: true,
        subject: { select: { id: true, name: true, code: true, type: true } },
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: { displayOrder: 'asc' } }],
    });
  }

  static async saveTimetableSlot(
    ctx: ScopeContext,
    data: {
      academicYearId: string;
      termId?: string | null;
      classId: string;
      sectionId: string;
      dayOfWeek: number;
      periodId: string;
      subjectId: string;
      teacherUserId: string;
      room?: string | null;
    }
  ) {
    // 1. Verify working day setting from Module 05
    const config = await prisma.schoolConfiguration.findUnique({
      where: { schoolId: ctx.schoolId },
    });
    const workingWeek = config?.workingWeek ?? 'MON_SAT';
    const day = data.dayOfWeek; // 1=Mon..7=Sun
    if (workingWeek === 'MON_FRI' && day > 5) {
      throw new BadRequestError('Timetable cannot schedule periods on non-working weekdays (Saturday/Sunday)', {
        code: 'NON_WORKING_DAY',
      });
    }
    if (workingWeek === 'MON_SAT' && day > 6) {
      throw new BadRequestError('Timetable cannot schedule periods on Sunday for MON_SAT schedule', {
        code: 'NON_WORKING_DAY',
      });
    }

    // 2. Conflict Check 1: Teacher Conflict
    const teacherConflict = await prisma.timetableSlot.findFirst({
      where: {
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        dayOfWeek: data.dayOfWeek,
        periodId: data.periodId,
        teacherUserId: data.teacherUserId,
        NOT: {
          classId: data.classId,
          sectionId: data.sectionId,
        },
      },
      include: { class: true, section: true, period: true },
    });
    if (teacherConflict) {
      throw new ConflictError(
        `Teacher is already scheduled on day ${data.dayOfWeek}, period ${teacherConflict.period.name} for ${teacherConflict.class.name} - ${teacherConflict.section.name}`,
        { code: 'TEACHER_TIMETABLE_CONFLICT' }
      );
    }

    // 3. Conflict Check 2: Class Conflict
    const classConflict = await prisma.timetableSlot.findFirst({
      where: {
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        dayOfWeek: data.dayOfWeek,
        periodId: data.periodId,
        classId: data.classId,
        sectionId: data.sectionId,
      },
      include: { subject: true, period: true },
    });

    // 4. Conflict Check 3: Room Conflict (if room specified)
    if (data.room && data.room.trim()) {
      const roomConflict = await prisma.timetableSlot.findFirst({
        where: {
          schoolId: ctx.schoolId,
          academicYearId: data.academicYearId,
          dayOfWeek: data.dayOfWeek,
          periodId: data.periodId,
          room: data.room.trim(),
          NOT: {
            classId: data.classId,
            sectionId: data.sectionId,
          },
        },
        include: { class: true, section: true },
      });
      if (roomConflict) {
        throw new ConflictError(
          `Room "${data.room}" is already booked on day ${data.dayOfWeek} for ${roomConflict.class.name} - ${roomConflict.section.name}`,
          { code: 'ROOM_TIMETABLE_CONFLICT' }
        );
      }
    }

    // Upsert timetable slot
    const slot = await prisma.timetableSlot.upsert({
      where: {
        schoolId_academicYearId_dayOfWeek_periodId_classId_sectionId: {
          schoolId: ctx.schoolId,
          academicYearId: data.academicYearId,
          dayOfWeek: data.dayOfWeek,
          periodId: data.periodId,
          classId: data.classId,
          sectionId: data.sectionId,
        },
      },
      update: {
        termId: data.termId ?? null,
        subjectId: data.subjectId,
        teacherUserId: data.teacherUserId,
        room: data.room?.trim() || null,
      },
      create: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        termId: data.termId ?? null,
        classId: data.classId,
        sectionId: data.sectionId,
        dayOfWeek: data.dayOfWeek,
        periodId: data.periodId,
        subjectId: data.subjectId,
        teacherUserId: data.teacherUserId,
        room: data.room?.trim() || null,
      },
      include: {
        period: true,
        subject: true,
        teacherUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'TIMETABLE_SLOT_SAVED',
      entityType: 'TimetableSlot',
      entityId: slot.id,
      afterData: slot,
      ipAddress: ctx.ipAddress,
    });

    return slot;
  }

  static async bulkSaveTimetableSlots(
    ctx: ScopeContext,
    payload: {
      academicYearId: string;
      termId?: string;
      classId: string;
      sectionId: string;
      slots: Array<{
        dayOfWeek: number;
        periodId: string;
        subjectId: string;
        teacherUserId: string;
        room?: string | null;
      }>;
    }
  ) {
    const saved: any[] = [];
    for (const s of payload.slots) {
      const res = await this.saveTimetableSlot(ctx, {
        academicYearId: payload.academicYearId,
        termId: payload.termId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        ...s,
      });
      saved.push(res);
    }
    return saved;
  }

  static async deleteTimetableSlot(ctx: ScopeContext, slotId: string) {
    const existing = await prisma.timetableSlot.findFirst({
      where: { id: slotId, schoolId: ctx.schoolId },
    });
    if (!existing) {
      throw new NotFoundError('Timetable slot not found', { code: 'NOT_FOUND' });
    }

    await prisma.timetableSlot.delete({ where: { id: slotId } });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'TIMETABLE_SLOT_DELETED',
      entityType: 'TimetableSlot',
      entityId: slotId,
      beforeData: existing,
      ipAddress: ctx.ipAddress,
    });

    return { success: true };
  }

  // =========================================================================
  // 5. HOMEWORK MANAGEMENT
  // =========================================================================

  static async getHomeworkList(
    ctx: ScopeContext,
    params: {
      academicYearId?: string;
      classId?: string;
      sectionId?: string;
      subjectId?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.HomeworkWhereInput = {
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.sectionId ? { sectionId: params.sectionId } : {}),
      ...(params.subjectId ? { subjectId: params.subjectId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.homework.count({ where }),
      prisma.homework.findMany({
        where,
        skip,
        take: limit,
        include: {
          class: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true, code: true } },
          subject: { select: { id: true, name: true, code: true } },
          assignedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { assignedDate: 'desc' },
      }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async createHomework(
    ctx: ScopeContext,
    data: {
      academicYearId: string;
      classId: string;
      sectionId: string;
      subjectId: string;
      title: string;
      instructions: string;
      assignedDate: string;
      dueDate: string;
      attachmentKey?: string | null;
      attachmentName?: string | null;
      status?: string;
    }
  ) {
    // Check teacher scoping: if user is not superadmin and does not have global 'homework.manage'
    const hasGlobalManage = ctx.permissions?.includes('homework.manage') || ctx.isSuperadmin;
    if (!hasGlobalManage) {
      const isAssigned = await prisma.subjectTeacherAssignment.findFirst({
        where: {
          schoolId: ctx.schoolId,
          academicYearId: data.academicYearId,
          classId: data.classId,
          sectionId: data.sectionId,
          subjectId: data.subjectId,
          teacherUserId: ctx.userId,
        },
      });
      if (!isAssigned) {
        throw new ForbiddenError('You can only create homework for your assigned classes and subjects', {
          code: 'TEACHER_UNAUTHORIZED',
        });
      }
    }

    const assignedDate = new Date(`${data.assignedDate}T00:00:00.000Z`);
    const dueDate = new Date(`${data.dueDate}T00:00:00.000Z`);
    if (assignedDate > dueDate) {
      throw new BadRequestError('Assigned date cannot be after due date', { code: 'HOMEWORK_DATE_INVALID' });
    }

    const hw = await prisma.homework.create({
      data: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        title: data.title.trim(),
        instructions: data.instructions.trim(),
        assignedDate,
        dueDate,
        attachmentKey: data.attachmentKey || null,
        attachmentName: data.attachmentName || null,
        assignedByUserId: ctx.userId,
        status: data.status ?? 'DRAFT',
      },
      include: { class: true, section: true, subject: true },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: hw.status === 'PUBLISHED' ? 'HOMEWORK_PUBLISHED' : 'HOMEWORK_CREATED',
      entityType: 'Homework',
      entityId: hw.id,
      afterData: hw,
      ipAddress: ctx.ipAddress,
    });

    return hw;
  }

  static async updateHomework(
    ctx: ScopeContext,
    homeworkId: string,
    data: Partial<{
      title: string;
      instructions: string;
      assignedDate: string;
      dueDate: string;
      attachmentKey: string | null;
      attachmentName: string | null;
      status: string;
    }>
  ) {
    const existing = await prisma.homework.findFirst({
      where: { id: homeworkId, schoolId: ctx.schoolId },
    });
    if (!existing) {
      throw new NotFoundError('Homework not found', { code: 'NOT_FOUND' });
    }

    const assignedDate = data.assignedDate
      ? new Date(`${data.assignedDate}T00:00:00.000Z`)
      : existing.assignedDate;
    const dueDate = data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : existing.dueDate;
    if (assignedDate > dueDate) {
      throw new BadRequestError('Assigned date cannot be after due date', { code: 'HOMEWORK_DATE_INVALID' });
    }

    const updated = await prisma.homework.update({
      where: { id: homeworkId },
      data: {
        title: data.title?.trim(),
        instructions: data.instructions?.trim(),
        assignedDate,
        dueDate,
        attachmentKey: data.attachmentKey !== undefined ? data.attachmentKey : existing.attachmentKey,
        attachmentName: data.attachmentName !== undefined ? data.attachmentName : existing.attachmentName,
        status: data.status ?? existing.status,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action:
        updated.status === 'PUBLISHED' && existing.status !== 'PUBLISHED'
          ? 'HOMEWORK_PUBLISHED'
          : updated.status === 'ARCHIVED'
          ? 'HOMEWORK_ARCHIVED'
          : 'HOMEWORK_UPDATED',
      entityType: 'Homework',
      entityId: homeworkId,
      beforeData: existing,
      afterData: updated,
      ipAddress: ctx.ipAddress,
    });

    return updated;
  }

  static async getParentHomework(ctx: ScopeContext, studentId: string) {
    // 1. Verify parent-student relationship
    const guardian = await prisma.guardian.findFirst({
      where: { userId: ctx.userId, schoolId: ctx.schoolId },
    });
    if (!guardian) {
      throw new ForbiddenError('No guardian record linked to this user account', {
        code: 'PARENT_NOT_FOUND',
      });
    }

    const link = await prisma.studentGuardian.findUnique({
      where: { studentId_guardianId: { studentId, guardianId: guardian.id } },
    });
    if (!link) {
      throw new ForbiddenError('You do not have access to homework for this student', {
        code: 'PARENT_CHILD_ACCESS_DENIED',
      });
    }

    // 2. Get student active enrollment
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, schoolId: ctx.schoolId, status: 'ACTIVE' },
    });
    if (!enrollment || !enrollment.sectionId) {
      return [];
    }

    // 3. Return only PUBLISHED homework for that class & section
    return prisma.homework.findMany({
      where: {
        schoolId: ctx.schoolId,
        academicYearId: enrollment.academicYearId,
        classId: enrollment.classId,
        sectionId: enrollment.sectionId,
        status: 'PUBLISHED',
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: { assignedDate: 'desc' },
    });
  }

  // =========================================================================
  // 6. EXAM STRUCTURE & SUBJECT CONFIGURATION
  // =========================================================================

  static async getExams(ctx: ScopeContext, academicYearId?: string, status?: string) {
    return prisma.exam.findMany({
      where: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        ...(academicYearId ? { academicYearId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        academicYear: { select: { id: true, name: true } },
        term: { select: { id: true, name: true, code: true } },
        examClasses: { include: { class: { select: { id: true, name: true, code: true } } } },
        _count: { select: { examSubjects: true, examSchedules: true, studentMarks: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  static async getExamDetail(ctx: ScopeContext, examId: string) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId: ctx.schoolId },
      include: {
        academicYear: true,
        term: true,
        examClasses: { include: { class: true } },
        examSubjects: {
          include: {
            class: { select: { id: true, name: true, code: true } },
            subject: { select: { id: true, name: true, code: true, type: true } },
          },
          orderBy: [{ class: { displayOrder: 'asc' } }, { subject: { name: 'asc' } }],
        },
        examSchedules: {
          include: {
            class: { select: { id: true, name: true, code: true } },
            subject: { select: { id: true, name: true, code: true } },
            invigilatorUser: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
        },
      },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }
    return exam;
  }

  static async createExam(
    ctx: ScopeContext,
    data: {
      academicYearId: string;
      termId?: string | null;
      name: string;
      code: string;
      examType?: string;
      startDate: string;
      endDate: string;
      classIds?: string[];
    }
  ) {
    const year = await prisma.academicYear.findFirst({
      where: { id: data.academicYearId, schoolId: ctx.schoolId, isDeleted: false },
    });
    if (!year) {
      throw new NotFoundError('Academic year not found', { code: 'YEAR_NOT_FOUND' });
    }

    const startDate = new Date(`${data.startDate}T00:00:00.000Z`);
    const endDate = new Date(`${data.endDate}T00:00:00.000Z`);
    if (startDate > endDate) {
      throw new BadRequestError('Exam start date cannot be after end date', { code: 'EXAM_DATE_INVALID' });
    }

    const existing = await prisma.exam.findFirst({
      where: {
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        code: data.code.trim().toUpperCase(),
      },
    });
    if (existing) {
      throw new ConflictError('An exam with this code already exists for this academic year', {
        code: 'EXAM_CODE_EXISTS',
      });
    }

    const exam = await prisma.exam.create({
      data: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        termId: data.termId ?? null,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        examType: data.examType ?? 'MID_TERM',
        startDate,
        endDate,
        status: 'DRAFT',
        examClasses: {
          create: (data.classIds ?? []).map((classId) => ({
            tenantId: ctx.tenantId,
            schoolId: ctx.schoolId,
            classId,
          })),
        },
      },
      include: { examClasses: { include: { class: true } } },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'EXAM_CREATED',
      entityType: 'Exam',
      entityId: exam.id,
      afterData: exam,
      ipAddress: ctx.ipAddress,
    });

    return exam;
  }

  static async updateExam(
    ctx: ScopeContext,
    examId: string,
    data: Partial<{
      name: string;
      code: string;
      examType: string;
      startDate: string;
      endDate: string;
      status: string;
      classIds: string[];
    }>
  ) {
    const existing = await prisma.exam.findFirst({
      where: { id: examId, schoolId: ctx.schoolId },
    });
    if (!existing) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }

    if (['FINALIZED', 'PUBLISHED'].includes(existing.status) && data.status !== existing.status) {
      // Allowed transitions are handled via finalize/publish methods
    }

    const startDate = data.startDate ? new Date(`${data.startDate}T00:00:00.000Z`) : existing.startDate;
    const endDate = data.endDate ? new Date(`${data.endDate}T00:00:00.000Z`) : existing.endDate;
    if (startDate > endDate) {
      throw new BadRequestError('Start date cannot be after end date', { code: 'EXAM_DATE_INVALID' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.classIds !== undefined) {
        await tx.examClass.deleteMany({ where: { examId } });
        await tx.examClass.createMany({
          data: data.classIds.map((classId) => ({
            tenantId: ctx.tenantId,
            schoolId: ctx.schoolId,
            examId,
            classId,
          })),
        });
      }

      return tx.exam.update({
        where: { id: examId },
        data: {
          name: data.name?.trim(),
          code: data.code?.trim().toUpperCase(),
          examType: data.examType ?? existing.examType,
          startDate,
          endDate,
          status: data.status ?? existing.status,
        },
        include: { examClasses: { include: { class: true } } },
      });
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'EXAM_UPDATED',
      entityType: 'Exam',
      entityId: examId,
      beforeData: existing,
      afterData: updated,
      ipAddress: ctx.ipAddress,
    });

    return updated;
  }

  static async configureExamSubjects(
    ctx: ScopeContext,
    examId: string,
    subjects: Array<{
      classId: string;
      subjectId: string;
      maxMarks: number;
      passMarks: number;
      theoryMaxMarks?: number | null;
      practicalMaxMarks?: number | null;
      activityMaxMarks?: number | null;
      allowGrace?: boolean;
      maxGraceMarks?: number | null;
      weightage?: number;
    }>
  ) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId: ctx.schoolId },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }
    if (['FINALIZED', 'PUBLISHED'].includes(exam.status)) {
      throw new BadRequestError('Cannot configure subjects on a finalized or published exam', {
        code: 'EXAM_FINALIZED',
      });
    }

    for (const sub of subjects) {
      // 0. Verify subject mapped to class (and active unless already historically configured)
      const classSubject = await prisma.classSubject.findUnique({
        where: { classId_subjectId: { classId: sub.classId, subjectId: sub.subjectId } },
      });
      if (!classSubject || classSubject.schoolId !== ctx.schoolId) {
        throw new BadRequestError('Subject is not mapped to this class', {
          code: 'SUBJECT_NOT_MAPPED',
        });
      }
      if (!classSubject.isActive) {
        const existingExamSubject = await prisma.examSubject.findUnique({
          where: {
            examId_classId_subjectId: {
              examId,
              classId: sub.classId,
              subjectId: sub.subjectId,
            },
          },
        });
        if (!existingExamSubject) {
          throw new BadRequestError('Subject mapping for this class is inactive', {
            code: 'SUBJECT_NOT_MAPPED',
          });
        }
      }

      // 1. Validate maxMarks > 0, passMarks >= 0, passMarks <= maxMarks
      if (sub.maxMarks <= 0) {
        throw new BadRequestError('Maximum marks must be greater than zero', {
          code: 'INVALID_MAX_MARKS',
        });
      }
      if (sub.passMarks < 0 || sub.passMarks > sub.maxMarks) {
        throw new BadRequestError('Passing marks must be between 0 and maximum marks', {
          code: 'INVALID_PASS_MARKS',
        });
      }

      // 2. Component marks reconciliation: if theory, practical, or activity are given
      const hasComponents =
        sub.theoryMaxMarks !== undefined &&
        sub.theoryMaxMarks !== null ||
        sub.practicalMaxMarks !== undefined &&
        sub.practicalMaxMarks !== null ||
        sub.activityMaxMarks !== undefined &&
        sub.activityMaxMarks !== null;

      if (hasComponents) {
        const theory = sub.theoryMaxMarks ?? 0;
        const practical = sub.practicalMaxMarks ?? 0;
        const activity = sub.activityMaxMarks ?? 0;
        const componentSum = Math.round((theory + practical + activity) * 100) / 100;
        const expectedMax = Math.round(sub.maxMarks * 100) / 100;

        if (componentSum !== expectedMax) {
          throw new BadRequestError(
            `Component marks total (${componentSum}) must equal Maximum Marks (${expectedMax})`,
            { code: 'INVALID_COMPONENT_TOTAL' }
          );
        }
      }

      // 3. Grace marks cap
      if (sub.allowGrace && sub.maxGraceMarks && sub.maxGraceMarks > sub.maxMarks) {
        throw new BadRequestError('Max grace marks cannot exceed maximum subject marks', {
          code: 'INVALID_GRACE_CAP',
        });
      }
    }

    const saved = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const sub of subjects) {
        const row = await tx.examSubject.upsert({
          where: {
            examId_classId_subjectId: {
              examId,
              classId: sub.classId,
              subjectId: sub.subjectId,
            },
          },
          update: {
            maxMarks: new Prisma.Decimal(sub.maxMarks),
            passMarks: new Prisma.Decimal(sub.passMarks),
            theoryMaxMarks: sub.theoryMaxMarks !== undefined && sub.theoryMaxMarks !== null ? new Prisma.Decimal(sub.theoryMaxMarks) : null,
            practicalMaxMarks: sub.practicalMaxMarks !== undefined && sub.practicalMaxMarks !== null ? new Prisma.Decimal(sub.practicalMaxMarks) : null,
            activityMaxMarks: sub.activityMaxMarks !== undefined && sub.activityMaxMarks !== null ? new Prisma.Decimal(sub.activityMaxMarks) : null,
            allowGrace: sub.allowGrace ?? false,
            maxGraceMarks: sub.maxGraceMarks !== undefined && sub.maxGraceMarks !== null ? new Prisma.Decimal(sub.maxGraceMarks) : null,
            weightage: sub.weightage !== undefined ? new Prisma.Decimal(sub.weightage) : new Prisma.Decimal(100),
          },
          create: {
            tenantId: ctx.tenantId,
            schoolId: ctx.schoolId,
            examId,
            classId: sub.classId,
            subjectId: sub.subjectId,
            maxMarks: new Prisma.Decimal(sub.maxMarks),
            passMarks: new Prisma.Decimal(sub.passMarks),
            theoryMaxMarks: sub.theoryMaxMarks !== undefined && sub.theoryMaxMarks !== null ? new Prisma.Decimal(sub.theoryMaxMarks) : null,
            practicalMaxMarks: sub.practicalMaxMarks !== undefined && sub.practicalMaxMarks !== null ? new Prisma.Decimal(sub.practicalMaxMarks) : null,
            activityMaxMarks: sub.activityMaxMarks !== undefined && sub.activityMaxMarks !== null ? new Prisma.Decimal(sub.activityMaxMarks) : null,
            allowGrace: sub.allowGrace ?? false,
            maxGraceMarks: sub.maxGraceMarks !== undefined && sub.maxGraceMarks !== null ? new Prisma.Decimal(sub.maxGraceMarks) : null,
            weightage: sub.weightage !== undefined ? new Prisma.Decimal(sub.weightage) : new Prisma.Decimal(100),
          },
        });
        results.push(row);
      }
      return results;
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'EXAM_SUBJECTS_CONFIGURED',
      entityType: 'Exam',
      entityId: examId,
      metadataInfo: { count: saved.length },
      ipAddress: ctx.ipAddress,
    });

    return saved;
  }

  static async saveExamSchedule(
    ctx: ScopeContext,
    examId: string,
    schedules: Array<{
      classId: string;
      subjectId: string;
      examDate: string;
      startTime: string;
      endTime: string;
      durationMinutes?: number | null;
      room?: string | null;
      roomNumber?: string | null;
      invigilatorUserId?: string | null;
    }>
  ) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId: ctx.schoolId },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }

    const examStart = new Date(exam.startDate);
    const examEnd = new Date(exam.endDate);

    for (const sch of schedules) {
      const schDate = new Date(`${sch.examDate}T00:00:00.000Z`);
      if (schDate < examStart || schDate > examEnd) {
        throw new BadRequestError(
          `Exam schedule date (${sch.examDate}) must be within exam date range (${exam.startDate.toISOString().split('T')[0]} to ${exam.endDate.toISOString().split('T')[0]})`,
          { code: 'SCHEDULE_OUTSIDE_EXAM_RANGE' }
        );
      }
      if (sch.startTime >= sch.endTime) {
        throw new BadRequestError('Start time must be earlier than end time', {
          code: 'SCHEDULE_TIME_INVALID',
        });
      }
    }

    const saved = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const sch of schedules) {
        const schDate = new Date(`${sch.examDate}T00:00:00.000Z`);
        const roomVal = (sch.room || sch.roomNumber)?.trim() || null;
        const item = await tx.examSchedule.upsert({
          where: {
            examId_classId_subjectId: {
              examId,
              classId: sch.classId,
              subjectId: sch.subjectId,
            },
          },
          update: {
            examDate: schDate,
            startTime: sch.startTime,
            endTime: sch.endTime,
            durationMinutes: sch.durationMinutes ?? null,
            room: roomVal,
            invigilatorUserId: sch.invigilatorUserId || null,
          },
          create: {
            tenantId: ctx.tenantId,
            schoolId: ctx.schoolId,
            examId,
            classId: sch.classId,
            subjectId: sch.subjectId,
            examDate: schDate,
            startTime: sch.startTime,
            endTime: sch.endTime,
            durationMinutes: sch.durationMinutes ?? null,
            room: roomVal,
            invigilatorUserId: sch.invigilatorUserId || null,
          },
        });
        results.push(item);
      }

      // Update exam status to SCHEDULED if currently DRAFT
      if (exam.status === 'DRAFT') {
        await tx.exam.update({
          where: { id: examId },
          data: { status: 'SCHEDULED' },
        });
      }

      return results;
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'EXAM_SCHEDULED',
      entityType: 'Exam',
      entityId: examId,
      metadataInfo: { count: saved.length },
      ipAddress: ctx.ipAddress,
    });

    return saved;
  }

  // =========================================================================
  // 7. MARKS ENTRY REGISTER & CONCURRENCY
  // =========================================================================

  static async getMarksRegister(
    ctx: ScopeContext,
    params: {
      examId: string;
      classId: string;
      sectionId?: string;
      subjectId: string;
    }
  ) {
    const exam = await prisma.exam.findFirst({
      where: { id: params.examId, schoolId: ctx.schoolId },
      include: { academicYear: true },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }

    const examSubject = await prisma.examSubject.findUnique({
      where: {
        examId_classId_subjectId: {
          examId: params.examId,
          classId: params.classId,
          subjectId: params.subjectId,
        },
      },
      include: { subject: true, class: true },
    });
    if (!examSubject) {
      throw new NotFoundError('Subject assessment configuration not found for this exam and class', {
        code: 'EXAM_SUBJECT_NOT_CONFIGURED',
      });
    }

    // Load active student enrollments for class & section
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId: ctx.schoolId,
        academicYearId: exam.academicYearId,
        classId: params.classId,
        ...(params.sectionId ? { sectionId: params.sectionId } : {}),
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
        section: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ rollNumber: 'asc' }, { student: { firstName: 'asc' } }],
    });

    // Load existing marks
    const existingMarks = await prisma.studentExamMark.findMany({
      where: {
        schoolId: ctx.schoolId,
        examId: params.examId,
        classId: params.classId,
        subjectId: params.subjectId,
        ...(params.sectionId ? { sectionId: params.sectionId } : {}),
      },
    });
    const markMap = new Map(existingMarks.map((m) => [m.studentId, m]));

    const rows = enrollments.map((enr) => {
      const m = markMap.get(enr.studentId);
      return {
        studentId: enr.studentId,
        rollNumber: enr.rollNumber || '—',
        admissionNumber: enr.student.admissionNumber,
        studentName: enr.student.displayName || `${enr.student.firstName} ${enr.student.lastName || ''}`.trim(),
        sectionName: enr.section?.name || '—',
        markId: m?.id || null,
        status: m?.status || 'PRESENT',
        rawTheoryMarks: m?.rawTheoryMarks !== null && m?.rawTheoryMarks !== undefined ? Number(m.rawTheoryMarks) : null,
        rawPracticalMarks: m?.rawPracticalMarks !== null && m?.rawPracticalMarks !== undefined ? Number(m.rawPracticalMarks) : null,
        rawActivityMarks: m?.rawActivityMarks !== null && m?.rawActivityMarks !== undefined ? Number(m.rawActivityMarks) : null,
        graceMarks: m?.graceMarks !== null && m?.graceMarks !== undefined ? Number(m.graceMarks) : 0,
        graceReason: m?.graceReason || null,
        finalMarks: m?.finalMarks !== null && m?.finalMarks !== undefined ? Number(m.finalMarks) : null,
        grade: m?.grade || null,
        isPassed: m?.isPassed ?? null,
        remarks: m?.remarks || '',
        version: m?.version || 1,
      };
    });

    return {
      exam: {
        id: exam.id,
        name: exam.name,
        code: exam.code,
        status: exam.status,
        isLocked: ['FINALIZED', 'PUBLISHED'].includes(exam.status),
      },
      subject: {
        id: examSubject.subject.id,
        name: examSubject.subject.name,
        code: examSubject.subject.code,
        maxMarks: Number(examSubject.maxMarks),
        passMarks: Number(examSubject.passMarks),
        theoryMaxMarks: examSubject.theoryMaxMarks ? Number(examSubject.theoryMaxMarks) : null,
        practicalMaxMarks: examSubject.practicalMaxMarks ? Number(examSubject.practicalMaxMarks) : null,
        activityMaxMarks: examSubject.activityMaxMarks ? Number(examSubject.activityMaxMarks) : null,
        allowGrace: examSubject.allowGrace,
        maxGraceMarks: examSubject.maxGraceMarks ? Number(examSubject.maxGraceMarks) : null,
      },
      class: { id: examSubject.class.id, name: examSubject.class.name },
      students: rows,
    };
  }

  static async saveMarksRegister(
    ctx: ScopeContext,
    data: {
      examId: string;
      classId: string;
      sectionId?: string | null;
      subjectId: string;
      marks: Array<{
        studentId: string;
        status: 'PRESENT' | 'ABSENT' | 'EXEMPT';
        rawTheoryMarks?: number | null;
        rawPracticalMarks?: number | null;
        rawActivityMarks?: number | null;
        graceMarks?: number;
        graceReason?: string | null;
        remarks?: string | null;
        version?: number;
      }>;
    }
  ) {
    const exam = await prisma.exam.findFirst({
      where: { id: data.examId, schoolId: ctx.schoolId },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }

    // Lock check: normal marks entry locked after FINALIZED
    if (['FINALIZED', 'PUBLISHED'].includes(exam.status)) {
      throw new ForbiddenError('Exam is finalized. Normal marks editing is locked.', {
        code: 'EXAM_FINALIZED',
      });
    }

    const examSubject = await prisma.examSubject.findUnique({
      where: {
        examId_classId_subjectId: {
          examId: data.examId,
          classId: data.classId,
          subjectId: data.subjectId,
        },
      },
    });
    if (!examSubject) {
      throw new NotFoundError('Subject assessment configuration not found', {
        code: 'EXAM_SUBJECT_NOT_CONFIGURED',
      });
    }

    const maxMarks = Number(examSubject.maxMarks);
    const passMarks = Number(examSubject.passMarks);
    const hasGracePermission = ctx.permissions?.includes('marks.moderate') || ctx.isSuperadmin;

    // Load default GradeScale for grading
    const gradeScale = await prisma.gradeScale.findFirst({
      where: { schoolId: ctx.schoolId, isDefault: true },
      include: { bands: { orderBy: { minPercentage: 'desc' } } },
    });

    // Check concurrency and validate rows
    const studentIds = data.marks.map((m) => m.studentId);
    const existingRecords = await prisma.studentExamMark.findMany({
      where: {
        schoolId: ctx.schoolId,
        examId: data.examId,
        subjectId: data.subjectId,
        studentId: { in: studentIds },
      },
    });
    const existingMap = new Map(existingRecords.map((r) => [r.studentId, r]));

    for (const m of data.marks) {
      const existing = existingMap.get(m.studentId);
      if (existing) {
        // MANDATORY AMENDMENT 2: Stale marks register concurrency check
        if (m.version !== undefined && m.version < existing.version) {
          throw new ConflictError(
            'Another user has updated this marks register. Please refresh to load the latest marks before saving.',
            { code: 'STALE_MARKS_REGISTER' }
          );
        }
      }

      // Check Grace marks permission: applying graceMarks > 0 requires marks.moderate
      if (m.graceMarks && m.graceMarks > 0 && !hasGracePermission) {
        throw new ForbiddenError('Applying grace marks requires marks.moderate permission', {
          code: 'GRACE_PERMISSION_DENIED',
        });
      }

      // Validate component bounds if present
      if (m.status === 'PRESENT') {
        const rawTheory = m.rawTheoryMarks ?? 0;
        const rawPractical = m.rawPracticalMarks ?? 0;
        const rawActivity = m.rawActivityMarks ?? 0;

        if (rawTheory < 0 || rawPractical < 0 || rawActivity < 0) {
          throw new BadRequestError('Marks cannot be negative', { code: 'INVALID_MARK' });
        }

        const rawSum = rawTheory + rawPractical + rawActivity;
        if (rawSum > maxMarks) {
          throw new BadRequestError(
            `Entered marks (${rawSum}) exceed maximum allowed marks (${maxMarks}) for this subject`,
            { code: 'MARK_EXCEEDS_MAXIMUM' }
          );
        }
      }
    }

    // Save in transaction
    const saved = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const m of data.marks) {
        const existing = existingMap.get(m.studentId);
        const nextVersion = existing ? existing.version + 1 : 1;

        let finalMarks: number | null = null;
        let isPassed: boolean | null = null;
        let grade: string | null = null;

        if (m.status === 'PRESENT') {
          const rawSum = (m.rawTheoryMarks ?? 0) + (m.rawPracticalMarks ?? 0) + (m.rawActivityMarks ?? 0);
          const grace = m.graceMarks ?? 0;
          // MANDATORY AMENDMENT 4: raw marks are preserved, finalMarks = min(maxMarks, rawSum + grace)
          finalMarks = Math.min(maxMarks, Math.round((rawSum + grace) * 100) / 100);
          isPassed = finalMarks >= passMarks;

          // Calculate grade
          if (gradeScale && gradeScale.bands.length > 0) {
            const percentage = maxMarks > 0 ? (finalMarks / maxMarks) * 100 : 0;
            const matchedBand = gradeScale.bands.find(
              (b) => percentage >= Number(b.minPercentage) && percentage <= Number(b.maxPercentage)
            );
            if (matchedBand) {
              grade = matchedBand.grade;
            }
          }
        } else if (m.status === 'ABSENT') {
          // Absent does not have final marks
          finalMarks = null;
          isPassed = false;
          grade = 'AB';
        } else if (m.status === 'EXEMPT') {
          finalMarks = null;
          isPassed = null;
          grade = 'EX';
        }

        const upserted = await tx.studentExamMark.upsert({
          where: {
            examId_studentId_subjectId: {
              examId: data.examId,
              studentId: m.studentId,
              subjectId: data.subjectId,
            },
          },
          update: {
            status: m.status,
            rawTheoryMarks: m.rawTheoryMarks !== undefined && m.rawTheoryMarks !== null ? new Prisma.Decimal(m.rawTheoryMarks) : null,
            rawPracticalMarks: m.rawPracticalMarks !== undefined && m.rawPracticalMarks !== null ? new Prisma.Decimal(m.rawPracticalMarks) : null,
            rawActivityMarks: m.rawActivityMarks !== undefined && m.rawActivityMarks !== null ? new Prisma.Decimal(m.rawActivityMarks) : null,
            graceMarks: new Prisma.Decimal(m.graceMarks ?? 0),
            graceReason: m.graceReason || null,
            finalMarks: finalMarks !== null ? new Prisma.Decimal(finalMarks) : null,
            grade,
            isPassed,
            remarks: m.remarks || null,
            version: nextVersion,
            updatedByUserId: ctx.userId,
          },
          create: {
            tenantId: ctx.tenantId,
            schoolId: ctx.schoolId,
            examId: data.examId,
            studentId: m.studentId,
            classId: data.classId,
            sectionId: data.sectionId || null,
            subjectId: data.subjectId,
            status: m.status,
            rawTheoryMarks: m.rawTheoryMarks !== undefined && m.rawTheoryMarks !== null ? new Prisma.Decimal(m.rawTheoryMarks) : null,
            rawPracticalMarks: m.rawPracticalMarks !== undefined && m.rawPracticalMarks !== null ? new Prisma.Decimal(m.rawPracticalMarks) : null,
            rawActivityMarks: m.rawActivityMarks !== undefined && m.rawActivityMarks !== null ? new Prisma.Decimal(m.rawActivityMarks) : null,
            graceMarks: new Prisma.Decimal(m.graceMarks ?? 0),
            graceReason: m.graceReason || null,
            finalMarks: finalMarks !== null ? new Prisma.Decimal(finalMarks) : null,
            grade,
            isPassed,
            remarks: m.remarks || null,
            version: 1,
            enteredByUserId: ctx.userId,
          },
        });
        results.push(upserted);
      }

      // Transition exam status from SCHEDULED or DRAFT to MARKS_ENTRY if appropriate
      if (['DRAFT', 'SCHEDULED'].includes(exam.status)) {
        await tx.exam.update({
          where: { id: data.examId },
          data: { status: 'MARKS_ENTRY' },
        });
      }

      return results;
    });

    const hadGrace = data.marks.some((m) => m.graceMarks && m.graceMarks > 0);
    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: hadGrace ? 'GRACE_MARKS_APPLIED' : 'MARKS_ENTERED',
      entityType: 'StudentExamMark',
      entityId: `${data.examId}:${data.subjectId}`,
      metadataInfo: { count: saved.length, hadGrace },
      ipAddress: ctx.ipAddress,
    });

    return { success: true, savedCount: saved.length };
  }

  /**
   * MANDATORY AMENDMENT 5: Authorized moderation correction for finalized results
   */
  static async moderateFinalizedMark(
    ctx: ScopeContext,
    data: {
      examId: string;
      studentId: string;
      subjectId: string;
      status?: 'PRESENT' | 'ABSENT' | 'EXEMPT';
      rawTheoryMarks?: number | null;
      rawPracticalMarks?: number | null;
      rawActivityMarks?: number | null;
      graceMarks?: number | null;
      graceReason?: string | null;
      reason: string;
    }
  ) {
    // 1. Verify moderation permission
    if (!ctx.permissions?.includes('marks.moderate') && !ctx.isSuperadmin) {
      throw new ForbiddenError('Authorized correction requires marks.moderate permission', {
        code: 'FORBIDDEN',
      });
    }

    if (!data.reason || !data.reason.trim()) {
      throw new BadRequestError('Correction reason is mandatory for finalized mark adjustments', {
        code: 'REASON_REQUIRED',
      });
    }

    const exam = await prisma.exam.findFirst({
      where: { id: data.examId, schoolId: ctx.schoolId },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }

    const existing = await prisma.studentExamMark.findUnique({
      where: {
        examId_studentId_subjectId: {
          examId: data.examId,
          studentId: data.studentId,
          subjectId: data.subjectId,
        },
      },
    });
    if (!existing) {
      throw new NotFoundError('Mark record not found to moderate', { code: 'NOT_FOUND' });
    }

    const examSubject = await prisma.examSubject.findUnique({
      where: {
        examId_classId_subjectId: {
          examId: data.examId,
          classId: existing.classId,
          subjectId: data.subjectId,
        },
      },
    });
    if (!examSubject) {
      throw new NotFoundError('Exam subject configuration not found', { code: 'NOT_FOUND' });
    }

    const maxMarks = Number(examSubject.maxMarks);
    const passMarks = Number(examSubject.passMarks);

    const status = data.status ?? (existing.status as 'PRESENT' | 'ABSENT' | 'EXEMPT');
    const rawTheory = data.rawTheoryMarks !== undefined ? (data.rawTheoryMarks ?? 0) : (existing.rawTheoryMarks ? Number(existing.rawTheoryMarks) : 0);
    const rawPractical = data.rawPracticalMarks !== undefined ? (data.rawPracticalMarks ?? 0) : (existing.rawPracticalMarks ? Number(existing.rawPracticalMarks) : 0);
    const rawActivity = data.rawActivityMarks !== undefined ? (data.rawActivityMarks ?? 0) : (existing.rawActivityMarks ? Number(existing.rawActivityMarks) : 0);
    const grace = data.graceMarks !== undefined && data.graceMarks !== null ? data.graceMarks : (existing.graceMarks ? Number(existing.graceMarks) : 0);

    let finalMarks: number | null = null;
    let isPassed: boolean | null = null;
    let grade: string | null = null;

    if (status === 'PRESENT') {
      const rawSum = rawTheory + rawPractical + rawActivity;
      if (rawSum > maxMarks) {
        throw new BadRequestError(`Entered marks exceed maximum (${maxMarks})`, { code: 'MARK_EXCEEDS_MAXIMUM' });
      }
      finalMarks = Math.min(maxMarks, Math.round((rawSum + grace) * 100) / 100);
      isPassed = finalMarks >= passMarks;

      const gradeScale = await prisma.gradeScale.findFirst({
        where: { schoolId: ctx.schoolId, isDefault: true },
        include: { bands: { orderBy: { minPercentage: 'desc' } } },
      });
      if (gradeScale && gradeScale.bands.length > 0) {
        const percentage = maxMarks > 0 ? (finalMarks / maxMarks) * 100 : 0;
        const matchedBand = gradeScale.bands.find(
          (b) => percentage >= Number(b.minPercentage) && percentage <= Number(b.maxPercentage)
        );
        if (matchedBand) grade = matchedBand.grade;
      }
    } else if (status === 'ABSENT') {
      finalMarks = null;
      isPassed = false;
      grade = 'AB';
    } else {
      finalMarks = null;
      isPassed = null;
      grade = 'EX';
    }

    const updated = await prisma.studentExamMark.update({
      where: { id: existing.id },
      data: {
        status,
        rawTheoryMarks: data.rawTheoryMarks !== undefined && data.rawTheoryMarks !== null ? new Prisma.Decimal(data.rawTheoryMarks) : existing.rawTheoryMarks,
        rawPracticalMarks: data.rawPracticalMarks !== undefined && data.rawPracticalMarks !== null ? new Prisma.Decimal(data.rawPracticalMarks) : existing.rawPracticalMarks,
        rawActivityMarks: data.rawActivityMarks !== undefined && data.rawActivityMarks !== null ? new Prisma.Decimal(data.rawActivityMarks) : existing.rawActivityMarks,
        graceMarks: new Prisma.Decimal(grace),
        graceReason: data.graceReason !== undefined ? data.graceReason : existing.graceReason,
        finalMarks: finalMarks !== null ? new Prisma.Decimal(finalMarks) : null,
        grade,
        isPassed,
        version: existing.version + 1,
        updatedByUserId: ctx.userId,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'MARKS_MODERATED',
      entityType: 'StudentExamMark',
      entityId: existing.id,
      beforeData: {
        status: existing.status,
        rawTheoryMarks: existing.rawTheoryMarks,
        rawPracticalMarks: existing.rawPracticalMarks,
        rawActivityMarks: existing.rawActivityMarks,
        graceMarks: existing.graceMarks,
        finalMarks: existing.finalMarks,
        version: existing.version,
      },
      afterData: {
        status: updated.status,
        rawTheoryMarks: updated.rawTheoryMarks,
        rawPracticalMarks: updated.rawPracticalMarks,
        rawActivityMarks: updated.rawActivityMarks,
        graceMarks: updated.graceMarks,
        finalMarks: updated.finalMarks,
        version: updated.version,
        moderationReason: data.reason.trim(),
      },
      ipAddress: ctx.ipAddress,
    });

    return updated;
  }

  // =========================================================================
  // 8. GRADE SCALES & BANDS
  // =========================================================================

  static async getGradeScales(ctx: ScopeContext) {
    return prisma.gradeScale.findMany({
      where: { tenantId: ctx.tenantId, schoolId: ctx.schoolId },
      include: { bands: { orderBy: { minPercentage: 'desc' } } },
      orderBy: { name: 'asc' },
    });
  }

  static async createGradeScale(
    ctx: ScopeContext,
    data: {
      name: string;
      isDefault?: boolean;
      bands: Array<{
        grade: string;
        minPercentage: number;
        maxPercentage: number;
        gradePoint?: number | null;
        description?: string | null;
        resultStatus?: string;
      }>;
    }
  ) {
    // MANDATORY AMENDMENT 3: Range validation & overlap prevention
    for (let i = 0; i < data.bands.length; i++) {
      const b = data.bands[i];
      if (b.minPercentage < 0 || b.maxPercentage > 100) {
        throw new BadRequestError('Percentages must be between 0 and 100', {
          code: 'INVALID_PERCENTAGE_RANGE',
        });
      }
      if (b.minPercentage > b.maxPercentage) {
        throw new BadRequestError(
          `Minimum percentage (${b.minPercentage}) cannot be greater than maximum percentage (${b.maxPercentage}) for grade ${b.grade}`,
          { code: 'MIN_GREATER_THAN_MAX' }
        );
      }

      // Check for overlap with other bands
      for (let j = i + 1; j < data.bands.length; j++) {
        const other = data.bands[j];
        const overlaps =
          b.minPercentage < other.maxPercentage && other.minPercentage < b.maxPercentage;
        if (overlaps) {
          throw new BadRequestError(
            `Grade bands for ${b.grade} (${b.minPercentage}-${b.maxPercentage}%) and ${other.grade} (${other.minPercentage}-${other.maxPercentage}%) overlap`,
            { code: 'GRADE_BAND_OVERLAP' }
          );
        }
      }
    }

    const scale = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.gradeScale.updateMany({
          where: { schoolId: ctx.schoolId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.gradeScale.create({
        data: {
          tenantId: ctx.tenantId,
          schoolId: ctx.schoolId,
          name: data.name.trim(),
          isDefault: data.isDefault ?? false,
          bands: {
            create: data.bands.map((b) => ({
              tenantId: ctx.tenantId,
              schoolId: ctx.schoolId,
              grade: b.grade.trim(),
              minPercentage: new Prisma.Decimal(b.minPercentage),
              maxPercentage: new Prisma.Decimal(b.maxPercentage),
              gradePoint: b.gradePoint !== undefined && b.gradePoint !== null ? new Prisma.Decimal(b.gradePoint) : null,
              description: b.description || null,
              resultStatus: b.resultStatus || 'PASS',
            })),
          },
        },
        include: { bands: true },
      });
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'GRADE_SCALE_CREATED',
      entityType: 'GradeScale',
      entityId: scale.id,
      afterData: scale,
      ipAddress: ctx.ipAddress,
    });

    return scale;
  }

  // =========================================================================
  // 9. RESULT CALCULATION, FINALIZATION & PUBLISHING
  // =========================================================================

  static async getExamResults(
    ctx: ScopeContext,
    params: {
      examId: string;
      classId: string;
      sectionId?: string;
    }
  ) {
    const exam = await prisma.exam.findFirst({
      where: { id: params.examId, schoolId: ctx.schoolId },
      include: { academicYear: true, term: true },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }

    const subjects = await prisma.examSubject.findMany({
      where: { examId: params.examId, classId: params.classId },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    });

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId: ctx.schoolId,
        academicYearId: exam.academicYearId,
        classId: params.classId,
        ...(params.sectionId ? { sectionId: params.sectionId } : {}),
        status: 'ACTIVE',
      },
      include: {
        student: true,
        section: true,
      },
      orderBy: [{ rollNumber: 'asc' }, { student: { firstName: 'asc' } }],
    });

    const studentMarks = await prisma.studentExamMark.findMany({
      where: {
        schoolId: ctx.schoolId,
        examId: params.examId,
        classId: params.classId,
        ...(params.sectionId ? { sectionId: params.sectionId } : {}),
      },
      include: { subject: true },
    });

    // Default GradeScale for overall grade calculation
    const gradeScale = await prisma.gradeScale.findFirst({
      where: { schoolId: ctx.schoolId, isDefault: true },
      include: { bands: { orderBy: { minPercentage: 'desc' } } },
    });

    const studentResults = enrollments.map((enr) => {
      const marks = studentMarks.filter((m) => m.studentId === enr.studentId);
      const subjectDetails = subjects.map((sub) => {
        const m = marks.find((mark) => mark.subjectId === sub.subjectId);
        return {
          subjectId: sub.subjectId,
          subjectName: sub.subject.name,
          subjectCode: sub.subject.code,
          maxMarks: Number(sub.maxMarks),
          passMarks: Number(sub.passMarks),
          status: m?.status || 'PENDING',
          rawMarks:
            m?.status === 'PRESENT'
              ? (Number(m.rawTheoryMarks || 0) + Number(m.rawPracticalMarks || 0) + Number(m.rawActivityMarks || 0))
              : null,
          graceMarks: m ? Number(m.graceMarks || 0) : 0,
          finalMarks: m?.finalMarks !== null && m?.finalMarks !== undefined ? Number(m.finalMarks) : null,
          grade: m?.grade || '—',
          isPassed: m?.isPassed ?? null,
        };
      });

      // Calculate totals
      let totalMax = 0;
      let totalObtained = 0;
      let hasAbsent = false;
      let hasFailedSubject = false;
      let presentSubjectsCount = 0;

      for (const sd of subjectDetails) {
        if (sd.status === 'EXEMPT') {
          // Exempt excluded from denominator
          continue;
        }
        totalMax += sd.maxMarks;
        if (sd.status === 'PRESENT' && sd.finalMarks !== null) {
          totalObtained += sd.finalMarks;
          presentSubjectsCount++;
          if (sd.isPassed === false) {
            hasFailedSubject = true;
          }
        } else if (sd.status === 'ABSENT') {
          hasAbsent = true;
          hasFailedSubject = true;
        }
      }

      const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
      let overallGrade = '—';
      if (gradeScale && gradeScale.bands.length > 0) {
        const band = gradeScale.bands.find(
          (b) => percentage >= Number(b.minPercentage) && percentage <= Number(b.maxPercentage)
        );
        if (band) overallGrade = band.grade;
      }

      let overallResult = 'PASS';
      if (hasAbsent && presentSubjectsCount === 0) {
        overallResult = 'ABSENT';
      } else if (hasFailedSubject) {
        overallResult = 'FAIL';
      }

      return {
        studentId: enr.studentId,
        rollNumber: enr.rollNumber || '—',
        admissionNumber: enr.student.admissionNumber,
        studentName: enr.student.displayName || `${enr.student.firstName} ${enr.student.lastName || ''}`.trim(),
        sectionName: enr.section?.name || '—',
        subjectDetails,
        totalObtained: Math.round(totalObtained * 100) / 100,
        totalMax,
        percentage,
        overallGrade,
        overallResult,
      };
    });

    return {
      exam: {
        id: exam.id,
        name: exam.name,
        code: exam.code,
        status: exam.status,
      },
      subjects: subjects.map((s) => ({
        id: s.subject.id,
        name: s.subject.name,
        code: s.subject.code,
        maxMarks: Number(s.maxMarks),
      })),
      results: studentResults,
    };
  }

  static async finalizeExam(ctx: ScopeContext, examId: string) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId: ctx.schoolId },
      include: { examSubjects: true },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }
    if (exam.examSubjects.length === 0) {
      throw new BadRequestError('Cannot finalize an exam without configured subjects', {
        code: 'NO_SUBJECTS_CONFIGURED',
      });
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
        finalizedByUserId: ctx.userId,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'RESULT_FINALIZED',
      entityType: 'Exam',
      entityId: examId,
      beforeData: { status: exam.status },
      afterData: { status: 'FINALIZED', finalizedAt: updated.finalizedAt },
      ipAddress: ctx.ipAddress,
    });

    return updated;
  }

  static async publishExam(ctx: ScopeContext, examId: string) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId: ctx.schoolId },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }

    if (exam.status !== 'FINALIZED') {
      throw new BadRequestError('Exam results must be finalized before publishing', {
        code: 'RESULT_NOT_FINALIZED',
      });
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedByUserId: ctx.userId,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'RESULT_PUBLISHED',
      entityType: 'Exam',
      entityId: examId,
      beforeData: { status: exam.status },
      afterData: { status: 'PUBLISHED', publishedAt: updated.publishedAt },
      ipAddress: ctx.ipAddress,
    });

    return updated;
  }

  static async unpublishExam(ctx: ScopeContext, examId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestError('Unpublish reason is required', { code: 'REASON_REQUIRED' });
    }

    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId: ctx.schoolId },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        status: 'FINALIZED',
        publishedAt: null,
        publishedByUserId: null,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'RESULT_UNPUBLISHED',
      entityType: 'Exam',
      entityId: examId,
      beforeData: { status: 'PUBLISHED' },
      afterData: { status: 'FINALIZED', unpublishReason: reason.trim() },
      ipAddress: ctx.ipAddress,
    });

    return updated;
  }

  // =========================================================================
  // 10. REPORT CARD SERVICE & ATTENDANCE INTEGRATION
  // =========================================================================

  static async getStudentReportCard(ctx: ScopeContext, examId: string, studentId: string) {
    // 1. Check parent portal access security
    const isParentRole = ctx.permissions?.includes('parent.results.view') && !ctx.permissions?.includes('results.view');
    if (isParentRole) {
      const guardian = await prisma.guardian.findFirst({
        where: { userId: ctx.userId, schoolId: ctx.schoolId },
      });
      if (!guardian) {
        throw new ForbiddenError('Guardian record not found for parent user', {
          code: 'PARENT_NOT_FOUND',
        });
      }

      // MANDATORY AMENDMENT 6: Parent A cannot access Student B
      const link = await prisma.studentGuardian.findUnique({
        where: { studentId_guardianId: { studentId, guardianId: guardian.id } },
      });
      if (!link) {
        throw new ForbiddenError('You do not have access to view results for this student', {
          code: 'PARENT_CHILD_ACCESS_DENIED',
        });
      }
    }

    // 2. Fetch Exam
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId: ctx.schoolId },
      include: { academicYear: true, term: true },
    });
    if (!exam) {
      throw new NotFoundError('Exam not found', { code: 'NOT_FOUND' });
    }

    // MANDATORY AMENDMENT 6: Unpublished Protection
    if (isParentRole && exam.status !== 'PUBLISHED') {
      throw new ForbiddenError('Exam results have not yet been published by the school', {
        code: 'RESULT_NOT_PUBLISHED',
      });
    }

    // 3. Fetch Student & Enrollment
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: ctx.schoolId },
      include: {
        enrollments: {
          where: { academicYearId: exam.academicYearId },
          include: { class: true, section: true },
        },
      },
    });
    if (!student) {
      throw new NotFoundError('Student not found', { code: 'NOT_FOUND' });
    }
    const enrollment = student.enrollments[0];

    // 4. Fetch Subject assessments & marks
    const classId = enrollment?.classId;
    const subjects = classId
      ? await prisma.examSubject.findMany({
          where: { examId, classId },
          include: { subject: true },
          orderBy: { subject: { name: 'asc' } },
        })
      : [];

    const marks = await prisma.studentExamMark.findMany({
      where: { examId, studentId, schoolId: ctx.schoolId },
    });
    const markMap = new Map(marks.map((m) => [m.subjectId, m]));

    const gradeScale = await prisma.gradeScale.findFirst({
      where: { schoolId: ctx.schoolId, isDefault: true },
      include: { bands: { orderBy: { minPercentage: 'desc' } } },
    });

    let totalMax = 0;
    let totalObtained = 0;
    let hasFailed = false;
    let hasAbsent = false;

    const subjectRows = subjects.map((sub) => {
      const m = markMap.get(sub.subjectId);
      const rowMax = Number(sub.maxMarks);
      const final = m?.finalMarks !== null && m?.finalMarks !== undefined ? Number(m.finalMarks) : null;
      const status = m?.status || 'PENDING';

      if (status !== 'EXEMPT') {
        totalMax += rowMax;
        if (status === 'PRESENT' && final !== null) {
          totalObtained += final;
          if (m?.isPassed === false) hasFailed = true;
        } else if (status === 'ABSENT') {
          hasAbsent = true;
          hasFailed = true;
        }
      }

      return {
        subjectId: sub.subjectId,
        subjectName: sub.subject.name,
        subjectCode: sub.subject.code,
        maxMarks: rowMax,
        passMarks: Number(sub.passMarks),
        rawTheoryMarks: m?.rawTheoryMarks ? Number(m.rawTheoryMarks) : null,
        rawPracticalMarks: m?.rawPracticalMarks ? Number(m.rawPracticalMarks) : null,
        rawActivityMarks: m?.rawActivityMarks ? Number(m.rawActivityMarks) : null,
        graceMarks: m?.graceMarks ? Number(m.graceMarks) : 0,
        finalMarks: final,
        grade: m?.grade || '—',
        status,
        isPassed: m?.isPassed ?? null,
      };
    });

    const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
    let overallGrade = '—';
    if (gradeScale && gradeScale.bands.length > 0) {
      const band = gradeScale.bands.find(
        (b) => percentage >= Number(b.minPercentage) && percentage <= Number(b.maxPercentage)
      );
      if (band) overallGrade = band.grade;
    }

    // MANDATORY AMENDMENT 8: Reusing Module 05 attendance calculation logic
    const config = await prisma.schoolConfiguration.findUnique({
      where: { schoolId: ctx.schoolId },
    });
    const workingWeek = config?.workingWeek ?? 'MON_SAT';

    // Calculate attendance between academic year start / student admission and current date or exam end
    const startDate = student.admissionDate > exam.startDate ? student.admissionDate : exam.startDate;
    const endDate = student.lastAttendanceDate && student.status === 'WITHDRAWN'
      ? student.lastAttendanceDate
      : exam.endDate;

    const holidays = await prisma.schoolHoliday.findMany({
      where: {
        schoolId: ctx.schoolId,
        startDate: { lte: endDate },
        OR: [{ endDate: null }, { endDate: { gte: startDate } }],
      },
    });

    let workingDaysCount = 0;
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const hol = holidays.find((h) => {
        const s = new Date(h.startDate);
        const e = h.endDate ? new Date(h.endDate) : s;
        return curr >= s && curr <= e;
      });

      if (hol) {
        if (hol.isWorkingOverride) workingDaysCount++;
      } else {
        if (AttendanceService.isWorkingDayOfWeek(curr, workingWeek)) workingDaysCount++;
      }
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    const attendances = await prisma.studentAttendance.findMany({
      where: {
        schoolId: ctx.schoolId,
        studentId,
        attendanceDate: { gte: startDate, lte: endDate },
      },
    });

    const presentDays = attendances.filter((a) => a.status === 'PRESENT').length;
    const halfDays = attendances.filter((a) => a.status === 'HALF_DAY').length;
    const excusedDays = attendances.filter((a) => a.status === 'EXCUSED').length;
    const weightedPresent = presentDays + halfDays * 0.5 + excusedDays;
    const attendancePercentage = workingDaysCount > 0
      ? Math.min(100, Math.round((weightedPresent / workingDaysCount) * 10000) / 100)
      : 0;

    // School Branding
    const school = await prisma.school.findUnique({
      where: { id: ctx.schoolId },
      include: { branding: true },
    });

    return {
      school: {
        name: school?.name,
        code: school?.code,
        logoUrl: school?.branding?.logoStorageKey || null,
        tagline: school?.branding?.letterheadText || null,
        primaryColor: school?.branding?.primaryPrintColor || '#059669',
      },
      student: {
        id: student.id,
        studentId: student.studentId,
        admissionNumber: student.admissionNumber,
        fullName: student.displayName || `${student.firstName} ${student.lastName || ''}`.trim(),
        rollNumber: enrollment?.rollNumber || '—',
        className: enrollment?.class?.name || '—',
        sectionName: enrollment?.section?.name || '—',
      },
      exam: {
        id: exam.id,
        name: exam.name,
        code: exam.code,
        examType: exam.examType,
        academicYearName: exam.academicYear.name,
        termName: exam.term?.name || null,
        status: exam.status,
      },
      subjects: subjectRows,
      summary: {
        totalObtained: Math.round(totalObtained * 100) / 100,
        totalMax,
        percentage,
        overallGrade,
        result: hasFailed ? 'FAIL' : hasAbsent && subjectRows.length > 0 ? 'FAIL' : 'PASS',
      },
      attendanceSummary: {
        workingDays: workingDaysCount,
        presentDays: weightedPresent,
        attendancePercentage,
      },
    };
  }

  // =========================================================================
  // 11. STUDENT PROMOTION / DETENTION / COMPLETION
  // =========================================================================

  static async getPromotionRegister(
    ctx: ScopeContext,
    params: {
      fromAcademicYearId: string;
      classId: string;
      sectionId?: string;
    }
  ) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId: ctx.schoolId,
        academicYearId: params.fromAcademicYearId,
        classId: params.classId,
        ...(params.sectionId ? { sectionId: params.sectionId } : {}),
        status: { in: ['ACTIVE', 'PROMOTED', 'DETAINED', 'COMPLETED'] },
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: [{ rollNumber: 'asc' }, { student: { firstName: 'asc' } }],
    });

    const studentIds = enrollments.map((e) => e.studentId);
    const promotions = await prisma.studentPromotion.findMany({
      where: {
        schoolId: ctx.schoolId,
        fromAcademicYearId: params.fromAcademicYearId,
        studentId: { in: studentIds },
      },
      include: {
        toAcademicYear: { select: { id: true, name: true } },
        toClass: { select: { id: true, name: true } },
        toSection: { select: { id: true, name: true } },
      },
    });
    const promotionMap = new Map(promotions.map((p) => [p.studentId, p]));

    return enrollments.map((enr) => {
      const prom = promotionMap.get(enr.studentId);
      return {
        enrollmentId: enr.id,
        studentId: enr.studentId,
        rollNumber: enr.rollNumber || '—',
        admissionNumber: enr.student.admissionNumber,
        studentName: enr.student.displayName || `${enr.student.firstName} ${enr.student.lastName || ''}`.trim(),
        currentClassName: enr.class.name,
        currentSectionName: enr.section?.name || '—',
        currentStatus: enr.status,
        promotion: prom
          ? {
              id: prom.id,
              decision: prom.decision,
              toAcademicYearName: prom.toAcademicYear?.name || null,
              toClassName: prom.toClass?.name || null,
              toSectionName: prom.toSection?.name || null,
              promotedAt: prom.promotedAt,
            }
          : null,
      };
    });
  }

  static async executePromotion(
    ctx: ScopeContext,
    data: {
      fromAcademicYearId: string;
      fromClassId: string;
      fromSectionId?: string | null;
      toAcademicYearId?: string | null;
      toClassId?: string | null;
      toSectionId?: string | null;
      promotions: Array<{
        studentId: string;
        decision: 'PROMOTE' | 'DETAIN' | 'COMPLETE';
        toAcademicYearId?: string | null;
        toClassId?: string | null;
        toSectionId?: string | null;
        remarks?: string | null;
      }>;
    }
  ) {
    const results = await prisma.$transaction(async (tx) => {
      const createdPromotions = [];

      for (const p of data.promotions) {
        const targetYearId = p.toAcademicYearId || data.toAcademicYearId;
        const targetClassId = p.toClassId || data.toClassId;
        const targetSectionId = p.toSectionId || data.toSectionId;

        // 1. Fetch current active enrollment
        const currentEnrollment = await tx.studentEnrollment.findFirst({
          where: {
            schoolId: ctx.schoolId,
            studentId: p.studentId,
            academicYearId: data.fromAcademicYearId,
            classId: data.fromClassId,
            status: 'ACTIVE',
          },
        });
        if (!currentEnrollment) {
          throw new NotFoundError(
            `Active enrollment not found for student in the source academic year and class`,
            { code: 'ENROLLMENT_NOT_FOUND' }
          );
        }

        let newEnrollmentId: string | null = null;

        if (p.decision === 'PROMOTE' || p.decision === 'DETAIN') {
          if (!targetYearId) {
            throw new BadRequestError('Target academic year is required for promotion and detention', {
              code: 'PROMOTION_TARGET_INVALID',
            });
          }
          if (targetYearId === data.fromAcademicYearId) {
            throw new BadRequestError('Target academic year cannot be the same as source academic year', {
              code: 'PROMOTION_TARGET_INVALID',
            });
          }

          // Verify target year exists and belongs to school
          const targetYear = await tx.academicYear.findFirst({
            where: { id: targetYearId, schoolId: ctx.schoolId, isDeleted: false },
          });
          if (!targetYear) {
            throw new NotFoundError('Target academic year does not exist for this school', {
              code: 'PROMOTION_TARGET_INVALID',
            });
          }

          const targetClass = p.decision === 'PROMOTE' ? targetClassId : (targetClassId || data.fromClassId);
          if (!targetClass) {
            throw new BadRequestError('Target class is required', { code: 'PROMOTION_TARGET_INVALID' });
          }

          // Duplicate target enrollment prevention
          const duplicate = await tx.studentEnrollment.findFirst({
            where: {
              schoolId: ctx.schoolId,
              studentId: p.studentId,
              academicYearId: targetYearId,
            },
          });
          if (duplicate) {
            throw new ConflictError(
              `Student is already enrolled in target academic year (enrollment ID: ${duplicate.id})`,
              { code: 'STUDENT_ALREADY_ENROLLED' }
            );
          }

          // MANDATORY AMENDMENT 7: Close current enrollment without overwriting history
          await tx.studentEnrollment.update({
            where: { id: currentEnrollment.id },
            data: {
              status: p.decision === 'PROMOTE' ? 'PROMOTED' : 'DETAINED',
              completionDate: new Date(),
            },
          });

          // Create new enrollment in target year
          const newEnrollment = await tx.studentEnrollment.create({
            data: {
              tenantId: ctx.tenantId,
              schoolId: ctx.schoolId,
              studentId: p.studentId,
              academicYearId: targetYearId,
              classId: targetClass,
              sectionId: targetSectionId || null,
              rollNumber: currentEnrollment.rollNumber,
              status: 'ACTIVE',
              enrollmentDate: new Date(),
            },
          });
          newEnrollmentId = newEnrollment.id;
        } else if (p.decision === 'COMPLETE') {
          // Final year completion / graduation
          await tx.studentEnrollment.update({
            where: { id: currentEnrollment.id },
            data: {
              status: 'COMPLETED',
              completionDate: new Date(),
            },
          });
        }

        // Record promotion decision
        const promo = await tx.studentPromotion.create({
          data: {
            tenantId: ctx.tenantId,
            schoolId: ctx.schoolId,
            studentId: p.studentId,
            fromAcademicYearId: data.fromAcademicYearId,
            fromClassId: data.fromClassId,
            fromSectionId: data.fromSectionId || null,
            toAcademicYearId: targetYearId || null,
            toClassId: (p.decision === 'PROMOTE' ? targetClassId : targetClassId || data.fromClassId) || null,
            toSectionId: targetSectionId || null,
            decision: p.decision,
            remarks: p.remarks || null,
            promotedByUserId: ctx.userId,
            newEnrollmentId,
          },
        });
        createdPromotions.push(promo);
      }

      return createdPromotions;
    });

    // Write audit logs
    const action = data.promotions[0]?.decision === 'PROMOTE'
      ? 'STUDENT_PROMOTED'
      : data.promotions[0]?.decision === 'DETAIN'
      ? 'STUDENT_DETAINED'
      : 'STUDENT_COMPLETED';

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action,
      entityType: 'StudentPromotion',
      entityId: `${data.fromAcademicYearId}:${data.fromClassId}`,
      metadataInfo: { count: results.length, decisions: data.promotions.map((p) => p.decision) },
      ipAddress: ctx.ipAddress,
    });

    return { success: true, count: results.length, promotions: results };
  }

  // =========================================================================
  // 12. ACADEMICS OVERVIEW KPIS
  // =========================================================================

  static async getAcademicsOverview(ctx: ScopeContext, academicYearId?: string) {
    const [
      classesCount,
      subjectsCount,
      classTeachersCount,
      subjectTeachersCount,
      timetableSlotsCount,
      homeworkCount,
      examsCount,
      pendingMarksExamsCount,
      resultsAwaitingPublicationCount,
    ] = await Promise.all([
      prisma.classMaster.count({ where: { schoolId: ctx.schoolId, isActive: true } }),
      prisma.subjectMaster.count({ where: { schoolId: ctx.schoolId, isActive: true } }),
      prisma.classTeacherAssignment.count({
        where: { schoolId: ctx.schoolId, ...(academicYearId ? { academicYearId } : {}) },
      }),
      prisma.subjectTeacherAssignment.count({
        where: { schoolId: ctx.schoolId, ...(academicYearId ? { academicYearId } : {}) },
      }),
      prisma.timetableSlot.count({
        where: { schoolId: ctx.schoolId, ...(academicYearId ? { academicYearId } : {}) },
      }),
      prisma.homework.count({
        where: {
          schoolId: ctx.schoolId,
          status: 'PUBLISHED',
          ...(academicYearId ? { academicYearId } : {}),
        },
      }),
      prisma.exam.count({
        where: { schoolId: ctx.schoolId, ...(academicYearId ? { academicYearId } : {}) },
      }),
      prisma.exam.count({
        where: {
          schoolId: ctx.schoolId,
          status: { in: ['SCHEDULED', 'MARKS_ENTRY'] },
          ...(academicYearId ? { academicYearId } : {}),
        },
      }),
      prisma.exam.count({
        where: {
          schoolId: ctx.schoolId,
          status: 'FINALIZED',
          ...(academicYearId ? { academicYearId } : {}),
        },
      }),
    ]);

    return {
      classesCount,
      subjectsCount,
      teachersAssigned: classTeachersCount + subjectTeachersCount,
      timetableSlotsCount,
      homeworkPublished: homeworkCount,
      upcomingExams: examsCount,
      marksEntryPending: pendingMarksExamsCount,
      resultsAwaitingPublication: resultsAwaitingPublicationCount,
    };
  }
}
