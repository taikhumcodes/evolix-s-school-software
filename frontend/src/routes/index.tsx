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

export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center">Loading...</div>
      }
    >
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Application Routes */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

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
