# EVOLIX SCHOOL ERP — ROUTE & API NAMING STANDARD
**Version:** 1.0  
**Purpose:** Consistent frontend route and backend API conventions

## 1. General Rules
Use lowercase, kebab-case frontend segments, plural API nouns, stable IDs, versioned APIs, and tenant context derived from authenticated access rather than blindly trusting tenant IDs from request bodies.

## 2. Frontend Routes
Examples:
```text
/login
/dashboard
/students
/students/new
/students/:studentId
/students/:studentId/edit
/students/:studentId/attendance
/students/:studentId/fees
/students/:studentId/documents
/admissions
/admissions/new
/admissions/:admissionId
/attendance/students
/attendance/teachers
/academics/timetable
/academics/exams
/academics/exams/:examId/marks
/finance
/finance/fees
/finance/collections
/finance/receipts/:receiptId
/finance/vouchers
/finance/reconciliation
/employees
/employees/:employeeId
/payroll/runs/:runId
/transport/vehicles
/transport/routes
/inventory/items
/inventory/purchase-orders
/reports
/settings
/admin/users
/admin/roles
/admin/audit
```

## 3. API Base
Preferred: `/api/v1`

CRUD examples:
- `GET /api/v1/students`
- `POST /api/v1/students`
- `GET /api/v1/students/{student_id}`
- `PATCH /api/v1/students/{student_id}`
- `POST /api/v1/students/{student_id}/archive`

## 4. Business Action Endpoints
Prefer explicit actions for state transitions:
```text
POST /receipts/{id}/cancel
POST /vouchers/{id}/post
POST /vouchers/{id}/approve
POST /attendance/sessions/{id}/lock
POST /results/{id}/publish
POST /students/{id}/promote
POST /admissions/{id}/submit
POST /admissions/{id}/approve
```

## 5. List Query Standard
Common params: `page`, `page_size`, `search`, `sort`, `order`, `status`, plus module filters.

Response pattern:
```json
{
  "items": [],
  "page": 1,
  "page_size": 25,
  "total": 0,
  "pages": 0
}
```

## 6. Error Standard
Use structured safe errors:
```json
{
  "error": {
    "code": "ATTENDANCE_LOCKED",
    "message": "Attendance is locked for this date.",
    "field_errors": null,
    "request_id": "..."
  }
}
```
Never expose production stack traces.

## 7. Resource Naming
Use stable resource names such as students, enrollments, families, guardians, admissions, attendance-sessions, employees, payroll-runs, fee-structures, payments, receipts, refunds, vouchers, journal-entries, bank-statements, reconciliations, exams, marks, results, vehicles, routes, trips, communications, notifications, certificates, visitors, inventory-items, purchase-orders, goods-received-notes, documents, workflows, and reports.

## 8. Auth API
```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/2fa/verify
GET  /api/v1/auth/me
```

## 9. Permission API
```text
GET /api/v1/roles
POST /api/v1/roles
GET /api/v1/permissions
PATCH /api/v1/roles/{id}/permissions
```
Permission codes remain stable regardless of translated UI labels.

## 10. File API
```text
POST /api/v1/documents
GET /api/v1/documents/{id}
GET /api/v1/documents/{id}/download
POST /api/v1/documents/{id}/new-version
```
Raw bucket paths are never the authorization model.

## 11. Import / Export
```text
POST /api/v1/students/import/preview
POST /api/v1/students/import/commit
GET  /api/v1/students/export
```
High-risk imports should support preview/dry-run.

## 12. Reports
```text
GET /api/v1/reports/attendance
GET /api/v1/reports/fee-defaulters
GET /api/v1/reports/trial-balance
POST /api/v1/reports/{report_key}/export
```
Expensive exports may return a background-job ID.

## 13. Data Representation
Use ISO 8601 timestamps. Internal enums stay language-neutral. Money uses decimal-safe representation. Localization is a presentation concern.

Example internal status: `cancelled`; UI displays “Cancelled” or “रद्द”.

## 14. Idempotency
Require an idempotency strategy for retry-sensitive payments, receipt generation, financial posting, bulk imports, integration callbacks, and duplicate-sensitive scheduled notifications.

## 15. API Versioning
Breaking changes require a version strategy. Do not casually rename fields used by released clients.

## 16. OpenAPI
FastAPI OpenAPI must accurately define request/response schemas, status codes, auth requirements, and meaningful operation summaries.
