import React, { useState } from 'react';
import {
  Plus,
  X,
  ShieldAlert,
} from 'lucide-react';
import { HrNav } from './HrNav';
import {
  useSalaryComponents,
  useCreateSalaryComponent,
  useSalaryStructures,
  useCreateSalaryStructure,
} from '../../../lib/api/payroll';
import { useAccounts } from '../../../lib/api/finance';

export const SalarySetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'components' | 'structures'>('components');

  const { data: components } = useSalaryComponents();
  const { data: structures } = useSalaryStructures();
  const { data: accounts } = useAccounts();

  // Create component modal state
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [compName, setCompName] = useState('');
  const [compCode, setCompCode] = useState('');
  const [compType, setCompType] = useState<'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION'>('EARNING');
  const [calcType, setCalcType] = useState<'FLAT' | 'PERCENTAGE_OF_COMPONENT'>('FLAT');
  const [dependsOnId, setDependsOnId] = useState('');
  const [percentageRate, setPercentageRate] = useState('');
  const [glAccountId, setGlAccountId] = useState('');
  const [isTaxable, setIsTaxable] = useState(true);
  const [isStatutory, setIsStatutory] = useState(false);
  const [affectsGross, setAffectsGross] = useState(true);
  const [compError, setCompError] = useState('');

  // Create structure modal state
  const [isStructModalOpen, setIsStructModalOpen] = useState(false);
  const [structName, setStructName] = useState('');
  const [structCode, setStructCode] = useState('');
  const [structDescription, setStructDescription] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<
    Array<{ componentId: string; flatAmount: number; displayOrder: number }>
  >([]);
  const [structError, setStructError] = useState('');

  const createCompMutation = useCreateSalaryComponent();
  const createStructMutation = useCreateSalaryStructure();

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompError('');
    if (!compName || !compCode || !glAccountId) {
      setCompError('Name, unique code, and General Ledger Account are required.');
      return;
    }
    if (calcType === 'PERCENTAGE_OF_COMPONENT' && !dependsOnId) {
      setCompError('Dependent salary component is required for percentage calculation.');
      return;
    }
    try {
      await createCompMutation.mutateAsync({
        name: compName,
        code: compCode.toUpperCase().trim(),
        type: compType,
        calculationType: calcType,
        dependsOnComponentId: dependsOnId || undefined,
        percentageRate: percentageRate ? Number(percentageRate) : undefined,
        glAccountId,
        isTaxable,
        isStatutory,
        affectsGross: compType === 'EARNING' ? affectsGross : false,
      });
      setIsCompModalOpen(false);
      setCompName('');
      setCompCode('');
      setGlAccountId('');
      setPercentageRate('');
    } catch (err: any) {
      setCompError(err.response?.data?.message || err.message || 'Failed to create component');
    }
  };

  const handleToggleComponentInStructure = (compId: string, defaultFlat: number = 0) => {
    const exists = selectedComponents.find((c) => c.componentId === compId);
    if (exists) {
      setSelectedComponents(selectedComponents.filter((c) => c.componentId !== compId));
    } else {
      setSelectedComponents([
        ...selectedComponents,
        { componentId: compId, flatAmount: defaultFlat, displayOrder: selectedComponents.length + 1 },
      ]);
    }
  };

  const handleUpdateComponentAmount = (compId: string, amount: number) => {
    setSelectedComponents(
      selectedComponents.map((c) => (c.componentId === compId ? { ...c, flatAmount: amount } : c))
    );
  };

  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setStructError('');
    if (!structName || !structCode || selectedComponents.length === 0) {
      setStructError('Structure name, code, and at least one component are required.');
      return;
    }
    try {
      await createStructMutation.mutateAsync({
        name: structName,
        code: structCode.toUpperCase().trim(),
        description: structDescription || undefined,
        components: selectedComponents.map((c) => ({
          componentId: c.componentId,
          calculationType: 'FLAT',
          flatAmount: c.flatAmount,
          displayOrder: c.displayOrder,
        })),
      });
      setIsStructModalOpen(false);
      setStructName('');
      setStructCode('');
      setSelectedComponents([]);
    } catch (err: any) {
      setStructError(err.response?.data?.message || err.message || 'Failed to create structure');
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
              Salary Components & Structures
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Topological cycle detection, authoritative GL account mappings, and automated gross earnings calculation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'components' ? (
              <button
                onClick={() => setIsCompModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-mehndi-600 hover:bg-mehndi-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-mehndi-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Component</span>
              </button>
            ) : (
              <button
                onClick={() => setIsStructModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-mehndi-600 hover:bg-mehndi-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-mehndi-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Structure</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-2 border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('components')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'components'
                ? 'border-mehndi-600 text-mehndi-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Components & GL Mapping
          </button>
          <button
            onClick={() => setActiveTab('structures')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'structures'
                ? 'border-mehndi-600 text-mehndi-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Salary Structures
          </button>
        </div>

        {/* Integrity Notice */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <span className="font-bold block">Payroll Rule & Cycle Protection Active:</span>
            <p>
              1. <strong>Gross Earnings</strong> is strictly the SUM of calculated EARNING line items. Base salary is a calculation basis only.
            </p>
            <p>
              2. <strong>Component Formula Cycles</strong> (e.g. A → B → A or self-reference A → A) are strictly blocked with <code>SALARY_COMPONENT_CYCLE</code> error.
            </p>
          </div>
        </div>

        {/* Tab 1: Components */}
        {activeTab === 'components' && (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-zinc-500 text-xs font-semibold uppercase">
                    <th className="px-6 py-3.5">Component</th>
                    <th className="px-6 py-3.5">Code</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Calculation</th>
                    <th className="px-6 py-3.5">GL Ledger Account</th>
                    <th className="px-6 py-3.5">Gross Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {components?.map((comp) => (
                    <tr key={comp.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-zinc-900">{comp.name}</td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-zinc-700">
                        {comp.code}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            comp.type === 'EARNING'
                              ? 'bg-emerald-100 text-emerald-800'
                              : comp.type === 'DEDUCTION'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {comp.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-600">
                        {comp.calculationType === 'PERCENTAGE_OF_COMPONENT'
                          ? `${comp.percentageRate}% of ${comp.dependsOnComponent?.name || 'Base'}`
                          : 'Flat Amount'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-mono font-bold text-zinc-800">
                          {comp.glAccount?.code || 'UNMAPPED'}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {comp.glAccount?.name || 'Missing GL Mapping'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {comp.type === 'EARNING' ? (
                          <span className="text-xs font-semibold text-emerald-700">Adds to Gross</span>
                        ) : comp.type === 'DEDUCTION' ? (
                          <span className="text-xs font-semibold text-rose-700">Reduces Net Pay</span>
                        ) : (
                          <span className="text-xs font-semibold text-blue-700">Institutional Expense</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Structures */}
        {activeTab === 'structures' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {structures?.map((struct) => (
              <div
                key={struct.id}
                className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-zinc-900">{struct.name}</h3>
                    <span className="font-mono text-xs text-zinc-500">{struct.code}</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Included Components ({struct.components?.length || 0})
                  </div>
                  <div className="divide-y divide-zinc-100 text-xs">
                    {struct.components?.map((c) => (
                      <div key={c.id} className="py-2 flex items-center justify-between">
                        <div className="font-medium text-zinc-800">
                          {c.salaryComponent?.name} ({c.salaryComponent?.type})
                        </div>
                        <div className="font-mono font-bold text-zinc-900">
                          {c.calculationType === 'PERCENTAGE_OF_COMPONENT'
                            ? `${c.percentageRate || c.salaryComponent?.percentageRate}% of ${
                                c.salaryComponent?.dependsOnComponent?.name || 'Basic'
                              }`
                            : `₹${Number(c.flatAmount || 0).toLocaleString('en-IN')}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Component Modal */}
      {isCompModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">Create Salary Component</h2>
              <button onClick={() => setIsCompModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {compError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                {compError}
              </div>
            )}
            <form onSubmit={handleCreateComponent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Component Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basic Salary"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BASIC"
                    value={compCode}
                    onChange={(e) => setCompCode(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Type *</label>
                  <select
                    value={compType}
                    onChange={(e) => setCompType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  >
                    <option value="EARNING">Earning (Adds to Gross)</option>
                    <option value="DEDUCTION">Deduction (Employee Liability)</option>
                    <option value="EMPLOYER_CONTRIBUTION">Employer Contribution (Expense & Liability)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Calculation Type *</label>
                  <select
                    value={calcType}
                    onChange={(e) => setCalcType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  >
                    <option value="FLAT">Flat Amount</option>
                    <option value="PERCENTAGE_OF_COMPONENT">Percentage of Another Component</option>
                  </select>
                </div>
              </div>

              {calcType === 'PERCENTAGE_OF_COMPONENT' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Depends On *</label>
                    <select
                      value={dependsOnId}
                      onChange={(e) => setDependsOnId(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                    >
                      <option value="">Select Base Component</option>
                      {components?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Percentage Rate (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 20"
                      value={percentageRate}
                      onChange={(e) => setPercentageRate(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  General Ledger (Module 07 Account) *
                </label>
                <select
                  required
                  value={glAccountId}
                  onChange={(e) => setGlAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                >
                  <option value="">Select Ledger Account</option>
                  {accounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={isTaxable}
                    onChange={(e) => setIsTaxable(e.target.checked)}
                    className="rounded text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span>Taxable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={isStatutory}
                    onChange={(e) => setIsStatutory(e.target.checked)}
                    className="rounded text-mehndi-600 focus:ring-mehndi-500"
                  />
                  <span>Statutory (PF/ESI)</span>
                </label>
                {compType === 'EARNING' && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700">
                    <input
                      type="checkbox"
                      checked={affectsGross}
                      onChange={(e) => setAffectsGross(e.target.checked)}
                      className="rounded text-mehndi-600 focus:ring-mehndi-500"
                    />
                    <span>Affects Gross</span>
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCompModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCompMutation.isPending}
                  className="px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-xl"
                >
                  {createCompMutation.isPending ? 'Saving...' : 'Save Component'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Structure Modal */}
      {isStructModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">Create Salary Structure</h2>
              <button onClick={() => setIsStructModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {structError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                {structError}
              </div>
            )}
            <form onSubmit={handleCreateStructure} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Structure Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Teaching Staff Band A"
                    value={structName}
                    onChange={(e) => setStructName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STR_TEACHING_A"
                    value={structCode}
                    onChange={(e) => setStructCode(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional description"
                  value={structDescription}
                  onChange={(e) => setStructDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Select Components</label>
                <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 max-h-60 overflow-y-auto">
                  {components?.map((comp) => {
                    const selected = selectedComponents.find((c) => c.componentId === comp.id);
                    return (
                      <div key={comp.id} className="p-3 flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-zinc-800">
                          <input
                            type="checkbox"
                            checked={Boolean(selected)}
                            onChange={() => handleToggleComponentInStructure(comp.id, 0)}
                            className="rounded text-mehndi-600 focus:ring-mehndi-500"
                          />
                          <span>{comp.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">[{comp.code}]</span>
                        </label>

                        {selected && (
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">Amount:</span>
                            <input
                              type="number"
                              placeholder="₹0"
                              value={selected.flatAmount || ''}
                              onChange={(e) =>
                                handleUpdateComponentAmount(comp.id, Number(e.target.value))
                              }
                              className="w-24 px-2 py-1 border border-zinc-200 rounded-lg text-right font-mono"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsStructModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStructMutation.isPending}
                  className="px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-xl"
                >
                  {createStructMutation.isPending ? 'Creating...' : 'Save Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
