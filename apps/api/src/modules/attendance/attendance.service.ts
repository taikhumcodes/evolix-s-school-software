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

export interface ScopeContext {
  tenantId: string;
  schoolId: string;
  userId: string;
  ipAddress?: string;
  permissions?: string[];
}

/**
 * Haversine distance in meters between two lat/long points
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export class AttendanceService {
  /**
   * Helper: Determine if a day of week is a working day based on school configuration
   */
  static isWorkingDayOfWeek(date: Date, workingWeek: string = 'MON_SAT'): boolean {
    const day = date.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    if (workingWeek === 'MON_FRI') {
      return day >= 1 && day <= 5;
    }
    if (workingWeek === 'MON_SAT') {
      return day >= 1 && day <= 6;
    }
    // MON_SUN or 7-day
    return true;
  }

  /**
   * Helper: Check if a date is a holiday or non-working day for a school
   */
  static async checkDayStatus(
    schoolId: string,
    targetDateStr: string,
    workingWeek: string = 'MON_SAT'
  ): Promise<{
    isWorkingDay: boolean;
    isHoliday: boolean;
    holidayName?: string;
    isWorkingOverride: boolean;
  }> {
    const targetDate = new Date(`${targetDateStr}T00:00:00.000Z`);

    // Look for overlapping holiday
    const holiday = await prisma.schoolHoliday.findFirst({
      where: {
        schoolId,
        startDate: { lte: targetDate },
        OR: [{ endDate: null, startDate: targetDate }, { endDate: { gte: targetDate } }],
      },
    });

    if (holiday) {
      if (holiday.isWorkingOverride) {
        return {
          isWorkingDay: true,
          isHoliday: false,
          holidayName: holiday.name,
          isWorkingOverride: true,
        };
      }
      return {
        isWorkingDay: false,
        isHoliday: true,
        holidayName: holiday.name,
        isWorkingOverride: false,
      };
    }

    const isDayWorking = this.isWorkingDayOfWeek(targetDate, workingWeek);
    return {
      isWorkingDay: isDayWorking,
      isHoliday: false,
      isWorkingOverride: false,
    };
  }

  /**
   * Helper: Check if attendance for a date is locked according to school configuration
   */
  static isAttendanceLocked(
    attendanceDateStr: string,
    lockEnabled: boolean,
    lockHours: number
  ): boolean {
    if (!lockEnabled) return false;
    const targetDate = new Date(`${attendanceDateStr}T23:59:59.999Z`);
    const lockExpiryMs = targetDate.getTime() + lockHours * 60 * 60 * 1000;
    return Date.now() > lockExpiryMs;
  }

  // =========================================================================
  // 1. HOLIDAYS / CALENDAR
  // =========================================================================

  static async listHolidays(schoolId: string, academicYearId?: string) {
    return prisma.schoolHoliday.findMany({
      where: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      orderBy: { startDate: 'asc' },
    });
  }

  static async createHoliday(ctx: ScopeContext, data: any) {
    const startDate = new Date(`${data.startDate}T00:00:00.000Z`);
    const endDate = data.endDate ? new Date(`${data.endDate}T00:00:00.000Z`) : null;

    if (endDate && endDate < startDate) {
      throw new ValidationError('End date cannot be earlier than start date', {
        code: 'INVALID_DATE_RANGE',
      });
    }

    const holiday = await prisma.schoolHoliday.create({
      data: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        name: data.name,
        startDate,
        endDate,
        type: data.type || 'PUBLIC_HOLIDAY',
        description: data.description || null,
        isWorkingOverride: data.isWorkingOverride ?? false,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'HOLIDAY_CREATED',
      entityType: 'SchoolHoliday',
      entityId: holiday.id,
      afterData: holiday,
      ipAddress: ctx.ipAddress,
    });

    return holiday;
  }

  static async updateHoliday(ctx: ScopeContext, id: string, data: any) {
    const existing = await prisma.schoolHoliday.findFirst({
      where: { id, schoolId: ctx.schoolId },
    });
    if (!existing) {
      throw new NotFoundError('Holiday not found', { code: 'NOT_FOUND' });
    }

    const startDate = data.startDate
      ? new Date(`${data.startDate}T00:00:00.000Z`)
      : existing.startDate;
    const endDate = data.endDate !== undefined
      ? (data.endDate ? new Date(`${data.endDate}T00:00:00.000Z`) : null)
      : existing.endDate;

    if (endDate && endDate < startDate) {
      throw new ValidationError('End date cannot be earlier than start date', {
        code: 'INVALID_DATE_RANGE',
      });
    }

    const updated = await prisma.schoolHoliday.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        startDate,
        endDate,
        type: data.type ?? existing.type,
        description: data.description !== undefined ? data.description : existing.description,
        isWorkingOverride: data.isWorkingOverride !== undefined ? data.isWorkingOverride : existing.isWorkingOverride,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'HOLIDAY_UPDATED',
      entityType: 'SchoolHoliday',
      entityId: updated.id,
      beforeData: existing,
      afterData: updated,
      ipAddress: ctx.ipAddress,
    });

    return updated;
  }

  static async deleteHoliday(ctx: ScopeContext, id: string) {
    const existing = await prisma.schoolHoliday.findFirst({
      where: { id, schoolId: ctx.schoolId },
    });
    if (!existing) {
      throw new NotFoundError('Holiday not found', { code: 'NOT_FOUND' });
    }

    await prisma.schoolHoliday.delete({ where: { id } });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'HOLIDAY_DELETED',
      entityType: 'SchoolHoliday',
      entityId: id,
      beforeData: existing,
      ipAddress: ctx.ipAddress,
    });

    return { success: true };
  }

  // =========================================================================
  // 2. STUDENT ATTENDANCE REGISTER
  // =========================================================================

  static async getStudentRegister(
    schoolId: string,
    params: {
      academicYearId: string;
      classId: string;
      sectionId?: string;
      date: string;
      mode?: string;
    }
  ) {
    const targetDate = new Date(`${params.date}T00:00:00.000Z`);
    const mode = params.mode || 'DAILY';

    // 1. Get School Configuration
    const config = await prisma.schoolConfiguration.findUnique({
      where: { schoolId },
    });
    const workingWeek = config?.workingWeek || 'MON_SAT';
    const lockEnabled = config?.attendanceLockEnabled ?? true;
    const lockHours = config?.attendanceLockHours ?? 24;

    const dayStatus = await this.checkDayStatus(schoolId, params.date, workingWeek);
    const isLocked = this.isAttendanceLocked(params.date, lockEnabled, lockHours);

    // 2. Fetch eligible students actively enrolled on this date
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        academicYearId: params.academicYearId,
        classId: params.classId,
        ...(params.sectionId ? { sectionId: params.sectionId } : {}),
        enrollmentDate: { lte: targetDate },
        OR: [
          { completionDate: null },
          { completionDate: { gte: targetDate } },
        ],
        student: {
          admissionDate: { lte: targetDate },
          status: { in: ['ACTIVE', 'TRANSFERRED', 'WITHDRAWN'] },
          OR: [
            { statusChangeDate: null },
            { statusChangeDate: { gte: targetDate } },
          ],
        },
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
            gender: true,
            status: true,
          },
        },
      },
      orderBy: [
        { rollNumber: 'asc' },
        { student: { firstName: 'asc' } },
      ],
    });

    const studentIds = enrollments.map((e) => e.student.id);

    // 3. Fetch existing attendance records for this date & mode
    const existingAttendances = await prisma.studentAttendance.findMany({
      where: {
        schoolId,
        attendanceDate: targetDate,
        attendanceMode: mode,
        studentId: { in: studentIds },
      },
    });

    const attendanceMap = new Map(existingAttendances.map((a) => [a.studentId, a]));

    // 4. Fetch approved leaves overlapping this date
    const approvedLeaves = await prisma.studentLeave.findMany({
      where: {
        schoolId,
        studentId: { in: studentIds },
        status: 'APPROVED',
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
    });

    const leaveMap = new Map(approvedLeaves.map((l) => [l.studentId, l]));

    // 5. Construct Register Items
    const items = enrollments.map((enrollment) => {
      const existing = attendanceMap.get(enrollment.student.id);
      const leave = leaveMap.get(enrollment.student.id);

      let status = existing ? existing.status : leave ? 'LEAVE' : null;

      return {
        studentId: enrollment.student.id,
        enrollmentId: enrollment.id,
        studentCode: enrollment.student.studentId,
        admissionNumber: enrollment.student.admissionNumber,
        rollNumber: enrollment.rollNumber || null,
        name: enrollment.student.displayName || `${enrollment.student.firstName} ${enrollment.student.lastName || ''}`.trim(),
        gender: enrollment.student.gender,
        attendanceId: existing?.id || null,
        status,
        remarks: existing?.remarks || null,
        isLocked: existing?.isLocked ?? isLocked,
        hasApprovedLeave: Boolean(leave),
        leaveType: leave?.leaveType || null,
      };
    });

    const isMarked = items.some((i) => i.status !== null);
    const summary = {
      total: items.length,
      present: items.filter((i) => i.status === 'PRESENT').length,
      absent: items.filter((i) => i.status === 'ABSENT').length,
      late: items.filter((i) => i.status === 'LATE').length,
      halfDay: items.filter((i) => i.status === 'HALF_DAY').length,
      excused: items.filter((i) => i.status === 'EXCUSED').length,
      leave: items.filter((i) => i.status === 'LEAVE').length,
      unmarked: items.filter((i) => i.status === null).length,
    };

    return {
      date: params.date,
      academicYearId: params.academicYearId,
      classId: params.classId,
      sectionId: params.sectionId || null,
      mode,
      dayStatus,
      isLocked,
      isMarked,
      summary,
      items,
      students: items,
    };
  }

  static async saveStudentRegister(
    ctx: ScopeContext,
    data: {
      academicYearId: string;
      classId: string;
      sectionId?: string | null;
      date: string;
      mode?: string;
      records: Array<{
        studentId: string;
        status: string;
        remarks?: string | null;
      }>;
    }
  ) {
    const targetDate = new Date(`${data.date}T00:00:00.000Z`);
    const mode = data.mode || 'DAILY';

    // 1. Get School Configuration
    const config = await prisma.schoolConfiguration.findUnique({
      where: { schoolId: ctx.schoolId },
    });
    const workingWeek = config?.workingWeek || 'MON_SAT';
    const lockEnabled = config?.attendanceLockEnabled ?? true;
    const lockHours = config?.attendanceLockHours ?? 24;

    const dayStatus = await this.checkDayStatus(ctx.schoolId, data.date, workingWeek);
    const hasOverridePermission = ctx.permissions?.includes('attendance.override');

    // 2. Validate calendar / working day constraints
    if (!dayStatus.isWorkingDay && !hasOverridePermission) {
      if (dayStatus.isHoliday) {
        throw new BadRequestError(`Cannot mark attendance on holiday (${dayStatus.holidayName}) without override permission`, {
          code: 'HOLIDAY',
        });
      }
      throw new BadRequestError('Cannot mark attendance on a non-working day without override permission', {
        code: 'NON_WORKING_DAY',
      });
    }

    // 3. Validate attendance locking
    const isLocked = this.isAttendanceLocked(data.date, lockEnabled, lockHours);
    if (isLocked && !hasOverridePermission) {
      throw new BadRequestError('Attendance for this date is locked and cannot be modified', {
        code: 'ATTENDANCE_LOCKED',
      });
    }

    // 4. Validate students belong to class/section and are eligible
    const studentIds = data.records.map((r) => r.studentId);
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId: ctx.schoolId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        ...(data.sectionId ? { sectionId: data.sectionId } : {}),
        studentId: { in: studentIds },
        enrollmentDate: { lte: targetDate },
        OR: [{ completionDate: null }, { completionDate: { gte: targetDate } }],
        student: {
          admissionDate: { lte: targetDate },
        },
      },
    });

    const enrollmentMap = new Map(enrollments.map((e) => [e.studentId, e]));

    // 5. Execute transactional upsert
    const savedRecords = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const record of data.records) {
        const enrollment = enrollmentMap.get(record.studentId);
        if (!enrollment) {
          throw new ValidationError(`Student ${record.studentId} is not actively enrolled in this class/section on this date`, {
            code: 'STUDENT_NOT_ENROLLED',
          });
        }

        const upserted = await tx.studentAttendance.upsert({
          where: {
            schoolId_studentId_attendanceDate_attendanceMode: {
              schoolId: ctx.schoolId,
              studentId: record.studentId,
              attendanceDate: targetDate,
              attendanceMode: mode,
            },
          },
          update: {
            classId: data.classId,
            sectionId: data.sectionId || null,
            enrollmentId: enrollment.id,
            status: record.status,
            remarks: record.remarks || null,
            markedBy: ctx.userId,
            isLocked,
            lockedAt: isLocked ? new Date() : null,
          },
          create: {
            tenantId: ctx.tenantId,
            schoolId: ctx.schoolId,
            academicYearId: data.academicYearId,
            studentId: record.studentId,
            classId: data.classId,
            sectionId: data.sectionId || null,
            enrollmentId: enrollment.id,
            attendanceDate: targetDate,
            attendanceMode: mode,
            status: record.status,
            remarks: record.remarks || null,
            markedBy: ctx.userId,
            isLocked,
            lockedAt: isLocked ? new Date() : null,
          },
        });
        results.push(upserted);
      }
      return results;
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: isLocked ? 'STUDENT_ATTENDANCE_OVERRIDE' : 'STUDENT_ATTENDANCE_MARKED',
      entityType: 'StudentAttendance',
      entityId: `${ctx.schoolId}:${data.classId}:${data.date}`,
      metadataInfo: {
        recordsCount: savedRecords.length,
        classId: data.classId,
        sectionId: data.sectionId,
        date: data.date,
        isOverride: isLocked,
      },
      ipAddress: ctx.ipAddress,
    });

    const summary = {
      total: savedRecords.length,
      present: savedRecords.filter((r) => r.status === 'PRESENT').length,
      absent: savedRecords.filter((r) => r.status === 'ABSENT').length,
      late: savedRecords.filter((r) => r.status === 'LATE').length,
      halfDay: savedRecords.filter((r) => r.status === 'HALF_DAY').length,
      excused: savedRecords.filter((r) => r.status === 'EXCUSED').length,
      leave: savedRecords.filter((r) => r.status === 'LEAVE').length,
    };

    return {
      success: true,
      savedCount: savedRecords.length,
      date: data.date,
      summary,
    };
  }

  static async correctStudentAttendance(
    ctx: ScopeContext,
    attendanceId: string,
    data: { newStatus: string; reason: string }
  ) {
    const existing = await prisma.studentAttendance.findFirst({
      where: { id: attendanceId, schoolId: ctx.schoolId },
      include: { student: true },
    });

    if (!existing) {
      throw new NotFoundError('Attendance record not found', { code: 'NOT_FOUND' });
    }

    const config = await prisma.schoolConfiguration.findUnique({
      where: { schoolId: ctx.schoolId },
    });
    const lockEnabled = config?.attendanceLockEnabled ?? true;
    const lockHours = config?.attendanceLockHours ?? 24;
    const correctionAllowed = config?.attendanceCorrectionAllowed ?? true;
    const reasonRequired = config?.attendanceCorrectionReasonRequired ?? true;
    const hasOverride = ctx.permissions?.includes('attendance.override');

    if (!correctionAllowed && !hasOverride) {
      throw new ForbiddenError('Attendance corrections are disabled by school policy', {
        code: 'CORRECTION_NOT_ALLOWED',
      });
    }

    if (reasonRequired && (!data.reason || !data.reason.trim())) {
      throw new ValidationError('Correction reason is mandatory', {
        code: 'REASON_REQUIRED',
      });
    }

    const dateStr = existing.attendanceDate.toISOString().split('T')[0];
    const isLocked = this.isAttendanceLocked(dateStr, lockEnabled, lockHours);
    if (isLocked && !hasOverride) {
      throw new ForbiddenError('Locked attendance cannot be modified without override permission', {
        code: 'ATTENDANCE_LOCKED',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Record correction history
      const correction = await tx.studentAttendanceCorrection.create({
        data: {
          tenantId: ctx.tenantId,
          schoolId: ctx.schoolId,
          attendanceId: existing.id,
          oldStatus: existing.status,
          newStatus: data.newStatus,
          reason: data.reason.trim(),
          changedBy: ctx.userId,
        },
      });

      // Update attendance status
      const updated = await tx.studentAttendance.update({
        where: { id: existing.id },
        data: {
          status: data.newStatus,
          isLocked,
        },
      });

      return { updated, correction };
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: isLocked ? 'STUDENT_ATTENDANCE_OVERRIDE' : 'STUDENT_ATTENDANCE_CORRECTED',
      entityType: 'StudentAttendance',
      entityId: existing.id,
      beforeData: { status: existing.status },
      afterData: { status: data.newStatus, reason: data.reason },
      ipAddress: ctx.ipAddress,
    });

    return {
      ...result.updated,
      record: result.updated,
      correction: result.correction,
    };
  }

  // =========================================================================
  // 3. STUDENT LEAVE
  // =========================================================================

  static async listStudentLeaves(
    ctx: ScopeContext,
    params: {
      studentId?: string;
      academicYearId?: string;
      status?: string;
      isParent?: boolean;
    }
  ) {
    // If request is from a parent, enforce that they only see their linked children
    let authorizedStudentIds: string[] | undefined;
    if (params.isParent) {
      const guardian = await prisma.guardian.findUnique({
        where: { userId: ctx.userId },
        include: { students: true },
      });
      if (!guardian) {
        return [];
      }
      authorizedStudentIds = guardian.students.map((sg: any) => sg.studentId);
      if (params.studentId && !authorizedStudentIds.includes(params.studentId)) {
        throw new ForbiddenError('Unauthorized access to student leave requests', {
          code: 'FORBIDDEN',
        });
      }
    }

    return prisma.studentLeave.findMany({
      where: {
        schoolId: ctx.schoolId,
        ...(params.studentId ? { studentId: params.studentId } : {}),
        ...(authorizedStudentIds ? { studentId: { in: authorizedStudentIds } } : {}),
        ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
        ...(params.status ? { status: params.status } : {}),
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
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createStudentLeave(
    ctx: ScopeContext,
    data: {
      studentId: string;
      academicYearId?: string;
      startDate: string;
      endDate: string;
      leaveType: string;
      reason: string;
      isParent?: boolean;
      attachmentKey?: string | null;
      attachmentName?: string | null;
      mimeType?: string | null;
      fileSize?: number | null;
    }
  ) {
    const startDate = new Date(`${data.startDate}T00:00:00.000Z`);
    const endDate = new Date(`${data.endDate}T00:00:00.000Z`);

    if (endDate < startDate) {
      throw new ValidationError('End date cannot be earlier than start date', {
        code: 'INVALID_LEAVE_RANGE',
      });
    }

    // Check parent child authorization
    const guardian = await prisma.guardian.findUnique({
      where: { userId: ctx.userId },
      include: { students: true },
    });
    if (guardian) {
      const isLinked = guardian.students.some((sg: any) => sg.studentId === data.studentId);
      if (!isLinked) {
        throw new ForbiddenError('Parent cannot submit leave for an unlinked student', {
          code: 'FORBIDDEN',
        });
      }
    }

    // Determine academicYearId if not provided
    let ayId = data.academicYearId;
    if (!ayId) {
      const currentAy = await prisma.academicYear.findFirst({
        where: { schoolId: ctx.schoolId, isCurrent: true },
      });
      ayId = currentAy?.id;
    }
    if (!ayId) {
      throw new ValidationError('Academic year is required for leave request', {
        code: 'ACADEMIC_YEAR_REQUIRED',
      });
    }

    const leave = await prisma.studentLeave.create({
      data: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        studentId: data.studentId,
        academicYearId: ayId,
        startDate,
        endDate,
        leaveType: data.leaveType,
        reason: data.reason.trim(),
        attachmentKey: data.attachmentKey || null,
        attachmentName: data.attachmentName || null,
        mimeType: data.mimeType || null,
        fileSize: data.fileSize || null,
        status: 'PENDING',
        requestedBy: ctx.userId,
        isParentRequest: Boolean(data.isParent || guardian),
      },
      include: {
        student: true,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'STUDENT_LEAVE_CREATED',
      entityType: 'StudentLeave',
      entityId: leave.id,
      afterData: {
        studentId: leave.studentId,
        startDate: data.startDate,
        endDate: data.endDate,
        leaveType: leave.leaveType,
      },
      ipAddress: ctx.ipAddress,
    });

    return leave;
  }

  static async reviewStudentLeave(
    ctx: ScopeContext,
    leaveId: string,
    data: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string | null }
  ) {
    const existing = await prisma.studentLeave.findFirst({
      where: { id: leaveId, schoolId: ctx.schoolId },
    });

    if (!existing) {
      throw new NotFoundError('Leave request not found', { code: 'NOT_FOUND' });
    }

    if (existing.status !== 'PENDING') {
      throw new ValidationError(`Leave request is already ${existing.status.toLowerCase()}`, {
        code: 'LEAVE_ALREADY_REVIEWED',
      });
    }

    if (data.action === 'REJECT' && (!data.rejectionReason || !data.rejectionReason.trim())) {
      throw new ValidationError('Rejection reason is required', {
        code: 'REJECTION_REASON_REQUIRED',
      });
    }

    const updatedStatus = data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await prisma.studentLeave.update({
      where: { id: leaveId },
      data: {
        status: updatedStatus,
        approvedBy: ctx.userId,
        approvedAt: new Date(),
        rejectionReason: data.action === 'REJECT' ? data.rejectionReason?.trim() : null,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: data.action === 'APPROVE' ? 'STUDENT_LEAVE_APPROVED' : 'STUDENT_LEAVE_REJECTED',
      entityType: 'StudentLeave',
      entityId: leaveId,
      beforeData: { status: existing.status },
      afterData: { status: updatedStatus, rejectionReason: data.rejectionReason },
      ipAddress: ctx.ipAddress,
    });

    return updated;
  }

  // =========================================================================
  // 4. STAFF ATTENDANCE & GEOFENCE
  // =========================================================================

  static async listStaffAttendance(
    schoolId: string,
    params: {
      date?: string;
      startDate?: string;
      endDate?: string;
      userId?: string;
    }
  ) {
    return prisma.staffAttendance.findMany({
      where: {
        schoolId,
        ...(params.userId ? { userId: params.userId } : {}),
        ...(params.date
          ? { attendanceDate: new Date(`${params.date}T00:00:00.000Z`) }
          : {}),
        ...(params.startDate && params.endDate
          ? {
              attendanceDate: {
                gte: new Date(`${params.startDate}T00:00:00.000Z`),
                lte: new Date(`${params.endDate}T00:00:00.000Z`),
              },
            }
          : {}),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [{ attendanceDate: 'desc' }, { checkInAt: 'desc' }],
    });
  }

  static async staffCheckIn(
    ctx: ScopeContext,
    data: { latitude: number; longitude: number; remarks?: string | null }
  ) {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    // 1. Get School Configuration & Geofence Settings
    const config = await prisma.schoolConfiguration.findUnique({
      where: { schoolId: ctx.schoolId },
    });

    let distanceMeters: number | null = null;
    const geofenceEnabled = config?.teacherGeofenceEnabled !== false && Boolean(config?.latitude && config?.longitude);
    const allowedRadius = config?.teacherGeofenceRadiusMeters ?? 100;

    if (geofenceEnabled) {
      if (!config?.latitude || !config?.longitude) {
        throw new BadRequestError('School location coordinates are not configured. Please contact administrator.', {
          code: 'SCHOOL_COORDINATES_MISSING',
        });
      }

      distanceMeters = calculateHaversineDistanceMeters(
        data.latitude,
        data.longitude,
        Number(config.latitude),
        Number(config.longitude)
      );

      if (distanceMeters > allowedRadius) {
        throw new BadRequestError(
          `Outside school geofence boundary. Distance: ${distanceMeters}m (Allowed radius: ${allowedRadius}m)`,
          {
            code: 'OUTSIDE_GEOFENCE',
            distanceMeters,
            allowedRadiusMeters: allowedRadius,
          }
        );
      }
    }

    // 2. Check if already checked in today
    const existing = await prisma.staffAttendance.findUnique({
      where: {
        schoolId_userId_attendanceDate: {
          schoolId: ctx.schoolId,
          userId: ctx.userId,
          attendanceDate: todayDate,
        },
      },
    });

    if (existing && existing.checkInAt) {
      throw new ConflictError('You have already checked in for today', {
        code: 'CHECKIN_ALREADY_EXISTS',
        checkInAt: existing.checkInAt,
      });
    }

    const now = new Date();
    const attendance = await prisma.staffAttendance.upsert({
      where: {
        schoolId_userId_attendanceDate: {
          schoolId: ctx.schoolId,
          userId: ctx.userId,
          attendanceDate: todayDate,
        },
      },
      update: {
        status: 'PRESENT',
        checkInAt: now,
        checkInDistanceMeters: distanceMeters !== null ? new Prisma.Decimal(distanceMeters) : null,
        checkInIp: ctx.ipAddress || null,
        remarks: data.remarks || undefined,
      },
      create: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        userId: ctx.userId,
        attendanceDate: todayDate,
        status: 'PRESENT',
        checkInAt: now,
        checkInDistanceMeters: distanceMeters !== null ? new Prisma.Decimal(distanceMeters) : null,
        checkInIp: ctx.ipAddress || null,
        remarks: data.remarks || null,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'STAFF_CHECKED_IN',
      entityType: 'StaffAttendance',
      entityId: attendance.id,
      metadataInfo: {
        distanceMeters,
        allowedRadiusMeters: allowedRadius,
        geofenceEnabled,
      },
      ipAddress: ctx.ipAddress,
    });

    return {
      ...attendance,
      record: attendance,
      distanceMeters,
      isInsideGeofence: true,
    };
  }

  static async staffCheckOut(
    ctx: ScopeContext,
    data: { latitude?: number | null; longitude?: number | null; remarks?: string | null }
  ) {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    const existing = await prisma.staffAttendance.findUnique({
      where: {
        schoolId_userId_attendanceDate: {
          schoolId: ctx.schoolId,
          userId: ctx.userId,
          attendanceDate: todayDate,
        },
      },
    });

    if (!existing || !existing.checkInAt) {
      throw new BadRequestError('Cannot check out without checking in first', {
        code: 'CHECKOUT_WITHOUT_CHECKIN',
      });
    }

    let distanceMeters: number | null = null;
    if (data.latitude !== undefined && data.latitude !== null && data.longitude !== undefined && data.longitude !== null) {
      const config = await prisma.schoolConfiguration.findUnique({
        where: { schoolId: ctx.schoolId },
      });
      if (config?.latitude && config?.longitude) {
        distanceMeters = calculateHaversineDistanceMeters(
          data.latitude,
          data.longitude,
          Number(config.latitude),
          Number(config.longitude)
        );
      }
    }

    const now = new Date();
    const updated = await prisma.staffAttendance.update({
      where: { id: existing.id },
      data: {
        checkOutAt: now,
        checkOutDistanceMeters: distanceMeters !== null ? new Prisma.Decimal(distanceMeters) : null,
        checkOutIp: ctx.ipAddress || null,
        remarks: data.remarks !== undefined ? data.remarks : existing.remarks,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'STAFF_CHECKED_OUT',
      entityType: 'StaffAttendance',
      entityId: updated.id,
      metadataInfo: { distanceMeters },
      ipAddress: ctx.ipAddress,
    });

    return {
      ...updated,
      record: updated,
      distanceMeters,
    };
  }

  static async correctStaffAttendance(
    ctx: ScopeContext,
    attendanceId: string,
    data: {
      status: string;
      reason?: string;
      correctionReason?: string;
      remarks?: string | null;
    }
  ) {
    const existing = await prisma.staffAttendance.findFirst({
      where: { id: attendanceId, schoolId: ctx.schoolId },
    });
    if (!existing) {
      throw new NotFoundError('Staff attendance record not found', { code: 'NOT_FOUND' });
    }

    const reason = (data.reason || data.correctionReason || '').trim();
    if (!reason) {
      throw new ValidationError('Correction reason is required', { code: 'REASON_REQUIRED' });
    }

    const updated = await prisma.staffAttendance.update({
      where: { id: attendanceId },
      data: {
        status: data.status,
        isManualCorrection: true,
        correctedBy: ctx.userId,
        correctionReason: reason,
        remarks: data.remarks !== undefined ? data.remarks : existing.remarks,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'STAFF_ATTENDANCE_CORRECTED',
      entityType: 'StaffAttendance',
      entityId: attendanceId,
      metadataInfo: {
        targetUserId: existing.userId,
        status: data.status,
        reason,
      },
      ipAddress: ctx.ipAddress,
    });

    return updated;
  }

  static async manualStaffAttendance(
    ctx: ScopeContext,
    data: {
      userId?: string;
      date?: string;
      status: string;
      reason?: string;
      correctionReason?: string;
      remarks?: string | null;
    }
  ) {
    if (!data.userId || !data.date) {
      throw new ValidationError('User ID and date are required for manual staff attendance', {
        code: 'USER_AND_DATE_REQUIRED',
      });
    }

    const reason = (data.reason || data.correctionReason || '').trim();
    if (!reason) {
      throw new ValidationError('Correction reason is required', { code: 'REASON_REQUIRED' });
    }

    const targetDate = new Date(`${data.date}T00:00:00.000Z`);

    const record = await prisma.staffAttendance.upsert({
      where: {
        schoolId_userId_attendanceDate: {
          schoolId: ctx.schoolId,
          userId: data.userId,
          attendanceDate: targetDate,
        },
      },
      update: {
        status: data.status,
        isManualCorrection: true,
        correctedBy: ctx.userId,
        correctionReason: reason,
        remarks: data.remarks || undefined,
      },
      create: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        userId: data.userId,
        attendanceDate: targetDate,
        status: data.status,
        isManualCorrection: true,
        correctedBy: ctx.userId,
        correctionReason: reason,
        remarks: data.remarks || null,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'STAFF_ATTENDANCE_CORRECTED',
      entityType: 'StaffAttendance',
      entityId: record.id,
      metadataInfo: {
        targetUserId: data.userId,
        status: data.status,
        reason,
      },
      ipAddress: ctx.ipAddress,
    });

    return record;
  }

  // =========================================================================
  // 5. STAFF LEAVE
  // =========================================================================

  static async listStaffLeaves(
    schoolId: string,
    params: { userId?: string; status?: string }
  ) {
    return prisma.staffLeave.findMany({
      where: {
        schoolId,
        ...(params.userId ? { userId: params.userId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createStaffLeave(
    ctx: ScopeContext,
    data: {
      startDate: string;
      endDate: string;
      leaveType: string;
      reason: string;
      attachmentKey?: string | null;
      attachmentName?: string | null;
    }
  ) {
    const startDate = new Date(`${data.startDate}T00:00:00.000Z`);
    const endDate = new Date(`${data.endDate}T00:00:00.000Z`);

    if (endDate < startDate) {
      throw new ValidationError('End date cannot be earlier than start date', {
        code: 'INVALID_LEAVE_RANGE',
      });
    }

    const leave = await prisma.staffLeave.create({
      data: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        userId: ctx.userId,
        startDate,
        endDate,
        leaveType: data.leaveType,
        reason: data.reason.trim(),
        attachmentKey: data.attachmentKey || null,
        attachmentName: data.attachmentName || null,
        status: 'PENDING',
      },
      include: { user: true },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: 'STAFF_LEAVE_CREATED',
      entityType: 'StaffLeave',
      entityId: leave.id,
      metadataInfo: { startDate: data.startDate, endDate: data.endDate, leaveType: data.leaveType },
      ipAddress: ctx.ipAddress,
    });

    return leave;
  }

  static async reviewStaffLeave(
    ctx: ScopeContext,
    leaveId: string,
    data: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string | null }
  ) {
    const existing = await prisma.staffLeave.findFirst({
      where: { id: leaveId, schoolId: ctx.schoolId },
    });

    if (!existing) {
      throw new NotFoundError('Staff leave not found', { code: 'NOT_FOUND' });
    }

    if (existing.status !== 'PENDING') {
      throw new ValidationError(`Staff leave is already ${existing.status.toLowerCase()}`, {
        code: 'LEAVE_ALREADY_REVIEWED',
      });
    }

    if (data.action === 'REJECT' && (!data.rejectionReason || !data.rejectionReason.trim())) {
      throw new ValidationError('Rejection reason is required', {
        code: 'REJECTION_REASON_REQUIRED',
      });
    }

    const updatedStatus = data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await prisma.staffLeave.update({
      where: { id: leaveId },
      data: {
        status: updatedStatus,
        approvedBy: ctx.userId,
        approvedAt: new Date(),
        rejectionReason: data.action === 'REJECT' ? data.rejectionReason?.trim() : null,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: data.action === 'APPROVE' ? 'STAFF_LEAVE_APPROVED' : 'STAFF_LEAVE_REJECTED',
      entityType: 'StaffLeave',
      entityId: leaveId,
      beforeData: { status: existing.status },
      afterData: { status: updatedStatus, rejectionReason: data.rejectionReason },
      ipAddress: ctx.ipAddress,
    });

    return updated;
  }

  // =========================================================================
  // 6. OVERVIEW & REPORTS
  // =========================================================================

  static async getOverview(schoolId: string, academicYearId?: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    // Student counts for today
    const studentAttendanceCounts = await prisma.studentAttendance.groupBy({
      by: ['status'],
      where: {
        schoolId,
        attendanceDate: todayDate,
        ...(academicYearId ? { academicYearId } : {}),
      },
      _count: { _all: true },
    });

    const studentMap = Object.fromEntries(studentAttendanceCounts.map((c) => [c.status, c._count._all]));

    // Staff counts for today
    const staffAttendanceCounts = await prisma.staffAttendance.groupBy({
      by: ['status'],
      where: {
        schoolId,
        attendanceDate: todayDate,
      },
      _count: { _all: true },
    });
    const staffMap = Object.fromEntries(staffAttendanceCounts.map((c) => [c.status, c._count._all]));

    // Pending student leaves
    const pendingStudentLeaves = await prisma.studentLeave.count({
      where: { schoolId, status: 'PENDING' },
    });

    // Class sections marked today
    const allSections = await prisma.classSection.findMany({
      where: { schoolId },
      include: { class: true, section: true },
    });

    const markedSectionsCount = await prisma.studentAttendance.groupBy({
      by: ['classId', 'sectionId'],
      where: {
        schoolId,
        attendanceDate: todayDate,
      },
    });

    return {
      date: todayStr,
      students: {
        present: studentMap['PRESENT'] || 0,
        absent: studentMap['ABSENT'] || 0,
        late: studentMap['LATE'] || 0,
        halfDay: studentMap['HALF_DAY'] || 0,
        excused: studentMap['EXCUSED'] || 0,
        leave: studentMap['LEAVE'] || 0,
      },
      staff: {
        present: staffMap['PRESENT'] || 0,
        absent: staffMap['ABSENT'] || 0,
        late: staffMap['LATE'] || 0,
        leave: staffMap['LEAVE'] || 0,
      },
      pendingStudentLeaves,
      classes: {
        total: allSections.length,
        marked: markedSectionsCount.length,
        unmarked: Math.max(0, allSections.length - markedSectionsCount.length),
      },
    };
  }

  static async getStudentAttendanceSummary(
    schoolId: string,
    studentId: string,
    params: { month?: number; year?: number }
  ) {
    const config = await prisma.schoolConfiguration.findUnique({ where: { schoolId } });
    const workingWeek = config?.workingWeek || 'MON_SAT';

    const now = new Date();
    const month = params.month || now.getUTCMonth() + 1;
    const year = params.year || now.getUTCFullYear();

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const effectiveEnd = endOfMonth > now ? now : endOfMonth;

    // Student enrollment check with strict school isolation
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      include: {
        enrollments: {
          where: { schoolId },
          orderBy: { enrollmentDate: 'desc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundError('Student not found in this school', { code: 'NOT_FOUND' });
    }

    const latestEnrollment = student.enrollments[0];
    const admissionDate = student.admissionDate;
    const completionDate = latestEnrollment?.completionDate;

    // Fetch holidays in this month
    const holidays = await prisma.schoolHoliday.findMany({
      where: {
        schoolId,
        startDate: { lte: endOfMonth },
        OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
      },
    });

    // Calculate total valid working days denominator
    let workingDaysCount = 0;
    const curr = new Date(startOfMonth);
    while (curr <= effectiveEnd) {
      const isAfterAdmission = curr >= admissionDate;
      const isBeforeCompletion = !completionDate || curr <= completionDate;

      if (isAfterAdmission && isBeforeCompletion) {
        // Check holiday
        const hol = holidays.find((h) => {
          const s = new Date(h.startDate);
          const e = h.endDate ? new Date(h.endDate) : s;
          return curr >= s && curr <= e;
        });

        if (hol) {
          if (hol.isWorkingOverride) workingDaysCount++;
        } else {
          if (this.isWorkingDayOfWeek(curr, workingWeek)) workingDaysCount++;
        }
      }
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // Fetch student attendances in this month
    const attendances = await prisma.studentAttendance.findMany({
      where: {
        schoolId,
        studentId,
        attendanceDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { attendanceDate: 'desc' },
    });

    const counts = {
      present: attendances.filter((a) => a.status === 'PRESENT').length,
      absent: attendances.filter((a) => a.status === 'ABSENT').length,
      late: attendances.filter((a) => a.status === 'LATE').length,
      halfDay: attendances.filter((a) => a.status === 'HALF_DAY').length,
      excused: attendances.filter((a) => a.status === 'EXCUSED').length,
      leave: attendances.filter((a) => a.status === 'LEAVE').length,
    };

    // Attendance percentage calculation: (present + halfDay * 0.5 + excused) / workingDaysCount * 100
    const weightedPresent = counts.present + counts.halfDay * 0.5 + counts.excused;
    const percentage = workingDaysCount > 0
      ? Math.min(100, Math.round((weightedPresent / workingDaysCount) * 10000) / 100)
      : 0;

    return {
      studentId,
      month,
      year,
      workingDays: workingDaysCount,
      counts,
      percentage,
      recentRecords: attendances.slice(0, 30),
    };
  }

  static async getDailyReport(
    schoolId: string,
    params: { date: string; classId?: string; sectionId?: string }
  ) {
    const dateStr = params.date.split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const records = await prisma.studentAttendance.findMany({
      where: {
        schoolId,
        attendanceDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        ...(params.classId ? { classId: params.classId } : {}),
        ...(params.sectionId ? { sectionId: params.sectionId } : {}),
      },
      include: {
        student: {
          select: { id: true, studentId: true, admissionNumber: true, firstName: true, lastName: true, displayName: true },
        },
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
      },
      orderBy: [
        { class: { displayOrder: 'asc' } },
        { student: { firstName: 'asc' } },
      ],
    });

    return records.map((r) => ({
      id: r.id,
      date: params.date,
      studentCode: r.student.studentId,
      admissionNumber: r.student.admissionNumber,
      studentName: r.student.displayName || `${r.student.firstName} ${r.student.lastName || ''}`.trim(),
      className: r.class.name,
      sectionName: r.section?.name || '—',
      status: r.status,
      remarks: r.remarks || '',
    }));
  }

  static async getMonthlyStudentReport(
    schoolId: string,
    params: { month: number; year: number; classId?: string; sectionId?: string }
  ) {
    const startOfMonth = new Date(Date.UTC(params.year, params.month - 1, 1));
    const endOfMonth = new Date(Date.UTC(params.year, params.month, 0, 23, 59, 59, 999));

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        ...(params.classId ? { classId: params.classId } : {}),
        ...(params.sectionId ? { sectionId: params.sectionId } : {}),
        enrollmentDate: { lte: endOfMonth },
        OR: [{ completionDate: null }, { completionDate: { gte: startOfMonth } }],
      },
      include: {
        student: true,
        class: true,
        section: true,
      },
    });

    const summaries = [];
    for (const enr of enrollments) {
      const sum = await this.getStudentAttendanceSummary(schoolId, enr.student.id, {
        month: params.month,
        year: params.year,
      });
      summaries.push({
        studentId: enr.student.id,
        studentCode: enr.student.studentId,
        admissionNumber: enr.student.admissionNumber,
        studentName: enr.student.displayName || `${enr.student.firstName} ${enr.student.lastName || ''}`.trim(),
        className: enr.class.name,
        sectionName: enr.section?.name || '—',
        workingDays: sum.workingDays,
        present: sum.counts.present,
        absent: sum.counts.absent,
        late: sum.counts.late,
        halfDay: sum.counts.halfDay,
        excused: sum.counts.excused,
        leave: sum.counts.leave,
        percentage: sum.percentage,
      });
    }

    return summaries;
  }
}
