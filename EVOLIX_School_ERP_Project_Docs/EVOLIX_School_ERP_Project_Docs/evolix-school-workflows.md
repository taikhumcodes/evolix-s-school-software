# EVOLIX SCHOOL ERP — MASTER WORKFLOW BLUEPRINT
**Version:** 1.0  
**Purpose:** End-to-end business workflow map before module implementation  
**Languages:** English + Hindi UI

---

# 1. SCHOOL ONBOARDING

```text
Create School
↓
School Profile
↓
Default Language (English / Hindi)
↓
Academic Year
↓
Classes
↓
Sections
↓
Subjects
↓
Fee Heads + Fee Structure
↓
Users + Roles
↓
Optional Transport Setup
↓
Review
↓
Activate School
↓
Dashboard
```

All setup data should be editable later through Configuration / Master Data.

---

# 2. LOGIN & SESSION

```text
Login
↓
Validate credentials
↓
2FA if enabled
↓
Resolve school/tenant
↓
Resolve permissions
↓
Resolve preferred language
↓
Load current academic year
↓
Role dashboard
```

Failure states:
- invalid credentials
- disabled account
- expired invitation
- 2FA required/failed
- school disabled
- session expired

---

# 3. NEW ADMISSION

```text
New Application
↓
Duplicate Check
↓
Student + Family Details
↓
Academic / Previous School Details
↓
Documents
↓
Transport Choice (optional)
↓
Fee Plan / Concession
↓
Review
↓
Approval Workflow (when enabled)
├── Principal Approval
├── Accounts Approval
└── Other configured approval
↓
Initial Fee Collection
↓
Generate:
- Student ID
- Admission Number
- Receipt
↓
Create Permanent Student Record
↓
Create Academic-Year Enrollment
↓
Pending-document follow-up if needed
↓
Student appears in Directory
```

---

# 4. DAILY STUDENT ATTENDANCE

```text
Teacher Dashboard
↓
Today's Class
↓
Attendance
↓
System defaults eligible students to Present
↓
Teacher marks exceptions:
Absent / Late / Half Day / Leave / Medical Leave / Excused
↓
Validate
↓
Submit
↓
Audit Entry
↓
Optional attendance alert via Notification Engine
↓
Lock according to configured rule
```

Correction:
```text
Correction Request
↓
Permission Check
↓
Reason Required
↓
Authorized Override
↓
Audit Before/After
```

---

# 5. TEACHER ATTENDANCE

```text
Employee Login
↓
Request Attendance Mark
↓
Device/location permission
↓
Geofence validation
├── Inside → continue
└── Outside → reject / permitted fallback workflow
↓
Mark timestamp
↓
Audit
↓
Payroll/attendance summary
```

---

# 6. FEE COLLECTION

```text
Search Student
↓
Open Fee Account
↓
View:
- Due
- Paid
- Late Fee
- Concession
- Advance
↓
Choose items/installments
↓
Choose payment:
Cash / UPI / Bank / Cheque / Mixed
↓
Validate total
↓
Atomic Transaction
├── Create payment
├── Generate unique receipt number
├── Post accounting entries
└── Update outstanding
↓
Generate Receipt
↓
Print / Download
↓
Audit
```

Cancellation:
```text
Receipt
↓
Cancel Permission
↓
Reason
↓
Approval if configured
↓
Accounting Reversal
↓
Receipt marked Cancelled
↓
Original remains immutable
↓
Audit
```

---

# 7. EXPENSE / ACCOUNTING VOUCHER

```text
New Expense
↓
Select Expense Head / Ledger
↓
Cost Center
↓
Amount + Payment Mode
↓
Attachments
↓
Submit
↓
Approval if configured
↓
Post Voucher
↓
Ledger Entry
↓
Audit
```

---

# 8. BANK RECONCILIATION

```text
Import Bank Statement
↓
Validate Format
↓
Preview
↓
Create statement rows
↓
Auto-match likely transactions
↓
Accountant reviews unmatched / ambiguous rows
↓
Manual Match / Create Adjustment
↓
Reconcile
↓
Reconciliation Report
```

---

# 9. EXAM & RESULT

```text
Create Exam
↓
Subjects + Components
↓
Marking Scheme
↓
Schedule
↓
Hall Ticket / Seating (if used)
↓
Marks Entry
↓
Validation
↓
Lock / Submit
↓
Grace / Revaluation where allowed
↓
Calculate Grade / GPA / CGPA
↓
Review
↓
Publish Result
↓
Generate Report Card / Transcript
↓
Print in English / Hindi / Bilingual as configured
```

Post-publish changes require privileged workflow + audit.

---

# 10. STUDENT PROMOTION

```text
Academic Year Closing / Promotion
↓
Select Class / Section
↓
Review eligibility + results
↓
Choose promoted / retained / transferred / left
↓
Validation
↓
Confirm
↓
Create next-year enrollment
↓
Assign class/section
↓
Roll number generation according to config
↓
Audit
```

A student must never be promoted twice for the same source year.

---

# 11. EMPLOYEE PAYROLL

```text
Employee Master
↓
Salary Structure
↓
Attendance / Leave
↓
Adjustments / Increment
↓
PF / ESI as configured
↓
Payroll Run
↓
Review
↓
Approve
↓
Post Payroll
↓
Generate Payslips
↓
Accounting entries
↓
Audit
```

---

# 12. TRANSPORT

Setup:
```text
Vehicle
↓
Driver + Conductor
↓
Route
↓
Pickup Points
↓
Capacity
↓
Student Mapping
```

Daily:
```text
Trip Start
↓
Pickup Scan / Mark
↓
Route
↓
Drop Scan / Mark
↓
Trip End
↓
Trip Log
```

Maintenance:
```text
Odometer/Fuel
↓
Maintenance / Permit / Insurance
↓
Expiry Engine
↓
Notification
```

---

# 13. INVENTORY PROCUREMENT

```text
Need / Reorder
↓
Vendor
↓
Purchase Order
↓
Approval if configured
↓
Receive Goods
↓
GRN
↓
Purchase Entry
↓
Stock Increase
↓
Accounting/Expense linkage where configured
↓
Audit
```

Issue:
```text
Stock Item
↓
Issue to Department / Person / Activity
↓
Quantity Check
↓
Issue Slip
↓
Stock Reduce
↓
Audit
```

---

# 14. CERTIFICATE

```text
Search Student
↓
Select Certificate Type
↓
Load School Template
↓
Populate student data
↓
Choose Language:
English / Hindi / Bilingual
↓
Preview
↓
Generate stable certificate number
↓
Print / PDF
↓
Certificate Register
↓
Audit
```

---

# 15. VISITOR / GATE

```text
Visitor Arrives
↓
Search previous / New Visitor
↓
Capture details + photo where enabled
↓
Purpose
↓
Host Employee
↓
Approval where required
↓
Gate Pass
↓
Check-in
↓
Check-out
↓
Visitor Log
```

Material movement:
```text
Material Entry / Exit
↓
Details
↓
Approval if required
↓
Gate Record
```

---

# 16. COMMUNICATION

```text
Create Notice / Circular / Announcement
↓
Choose Audience
↓
Choose Template / Content
↓
Preview
↓
Publish / Schedule
↓
Notification Engine
├── In-app
└── Push
↓
Delivery status
↓
Acknowledgements where required
```

Future channels may plug into the same Notification Engine.

---

# 17. DOCUMENT MANAGEMENT

```text
Entity Record
↓
Upload
↓
Validate type/size
↓
Store object
↓
Store metadata
↓
Version when applicable
↓
Permission-controlled access
↓
Download history
↓
Expiry alert when applicable
```

---

# 18. WORKFLOW ENGINE

Generic lifecycle:

```text
Draft
↓
Submit
↓
Step 1 Reviewer
├── Approve → next step
├── Reject → terminal/rework
└── Return → creator
↓
Step N
↓
Approved
↓
Business action executes
↓
Audit
```

Workflow-enabled candidates:
- Admission
- Refund
- Purchase Order
- Discipline
- Sensitive corrections
- Selected vouchers

---

# 19. BACKUP & RESTORE

Backup:
```text
Schedule / Manual Trigger
↓
Lock/consistency strategy
↓
Database backup
↓
File/object metadata as applicable
↓
Integrity check
↓
Store
↓
Backup log
↓
Alert on failure
```

Restore:
```text
Authorized Admin
↓
Select backup
↓
Strong warning
↓
Pre-restore validation
↓
Restore
↓
Health checks
↓
Audit
```

---

# 20. REPORTING

```text
Choose Report
↓
Permission Check
↓
Filters
↓
Generate
↓
View
├── Export Excel
├── Export PDF
└── Print
```

Heavy reports may become background jobs.

---

# 21. GLOBAL SEARCH

```text
Query
↓
Tenant Scope
↓
Permission Scope
↓
Search indexed record types
↓
Grouped Results
↓
Open result
```

---

# 22. LANGUAGE FLOW

```text
User chooses English / हिंदी
↓
Save preference
↓
Update i18n locale
↓
Re-render current screen
↓
Preserve route/context
↓
Use locale formatting for dates/numbers/currency
```

Prints may independently choose English/Hindi/Bilingual where configured.

---

# 23. SYSTEM-WIDE STATE RULE

Every applicable entity should have an explicit lifecycle. Avoid unexplained booleans.

Example:
```text
DRAFT → SUBMITTED → APPROVED → POSTED → CANCELLED
```

or:

```text
ACTIVE → INACTIVE → ARCHIVED
```

Transitions must be validated in backend service logic and tested.

---

# 24. MODULE DEPENDENCY ORDER

```text
Administration / Auth
↓
Security / RBAC
↓
Configuration + Master Data
↓
Setup Wizard
↓
Students + Parents + Admissions
↓
Attendance
↓
Finance
↓
Academics
↓
Employees
↓
Workflow / Notification / Printing foundations as needed
↓
Transport / Inventory / Visitors / Certificates / Activities
↓
Documents / Search / Reports / Dashboard Builder
↓
Advanced Monitoring / Future Integrations
```

This is a dependency guide, not an instruction to build all modules automatically.
