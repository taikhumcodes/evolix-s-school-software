import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Landmark,
  ArrowRightLeft,
  UploadCloud,
  Lock,
  Unlock,
  Plus,
  X,
} from 'lucide-react';
import { FinanceNav } from './FinanceNav';
import {
  useBankAccounts,
  useAccounts,
  useCreateBankAccount,
  useCreateBankTransfer,
  useImportBankStatement,
  useBankStatementLines,
  useReconciliations,
  useCloseReconciliation,
  useReopenReconciliation,
} from '../../../lib/api/finance';

import { useToast } from '../../../components/ui/Toast';

export const BankingView: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'TRANSFERS' | 'RECONCILIATION'>('ACCOUNTS');

  // Internal Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [transferRemarks, setTransferRemarks] = useState('');

  // Reconciliation workspace state
  const [selectedBankRecordId, setSelectedBankRecordId] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLinesText, setImportLinesText] = useState('');
  const [reopenModalReconId, setReopenModalReconId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  // Add Bank Account Modal
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [newBankAccountId, setNewBankAccountId] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newAccountDisplayName, setNewAccountDisplayName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newIfscCode, setNewIfscCode] = useState('');
  const [newBranchName, setNewBranchName] = useState('');

  const { data: bankAccounts } = useBankAccounts();
  const { data: assetAccounts } = useAccounts('ASSET');
  const { data: statementLines, refetch: refetchStatementLines } = useBankStatementLines(
    selectedBankRecordId || (bankAccounts && bankAccounts[0]?.id) || ''
  );
  const { data: reconciliations, refetch: refetchReconciliations } = useReconciliations(
    selectedBankRecordId || (bankAccounts && bankAccounts[0]?.id) || undefined
  );

  const createBankAccountMutation = useCreateBankAccount();
  const createTransferMutation = useCreateBankTransfer();
  const importStatementMutation = useImportBankStatement();
  const closeReconciliationMutation = useCloseReconciliation();
  const reopenReconciliationMutation = useReopenReconciliation();

  const handleCreateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankAccountId || !newBankName.trim() || !newAccountDisplayName.trim() || !newAccountNumber.trim()) {
      toast.warning('Please fill in all mandatory bank account fields.');
      return;
    }

    try {
      await createBankAccountMutation.mutateAsync({
        accountId: newBankAccountId,
        bankName: newBankName.trim(),
        accountDisplayName: newAccountDisplayName.trim(),
        accountNumber: newAccountNumber.trim(),
        ifscCode: newIfscCode.trim() || null,
        branchName: newBranchName.trim() || null,
      });

      setIsAddAccountModalOpen(false);
      setNewBankAccountId('');
      setNewBankName('');
      setNewAccountDisplayName('');
      setNewAccountNumber('');
      setNewIfscCode('');
      setNewBranchName('');
      toast.success('Bank account configured successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create bank account');
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId || !transferAmount) return;

    try {
      await createTransferMutation.mutateAsync({
        fromAccountId,
        toAccountId,
        transferDate,
        amount: parseFloat(transferAmount),
        referenceNumber: transferReference || undefined,
        remarks: transferRemarks || undefined,
      });

      setIsTransferModalOpen(false);
      setTransferAmount('');
      setTransferReference('');
      setTransferRemarks('');
      toast.success('Internal bank transfer posted successfully to General Ledger.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Transfer failed');
    }
  };

  const handleImportStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    const bankId = selectedBankRecordId || (bankAccounts && bankAccounts[0]?.id);
    if (!bankId || !importLinesText.trim()) return;

    // Parse simple CSV/tab lines: Date, Description, Reference, Debit, Credit, Balance
    const rawRows = importLinesText.trim().split('\n');
    const parsedLines = [];

    for (const row of rawRows) {
      const parts = row.split(',').map((p) => p.trim());
      if (parts.length >= 4) {
        parsedLines.push({
          transactionDate: parts[0] || new Date().toISOString().split('T')[0],
          description: parts[1] || 'Bank Transaction',
          referenceNumber: parts[2] || null,
          debit: parseFloat(parts[3]) || 0,
          credit: parseFloat(parts[4]) || 0,
          balanceAfter: parts[5] ? parseFloat(parts[5]) : null,
        });
      }
    }

    if (parsedLines.length === 0) {
      toast.warning('No valid CSV rows parsed. Format: Date,Description,Ref,Debit,Credit,Balance');
      return;
    }

    try {
      const res = await importStatementMutation.mutateAsync({
        bankAccountId: bankId,
        statementStartDate: new Date().toISOString().split('T')[0],
        statementEndDate: new Date().toISOString().split('T')[0],
        lines: parsedLines,
      });
      toast.success(`Successfully imported ${res.importedLines} statement lines.`);
      setIsImportModalOpen(false);
      setImportLinesText('');
      refetchStatementLines();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Import failed');
    }
  };

  const handleCloseReconciliation = async () => {
    const bankId = selectedBankRecordId || (bankAccounts && bankAccounts[0]?.id);
    if (!bankId) return;

    try {
      await closeReconciliationMutation.mutateAsync({
        bankAccountId: bankId,
        periodStartDate: '2026-04-01',
        periodEndDate: '2026-04-30',
        closingBalanceBank: 50000,
      });
      toast.success('Bank reconciliation period closed successfully.');
      refetchReconciliations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Reconciliation close failed');
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenModalReconId || !reopenReason.trim()) return;

    try {
      await reopenReconciliationMutation.mutateAsync({
        id: reopenModalReconId,
        reason: reopenReason.trim(),
      });
      setReopenModalReconId(null);
      setReopenReason('');
      toast.success('Reconciliation reopened with audit record.');
      refetchReconciliations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Reopen failed');
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
            {t('finance.banking.tabAccounts', 'Bank Accounts')}
          </button>
          <button
            onClick={() => setActiveTab('TRANSFERS')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'TRANSFERS'
                ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t('finance.banking.tabTransfers', 'Internal Transfers')}
          </button>
          <button
            onClick={() => setActiveTab('RECONCILIATION')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'RECONCILIATION'
                ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t('finance.banking.tabRecon', 'Bank Statement & Reconciliation')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'ACCOUNTS' && (
            <button
              type="button"
              onClick={() => {
                const defaultGL = assetAccounts?.find((a) => a.code === '1020') || assetAccounts?.[0];
                if (defaultGL && !newBankAccountId) {
                  setNewBankAccountId(defaultGL.id);
                }
                setIsAddAccountModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('finance.banking.addAccount', 'Add Bank Account')}</span>
            </button>
          )}

          {activeTab === 'TRANSFERS' && (
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>{t('finance.banking.newTransfer', 'Transfer Funds')}</span>
            </button>
          )}

          {activeTab === 'RECONCILIATION' && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{t('finance.banking.importStatement', 'Import Statement CSV')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab: Bank Accounts */}
      {activeTab === 'ACCOUNTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts && bankAccounts.length > 0 ? (
            bankAccounts.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-3 hover:border-mehndi-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-700 border border-sky-100">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">{b.accountDisplayName}</h3>
                      <p className="text-[11px] text-zinc-500">{b.bankName}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ACTIVE
                  </span>
                </div>

                <div className="p-3 bg-zinc-50 rounded-lg text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Account #:</span>
                    <span className="font-bold text-zinc-800">{b.accountNumberMasked}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">IFSC Code:</span>
                    <span>{b.ifscCode || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Branch:</span>
                    <span>{b.branchName || 'Main'}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 p-12 border-2 border-dashed border-zinc-200 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-800">No bank accounts configured yet</h4>
                <p className="text-xs text-zinc-500 mt-1">Configure your school's operating bank accounts for fee collection and reconciliation.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const defaultGL = assetAccounts?.find((a) => a.code === '1020') || assetAccounts?.[0];
                  if (defaultGL && !newBankAccountId) {
                    setNewBankAccountId(defaultGL.id);
                  }
                  setIsAddAccountModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Bank Account</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Internal Transfers Workspace */}
      {activeTab === 'TRANSFERS' && (
        <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm text-center space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-mehndi-100 flex items-center justify-center text-mehndi-700 mx-auto">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-zinc-900">
              Inter-Account Fund Transfer
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Deposit cash counter collections into bank or execute bank-to-bank transfers with balanced double-entry
              journal posting.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="px-6 py-2.5 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md"
          >
            Initiate Transfer Now
          </button>
        </div>
      )}

      {/* Tab: Statement & Reconciliation Workspace */}
      {activeTab === 'RECONCILIATION' && (
        <div className="space-y-6">
          {/* Top Bank Selector & Close Recon Action */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">Bank Account:</span>
              <select
                value={selectedBankRecordId}
                onChange={(e) => setSelectedBankRecordId(e.target.value)}
                className="text-xs px-3 py-1.5 border border-zinc-300 rounded-lg font-bold"
              >
                {bankAccounts?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.accountDisplayName} ({b.accountNumberMasked})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCloseReconciliation}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-lg shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Close Reconciliation Period</span>
              </button>
            </div>
          </div>

          {/* Statement Lines Table */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Imported Statement Lines & Matching
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Debit (Withdrawal)</th>
                    <th className="py-3 px-4 text-right">Credit (Deposit)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {statementLines && statementLines.length > 0 ? (
                    statementLines.map((line) => (
                      <tr key={line.id} className="hover:bg-zinc-50">
                        <td className="py-3 px-4 text-zinc-600">
                          {new Date(line.transactionDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-800">{line.description}</td>
                        <td className="py-3 px-4 font-mono">{line.referenceNumber || '-'}</td>
                        <td className="py-3 px-4 text-right font-mono">
                          {Number(line.debit) > 0 ? `₹${line.debit}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                          {Number(line.credit) > 0 ? `₹${line.credit}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              line.reconciliationStatus === 'MATCHED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {line.reconciliationStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400">
                        No statement lines imported yet. Click &quot;Import Statement CSV&quot; above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Past Reconciliation Records */}
          {reconciliations && reconciliations.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Closed Reconciliations
              </h3>
              <div className="space-y-2">
                {reconciliations.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 border border-zinc-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-900">
                        Period: {new Date(r.periodStartDate).toLocaleDateString()} &mdash;{' '}
                        {new Date(r.periodEndDate).toLocaleDateString()}
                      </span>
                      <span className="block text-zinc-500 font-mono">
                        Bank Balance: ₹{r.closingBalanceBank} &bull; Status: {r.status}
                      </span>
                    </div>
                    {r.status === 'CLOSED' && (
                      <button
                        type="button"
                        onClick={() => setReopenModalReconId(r.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded flex items-center gap-1"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Reopen</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900">Transfer Funds</h3>

            <form onSubmit={handleCreateTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Source Account (Credit) *
                </label>
                <select
                  required
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                >
                  <option value="">-- Select Source Account --</option>
                  {assetAccounts?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} &bull; {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Destination Account (Debit) *
                </label>
                <select
                  required
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                >
                  <option value="">-- Select Destination Account --</option>
                  {assetAccounts?.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                      {a.code} &bull; {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Reference #
                </label>
                <input
                  type="text"
                  placeholder="e.g. CASH-DEP-101 or CHEQUE-9988"
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily cashier collection deposit"
                  value={transferRemarks}
                  onChange={(e) => setTransferRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTransferMutation.isPending}
                  className="px-5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {createTransferMutation.isPending ? 'Posting...' : 'Commit Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900">Import Bank Statement Lines</h3>
            <p className="text-xs text-zinc-500">
              Paste CSV rows formatted as: <br />
              <code className="bg-zinc-100 px-1 py-0.5 rounded text-[10px]">
                YYYY-MM-DD, Description, Reference, Debit, Credit, BalanceAfter
              </code>
            </p>

            <form onSubmit={handleImportStatement} className="space-y-3 text-xs">
              <textarea
                rows={6}
                required
                value={importLinesText}
                onChange={(e) => setImportLinesText(e.target.value)}
                placeholder="2026-04-14, NEFT Inflow Aarav Patel, TXN-998877, 0, 12000, 50000"
                className="w-full p-2.5 border border-zinc-300 rounded-lg font-mono text-[11px]"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importStatementMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {importStatementMutation.isPending ? 'Importing...' : 'Parse & Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reopen Reconciliation Modal */}
      {reopenModalReconId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900 text-amber-700">
              Reopen Closed Bank Reconciliation
            </h3>
            <p className="text-xs text-zinc-500">
              Reopening a closed period requires an authoritative audit justification reason.
            </p>

            <form onSubmit={handleReopenSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Mandatory Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Bank charges adjustment required"
                  className="w-full p-2.5 border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReopenModalReconId(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reopenReconciliationMutation.isPending}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {reopenReconciliationMutation.isPending ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Add Bank Account */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-zinc-900">Add School Bank Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAccountModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBankAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  General Ledger Asset Account *
                </label>
                <select
                  required
                  value={newBankAccountId}
                  onChange={(e) => setNewBankAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-medium"
                >
                  <option value="">-- Select GL Account --</option>
                  {assetAccounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} &bull; {acc.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Linked double-entry GL asset account (e.g. 1020 - State Bank of India).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, SBI"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Display Label *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Fee Counter"
                    value={newAccountDisplayName}
                    onChange={(e) => setNewAccountDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Full bank account number"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0001234"
                    value={newIfscCode}
                    onChange={(e) => setNewIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Campus Branch"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBankAccountMutation.isPending}
                  className="px-5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {createBankAccountMutation.isPending ? 'Configuring...' : 'Save Bank Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default BankingView;
