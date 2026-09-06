# Ralph Loop Task File — Major Module 08: HR & Payroll Management

## Mission

Execute the complete strict QA, remediation, and implementation plan for **Major Module 08 — HR & Payroll Management**.

The implementation MUST:
- Preserve all existing architectural boundaries for Modules 01–07.
- Follow the **Strict Money Rule: Decimal arithmetic only**.
- NOT use Playwright.
- NOT use `prisma db push`.
- NOT use `prisma db reset`.
- NOT delete files.
- Prefer existing project patterns, services, permissions, error classes, audit logging, storage utilities, and database conventions over introducing parallel implementations.
- Keep changes scoped to the requirements in this task file.
- Do not silently weaken or skip tests to make them pass.

## Ralph Loop Execution Rules

1. Work through the unchecked tasks in order.
2. Before modifying a file, inspect the existing implementation and related module patterns.
3. Implement the smallest production-safe change that satisfies the task.
4. After each logical task/group, run the most relevant tests/type-checks.
5. If an existing project convention conflicts with this task file, inspect the surrounding architecture and preserve the established convention while still satisfying the requirement.
6. Never use destructive database commands.
7. Never delete files or remove existing functionality unless a task explicitly requires removal. This task file does not require any file deletion.
8. Do not mark a task complete unless its acceptance criteria are satisfied.
9. If a required decision is unresolved, stop at that task and report the blocker rather than guessing.
10. At the end, run the full verification plan and only mark the implementation complete when all required checks pass.

---

# BLOCKER — USER DECISIONS REQUIRED

These decisions are explicitly unresolved in the source implementation plan. Do not invent answers.

- [ ] **B1 — Employee document storage strategy**
  - Recommended: existing GCP Cloud Storage bucket `hr-employee-docs`.
  - Alternatives in the plan: local `uploads/employee-docs` or a new Prisma BLOB-based `EmployeeDocument` approach.
  - Before implementation of document persistence, confirm the intended storage strategy and reuse existing project storage infrastructure where applicable.

- [ ] **B2 — Bank account masking**
  - Required example: `•••• 1234`.
  - Confirm whether the exact rule is always four bullet characters followed by a space and the final four digits.

- [ ] **B3 — CSV export handling**
  - Confirm whether CSV reports should be streamed directly in the HTTP response or generated as temporary files.
  - Confirm any required filename convention.

- [ ] **B4 — Employee document MIME whitelist**
  - Proposed whitelist: PDF, PNG, JPEG.
  - Validate by file content/magic bytes, not filename or client-provided MIME alone.
  - Confirm this whitelist before finalizing upload behavior.

Do not mark B1–B4 complete until the user/project configuration provides the required decision.

---

# PHASE 1 — Backend HR Service

## Employee lifecycle

- [ ] **T01 — Initial employment history**
  - File: `apps/api/src/modules/hr/hr.service.ts`
  - Update `createEmployee` so creation also inserts the initial `EmploymentHistory` row.
  - Preserve existing transaction/error behavior.
  - Acceptance:
    - New employees receive an initial employment-history record.
    - Existing employee creation behavior remains intact.
    - No duplicate active history rows are created.

- [ ] **T02 — Employment history on employee updates**
  - File: `apps/api/src/modules/hr/hr.service.ts`
  - Extend `updateEmployee` to detect changes to:
    - `designationId`
    - `departmentId`
    - `status`
  - When one of these changes:
    - close the previous active `EmploymentHistory` with `endDate = now()`;
    - insert a new history record representing the new state.
  - Acceptance:
    - Previous active history is closed.
    - Exactly one new active history record represents the new state.
    - No history row is created when none of the tracked fields changes.

- [ ] **T03 — Safe employee deletion**
  - File: `apps/api/src/modules/hr/hr.service.ts`
  - Implement `deleteEmployee`.
  - Before deletion, check for related:
    - `PayrollRun`
    - `SalaryAssignment`
    - `EmploymentHistory`
    - `Document`
    - `Attendance/Leave` records
  - If any related record exists, throw:
    - `BadRequestError('EMPLOYEE_CANNOT_BE_DELETED')`
  - Acceptance:
    - Linked employees cannot be hard-deleted.
    - Error is returned consistently.
    - No partial deletion occurs.

## Employee documents

- [ ] **T04 — EmployeeDocument Prisma model**
  - File: `prisma/schema.prisma`
  - Add the `EmployeeDocument` model under the HR section with:
    - `id String @id @default(uuid())`
    - `employeeId String`
    - Employee relation
    - `filename String`
    - `mime String`
    - `size Int`
    - `storagePath String`
    - `uploadedBy String @map("uploaded_by_user_id")`
    - `uploadedAt DateTime @default(now())`
    - index on `employeeId`
  - Add the corresponding relation to `Employee` if required by the existing Prisma schema conventions.
  - Acceptance:
    - Prisma schema validates.
    - Relation/indexes are correct.
    - No unrelated schema changes.

- [ ] **T05 — Database migration**
  - Create a normal Prisma migration for `EmployeeDocument`.
  - MUST use `prisma migrate dev` or the project's established migration workflow.
  - MUST NOT use `prisma db push`.
  - MUST NOT use `prisma db reset`.
  - Acceptance:
    - Migration is generated/applied successfully.
    - Existing data is preserved.

- [ ] **T06 — Employee document upload**
  - File: `apps/api/src/modules/hr/hr.service.ts`
  - Implement `uploadEmployeeDocument`.
  - Validate file type using magic-byte/content detection.
  - Proposed whitelist:
    - PDF
    - PNG
    - JPEG
  - Store the file using the user-approved storage strategy.
  - Persist metadata in `EmployeeDocument`.
  - Metadata:
    - id
    - employeeId
    - filename
    - mime
    - size
    - storagePath
    - uploadedByUserId
    - uploadedAt
  - Acceptance:
    - Disallowed content is rejected even if the filename/MIME claims an allowed type.
    - Metadata is persisted correctly.
    - Storage failures do not leave inconsistent metadata.
    - Upload action is auditable if the existing audit architecture supports it.

- [ ] **T07 — List employee documents**
  - File: `apps/api/src/modules/hr/hr.service.ts`
  - Implement `listEmployeeDocuments`.
  - Enforce privacy:
    - users with `hr.employee.documents.view` may list others' documents;
    - HR managerial roles may list others' documents according to existing role conventions.
  - Acceptance:
    - Unauthorized cross-employee access is denied.
    - Authorized users receive document metadata.
    - Sensitive storage internals are not unnecessarily exposed.

- [ ] **T08 — Get/stream employee document**
  - File: `apps/api/src/modules/hr/hr.service.ts`
  - Implement `getEmployeeDocument`.
  - Stream the file.
  - Enforce authorization on the target employee.
  - Unauthorized access must return 403.
  - Acceptance:
    - Correct document streams successfully.
    - Unauthorized access returns 403.
    - Missing documents use the project's standard not-found behavior.

## Attendance and leave

- [ ] **T09 — Employee attendance**
  - File: `apps/api/src/modules/hr/hr.service.ts`
  - Implement `getEmployeeAttendance`.
  - Query the existing Module 05 `StaffAttendance` model.
  - Filter by `employeeId` and `schoolId`.
  - Acceptance:
    - Results are scoped to the correct employee and school.
    - No cross-school attendance leakage occurs.

- [ ] **T10 — Leave balance adjustment**
  - File: `apps/api/src/modules/hr/hr.service.ts`
  - Implement `adjustEmployeeLeave`.
  - Validate `reason` with minimum 5 characters.
  - Create a `LeaveBalanceTransaction` with transaction type `ADJUSTMENT`.
  - Update the leave balance.
  - Write an `AuditLog` entry.
  - Acceptance:
    - Invalid reasons are rejected.
    - Balance and transaction remain consistent.
    - Audit entry contains enough context to identify the adjustment.
    - Money/quantity arithmetic follows existing project data types and conventions.

- [ ] **T11 — LeaveBalanceTransaction model verification**
  - File: `prisma/schema.prisma`
  - Ensure `LeaveBalanceTransaction` exists with the required concepts:
    - id
    - employeeId
    - type
    - amount
    - reason
    - createdBy
    - createdAt
  - Reconcile naming with the existing schema if the model already exists; do not create a duplicate model.
  - Acceptance:
    - Existing model is reused when present.
    - Any required migration follows normal Prisma migration workflow.

---

# PHASE 2 — HR API Security, Employee Detail & Reports

- [ ] **T12 — Employee detail privacy/redaction**
  - File: `apps/api/src/modules/hr/hr.service.ts`
  - Extend the existing employee fetch method (`getEmployeeById` or equivalent).
  - When caller lacks `payroll.view`:
    - redact salary assignment details;
    - mask `bankAccountNumber`.
  - Required masking format is pending B2 confirmation; proposed format: `•••• 1234`.
  - Acceptance:
    - Authorized payroll viewers receive permitted salary data.
    - Unauthorized users do not receive salary assignment details.
    - Bank account numbers are consistently masked.

- [ ] **T13 — Employee register report**
  - File: `apps/api/src/modules/hr/hr.service.ts`
  - Implement `getEmployeeRegisterReport`.
  - Support JSON/CSV output according to the project's established reporting conventions.
  - Exclude salary information for users without payroll-view permission.
  - Apply approved bank-account masking rules.
  - Acceptance:
    - Report respects permissions.
    - Sensitive columns are masked/excluded.
    - CSV output is valid and consistent.

- [ ] **T14 — Leave balance summary report**
  - File: `apps/api/src/modules/hr/hr.service.ts`
  - Implement `getLeaveBalanceSummaryReport`.
  - Aggregate leave balances per employee.
  - Acceptance:
    - Correct employee-level aggregation.
    - School/tenant scope is enforced.
    - Output follows existing report conventions.

---

# PHASE 3 — HR Controller & Routes

- [ ] **T15 — HR controller endpoints**
  - File: `apps/api/src/modules/hr/hr.controller.ts`
  - Wire service methods to:
    - `DELETE /employees/:id`
    - `GET /employees/:id/attendance`
    - `POST /employees/:id/documents`
    - `GET /employees/:id/documents`
    - `GET /employees/:id/documents/:docId`
    - `POST /leave-balances/adjust`
    - `GET /reports/employee-register`
    - `GET /reports/leave-balances`
  - Acceptance:
    - Controller validation/error handling follows existing conventions.
    - No duplicate route behavior is introduced.

- [ ] **T16 — HR route registration and permissions**
  - File: `apps/api/src/modules/hr/hr.routes.ts`
  - Register all endpoints above.
  - Protect each endpoint with the appropriate `requirePermissions([...])` middleware.
  - Acceptance:
    - Correct permission is enforced for every new endpoint.
    - Unauthorized requests fail before sensitive service work where appropriate.

---

# PHASE 4 — Payroll Remediation & Reports

- [ ] **T17 — Negative net pay detection**
  - File: `apps/api/src/modules/hr/payroll.service.ts`
  - In `calculatePayrollRun`, after net pay calculation:
    - detect employees where `gross < totalDeductions`;
    - push warning `PAYROLL_NEGATIVE_NET_PAY` into the result snapshot.
  - Acceptance:
    - Warning appears in the preview/result snapshot.
    - Existing payroll calculations are not silently altered.

- [ ] **T18 — Prevent approval/posting with negative net pay**
  - File: `apps/api/src/modules/hr/payroll.service.ts`
  - In `updatePayrollRunStatus` and `postPayrollRun`:
    - before transition to `APPROVED` or posting;
    - verify no employee in the run has negative net pay;
    - if found, throw `BadRequestError('PAYROLL_NEGATIVE_NET_PAY')`.
  - Acceptance:
    - Approval is blocked.
    - Posting is blocked.
    - Error is deterministic and consistent.

- [ ] **T19 — Closed accounting period protection**
  - File: `apps/api/src/modules/hr/payroll.service.ts`
  - In `postPayrollRun`, before GL posting:
    - check related `AccountingPeriod` status;
    - if closed, throw `ConflictError('PAYROLL_FINANCIAL_PERIOD_CLOSED')`.
  - Acceptance:
    - No GL posting occurs for a closed accounting period.
    - Error is returned before financial mutation.

- [ ] **T20 — Payroll register report**
  - File: `apps/api/src/modules/hr/payroll.service.ts`
  - Implement `getPayrollRegisterReport`.
  - Return payroll runs with summary fields.
  - Acceptance:
    - Report is scoped correctly.
    - Sensitive payroll data is protected by existing permissions.

- [ ] **T21 — GL reconciliation report**
  - File: `apps/api/src/modules/hr/payroll.service.ts`
  - Implement `getGlReconciliationReport`.
  - Reconcile GL entries for a requested period.
  - Verify debits = credits.
  - Acceptance:
    - Period filtering works.
    - Reconciliation clearly identifies balanced/unbalanced state.
    - Decimal-safe arithmetic is used.

- [ ] **T22 — Payroll report controller endpoints**
  - File: `apps/api/src/modules/hr/payroll.controller.ts`
  - Expose:
    - `GET /reports/payroll-register`
    - `GET /reports/gl-reconciliation`
  - Acceptance:
    - Controller calls correct service methods.
    - Existing response conventions are preserved.

- [ ] **T23 — Payroll report routes**
  - File: `apps/api/src/modules/hr/payroll.routes.ts`
  - Register both report routes with proper permission checks.
  - Acceptance:
    - Unauthorized access is rejected.
    - Authorized access works.

---

# PHASE 5 — Frontend Tests

- [ ] **T24 — Extend HR/Payroll test coverage**
  - File: `frontend/src/__tests__/HrPayrollModule.test.tsx`
  - Add assertions for:
    - document upload UI rejects disallowed MIME types;
    - bank account displays as the approved masked form;
    - bank account masking applies to employee detail and CSV export;
    - salary fields are hidden/redacted without `payroll.view`;
    - negative-net-pay warning toast appears during payroll preview;
    - hard-delete confirmation produces 400 and proper message;
    - report download buttons trigger CSV output with masked sensitive columns.
  - Acceptance:
    - Tests assert user-visible behavior, not implementation details only.

---

# PHASE 6 — Strict QA Verification

- [ ] **T25 — Run strict Module 08 QA suite**
  - Run: `tests/qa-strict-module08.test.ts`
  - Requirement:
    - all **93 test scenarios** pass.
  - Do not modify tests simply to bypass failures.

- [ ] **T26 — Run additional unit tests**
  - Cover:
    - employee document upload;
    - MIME/magic-byte validation;
    - document authorization;
    - leave adjustment;
    - employee reports;
    - payroll reports;
    - negative net pay;
    - closed financial period;
    - sensitive-data masking.
  - Acceptance:
    - Relevant tests pass.

- [ ] **T27 — Manual API verification**
  - Use `supertest` or Postman.
  - Verify:
    - 403 on unauthorized document access;
    - 400 on employee hard-delete with linked payroll data;
    - correct bank-account masking;
    - correct salary redaction;
    - CSV contains masked sensitive columns.
  - Acceptance:
    - All listed scenarios behave as required.

- [ ] **T28 — Backend type-check**
  - Run:
    `pnpm --filter evolix-school-api exec tsc --noEmit`
  - Acceptance:
    - Zero TypeScript errors.

- [ ] **T29 — Frontend type-check and Vitest**
  - Run the project's frontend type-check.
  - Run Vitest suite.
  - Acceptance:
    - Type-check passes.
    - Relevant tests pass.

- [ ] **T30 — Audit log verification**
  - Verify audit logging for:
    - employee document upload;
    - leave adjustment;
    - report generation.
  - Acceptance:
    - Required actions are recorded using the project's existing audit-log architecture.

- [ ] **T31 — Database integrity sweep**
  - Verify:
    - no duplicate `Employee.userId` links;
    - no overlapping active salary assignments;
    - no integrity regressions caused by the implementation.
  - Acceptance:
    - Integrity checks pass.

- [ ] **T32 — Production builds**
  - Run:
    - `pnpm build:api`
    - `pnpm build:web`
  - Acceptance:
    - Both production bundles build successfully.

---

# FINAL ACCEPTANCE GATE

- [ ] **A1 — All blockers resolved**
  - B1–B4 have explicit decisions/configuration.

- [ ] **A2 — All implementation tasks complete**
  - T01–T24 checked only after acceptance criteria pass.

- [ ] **A3 — All verification tasks complete**
  - T25–T32 pass.

- [ ] **A4 — No forbidden operations used**
  - No Playwright.
  - No `prisma db push`.
  - No `prisma db reset`.
  - No file deletions.

- [ ] **A5 — Architectural boundaries preserved**
  - Modules 01–07 remain intact.
  - Existing Module 05 attendance model is reused.
  - Existing permission, audit, financial, and storage conventions are reused where applicable.

- [ ] **A6 — Strict Money Rule preserved**
  - All monetary calculations and reconciliation logic use Decimal-safe arithmetic.
  - No floating-point arithmetic is introduced for money.

- [ ] **A7 — Final report**
  - Summarize:
    - files changed;
    - migration created;
    - tests run and results;
    - type-check results;
    - build results;
    - any remaining known issues;
    - confirmation that forbidden operations were not used.

## Completion Condition

The Ralph loop may stop only when every applicable checkbox is complete and the final acceptance gate passes. If a user decision is required, stop at the blocker and clearly state the exact decision needed.
