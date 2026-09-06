import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AttendanceService, ScopeContext } from './attendance.service.js';
import { ValidationError } from '../../lib/errors.js';

function getScopeContext(req: Request): ScopeContext {
  const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
  const rawSchoolId = req.headers['x-school-id'];
  const headerSchoolId = Array.isArray(rawSchoolId) ? rawSchoolId[0] : rawSchoolId;
  const schoolId =
    headerSchoolId ||
    (req as any).schoolId ||
    (req as any).user?.schoolId ||
    (req as any).user?.schools?.[0]?.id;

  if (!tenantId || !schoolId) {
    throw new ValidationError('Tenant and School context are required', {
      code: 'SCOPE_REQUIRED',
    });
  }

  const userPerms = (req as any).user?.permissions;
  const permissions: string[] = userPerms
    ? Array.from(userPerms).map((p: any) => String(p).toLowerCase())
    : [];

  if ((req as any).user?.isSuperadmin) {
    permissions.push('attendance.override');
  }

  return {
    tenantId,
    schoolId,
    userId: (req as any).user?.id || (req as any).userId,
    ipAddress: req.ip,
    permissions,
  };
}

function getParamString(param: any): string {
  if (Array.isArray(param)) return param[0] || '';
  return typeof param === 'string' ? param : '';
}

export class AttendanceController {
  // ==========================================
  // Overview
  // ==========================================
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined;
      const data = await AttendanceService.getOverview(ctx.schoolId, academicYearId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Holidays
  // ==========================================
  static async listHolidays(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined;
      const holidays = await AttendanceService.listHolidays(ctx.schoolId, academicYearId);
      res.json(holidays);
    } catch (err) {
      next(err);
    }
  }

  static async createHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const holiday = await AttendanceService.createHoliday(ctx, req.body);
      res.status(201).json(holiday);
    } catch (err) {
      next(err);
    }
  }

  static async updateHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const id = getParamString(req.params.id);
      const updated = await AttendanceService.updateHoliday(ctx, id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async deleteHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const id = getParamString(req.params.id);
      const result = await AttendanceService.deleteHoliday(ctx, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Student Attendance Register
  // ==========================================
  static async getStudentRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : '';
      const classId = typeof req.query.classId === 'string' ? req.query.classId : '';
      const sectionId = typeof req.query.sectionId === 'string' ? req.query.sectionId : undefined;
      const date = typeof req.query.date === 'string' ? req.query.date : '';
      const mode = typeof req.query.mode === 'string' ? req.query.mode : 'DAILY';

      const register = await AttendanceService.getStudentRegister(ctx.schoolId, {
        academicYearId,
        classId,
        sectionId: sectionId || undefined,
        date,
        mode,
      });
      res.json(register);
    } catch (err) {
      next(err);
    }
  }

  static async saveStudentRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const result = await AttendanceService.saveStudentRegister(ctx, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async correctStudentAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const id = getParamString(req.params.id);
      const result = await AttendanceService.correctStudentAttendance(ctx, id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getStudentSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const studentId = getParamString(req.params.studentId);
      const month = req.query.month ? Number(req.query.month) : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;

      const summary = await AttendanceService.getStudentAttendanceSummary(
        ctx.schoolId,
        studentId,
        { month, year }
      );
      res.json(summary);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Student Leave Requests
  // ==========================================
  static async listStudentLeaves(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const isParent = (req as any).user?.roles?.includes('Parent');
      const leaves = await AttendanceService.listStudentLeaves(ctx, {
        studentId: typeof req.query.studentId === 'string' ? req.query.studentId : undefined,
        academicYearId: typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        isParent,
      });
      res.json(leaves);
    } catch (err) {
      next(err);
    }
  }

  static async createStudentLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const isParent = (req as any).user?.roles?.includes('Parent');
      const leave = await AttendanceService.createStudentLeave(ctx, {
        ...req.body,
        isParent,
      });
      res.status(201).json(leave);
    } catch (err) {
      next(err);
    }
  }

  static async reviewStudentLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const id = getParamString(req.params.id);
      const updated = await AttendanceService.reviewStudentLeave(ctx, id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Staff Attendance & Geofence
  // ==========================================
  static async listStaffAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AttendanceService.listStaffAttendance(ctx.schoolId, {
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
        userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async staffCheckIn(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const attendance = await AttendanceService.staffCheckIn(ctx, req.body);
      res.status(200).json(attendance);
    } catch (err) {
      next(err);
    }
  }

  static async staffCheckOut(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const attendance = await AttendanceService.staffCheckOut(ctx, req.body);
      res.status(200).json(attendance);
    } catch (err) {
      next(err);
    }
  }

  static async manualStaffAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const id = req.params.id ? getParamString(req.params.id) : undefined;
      if (id) {
        const existing = await prisma.staffAttendance.findFirst({
          where: { id, schoolId: ctx.schoolId },
        });
        if (existing) {
          const record = await AttendanceService.correctStaffAttendance(ctx, id, req.body);
          return res.json(record);
        }
        if (req.body.date) {
          const record = await AttendanceService.manualStaffAttendance(ctx, {
            ...req.body,
            userId: req.body.userId || id,
          });
          return res.json(record);
        }
      }
      const record = await AttendanceService.manualStaffAttendance(ctx, req.body);
      res.json(record);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Staff Leave
  // ==========================================
  static async listStaffLeaves(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const leaves = await AttendanceService.listStaffLeaves(ctx.schoolId, {
        userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
      });
      res.json(leaves);
    } catch (err) {
      next(err);
    }
  }

  static async createStaffLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const leave = await AttendanceService.createStaffLeave(ctx, req.body);
      res.status(201).json(leave);
    } catch (err) {
      next(err);
    }
  }

  static async reviewStaffLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const id = getParamString(req.params.id);
      const updated = await AttendanceService.reviewStaffLeave(ctx, id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Reports & CSV Exports
  // ==========================================
  static async getDailyReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const date = (typeof req.query.date === 'string' ? req.query.date : undefined) || new Date().toISOString().split('T')[0];
      const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
      const sectionId = typeof req.query.sectionId === 'string' ? req.query.sectionId : undefined;

      const report = await AttendanceService.getDailyReport(ctx.schoolId, {
        date,
        classId,
        sectionId,
      });
      res.json(report);
    } catch (err) {
      next(err);
    }
  }

  static async getMonthlyReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const now = new Date();
      const month = req.query.month ? Number(req.query.month) : now.getUTCMonth() + 1;
      const year = req.query.year ? Number(req.query.year) : now.getUTCFullYear();
      const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
      const sectionId = typeof req.query.sectionId === 'string' ? req.query.sectionId : undefined;

      const report = await AttendanceService.getMonthlyStudentReport(ctx.schoolId, {
        month,
        year,
        classId,
        sectionId,
      });
      res.json(report);
    } catch (err) {
      next(err);
    }
  }

  static async exportReportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const reportType = (typeof req.query.type === 'string' ? req.query.type : undefined) || 'daily';
      const date = (typeof req.query.date === 'string' ? req.query.date : undefined) || new Date().toISOString().split('T')[0];

      let filename = `attendance_${reportType}_${date}.csv`;
      let csvContent = '';

      if (reportType === 'daily') {
        const data = await AttendanceService.getDailyReport(ctx.schoolId, {
          date,
          classId: typeof req.query.classId === 'string' ? req.query.classId : undefined,
          sectionId: typeof req.query.sectionId === 'string' ? req.query.sectionId : undefined,
        });

        const headers = ['Date', 'Student ID', 'Admission No', 'Student Name', 'Class', 'Section', 'Status', 'Remarks'];
        const rows = data.map((d) => [
          d.date,
          d.studentCode,
          d.admissionNumber,
          `"${d.studentName.replace(/"/g, '""')}"`,
          d.className,
          d.sectionName,
          d.status,
          `"${(d.remarks || '').replace(/"/g, '""')}"`,
        ]);
        csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      } else if (reportType === 'monthly') {
        const now = new Date();
        const month = req.query.month ? Number(req.query.month) : now.getUTCMonth() + 1;
        const year = req.query.year ? Number(req.query.year) : now.getUTCFullYear();
        filename = `attendance_monthly_${year}_${month}.csv`;

        const data = await AttendanceService.getMonthlyStudentReport(ctx.schoolId, {
          month,
          year,
          classId: typeof req.query.classId === 'string' ? req.query.classId : undefined,
          sectionId: typeof req.query.sectionId === 'string' ? req.query.sectionId : undefined,
        });

        const headers = ['Student ID', 'Admission No', 'Student Name', 'Class', 'Section', 'Working Days', 'Present', 'Absent', 'Late', 'Half Day', 'Excused', 'Leave', 'Percentage'];
        const rows = data.map((d) => [
          d.studentCode,
          d.admissionNumber,
          `"${d.studentName.replace(/"/g, '""')}"`,
          d.className,
          d.sectionName,
          d.workingDays,
          d.present,
          d.absent,
          d.late,
          d.halfDay,
          d.excused,
          d.leave,
          `${d.percentage}%`,
        ]);
        csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (err) {
      next(err);
    }
  }
}
