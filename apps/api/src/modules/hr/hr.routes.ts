import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/rbac.js';
import { HrController } from './hr.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export const hrRouter = Router();
hrRouter.use(authenticate);

// 1. Overview
hrRouter.get(
  '/overview',
  requireAnyPermission(['hr.employee.view', 'settings.manage']),
  HrController.getOverview
);

// 2. Employees Master
hrRouter.get(
  '/employees',
  requireAnyPermission(['hr.employee.view']),
  HrController.listEmployees
);

hrRouter.get(
  '/employees/:id',
  requireAnyPermission(['hr.employee.view', 'hr.view', 'payroll.self.view', 'staff_attendance.view', 'staff_leave.view', 'settings.manage']),
  HrController.getEmployeeById
);

hrRouter.post(
  '/employees',
  requireAnyPermission(['hr.employee.manage']),
  HrController.createEmployee
);

hrRouter.put(
  '/employees/:id',
  requireAnyPermission(['hr.employee.manage']),
  HrController.updateEmployee
);

hrRouter.post(
  '/employees/:id/bank-account',
  requireAnyPermission(['hr.employee.manage']),
  HrController.setEmployeeBankAccount
);

// 3. Departments & Designations Reference
hrRouter.get(
  '/departments',
  requireAnyPermission(['hr.employee.view', 'settings.manage', 'master_data.view']),
  HrController.listDepartments
);

hrRouter.post(
  '/departments',
  requireAnyPermission(['hr.employee.manage', 'settings.manage', 'master_data.manage']),
  HrController.createDepartment
);

hrRouter.get(
  '/designations',
  requireAnyPermission(['hr.employee.view', 'settings.manage', 'master_data.view']),
  HrController.listDesignations
);

hrRouter.post(
  '/designations',
  requireAnyPermission(['hr.employee.manage', 'settings.manage', 'master_data.manage']),
  HrController.createDesignation
);

// 4. Leave Policies & Balances
hrRouter.get(
  '/leave-types',
  requireAnyPermission(['hr.leave.view', 'hr.employee.view', 'staff_leave.view']),
  HrController.listStaffLeaveTypes
);

hrRouter.post(
  '/leave-types',
  requireAnyPermission(['hr.leave.manage']),
  HrController.createStaffLeaveType
);

hrRouter.put(
  '/leave-types/:id',
  requireAnyPermission(['hr.leave.manage']),
  HrController.updateStaffLeaveType
);

hrRouter.post(
  '/leave-allocations',
  requireAnyPermission(['hr.leave.manage']),
  HrController.allocateEmployeeLeave
);

hrRouter.post(
  '/leave-balances/allocate',
  requireAnyPermission(['hr.leave.manage']),
  HrController.allocateEmployeeLeave
);

hrRouter.get(
  '/employees/:employeeId/leave-balances',
  requireAnyPermission(['hr.leave.view', 'hr.employee.view', 'staff_leave.view']),
  HrController.getEmployeeLeaveBalances
);

hrRouter.get(
  '/employees/:employeeId/leave-history',
  requireAnyPermission(['hr.leave.view', 'hr.employee.view', 'staff_leave.view']),
  HrController.getLeaveBalanceHistory
);

hrRouter.post(
  '/staff-leave/:id/approve',
  requireAnyPermission(['hr.leave.approve', 'staff_leave.approve']),
  HrController.approveStaffLeave
);

hrRouter.put(
  '/staff-leave/:id/approve',
  requireAnyPermission(['hr.leave.approve', 'staff_leave.approve']),
  HrController.approveStaffLeave
);

hrRouter.post(
  '/leaves/:id/approve',
  requireAnyPermission(['hr.leave.approve', 'staff_leave.approve']),
  HrController.approveStaffLeave
);

hrRouter.put(
  '/leaves/:id/approve',
  requireAnyPermission(['hr.leave.approve', 'staff_leave.approve']),
  HrController.approveStaffLeave
);

hrRouter.post(
  '/staff-leave/:id/cancel',
  requireAnyPermission(['hr.leave.approve', 'staff_leave.manage']),
  HrController.cancelStaffLeave
);

hrRouter.put(
  '/staff-leave/:id/cancel',
  requireAnyPermission(['hr.leave.approve', 'staff_leave.manage']),
  HrController.cancelStaffLeave
);

hrRouter.post(
  '/leaves/:id/cancel',
  requireAnyPermission(['hr.leave.approve', 'staff_leave.manage']),
  HrController.cancelStaffLeave
);

hrRouter.put(
  '/leaves/:id/cancel',
  requireAnyPermission(['hr.leave.approve', 'staff_leave.manage']),
  HrController.cancelStaffLeave
);

// 5. Separations
hrRouter.get(
  '/separations',
  requireAnyPermission(['hr.separation.manage', 'hr.employee.view']),
  HrController.listSeparations
);

hrRouter.post(
  '/separations',
  requireAnyPermission(['hr.separation.manage']),
  HrController.initiateSeparation
);

hrRouter.post(
  '/separations/:id/settle',
  requireAnyPermission(['hr.separation.manage']),
  HrController.settleSeparation
);

// 6. Deletion Safety (Safeguard 1, TEST 09)
hrRouter.delete(
  '/employees/:id',
  requireAnyPermission(['hr.employee.manage', 'settings.manage']),
  HrController.deleteEmployee
);

// 7. Documents (Safeguard 2, TEST 10, 11, 12)
hrRouter.post(
  '/employees/:id/documents',
  requireAnyPermission(['hr.employee.manage', 'hr.document.manage', 'settings.manage']),
  upload.single('file'),
  HrController.uploadEmployeeDocument
);

hrRouter.get(
  '/employees/:id/documents',
  HrController.listEmployeeDocuments
);

hrRouter.get(
  '/employees/:id/documents/:docId',
  HrController.getEmployeeDocument
);

hrRouter.get(
  '/employees/:id/documents/:docId/download',
  HrController.downloadEmployeeDocument
);

// 8. Attendance (Safeguard 3, TEST 16)
hrRouter.get(
  '/employees/:id/attendance',
  HrController.getEmployeeAttendance
);

// 9. Manual Leave Adjustment (Safeguard 4, TEST 25)
hrRouter.post(
  '/leave-balances/adjust',
  requireAnyPermission(['hr.leave.manage', 'settings.manage']),
  HrController.adjustEmployeeLeave
);

hrRouter.post(
  '/employees/:id/leave-balances/adjust',
  requireAnyPermission(['hr.leave.manage', 'settings.manage']),
  HrController.adjustEmployeeLeave
);

// 10. Reports (Safeguards 8, 9, 10, TEST 78, 79, 82)
hrRouter.get(
  '/reports/employee-register',
  requireAnyPermission(['hr.employee.view', 'hr.view', 'settings.manage']),
  HrController.getEmployeeRegisterReport
);

hrRouter.get(
  '/reports/leave-balances',
  requireAnyPermission(['hr.leave.view', 'hr.view', 'settings.manage']),
  HrController.getLeaveBalanceSummaryReport
);

export default hrRouter;
