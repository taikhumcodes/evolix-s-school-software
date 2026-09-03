# EVOLIX SCHOOL ERP — AGENT OPERATING CONTRACT (AGENTS.md)

## 1. Stack & Architecture
- **Target Stack**:
  - Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn/Radix + TanStack Query + React Hook Form + Zod + i18next
  - Backend: Node.js + TypeScript + Express 5 + Prisma 5 + PostgreSQL
- **Architecture Pattern**:
  - Route → Controller → Service → Repository/Data-Access → Prisma
  - Controllers are thin; business rules live in services; database access lives in repositories or Prisma queries.
  - One ORM only: Prisma 5.

## 2. Multi-Tenancy & School Isolation (NON-NEGOTIABLE)
- Every query, mutation, service, and repository MUST enforce `tenant_id` scope.
- Where applicable, resources must also enforce `school_id` scope.
- **NEVER trust** `tenant_id`, `school_id`, route parameters, query parameters, or `X-Tenant-Slug` from the client without verifying the user's authorization. Tenant A must NEVER access Tenant B data.

## 3. RBAC & Security
- Permissions are configurable and authoritative. Do NOT hardcode authorization around role names alone (except superadmin bypass).
- Authorization must be permission-based (`requirePermissions(['permission.code'])`).
- Prevent privilege escalation: users cannot assign roles or permissions they do not possess.
- Personal security: password complexity, history tracking, lockout on failed attempts, session revocation, single-use 2FA recovery codes.
- TOTP secrets are encrypted at rest using a dedicated encryption key (`TOTP_ENCRYPTION_KEY`).

## 4. Money Rule (MANDATORY)
- For all financial amounts, percentages, and currencies:
  - Use Prisma `Decimal` / PostgreSQL `NUMERIC`.
  - NEVER use JavaScript floating-point numbers (`number`) as authoritative financial storage.

## 5. Audit Logging & Concurrency
- Generic `AuditLog`: Important mutations must record tenant, school, actor, action, entity, entity_id, before/after snapshots (with sensitive fields redacted), timestamp, and IP.
- Number Series: Must use PostgreSQL atomic transaction safety (`SELECT ... FOR UPDATE`) to prevent duplicate sequences or gaps. Historical identifiers never change.
- Optimistic Concurrency: Configuration records use an integer `version` check (`409 Conflict` on mismatch).

## 6. Bilingual Support (English + Hindi)
- All visible UI strings must use the i18n layer (`i18next` / `react-i18next`). Never hardcode visible text in components.

## 7. Test Policy
- Backend tests use Vitest + Supertest focusing on critical security and data scenarios.
- **DO NOT RUN PLAYWRIGHT** unless explicitly ordered.

## 8. Milestone Boundary
- **STOP at Phase M0 completion.**
- Do NOT start Module 04 (Master Data, Students, Setup Wizard, etc.) until explicitly commanded.
