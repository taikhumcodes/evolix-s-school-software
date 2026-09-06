import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { HrNav } from './HrNav';
import { usePayrollConfig, useUpdatePayrollConfig } from '../../../lib/api/payroll';
import { useAccounts } from '../../../lib/api/finance';

export const HrSettings: React.FC = () => {
  const { data: config } = usePayrollConfig();
  const { data: liabilityAccounts } = useAccounts('LIABILITY');
  const { data: expenseAccounts } = useAccounts('EXPENSE');

  const [payrollFrequency, setPayrollFrequency] = useState('MONTHLY');
  const [prorationBasis, setProrationBasis] = useState('CALENDAR_DAYS');
  const [payrollPayableAccountId, setPayrollPayableAccountId] = useState('');
  const [salaryExpenseClearingAccountId, setSalaryExpenseClearingAccountId] = useState('');
  const [autoPostToFinance, setAutoPostToFinance] = useState(false);
  const [payslipVisibilityState, setPayslipVisibilityState] = useState('POSTED');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const updateMutation = useUpdatePayrollConfig();

  useEffect(() => {
    if (config) {
      setPayrollFrequency(config.payrollFrequency || 'MONTHLY');
      setProrationBasis(config.salaryProrationBasis || 'CALENDAR_DAYS');
      setPayrollPayableAccountId(config.payrollPayableAccountId || '');
      setSalaryExpenseClearingAccountId(config.salaryExpenseClearingAccountId || '');
      setAutoPostToFinance(config.autoPostToFinance ?? false);
      setPayslipVisibilityState(config.payslipVisibilityState || 'POSTED');
    }
  }, [config]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await updateMutation.mutateAsync({
        payrollFrequency,
        salaryProrationBasis: prorationBasis,
        payrollPayableAccountId: payrollPayableAccountId || null,
        salaryExpenseClearingAccountId: salaryExpenseClearingAccountId || null,
        autoPostToFinance,
        payslipVisibilityState,
      });
      setMessage('HR and General Ledger payroll settings saved successfully.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update settings');
    }
  };

  return (
    <div className="space-y-6">
      <HrNav />

      <div className="px-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            Payroll & General Ledger Rules
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure proration formula, clearing accounts, and General Ledger integration points.
          </p>
        </div>

        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-4">
            <h2 className="text-base font-black text-zinc-900">Calculation & Proration Rules</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Salary Proration Basis
                </label>
                <select
                  value={prorationBasis}
                  onChange={(e) => setProrationBasis(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                >
                  <option value="CALENDAR_DAYS">Actual Calendar Days (Standard)</option>
                  <option value="WORKING_DAYS">Actual Working Days (Excluding Weekends/Holidays)</option>
                  <option value="FIXED_30_DAYS">Fixed 30-Day Basis</option>
                </select>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Controls daily rate calculation for mid-period revisions and loss-of-pay deductions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Payroll Cycle Frequency
                </label>
                <select
                  value={payrollFrequency}
                  onChange={(e) => setPayrollFrequency(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="BI_WEEKLY">Bi-Weekly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 space-y-4">
            <h2 className="text-base font-black text-zinc-900">Module 07 Financial Account Mapping</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Default Payroll Payable Account (Liability)
                </label>
                <select
                  value={payrollPayableAccountId}
                  onChange={(e) => setPayrollPayableAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                >
                  <option value="">Select Liability Account</option>
                  {liabilityAccounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Default Salary Expense Account (Expense)
                </label>
                <select
                  value={salaryExpenseClearingAccountId}
                  onChange={(e) => setSalaryExpenseClearingAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                >
                  <option value="">Select Expense Account</option>
                  {expenseAccounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 space-y-4">
            <h2 className="text-base font-black text-zinc-900">Visibility & Self-Service</h2>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Payslip Visibility Boundary
              </label>
              <select
                value={payslipVisibilityState}
                onChange={(e) => setPayslipVisibilityState(e.target.value)}
                className="w-full sm:w-1/2 px-3 py-2 border border-zinc-200 rounded-xl text-sm"
              >
                <option value="POSTED">Visible After GL Posting (Standard)</option>
                <option value="PAID">Visible Only After Disbursement Settlement</option>
              </select>
              <p className="text-[11px] text-zinc-400 mt-1">
                Ensures staff cannot view draft or reviewed payroll before official finalization.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-mehndi-600 hover:bg-mehndi-700 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{updateMutation.isPending ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
