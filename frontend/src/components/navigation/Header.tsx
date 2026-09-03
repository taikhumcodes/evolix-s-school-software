import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { TenantSwitcher } from './TenantSwitcher';
import {
  Bell,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
  Settings,
  Users,
  CalendarCheck,
  CreditCard,
  BookOpen,
  Award,
  ServerCog,
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useTenant } from '../../core/tenancy/TenantContext';
import { useTranslation } from 'react-i18next';

export const Header: React.FC = () => {
  const { hasPermission, logout } = useAuth();
  const { hasEntitlement } = useTenant();
  const { i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const businessNav = [
    { name: 'Configuration', path: '/configuration', icon: Settings, permission: 'settings.manage' },
    { name: 'Students & Admissions', path: '/students', icon: Users, entitlement: 'students.enabled' },
    { name: 'Attendance & Geofence', path: '/attendance', icon: CalendarCheck, entitlement: 'attendance.enabled' },
    { name: 'Finance & Fees', path: '/finance', icon: CreditCard, entitlement: 'finance.enabled' },
    { name: 'Academics & Classes', path: '/academics', icon: BookOpen, entitlement: 'academics.enabled' },
    { name: 'Examinations', path: '/exams', icon: Award, entitlement: 'exams.enabled' },
  ].filter((item) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.entitlement && !hasEntitlement(item.entitlement)) return false;
    return true;
  });

  const adminNav = [
    { name: 'Users', path: '/admin/users', icon: Users, permission: 'users.manage' },
    { name: 'Roles & Permissions', path: '/admin/roles', icon: ShieldCheck, permission: 'roles.manage' },
    { name: 'Security & Access', path: '/admin/security/overview', icon: ServerCog, permission: 'security.manage' },
    { name: 'Academic Years', path: '/admin/academic-years', icon: Award, permission: 'academic.manage' },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: BookOpen, permission: 'users.manage' },
  ].filter((item) => hasPermission(item.permission));

  return (
    <>
      <header className="h-16 sm:h-20 border-b border-zinc-200 bg-white px-3 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <TenantSwitcher />
          <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-500 w-80 shadow-inner">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Search students, staff, receipts... (Ctrl+K)"
              className="bg-transparent border-none outline-none text-xs text-zinc-900 placeholder-zinc-400 w-full"
              readOnly
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Isolated</span>
          </div>

          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en')}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200 transition-all"
            aria-label={i18n.language === 'en' ? 'हिंदी' : 'English'}
          >
            {i18n.language === 'en' ? 'हिंदी' : 'EN'}
          </button>

          <button
            className="relative p-2 rounded-xl text-zinc-500 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 transition-all"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-mehndi-500 ring-2 ring-white"></span>
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-zinc-500 hover:text-red-600 bg-white hover:bg-red-50 border border-zinc-200 transition-all"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-mehndi-600 to-mehndi-500 flex items-center justify-center text-white font-extrabold text-sm shadow">
                  E
                </div>
                <span className="font-extrabold text-base tracking-tight text-zinc-900">EVOLIX</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 space-y-4">
              {/* Modules */}
              <div>
                <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  School Modules
                </div>
                <div className="space-y-1">
                  {businessNav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-mehndi-100 text-mehndi-800 font-semibold'
                              : 'text-zinc-600 hover:bg-zinc-50'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              {/* Administration */}
              {adminNav.length > 0 && (
                <div className="pt-2 border-t border-zinc-100">
                  <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Administration
                  </div>
                  <div className="space-y-1">
                    {adminNav.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              isActive
                                ? 'bg-zinc-100 text-zinc-900 font-semibold'
                                : 'text-zinc-600 hover:bg-zinc-50'
                            }`
                          }
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Account Security */}
              <div className="pt-2 border-t border-zinc-100">
                <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Account
                </div>
                <NavLink
                  to="/account/security"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-900 font-semibold'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    }`
                  }
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Account Security</span>
                </NavLink>
              </div>
            </div>

            {/* Bottom logout */}
            <div className="p-4 border-t border-zinc-200">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
