import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import ProtectedRoute from './ProtectedRoute';
import PermissionRoute from './PermissionRoute';
import { AppLayout } from '../layouts/AppLayout';

// Lazy loaded views for foundation
const Login = lazy(() => import('../app/views/Login'));
const Dashboard = lazy(() => import('../app/views/Dashboard'));
const Unauthorized = lazy(() => import('../app/views/Unauthorized'));
const NotFound = lazy(() => import('../app/views/NotFound'));

// Admin Views
const UsersList = lazy(() => import('../app/views/admin/UsersList'));
const UserForm = lazy(() => import('../app/views/admin/UserForm'));
const RolesList = lazy(() => import('../app/views/admin/RolesList'));
const RoleForm = lazy(() => import('../app/views/admin/RoleForm'));
const AcademicYearsList = lazy(() => import('../app/views/admin/AcademicYearsList'));
const AcademicYearForm = lazy(() => import('../app/views/admin/AcademicYearForm'));
const AuditLogsList = lazy(() => import('../app/views/admin/AuditLogsList'));
const SecurityOverview = lazy(() => import('../app/views/admin/security/SecurityOverview'));
const PasswordPolicyForm = lazy(() => import('../app/views/admin/security/PasswordPolicyForm'));
const IpRestrictionsList = lazy(() => import('../app/views/admin/security/IpRestrictionsList'));
const SecurityEventsLog = lazy(() => import('../app/views/admin/security/SecurityEventsLog'));

// Account Views
const AccountSecurity = lazy(() => import('../app/views/account/AccountSecurity'));
const Configuration = lazy(() => import('../app/views/configuration/Configuration'));
const BrandingConfiguration = lazy(
  () => import('../app/views/configuration/BrandingConfiguration')
);
const NumberSeriesConfiguration = lazy(
  () => import('../app/views/configuration/NumberSeriesConfiguration')
);
const ConfigurationHistory = lazy(() => import('../app/views/configuration/ConfigurationHistory'));
const MasterData = lazy(() => import('../app/views/master-data/MasterData'));
const SchoolSetupWizard = lazy(() => import('../app/views/setup/SchoolSetupWizard'));

// Students & Admissions Views
const StudentsOverview = lazy(() => import('../app/views/students/StudentsOverview'));
const StudentsList = lazy(() => import('../app/views/students/StudentsList'));
const StudentDetail = lazy(() => import('../app/views/students/StudentDetail'));
const StudentForm = lazy(() => import('../app/views/students/StudentForm'));
const AdmissionsList = lazy(() => import('../app/views/students/AdmissionsList'));
const AdmissionForm = lazy(() => import('../app/views/students/AdmissionForm'));
const AdmissionReview = lazy(() => import('../app/views/students/AdmissionReview'));
const StudentImport = lazy(() => import('../app/views/students/StudentImport'));
const StudentPrintList = lazy(() => import('../app/views/students/StudentPrintList'));

// Module 04: Parents & Families Views
const ParentsOverview = lazy(() => import('../app/views/guardians/ParentsOverview'));
const GuardiansList = lazy(() => import('../app/views/guardians/GuardiansList'));
const GuardianDetail = lazy(() => import('../app/views/guardians/GuardianDetail'));
const GuardianForm = lazy(() => import('../app/views/guardians/GuardianForm'));
const GuardianImport = lazy(() => import('../app/views/guardians/GuardianImport'));
const FamiliesList = lazy(() => import('../app/views/families/FamiliesList'));
const FamilyDetail = lazy(() => import('../app/views/families/FamilyDetail'));
const FamilyForm = lazy(() => import('../app/views/families/FamilyForm'));

// Module 05: Attendance & Leave Management Views
const AttendanceOverview = lazy(() => import('../app/views/attendance/AttendanceOverview'));
const StudentAttendanceRegister = lazy(
  () => import('../app/views/attendance/StudentAttendanceRegister')
);
const StudentLeaveView = lazy(() => import('../app/views/attendance/StudentLeaveView'));
const StaffAttendanceView = lazy(() => import('../app/views/attendance/StaffAttendanceView'));
const StaffLeaveView = lazy(() => import('../app/views/attendance/StaffLeaveView'));
const HolidaysView = lazy(() => import('../app/views/attendance/HolidaysView'));
const AttendanceReports = lazy(() => import('../app/views/attendance/AttendanceReports'));

// Module 06: Academics & Examination Management Views
const AcademicsOverview = lazy(() => import('../app/views/academics/AcademicsOverview'));
const TermsView = lazy(() => import('../app/views/academics/TermsView'));
const TeacherAssignmentsView = lazy(() => import('../app/views/academics/TeacherAssignmentsView'));
const TimetableManager = lazy(() => import('../app/views/academics/TimetableManager'));
const HomeworkView = lazy(() => import('../app/views/academics/HomeworkView'));
const ExamsView = lazy(() => import('../app/views/academics/ExamsView'));
const MarksEntryView = lazy(() => import('../app/views/academics/MarksEntryView'));
const ResultsView = lazy(() => import('../app/views/academics/ResultsView'));
const PromotionView = lazy(() => import('../app/views/academics/PromotionView'));

// Module 07: Finance & Accounting Views
const FinanceOverview = lazy(() => import('../app/views/finance/FinanceOverview'));
const FeeCollectionView = lazy(() => import('../app/views/finance/FeeCollectionView'));
const FeeInvoicesView = lazy(() => import('../app/views/finance/FeeInvoicesView'));
const StudentFeesView = lazy(() => import('../app/views/finance/StudentFeesView'));
const ExpensesView = lazy(() => import('../app/views/finance/ExpensesView'));
const AccountsLedgerView = lazy(() => import('../app/views/finance/AccountsLedgerView'));
const BankingView = lazy(() => import('../app/views/finance/BankingView'));
const FinancialReportsView = lazy(() => import('../app/views/finance/FinancialReportsView'));
const ParentFinanceView = lazy(() => import('../app/views/finance/ParentFinanceView'));

// Module 08: HR & Payroll Management Views
const HrOverview = lazy(() => import('../app/views/hr/HrOverview').then((m) => ({ default: m.HrOverview })));
const EmployeesDirectory = lazy(() => import('../app/views/hr/EmployeesDirectory').then((m) => ({ default: m.EmployeesDirectory })));
const EmployeeDetail = lazy(() => import('../app/views/hr/EmployeeDetail').then((m) => ({ default: m.EmployeeDetail })));
const LeaveManagement = lazy(() => import('../app/views/hr/LeaveManagement').then((m) => ({ default: m.LeaveManagement })));
const SalarySetup = lazy(() => import('../app/views/hr/SalarySetup').then((m) => ({ default: m.SalarySetup })));
const PayrollTerminal = lazy(() => import('../app/views/hr/PayrollTerminal').then((m) => ({ default: m.PayrollTerminal })));
const PayslipsView = lazy(() => import('../app/views/hr/PayslipsView').then((m) => ({ default: m.PayslipsView })));
const HrSettings = lazy(() => import('../app/views/hr/HrSettings').then((m) => ({ default: m.HrSettings })));

// Module 09: School Operations Management Views
const OperationsLayout = lazy(() => import('../app/views/operations/OperationsLayout').then((m) => ({ default: m.OperationsLayout })));
const OperationsOverview = lazy(() => import('../app/views/operations/OperationsOverview').then((m) => ({ default: m.OperationsOverview })));
const TransportView = lazy(() => import('../app/views/operations/TransportView').then((m) => ({ default: m.TransportView })));
const InventoryView = lazy(() => import('../app/views/operations/InventoryView').then((m) => ({ default: m.InventoryView })));
const AssetsView = lazy(() => import('../app/views/operations/AssetsView').then((m) => ({ default: m.AssetsView })));
const GateView = lazy(() => import('../app/views/operations/GateView').then((m) => ({ default: m.GateView })));
const EventsView = lazy(() => import('../app/views/operations/EventsView').then((m) => ({ default: m.EventsView })));
const OperationsReportsView = lazy(() => import('../app/views/operations/OperationsReportsView').then((m) => ({ default: m.OperationsReportsView })));

// Module 10: Communication & Automation Views
const CommunicationLayout = lazy(() => import('../app/views/communication/CommunicationLayout'));
const CommunicationOverview = lazy(() => import('../app/views/communication/CommunicationOverview'));
const MessagesView = lazy(() => import('../app/views/communication/MessagesView'));
const TemplatesView = lazy(() => import('../app/views/communication/TemplatesView'));
const AutomationRulesView = lazy(() => import('../app/views/communication/AutomationRulesView'));
const ScheduledJobsView = lazy(() => import('../app/views/communication/ScheduledJobsView'));
const NotificationsView = lazy(() => import('../app/views/communication/NotificationsView'));
const TasksView = lazy(() => import('../app/views/communication/TasksView'));
const ReportsView = lazy(() => import('../app/views/communication/ReportsView'));
const SettingsView = lazy(() => import('../app/views/communication/SettingsView'));

// Module 11: Documents, Certificates & Printing Views
const DocumentsLayout = lazy(() => import('../app/views/documents/DocumentsLayout'));
const DocumentsOverview = lazy(() => import('../app/views/documents/DocumentsOverview'));
const DocumentTemplatesView = lazy(() => import('../app/views/documents/TemplatesView'));
const TemplateEditorView = lazy(() => import('../app/views/documents/TemplateEditorView'));
const GenerateDocumentView = lazy(() => import('../app/views/documents/GenerateDocumentView'));
const GeneratedDocumentsView = lazy(() => import('../app/views/documents/GeneratedDocumentsView'));
const BulkGenerationView = lazy(() => import('../app/views/documents/BulkGenerationView'));
const SignaturesBrandingView = lazy(() => import('../app/views/documents/SignaturesBrandingView'));
const DocumentReportsView = lazy(() => import('../app/views/documents/DocumentReportsView'));
const PublicDocumentVerification = lazy(() => import('../app/views/documents/PublicDocumentVerification'));

export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center">Loading...</div>
      }
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify/document/:token" element={<PublicDocumentVerification />} />

        {/* Protected Application Layout */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="master-data" element={<MasterData />} />
            <Route path="setup" element={<SchoolSetupWizard />} />
            <Route path="admin/setup-wizard" element={<SchoolSetupWizard />} />

            {/* Students & Admissions Module */}
            <Route path="students">
              <Route element={<PermissionRoute permission="students.view" />}>
                <Route index element={<StudentsOverview />} />
                <Route path="list" element={<StudentsList />} />
                <Route path="print" element={<StudentPrintList />} />
                <Route path=":id" element={<StudentDetail />} />
              </Route>
              <Route element={<PermissionRoute permission="students.manage" />}>
                <Route path="new" element={<StudentForm />} />
              </Route>
              <Route element={<PermissionRoute permission="student.import" />}>
                <Route path="import" element={<StudentImport />} />
              </Route>
              <Route path="admissions">
                <Route element={<PermissionRoute permission="admissions.view" />}>
                  <Route index element={<AdmissionsList />} />
                  <Route path=":id" element={<AdmissionReview />} />
                </Route>
                <Route element={<PermissionRoute permission="admissions.manage" />}>
                  <Route path="new" element={<AdmissionForm />} />
                </Route>
              </Route>
            </Route>

            {/* Parents & Families Module (Module 04) */}
            <Route path="guardians">
              <Route element={<PermissionRoute permission="guardians.view" />}>
                <Route index element={<GuardiansList />} />
                <Route path="overview" element={<ParentsOverview />} />
                <Route path="list" element={<GuardiansList />} />
                <Route path=":id" element={<GuardianDetail />} />
              </Route>
              <Route element={<PermissionRoute permission="guardians.manage" />}>
                <Route path="new" element={<GuardianForm />} />
                <Route path=":id/edit" element={<GuardianForm />} />
              </Route>
              <Route element={<PermissionRoute permission="guardian.import" />}>
                <Route path="import" element={<GuardianImport />} />
              </Route>
            </Route>

            <Route path="families">
              <Route element={<PermissionRoute permission="families.view" />}>
                <Route index element={<FamiliesList />} />
                <Route path=":id" element={<FamilyDetail />} />
              </Route>
              <Route element={<PermissionRoute permission="families.manage" />}>
                <Route path="new" element={<FamilyForm />} />
                <Route path=":id/edit" element={<FamilyForm />} />
              </Route>
            </Route>

            {/* Attendance & Leave Module (Module 05) */}
            <Route path="attendance">
              <Route element={<PermissionRoute permission="attendance.view" />}>
                <Route index element={<AttendanceOverview />} />
                <Route path="overview" element={<AttendanceOverview />} />
                <Route path="students" element={<StudentAttendanceRegister />} />
                <Route path="student-leave" element={<StudentLeaveView />} />
                <Route path="staff" element={<StaffAttendanceView />} />
                <Route path="staff-leave" element={<StaffLeaveView />} />
                <Route path="holidays" element={<HolidaysView />} />
                <Route path="reports" element={<AttendanceReports />} />
              </Route>
            </Route>

            {/* Module 06: Academics & Examination Management */}
            <Route path="academics">
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AcademicsOverview />} />
              <Route element={<PermissionRoute permission="academic.view" />}>
                <Route path="terms" element={<TermsView />} />
                <Route path="assignments" element={<TeacherAssignmentsView />} />
              </Route>
              <Route element={<PermissionRoute permission="timetable.view" />}>
                <Route path="timetable" element={<TimetableManager />} />
              </Route>
              <Route element={<PermissionRoute permission="homework.view" />}>
                <Route path="homework" element={<HomeworkView />} />
              </Route>
              <Route element={<PermissionRoute permission="exams.view" />}>
                <Route path="exams" element={<ExamsView />} />
              </Route>
              <Route element={<PermissionRoute permission="marks.enter" />}>
                <Route path="marks" element={<MarksEntryView />} />
              </Route>
              <Route element={<PermissionRoute permission="results.view" />}>
                <Route path="results" element={<ResultsView />} />
              </Route>
              <Route element={<PermissionRoute permission="promotion.manage" />}>
                <Route path="promotions" element={<PromotionView />} />
              </Route>
            </Route>

            {/* Direct Alias Route for /exams */}
            <Route path="exams" element={<Navigate to="/academics/exams" replace />} />

            {/* Module 07: Finance & Accounting */}
            <Route path="finance">
              <Route index element={<Navigate to="overview" replace />} />
              <Route element={<PermissionRoute permission="finance.view" />}>
                <Route path="overview" element={<FinanceOverview />} />
                <Route path="students" element={<StudentFeesView />} />
                <Route path="invoices" element={<FeeInvoicesView />} />
              </Route>
              <Route element={<PermissionRoute permission="finance.collect" />}>
                <Route path="collections" element={<FeeCollectionView />} />
              </Route>
              <Route element={<PermissionRoute permission="finance.expenses.view" />}>
                <Route path="expenses" element={<ExpensesView />} />
              </Route>
              <Route element={<PermissionRoute permission="finance.accounts.view" />}>
                <Route path="accounts" element={<AccountsLedgerView />} />
              </Route>
              <Route element={<PermissionRoute permission="finance.bank.view" />}>
                <Route path="banking" element={<BankingView />} />
              </Route>
              <Route element={<PermissionRoute permission="finance.reports.view" />}>
                <Route path="reports" element={<FinancialReportsView />} />
              </Route>
              {/* Parent Fee Portal */}
              <Route path="parent-portal" element={<ParentFinanceView />} />
            </Route>

            {/* Module 08: HR & Payroll Management */}
            <Route path="hr">
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<HrOverview />} />
              <Route path="employees" element={<EmployeesDirectory />} />
              <Route path="employees/:id" element={<EmployeeDetail />} />
              <Route path="leaves" element={<LeaveManagement />} />
              <Route path="salary-setup" element={<SalarySetup />} />
              <Route path="payroll" element={<PayrollTerminal />} />
              <Route path="payslips" element={<PayslipsView />} />
              <Route path="settings" element={<HrSettings />} />
            </Route>
            <Route path="payroll" element={<Navigate to="/hr/payroll" replace />} />

            {/* Module 09: School Operations Management */}
            <Route path="operations" element={<OperationsLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<OperationsOverview />} />
              <Route path="transport" element={<TransportView />} />
              <Route path="inventory" element={<InventoryView />} />
              <Route path="assets" element={<AssetsView />} />
              <Route path="gate" element={<GateView />} />
              <Route path="events" element={<EventsView />} />
              <Route path="reports" element={<OperationsReportsView />} />
            </Route>
            <Route path="transport" element={<Navigate to="/operations/transport" replace />} />
            <Route path="inventory" element={<Navigate to="/operations/inventory" replace />} />

            {/* Module 10: Communication & Automation */}
            <Route path="communication" element={<CommunicationLayout />}>
              <Route index element={<CommunicationOverview />} />
              <Route path="messages" element={<MessagesView />} />
              <Route path="templates" element={<TemplatesView />} />
              <Route path="rules" element={<AutomationRulesView />} />
              <Route path="jobs" element={<ScheduledJobsView />} />
              <Route path="notifications" element={<NotificationsView />} />
              <Route path="tasks" element={<TasksView />} />
              <Route path="reports" element={<ReportsView />} />
              <Route path="settings" element={<SettingsView />} />
            </Route>

            {/* Module 11: Documents, Certificates & Printing */}
            <Route path="documents" element={<DocumentsLayout />}>
              <Route index element={<DocumentsOverview />} />
              <Route path="overview" element={<Navigate to="/documents" replace />} />
              <Route path="templates" element={<DocumentTemplatesView />} />
              <Route path="templates/:id/editor" element={<TemplateEditorView />} />
              <Route path="generate" element={<GenerateDocumentView />} />
              <Route path="register" element={<GeneratedDocumentsView />} />
              <Route path="bulk" element={<BulkGenerationView />} />
              <Route path="signatures" element={<SignaturesBrandingView />} />
              <Route path="reports" element={<DocumentReportsView />} />
            </Route>
            <Route path="lifecycle" element={<Navigate to="/documents" replace />} />

            {/* Configuration area */}
            <Route element={<PermissionRoute permission="settings.manage" />}>
              <Route path="configuration" element={<Configuration />} />
              <Route path="configuration/branding" element={<BrandingConfiguration />} />
              <Route path="configuration/number-series" element={<NumberSeriesConfiguration />} />
              <Route path="configuration/history" element={<ConfigurationHistory />} />
              <Route path="configuration/:section" element={<Configuration />} />
            </Route>

            {/* Admin area */}
            <Route path="admin">
              <Route index element={<Navigate to="users" replace />} />

              {/* Users */}
              <Route element={<PermissionRoute permission="users.manage" />}>
                <Route path="users" element={<UsersList />} />
                <Route path="users/new" element={<UserForm />} />
                <Route path="users/:id/edit" element={<UserForm />} />
              </Route>

              {/* Roles */}
              <Route element={<PermissionRoute permission="roles.manage" />}>
                <Route path="roles" element={<RolesList />} />
                <Route path="roles/new" element={<RoleForm />} />
                <Route path="roles/:id/edit" element={<RoleForm />} />
              </Route>

              {/* Academic Years */}
              <Route element={<PermissionRoute permission="academic.manage" />}>
                <Route path="academic-years" element={<AcademicYearsList />} />
                <Route path="academic-years/new" element={<AcademicYearForm />} />
                <Route path="academic-years/:id/edit" element={<AcademicYearForm />} />
              </Route>

              {/* Audit Logs */}
              <Route element={<PermissionRoute permission="users.manage" />}>
                <Route path="audit-logs" element={<AuditLogsList />} />
              </Route>

              {/* Security & Access */}
              <Route element={<PermissionRoute permission="security.manage" />}>
                <Route path="security/overview" element={<SecurityOverview />} />
                <Route path="security/policy" element={<PasswordPolicyForm />} />
                <Route path="security/ip-restrictions" element={<IpRestrictionsList />} />
                <Route path="security/events" element={<SecurityEventsLog />} />
              </Route>
            </Route>

            {/* Account area */}
            <Route path="account">
              <Route path="security" element={<AccountSecurity />} />
            </Route>
          </Route>
        </Route>

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
