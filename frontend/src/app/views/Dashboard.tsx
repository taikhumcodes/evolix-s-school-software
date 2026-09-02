import { useTranslation } from 'react-i18next';
import { useAuth } from '../../core/auth/AuthContext';
import { useTenant } from '../../core/tenancy/TenantContext';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, Award, BookOpen } from 'lucide-react';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t('navigation.dashboard', 'Dashboard')}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Context */}
        <div className="glass-panel p-6 rounded-xl bg-white/60 border border-zinc-200 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-mehndi-600" />
            User Information
          </h2>
          {user ? (
            <div className="space-y-3 text-sm text-zinc-600">
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <span className="font-medium text-zinc-500">Name:</span>
                <span className="text-zinc-900 font-semibold">{user.name}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <span className="font-medium text-zinc-500">Email:</span>
                <span className="text-zinc-900">{user.email}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <span className="font-medium text-zinc-500">Tenant ID:</span>
                <span className="text-zinc-900 font-mono text-xs">{user.tenant_id}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="font-medium text-zinc-500">Role context:</span>
                <span className="text-zinc-900">
                  {user.isPlatformAdmin ? 'Platform Admin' : 'Staff / User'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Loading user context...</p>
          )}
        </div>

        {/* Tenant Context */}
        <div className="glass-panel p-6 rounded-xl bg-white/60 border border-zinc-200 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-mehndi-600" />
            Active School context
          </h2>
          {currentTenant ? (
            <div className="space-y-3 text-sm text-zinc-600">
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <span className="font-medium text-zinc-500">School Name:</span>
                <span className="text-zinc-900 font-semibold">{currentTenant.schoolName}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <span className="font-medium text-zinc-500">Slug:</span>
                <span className="text-zinc-900">{currentTenant.tenantSlug}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="font-medium text-zinc-500">Status:</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Loading tenant context...</p>
          )}
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="glass-panel p-6 rounded-xl bg-white/60 border border-zinc-200 shadow-sm mt-6">
        <h2 className="text-lg font-semibold text-zinc-800 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-mehndi-600" />
          Administration Quick Links
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/admin/users"
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-mehndi-50 hover:border-mehndi-200 hover:text-mehndi-700 transition-colors text-zinc-700 gap-2 text-sm font-semibold"
          >
            <Users className="w-6 h-6" />
            Users
          </Link>
          <Link
            to="/admin/roles"
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-mehndi-50 hover:border-mehndi-200 hover:text-mehndi-700 transition-colors text-zinc-700 gap-2 text-sm font-semibold"
          >
            <ShieldCheck className="w-6 h-6" />
            Roles & Permissions
          </Link>
          <Link
            to="/admin/academic-years"
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-mehndi-50 hover:border-mehndi-200 hover:text-mehndi-700 transition-colors text-zinc-700 gap-2 text-sm font-semibold"
          >
            <Award className="w-6 h-6" />
            Academic Years
          </Link>
          <Link
            to="/admin/audit-logs"
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-mehndi-50 hover:border-mehndi-200 hover:text-mehndi-700 transition-colors text-zinc-700 gap-2 text-sm font-semibold"
          >
            <BookOpen className="w-6 h-6" />
            Audit Logs
          </Link>
        </div>
      </div>
    </div>
  );
}
