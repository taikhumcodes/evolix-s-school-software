import React, { useState } from 'react';
import {
  Printer,
  AlertCircle,
} from 'lucide-react';
import { HrNav } from './HrNav';
import { usePayrollRuns, usePayrollRun, usePayslip } from '../../../lib/api/payroll';

export const PayslipsView: React.FC = () => {
  const [selectedRunId, setSelectedRunId] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');

  const { data: runs } = usePayrollRuns();
  // Only posted or paid runs can show payslips (Amendment 24)
  const eligibleRuns = runs?.filter((r) => ['POSTED', 'PAID', 'CLOSED'].includes(r.status)) || [];

  const { data: currentRun } = usePayrollRun(selectedRunId);

  // Auto-select first eligible run & employee
  React.useEffect(() => {
    if (eligibleRuns.length > 0 && !selectedRunId) {
      setSelectedRunId(eligibleRuns[0].id);
    }
  }, [eligibleRuns, selectedRunId]);

  React.useEffect(() => {
    if (currentRun?.employees && currentRun.employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(currentRun.employees[0].employeeId);
    }
  }, [currentRun, selectedEmpId]);

  const { data: payslip, isLoading, error } = usePayslip(selectedEmpId, selectedRunId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <HrNav />
      </div>

      <div className="px-6 space-y-6">
        {/* Controls Bar */}
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Payslip Generation & Audit
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Compliant employee salary slips. Only finalized (POSTED or PAID) payroll runs are eligible.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedRunId}
              onChange={(e) => {
                setSelectedRunId(e.target.value);
                setSelectedEmpId('');
              }}
              className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-800 shadow-sm"
            >
              <option value="">Select Finalized Cycle</option>
              {eligibleRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.runNumber} ({r.period?.periodName}) - {r.status}
                </option>
              ))}
            </select>

            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-800 shadow-sm"
            >
              <option value="">Select Employee</option>
              {currentRun?.employees?.map((e) => (
                <option key={e.employeeId} value={e.employeeId}>
                  {e.employee?.displayName} ({e.employee?.employeeNumber})
                </option>
              ))}
            </select>

            <button
              onClick={handlePrint}
              disabled={!payslip}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>

        {/* Payslip Document */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-mehndi-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error || !payslip ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-zinc-400 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            No payslip available. Please select a posted or paid payroll cycle and staff member.
          </div>
        ) : (
          <div className="max-w-4xl mx-auto bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6">
            {/* Header / Brand */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-mehndi-600 to-mehndi-700 flex items-center justify-center text-white font-extrabold text-2xl">
                  E
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 tracking-tight">EVOLIX SCHOOL ERP</h2>
                  <p className="text-xs text-zinc-500 font-medium">Official Employee Salary Slip</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800">
                  {payslip.runNumber}
                </span>
                <div className="text-xs text-zinc-500 mt-1">Period: {payslip.periodName}</div>
                <div className="text-[11px] text-zinc-400">
                  Pay Date: {new Date(payslip.payDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Staff & Attendance Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-xs">
              <div>
                <span className="text-zinc-400 font-semibold block">Employee Name</span>
                <span className="font-bold text-zinc-900 text-sm block mt-0.5">
                  {payslip.employee?.displayName}
                </span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {payslip.employee?.employeeNumber}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 font-semibold block">Department & Role</span>
                <span className="font-bold text-zinc-900 block mt-0.5">
                  {payslip.employee?.designation || 'Staff'}
                </span>
                <span className="text-zinc-500">{payslip.employee?.department || 'General'}</span>
              </div>
              <div>
                <span className="text-zinc-400 font-semibold block">Attendance Record</span>
                <span className="font-bold text-zinc-900 block mt-0.5">
                  Working Days: {Number(payslip.attendance?.workingDays)}
                </span>
                <span className="text-rose-600 font-semibold">
                  LOP Deductions: {Number(payslip.attendance?.lossOfPayDays)}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 font-semibold block">Disbursement Bank</span>
                <span className="font-mono font-bold text-zinc-900 block mt-0.5">
                  {payslip.bankAccount?.maskedAccountNumber || 'No Bank Attached'}
                </span>
                <span className="text-zinc-500">
                  {payslip.bankAccount?.bankName || 'Direct Settlement'}
                </span>
              </div>
            </div>

            {/* Earnings & Deductions Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Earnings */}
              <div className="border border-zinc-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                    Earnings
                  </h3>
                  <span className="text-xs font-bold text-emerald-700">Amount (₹)</span>
                </div>
                <div className="space-y-2 text-xs">
                  {payslip.earnings?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span className="text-zinc-700 font-medium">{item.componentName}</span>
                      <span className="font-mono font-bold text-zinc-900">
                        ₹{Number(item.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-zinc-200 flex items-center justify-between font-bold text-xs">
                  <span>Gross Earnings</span>
                  <span className="font-mono text-sm text-zinc-900">
                    ₹{Number(payslip.grossEarnings).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-zinc-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                    Deductions
                  </h3>
                  <span className="text-xs font-bold text-rose-700">Amount (₹)</span>
                </div>
                <div className="space-y-2 text-xs">
                  {payslip.deductions?.length === 0 ? (
                    <div className="text-zinc-400 italic">No deductions applied</div>
                  ) : (
                    payslip.deductions?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-zinc-700 font-medium">{item.componentName}</span>
                        <span className="font-mono font-bold text-rose-600">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="pt-3 border-t border-zinc-200 flex items-center justify-between font-bold text-xs">
                  <span>Total Deductions</span>
                  <span className="font-mono text-sm text-rose-600">
                    ₹{Number(payslip.totalDeductions).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Pay Hero Box */}
            <div className="p-6 rounded-2xl bg-zinc-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Net Salary Payable
                </span>
                <div className="text-3xl font-black text-white mt-1">
                  ₹{Number(payslip.netPay).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-zinc-400 block">Settlement Status</span>
                <span
                  className={`inline-block mt-1 text-xs font-black px-3 py-1 rounded-full ${
                    payslip.paymentStatus === 'PAID'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {payslip.paymentStatus}
                </span>
              </div>
            </div>

            {/* Institutional Contributions Note (Does not reduce net pay) */}
            {payslip.employerContributions && payslip.employerContributions.length > 0 && (
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 text-xs space-y-2">
                <div className="font-bold text-zinc-800">
                  Institutional / Employer Contributions (Not Deducted From Net Pay):
                </div>
                <div className="flex flex-wrap gap-4 text-zinc-600">
                  {payslip.employerContributions.map((ec: any) => (
                    <div key={ec.id}>
                      {ec.componentName}:{' '}
                      <span className="font-mono font-bold text-zinc-900">
                        ₹{Number(ec.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-6 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>This is a computer-generated payslip. No signature required.</span>
              <span className="font-mono">Security Encrypted & Verified</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
