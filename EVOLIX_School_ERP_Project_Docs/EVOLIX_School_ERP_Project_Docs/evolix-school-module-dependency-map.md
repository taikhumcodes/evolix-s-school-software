# EVOLIX SCHOOL ERP — MODULE DEPENDENCY MAP
**Version:** 1.0  
**Purpose:** Defines module dependencies so Antigravity can build in a safe order.

## 1. Foundation Layers
**Layer 0:** repository shells, PostgreSQL, migrations, testing, Playwright, Docker, i18n, design primitives.  
**Layer 1:** Administration, Security, Configuration, Master Data, Audit, Number Series, file/printing primitives.  
**Layer 2:** Student, Parent, Employee, Academic Year, Classes/Sections/Subjects.  
**Layer 3:** Admission, Attendance, Finance, Academics, Payroll, Transport, Inventory, Visitor.  
**Layer 4:** Workflow, Notification, Document Center, Global Search, Reports.  
**Layer 5:** Dashboard Builder, advanced Monitoring, future integrations.

## 2. Module Dependencies
- **01 Administration:** repository/DB/auth primitives. Provides users, roles, academic years, audit entry points.
- **02 Security:** depends on Administration. Provides RBAC, sessions, 2FA, device/login audit.
- **03 Configuration:** depends on Administration + Security. Provides school settings and number formats.
- **04 Setup Wizard:** depends on Administration, Configuration, Master Data, basic fee heads, optional transport masters.
- **05 Master Data:** depends on school/tenant context. Feeds Student, Admission, Academic, Finance, Employee, Transport, Inventory.
- **06 Student:** depends on Administration, Security, Configuration, Master Data, Academic Year. Integrates with Parent, Admission, Attendance, Finance, Academic, Transport, Documents, Certificates.
- **07 Admission:** depends on Student, Parent, Master Data, Academic Year, fee structure, Number Series, Documents. Workflow optional.
- **08 Discipline:** depends on Student, Parent, Employee/User. Workflow/Notification optional.
- **09 Parent:** depends on Student identity structure and Users if parent login is enabled.
- **10 Employee:** depends on Administration, Master Data, Security, Documents. Payroll additionally depends on Attendance + Finance.
- **11 Attendance:** depends on Students, Employees, Academic Year, Classes/Sections, Security. Integrates with Notification, Payroll, Reports.
- **12 Academic:** depends on Students, Master Data, Academic Year, Employees/Teachers, Printing.
- **13 Finance:** depends on Administration, Configuration, Number Series, Master Data, Student for fee collection. Finance posting services are reused by Payroll, Inventory, Transport, Activities.
- **14 Transport:** depends on Students, Employees, Master Data, Finance.
- **15 Communication:** depends on audience sources and Notification Engine.
- **16 Notification Engine:** depends on Administration, Configuration, background jobs; consumed by Attendance, Finance, Discipline, Communication, Transport, Documents.
- **17 Activities:** depends on Students, Employees, Finance.
- **18 Certificates:** depends on Students, Configuration, Number Series, Printing, Documents.
- **19 Visitor:** depends on Employees/Users, Security, optional Printing.
- **20 Inventory:** depends on Master Data, Employees/Departments, Finance.
- **21 Document Management:** depends on storage abstraction, Security, Audit; consumed broadly.
- **22 Global Search:** depends on completed searchable entities, Security, tenant isolation.
- **23 Dashboard Builder:** depends on role dashboards, reports/query services, Security.
- **24 Workflow Engine:** depends on Administration, Security, Audit, optional Notification; consumed by Admission, Refund, Discipline, PO, sensitive vouchers/corrections.
- **25 Printing:** depends on Configuration, School Branding, i18n; consumed by Finance, Academic, Certificates, Admission, Transport, Visitor.
- **26 Backup:** depends on infrastructure, Security, Audit.
- **27 Monitoring:** depends on infrastructure, jobs, logging.
- **28 Reports:** depends on source modules, Security, Printing/export services.

## 3. Recommended Safe Build Order
```text
Foundation
↓
Administration
↓
Security
↓
Configuration
↓
Master Data
↓
Printing/File primitives
↓
Setup Wizard
↓
Student
↓
Parent
↓
Admission
↓
Attendance
↓
Finance
↓
Employee + Payroll
↓
Academic
↓
Workflow + Notification
↓
Transport
↓
Inventory
↓
Visitor
↓
Discipline
↓
Activities
↓
Certificates
↓
Document Center full UI
↓
Global Search
↓
Reports
↓
Dashboard Builder
↓
Backup / Monitoring refinement
```

This is a dependency guide, not permission to build automatically.

## 4. Command Rule
When the user says `Build Module X`, inspect dependencies, verify prerequisites, build only required shared primitives, avoid unrelated future modules, integrate with completed dependencies, and test dependent behavior.

## 5. Circular Dependency Rule
Finance owns accounting posting logic. Payroll/Inventory consume it. Student owns identity/enrollment behavior; Admission orchestrates creation. Notification delivers events but does not own business decisions. Workflow manages approval state while domain services own final business actions.
