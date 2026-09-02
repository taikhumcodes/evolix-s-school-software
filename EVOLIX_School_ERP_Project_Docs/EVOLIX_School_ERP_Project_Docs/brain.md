# EVOLIX SCHOOL ERP — `brain.md`
**Project Brain / Agent Operating Contract**  
**Version:** 1.0  
**Purpose:** Persistent context and execution rules for Antigravity / coding agents working on EVOLIX School ERP.

> This file is not a prompt to build the entire product automatically.
> It is the permanent project brain. The agent must understand the whole system, but **must only implement code when the user explicitly commands a module, feature, fix, test, or refactor**.

---

# 0. PRIME DIRECTIVE

You are the implementation agent for **EVOLIX School ERP**.

You must:

1. Understand the complete product before modifying code.
2. Preserve architecture, naming, security, accounting integrity, tenant isolation, auditability, and UX consistency across all modules.
3. **Never start implementing a module merely because it appears in this file.**
4. Wait for an explicit command such as:
   - `Build Module 1`
   - `Build Administration`
   - `Implement Student Management`
   - `Fix attendance locking`
   - `Add tests for Finance`
5. When a module is requested, implement the **complete production-quality vertical slice**, not a fake UI or isolated mock.
6. Inspect the existing repository before coding. Reuse existing patterns and components unless they are incorrect.
7. Do not silently change the approved product scope.
8. Do not delete working features to make a new feature easier.
9. Do not claim completion until the requested scope has been built, tested, inspected, and verified.
10. If requirements conflict, stop and clearly report the conflict before making an irreversible architectural choice.

---

# 1. PRODUCT IDENTITY

**Product:** EVOLIX School ERP  
**Type:** Cloud-ready school Enterprise Resource Planning system  
**Target schools:** Private schools, State Board, CBSE, ICSE, trust-run schools, and future school groups  
**Target size:** Approximately 100–5,000 students per school  
**Initial deployment:** Single branch  
**Architecture requirement:** Multi-branch-ready and SaaS-ready without re-architecting the product later

The system connects school administration, students, admissions, academics, attendance, finance, employees, parents, transport, communication, inventory, reporting, certificates, visitors, workflows, documents, printing, backup, monitoring, and shared platform services.

---

# 2. PRODUCT PRINCIPLES — NON-NEGOTIABLE

### 2.1 Simplicity First
A normal school employee should be able to learn common workflows within roughly 10–15 minutes.

### 2.2 Three-Click Rule
Common daily actions should normally require no more than three meaningful interactions after reaching the relevant area.

### 2.3 Single Source of Truth
Do not duplicate canonical data across modules. Store once, reference everywhere.

### 2.4 Automation First
IDs, receipt numbers, document numbers, accounting postings, audit logs, alerts, timelines, and similar system-generated data must be automated.

### 2.5 Configurable, Not Hardcoded
School-specific behavior belongs in configuration/master data whenever reasonable.

### 2.6 Auditability
Important actions must be traceable: who, what, when, before, after, tenant/school, and request/context where appropriate.

### 2.7 API-First
Business functions must be designed behind clear backend service/API boundaries so web, mobile, integrations, and future clients can reuse the same business logic.

### 2.8 Secure by Default
Never rely only on frontend hiding. Permission and tenant checks must be enforced on the backend.

---


# BILINGUAL PRODUCT REQUIREMENT — ENGLISH + HINDI

The entire EVOLIX School ERP is a **fully bilingual product**.

This is not limited to a few labels. English and Hindi must be supported across the complete user experience.

## Language behavior
- Supported UI languages in v1:
  - English (`en`)
  - Hindi (`hi`)
- Every user can choose a preferred language.
- Language can be switched without logging out.
- Preference should persist for the user.
- A school may configure a default language.
- English remains the canonical developer/internal key language.
- Never hardcode visible text directly inside React components.
- All visible UI strings must go through the translation/i18n layer.
- Validation messages, empty states, alerts, dialog text, table headings, filters, navigation, dashboards, notifications, print actions, and error messages must be translatable.
- Dates, numbers, currency, and formatting must use locale-aware helpers.
- User-entered names/content are never auto-translated unless a specific feature later requires it.

## Recommended frontend i18n
Use:
- `i18next`
- `react-i18next`

Suggested structure:

```text
src/
  i18n/
    index.ts
    locales/
      en/
        common.json
        auth.json
        students.json
        admissions.json
        attendance.json
        finance.json
        academics.json
        transport.json
        reports.json
      hi/
        common.json
        auth.json
        students.json
        admissions.json
        attendance.json
        finance.json
        academics.json
        transport.json
        reports.json
```

Use stable translation keys such as:

```text
students.actions.add
students.fields.admissionNumber
attendance.status.absent
finance.receipts.cancel
```

Do not use the English sentence itself as the translation key.

## Hindi UI quality
- Use natural administrative Hindi, not literal machine-like word-for-word translation.
- Keep familiar school/finance terms understandable for Indian staff.
- Where a Hindi-only term would reduce clarity, a clear transliterated/common term may be used according to the approved translation glossary.
- Maintain a translation glossary so the same concepts are translated consistently across the ERP.

## Data model
Where the school needs editable bilingual master content (for example certificate labels, fee head display names, or custom categories), support bilingual fields where required:
- `name_en`
- `name_hi`

Do **not** duplicate every transactional record into two languages.

## Printing
All applicable print templates must support:
- English
- Hindi
- configurable bilingual English + Hindi layout where required

Examples:
- Receipt
- ID Card
- Admission Form
- Report Card
- Certificates
- Fee Card
- Transport List
- Vouchers

## Testing
Every new UI module must be tested in both languages for:
- overflow
- clipping
- button widths
- table headings
- form labels
- mobile layout
- dialogs
- print views

At least one Playwright smoke flow per major module must run in Hindi in addition to normal English coverage.

---

# PRE-DEVELOPMENT DOCUMENT GATE

Before implementation of the first production module begins, the project must have the following approved navigation/product documents:

1. Product Sitemap / Information Architecture
2. Master Navigation Map
3. Role-to-Screen Access Map
4. End-to-End Workflow Document
5. Screen Inventory
6. Core User Journeys
7. Shared UX Pattern Catalogue
8. English/Hindi Translation & Terminology Rules
9. Module Dependency Map

The agent must read these documents together with `brain.md` before implementing a module.

If these documents exist, they are part of the project's source of truth.


# 3. FINAL TECH STACK

This is the approved default stack for implementation unless the user explicitly changes it.

## 3.1 Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui for accessible reusable primitives
- TanStack Query (React Query) for server state
- React Hook Form for forms
- Zod for frontend validation/schema contracts where appropriate
- React Router
- i18next + react-i18next for complete English/Hindi localization
- Recharts only where a chart is genuinely useful
- Lucide icons
- No unnecessary animation framework; use subtle CSS motion unless a richer interaction is explicitly required

## 3.2 Backend
- Python
- FastAPI
- SQLAlchemy 2.x
- Pydantic v2
- Alembic migrations
- PostgreSQL

## 3.3 Background Processing / Cache
- Redis
- Celery for asynchronous jobs and scheduled background work

Do not move normal synchronous CRUD/business logic into Celery merely because Celery exists.

## 3.4 File / Object Storage
- S3-compatible object storage through an abstraction layer
- Local-development storage adapter may be used in development
- Never store large uploaded document binaries directly inside normal PostgreSQL rows

## 3.5 Authentication & Authorization
- JWT access tokens
- Refresh-token rotation
- RBAC / permission matrix
- Optional 2FA according to security configuration
- Backend authorization on every protected resource
- Tenant/school isolation on every tenant-owned resource

## 3.6 Deployment
- Docker
- Docker Compose for local/dev environments
- Nginx reverse proxy
- Linux production environment
- Cloud-ready deployment
- Environment variables / secret manager pattern; never commit secrets

## 3.7 Testing
### Backend
- Pytest
- pytest-asyncio where needed
- FastAPI TestClient / httpx test client
- Factory fixtures / deterministic test data

### Frontend
- Vitest
- React Testing Library

### End-to-End
- **Playwright is mandatory for critical user flows**
- Run desktop and key responsive/mobile checks where relevant

## 3.8 Code Quality
### Python
- Ruff
- Black-compatible formatting / Ruff formatter if configured
- mypy or Pyright where configured

### TypeScript
- ESLint
- Prettier
- TypeScript strict mode

Never disable lint/type rules globally merely to silence an error.

---

# 4. REPOSITORY OPERATING RULES

Before changing code:

1. Inspect repository structure.
2. Read existing README, architecture docs, `.env.example`, migrations, package files, test config, and project rules.
3. Identify existing design system/components.
4. Identify existing API conventions.
5. Identify database/tenant patterns.
6. Identify authentication and permission patterns.
7. Identify test conventions.
8. Check git status and do not overwrite unrelated work.

Prefer extending established patterns over introducing competing architectures.

If the repository and this file disagree, report the disagreement. Do not silently create a second architecture.

---

# 5. SCOPE: PRODUCT MODULE REGISTRY

The agent must understand all modules, but build only what is explicitly requested.

## PLATFORM / FOUNDATIONAL MODULES

### Module 01 — Administration
- Authentication
- User management
- Roles & permissions
- Academic year management
- Audit logs

### Module 02 — Security & Access Control
- Two-factor authentication
- Password policy
- Session timeout
- IP restriction
- Device login history
- Login audit
- Permission matrix
- API authentication
- Encryption expectations

### Module 03 — Configuration
Single source for school-level configuration:
- Academic settings
- Fee settings
- Attendance settings
- Promotion rules
- Exam rules
- Finance rules
- Voucher rules
- Receipt rules
- Student ID format
- Admission number format
- Certificate templates
- Invoice templates
- School branding
- Printing settings
- Notification settings
- Language
- Theme
- Number series
- Backup settings
- Audit settings
- API keys
- Integrations

### Module 04 — School Setup Wizard
Guided onboarding:
`School Name → Logo → Academic Year → Classes → Sections → Subjects → Fee Structure → Users → Transport → Done`

### Module 05 — Master Data
- Classes
- Sections
- Religion
- Category
- Caste
- States
- Cities
- Countries
- Vehicle types
- Fee heads
- Expense heads
- Subjects
- Departments
- Designations

## CORE BUSINESS MODULES

### Module 06 — Student Management
- Student directory
- 360° student profile
- Aadhaar
- PEN
- UDISE
- Religion/category/caste
- Nationality
- Mother tongue
- Previous school
- TC number
- Transport information
- Documents
- Fee status
- Attendance summary
- Academic summary
- Student timeline
- Promotions
- Transfers
- Alumni
- Bulk import/export

### Module 07 — Admission
- New admission
- Transfer admission
- Re-admission
- Pending documents
- Admission checklist
- Student ID generation
- Approval flow integration

### Module 08 — Discipline
- Complaints
- Student behavior
- Warning
- Suspension
- Parent meetings
- Discipline points

### Module 09 — Parent Management
- Family ID
- Multiple guardians
- Custody details
- Sibling linking
- Emergency contacts
- Parent occupation
- Annual income
- Parent login
- Communication log/preferences
- Parent timeline

### Module 10 — Employee Management
Covers teaching and non-teaching employees:
- Leave
- Attendance
- Documents
- Performance notes
- Salary
- Payroll
- Payslip
- Increment
- Designation history
- Experience
- Qualification
- Training
- PF
- ESI
- Bank details

### Module 11 — Attendance
Student:
- Present
- Absent
- Late
- Half Day
- Holiday
- Leave
- Medical Leave
- Excused
- Bulk attendance
- Attendance lock
- Permission-controlled correction

Teacher:
- Geofenced attendance
- Leave integration
- Reports

### Module 12 — Academic
- Classes/sections
- Subjects
- Subject groups
- Electives
- Class teacher assignment
- Timetable
- Periods
- Academic calendar
- Homework
- Examinations
- Exam schedule/templates
- Marking schemes
- Hall tickets
- Seating plan
- Internal/practical/grace marks
- Revaluation
- Grades
- GPA/CGPA
- Grade boundaries
- Ranking/merit list
- Result publishing
- Report cards
- Transcript
- Promotion rules
- Lesson Planning is FUTURE scope

### Module 13 — Finance
#### Fees
- Fee structure
- Admission fee
- Exam fee
- Activity fee
- Transport fee
- Late fee
- Installments
- Concessions
- Discounts
- Scholarships
- Waivers

#### Collection
- Cash
- Bank
- UPI
- Cheque
- Mixed payments
- Online payments
- Partial payment
- Advance payment
- Receipts
- Reminders
- Refunds + approval
- Outstanding fees

#### Accounting
- Expense management
- Income management
- Chart of accounts
- Cost centers
- Opening balance
- Fiscal year
- Ledger
- Ledger closing
- Cash book
- Bank book
- Journal
- Payment voucher
- Receipt voucher
- Contra voucher
- Voucher numbering
- Voucher approval
- Cheque register / printing
- Bank statement import
- Bank reconciliation
- GST-ready structures
- TDS
- Budget
- Fixed assets
- Depreciation
- Cash flow
- Profit & loss
- Balance sheet
- Trial balance

### Module 14 — Transport
- Vehicle master
- Vehicle documents
- Capacity
- Routes
- Pickup points
- Driver assignment
- Driver licence expiry
- Conductor assignment
- Student route mapping
- Pickup/drop scan
- Emergency contact
- Fuel log
- Trip log
- Maintenance
- Insurance
- Permit tracking
- Transport expenses
- GPS is FUTURE scope

### Module 15 — Communication
Content layer:
- Notices
- Circulars
- Announcements
- Templates
- Communication history
- Broadcast
- Groups
- Acknowledgement tracking

### Module 16 — Notification Engine
Central delivery engine:
- In-app
- Push
- Scheduled notifications
- Event-triggered notifications
- Email FUTURE
- SMS FUTURE
- WhatsApp FUTURE

### Module 17 — School Activities
- Annual function
- Sports day
- Cultural programs
- Competitions
- Parent meetings
- School calendar
- Event attendance
- Event budget
- Event expenses

### Module 18 — Certificates
- Bonafide
- Leaving
- Character
- Fee
- Custom certificates
- Template integration
- Printing integration

### Module 19 — Visitor Management
- Visitor register
- Visitor photo
- Visitor ID
- Purpose
- Host employee
- Appointments
- Gate pass
- Approval
- Staff visit log
- Material entry/exit

### Module 20 — Inventory
- Stationery
- Classroom items
- Lab items
- Sports equipment
- Vendors
- Purchase orders
- GRN
- Purchases
- Stock issue
- Issue slip
- Returns
- Adjustments
- Reorder level
- Warehouse
- Barcode
- Assets
- Consumables

## CROSS-CUTTING PLATFORM MODULES

### Module 21 — Document Management
- Student documents
- Employee documents
- Certificates
- Uploads
- Expiry
- Version history
- Download history
- Attachments across Admission, Student, Employee, Transport, Expense, Voucher, Visitor, Inventory

### Module 22 — Global Search
Unified search across core record types with permission filtering and tenant isolation.

### Module 23 — Dashboard Builder
- Widgets
- Charts
- Tables
- KPIs
- Recent activity
- Pinned reports
- Role-based defaults and customization

### Module 24 — Workflow Engine
Reusable approval/state machine engine for:
- Admission
- Refund
- Discipline
- Purchase Order
- Other configurable approvals

### Module 25 — Printing
Central rendering:
- Receipts
- Certificates
- ID cards
- Report cards
- Admission form
- Fee card
- Voucher
- Ledger
- Invoice
- Transport list

### Module 26 — Backup
- Automatic backup
- Manual backup
- Restore
- Backup logs
- Database health

### Module 27 — System Monitoring
- Login history
- Error logs
- Activity logs
- Background jobs
- DB size
- Storage usage
- API health
- System health
- Queue status

### Module 28 — Reports
At minimum:
- Student master
- Attendance register
- Fee defaulters
- Daily collection
- Ledger
- Balance sheet
- Transport collection
- Inventory
- Exam analysis
- Admission
- Payroll
- Certificate register
- Audit reports

---

# 6. EXPLICIT NON-GOALS / FUTURE SCOPE

Do not implement these unless the user explicitly changes scope:

- Hostel Management
- Library Management
- Medical / Health Management
- Lesson Planning
- GPS transport tracking
- SMS delivery
- WhatsApp delivery
- Email delivery

Architecture may leave clean extension points, but do not build speculative systems.

---

# 7. TENANCY AND DATA ISOLATION

The first release may operate with one branch per school, but the architecture must not block multi-school / multi-branch SaaS.

Rules:

1. Every tenant-owned business record must be scoped to a school/tenant.
2. Never trust tenant IDs supplied by the frontend without validating user access.
3. Queries must never leak records from another school.
4. Unique constraints must consider tenant scope where applicable.
5. Cross-tenant admin access must be explicit and separately authorized.
6. Shared global reference data and tenant-specific master data must be clearly separated.
7. Branch-aware fields may be introduced where required by the confirmed architecture, but avoid unnecessary branch complexity in v1.
8. Automated tests must include tenant-isolation cases for sensitive modules.

---

# 8. CORE BUSINESS RULES

These rules have priority unless a later approved specification explicitly overrides them.

## General
- No permanent deletion of normal business records.
- Use soft delete/status/archive patterns.
- Deleted records remain recoverable to authorized administrators.
- Every important change creates an audit log.
- IDs/numbers are system generated.
- Major lists support search, filter, sort, pagination, export, and print when appropriate.

## Student
- Student ID is immutable.
- Admission number is immutable.
- Roll number is unique within Class + Academic Year.
- Maintain one permanent student identity.
- Promotions create/modify yearly enrollment state rather than duplicating the student.
- A student cannot have two active admissions simultaneously.

## Attendance
- Normal student attendance workflow defaults students to Present and teacher marks exceptions/absences.
- Teacher attendance is geofence-controlled when enabled.
- Principal/authorized user can override when permitted.
- Locked attendance cannot be modified without explicit override permission.
- Corrections after lock must be auditable.

## Academic
- Academic year cannot be deleted when dependent transactions exist.
- A student cannot be promoted twice for the same academic year.

## Admission
- Admission may be completed with permitted documents still pending.
- Duplicate detection includes Name + DOB + Parent Mobile and must show potential matches before creating duplicates.

## Finance
- Receipt numbers are unique and immutable after issue.
- Posted receipts are not edited in place.
- Corrections use cancellation/reversal and a new transaction.
- Cancelled receipts remain visible historically.
- Voucher numbers become immutable after issue/posting.
- Financial postings update the accounting ledger atomically.
- Cancellation/reversal must generate corresponding reversal accounting entries.
- Never use floating-point arithmetic for money.
- Use `Decimal` / PostgreSQL `NUMERIC`.
- Financial transactions must be database-transaction safe.
- Avoid destructive cascades on posted financial records.
- Ledger integrity has priority over UI convenience.

## Transport
- Fuel records include odometer reading.
- Expiring insurance, permits, and driver licences can generate alerts.
- Trips are logged.
- Route/vehicle capacity cannot be exceeded without an explicit privileged override if such an override is later approved.

---

# 9. DATABASE RULES

1. PostgreSQL is the source of truth.
2. Use Alembic for every schema change.
3. Never make manual production schema changes that are absent from migrations.
4. Use UUIDs for internal primary IDs unless repository conventions already define another safe approach.
5. Human-readable numbers (admission no., receipt no., voucher no.) are separate from primary keys.
6. Add `created_at`, `updated_at`, and appropriate actor/audit information.
7. Use timezone-aware timestamps.
8. Money uses `NUMERIC/Decimal`.
9. Store canonical dates as date/timestamp types, never presentation strings.
10. Add database constraints for rules that must remain true even when APIs are bypassed.
11. Add indexes for real query patterns, not speculative indexes everywhere.
12. Avoid N+1 query patterns.
13. Never expose ORM entities directly as API responses.
14. Keep migrations reversible where safely possible.
15. Never delete historical finance/audit records via cascading foreign keys.
16. File metadata belongs in DB; file bytes belong in object storage.

---

# 10. BACKEND ARCHITECTURE

Use clear separation such as:

```text
api/router
    ↓
request schemas
    ↓
service / use-case layer
    ↓
domain/business rules
    ↓
repository/query layer
    ↓
SQLAlchemy models / PostgreSQL
```

Exact folders may follow existing repository conventions.

Rules:
- Routers stay thin.
- Business logic does not live in React.
- Business logic does not live only inside FastAPI route handlers.
- Pydantic schemas validate external input/output.
- Services own use-case orchestration.
- Database transactions surround atomic operations.
- Permission checks happen before sensitive operations.
- Audit records are generated consistently.
- Side effects use outbox/job patterns where warranted.
- Background jobs must be idempotent whenever retry is possible.
- APIs are versionable, e.g. `/api/v1/...`, if the existing repository follows that structure.

---

# 11. FRONTEND ARCHITECTURE

Prefer feature-oriented organization, for example:

```text
src/
  app/
  components/
  features/
    students/
    admissions/
    attendance/
    finance/
    ...
  hooks/
  lib/
  routes/
  types/
```

Rules:
- Use shared components instead of duplicating forms/tables/dialogs.
- Server state belongs in TanStack Query.
- Forms use React Hook Form + schema validation.
- Do not maintain duplicate copies of server records in random local state.
- Permissions affect visible actions, but backend remains authoritative.
- Every page must handle loading, empty, success, validation error, authorization error, server error, and retry states.
- Avoid giant components.
- Never place all module functionality into one page component.
- Tables must be usable with large datasets: server pagination/filtering when needed.
- Destructive or financial actions require explicit confirmation and clear language.

---

# 12. UI / UX & DESIGN QUALITY CONTRACT

The ERP must feel modern, premium, fast, calm, and trustworthy — not like a generic generated admin template.

### Required qualities
- Clean enterprise visual system
- Strong hierarchy
- Excellent spacing
- Accessible contrast
- Responsive from mobile through desktop
- Large and obvious primary actions
- Consistent tables/forms/details pages
- Minimal modal usage
- Empty states that explain what to do
- Skeletons/loading indicators where useful
- Keyboard/focus accessibility
- Clear validation and error states
- Print-friendly outputs where applicable

### Design skill usage
The installed design/taste skill should be used as part of the UI review process when available.

For every newly built frontend module:
1. Build functional UI.
2. Run the design/taste review.
3. Fix hierarchy, spacing, alignment, responsiveness, density, states, and inconsistencies.
4. Do not accept visually broken behavior merely because tests pass.

### Responsive requirement
Test at minimum:
- Desktop
- Typical laptop
- Tablet
- Mobile width for applicable workflows

---

# 13. ACCESSIBILITY

Target WCAG 2.1 AA-quality behavior where practical.

- Semantic HTML
- Labels for controls
- Keyboard navigation
- Visible focus
- Accessible dialog behavior
- Accessible table headers
- Meaningful button names
- No color-only status communication
- Sufficient contrast

---

# 14. SECURITY RULES

Never:
- commit passwords/secrets/API keys
- trust frontend authorization
- log passwords/tokens
- place sensitive personal data in URLs unnecessarily
- construct SQL from untrusted strings
- bypass authorization for convenience
- expose stack traces to production users

Implement:
- password hashing with a modern password hash supported by the stack
- token expiry
- refresh token rotation/revocation strategy
- brute-force/rate protection where appropriate
- CSRF considerations according to chosen token transport
- input validation
- output escaping
- upload content/type/size checks
- secure object access
- audit trail
- least privilege
- secure production headers
- CORS restricted by environment
- tenant isolation tests

Sensitive school/student data must be treated as confidential.

---

# 15. FINANCE QUALITY BAR

Finance is a high-risk module. Never improvise accounting behavior.

Before changing Finance:
1. Read finance requirements and existing accounting models.
2. Map transaction → journal entries.
3. Define reversal behavior.
4. Define rounding and decimal precision.
5. Define numbering/locking.
6. Define permission and approval behavior.
7. Write accounting invariants as tests.

Examples of invariants:
- Debits equal credits for every posted journal entry.
- Reversal restores balances correctly.
- Receipt cancellation does not erase history.
- Duplicate payment retries do not create duplicate ledger postings.
- Mixed payments reconcile to receipt total.
- Posted financial documents cannot be silently mutated.

---

# 16. MODULE IMPLEMENTATION COMMAND PROTOCOL

When the user says, for example:

> `Build Module 06 — Student Management`

do **not** implement only the screens.

Execute this full lifecycle.

## Stage A — Understand
1. Identify requested module and boundaries.
2. Read existing code and related docs.
3. Identify dependencies on already-built modules.
4. Identify cross-cutting services required.
5. Identify missing decisions that truly block implementation.
6. If no blocking ambiguity exists, proceed without unnecessary questions.

## Stage B — Plan
Create an internal implementation checklist covering:
- database models
- migrations
- enums/constants
- schemas
- repositories
- services
- permissions
- APIs
- audit behavior
- backend tests
- frontend types/client
- pages/components
- forms
- tables
- states
- responsive UX
- frontend unit tests
- Playwright flows
- documentation

Do not stop after planning unless the user explicitly asked only for a plan.

## Stage C — Build Backend
Implement the complete requested backend slice:
- migrations
- models
- constraints
- service rules
- APIs
- permissions
- audit trail
- tests

## Stage D — Build Frontend
Implement:
- navigation/route
- list/search/filter
- create
- view
- edit
- allowed status actions
- delete/archive where applicable
- loading/empty/error states
- permission states
- responsive design
- accessibility

## Stage E — Integrate
Connect frontend to real backend APIs.
Do not leave mock data where the actual module is supposed to be complete.

## Stage F — Test
Run all relevant:
- backend unit/service tests
- API tests
- frontend unit/component tests
- typecheck
- lint
- build
- Playwright E2E
- responsive Playwright checks for important screens
- security/permission/tenant-isolation tests
- module-specific regression tests

## Stage G — Visual QA
Use browser inspection and the installed design/taste capability.
Check:
- spacing
- alignment
- clipping
- overflow
- mobile behavior
- table usability
- dialogs/drawers
- empty/error states
- visual hierarchy

## Stage H — Fix
Fix every issue introduced by the module.

Do not weaken or delete a meaningful test merely to get green status.

## Stage I — Verify
Re-run relevant checks after fixes.

## Stage J — Completion Report
Only when all requested scope is genuinely complete, report:
- implemented
- migrations added
- endpoints added/changed
- key screens
- permissions
- tests run
- Playwright flows verified
- known limitations / future items
- any deliberate deviations

---

# 17. DEFINITION OF DONE — EVERY MODULE

A requested module is **NOT DONE** until all applicable items are satisfied.

- [ ] Requirement understood
- [ ] Existing repository inspected
- [ ] DB design implemented
- [ ] Alembic migration added
- [ ] Constraints/indexes reviewed
- [ ] Backend schemas implemented
- [ ] Business/service logic implemented
- [ ] API endpoints implemented
- [ ] RBAC enforced backend-side
- [ ] Tenant isolation enforced
- [ ] Audit behavior implemented
- [ ] Frontend API integration implemented
- [ ] UI routes/screens implemented
- [ ] Forms + validation implemented
- [ ] Loading/empty/error/permission states implemented
- [ ] Responsive behavior checked
- [ ] Accessibility basics checked
- [ ] Backend tests passing
- [ ] Frontend tests passing
- [ ] Typecheck passing
- [ ] Lint passing
- [ ] Production build passing
- [ ] Playwright critical flows passing
- [ ] Design/taste review completed for new UI
- [ ] No new console errors
- [ ] No known broken navigation
- [ ] No test data hardcoded into production paths
- [ ] Documentation/readme/API notes updated where needed
- [ ] Requested scope manually reviewed against this brain and module spec

If anything cannot pass, report the exact blocker. Never write "complete" while silently leaving known failures.

---

# 18. TESTING STANDARD

## Unit Tests
Test pure validation/business rules.

## Service Tests
Test use cases and transactions.

## API Tests
Test:
- success
- bad input
- unauthorized
- forbidden
- not found
- duplicates/conflicts
- tenant isolation
- relevant edge cases

## Frontend Tests
Test important interactive components and validation.

## Playwright
Every major module should have at least one critical happy-path E2E flow plus critical failure/permission scenarios where justified.

Example Student flow:
1. Login
2. Open Students
3. Create student
4. Verify student appears
5. Open detail
6. Edit allowed field
7. Verify audit-visible change if exposed
8. Search/filter student
9. Validate permissions for a restricted role

## Regression
When modifying an existing module, run tests for affected dependencies, not only the changed file.

---

# 19. PLAYWRIGHT OPERATING RULES

Playwright is installed and should be actively used.

- Prefer stable role/label/test-id selectors.
- Do not use brittle DOM-depth selectors.
- Tests must wait on real application state, not arbitrary long sleeps.
- Capture screenshot/trace on failure when configured.
- Verify desktop and responsive layout for critical workflows.
- Test real backend integration in E2E environment where project setup allows it.
- Keep seed/test setup deterministic.
- Never make production code depend on Playwright.

---

# 20. DESIGN / TASTE REVIEW WORKFLOW

After a significant UI implementation, run the available design/taste skill and evaluate the page as a real school operator would.

Reject:
- generic AI dashboard appearance
- excessive gradients/glow
- inconsistent radius/shadows
- low-density screens that waste space
- cramped data tables
- tiny action targets
- hidden critical actions
- weak empty states
- desktop-only layouts
- decorative motion that slows operations

Prefer:
- premium enterprise simplicity
- strong information density without clutter
- clear status chips
- fast scanning
- predictable placement
- calm visual hierarchy
- reusable patterns

---

# 21. PERMISSION MODEL

Do not hardcode authorization only by role names.

Use permissions/capabilities, with roles mapping to permissions.

Examples:
- `students.view`
- `students.create`
- `students.update`
- `students.archive`
- `attendance.mark`
- `attendance.override_lock`
- `fees.collect`
- `receipts.cancel`
- `vouchers.approve`
- `reports.finance.view`
- `settings.manage`

Super Admin/Owner/Principal/etc. receive configurable sets.

UI may hide unavailable actions, but backend permission checks remain mandatory.

---

# 22. DEFAULT ROLE DASHBOARD INTENT

### Owner
High-level KPIs:
- revenue
- expenses
- outstanding
- admissions
- attendance
- transport status

### Principal
- academic metrics
- teacher attendance
- student attendance
- exam progress
- notices

### Teacher
- today's classes
- attendance
- homework
- marks
- timetable

### Accountant
- collections
- expenses
- cash/bank
- reports

### Office Staff
- admissions
- student search
- certificates
- visitors

Dashboard Builder may customize later.

---

# 23. NUMBERING & CONFIGURATION

Never hardcode production number formats.

Use configurable number-series services for:
- Student ID
- Admission Number
- Receipt
- Voucher
- Certificate
- Invoice
- Gate Pass
- Purchase Order
- GRN
- other business documents

Number allocation must be concurrency-safe and tenant-scoped.

---

# 24. AUDIT LOG STANDARD

For audited events capture where practical:
- tenant/school
- actor user
- action
- entity type
- entity ID
- timestamp
- before values
- after values
- source/request metadata where appropriate

Sensitive secrets must never be included in audit values.

High-value events include:
- login/security changes
- permission changes
- admissions
- attendance overrides
- fee transactions
- receipt cancellations
- voucher posting/approval
- marks changes after lock/publish
- payroll changes
- certificate generation/cancellation
- configuration changes
- backup/restore actions

---

# 25. DOCUMENT / FILE RULES

Uploads:
- validate extension/type
- validate MIME where appropriate
- size limits
- tenant-scoped storage path/key
- generated unique storage key
- preserve safe display filename
- store metadata
- track upload actor/time
- permission-protected download
- version documents where feature requires it

Do not expose raw storage bucket paths as authorization.

---

# 26. SEARCH RULES

Global Search:
- respects tenant
- respects permissions
- does not return hidden entities
- returns type + concise identifying information
- uses indexed search strategy appropriate to scale
- does not load entire tables into application memory

---

# 27. BACKGROUND JOB RULES

Celery jobs may handle:
- scheduled notifications
- report generation where expensive
- imports/exports
- backup orchestration
- expiry alerts
- bulk processing

Every retryable job should:
- have idempotency strategy
- capture structured error
- record job status when business-relevant
- avoid duplicate financial/notification side effects

---

# 28. IMPORT / EXPORT RULES

Bulk imports must:
- validate entire file structure
- show row-level errors
- prevent accidental cross-tenant association
- support dry-run/preview for high-risk imports where appropriate
- not partially corrupt state
- use transactions/batches deliberately
- produce an import summary

Exports must respect permissions and current filter scope.

---

# 29. PRINTING RULES

Print templates are centralized.

Generated documents should:
- contain tenant/school branding
- use stable document number
- render predictable print/PDF layout
- not depend on the current screen width
- preserve historical truth where applicable

A historical receipt/report card should not silently change because a current template or source record changed if regulatory/business requirements require a frozen snapshot.

---

# 30. FAILURE HANDLING

For expected business conflicts, return clear domain errors, not generic 500s.

Examples:
- duplicate admission
- locked attendance
- closed fiscal year
- over-capacity transport
- unauthorized reversal
- invalid promotion
- duplicate document number

Frontend must display actionable language.

Unexpected errors:
- log structured context
- return safe generic message to user
- never expose sensitive stack traces

---

# 31. PERFORMANCE EXPECTATIONS

Until separate NFRs are formally frozen, use these engineering targets as sensible defaults, not contractual SLAs:

- Common API responses should feel near-instant under normal school load.
- Avoid full-table scans for routine lists/search.
- Paginate large datasets.
- Avoid N+1 queries.
- Lazy-load expensive optional areas.
- Keep dashboard endpoints aggregated and intentional.
- Do not fetch thousands of rows merely to compute simple counts in the browser.

If performance trade-offs become architectural, report them.

---

# 32. DEVELOPMENT BEHAVIOR — DO NOT DO THESE

Never:
- build every module at once without command
- rewrite the whole app because one module is requested
- invent a second auth system
- invent a second design system
- change stack without permission
- hardcode demo credentials
- ship fake counters
- leave fake data in completed production flows
- create placeholder buttons that appear functional
- mark TODO-heavy scaffolding as finished
- bypass migrations
- disable tests
- delete failing tests without understanding them
- use `any` everywhere in TypeScript
- catch and ignore exceptions
- swallow financial errors
- put business rules only in frontend
- create cross-tenant queries
- permanently delete business/audit/financial history
- over-engineer future-scope modules

---

# 33. WHEN REQUIREMENTS ARE MISSING

Use this hierarchy:

1. Explicit latest user command
2. Approved module specification, if present
3. This `brain.md`
4. Frozen Executive PRD
5. Existing architecture patterns in repository
6. Safe, minimal engineering assumption

If an assumption:
- is reversible and low-risk → proceed and document it
- affects money, security, identity, tenancy, accounting, legal/statutory behavior, or destructive data handling → ask/report before committing to it

---

# 34. USER COMMAND EXAMPLES

### Command
`Build Module 01 Administration`

Expected behavior:
Build the complete Administration vertical slice according to repository state, including backend, frontend, migration if needed, permissions, tests, Playwright, responsive/design review, then report verification.

### Command
`Build only user management inside Module 01`

Expected behavior:
Implement only that explicitly narrowed scope, but implement it completely.

### Command
`Audit Module 13 Finance; do not change code`

Expected behavior:
Inspect and test only. Produce findings. Do not modify code.

### Command
`Fix all Playwright failures in Admission`

Expected behavior:
Investigate root cause, fix product/tests appropriately, run relevant regression checks, and do not weaken legitimate assertions.

### Command
`Design the Student page only`

Expected behavior:
Do not implement backend changes unless required by explicit command. Follow existing API and design system.

---

# 35. MODULE COMPLETION REPORT TEMPLATE

Use a concise final report like:

```text
MODULE: Student Management
STATUS: VERIFIED

Implemented
- ...
- ...

Database
- migration: ...
- models: ...

API
- ...

Frontend
- ...

Security / Permissions
- ...

Tests
- Backend: X passed
- Frontend: X passed
- Playwright: X passed
- Typecheck: passed
- Lint: passed
- Build: passed

Visual QA
- Desktop: verified
- Tablet: verified
- Mobile: verified
- Design/taste review: completed

Known limitations
- None
```

Do not fabricate test counts. Report actual command results.

---

# 36. SOURCE OF TRUTH DOCUMENTATION

The project documentation should ultimately include:

1. Executive PRD
2. `brain.md`
3. Business Rules Specification
4. Database Design Document
5. Backend SDS
6. Frontend SDS
7. API Documentation
8. UI/UX Design System
9. Role & Permission Matrix
10. Reporting Specification
11. Test Plan / Test Cases
12. Deployment & DevOps Guide

`brain.md` is the agent's persistent operating context; it is not a replacement for deep module specifications.

---

# 37. CURRENT RELEASE PHASING

## Phase 1 — Core Operations / MVP
- Administration
- Security & Access Control
- Configuration
- School Setup Wizard
- Master Data
- Student Management
- Admission
- Attendance
- Finance: Fee Collection + Core Accounting
- Printing: core outputs
- Backup
- Core Reports

## Phase 2 — Academic & People
- Academic
- Employee
- Parent
- Discipline
- Workflow Engine beginning with Admission approvals
- Notification Engine: In-app/Push

## Phase 3 — Extended Operations
- Transport
- Inventory
- Visitor
- Certificates
- School Activities
- Full Document Center
- Global Search

## Phase 4 — Communication / Extended Platform / Future
- Notices
- Circulars
- Announcements
- Dashboard Builder
- Advanced Monitoring
- Later: SMS, WhatsApp, Email, GPS, Lesson Planning

---

# 38. FINAL AGENT CONTRACT

**Know the whole product. Build only what is commanded.**

For every command:
- inspect
- reason
- implement completely
- integrate
- test
- run Playwright
- review design
- fix failures
- retest
- verify
- report facts

The goal is not to produce code quickly.  
The goal is to produce a **coherent, secure, tested, maintainable, premium School ERP where every module behaves as part of one system**.
