import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  CheckCircle,
  AlertCircle,
  Scale,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { FinanceNav } from './FinanceNav';
import {
  useTrialBalance,
  useProfitAndLoss,
  useBalanceSheet,
  useAgingReport,
} from '../../../lib/api/finance';
import apiClient from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';

export const FinancialReportsView: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'TRIAL_BALANCE' | 'PL' | 'BALANCE_SHEET' | 'AGING'>('TRIAL_BALANCE');

  const { data: trialBalance } = useTrialBalance();
  const { data: plData } = useProfitAndLoss();
  const { data: bsData } = useBalanceSheet();
  const { data: agingData } = useAgingReport();

  const handleExportCsv = async (exportType: string) => {
    try {
      const response = await apiClient.get('/finance/export/csv', {
        params: { exportType },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exportType}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Downloaded ${exportType} CSV report.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <FinanceNav />

      {/* Control Header & Tabs */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('TRIAL_BALANCE')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'TRIAL_BALANCE'
                ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t('finance.reports.tabTrialBalance', 'Trial Balance')}
          </button>
          <button
            onClick={() => setActiveTab('PL')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'PL'
                ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t('finance.reports.tabPL', 'Profit & Loss (P&L)')}
          </button>
          <button
            onClick={() => setActiveTab('BALANCE_SHEET')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'BALANCE_SHEET'
                ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t('finance.reports.tabBalanceSheet', 'Balance Sheet')}
          </button>
          <button
            onClick={() => setActiveTab('AGING')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'AGING'
                ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t('finance.reports.tabAging', 'Receivable Aging')}
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => handleExportCsv(activeTab.toLowerCase())}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{t('finance.reports.exportCsv', 'Export CSV')}</span>
          </button>
        </div>
      </div>

      {/* Tab: Trial Balance */}
      {activeTab === 'TRIAL_BALANCE' && (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden space-y-4">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Trial Balance Statement
            </h3>
            <div
              className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                trialBalance?.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {trialBalance?.isBalanced ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{trialBalance?.isBalanced ? 'BALANCED' : 'UNBALANCED'}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Debit (₹)</th>
                  <th className="py-3 px-4 text-right">Credit (₹)</th>
                  <th className="py-3 px-4 text-right">Net Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {trialBalance?.accounts && trialBalance.accounts.length > 0 ? (
                  trialBalance.accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-zinc-900">{acc.code}</td>
                      <td className="py-2.5 px-4 font-medium text-zinc-800">{acc.name}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700">
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {Number(acc.totalDebit) > 0 ? `₹${acc.totalDebit}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                        {Number(acc.totalCredit) > 0 ? `₹${acc.totalCredit}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-zinc-900">
                        ₹{acc.closingBalance}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      No accounts found in trial balance.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-100 border-t-2 border-zinc-300 font-black text-xs text-zinc-900">
                  <td colSpan={3} className="py-3 px-4 uppercase tracking-wider">
                    Total Debit & Credit Invariant
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-zinc-900">
                    ₹{trialBalance?.totalDebit || '0.00'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-emerald-800">
                    ₹{trialBalance?.totalCredit || '0.00'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-zinc-900">
                    {trialBalance?.isBalanced ? '₹0.00' : 'DIFF'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Profit & Loss */}
      {activeTab === 'PL' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Side */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Revenue / Income Accounts</span>
            </h3>
            <div className="divide-y divide-zinc-100 text-xs">
              {plData?.incomeAccounts && plData.incomeAccounts.length > 0 ? (
                plData.incomeAccounts.map((inc) => (
                  <div key={inc.id} className="py-2 flex justify-between">
                    <span className="font-medium text-zinc-800">
                      {inc.code} &bull; {inc.name}
                    </span>
                    <span className="font-mono font-bold text-emerald-700">₹{inc.amount}</span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-zinc-400 italic">No income posted.</p>
              )}
            </div>
            <div className="pt-3 border-t-2 border-zinc-200 flex justify-between font-bold text-xs">
              <span>Total Revenue:</span>
              <span className="font-mono text-sm text-emerald-800">₹{plData?.totalIncome || '0.00'}</span>
            </div>
          </div>

          {/* Expense Side */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
              <Scale className="w-4 h-4 text-rose-600" />
              <span>Operational Expense Accounts</span>
            </h3>
            <div className="divide-y divide-zinc-100 text-xs">
              {plData?.expenseAccounts && plData.expenseAccounts.length > 0 ? (
                plData.expenseAccounts.map((exp) => (
                  <div key={exp.id} className="py-2 flex justify-between">
                    <span className="font-medium text-zinc-800">
                      {exp.code} &bull; {exp.name}
                    </span>
                    <span className="font-mono font-bold text-rose-700">₹{exp.amount}</span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-zinc-400 italic">No expenses posted.</p>
              )}
            </div>
            <div className="pt-3 border-t-2 border-zinc-200 flex justify-between font-bold text-xs">
              <span>Total Expenses:</span>
              <span className="font-mono text-sm text-rose-800">₹{plData?.totalExpense || '0.00'}</span>
            </div>
          </div>

          {/* Net Surplus Card */}
          <div className="lg:col-span-2 p-5 bg-zinc-900 text-white rounded-xl shadow-md flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Net Operating Surplus / Deficit
              </span>
              <p className="text-2xl font-black font-mono mt-1 text-emerald-400">
                ₹{plData?.netSurplus || '0.00'}
              </p>
            </div>
            <span className="text-xs text-zinc-400 font-medium max-w-sm text-right">
              Authoritatively calculated as Total Operating Revenue minus Total Posted Expenses.
            </span>
          </div>
        </div>
      )}

      {/* Tab: Balance Sheet */}
      {activeTab === 'BALANCE_SHEET' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900">Asset Accounts</h3>
              <div className="divide-y divide-zinc-100 text-xs">
                {bsData?.assetAccounts && bsData.assetAccounts.length > 0 ? (
                  bsData.assetAccounts.map((a) => (
                    <div key={a.id} className="py-2 flex justify-between">
                      <span>
                        {a.code} &bull; {a.name}
                      </span>
                      <span className="font-mono font-bold text-blue-800">₹{a.amount}</span>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-zinc-400 italic">No asset accounts found.</p>
                )}
              </div>
              <div className="pt-3 border-t-2 border-zinc-200 flex justify-between font-black text-xs text-zinc-900">
                <span>TOTAL ASSETS:</span>
                <span className="font-mono text-sm text-blue-900">₹{bsData?.totalAssets || '0.00'}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-900">
                Liabilities & Equity
              </h3>
              <div className="divide-y divide-zinc-100 text-xs">
                {bsData?.liabilityAccounts?.map((l) => (
                  <div key={l.id} className="py-2 flex justify-between">
                    <span>
                      {l.code} &bull; {l.name}
                    </span>
                    <span className="font-mono font-bold text-amber-800">₹{l.amount}</span>
                  </div>
                ))}
                {bsData?.equityAccounts?.map((e) => (
                  <div key={e.id} className="py-2 flex justify-between">
                    <span>
                      {e.code} &bull; {e.name}
                    </span>
                    <span className="font-mono font-bold text-purple-800">₹{e.amount}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t-2 border-zinc-200 flex justify-between font-black text-xs text-zinc-900">
                <span>TOTAL LIABILITIES & EQUITY:</span>
                <span className="font-mono text-sm text-amber-900">
                  ₹{bsData?.totalLiabilitiesAndEquity || '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Receivable Aging */}
      {activeTab === 'AGING' && (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden space-y-4">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-mehndi-600" />
              <span>Receivable Outstanding Aging Schedule</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4 text-right">Current (₹)</th>
                  <th className="py-3 px-4 text-right">1-30 Days</th>
                  <th className="py-3 px-4 text-right">31-60 Days</th>
                  <th className="py-3 px-4 text-right">61-90 Days</th>
                  <th className="py-3 px-4 text-right">90+ Days</th>
                  <th className="py-3 px-4 text-right">Total Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono">
                {agingData?.students && agingData.students.length > 0 ? (
                  agingData.students.map((stu) => (
                    <tr key={stu.studentId} className="hover:bg-zinc-50">
                      <td className="py-2.5 px-4 font-sans font-medium text-zinc-800">
                        {stu.studentName}
                        <span className="block text-[10px] text-zinc-400 font-mono">
                          {stu.admissionNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-zinc-600">{stu.className}</td>
                      <td className="py-2.5 px-4 text-right font-medium">₹{stu.current}</td>
                      <td className="py-2.5 px-4 text-right text-amber-700">₹{stu.days30}</td>
                      <td className="py-2.5 px-4 text-right text-orange-700">₹{stu.days60}</td>
                      <td className="py-2.5 px-4 text-right text-rose-600 font-bold">₹{stu.days90}</td>
                      <td className="py-2.5 px-4 text-right text-rose-800 font-black">
                        ₹{stu.days90Plus}
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-zinc-900 font-sans">
                        ₹{stu.total}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-400 font-sans">
                      No overdue or outstanding receivables found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default FinancialReportsView;
