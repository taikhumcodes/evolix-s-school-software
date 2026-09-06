import React, { useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  RotateCcw,
  Plus,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { HrNav } from './HrNav';
import {
  usePayrollPeriods,
  useCreatePayrollPeriod,
  usePayrollRuns,
  usePayrollRun,
  useCreatePayrollRun,
  useCalculatePayrollRun,
  useUpdatePayrollRunStatus,
  usePostPayrollRun,
  useReversePayrollRun,
  useDisbursePayrollPayment,
} from '../../../lib/api/payroll';
import { useAccounts } from '../../../lib/api/finance';

export const PayrollTerminal: React.FC = () => {
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');

  // Modals state
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);

  // Period form
  const [periodName, setPeriodName] = useState('');
  const [periodNumber, setPeriodNumber] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [payDate, setPayDate] = useState('');
  const [periodError, setPeriodError] = useState('');

  // Run form
  const [runType, setRunType] = useState<'REGULAR' | 'ADJUSTMENT' | 'OFF_CYCLE'>('REGULAR');
  const [runRemarks, setRunRemarks] = useState('');
  const [runError, setRunError] = useState('');

  // Disburse form
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [disburseError, setDisburseError] = useState('');

  // Reversal form
  const [reversalReason, setReversalReason] = useState('');
  const [reverseError, setReverseError] = useState('');

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const { data: periods } = usePayrollPeriods();
  const { data: runs } = usePayrollRuns({
    periodId: selectedPeriodId || undefined,
  });
  const { data: currentRun } = usePayrollRun(selectedRunId);
  const { data: assetAccounts } = useAccounts('ASSET');

  const createPeriodMutation = useCreatePayrollPeriod();
  const createRunMutation = useCreatePayrollRun();
  const calculateMutation = useCalculatePayrollRun(selectedRunId);
  const updateStatusMutation = useUpdatePayrollRunStatus(selectedRunId);
  const postMutation = usePostPayrollRun(selectedRunId);
  const reverseMutation = useReversePayrollRun(selectedRunId);
  const disburseMutation = useDisbursePayrollPayment(selectedRunId);

  // Auto-select first period & run
  React.useEffect(() => {
    if (periods && periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  React.useEffect(() => {
    if (runs && runs.length > 0 && !selectedRunId) {
      setSelectedRunId(runs[0].id);
    }
  }, [runs, selectedRunId]);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setPeriodError('');
    if (!periodName || !startDate || !endDate || !payDate) {
      setPeriodError('All period dates and name are required.');
      return;
    }
    try {
      const res = await createPeriodMutation.mutateAsync({
        financialYearId: '00000000-0000-0000-0000-000000000000', // Auto resolved on backend
        periodName,
        periodNumber: Number(periodNumber),
        startDate,
        endDate,
        payDate,
      });
      setIsPeriodModalOpen(false);
      setSelectedPeriodId(res.id);
    } catch (err: any) {
      setPeriodError(err.response?.data?.message || err.message || 'Failed to create period');
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunError('');
    if (!selectedPeriodId) {
      setRunError('Please select a payroll period first.');
      return;
    }
    try {
      const res = await createRunMutation.mutateAsync({
        periodId: selectedPeriodId,
        runType,
        remarks: runRemarks || undefined,
      });
      setIsRunModalOpen(false);
      setSelectedRunId(res.id);
      setRunRemarks('');
    } catch (err: any) {
      setRunError(err.response?.data?.message || err.message || 'Failed to create run');
    }
  };

  const handleCalculate = async () => {
    setActionError('');
    setActionSuccess('');
    try {
      await calculateMutation.mutateAsync();
      setActionSuccess('Payroll calculation completed successfully.');
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Calculation failed');
    }
  };

  const handleApprove = async () => {
    if (!currentRun) return;
    setActionError('');
    setActionSuccess('');
    try {
      await updateStatusMutation.mutateAsync({
        status: 'APPROVED',
        version: currentRun.version,
        remarks: 'Approved for posting',
      });
      setActionSuccess('Payroll run approved. Ready to post to General Ledger.');
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Approval failed');
    }
  };

  const handlePostToGl = async () => {
    if (!currentRun) return;
    setActionError('');
    setActionSuccess('');
    try {
      await postMutation.mutateAsync({
        version: currentRun.version,
        remarks: 'Posting payroll to general ledger',
      });
      setActionSuccess('Payroll posted to General Ledger. Journal Entry created.');
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'GL Posting failed');
    }
  };

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRun) return;
    setDisburseError('');
    if (!paymentAccountId) {
      setDisburseError('Please select a disbursement bank/cash account.');
      return;
    }

    const allocations = (currentRun.employees || [])
      .filter((e) => Number(e.remainingPayable) > 0)
      .map((e) => ({
        employeeId: e.employeeId,
        amount: Number(e.remainingPayable),
      }));

    if (allocations.length === 0) {
      setDisburseError('No remaining payable balances to disburse.');
      return;
    }

    try {
      await disburseMutation.mutateAsync({
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMode,
        paymentAccountId,
        allocations,
        remarks: `Settlement for ${currentRun.runNumber}`,
      });
      setIsDisburseModalOpen(false);
      setActionSuccess('Disbursement payments settled atomicaly.');
    } catch (err: any) {
      setDisburseError(err.response?.data?.message || err.message || 'Disbursement failed');
    }
  };

  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRun) return;
    setReverseError('');
    if (!reversalReason) {
      setReverseError('Reversal reason is mandatory.');
      return;
    }
    try {
      await reverseMutation.mutateAsync({
        version: currentRun.version,
        reversalReason,
      });
      setIsReverseModalOpen(false);
      setActionSuccess('Payroll run successfully reversed. Reversal journal created.');
    } catch (err: any) {
      setReverseError(err.response?.data?.message || err.message || 'Reversal failed');
    }
  };

  return (
    <div className="space-y-6">
      <HrNav />

      <div className="px-6 space-y-6">
        {/* Header & Period Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Payroll Processing Terminal
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              End-to-end payroll workflow: calculate attendance & proration, review snapshots, post to GL, and settle atomic payments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedPeriodId}
              onChange={(e) => {
                setSelectedPeriodId(e.target.value);
                setSelectedRunId('');
              }}
              className="px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-800 shadow-sm"
            >
              <option value="">Select Period</option>
              {periods?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.periodName} ({new Date(p.startDate).toLocaleDateString()} -{' '}
                  {new Date(p.endDate).toLocaleDateString()})
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded-xl shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Period</span>
            </button>

            <button
              onClick={() => setIsRunModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-mehndi-500/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Initiate Run</span>
            </button>
          </div>
        </div>

        {/* Global Action Messages */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Run Selector Tabs */}
        {runs && runs.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {runs.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRunId(r.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  selectedRunId === r.id
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <span>{r.runNumber}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    r.status === 'PAID'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : r.status === 'POSTED'
                      ? 'bg-blue-500/20 text-blue-300'
                      : r.status === 'REVERSED'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {r.status}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Active Run Terminal Card */}
        {currentRun ? (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden space-y-6 p-6">
            {/* Run Lifecycle Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-100">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-zinc-900">{currentRun.runNumber}</h2>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      currentRun.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentRun.status === 'POSTED'
                        ? 'bg-blue-100 text-blue-800'
                        : currentRun.status === 'APPROVED'
                        ? 'bg-amber-100 text-amber-800'
                        : currentRun.status === 'REVERSED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    Status: {currentRun.status}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">v{currentRun.version}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Period: {currentRun.period?.periodName} • Pay Date:{' '}
                  {new Date(currentRun.period?.payDate).toLocaleDateString()}
                </p>
              </div>

              {/* Action Buttons based on state */}
              <div className="flex flex-wrap items-center gap-2">
                {['DRAFT', 'PROCESSING', 'REVIEWED'].includes(currentRun.status) && (
                  <>
                    <button
                      onClick={handleCalculate}
                      disabled={calculateMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{calculateMutation.isPending ? 'Calculating...' : 'Recalculate'}</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={updateStatusMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Payroll</span>
                    </button>
                  </>
                )}

                {currentRun.status === 'APPROVED' && (
                  <button
                    onClick={handlePostToGl}
                    disabled={postMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{postMutation.isPending ? 'Posting...' : 'Post to General Ledger'}</span>
                  </button>
                )}

                {currentRun.status === 'POSTED' && (
                  <>
                    <button
                      onClick={() => setIsDisburseModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Disburse Payouts</span>
                    </button>
                    <button
                      onClick={() => setIsReverseModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reverse Run</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Run Totals Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div>
                <span className="text-xs font-semibold text-zinc-400">Total Staff</span>
                <div className="text-xl font-black text-zinc-900 mt-0.5">
                  {currentRun.employeeCount}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-zinc-400">Gross Earnings</span>
                <div className="text-xl font-black text-zinc-900 mt-0.5">
                  ₹{Number(currentRun.totalGross).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-zinc-400">Total Deductions</span>
                <div className="text-xl font-black text-rose-600 mt-0.5">
                  ₹{Number(currentRun.totalDeductions).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-zinc-400">Net Payable</span>
                <div className="text-xl font-black text-mehndi-700 mt-0.5">
                  ₹{Number(currentRun.totalNetPay).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Employee Register Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-900">
                Staff Payroll Register ({currentRun.employees?.length || 0})
              </h3>
              <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/70 text-zinc-500 font-semibold uppercase">
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Working Days</th>
                      <th className="px-4 py-3">LOP Days</th>
                      <th className="px-4 py-3">Gross Earnings</th>
                      <th className="px-4 py-3">Deductions</th>
                      <th className="px-4 py-3">Employer PF</th>
                      <th className="px-4 py-3">Net Pay</th>
                      <th className="px-4 py-3">Paid / Remaining</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {currentRun.employees?.map((emp) => (
                      <tr key={emp.id} className="hover:bg-zinc-50/60">
                        <td className="px-4 py-3 font-bold text-zinc-900">
                          {emp.employee?.displayName}
                          <span className="block font-mono text-[10px] font-normal text-zinc-400">
                            {emp.employee?.employeeNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-600">{Number(emp.workingDays)}</td>
                        <td className="px-4 py-3">
                          {Number(emp.lossOfPayDays) > 0 ? (
                            <span className="font-bold text-rose-600">{Number(emp.lossOfPayDays)}</span>
                          ) : (
                            <span className="text-zinc-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-zinc-900">
                          ₹{Number(emp.grossEarnings).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-rose-600">
                          ₹{Number(emp.totalDeductions).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-blue-600">
                          ₹{Number(emp.employerContributions).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-black text-mehndi-700">
                          ₹{Number(emp.netPay).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-[11px]">
                            ₹{Number(emp.paidAmount).toLocaleString('en-IN')} /{' '}
                            <span className="font-bold text-zinc-800">
                              ₹{Number(emp.remainingPayable).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              emp.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : emp.paymentStatus === 'PARTIALLY_PAID'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {emp.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-zinc-400 text-sm">
            <Calculator className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
            No payroll run selected. Select a cycle or click "Initiate Run" to begin.
          </div>
        )}
      </div>

      {/* New Period Modal */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">Create Payroll Period</h2>
              <button onClick={() => setIsPeriodModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {periodError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                {periodError}
              </div>
            )}
            <form onSubmit={handleCreatePeriod} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Period Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. September 2026"
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Period #</label>
                  <input
                    type="number"
                    value={periodNumber}
                    onChange={(e) => setPeriodNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPeriodMutation.isPending}
                  className="px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-xl"
                >
                  {createPeriodMutation.isPending ? 'Creating...' : 'Create Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Run Modal */}
      {isRunModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">Initiate Payroll Run</h2>
              <button onClick={() => setIsRunModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {runError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                {runError}
              </div>
            )}
            <form onSubmit={handleCreateRun} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Run Type</label>
                <select
                  value={runType}
                  onChange={(e) => setRunType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                >
                  <option value="REGULAR">Regular Monthly Payroll</option>
                  <option value="ADJUSTMENT">Salary Adjustment</option>
                  <option value="OFF_CYCLE">Off-Cycle Settlement</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Optional operational remarks"
                  value={runRemarks}
                  onChange={(e) => setRunRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsRunModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRunMutation.isPending}
                  className="px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-xl"
                >
                  {createRunMutation.isPending ? 'Initiating...' : 'Start Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disburse Modal */}
      {isDisburseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">Disburse Salary Payments</h2>
              <button onClick={() => setIsDisburseModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {disburseError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                {disburseError}
              </div>
            )}
            <form onSubmit={handleDisburse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Disbursement Account *</label>
                <select
                  required
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                >
                  <option value="">Select Bank/Cash Account</option>
                  {assetAccounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                >
                  <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                <span className="font-bold block">Atomic Settlement Protection:</span>
                <p>
                  Balances are checked with row-level locks. The run becomes <strong>PAID</strong> only when all employee balances settle to zero.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disburseMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  {disburseMutation.isPending ? 'Processing...' : 'Confirm Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Modal */}
      {isReverseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-rose-700">Reverse Payroll Run</h2>
              <button onClick={() => setIsReverseModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {reverseError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                {reverseError}
              </div>
            )}
            <form onSubmit={handleReverse} className="space-y-3">
              <p className="text-xs text-zinc-600">
                This will create a balanced reversal journal entry in Module 07 and mark this run permanently <strong>REVERSED</strong>. It cannot be reopened.
              </p>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Reversal Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this posted payroll is being reversed..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsReverseModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reverseMutation.isPending}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
                >
                  {reverseMutation.isPending ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
