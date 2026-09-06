import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Clock,
  CalendarCheck,
  Building2,
  Briefcase,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Calculator,
  PlusCircle,
} from 'lucide-react';
import { HrNav } from './HrNav';
import { useHrOverview } from '../../../lib/api/hr';
import { usePayrollRuns } from '../../../lib/api/payroll';

export const HrOverview: React.FC = () => {
  const { t } = useTranslation();
  const { data: metrics, isLoading, error } = useHrOverview();
  const { data: runs } = usePayrollRuns();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <HrNav />
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-mehndi-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="space-y-6">
        <HrNav />
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <p className="text-sm font-medium">
            {t('hr.overview.error', 'Failed to load HR overview metrics.')}
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: t('hr.metrics.totalStaff', 'Total Staff'),
      value: metrics.totalEmployees,
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
      badge: 'All Roles',
    },
    {
      title: t('hr.metrics.activeStaff', 'Active Staff'),
      value: metrics.activeEmployees,
      icon: UserCheck,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
      badge: 'Active',
    },
    {
      title: t('hr.metrics.onProbation', 'Probationary'),
      value: metrics.probationEmployees,
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/60',
      badge: 'Review Due',
    },
    {
      title: t('hr.metrics.onLeave', 'Staff On Leave'),
      value: metrics.onLeaveEmployees,
      icon: CalendarCheck,
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200/60',
      badge: 'Today',
    },
    {
      title: t('hr.metrics.departments', 'Departments'),
      value: metrics.departmentsCount,
      icon: Building2,
      iconBg: 'bg-teal-50 text-teal-600 border-teal-200/60',
      badge: 'Academic & Admin',
    },
    {
      title: t('hr.metrics.designations', 'Designations'),
      value: metrics.designationsCount,
      icon: Briefcase,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
      badge: 'Levels',
    },
  ];

  const recentRuns = runs?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <HrNav />

      <div className="px-6 space-y-6">
        {/* Page Title & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              {t('hr.overview.title', 'HR & Payroll Command Center')}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {t(
                'hr.overview.subtitle',
                'Comprehensive human capital records, automated salary rules, leave balances, and compliant payroll processing.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/hr/employees"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              <Users className="w-4 h-4 text-zinc-500" />
              <span>{t('hr.actions.viewStaff', 'Staff Directory')}</span>
            </Link>
            <Link
              to="/hr/payroll"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-mehndi-600 hover:bg-mehndi-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-mehndi-500/20 transition-all"
            >
              <Calculator className="w-4 h-4" />
              <span>{t('hr.actions.runPayroll', 'Run Payroll')}</span>
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${card.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                    {card.badge}
                  </span>
                </div>
                <div className="text-2xl font-black text-zinc-900">{card.value}</div>
                <div className="text-xs font-medium text-zinc-500 mt-1">{card.title}</div>
              </div>
            );
          })}
        </div>

        {/* Action Hub & Integrity Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Workflows */}
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-black text-zinc-900">
              {t('hr.overview.quickWorkflows', 'Core Operations')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/hr/employees"
                className="group p-4 rounded-xl border border-zinc-200 hover:border-mehndi-300 hover:bg-mehndi-50/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-mehndi-100 text-mehndi-700 flex items-center justify-center mb-3">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 group-hover:text-mehndi-700">
                    {t('hr.overview.onboardStaff', 'Onboard Employee')}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {t('hr.overview.onboardDesc', 'Register personal profile, department, masked bank details, and statutory numbers.')}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-mehndi-600 mt-3">
                  <span>{t('common.continue', 'Manage')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link
                to="/hr/salary-setup"
                className="group p-4 rounded-xl border border-zinc-200 hover:border-mehndi-300 hover:bg-mehndi-50/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 group-hover:text-amber-700">
                    {t('hr.overview.salaryStructures', 'Salary Structures & GL')}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {t('hr.overview.salaryStructuresDesc', 'Formula components, cycles detection, and strict General Ledger expense mapping.')}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-600 mt-3">
                  <span>{t('common.setup', 'Configure')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link
                to="/hr/leaves"
                className="group p-4 rounded-xl border border-zinc-200 hover:border-mehndi-300 hover:bg-mehndi-50/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 group-hover:text-purple-700">
                    {t('hr.overview.leaveLedger', 'Leave Policies & Entitlements')}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {t('hr.overview.leaveLedgerDesc', 'Idempotent leave consumption, annual balances, and double-deduction prevention.')}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-purple-600 mt-3">
                  <span>{t('common.view', 'View Balances')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link
                to="/hr/payroll"
                className="group p-4 rounded-xl border border-zinc-200 hover:border-mehndi-300 hover:bg-mehndi-50/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-700">
                    {t('hr.overview.payrollTerminal', 'Payroll Processing Terminal')}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {t('hr.overview.payrollTerminalDesc', 'Calculate, review, post balanced General Ledger journals, and disburse atomic payments.')}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 mt-3">
                  <span>{t('common.process', 'Open Terminal')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>
          </div>

          {/* Payroll Integrity Status Banner */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-6 text-white shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-mehndi-400">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-black tracking-wider uppercase">
                  Payroll Integrity Active
                </span>
              </div>
              <h3 className="text-lg font-bold">
                {t('hr.overview.integrityTitle', 'Financial Double-Entry Safety')}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Module 08 runs under strict multi-tenant isolation. Salary calculations prevent double-counting, component formula cycles are topologically verified, and all payouts require atomic row-level balance checks.
              </p>
              <div className="pt-2 space-y-1.5 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Gross = SUM(Earning line items) only</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Module 07 LedgerAccount reconciliation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Bank accounts encrypted & masked</span>
                </div>
              </div>
            </div>

            <Link
              to="/hr/settings"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <span>{t('hr.overview.viewSettings', 'View GL Configuration')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Recent Payroll Runs Table */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-zinc-900">
              {t('hr.overview.recentRuns', 'Recent Payroll Cycles')}
            </h2>
            <Link
              to="/hr/payroll"
              className="text-xs font-bold text-mehndi-600 hover:text-mehndi-700 flex items-center gap-1"
            >
              <span>{t('common.viewAll', 'View All Runs')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentRuns.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-sm">
              {t('hr.overview.noRuns', 'No payroll runs created yet. Create a period to initiate processing.')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-400 text-xs font-semibold uppercase">
                    <th className="pb-3">{t('hr.table.runNumber', 'Run #')}</th>
                    <th className="pb-3">{t('hr.table.period', 'Period')}</th>
                    <th className="pb-3">{t('hr.table.type', 'Type')}</th>
                    <th className="pb-3">{t('hr.table.employees', 'Staff')}</th>
                    <th className="pb-3">{t('hr.table.gross', 'Gross')}</th>
                    <th className="pb-3">{t('hr.table.net', 'Net Pay')}</th>
                    <th className="pb-3">{t('hr.table.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 font-medium">
                  {recentRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 font-semibold text-zinc-900">{run.runNumber}</td>
                      <td className="py-3 text-zinc-600">{run.period?.periodName}</td>
                      <td className="py-3">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                          {run.runType}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-600">{run.employeeCount}</td>
                      <td className="py-3 text-zinc-900">₹{Number(run.totalGross).toLocaleString('en-IN')}</td>
                      <td className="py-3 font-bold text-mehndi-700">₹{Number(run.totalNetPay).toLocaleString('en-IN')}</td>
                      <td className="py-3">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            run.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : run.status === 'POSTED'
                              ? 'bg-blue-100 text-blue-800'
                              : run.status === 'APPROVED'
                              ? 'bg-amber-100 text-amber-800'
                              : run.status === 'REVERSED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
