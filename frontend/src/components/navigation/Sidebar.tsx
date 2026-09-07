import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../core/auth/AuthContext';
import { useTenant } from '../../core/tenancy/TenantContext';
import {
  Users,
  CalendarCheck,
  CreditCard,
  BookOpen,
  Award,
  Briefcase,
  FileBadge,
  MessageSquare,
  ShieldCheck,
  ServerCog,
  Sparkles,
  Settings,
  Layers,
  HeartHandshake,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { hasEntitlement } = useTenant();
  const { t } = useTranslation();

  const businessNav = [
    {
      name: t('navigation.configuration', 'Configuration'),
      path: '/configuration',
      icon: Settings,
      entitlement: null,
      permission: 'settings.manage',
    },
    {
      name: t('navigation.masterData', 'Master Data'),
      path: '/master-data',
      icon: Layers,
      entitlement: null,
      permission: 'master_data.view',
    },
    {
      name: t('navigation.students', 'Students & Admissions'),
      path: '/students',
      icon: Users,
      entitlement: 'students.enabled',
      badge: 'Core',
    },
    {
      name: t('navigation.parents', 'Parents & Families'),
      path: '/guardians/overview',
      icon: HeartHandshake,
      entitlement: null,
      permission: 'guardians.view',
      badge: 'M04',
    },
    {
      name: t('navigation.attendance', 'Attendance & Geofence'),
      path: '/attendance',
      icon: CalendarCheck,
      entitlement: null,
      permission: 'attendance.view',
      badge: 'M05',
    },
    {
      name: t('navigation.finance', 'Finance & Accounting'),
      path: '/finance',
      icon: CreditCard,
      entitlement: null,
      permission: 'finance.view',
      badge: 'M07',
    },
    {
      name: t('navigation.academics', 'Academics & Timetable'),
      path: '/academics',
      icon: BookOpen,
      entitlement: null,
      permission: 'academic.view',
      badge: 'M06',
    },
    {
      name: t('navigation.exams', 'Examinations & Marks'),
      path: '/academics/exams',
      icon: Award,
      entitlement: null,
      permission: 'exams.view',
      badge: 'M06',
    },
    {
      name: t('navigation.hr', 'HR & Payroll'),
      path: '/hr',
      icon: Briefcase,
      entitlement: null,
      permission: 'hr.employee.view',
      badge: 'M08',
    },
    {
      name: t('navigation.operations', 'School Operations'),
      path: '/operations',
      icon: Layers,
      entitlement: null,
      permission: null,
      badge: 'M09',
    },
    {
      name: t('navigation.communication', 'Communication & Automation'),
      path: '/communication',
      icon: MessageSquare,
      entitlement: null,
      permission: null,
      badge: 'M10',
    },
    {
      name: t('navigation.documents', 'Documents & Printing'),
      path: '/documents',
      icon: FileBadge,
      entitlement: null,
      permission: 'documents.templates.view',
      badge: 'M11',
    },
  ];

  return (
    <aside className="hidden md:flex w-72 bg-white border-r border-zinc-200 flex-col h-screen select-none shrink-0 z-20">
      {/* Brand Header */}
      <div className="h-20 px-6 flex items-center justify-between border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-mehndi-600 via-mehndi-500 to-mehndi-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-mehndi-500/30">
            E
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-zinc-900">EVOLIX</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-mehndi-100 text-mehndi-700 border border-mehndi-200">
                v4.0
              </span>
            </div>
            <p className="text-[11px] font-medium text-zinc-500">School ERP SaaS</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5">
        <div className="px-3 pb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          <span>{t('navigation.schoolModules', 'School Modules')}</span>
          <span className="text-[10px] text-zinc-400">M01–M11</span>
        </div>

        {businessNav
          .filter((item: any) => !item.permission || hasPermission(item.permission))
          .map((item) => {
            const isEnabled = item.entitlement ? hasEntitlement(item.entitlement) : true;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-mehndi-100 to-white text-mehndi-700 border border-mehndi-200 shadow-sm shadow-mehndi-500/10 font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50/80'
                  } ${!isEnabled ? 'opacity-40 hover:opacity-75' : ''}`
                }
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        {/* Administration section */}
        {(() => {
          const adminNav = [
            { name: t('navigation.users', 'Users'), path: '/admin/users', icon: Users, permission: 'users.manage' },
            {
              name: t('navigation.roles', 'Roles & Permissions'),
              path: '/admin/roles',
              icon: ShieldCheck,
              permission: 'roles.manage',
            },
            {
              name: t('navigation.security', 'Security & Access'),
              path: '/admin/security/overview',
              icon: ServerCog,
              permission: 'security.manage',
            },
            {
              name: t('navigation.academicYears', 'Academic Years'),
              path: '/admin/academic-years',
              icon: Award,
              permission: 'academic.manage',
            },
            {
              name: t('navigation.setupWizard', 'Setup Wizard'),
              path: '/admin/setup-wizard',
              icon: Sparkles,
              permission: 'settings.manage',
            },
            {
              name: t('navigation.auditLogs', 'Audit Logs'),
              path: '/admin/audit-logs',
              icon: BookOpen,
              permission: 'users.manage',
            },
          ].filter((item) => hasPermission(item.permission));

          if (adminNav.length === 0) return null;

          return (
            <div className="pt-5 mt-4 border-t border-zinc-200">
              <div className="px-3 pb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t('navigation.administration', 'Administration')}
                </span>
              </div>
              {adminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-zinc-100 text-zinc-900 font-semibold'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          );
        })()}
        {/* Platform Console section */}
        {user?.isPlatformAdmin && (
          <div className="pt-5 mt-4 border-t border-zinc-200">
            <div className="px-3 pb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-mehndi-600">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {t('navigation.controlPlane', 'Control Plane')}
              </span>
              <span className="text-[10px] text-mehndi-500/80">Admin</span>
            </div>
            <NavLink
              to="/platform"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-mehndi-100/50 text-mehndi-700 border border-mehndi-200 font-semibold shadow-sm'
                    : 'text-mehndi-600/80 hover:text-mehndi-700 hover:bg-mehndi-50/50 border border-transparent'
                }`
              }
            >
              <ServerCog className="w-4 h-4 shrink-0 text-mehndi-600" />
              <span>Platform Operations</span>
            </NavLink>
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 transition-colors">
          <NavLink
            to="/account/security"
            className="flex items-center gap-3 truncate flex-1 hover:opacity-80"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-mehndi-600 to-mehndi-700 border border-mehndi-400/30 flex items-center justify-center font-bold text-white text-sm shadow-sm shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-zinc-900 truncate">{user?.name}</div>
              <div className="text-[11px] text-zinc-500 font-mono truncate">{user?.email}</div>
            </div>
          </NavLink>
          <button
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('tenant_slug');
              window.location.href = '/login';
            }}
            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            title={t('navigation.logout', 'Logout')}
            aria-label={t('navigation.logout', 'Logout')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};
