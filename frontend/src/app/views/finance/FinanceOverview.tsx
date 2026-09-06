import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  FileText,
  AlertCircle,
  Briefcase,
  Wallet,
  Landmark,
  Scale,
  ArrowUpRight,
} from 'lucide-react';
import { FinanceNav } from './FinanceNav';
import { useFinanceOverview, useFeeReceipts } from '../../../lib/api/finance';

export const FinanceOverview: React.FC = () => {
  const { t } = useTranslation();
  const { data: metrics, isLoading, error } = useFinanceOverview();
  const { data: receiptsData } = useFeeReceipts(1);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <FinanceNav />
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-mehndi-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="space-y-6">
        <FinanceNav />
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-medium">
            {t('finance.overview.error', 'Failed to load financial overview metrics.')}
          </p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: t('finance.metrics.feeDemand', 'Fee Demand'),
      amount: `₹${metrics.feeDemand}`,
      icon: FileText,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
      badge: 'Billed',
    },
    {
      title: t('finance.metrics.totalCollected', 'Total Collected'),
      amount: `₹${metrics.totalCollected}`,
      icon: Receipt,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
      badge: 'Realized',
    },
    {
      title: t('finance.metrics.totalOutstanding', 'Total Outstanding'),
      amount: `₹${metrics.totalOutstanding}`,
      icon: AlertCircle,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/60',
      badge: 'Receivable',
    },
    {
      title: t('finance.metrics.totalOverdue', 'Total Overdue'),
      amount: `₹${metrics.totalOverdue}`,
      icon: AlertCircle,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200/60',
      badge: 'Overdue',
    },
    {
      title: t('finance.metrics.todayCollection', "Today's Collection"),
      amount: `₹${metrics.todayCollection}`,
      icon: TrendingUp,
      iconBg: 'bg-mehndi-50 text-mehndi-700 border-mehndi-200/60',
      badge: 'Today',
    },
    {
      title: t('finance.metrics.monthExpenses', "Month's Expenses"),
      amount: `₹${metrics.monthExpenses}`,
      icon: Briefcase,
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200/60',
      badge: 'Outgoing',
    },
    {
      title: t('finance.metrics.cashBalance', 'Cash in Hand'),
      amount: `₹${metrics.cashBalance}`,
      icon: Wallet,
      iconBg: 'bg-teal-50 text-teal-600 border-teal-200/60',
      badge: 'Liquid',
    },
    {
      title: t('finance.metrics.bankBalance', 'Bank Balances'),
      amount: `₹${metrics.bankBalance}`,
      icon: Landmark,
      iconBg: 'bg-sky-50 text-sky-600 border-sky-200/60',
      badge: 'Institution',
    },
    {
      title: t('finance.metrics.netSurplus', 'Net Surplus / Deficit'),
      amount: `₹${metrics.netSurplus}`,
      icon: Scale,
      iconBg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
      badge: 'Net',
    },
  ];

  return (
    <div className="space-y-6">
      <FinanceNav />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all duration-150"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${c.iconBg}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    {c.title}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-50 border border-zinc-100 px-1.5 py-0.5 rounded">
                  {c.badge}
                </span>
              </div>
              <p className="text-xl font-semibold font-mono tracking-tight text-zinc-900">
                {c.amount}
              </p>
            </div>
          );
        })}
      </div>

      {/* Collection Efficiency Bar */}
      <div className="p-5 bg-white border border-zinc-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            {t('finance.overview.collectionEfficiency', 'Fee Collection Efficiency')}
          </span>
          <span className="text-sm font-extrabold text-mehndi-700">{metrics.collectionRate}%</span>
        </div>
        <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-mehndi-500 to-emerald-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(metrics.collectionRate, 100)}%` }}
          />
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/finance/collections"
          className="flex items-center justify-between p-3.5 bg-white border border-zinc-200 rounded-xl hover:border-mehndi-500 hover:bg-mehndi-50/50 transition-all text-sm font-semibold text-zinc-800 shadow-sm"
        >
          <span>{t('finance.quickAction.collect', 'Collect Fees')}</span>
          <ArrowUpRight className="w-4 h-4 text-zinc-400" />
        </Link>
        <Link
          to="/finance/invoices"
          className="flex items-center justify-between p-3.5 bg-white border border-zinc-200 rounded-xl hover:border-mehndi-500 hover:bg-mehndi-50/50 transition-all text-sm font-semibold text-zinc-800 shadow-sm"
        >
          <span>{t('finance.quickAction.invoices', 'Generate Invoices')}</span>
          <ArrowUpRight className="w-4 h-4 text-zinc-400" />
        </Link>
        <Link
          to="/finance/expenses"
          className="flex items-center justify-between p-3.5 bg-white border border-zinc-200 rounded-xl hover:border-mehndi-500 hover:bg-mehndi-50/50 transition-all text-sm font-semibold text-zinc-800 shadow-sm"
        >
          <span>{t('finance.quickAction.expenses', 'Record Expense')}</span>
          <ArrowUpRight className="w-4 h-4 text-zinc-400" />
        </Link>
        <Link
          to="/finance/reports"
          className="flex items-center justify-between p-3.5 bg-white border border-zinc-200 rounded-xl hover:border-mehndi-500 hover:bg-mehndi-50/50 transition-all text-sm font-semibold text-zinc-800 shadow-sm"
        >
          <span>{t('finance.quickAction.reports', 'Trial Balance & P&L')}</span>
          <ArrowUpRight className="w-4 h-4 text-zinc-400" />
        </Link>
      </div>

      {/* Recent Collections Table */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
            {t('finance.overview.recentCollections', 'Recent Collections')}
          </h2>
          <Link
            to="/finance/collections"
            className="text-xs font-semibold text-mehndi-700 hover:text-mehndi-800 flex items-center gap-1"
          >
            {t('finance.overview.viewAll', 'View All Receipts')} &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">{t('finance.receipt.receiptNumber', 'Receipt #')}</th>
                <th className="py-3 px-4">{t('finance.receipt.student', 'Student')}</th>
                <th className="py-3 px-4">{t('finance.receipt.date', 'Date')}</th>
                <th className="py-3 px-4">{t('finance.receipt.method', 'Payment Method')}</th>
                <th className="py-3 px-4 text-right">{t('finance.receipt.amount', 'Amount')}</th>
                <th className="py-3 px-4 text-center">{t('finance.receipt.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {receiptsData?.data && receiptsData.data.length > 0 ? (
                receiptsData.data.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">{r.receiptNumber}</td>
                    <td className="py-3 px-4 font-medium text-zinc-800">
                      {r.studentSnapshot?.name || 'N/A'}
                      <span className="block text-[10px] text-zinc-400 font-mono">
                        {r.studentSnapshot?.admissionNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {new Date(r.receiptDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 text-zinc-700">
                        {r.feePayment?.paymentMethod || r.breakdownSnapshot?.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">
                      ₹{r.breakdownSnapshot?.totalAmount || '0.00'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.isCancelled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          {t('finance.status.cancelled', 'CANCELLED')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {t('finance.status.valid', 'VALID')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-zinc-400">
                    {t('finance.common.noData', 'No recent fee receipts recorded yet.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default FinanceOverview;
