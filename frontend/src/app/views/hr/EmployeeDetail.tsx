import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { HrNav } from './HrNav';
import {
  useEmployee,
  useEmployeeLeaveBalances,
  useLeaveBalanceHistory,
  useSetEmployeeBankAccount,
} from '../../../lib/api/hr';
import {
  useSalaryStructures,
  useAssignSalaryStructure,
} from '../../../lib/api/payroll';

export const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'profile' | 'salary' | 'leaves' | 'banking'>('profile');

  const { data: employee, isLoading, error } = useEmployee(id || '');
  const { data: leaveBalances } = useEmployeeLeaveBalances(id || '');
  const { data: leaveHistory } = useLeaveBalanceHistory(id || '');
  const { data: structures } = useSalaryStructures();

  // Salary assignment modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState('');
  const [assignError, setAssignError] = useState('');

  // Bank modal
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [bankError, setBankError] = useState('');

  const assignMutation = useAssignSalaryStructure();
  const setBankMutation = useSetEmployeeBankAccount(id || '');

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

  if (error || !employee) {
    return (
      <div className="space-y-6">
        <HrNav />
        <div className="px-6">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm font-medium">Employee record not found.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleAssignSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError('');
    if (!selectedStructureId || !baseSalary || !effectiveFrom) {
      setAssignError('Structure, calculation basis salary, and effective date are required.');
      return;
    }
    try {
      await assignMutation.mutateAsync({
        employeeId: employee.id,
        salaryStructureId: selectedStructureId,
        baseSalary: Number(baseSalary),
        effectiveFrom,
        effectiveTo: effectiveTo || null,
      });
      setIsAssignModalOpen(false);
      setBaseSalary('');
    } catch (err: any) {
      setAssignError(err.response?.data?.message || err.message || 'Failed to assign salary structure');
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError('');
    if (!bankName || !accountNumber || !ifscCode) {
      setBankError('Bank name, account number, and IFSC code are required.');
      return;
    }
    try {
      await setBankMutation.mutateAsync({
        accountHolderName: employee.displayName,
        bankName,
        branchName: branchName || undefined,
        accountNumber,
        ifscCode,
        accountType: 'SAVINGS',
        isPrimary: true,
      });
      setIsBankModalOpen(false);
      setAccountNumber('');
      setBankName('');
      setIfscCode('');
    } catch (err: any) {
      setBankError(err.response?.data?.message || err.message || 'Failed to save bank account');
    }
  };

  return (
    <div className="space-y-6">
      <HrNav />

      <div className="px-6 space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex items-center gap-4">
          <Link
            to="/hr/employees"
            className="p-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                {employee.displayName}
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-zinc-100 font-bold text-zinc-700">
                {employee.employeeNumber}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  employee.employmentStatus === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {employee.employmentStatus}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {employee.designation?.name || 'Unassigned'} • {employee.department?.name || 'General Department'}
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-mehndi-600 text-mehndi-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Profile & Employment
          </button>
          <button
            onClick={() => setActiveTab('salary')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'salary'
                ? 'border-mehndi-600 text-mehndi-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Salary Assignment
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'leaves'
                ? 'border-mehndi-600 text-mehndi-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Leave Balances
          </button>
          <button
            onClick={() => setActiveTab('banking')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'banking'
                ? 'border-mehndi-600 text-mehndi-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Bank & Payouts
          </button>
        </div>

        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-black text-zinc-900">Personal & Contact Info</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">First Name</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">{employee.firstName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">Last Name</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">{employee.lastName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">Gender</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">{employee.gender}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">Contact Number</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">{employee.contactNumber || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">Emergency Contact</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">{employee.emergencyContact || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">Address</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">{employee.address || '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-black text-zinc-900">Employment Details</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">Department</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">{employee.department?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">Designation</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">{employee.designation?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">Employment Type</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">{employee.employmentType}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">Joining Date</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">
                    {new Date(employee.joiningDate).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">Notice Period</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">{employee.noticePeriodDays} Days</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400">Confirmation Date</dt>
                  <dd className="font-bold text-zinc-900 mt-0.5">
                    {employee.confirmationDate
                      ? new Date(employee.confirmationDate).toLocaleDateString()
                      : 'Under Probation'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Tab 2: Salary Assignment */}
        {activeTab === 'salary' && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-zinc-900">Assigned Salary Structures</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Base salary acts as calculation basis only and is not double-counted into gross.
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Structure</span>
              </button>
            </div>

            {employee.salaryAssignments && employee.salaryAssignments.length > 0 ? (
              <div className="space-y-4">
                {employee.salaryAssignments.map((sa: any) => (
                  <div
                    key={sa.id}
                    className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-bold text-zinc-900 text-sm">
                        {sa.salaryStructure?.name || 'Custom Structure'}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Effective: {new Date(sa.effectiveFrom).toLocaleDateString()} →{' '}
                        {sa.effectiveTo ? new Date(sa.effectiveTo).toLocaleDateString() : 'Present (Current Active)'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500 font-semibold">Calculation Basis</div>
                      <div className="text-base font-black text-zinc-900">
                        ₹{Number(sa.baseSalary).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-400 text-sm">
                No salary structure assigned yet. Assign one to enable payroll calculation.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Leaves */}
        {activeTab === 'leaves' && (
          <div className="space-y-6">
            {/* Balances grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {leaveBalances?.map((bal) => (
                <div key={bal.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                  <div className="text-xs font-bold text-zinc-700">{bal.leaveType?.name}</div>
                  <div className="text-2xl font-black text-mehndi-700 mt-2">
                    {Number(bal.closingBalance)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
                    <span>Allocated: {Number(bal.allocatedDays)}</span>
                    <span>Used: {Number(bal.usedDays)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* History ledger */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-black text-zinc-900">Leave Balance Ledger History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-zinc-400 text-xs font-semibold uppercase">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Action</th>
                      <th className="pb-3">Days</th>
                      <th className="pb-3">Closing Balance</th>
                      <th className="pb-3">Source Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 text-xs font-medium">
                    {leaveHistory?.map((tx) => (
                      <tr key={tx.id}>
                        <td className="py-2.5 text-zinc-500">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 text-zinc-900">{tx.leaveType?.name}</td>
                        <td className="py-2.5 font-bold">{tx.transactionType}</td>
                        <td
                          className={`py-2.5 font-black ${
                            Number(tx.days) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {Number(tx.days) >= 0 ? `+${Number(tx.days)}` : Number(tx.days)}
                        </td>
                        <td className="py-2.5 font-bold text-zinc-900">{Number(tx.balanceAfter)}</td>
                        <td className="py-2.5 font-mono text-[11px] text-zinc-400">{tx.sourceType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Banking */}
        {activeTab === 'banking' && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-zinc-900">Disbursement Bank Accounts</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Bank accounts are encrypted at rest using AES-GCM and masked on all reads.
                </p>
              </div>
              <button
                onClick={() => setIsBankModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bank Account</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employee.bankAccounts?.map((bank) => (
                <div
                  key={bank.id}
                  className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 flex items-start justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900">{bank.bankName}</span>
                      {bank.isPrimary && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm font-black text-zinc-800 tracking-wider">
                      {bank.maskedAccountNumber}
                    </div>
                    <div className="text-xs text-zinc-500">
                      IFSC: {bank.ifscCode} • {bank.branchName || 'Main Branch'}
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Salary Assignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <h2 className="text-base font-bold text-zinc-900">Assign Salary Structure</h2>
            {assignError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                {assignError}
              </div>
            )}
            <form onSubmit={handleAssignSalary} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Structure</label>
                <select
                  required
                  value={selectedStructureId}
                  onChange={(e) => setSelectedStructureId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                >
                  <option value="">Select Structure</option>
                  {structures?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Base Salary (Calculation Basis)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 30000"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Effective From</label>
                  <input
                    type="date"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Effective To</label>
                  <input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className="px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-xl"
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <h2 className="text-base font-bold text-zinc-900">Add Bank Account</h2>
            {bankError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                {bankError}
              </div>
            )}
            <form onSubmit={handleSaveBank} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Account Number</label>
                <input
                  type="password"
                  required
                  placeholder="Encrypted at rest"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    placeholder="SBIN0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="MG Road Branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={setBankMutation.isPending}
                  className="px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-xl"
                >
                  {setBankMutation.isPending ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
