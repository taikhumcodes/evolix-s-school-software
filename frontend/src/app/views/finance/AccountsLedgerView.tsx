import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  CheckCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { FinanceNav } from './FinanceNav';
import {
  useAccounts,
  useJournals,
  useCreateAccount,
  usePostJournal,
  useReverseJournal,
  JournalEntry,
} from '../../../lib/api/finance';

import { useToast } from '../../../components/ui/Toast';

export const AccountsLedgerView: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'JOURNALS'>('ACCOUNTS');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('');
  const [page] = useState(1);

  // New Account Modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accCode, setAccCode] = useState('');
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('ASSET');
  const [accNormalBalance, setAccNormalBalance] = useState('DEBIT');
  const [accParentId, setAccParentId] = useState('');
  const [accDescription, setAccDescription] = useState('');

  // New Journal Modal
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalDescription, setJournalDescription] = useState('');
  const [journalLines, setJournalLines] = useState<
    Array<{ accountId: string; description: string; debit: string; credit: string }>
  >([
    { accountId: '', description: '', debit: '', credit: '0' },
    { accountId: '', description: '', debit: '0', credit: '' },
  ]);

  // Reverse Journal Modal
  const [reversingJournal, setReversingJournal] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  const { data: accounts, refetch: refetchAccounts } = useAccounts(
    accountTypeFilter || undefined
  );
  const { data: journalsData, refetch: refetchJournals } = useJournals(page);

  const createAccountMutation = useCreateAccount();
  const postJournalMutation = usePostJournal();
  const reverseJournalMutation = useReverseJournal();

  // Balance computation for journal
  const totalDebit = journalLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = journalLines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isJournalBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  const handleAddJournalLine = () => {
    setJournalLines([...journalLines, { accountId: '', description: '', debit: '0', credit: '0' }]);
  };

  const handleRemoveJournalLine = (idx: number) => {
    if (journalLines.length > 2) {
      setJournalLines(journalLines.filter((_, i) => i !== idx));
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accCode || !accName) return;

    try {
      await createAccountMutation.mutateAsync({
        code: accCode.trim(),
        name: accName.trim(),
        type: accType,
        normalBalance: accNormalBalance,
        parentAccountId: accParentId || null,
        description: accDescription || null,
      });

      setIsAccountModalOpen(false);
      setAccCode('');
      setAccName('');
      setAccDescription('');
      setAccParentId('');
      refetchAccounts();
      toast.success('Account created successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create account');
    }
  };

  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJournalBalanced || !journalDescription.trim()) return;

    try {
      await postJournalMutation.mutateAsync({
        postingDate: journalDate,
        description: journalDescription.trim(),
        lines: journalLines.map((l) => ({
          accountId: l.accountId,
          description: l.description || journalDescription,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
      });

      setIsJournalModalOpen(false);
      setJournalDescription('');
      setJournalLines([
        { accountId: '', description: '', debit: '', credit: '0' },
        { accountId: '', description: '', debit: '0', credit: '' },
      ]);
      refetchJournals();
      refetchAccounts();
      toast.success('Journal posted successfully to General Ledger.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Journal posting failed');
    }
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingJournal || !reversalReason.trim()) return;

    try {
      await reverseJournalMutation.mutateAsync({
        journalId: reversingJournal.id,
        reason: reversalReason.trim(),
      });
      setReversingJournal(null);
      setReversalReason('');
      refetchJournals();
      refetchAccounts();
      toast.success('Journal reversed with audit record.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Journal reversal failed');
    }
  };

  return (
    <div className="space-y-6">
      <FinanceNav />

      {/* Control Header & Tabs */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ACCOUNTS')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'ACCOUNTS'
                ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t('finance.accounts.tabAccounts', 'Chart of Accounts')}
          </button>
          <button
            onClick={() => setActiveTab('JOURNALS')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'JOURNALS'
                ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t('finance.accounts.tabJournals', 'General Ledger Journal Register')}
          </button>
        </div>

        <div>
          {activeTab === 'ACCOUNTS' ? (
            <div className="flex items-center gap-3">
              <select
                value={accountTypeFilter}
                onChange={(e) => setAccountTypeFilter(e.target.value)}
                className="text-xs px-3 py-1.5 border border-zinc-300 rounded-lg font-medium"
              >
                <option value="">{t('finance.common.all', 'All Account Types')}</option>
                <option value="ASSET">ASSET</option>
                <option value="LIABILITY">LIABILITY</option>
                <option value="EQUITY">EQUITY</option>
                <option value="INCOME">INCOME</option>
                <option value="EXPENSE">EXPENSE</option>
              </select>

              <button
                type="button"
                onClick={() => setIsAccountModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{t('finance.accounts.newAccount', 'New Account')}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsJournalModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('finance.accounts.newJournal', 'Post Manual Journal')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab: Chart of Accounts */}
      {activeTab === 'ACCOUNTS' && (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Account Code</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Normal Balance</th>
                  <th className="py-3 px-4">Parent Account</th>
                  <th className="py-3 px-4 text-center">System Protected</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {accounts && accounts.length > 0 ? (
                  accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900">{acc.code}</td>
                      <td className="py-3 px-4 font-medium text-zinc-800">{acc.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            acc.type === 'ASSET'
                              ? 'bg-blue-100 text-blue-800'
                              : acc.type === 'LIABILITY'
                              ? 'bg-amber-100 text-amber-800'
                              : acc.type === 'EQUITY'
                              ? 'bg-purple-100 text-purple-800'
                              : acc.type === 'INCOME'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-600">{acc.normalBalance}</td>
                      <td className="py-3 px-4 text-zinc-500 font-medium">{acc.parentAccount?.name || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {acc.isSystemAccount ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700">
                            SYSTEM
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      No accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Journal Register */}
      {activeTab === 'JOURNALS' && (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Journal #</th>
                  <th className="py-3 px-4">Posting Date</th>
                  <th className="py-3 px-4">Source Doc</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Debit (₹)</th>
                  <th className="py-3 px-4 text-right">Credit (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {journalsData?.data && journalsData.data.length > 0 ? (
                  journalsData.data.map((j) => {
                    const totalD = j.lines.reduce((s, l) => s + parseFloat(l.debit || '0'), 0);
                    const totalC = j.lines.reduce((s, l) => s + parseFloat(l.credit || '0'), 0);
                    return (
                      <tr key={j.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900">{j.journalNumber}</td>
                        <td className="py-3 px-4 text-zinc-600">
                          {new Date(j.postingDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700">
                            {j.sourceType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-700 font-medium truncate max-w-xs">
                          {j.description}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                          ₹{totalD.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          ₹{totalC.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              j.status === 'POSTED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {j.status === 'POSTED' && (
                            <button
                              type="button"
                              onClick={() => setReversingJournal(j)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            >
                              Reverse
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-400">
                      No journal entries posted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900">Create Ledger Account</h3>

            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Account Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1050"
                    value={accCode}
                    onChange={(e) => setAccCode(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Type *
                  </label>
                  <select
                    value={accType}
                    onChange={(e) => {
                      setAccType(e.target.value);
                      setAccNormalBalance(
                        e.target.value === 'ASSET' || e.target.value === 'EXPENSE' ? 'DEBIT' : 'CREDIT'
                      );
                    }}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold"
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="EQUITY">EQUITY</option>
                    <option value="INCOME">INCOME</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laboratory Equipment Reserve"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Parent Account (Hierarchy)
                </label>
                <select
                  value={accParentId}
                  onChange={(e) => setAccParentId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                >
                  <option value="">-- Top-Level Account --</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} &bull; {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={accDescription}
                  onChange={(e) => setAccDescription(e.target.value)}
                  className="w-full p-2.5 border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAccountMutation.isPending}
                  className="px-5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {createAccountMutation.isPending ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Balanced Journal Posting Modal */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-zinc-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="text-base font-extrabold text-zinc-900">Post Manual General Ledger Journal</h3>
              <div
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                  isJournalBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isJournalBalanced ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{isJournalBalanced ? 'BALANCED' : 'UNBALANCED'}</span>
              </div>
            </div>

            <form onSubmit={handlePostJournal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Posting Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={journalDate}
                    onChange={(e) => setJournalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Month end adjustment journal"
                    value={journalDescription}
                    onChange={(e) => setJournalDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Lines table */}
              <div className="space-y-2 border-t border-b border-zinc-100 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-700 uppercase tracking-wider">Debit & Credit Lines</span>
                  <button
                    type="button"
                    onClick={handleAddJournalLine}
                    className="text-mehndi-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line</span>
                  </button>
                </div>

                {journalLines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-5">
                      <select
                        required
                        value={l.accountId}
                        onChange={(e) => {
                          const updated = [...journalLines];
                          updated[idx].accountId = e.target.value;
                          setJournalLines(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg"
                      >
                        <option value="">-- Select Account --</option>
                        {accounts?.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} &bull; {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        placeholder="Line note"
                        value={l.description}
                        onChange={(e) => {
                          const updated = [...journalLines];
                          updated[idx].description = e.target.value;
                          setJournalLines(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Debit (₹)"
                        value={l.debit}
                        onChange={(e) => {
                          const updated = [...journalLines];
                          updated[idx].debit = e.target.value;
                          if (parseFloat(e.target.value) > 0) updated[idx].credit = '0';
                          setJournalLines(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-zinc-300 rounded-lg font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Credit (₹)"
                        value={l.credit}
                        onChange={(e) => {
                          const updated = [...journalLines];
                          updated[idx].credit = e.target.value;
                          if (parseFloat(e.target.value) > 0) updated[idx].debit = '0';
                          setJournalLines(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-zinc-300 rounded-lg font-mono"
                      />
                    </div>
                    {journalLines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveJournalLine(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 transition-colors"
                        title="Remove line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Journal Totals & Invariant Verification */}
                <div className="pt-2 flex items-center justify-between text-xs font-bold border-t border-zinc-200">
                  <span className="text-zinc-600">Totals:</span>
                  <div className="flex gap-6 font-mono text-sm">
                    <span>
                      Total Debit: <strong className="text-zinc-900">₹{totalDebit.toFixed(2)}</strong>
                    </span>
                    <span>
                      Total Credit:{' '}
                      <strong className="text-emerald-700">₹{totalCredit.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isJournalBalanced || postJournalMutation.isPending}
                  className="px-5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {postJournalMutation.isPending ? 'Posting...' : 'Commit Balanced Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Journal Modal */}
      {reversingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900 text-rose-700">
              Reverse Journal {reversingJournal.journalNumber}
            </h3>
            <p className="text-xs text-zinc-500">
              Creates an atomic opposite journal entry in an open accounting period. Original journal remains
              immutable.
            </p>

            <form onSubmit={handleReverseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Mandatory Reversal Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Inadvertent duplicate entry or auditor correction"
                  className="w-full p-2.5 border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReversingJournal(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reverseJournalMutation.isPending}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {reverseJournalMutation.isPending ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AccountsLedgerView;
