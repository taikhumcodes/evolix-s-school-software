import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Users,
  Briefcase,
  Landmark,
  Scale,
  BarChart3,
  HeartHandshake,
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';

export const FinanceNav: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, user } = useAuth();
  const isSuperadmin = Boolean(user?.isSuperadmin);

  const navItems = [
    {
      to: '/finance/overview',
      label: t('finance.nav.overview', 'Overview'),
      icon: LayoutDashboard,
      permission: 'finance.view',
    },
    {
      to: '/finance/collections',
      label: t('finance.nav.collections', 'Collections'),
      icon: Receipt,
      permission: 'finance.collect',
    },
    {
      to: '/finance/invoices',
      label: t('finance.nav.invoices', 'Fee Invoices'),
      icon: FileText,
      permission: 'finance.fees.view',
    },
    {
      to: '/finance/students',
      label: t('finance.nav.students', 'Student Ledger'),
      icon: Users,
      permission: 'finance.fees.view',
    },
    {
      to: '/finance/expenses',
      label: t('finance.nav.expenses', 'Expenses & Vendors'),
      icon: Briefcase,
      permission: 'finance.expenses.view',
    },
    {
      to: '/finance/accounts',
      label: t('finance.nav.accounts', 'Chart of Accounts & GL'),
      icon: Scale,
      permission: 'finance.accounts.view',
    },
    {
      to: '/finance/banking',
      label: t('finance.nav.banking', 'Banking & Reconciliation'),
      icon: Landmark,
      permission: 'finance.bank.view',
    },
    {
      to: '/finance/reports',
      label: t('finance.nav.reports', 'Financial Reports'),
      icon: BarChart3,
      permission: 'finance.reports.view',
    },
    {
      to: '/finance/parent-portal',
      label: t('finance.nav.parentPortal', 'Parent Fee View'),
      icon: HeartHandshake,
      permission: null, // Scoped to parents or staff
    },
  ];

  return (
    <div className="bg-white border-b border-zinc-200 pb-0 -mx-6 -mt-6 md:-mx-8 md:-mt-8 px-6 md:px-8 pt-6 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              {t('finance.title', 'Finance & Accounting')}
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Major Module 07
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {t(
              'finance.subtitle',
              'High-integrity double-entry accounting, student fee collections, immutable journals, expense tracking, and bank reconciliation'
            )}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-t border-zinc-100 overflow-x-auto no-scrollbar pt-1">
        {navItems
          .filter((item) => !item.permission || isSuperadmin || hasPermission(item.permission))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-mehndi-600 text-mehndi-700 bg-mehndi-50/60 font-bold'
                      : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </div>
    </div>
  );
};
