import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Coins,
  Calculator,
  FileCheck2,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';

export const HrNav: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, user } = useAuth();
  const isSuperadmin = Boolean(user?.isSuperadmin);

  const navItems = [
    {
      to: '/hr/overview',
      label: t('hr.nav.overview', 'Overview'),
      icon: LayoutDashboard,
      permission: 'hr.employee.view',
    },
    {
      to: '/hr/employees',
      label: t('hr.nav.employees', 'Staff Directory'),
      icon: Users,
      permission: 'hr.employee.view',
    },
    {
      to: '/hr/leaves',
      label: t('hr.nav.leaves', 'Leave Policies & Ledger'),
      icon: CalendarDays,
      permission: 'hr.leave.view',
    },
    {
      to: '/hr/salary-setup',
      label: t('hr.nav.salarySetup', 'Salary Components & Structures'),
      icon: Coins,
      permission: 'payroll.structure.view',
    },
    {
      to: '/hr/payroll',
      label: t('hr.nav.payroll', 'Payroll Processing'),
      icon: Calculator,
      permission: 'payroll.run.view',
    },
    {
      to: '/hr/payslips',
      label: t('hr.nav.payslips', 'Payslips & Self-Service'),
      icon: FileCheck2,
      permission: 'payroll.payslip.view',
    },
    {
      to: '/hr/settings',
      label: t('hr.nav.settings', 'HR & GL Settings'),
      icon: SlidersHorizontal,
      permission: 'settings.manage',
    },
  ];

  return (
    <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
      <div className="flex items-center gap-2 overflow-x-auto px-6 py-2 no-scrollbar">
        {navItems.map((item) => {
          if (!isSuperadmin && item.permission && !hasPermission(item.permission)) {
            return null;
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-mehndi-50 text-mehndi-700 shadow-sm border border-mehndi-200'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
