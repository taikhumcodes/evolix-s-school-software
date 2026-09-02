# EVOLIX SCHOOL ERP — DATABASE ENTITY RELATIONSHIP BLUEPRINT
**Version:** 1.0  
**Purpose:** High-level relational data model before detailed schema/migrations  
**Database:** PostgreSQL | **ORM:** SQLAlchemy 2.x | **Migrations:** Alembic

## 1. Core Rules
PostgreSQL is source of truth. Prefer UUID internal IDs. Human-readable numbers are separate. Enforce tenant isolation. Use NUMERIC/Decimal for money, timezone-aware timestamps, soft deletion for normal business records, and Alembic for all schema changes. File metadata belongs in DB; binary files belong in S3-compatible storage.

## 2. Tenant / School
`tenants` → `schools` → future-ready `branches` → `academic_years`.

Each tenant-owned record must reference the school/tenant context required by the final tenancy model.

## 3. Auth / Security
Core entities:
- users
- roles
- permissions
- user_roles
- role_permissions
- refresh_tokens/sessions
- login_audits

## 4. Configuration / Master Data
Core entities:
- school_settings
- number_series
- classes
- sections
- subjects
- departments
- designations
- religions
- categories
- castes
- countries/states/cities
- fee_heads
- expense_heads
- vehicle_types

Editable bilingual masters may use `name_en` and `name_hi` where required.

## 5. Student / Family
Core entities:
- students — permanent identity
- student_enrollments — academic-year enrollment state
- families
- guardians
- student_family_links
- student_timeline_events
- document links

Key rules: student ID and admission number immutable; one permanent student identity; roll number unique within the configured academic scope.

## 6. Admission
- admission_applications
- admission_checklist_items
- admission_approvals
- admission_pending_documents
- document links

Successful completion connects to student, enrollment, family/guardians, and fee account.

## 7. Attendance
- student_attendance_sessions
- student_attendance_entries
- employee_attendance
- leave_requests

Attendance sessions carry open/locked state; corrections store actor and reason.

## 8. Academic
- class_subjects
- subject_groups
- elective_assignments
- class_teacher_assignments
- timetable_entries
- homework
- exams
- exam_components
- exam_schedules
- marking_schemes
- exam_seating
- marks
- grade_boundaries
- results
- report_card_snapshots
- revaluation_requests
- promotion_runs
- promotion_entries

Published results/report cards may require immutable snapshots.

## 9. Employee / Payroll
- employees
- employee_qualifications
- employee_experience
- employee_training
- employee_performance_notes
- salary_structures
- salary_components
- payroll_runs
- payroll_entries
- payslip_snapshots
- increments
- PF/ESI configuration

## 10. Finance
Fees:
- fee_structures
- fee_structure_items
- student_fee_assignments
- fee_installments
- concessions
- scholarships_waivers
- fee_accounts
- fee_dues
- payments
- payment_allocations
- payment_method_components
- receipts
- refunds
- refund_approvals

Accounting:
- chart_of_accounts
- cost_centers
- fiscal_years
- journals/journal_entries/journal_lines
- vouchers
- bank_accounts
- bank_statements/bank_statement_lines
- bank_reconciliations
- budgets
- fixed_assets
- depreciation_entries
- ledger_closures

Every posted journal entry must balance debit = credit.

## 11. Transport
- vehicles
- vehicle_documents
- routes
- pickup_points/route_stops
- driver_assignments
- conductor_assignments
- student_transport_assignments
- trips
- pickup_drop_events
- fuel_logs
- vehicle_maintenance
- transport_expenses

## 12. Communication / Notification
- communications
- communication_audiences
- acknowledgement_records
- notification_templates
- notifications
- notification_deliveries

## 13. Activities / Discipline
- school_events
- event_attendance
- event_budgets
- event_expenses
- discipline_cases
- discipline_actions
- discipline_points
- discipline_parent_meetings

## 14. Certificates / Printing
- certificate_templates
- certificates
- print_templates
- print_jobs where needed

Generated certificates should preserve historical snapshot truth where required.

## 15. Visitors
- visitors
- visitor_visits
- appointments
- gate_passes
- staff_visits
- material_gate_movements

## 16. Inventory
- inventory_items
- inventory_categories
- vendors
- warehouses
- purchase_orders/purchase_order_lines
- goods_received_notes/grn_lines
- purchases
- stock_transactions
- stock_balances where appropriate
- assets
- consumables

Stock transactions should be the canonical quantity movement ledger.

## 17. Documents
- documents
- document_links
- document_versions
- document_download_logs

Downloads are permission-checked through the linked entity; raw bucket location is not authorization.

## 18. Workflow Engine
- workflow_definitions
- workflow_steps
- workflow_instances
- workflow_step_instances
- workflow_actions

The Workflow Engine manages approval state; domain services own the final business action.

## 19. Audit / System
- audit_logs
- background_jobs where app-level tracking is useful
- system_errors where operational persistence is appropriate
- backups

## 20. Relationship Map
```text
Tenant
└── School
    ├── Users ─ Roles ─ Permissions
    ├── Academic Years
    ├── Master Data
    ├── Families ─ Guardians
    │   └── Students
    │       ├── Enrollments ─ Class/Section
    │       ├── Admissions
    │       ├── Attendance
    │       ├── Fees/Payments/Receipts
    │       ├── Exams/Marks/Results
    │       ├── Transport Assignment
    │       ├── Documents
    │       └── Certificates
    ├── Employees ─ Attendance/Leave/Payroll
    ├── Finance ─ Accounts/Journals/Vouchers/Reconciliation
    ├── Transport
    ├── Inventory
    ├── Visitors
    ├── Communication/Notifications
    ├── Workflows
    └── Audit
```

## 21. Important Constraints
Implement exact constraints during module SDS work: immutable student/admission IDs, one active admission, tenant-scoped uniqueness, balanced journals, immutable posted finance truth, no cross-tenant references, attendance/result locking, transport capacity, and concurrency-safe number series.

## 22. Not Final SQL
Before a module is built, convert this blueprint into exact columns, nullability, enums, indexes, foreign keys, check constraints, migration plan, retention policy, and tests.
