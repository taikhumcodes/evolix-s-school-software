# Evolix School System — Multi-Tenant SaaS Transformation Blueprint v4.0

**Document type:** SaaS architecture and transformation specification  
**Base specification:** Evolix School System Unified Master Blueprint v3.0  
**Target:** Production-ready multi-tenant school ERP SaaS  
**Tenant unit:** One school by default  
**Architecture principle:** Preserve the existing 11 business capability modules and introduce a separate SaaS control plane.

---

# 1. Transformation Objective

Evolix School System will evolve from a tenant-ready single-school deployment into a commercially operable multi-tenant SaaS platform.

The transformation must preserve:

- M01 Student Information & Admissions
- M02 Attendance & Geofencing
- M03 Fees, Finance & Banking
- M04 Academics & Timetable
- M05 Examinations & Report Cards
- M06 HR, Leave & Payroll
- M07 Transport
- M08 Promotion, TC & Certificates
- M09 Communication, Dashboards & Reports
- M10 Inventory & Assets
- M11 Administration, Security & Operations

No business module should be rewritten merely because SaaS is introduced.

The current architecture already defines Laravel as the authoritative business-write layer and requires tenant-aware records, files, jobs and reports. The existing demo restriction is specifically that commercial SaaS subscription management and a cross-school platform portal are not yet implemented.

## Target outcome

```text
                 EVOLIX SaaS PLATFORM
                        │
              ┌─────────┴─────────┐
              │   CONTROL PLANE   │
              │                   │
              │ Tenant Registry   │
              │ Provisioning      │
              │ Billing           │
              │ Subscriptions     │
              │ Entitlements      │
              │ Usage Metering    │
              │ Platform Admin    │
              │ SaaS Operations   │
              └─────────┬─────────┘
                        │
              Trusted Tenant Context
                        │
        ┌───────────────┼───────────────┐
        │               │               │
      School A        School B        School C
        │               │               │
        └──────────── Existing M01-M11 ─┘
```

---

# 2. Architectural Decision

## 2.1 Recommended tenancy model

Use:

**Shared application + shared MySQL tenant schema + strict `school_id` isolation.**

This is the preferred initial SaaS architecture because the existing application has already been designed around `school_id` tenancy. Every school-owned table is required to include indexed `school_id`, and tenant context must come from authenticated server state rather than browser-controlled payloads.

### Isolation tiers

| Tier | Architecture | Intended use |
|---|---|---|
| Standard | Shared DB, shared tables, `school_id` isolation | Default SaaS customers |
| Scale tier | Shared application, tenant-sharded MySQL | High tenant count/data volume |
| Enterprise | Shared application or dedicated app + dedicated database | Contractual isolation requirements |
| Dedicated | Dedicated application/database/storage stack | Exceptional enterprise deployment |

The application must not depend on a tenant always living in the same database.

Introduce a server-side `TenantConnectionResolver` abstraction so future database sharding does not require rewriting M01-M11.

---

# 3. SaaS Control Plane

The 11 ERP modules remain the **Application Plane**.

Add a separate **Platform/Control Plane**.

## P01 — Tenant Registry

Responsible for:

- school/tenant creation;
- tenant slug;
- status;
- region;
- provisioning state;
- default timezone;
- custom domain mapping;
- tenant database/shard mapping;
- lifecycle status.

The existing `schools` entity should remain the tenant anchor to avoid rewriting every foreign key.

Extend it rather than replacing it with an unrelated `tenants` entity.

Suggested fields:

```text
schools
- id
- tenant_slug
- name
- lifecycle_status
- provisioning_status
- data_region
- timezone
- shard_key
- subscription_status_cache
- created_at
- archived_at
```

---

## P02 — Tenant Membership & Identity

The current system assumes users operate within a school. SaaS should allow a human identity to belong to one or more schools without duplicating credentials.

Recommended refactor:

```text
users
  ↓
school_memberships
  ↓
membership_roles
  ↓
existing roles / permissions
```

### `users`

Global authentication identity.

Contains:

- email/mobile/login identity;
- password/security attributes;
- MFA settings;
- global identity status.

### `school_memberships`

Contains:

- `user_id`;
- `school_id`;
- membership status;
- joined date;
- default tenant indicator.

### `membership_roles`

Connects a membership to the existing school RBAC system.

Existing school role semantics remain unchanged.

The current Management/Owner, Principal, Teacher, Accountant, Office Admin, Transport Admin, Store Manager and Evolix Support responsibilities remain valid.

### Tenant switching

A browser may request:

```http
POST /api/v1/tenant/switch
```

with a tenant slug or membership identifier.

Laravel must then:

1. authenticate the user;
2. verify active membership;
3. set trusted server-side tenant context;
4. rotate/update session context;
5. return the selected school.

Business API payloads must still never contain an authoritative `schoolId`.

---

# 4. Tenant Resolution

Tenant resolution should use the following priority:

```text
Authenticated membership
       ↓
Verified requested tenant
       ↓
Trusted session TenantContext
       ↓
Domain/subdomain validation
       ↓
Laravel policies/global scopes
```

Possible URLs:

```text
school-a.app.evolix.example
school-b.app.evolix.example
```

or later:

```text
erp.schooldomain.com
```

through custom domain mapping.

A hostname alone must never grant access.

Hostname determines the requested tenant; authenticated membership determines whether access is allowed.

---

# 5. Tenant Isolation Contract

Tenant isolation becomes a platform-level security invariant.

## 5.1 Database isolation

Every tenant-owned query must contain:

```sql
WHERE school_id = :authenticated_school_id
```

Laravel must provide:

```text
TenantContext
TenantScope
TenantAwareModel
TenantPolicy
TenantIsolationTest
```

Do not depend only on developers manually adding `where('school_id', ...)`.

### Required controls

- automatic global tenant scope;
- automatic `school_id` assignment on create;
- reject mismatched tenant foreign keys;
- composite tenant-aware indexes;
- tenant-aware unique constraints;
- policies validating tenant ownership;
- explicit bypass only for platform infrastructure code.

Example:

```text
unique(school_id, admission_no)
unique(school_id, receipt_no)
unique(school_id, invoice_no)
unique(school_id, tc_no)
```

These constraints already align with the existing data architecture.

---

# 6. Cross-Tenant Foreign-Key Protection

A common SaaS bug is:

```text
School A student
linked to
School B section
```

Every relationship involving tenant-owned records must therefore verify:

```text
child.school_id == parent.school_id
```

This should be enforced at:

1. service layer;
2. validation layer;
3. database design where technically practical;
4. automated isolation tests.

Cross-tenant references must return `404` or `403` without exposing whether another tenant's record exists.

---

# 7. Tenant Isolation Beyond MySQL

`school_id` isolation must cover every infrastructure layer.

## Redis

Cache keys:

```text
tenant:{schoolId}:students:...
tenant:{schoolId}:dashboard:...
```

Locks:

```text
tenant:{schoolId}:attendance:{date}:{section}
```

Rate limits:

```text
tenant:{schoolId}:user:{userId}
```

Never use globally reusable cache keys for tenant-owned information.

## Queue jobs

Every tenant-aware queued job contains:

```text
tenantId
actorId
requestId
```

Before execution:

```text
Resolve tenant
→ establish TenantContext
→ validate tenant active state
→ execute job
→ clear TenantContext
```

Queue workers must never retain tenant context between jobs.

## Files

Object storage namespace:

```text
schools/{schoolId}/students/...
schools/{schoolId}/receipts/...
schools/{schoolId}/report-cards/...
schools/{schoolId}/exports/...
schools/{schoolId}/backups/...
```

The existing blueprint already requires private tenant-aware files and protected short-lived downloads.

## Reports

Every report job stores:

```text
school_id
requested_by
permission_snapshot
filters
output_file_id
status
```

A completed report must still perform authorization when downloaded.

---

# 8. Subscription Architecture

Subscription management must remain separate from financial accounting inside M03.

**Important distinction:**

```text
M03 Finance
= school's internal accounting

SaaS Billing
= Evolix charging the school
```

Never post Evolix subscription invoices into a school's accounting ledger automatically.

---

# 9. Billing Provider Abstraction

Implement:

```text
BillingGateway
├── createCustomer()
├── createCheckoutSession()
├── createSubscription()
├── cancelSubscription()
├── resumeSubscription()
├── changePlan()
├── getInvoice()
├── verifyWebhook()
└── openCustomerPortal()
```

A payment provider such as Stripe, Razorpay, or another approved gateway can implement this interface.

M01-M11 must never directly call the provider SDK.

Only the SaaS Billing service may do so.

---

# 10. Subscription Data Model

Recommended control-plane tables:

```text
billing_accounts
plans
plan_versions
subscriptions
subscription_items
entitlements
plan_entitlements
tenant_entitlement_overrides
billing_events
billing_invoices
billing_payments
usage_meters
usage_records
provisioning_runs
support_access_grants
tenant_domains
```

## Plan versioning

Never modify the commercial meaning of an existing plan row after customers subscribe.

Use:

```text
Plan
  └── Plan Version
```

Example:

```text
Growth Plan
 ├── v1
 └── v2
```

Existing tenants may remain on v1 while new customers receive v2.

---

# 11. Subscription State Machine

Recommended subscription lifecycle:

```text
Prospect
   ↓
Trialing
   ↓
Active
   ↓
Past Due
   ↓
Grace
   ↓
Suspended
   ↓
Cancelled
   ↓
Archived
```

Payment recovery/grace duration should remain configurable rather than hard-coded.

### Important principle

Subscription failure must never delete tenant data.

---

# 12. Access Behaviour by Subscription State

| State | Application behaviour |
|---|---|
| Trialing | Normal access according to trial entitlements |
| Active | Normal access |
| Past Due | Normal or warning-limited access according to policy |
| Grace | Access with prominent billing warning |
| Suspended | Recommended business read-only mode; billing/account recovery available |
| Cancelled | Restricted according to retention policy |
| Archived | No normal login; platform recovery only |

Financial, attendance, marks, payroll and certificate history must never be destructively modified because a subscription expires.

This preserves the existing immutable-history philosophy of the ERP.

---

# 13. Entitlement System

Subscription plans should not be implemented as hundreds of React conditions such as:

```typescript
if (plan === 'premium')
```

Create an entitlement engine.

Examples:

```text
students.enabled
attendance.enabled
finance.enabled
exams.enabled
payroll.enabled
transport.enabled
inventory.enabled

students.max_active
users.max_staff
storage.max_gb
messages.whatsapp.monthly
reports.advanced
custom_domain.enabled
api_access.enabled
```

## Critical authorization rule

Entitlements and RBAC are different.

```text
Subscription Entitlement
        ↓
User RBAC
        ↓
Tenant Scope
        ↓
Business Rule
        ↓
Allowed Action
```

Example:

A tenant may have Payroll enabled.

That does **not** mean a Teacher can approve payroll.

The existing high-risk RBAC rules remain authoritative.

---

# 14. Existing Customer Preservation

The current Saifiyah deployment should be migrated as:

```text
Tenant: Saifiyah High Secondary School
Plan: Legacy / Full Access
Entitlements: All existing capabilities enabled
```

This guarantees SaaS transformation does not unexpectedly disable functionality already approved in Blueprint v3.0.

Do not retrofit commercial limitations into existing workflows without explicit product approval.

---

# 15. Usage Metering

Meter only resources that may affect commercial limits or infrastructure cost.

Examples:

```text
active students
active staff users
object storage
report-generation volume
WhatsApp/SMS messages
API requests
large exports
```

Usage collection should use domain events rather than repeated expensive table scans where possible.

Example:

```text
StudentActivated
        ↓
UsageMeter
        ↓
active_students +1
```

Usage meters are not authoritative business data.

M01 remains authoritative for student records.

---

# 16. Webhook Architecture

Billing webhooks are security-sensitive financial events.

Required flow:

```text
Provider
   ↓
Webhook endpoint
   ↓
Verify signature
   ↓
Persist billing_event
   ↓
Check provider event ID
   ↓
Return safely if duplicate
   ↓
Queue event processing
   ↓
Update subscription
   ↓
Recalculate entitlements
   ↓
Audit
```

Webhook event IDs require unique constraints.

Handlers must be idempotent.

Never activate a subscription only because the browser says payment succeeded.

The verified server-side provider event is authoritative.

---

# 17. Tenant Provisioning Workflow

```text
Create Account
      ↓
Create School/Tenant
      ↓
Create Billing Account
      ↓
Create Owner Membership
      ↓
Select Plan / Trial
      ↓
Provision Defaults
      ↓
Create Storage Namespace
      ↓
Seed Roles & Permissions
      ↓
Seed Academic Configuration
      ↓
Run Validation
      ↓
Mark Tenant ACTIVE
```

Provisioning must be an idempotent state machine.

Suggested states:

```text
PENDING
BILLING_PENDING
PROVISIONING
VERIFYING
ACTIVE
FAILED
SUSPENDED
ARCHIVED
```

Each provisioning step records success/failure.

Re-running provisioning must not duplicate:

- roles;
- default classes;
- fee masters;
- users;
- memberships;
- settings.

---

# 18. School Setup Wizard

After provisioning:

### Step 1 — School profile

- name;
- logo;
- contact;
- timezone;
- academic board.

### Step 2 — Academic setup

- academic year;
- classes;
- sections;
- shifts.

### Step 3 — Attendance

- school coordinates;
- geofence radius;
- location accuracy policy;
- attendance windows.

### Step 4 — Staff

- Principal;
- Teachers;
- Accountant;
- Office Admin.

### Step 5 — Finance

- financial year;
- fee categories;
- bank accounts;
- receipt numbering.

### Step 6 — Communication

- WhatsApp/SMS configuration;
- message templates.

Existing functionality remains configuration-driven rather than SaaS hard-coded.

---

# 19. Platform Administration

Introduce an Evolix Platform Console separate from school administration.

## Platform-level capabilities

```text
Tenant search
Tenant lifecycle status
Subscription status
Plan assignment
Usage
Provisioning status
Service health
Billing event history
Support-access grants
Tenant suspension/reactivation
Tenant export
Recovery operations
```

Platform staff should not automatically receive school business-data access.

---

# 20. Platform RBAC

Platform RBAC must be separate from school RBAC.

Recommended platform roles:

| Platform role | Responsibility |
|---|---|
| Platform Super Admin | Rare emergency/platform configuration |
| Billing Admin | Plans, invoices, subscriptions |
| Support Engineer | Technical diagnostics |
| Security/Recovery Operator | Backup and recovery |
| Customer Success | Tenant metadata and onboarding status |
| Read-only Operations | Platform health |

No platform role gets unrestricted student, medical, banking, payroll or marks data by default.

---

# 21. Break-Glass Support Access

Evolix Support currently has no standing entitlement to browse business data.

Preserve this principle.

A support engineer needing tenant-data access must create:

```text
support_access_grant
- tenant_id
- engineer_id
- reason
- approved_by
- scopes
- starts_at
- expires_at
- revoked_at
```

Access should be:

- explicit;
- time-limited;
- permission-limited;
- auditable;
- revocable.

The UI should clearly display when support access is active.

---

# 22. Scalable Deployment Architecture

The existing stack remains:

- React 19;
- Laravel 13.x;
- PHP 8.3+;
- MySQL 8.x;
- Redis;
- Nginx;
- private S3-compatible storage;
- Laravel queues.

These are already the locked major runtime choices.

## Production topology

```text
                         Internet
                            │
                       DNS / CDN
                            │
                         WAF / LB
                            │
            ┌───────────────┴───────────────┐
            │                               │
      React Static CDN                Laravel API
                                          │
                         ┌────────────────┼────────────────┐
                         │                │                │
                      API Pods       Queue Workers     Scheduler
                         │                │                │
                         └──────────┬─────┴───────────────┘
                                    │
                 ┌──────────────────┼───────────────────┐
                 │                  │                   │
               MySQL              Redis           Object Storage
                 │
           Read Replicas
                 │
           Backup / PITR
```

---

# 23. Stateless Application Layer

Laravel API containers should be stateless.

Do not store tenant files or sessions on individual API machines.

Use:

```text
Redis → sessions/cache/locks/queues
Object storage → files/reports
MySQL → business state
```

Any API replica should be able to serve any tenant.

This enables horizontal scaling.

---

# 24. Queue Architecture

Do not place every job in one queue.

Recommended pools:

```text
critical
finance
default
messaging
reports
imports
maintenance
```

Examples:

**critical**
- tenant provisioning;
- important state jobs.

**finance**
- finance-safe async operations where approved.

**messaging**
- WhatsApp;
- SMS.

**reports**
- PDFs;
- spreadsheets;
- bulk report cards.

**imports**
- bank statement;
- student import.

Autoscale worker groups based on queue depth and oldest-job age.

The current architecture already requires heavy exports and external messaging to execute after database commit.

---

# 25. Database Scaling Roadmap

## Phase 1

```text
1 MySQL primary
+ shared tenant tables
+ strict school_id indexes
```

## Phase 2

```text
Primary
+ read replica(s)
```

Use replicas for approved heavy read/report workloads where replication lag is acceptable.

Never route transaction-sensitive reads to lagging replicas.

## Phase 3

Introduce tenant sharding.

Control plane stores:

```text
school_id → shard_id
```

Example:

```text
Shard A: tenants 1-500
Shard B: tenants 501-1000
```

Do not shard tables independently.

A tenant's business data should remain together.

## Phase 4

Move large enterprise tenants onto dedicated databases without changing domain services.

---

# 26. Platform Database Separation

Recommended long-term structure:

```text
Platform DB
├── schools metadata
├── billing
├── subscriptions
├── plans
├── entitlements
├── memberships
├── domains
├── provisioning
└── platform audit

Tenant Application DB
├── students
├── attendance
├── fees
├── exams
├── payroll
├── transport
├── inventory
└── other M01-M11 data
```

Initially both databases may run on the same managed MySQL cluster using separate database connections.

Separating the logical control plane early prevents future billing/platform code from accidentally operating under tenant application scopes.

---

# 27. Storage Scalability

Use one managed object-storage system with strict prefixes.

Example:

```text
tenant-data/
  {schoolId}/
     students/
     employees/
     receipts/
     report-cards/
     certificates/
     reports/
```

Apply:

- encryption at rest;
- short-lived signed access;
- lifecycle rules;
- storage quotas;
- malware/file validation;
- checksum validation.

No tenant should ever receive a raw permanent object URL.

---

# 28. Messaging at SaaS Scale

M02 continues to own attendance events.

M09 continues to own communication delivery infrastructure, exactly as the current architecture defines.

At SaaS scale add:

```text
tenant messaging configuration
provider routing
tenant message quota
provider cost tracking
retry policy
delivery throttling
```

Support either:

### Platform-managed provider

Evolix owns the messaging provider account.

or:

### Bring-your-own-provider

A tenant supplies its own provider credentials.

Provider credentials must be encrypted and isolated per tenant.

---

# 29. Finance Isolation

M03 remains the sole owner of school journal posting.

Payroll, Transport and Inventory must continue to send typed posting requests to M03 rather than modifying finance tables directly.

SaaS transformation must not change this.

---

# 30. Observability

Every log/metric should carry:

```text
requestId
tenantId
userId
module
route/job
environment
duration
result
```

Never place sensitive student or financial data inside observability metadata.

## Platform metrics

Monitor:

- active tenants;
- failed provisioning;
- login failures;
- API latency;
- 5xx rate;
- MySQL capacity;
- Redis usage;
- queue depth;
- oldest queued job;
- report failures;
- messaging failures;
- storage consumption;
- billing webhook failures;
- subscription state transitions;
- backup freshness.

---

# 31. Tenant Rate Limiting

Rate limits should combine:

```text
IP
+
user
+
tenant
+
endpoint sensitivity
```

A single abusive tenant should not consume resources needed by every other customer.

Large report/export operations should use tenant-specific concurrency limits.

---

# 32. Backup and Recovery

The existing system requires daily database/document backups, encrypted off-site copies and restore testing.

SaaS requires an additional distinction:

## Platform disaster recovery

Restore the complete platform/database cluster.

## Tenant-specific recovery

Never restore the entire production cluster simply because one tenant accidentally changed data.

Tenant recovery workflow:

```text
Restore backup/PITR into isolated environment
        ↓
Extract affected tenant
        ↓
Validate counts/relationships
        ↓
Review recovery scope
        ↓
Apply controlled repair/import
        ↓
Audit
```

All recovery tools must remain tenant-aware.

---

# 33. Data Export and Tenant Offboarding

A tenant must have a controlled export process.

Possible export package:

```text
tenant-manifest.json
students/
attendance/
academics/
finance/
payroll/
transport/
inventory/
documents/
reports/
audit-summary/
```

Cancellation does not equal deletion.

Define separate policies for:

```text
Subscription cancellation
Tenant suspension
Data retention
Tenant archive
Permanent deletion
```

Permanent deletion should require explicit privileged workflow and retention-policy checks.

---

# 34. API Architecture

Existing business API remains:

```text
/api/v1/...
```

Add tenant/session APIs:

```text
GET  /api/v1/tenant
GET  /api/v1/tenants/available
POST /api/v1/tenant/switch
```

Billing APIs:

```text
GET  /api/v1/billing/subscription
GET  /api/v1/billing/invoices
POST /api/v1/billing/checkout
POST /api/v1/billing/portal
POST /api/v1/billing/change-plan
POST /api/v1/billing/cancel
```

Provider webhooks:

```text
POST /api/platform/v1/billing/webhooks/{provider}
```

Platform administration:

```text
/api/platform/v1/tenants
/api/platform/v1/subscriptions
/api/platform/v1/plans
/api/platform/v1/provisioning
/api/platform/v1/support-access
/api/platform/v1/operations
```

Platform routes and tenant application routes must use different authorization middleware.

---

# 35. Feature Flags vs Entitlements

Do not confuse these concepts.

### Entitlement

Commercial capability.

```text
Tenant is allowed to use Transport.
```

### Feature flag

Deployment/release capability.

```text
New Transport UI v2 is enabled for 10 tenants.
```

Use separate systems.

```text
plan_entitlements
tenant_entitlement_overrides

feature_flags
feature_flag_targets
```

This enables safe gradual releases.

---

# 36. Safe SaaS Authorization Pipeline

Every protected operation should resolve in this order:

```text
1. Authenticate identity
2. Resolve tenant membership
3. Verify tenant lifecycle state
4. Verify subscription access
5. Verify entitlement
6. Verify RBAC permission
7. Verify scope
8. Validate domain state/business rules
9. Execute transaction
10. Audit
```

No frontend condition replaces these checks.

The existing specification already states that backend authorization is authoritative.

---

# 37. Changes to the Existing 11 Modules

Most business logic remains unchanged.

| Module | SaaS change |
|---|---|
| M01 Students | TenantContext instead of implicit demo school |
| M02 Attendance | Tenant-aware geofence/config/message quotas |
| M03 Finance | No business-rule change; tenant-specific numbering/config |
| M04 Academics | Tenant-specific academic masters |
| M05 Exams | Tenant-specific formulas/templates/storage |
| M06 HR | Tenant-specific employees/payroll |
| M07 Transport | Tenant-specific fleet/configuration |
| M08 Lifecycle | Tenant-specific numbering/templates |
| M09 Communications | Provider routing/quota/metering |
| M10 Inventory | Tenant-specific stock/assets |
| M11 Admin | Major extension: tenant lifecycle, SaaS identity integration |
| Platform Plane | New billing/provisioning/subscription infrastructure |

No existing approved workflow should be removed.

---

# 38. SaaS Migration Sequence

The existing implementation sequence begins with M11 tenancy/security foundation before dependent modules. The SaaS transformation should follow the same dependency principle.

## SaaS Stage S0 — Freeze and Protect

Before changing tenancy:

- run existing M01-M11 tests;
- create full backup;
- verify current demo tenant;
- add regression tests for critical workflows;
- capture baseline database counts.

**Gate:** Current school works exactly as before.

---

## SaaS Stage S1 — Tenant Kernel

Implement:

```text
TenantContext
TenantResolver
TenantAwareModel
TenantScope
tenant-aware cache
tenant-aware queues
tenant-aware file service
tenant isolation tests
```

**Gate:** Two seeded schools can contain similar data without any cross-visibility.

---

## SaaS Stage S2 — Identity & Membership

Refactor:

```text
global user identity
school memberships
membership-specific roles
tenant switching
```

**Gate:** One user can belong to School A and School B and sees only the selected tenant.

---

## SaaS Stage S3 — Provisioning

Implement:

- tenant registration;
- default seed;
- Owner membership;
- school configuration wizard;
- idempotent provisioning state machine.

**Gate:** A new school can be provisioned without developer intervention.

---

## SaaS Stage S4 — Subscription & Billing

Implement:

- plans;
- versions;
- subscriptions;
- billing gateway;
- checkout;
- webhooks;
- invoices;
- subscription lifecycle.

**Gate:** Verified provider events change subscription state exactly once.

---

## SaaS Stage S5 — Entitlements & Limits

Implement:

- plan entitlements;
- tenant overrides;
- quotas;
- usage meters;
- server-side enforcement.

**Gate:** Limit enforcement never bypasses RBAC or corrupts domain history.

---

## SaaS Stage S6 — Platform Console

Implement:

- tenant search;
- plans/subscriptions;
- provisioning status;
- usage;
- billing diagnostics;
- controlled support access;
- suspension/reactivation.

**Gate:** Platform operators can administer SaaS metadata without default access to school business data.

---

## SaaS Stage S7 — Scale Architecture

Implement:

- stateless API replicas;
- dedicated queue pools;
- autoscaling;
- read replicas;
- CDN;
- object storage;
- centralized observability.

**Gate:** Load testing shows one high-volume tenant cannot materially degrade unrelated tenants.

---

## SaaS Stage S8 — Recovery & Offboarding

Implement:

- tenant export;
- retention state machine;
- tenant-specific recovery tools;
- support runbooks.

**Gate:** One tenant can be recovered/exported without restoring or exposing another tenant.

---

## SaaS Stage S9 — First Production Migration

Migrate existing school:

```text
Create tenant metadata
↓
Attach existing school
↓
Create memberships
↓
Assign Legacy Full Access subscription
↓
Validate every school_id
↓
Run financial reconciliation
↓
Run attendance/result/history checks
↓
Run isolation tests
↓
Enable SaaS tenant routing
```

Do not duplicate the school's records into a newly provisioned tenant unless a controlled migration specifically requires it.

---

# 39. Required SaaS Test Matrix

Every tenant-aware feature must test at minimum:

```text
Tenant A happy path
Tenant B happy path
A cannot read B
A cannot edit B
A cannot export B
A cannot download B's files
A's queue cannot execute against B
A's cache cannot return B
A's signed URL cannot open B
A's report cannot contain B
A's role IDs cannot be used in B
Suspended tenant cannot perform blocked writes
Subscription entitlement cannot override RBAC
Platform support cannot browse tenant data without grant
```

The current Definition of Done already requires explicit cross-school isolation testing for use cases; SaaS makes this mandatory platform-wide.

---

# 40. AI-Agent Implementation Contract

Every AI development task related to SaaS should begin with:

```text
PLANE:
- Platform / Tenant Application

MODULE:
- Pxx or Mxx

TENANT EFFECT:
- global / tenant-owned / cross-tenant prohibited

SUBSCRIPTION EFFECT:
- entitlement required:
- quota affected:

ACTOR:
- platform role:
- tenant role:

DATA:
- platform tables:
- tenant tables:
- school_id requirement:
- isolation constraints:

AUTHORIZATION:
- membership check:
- subscription check:
- entitlement:
- RBAC:
- scope:

TRANSACTION:
- transaction boundary:
- cross-module service:

ASYNC:
- tenant context:
- queue:
- retry/idempotency:

AUDIT:
- event:
- actor:
- tenant:
- reason required:

TESTS:
- Tenant A success
- Tenant B success
- A→B read denied
- A→B write denied
- file isolation
- queue isolation
- cache isolation
- entitlement test
- RBAC test
- duplicate/idempotency test
```

---

# 41. Non-Negotiable SaaS Invariants

1. One tenant can never infer or access another tenant's business data.
2. `school_id` never comes from an authoritative browser business payload.
3. SaaS billing and school finance remain separate domains.
4. Subscription entitlement never replaces RBAC.
5. Expired subscription never silently deletes business history.
6. Platform support has no standing business-data entitlement.
7. Files, caches, queues, reports and signed downloads are tenant-aware.
8. Background workers explicitly establish and clear TenantContext.
9. Billing webhooks are verified and idempotent.
10. Tenant provisioning is idempotent.
11. All M01-M11 historical-record rules remain intact.
12. M03 remains the sole school accounting posting authority.
13. M09 remains the shared messaging execution layer.
14. Platform-level operations are audited.
15. The original school is migrated with full existing functionality.

---

# 42. Recommended Final Architecture

```text
                    ┌─────────────────────┐
                    │     React 19 UI     │
                    │ CDN / Static Assets │
                    └──────────┬──────────┘
                               │
                         WAF / Load Balancer
                               │
                    ┌──────────▼──────────┐
                    │ Laravel 13 API Pool │
                    │    Stateless        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
      SaaS Control Plane   Tenant App Plane   Async Plane
              │                │                │
      Tenant Registry         M01-M11       Queue Pools
      Billing                               Scheduler
      Subscriptions
      Entitlements
      Provisioning
              │                │                │
              └────────────┬───┴────────────────┘
                           │
             ┌─────────────┼──────────────┐
             │             │              │
          MySQL          Redis        Object Storage
       Platform DB        │               │
       Tenant DBs     Sessions         Tenant Prefix
       / Shards       Cache/Locks
             │
        Backup / PITR
```

---

# 43. Final Architectural Recommendation

**Do not rebuild Evolix School System as eleven separate microservices.**

Keep the existing Laravel modular monolith for business functionality.

Introduce SaaS as:

```text
Existing Modular Monolith
        +
Tenant Kernel
        +
Control Plane
        +
Subscription/Entitlement Layer
        +
Horizontally Scalable Infrastructure
```

This gives Evolix the simplest path from the current single-school demo to a scalable SaaS product while retaining strong transactions for finance, payroll, attendance, results, promotion and certificates.

Microservice extraction should happen only when measurable operational scale requires it—not simply because the product becomes SaaS.

The resulting architecture supports:

```text
1 school
→ 10 schools
→ 100 schools
→ 1,000+ schools
→ tenant sharding
→ enterprise dedicated tenancy
```

without forcing the M01-M11 business domains to be rewritten each time.