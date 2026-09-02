# EVOLIX SCHOOL ERP — MASTER SITEMAP & INFORMATION ARCHITECTURE
**Version:** 1.0  
**Purpose:** Pre-development navigation, screen, and information-architecture blueprint  
**Languages:** English + Hindi

---

# 1. PRODUCT SHELL

## 1.1 Public / Pre-login
- `/login`
- `/forgot-password`
- `/reset-password`
- `/verify-2fa`
- `/accept-invite`
- `/setup` — first-school setup wizard when applicable

## 1.2 Authenticated shell
Persistent application areas:
- Global sidebar / navigation
- Top bar
- Global Search
- Language switcher: English / हिंदी
- Notifications
- Quick create
- Current academic year
- Current branch/school context when enabled
- User menu
- Help / shortcuts

---

# 2. MASTER NAVIGATION

```text
Dashboard

Students
├── Student Directory
├── Add Student
├── Promotions
├── Transfers
├── Alumni
└── Import / Export

Admissions
├── New Applications
├── New Admission
├── Transfer Admission
├── Re-Admission
├── Pending Documents
└── Admission Checklist

Attendance
├── Student Attendance
├── Teacher Attendance
├── Corrections
├── Leave
└── Attendance Reports

Academics
├── Classes & Sections
├── Subjects
├── Subject Groups
├── Electives
├── Class Teachers
├── Timetable
├── Academic Calendar
├── Homework
├── Examinations
│   ├── Exam Setup
│   ├── Exam Schedule
│   ├── Marking Schemes
│   ├── Hall Tickets
│   ├── Seating Plan
│   ├── Marks Entry
│   ├── Result Processing
│   ├── Revaluation
│   └── Merit / Ranking
├── Report Cards
├── Transcripts
└── Promotions

Finance
├── Overview
├── Fee Structure
├── Fee Collection
├── Outstanding Fees
├── Receipts
├── Refunds
├── Discounts / Concessions
├── Scholarships / Waivers
├── Income
├── Expenses
├── Accounting
│   ├── Chart of Accounts
│   ├── Cost Centers
│   ├── Opening Balances
│   ├── Journal
│   ├── Ledgers
│   ├── Cash Book
│   ├── Bank Book
│   ├── Payment Vouchers
│   ├── Receipt Vouchers
│   ├── Contra Vouchers
│   ├── Cheque Register
│   ├── Bank Reconciliation
│   ├── Budget
│   ├── Fixed Assets
│   └── Depreciation
└── Financial Statements
    ├── Trial Balance
    ├── Profit & Loss
    ├── Balance Sheet
    └── Cash Flow

Employees
├── Employee Directory
├── Add Employee
├── Attendance
├── Leave
├── Payroll
├── Payslips
├── Increments
├── Qualifications
├── Training
└── Performance Notes

Parents
├── Family Directory
├── Guardians
├── Sibling Links
├── Emergency Contacts
├── Parent Accounts
└── Communication Timeline

Discipline
├── Cases
├── Complaints
├── Warnings
├── Suspensions
├── Parent Meetings
└── Discipline Points

Transport
├── Overview
├── Vehicles
├── Routes
├── Pickup Points
├── Drivers
├── Conductors
├── Student Mapping
├── Pickup / Drop
├── Trips
├── Fuel
├── Maintenance
├── Documents & Expiry
└── Expenses

Communication
├── Notices
├── Circulars
├── Announcements
├── Broadcasts
├── Groups
├── Templates
├── History
└── Acknowledgements

Activities
├── Calendar
├── Events
├── Attendance
├── Budgets
└── Expenses

Certificates
├── Generate
├── Certificate Register
├── Templates
└── Custom Certificates

Visitors
├── Visitor Register
├── Appointments
├── Gate Passes
├── Staff Visits
└── Material Entry / Exit

Inventory
├── Overview
├── Items
├── Categories
├── Vendors
├── Purchase Orders
├── GRN
├── Purchases
├── Stock Issue
├── Stock Return
├── Stock Adjustment
├── Warehouses
├── Reorder Alerts
├── Assets
└── Consumables

Documents
├── Document Center
├── Student Documents
├── Employee Documents
├── Expiring Documents
├── Versions
└── Download History

Reports
├── Students
├── Admissions
├── Attendance
├── Fees
├── Finance
├── Exams
├── Employees / Payroll
├── Transport
├── Inventory
├── Certificates
└── Audit

Administration
├── Users
├── Roles
├── Permissions
├── Academic Years
├── Audit Logs
└── Security

Configuration
├── School Profile
├── Academic
├── Fees
├── Attendance
├── Promotions
├── Exams
├── Finance
├── Vouchers
├── Receipts
├── Number Series
├── Certificates
├── Invoices
├── Printing
├── Notifications
├── Branding
├── Languages
├── Theme
├── Integrations
├── Backup Settings
└── Audit Settings

Master Data
├── Classes
├── Sections
├── Subjects
├── Departments
├── Designations
├── Categories
├── Castes
├── Religions
├── Countries
├── States
├── Cities
├── Vehicle Types
├── Fee Heads
└── Expense Heads

Platform / System
├── Workflows
├── Notifications
├── Dashboard Builder
├── Global Search
├── Printing
├── Backup & Restore
└── System Monitoring
```

---

# 3. ROLE-BASED DEFAULT LANDING

| Role | Default Home | Main Navigation |
|---|---|---|
| Owner | Owner Dashboard | Dashboard, Finance, Reports, Admissions, Attendance, Transport |
| Principal | Principal Dashboard | Academics, Attendance, Employees, Discipline, Communication |
| Teacher | Teacher Dashboard | Classes, Attendance, Homework, Marks, Timetable |
| Accountant | Accountant Dashboard | Finance, Fees, Receipts, Reports |
| Office Staff | Office Dashboard | Admissions, Students, Certificates, Visitors |
| Receptionist | Reception Dashboard | Visitors, Admissions, Student Search |
| Driver | Driver Dashboard | Assigned Route, Trip, Pickup/Drop |
| Conductor | Conductor Dashboard | Assigned Route, Pickup/Drop |
| Security | Security Dashboard | Visitors, Gate Passes, Material Entry/Exit |
| Cleaner / Peon | Minimal dashboard | Assigned allowed tools only |
| Super Admin | Platform Dashboard | Full authorized system scope |

Actual visibility is permission-driven, not role-name hardcoded.

---

# 4. SCREEN PATTERNS

Every business entity should consistently use appropriate variants of:

- List
- Detail
- Create
- Edit
- Activity / Timeline
- Documents
- Related records
- Print / Export
- Audit history
- Status actions

For high-frequency modules, prefer split/list-detail experiences where this reduces clicks.

---

# 5. GLOBAL SEARCH RESULTS

Search may return:
- Student
- Parent / Family
- Employee
- Admission
- Receipt
- Voucher
- Certificate
- Vehicle
- Route
- Visitor
- Inventory Item
- Purchase Order
- Report shortcut

Each result must obey tenant and permission filters.

---

# 6. GLOBAL QUICK CREATE

Permission-aware quick actions:
- Student
- Admission
- Fee Receipt
- Expense
- Employee
- Visitor
- Notice
- Certificate
- Purchase Order

---

# 7. MOBILE NAVIGATION

Mobile must not simply shrink desktop sidebar.

Recommended:
- Bottom navigation for the 4–5 highest-frequency actions by role
- “More” sheet/drawer for remaining permitted modules
- Sticky primary action on high-frequency workflows
- Mobile-friendly tables switch to cards or horizontal scroll only where appropriate
- Teacher attendance/marks flows optimized for one-hand operation

---

# 8. LANGUAGE NAVIGATION

Top-level switch:
- `EN`
- `हिंदी`

Rules:
- preserve the current route when switching language
- preserve unfinished safe form state where technically feasible
- do not change user-entered text
- avoid route duplication by language unless SEO/public pages later require it

---

# 9. FUTURE NAVIGATION — DO NOT BUILD IN V1

- Library
- Hostel
- Medical / Health
- GPS live tracking
- Lesson Planning
- Email/SMS/WhatsApp delivery channels

They must not appear as active production menu items until enabled by approved scope.
