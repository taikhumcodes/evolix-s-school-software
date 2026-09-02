# EVOLIX SCHOOL ERP — MASTER UI/UX DESIGN SYSTEM
**Version:** 1.0  
**Purpose:** Visual, interaction, responsive, accessibility, and reusable component standard for the complete ERP  
**Languages:** English + Hindi

## 1. Experience Goal
EVOLIX School ERP should feel premium, enterprise-grade, calm, modern, fast, and easy for non-technical school staff. It must not feel like a generic admin template.

Core UX principles:
1. Simplicity first.
2. Common actions within three meaningful interactions where practical.
3. Strong information hierarchy.
4. Dense enough for operational work without clutter.
5. Clear system status and error feedback.
6. Responsive behavior designed intentionally, not merely scaled down.
7. Full English/Hindi compatibility.

## 2. Design Tokens
Use centralized semantic tokens rather than hardcoded values in random components.

**Color roles:** background, foreground, card, muted, muted-foreground, border, input, primary, primary-foreground, secondary, accent, destructive, warning, success, info, focus-ring.

**Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48.

**Radius:** small, medium, large only. Avoid inconsistent radii.

**Shadows:** subtle card, popover, and modal/drawer elevation only. Avoid glow-heavy visual effects.

## 3. Typography
Use a font family with strong Devanagari support. Recommended: Inter for Latin and Noto Sans Devanagari/Noto Sans for Hindi compatibility if required.

Typography levels: page title, section title, card title, body, small/meta, table label, form label.

Hindi layouts must be tested for line-height, wrapping, button expansion, table width, badge width, and print rendering.

## 4. App Shell
**Desktop:** collapsible left sidebar, top bar, page header, content area, notifications, global search, language switcher, user menu.

**Tablet:** compact sidebar or drawer, accessible top bar, reduced-width table behavior.

**Mobile:** role-prioritized bottom navigation for frequent actions, More drawer for remaining modules, sticky primary action where appropriate, and no tiny desktop-style tables.

## 5. Page Layout Standard
Use this order where applicable:
1. Breadcrumb
2. Page title + description
3. Primary action
4. KPI summary only if useful
5. Search / filters / bulk actions
6. Main content
7. Pagination / result summary
8. Empty / loading / error states

Do not add KPI cards to every page for decoration.

## 6. List / Table Pattern
Tables should support when applicable: server-side pagination, search, filters, sorting, column visibility, row selection, export, print, sticky headers, empty state, and permission-aware actions.

Primary actions stay visible. Secondary actions may be grouped. Destructive actions must be isolated and confirmed.

On mobile, use cards/lists where practical or deliberate horizontal scrolling where necessary.

## 7. Form Pattern
Forms use React Hook Form + Zod, clear sections, visible labels, required indicators, inline validation, server validation mapping, save/cancel hierarchy, and unsaved-change protection where appropriate.

Long workflows may use sections or a stepper. Do not bury complex admissions, payroll, exam setup, or accounting workflows inside small modals.

## 8. Detail Page Pattern
Typical record detail: identity/header, status, primary actions, summary, tabs/sections, timeline/activity, related records, documents, and audit where permitted.

Example Student tabs: Overview | Academics | Attendance | Fees | Documents | Transport | Timeline.

## 9. Modal / Drawer / Page Rules
- Modal: short confirmation or small edit.
- Drawer: quick contextual form/detail.
- Full page: complex workflow.

## 10. Status System
Use consistent semantic status badges such as Draft, Submitted, Approved, Rejected, Active, Inactive, Archived, Paid, Partial, Due, Overdue, Cancelled, Published, and Locked.

Hindi labels come from i18n keys.

## 11. Dashboards
Dashboards must answer operational questions.

**Owner:** revenue, expenses, outstanding fees, admissions, attendance, transport status.  
**Principal:** student/teacher attendance, exam progress, academic alerts, notices.  
**Teacher:** today’s classes, attendance, homework, marks, timetable.  
**Accountant:** collections, outstanding, cash/bank, expenses, approvals.

Avoid decorative charts without decision value.

## 12. Feedback & States
Every async screen must handle loading, empty, success, validation error, permission denied, not found, server error, and retry.

Use skeletons where useful, toasts for transient messages, and persistent alerts for important issues.

## 13. Confirmation Standard
Require explicit confirmation for receipt cancellation, voucher reversal, attendance override, post-publish marks changes, archive/delete, restore backup, and high-risk configuration changes.

Confirmation text must explain impact.

## 14. Accessibility
Target WCAG 2.1 AA quality: semantic HTML, keyboard navigation, visible focus, labels, accessible dialogs/tables, meaningful icon labels, sufficient contrast, and no color-only statuses.

## 15. Bilingual UX Rules
- English and Hindi are supported throughout.
- Language switch preserves current route.
- User preference persists.
- UI strings are never hardcoded.
- Hindi wording follows the approved glossary.
- Avoid truncation from longer Hindi labels.
- Applicable printouts support English, Hindi, or bilingual rendering.

## 16. Reusable Component Library
Standardize: AppShell, Sidebar, TopBar, PageHeader, Breadcrumb, SearchBox, FilterBar, DataTable, Pagination, StatusBadge, KPI Card, EmptyState, ErrorState, ConfirmDialog, DrawerForm, FormSection, DatePicker, MoneyInput, PhoneInput, FileUpload, DocumentViewer, AuditTimeline, ActivityTimeline, PermissionGuard, LanguageSwitcher, PrintPreview, ApprovalStepper.

Use shadcn/ui primitives where appropriate.

## 17. Responsive QA
Every significant module should be checked around 1440px, 1024px, 768px, and 390px widths.

## 18. Playwright Visual QA
For new UI: run the critical flow, inspect desktop/tablet/mobile, switch to Hindi, re-check layout, then fix overflow, clipping, spacing, and interaction issues.

## 19. Design Rejection Rules
Reject generic template dashboards, decorative gradients everywhere, neon/glow styles, excessive rounded cards, inconsistent spacing, wasted empty space, hidden primary actions, tiny mobile targets, desktop-only tables, unclear statuses, and weak empty/error states.

## 20. Design Definition of Done
A frontend module is not visually complete until hierarchy, responsiveness, English/Hindi behavior, accessibility basics, loading/empty/error states, overflow checks, and design/taste review all pass.
