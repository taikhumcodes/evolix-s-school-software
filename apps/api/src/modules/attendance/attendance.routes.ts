import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions, requireAnyPermission } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { AttendanceController } from './attendance.controller.js';
import {
  createHolidaySchema,
  updateHolidaySchema,
  getRegisterQuerySchema,
  saveRegisterSchema,
  correctAttendanceSchema,
  createStudentLeaveSchema,
  reviewStudentLeaveSchema,
  staffCheckInSchema,
  staffCheckOutSchema,
  manualStaffAttendanceSchema,
  createStaffLeaveSchema,
  reviewStaffLeaveSchema,
} from './attendance.schema.js';

// =========================================================================
// Main Router mounted at /api/v1/attendance
// =========================================================================
export const attendanceRouter = Router();
attendanceRouter.use(authenticate);

// 1. Overview
attendanceRouter.get(
  '/overview',
  requireAnyPermission(['attendance.view', 'attendance.manage', 'staff_attendance.view']),
  AttendanceController.getOverview
);

// 2. Holidays
attendanceRouter.get(
  '/holidays',
  requireAnyPermission(['holidays.view', 'holidays.manage', 'attendance.view', 'attendance.mark']),
  AttendanceController.listHolidays
);
attendanceRouter.post(
  '/holidays',
  requirePermissions(['holidays.manage']),
  validateRequest({ body: createHolidaySchema }),
  AttendanceController.createHoliday
);
attendanceRouter.patch(
  '/holidays/:id',
  requirePermissions(['holidays.manage']),
  validateRequest({ body: updateHolidaySchema }),
  AttendanceController.updateHoliday
);
attendanceRouter.delete(
  '/holidays/:id',
  requirePermissions(['holidays.manage']),
  AttendanceController.deleteHoliday
);

// 3. Student Attendance
attendanceRouter.get(
  '/students/register',
  requireAnyPermission(['attendance.view', 'attendance.mark', 'attendance.manage']),
  validateRequest({ query: getRegisterQuerySchema }),
  AttendanceController.getStudentRegister
);
attendanceRouter.get(
  '/register',
  requireAnyPermission(['attendance.view', 'attendance.mark', 'attendance.manage']),
  validateRequest({ query: getRegisterQuerySchema }),
  AttendanceController.getStudentRegister
);
attendanceRouter.post(
  '/students/register',
  requireAnyPermission(['attendance.mark', 'attendance.manage', 'attendance.override']),
  validateRequest({ body: saveRegisterSchema }),
  AttendanceController.saveStudentRegister
);
attendanceRouter.post(
  '/register',
  requireAnyPermission(['attendance.mark', 'attendance.manage', 'attendance.override']),
  validateRequest({ body: saveRegisterSchema }),
  AttendanceController.saveStudentRegister
);
attendanceRouter.post(
  '/students/save',
  requireAnyPermission(['attendance.mark', 'attendance.manage', 'attendance.override']),
  validateRequest({ body: saveRegisterSchema }),
  AttendanceController.saveStudentRegister
);
attendanceRouter.get(
  '/student-register',
  requireAnyPermission(['attendance.view', 'attendance.mark', 'attendance.manage']),
  validateRequest({ query: getRegisterQuerySchema }),
  AttendanceController.getStudentRegister
);
attendanceRouter.post(
  '/student-register',
  requireAnyPermission(['attendance.mark', 'attendance.manage', 'attendance.override']),
  validateRequest({ body: saveRegisterSchema }),
  AttendanceController.saveStudentRegister
);
attendanceRouter.patch(
  '/student-register/:id',
  requireAnyPermission(['attendance.manage', 'attendance.override']),
  validateRequest({ body: correctAttendanceSchema }),
  AttendanceController.correctStudentAttendance
);
attendanceRouter.patch(
  '/students/:id/correct',
  requireAnyPermission(['attendance.manage', 'attendance.override']),
  validateRequest({ body: correctAttendanceSchema }),
  AttendanceController.correctStudentAttendance
);
attendanceRouter.get(
  '/students/:studentId/summary',
  requireAnyPermission([
    'attendance.view',
    'parent.attendance.view',
    'students.view',
    'parent.children.view',
  ]),
  AttendanceController.getStudentSummary
);

// 4. Student Leave
attendanceRouter.get(
  '/student-leave',
  requireAnyPermission([
    'student_leave.view',
    'student_leave.manage',
    'student_leave.approve',
    'parent.leave.view',
  ]),
  AttendanceController.listStudentLeaves
);
attendanceRouter.post(
  '/student-leave',
  requireAnyPermission(['student_leave.manage', 'parent.leave.create']),
  validateRequest({ body: createStudentLeaveSchema }),
  AttendanceController.createStudentLeave
);
attendanceRouter.post(
  '/student-leave/:id/review',
  requirePermissions(['student_leave.approve']),
  validateRequest({ body: reviewStudentLeaveSchema }),
  AttendanceController.reviewStudentLeave
);
// Aliases for /leaves
attendanceRouter.get(
  '/leaves',
  requireAnyPermission([
    'student_leave.view',
    'student_leave.manage',
    'student_leave.approve',
    'parent.leave.view',
  ]),
  AttendanceController.listStudentLeaves
);
attendanceRouter.post(
  '/leaves',
  requireAnyPermission(['student_leave.manage', 'parent.leave.create']),
  validateRequest({ body: createStudentLeaveSchema }),
  AttendanceController.createStudentLeave
);
attendanceRouter.post(
  '/leaves/:id/review',
  requirePermissions(['student_leave.approve']),
  validateRequest({ body: reviewStudentLeaveSchema }),
  AttendanceController.reviewStudentLeave
);

// 5. Staff Attendance
attendanceRouter.get(
  '/staff',
  requireAnyPermission(['staff_attendance.view', 'staff_attendance.manage']),
  AttendanceController.listStaffAttendance
);
attendanceRouter.post(
  '/staff/check-in',
  validateRequest({ body: staffCheckInSchema }),
  AttendanceController.staffCheckIn
);
attendanceRouter.post(
  '/staff/check-out',
  validateRequest({ body: staffCheckOutSchema }),
  AttendanceController.staffCheckOut
);
attendanceRouter.post(
  '/staff/manual',
  requirePermissions(['staff_attendance.manage']),
  validateRequest({ body: manualStaffAttendanceSchema }),
  AttendanceController.manualStaffAttendance
);
attendanceRouter.patch(
  '/staff/:id/correct',
  requirePermissions(['staff_attendance.manage']),
  validateRequest({ body: manualStaffAttendanceSchema }),
  AttendanceController.manualStaffAttendance
);
attendanceRouter.patch(
  '/staff/:id/manual-correction',
  requirePermissions(['staff_attendance.manage']),
  validateRequest({ body: manualStaffAttendanceSchema }),
  AttendanceController.manualStaffAttendance
);

// 6. Staff Leave
attendanceRouter.get(
  '/staff-leave',
  requireAnyPermission(['staff_leave.view', 'staff_leave.manage', 'staff_leave.approve']),
  AttendanceController.listStaffLeaves
);
attendanceRouter.post(
  '/staff-leave',
  requireAnyPermission(['staff_leave.manage']),
  validateRequest({ body: createStaffLeaveSchema }),
  AttendanceController.createStaffLeave
);
attendanceRouter.post(
  '/staff-leave/:id/review',
  requirePermissions(['staff_leave.approve']),
  validateRequest({ body: reviewStaffLeaveSchema }),
  AttendanceController.reviewStaffLeave
);
// Aliases for /staff/leaves
attendanceRouter.get(
  '/staff/leaves',
  requireAnyPermission(['staff_leave.view', 'staff_leave.manage', 'staff_leave.approve']),
  AttendanceController.listStaffLeaves
);
attendanceRouter.post(
  '/staff/leaves',
  requireAnyPermission(['staff_leave.manage']),
  validateRequest({ body: createStaffLeaveSchema }),
  AttendanceController.createStaffLeave
);
attendanceRouter.post(
  '/staff/leaves/:id/review',
  requirePermissions(['staff_leave.approve']),
  validateRequest({ body: reviewStaffLeaveSchema }),
  AttendanceController.reviewStaffLeave
);

// 7. Reports
attendanceRouter.get(
  '/reports/daily',
  requireAnyPermission(['attendance.view', 'attendance.manage']),
  AttendanceController.getDailyReport
);
attendanceRouter.get(
  '/reports/monthly',
  requireAnyPermission(['attendance.view', 'attendance.manage']),
  AttendanceController.getMonthlyReport
);
attendanceRouter.get(
  '/reports/export',
  requireAnyPermission(['attendance.view', 'attendance.manage']),
  AttendanceController.exportReportCsv
);

// =========================================================================
// Aliases for direct resource endpoints:
// /api/v1/student-leave, /api/v1/staff-attendance, /api/v1/staff-leave, /api/v1/holidays
// =========================================================================

export const studentLeaveRouter = Router();
studentLeaveRouter.use(authenticate);
studentLeaveRouter.get(
  '/',
  requireAnyPermission(['student_leave.view', 'student_leave.manage', 'student_leave.approve', 'parent.leave.view']),
  AttendanceController.listStudentLeaves
);
studentLeaveRouter.post(
  '/',
  requireAnyPermission(['student_leave.manage', 'parent.leave.create']),
  validateRequest({ body: createStudentLeaveSchema }),
  AttendanceController.createStudentLeave
);
studentLeaveRouter.post(
  '/:id/review',
  requirePermissions(['student_leave.approve']),
  validateRequest({ body: reviewStudentLeaveSchema }),
  AttendanceController.reviewStudentLeave
);
studentLeaveRouter.post(
  '/:id/approve',
  requirePermissions(['student_leave.approve']),
  (req, res, next) => {
    req.body = { ...req.body, action: 'APPROVE' };
    AttendanceController.reviewStudentLeave(req, res, next);
  }
);
studentLeaveRouter.post(
  '/:id/reject',
  requirePermissions(['student_leave.approve']),
  (req, res, next) => {
    req.body = { ...req.body, action: 'REJECT' };
    AttendanceController.reviewStudentLeave(req, res, next);
  }
);

export const staffAttendanceRouter = Router();
staffAttendanceRouter.use(authenticate);
staffAttendanceRouter.get(
  '/',
  requireAnyPermission(['staff_attendance.view', 'staff_attendance.manage']),
  AttendanceController.listStaffAttendance
);
staffAttendanceRouter.post(
  '/check-in',
  validateRequest({ body: staffCheckInSchema }),
  AttendanceController.staffCheckIn
);
staffAttendanceRouter.post(
  '/check-out',
  validateRequest({ body: staffCheckOutSchema }),
  AttendanceController.staffCheckOut
);
staffAttendanceRouter.post(
  '/manual',
  requirePermissions(['staff_attendance.manage']),
  validateRequest({ body: manualStaffAttendanceSchema }),
  AttendanceController.manualStaffAttendance
);
staffAttendanceRouter.patch(
  '/:id/correct',
  requirePermissions(['staff_attendance.manage']),
  validateRequest({ body: manualStaffAttendanceSchema }),
  AttendanceController.manualStaffAttendance
);
staffAttendanceRouter.patch(
  '/:id/manual-correction',
  requirePermissions(['staff_attendance.manage']),
  validateRequest({ body: manualStaffAttendanceSchema }),
  AttendanceController.manualStaffAttendance
);

export const staffLeaveRouter = Router();
staffLeaveRouter.use(authenticate);
staffLeaveRouter.get(
  '/',
  requireAnyPermission(['staff_leave.view', 'staff_leave.manage', 'staff_leave.approve']),
  AttendanceController.listStaffLeaves
);
staffLeaveRouter.post(
  '/',
  requireAnyPermission(['staff_leave.manage']),
  validateRequest({ body: createStaffLeaveSchema }),
  AttendanceController.createStaffLeave
);
staffLeaveRouter.post(
  '/:id/review',
  requirePermissions(['staff_leave.approve']),
  validateRequest({ body: reviewStaffLeaveSchema }),
  AttendanceController.reviewStaffLeave
);
staffLeaveRouter.post(
  '/:id/approve',
  requirePermissions(['staff_leave.approve']),
  (req, res, next) => {
    req.body = { ...req.body, action: 'APPROVE' };
    AttendanceController.reviewStaffLeave(req, res, next);
  }
);
staffLeaveRouter.post(
  '/:id/reject',
  requirePermissions(['staff_leave.approve']),
  (req, res, next) => {
    req.body = { ...req.body, action: 'REJECT' };
    AttendanceController.reviewStaffLeave(req, res, next);
  }
);

export const holidaysRouter = Router();
holidaysRouter.use(authenticate);
holidaysRouter.get(
  '/',
  requireAnyPermission(['holidays.view', 'holidays.manage', 'attendance.view', 'attendance.mark']),
  AttendanceController.listHolidays
);
holidaysRouter.post(
  '/',
  requirePermissions(['holidays.manage']),
  validateRequest({ body: createHolidaySchema }),
  AttendanceController.createHoliday
);
holidaysRouter.patch(
  '/:id',
  requirePermissions(['holidays.manage']),
  validateRequest({ body: updateHolidaySchema }),
  AttendanceController.updateHoliday
);
holidaysRouter.delete(
  '/:id',
  requirePermissions(['holidays.manage']),
  AttendanceController.deleteHoliday
);

export default attendanceRouter;
