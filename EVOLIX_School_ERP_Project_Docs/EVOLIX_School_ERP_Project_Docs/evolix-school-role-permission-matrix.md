# EVOLIX SCHOOL ERP — ROLE & PERMISSION MATRIX
**Version:** 1.0  
**Purpose:** Default role-to-capability blueprint  
**Important:** Backend authorization is permission-based. Roles are configurable bundles, not hardcoded authorization logic.

## 1. Permission Naming Standard
Use `<module>.<action>` style codes such as `students.view`, `students.create`, `attendance.override_lock`, `fees.collect`, `receipts.cancel`, `vouchers.approve`, and `settings.manage`.

## 2. Default Roles
Super Admin, Owner, Principal, Teacher, Accountant, Office Staff, Receptionist, Driver, Conductor, Security, Cleaner, Peon.

## 3. High-Level Default Access
| Module | Super Admin | Owner | Principal | Teacher | Accountant | Office Staff | Receptionist | Driver/Conductor | Security |
|---|---|---|---|---|---|---|---|---|---|
| Administration | Full | View/Manage | Limited Manage | — | — | — | — | — | — |
| Security/RBAC | Full | Manage | View | — | — | — | — | — | — |
| Configuration | Full | Manage | Selected | — | Finance-only selected | — | — | — | — |
| Students | Full | View | Manage | Assigned scope | Fee context | Manage | View/Search | Assigned route | Identity only |
| Admissions | Full | View | Approve/Manage | Assigned only | Financial approval | Manage | Intake | — | — |
| Attendance | Full | View | Manage/Override | Assigned classes | Payroll view | Operational | — | Own/assigned | Own |
| Academics | Full | View | Manage | Assigned academic scope | — | Admin support | View | — | — |
| Finance | Full | Full/View | View | — | Full Operational | Limited | — | — | — |
| Employees | Full | View | Manage | Self | Payroll | Operational | — | Self | Self |
| Transport | Full | View | Manage | Assigned-student view | Expense view | Manage | View | Operational assigned | Gate context |
| Inventory | Full | View | Manage | Assigned view | Accounting | Manage | — | — | Assigned only |
| Visitors | Full | View | Manage | View | — | Operational | Manage | — | Full operational |
| Reports | Full | Full | Full | Assigned | Finance full | Selected | Selected | Assigned | Gate reports |
| Backup/Monitoring | Full | Authorized/View | Limited View | — | — | — | — | — | — |

Actual access is permission- and scope-driven.

## 4. Recommended Permission Registry
### Administration
`users.view`, `users.create`, `users.update`, `users.disable`, `roles.view`, `roles.manage`, `permissions.view`, `permissions.manage`, `academic_years.view`, `academic_years.manage`, `audit.view`.

### Students
`students.view`, `students.create`, `students.update`, `students.archive`, `students.export`, `students.import`, `students.promote`, `students.transfer`, `students.view_finance`, `students.view_documents`.

### Admissions
`admissions.view`, `admissions.create`, `admissions.update`, `admissions.submit`, `admissions.approve`, `admissions.reject`, `admissions.complete`, `admissions.manage_pending_documents`.

### Attendance
`attendance.view`, `attendance.mark`, `attendance.correct`, `attendance.override_lock`, `teacher_attendance.mark`, `teacher_attendance.override`, `attendance.reports`.

### Academics
`academics.view`, `timetable.manage`, `homework.manage`, `exams.manage`, `marks.enter`, `marks.lock`, `marks.override_lock`, `results.publish`, `results.revalue`, `report_cards.generate`, `promotions.execute`.

### Finance
`fees.view`, `fees.configure`, `fees.collect`, `fees.discount`, `fees.waive`, `refunds.create`, `refunds.approve`, `receipts.view`, `receipts.cancel`, `expenses.create`, `expenses.approve`, `vouchers.create`, `vouchers.post`, `vouchers.approve`, `vouchers.reverse`, `reconciliation.manage`, `accounts.configure`, `reports.finance.view`.

### Employees
`employees.view`, `employees.create`, `employees.update`, `employees.archive`, `employee_documents.view`, `leave.manage`, `payroll.view`, `payroll.run`, `payroll.approve`, `payslips.generate`.

### Transport
`transport.view`, `vehicles.manage`, `routes.manage`, `transport.assign_students`, `trips.manage`, `pickup_drop.mark`, `fuel.manage`, `maintenance.manage`, `transport_expenses.manage`.

### Communication
`communications.view`, `communications.create`, `communications.publish`, `communications.schedule`, `communications.broadcast`, `templates.manage`.

### Inventory
`inventory.view`, `inventory.manage_items`, `vendors.manage`, `po.create`, `po.approve`, `grn.create`, `stock.issue`, `stock.return`, `stock.adjust`, `inventory.reports`.

### Visitors
`visitors.view`, `visitors.register`, `visitors.checkout`, `appointments.manage`, `gate_pass.create`, `gate_pass.approve`, `material_gate.manage`.

### Certificates / Platform
`certificates.view`, `certificates.generate`, `certificates.cancel`, `certificate_templates.manage`, `settings.view`, `settings.manage`, `workflows.manage`, `workflows.approve`, `documents.upload`, `documents.download`, `backups.create`, `backups.restore`, `monitoring.view`.

## 5. Scope Rules
Permissions may be scoped to all-school, branch, class, section, department, assigned students, own records, assigned route, or assigned workflow items.

A Teacher with `students.view` should normally only see assigned academic scope unless explicitly expanded.

## 6. High-Risk Permissions
Treat `permissions.manage`, `settings.manage`, `attendance.override_lock`, `marks.override_lock`, `receipts.cancel`, `refunds.approve`, `vouchers.post`, `vouchers.approve`, `vouchers.reverse`, `results.publish`, `promotions.execute`, `backups.restore`, and `integrations.manage` as elevated and auditable.

## 7. Backend Rule
Every protected operation validates authenticated user, tenant/school, permission, scope, and resource state. Frontend hiding is UX only, never security.

## 8. Custom Roles
Schools may create Vice Principal, Exam Coordinator, Transport Manager, HR Manager, Fee Clerk, Store Manager, or other roles using the same permission registry.
