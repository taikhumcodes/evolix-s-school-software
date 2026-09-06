import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/rbac.js';
import { PayrollController } from './payroll.controller.js';

export const payrollRouter = Router();
payrollRouter.use(authenticate);

// 1. Configuration
payrollRouter.get(
  '/configuration',
  requireAnyPermission(['payroll.structure.view', 'settings.manage', 'hr.settings.manage']),
  PayrollController.getPayrollConfiguration
);

payrollRouter.put(
  '/configuration',
  requireAnyPermission(['payroll.structure.manage', 'settings.manage', 'hr.settings.manage']),
  PayrollController.updatePayrollConfiguration
);

// Aliases for /config
payrollRouter.get(
  '/config',
  requireAnyPermission(['payroll.structure.view', 'settings.manage', 'hr.settings.manage']),
  PayrollController.getPayrollConfiguration
);

payrollRouter.put(
  '/config',
  requireAnyPermission(['payroll.structure.manage', 'settings.manage', 'hr.settings.manage']),
  PayrollController.updatePayrollConfiguration
);

// 2. Salary Components & Structures
payrollRouter.get(
  '/components',
  requireAnyPermission(['payroll.structure.view']),
  PayrollController.listSalaryComponents
);

payrollRouter.post(
  '/components',
  requireAnyPermission(['payroll.structure.manage']),
  PayrollController.createSalaryComponent
);

payrollRouter.put(
  '/components/:id',
  requireAnyPermission(['payroll.structure.manage']),
  PayrollController.updateSalaryComponent
);

// Aliases for compatibility
payrollRouter.get(
  '/salary-components',
  requireAnyPermission(['payroll.structure.view']),
  PayrollController.listSalaryComponents
);

payrollRouter.post(
  '/salary-components',
  requireAnyPermission(['payroll.structure.manage']),
  PayrollController.createSalaryComponent
);

payrollRouter.put(
  '/salary-components/:id',
  requireAnyPermission(['payroll.structure.manage']),
  PayrollController.updateSalaryComponent
);

payrollRouter.get(
  '/structures',
  requireAnyPermission(['payroll.structure.view']),
  PayrollController.listSalaryStructures
);

payrollRouter.post(
  '/structures',
  requireAnyPermission(['payroll.structure.manage']),
  PayrollController.createSalaryStructure
);

payrollRouter.get(
  '/salary-structures',
  requireAnyPermission(['payroll.structure.view']),
  PayrollController.listSalaryStructures
);

payrollRouter.post(
  '/salary-structures',
  requireAnyPermission(['payroll.structure.manage']),
  PayrollController.createSalaryStructure
);

payrollRouter.post(
  '/assignments',
  requireAnyPermission(['payroll.structure.manage']),
  PayrollController.assignSalaryStructure
);

payrollRouter.post(
  '/salary-assignments',
  requireAnyPermission(['payroll.structure.manage']),
  PayrollController.assignSalaryStructure
);

// 3. Periods
payrollRouter.get(
  '/periods',
  requireAnyPermission(['payroll.run.view', 'payroll.structure.view']),
  PayrollController.listPayrollPeriods
);

payrollRouter.post(
  '/periods',
  requireAnyPermission(['payroll.run.create', 'payroll.structure.manage']),
  PayrollController.createPayrollPeriod
);

// 4. Payroll Runs & Lifecycle
payrollRouter.get(
  '/runs',
  requireAnyPermission(['payroll.run.view']),
  PayrollController.listPayrollRuns
);

payrollRouter.get(
  '/runs/:id',
  requireAnyPermission(['payroll.run.view']),
  PayrollController.getPayrollRunById
);

payrollRouter.post(
  '/runs',
  requireAnyPermission(['payroll.run.create']),
  PayrollController.createPayrollRun
);

payrollRouter.post(
  '/runs/:id/calculate',
  requireAnyPermission(['payroll.run.create']),
  PayrollController.calculatePayrollRun
);

payrollRouter.post(
  '/runs/:id/status',
  requireAnyPermission(['payroll.run.approve']),
  PayrollController.updatePayrollRunStatus
);

payrollRouter.put(
  '/runs/:id/status',
  requireAnyPermission(['payroll.run.approve']),
  PayrollController.updatePayrollRunStatus
);

payrollRouter.post(
  '/runs/:id/post',
  requireAnyPermission(['payroll.run.post']),
  PayrollController.postPayrollRun
);

payrollRouter.post(
  '/runs/:id/reverse',
  requireAnyPermission(['payroll.run.reverse']),
  PayrollController.reversePayrollRun
);

payrollRouter.post(
  '/runs/:id/disburse',
  requireAnyPermission(['payroll.payment.manage']),
  PayrollController.disbursePayment
);

// 5. Payslips
payrollRouter.get(
  '/payslips/:id',
  requireAnyPermission(['payroll.payslip.view', 'payroll.self.view']),
  PayrollController.getPayslip
);

payrollRouter.get(
  '/my-payslips',
  requireAnyPermission(['payroll.self.view']),
  PayrollController.listMyPayslips
);

// 6. Reports (Safeguards 8, 16, TEST 80, 81, 82)
payrollRouter.get(
  '/reports/register',
  requireAnyPermission(['payroll.view', 'payroll.run.view', 'settings.manage']),
  PayrollController.getPayrollRegisterReport
);

payrollRouter.get(
  '/reports/gl-reconciliation/:id',
  requireAnyPermission(['payroll.view', 'settings.manage']),
  PayrollController.getGlReconciliationReport
);

export default payrollRouter;
