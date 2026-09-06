import React, { useState } from 'react';
import {
  Plus,
  X,
  Users,
} from 'lucide-react';
import { HrNav } from './HrNav';
import {
  useStaffLeaveTypes,
  useCreateStaffLeaveType,
  useEmployees,
  useAllocateLeave,
} from '../../../lib/api/hr';

export const LeaveManagement: React.FC = () => {
  const { data: leaveTypes } = useStaffLeaveTypes();
  const { data: employeesData } = useEmployees();

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);

  // Type form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [annualQuota, setAnnualQuota] = useState('12');
  const [carryForwardMax, setCarryForwardMax] = useState('0');
  const [isUnpaid, setIsUnpaid] = useState(false);
  const [isEncashable, setIsEncashable] = useState(false);
  const [typeError, setTypeError] = useState('');

  // Allocation form state
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [allocatedDays, setAllocatedDays] = useState('12');
  const [entitlementPeriod, setEntitlementPeriod] = useState('2026');
  const [allocError, setAllocError] = useState('');

  const createTypeMutation = useCreateStaffLeaveType();
  const allocateMutation = useAllocateLeave();

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeError('');
    if (!name || !code) {
      setTypeError('Name and unique code are required.');
      return;
    }
    try {
      await createTypeMutation.mutateAsync({
        name,
        code: code.toUpperCase().trim(),
        annualQuota: Number(annualQuota),
        carryForwardMax: Number(carryForwardMax),
        isUnpaid,
        isEncashable,
        requiresApproval: true,
      });
      setIsTypeModalOpen(false);
      setName('');
      setCode('');
    } catch (err: any) {
      setTypeError(err.response?.data?.message || err.message || 'Failed to create leave policy');
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocError('');
    if (!selectedEmpId || !selectedTypeId || !allocatedDays) {
      setAllocError('Employee, leave type, and allocated days are required.');
      return;
    }
    try {
      await allocateMutation.mutateAsync({
        employeeId: selectedEmpId,
        leaveTypeId: selectedTypeId,
        entitlementPeriod,
        allocatedDays: Number(allocatedDays),
      });
      setIsAllocModalOpen(false);
    } catch (err: any) {
      setAllocError(err.response?.data?.message || err.message || 'Failed to allocate leave');
    }
  };

  return (
    <div className="space-y-6">
      <HrNav />

      <div className="px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Leave Policies & Annual Quotas
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Configure paid/unpaid leave entitlements, carry forward limits, and allocate annual quotas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAllocModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-zinc-500" />
              <span>Allocate Quota</span>
            </button>
            <button
              onClick={() => setIsTypeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-mehndi-600 hover:bg-mehndi-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-mehndi-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Policy</span>
            </button>
          </div>
        </div>

        {/* Policies Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {leaveTypes?.map((lt) => (
            <div
              key={lt.id}
              className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                    {lt.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      lt.isUnpaid ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {lt.isUnpaid ? 'Unpaid / LOP' : 'Paid Leave'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-zinc-900 mt-3">{lt.name}</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {lt.description || 'Standard institutional leave policy'}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-400 font-semibold block">Annual Quota</span>
                  <span className="text-base font-black text-zinc-900">{lt.annualQuota} Days</span>
                </div>
                <div>
                  <span className="text-zinc-400 font-semibold block">Max Carry Forward</span>
                  <span className="text-base font-black text-zinc-900">{lt.carryForwardMax} Days</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Policy Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">Create Leave Policy</h2>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {typeError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                {typeError}
              </div>
            )}
            <form onSubmit={handleCreateType} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Policy Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Casual Leave"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Policy Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CL"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Annual Quota (Days)</label>
                  <input
                    type="number"
                    required
                    value={annualQuota}
                    onChange={(e) => setAnnualQuota(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Max Carry Forward</label>
                  <input
                    type="number"
                    required
                    value={carryForwardMax}
                    onChange={(e) => setCarryForwardMax(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={isUnpaid}
                    onChange={(e) => setIsUnpaid(e.target.checked)}
                    className="rounded text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span>Unpaid (Causes Loss-of-Pay)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={isEncashable}
                    onChange={(e) => setIsEncashable(e.target.checked)}
                    className="rounded text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span>Encashable</span>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTypeMutation.isPending}
                  className="px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-xl"
                >
                  {createTypeMutation.isPending ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Quota Modal */}
      {isAllocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">Allocate Annual Leave Quota</h2>
              <button onClick={() => setIsAllocModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {allocError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                {allocError}
              </div>
            )}
            <form onSubmit={handleAllocate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Employee *</label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                >
                  <option value="">Select Employee</option>
                  {employeesData?.data?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.displayName} ({emp.employeeNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Leave Policy *</label>
                <select
                  required
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                >
                  <option value="">Select Policy</option>
                  {leaveTypes?.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Allocated Days *</label>
                  <input
                    type="number"
                    required
                    value={allocatedDays}
                    onChange={(e) => setAllocatedDays(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Entitlement Year</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026 or AY-2026-27"
                    value={entitlementPeriod}
                    onChange={(e) => setEntitlementPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAllocModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocateMutation.isPending}
                  className="px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-xl"
                >
                  {allocateMutation.isPending ? 'Allocating...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
