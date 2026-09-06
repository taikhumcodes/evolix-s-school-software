import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Printer,
  RotateCcw,
  ArrowRight,
  Users,
  RefreshCw,
  CreditCard,
} from 'lucide-react';
import { FinanceNav } from './FinanceNav';
import {
  useStudentLedger,
  useFeeInvoices,
  useFeeReceipts,
  useAccounts,
  useCreateRefund,
} from '../../../lib/api/finance';
import { StatementPrintModal } from './StatementPrintModal';
import { useToast } from '../../../components/ui/Toast';
import apiClient from '../../../lib/api-client';

export const StudentFeesView: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'INVOICES' | 'RECEIPTS' | 'REFUND'>('LEDGER');

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Refund Modal State
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDisbursingAccountId, setRefundDisbursingAccountId] = useState('');
  const [refundMethod, setRefundMethod] = useState('BANK_TRANSFER');
  const [refundReason, setRefundReason] = useState('');

  const { data: ledgerData, refetch: refetchLedger } = useStudentLedger(
    selectedStudent?.id || ''
  );
  const { data: invoicesData } = useFeeInvoices(
    selectedStudent ? { studentId: selectedStudent.id } : undefined
  );
  const { data: receiptsData } = useFeeReceipts(1, selectedStudent?.id);
  const { data: accounts } = useAccounts('ASSET');

  const refundMutation = useCreateRefund();

  const fetchStudents = useCallback(async (query = '') => {
    setIsSearching(true);
    try {
      const { data } = await apiClient.get('/students', {
        params: { search: query.trim() || undefined, limit: 30 },
      });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setSearchResults(list);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents('');
  }, [fetchStudents]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchStudents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(searchQuery);
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !refundAmount || !refundDisbursingAccountId || !refundReason.trim()) return;

    try {
      await refundMutation.mutateAsync({
        studentId: selectedStudent.id,
        disbursingAccountId: refundDisbursingAccountId,
        amount: parseFloat(refundAmount),
        refundMethod,
        reason: refundReason.trim(),
      });
      toast.success('Refund processed successfully and posted to General Ledger.');
      setRefundAmount('');
      setRefundReason('');
      setActiveTab('LEDGER');
      refetchLedger();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Refund failed');
    }
  };

  return (
    <div className="space-y-6">
      <FinanceNav />

      {/* Student Lookup Search */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
          <input
            type="text"
            placeholder={t(
              'finance.students.searchPlaceholder',
              'Search student name, admission number, or ID...'
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mehndi-500 font-medium"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-lg shadow-sm"
          >
            {isSearching ? '...' : t('finance.common.search', 'Search')}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-3 border border-zinc-200 rounded-lg divide-y divide-zinc-100 max-h-48 overflow-y-auto bg-zinc-50/50 max-w-xl">
            {searchResults.map((stu) => (
              <div
                key={stu.id}
                onClick={() => {
                  setSelectedStudent(stu);
                  setSearchResults([]);
                }}
                className="p-2.5 hover:bg-mehndi-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <span className="font-bold text-zinc-900">
                    {stu.firstName} {stu.lastName}
                  </span>
                  <span className="block text-[10px] text-zinc-500 font-mono">
                    ADM: {stu.admissionNumber} &bull; ID: {stu.studentId}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedStudent ? (
        <div className="space-y-6">
          {/* Header Card & Balances */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Admission No: {selectedStudent.admissionNumber} &bull; Student ID: {selectedStudent.studentId}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/finance/collections"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{t('finance.students.collectFees', 'Collect Fees / Add Dues')}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold rounded-lg transition-all"
                >
                  {t('finance.students.changeStudent', 'Change Student')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-lg transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('finance.students.printStatement', 'Print Financial Statement')}</span>
                </button>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Total Fees
                </span>
                <span className="text-base font-black text-zinc-900 font-mono mt-1 block">
                  ₹{ledgerData?.summary?.totalCharges || '0.00'}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Total Paid
                </span>
                <span className="text-base font-black text-emerald-900 font-mono mt-1 block">
                  ₹{ledgerData?.summary?.totalPaid || '0.00'}
                </span>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Concessions
                </span>
                <span className="text-base font-black text-indigo-900 font-mono mt-1 block">
                  ₹{ledgerData?.summary?.totalConcessions || '0.00'}
                </span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                  Outstanding
                </span>
                <span className="text-base font-black text-rose-900 font-mono mt-1 block">
                  ₹{ledgerData?.summary?.outstandingBalance || '0.00'}
                </span>
              </div>
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                  Advance Credit
                </span>
                <span className="text-base font-black text-teal-900 font-mono mt-1 block">
                  ₹{ledgerData?.summary?.advanceBalance || '0.00'}
                </span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  Overdue
                </span>
                <span className="text-base font-black text-amber-900 font-mono mt-1 block">
                  ₹{ledgerData?.summary?.overdueAmount || '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs */}
          <div className="flex border-b border-zinc-200 gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`pb-2 border-b-2 transition-all ${
                activeTab === 'LEDGER'
                  ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {t('finance.students.tabLedger', 'Chronological Ledger & Running Balance')}
            </button>
            <button
              onClick={() => setActiveTab('INVOICES')}
              className={`pb-2 border-b-2 transition-all ${
                activeTab === 'INVOICES'
                  ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {t('finance.students.tabInvoices', 'Fee Invoices')}
            </button>
            <button
              onClick={() => setActiveTab('RECEIPTS')}
              className={`pb-2 border-b-2 transition-all ${
                activeTab === 'RECEIPTS'
                  ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {t('finance.students.tabReceipts', 'Receipt History')}
            </button>
            <button
              onClick={() => setActiveTab('REFUND')}
              className={`pb-2 border-b-2 transition-all ${
                activeTab === 'REFUND'
                  ? 'border-mehndi-600 text-mehndi-700 font-extrabold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {t('finance.students.tabRefund', 'Disburse Refund')}
            </button>
          </div>

          {/* Tab Content: Chronological Ledger */}
          {activeTab === 'LEDGER' && (
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Debit (₹)</th>
                      <th className="py-3 px-4 text-right">Credit (₹)</th>
                      <th className="py-3 px-4 text-right">Running Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {ledgerData?.entries && ledgerData.entries.length > 0 ? (
                      ledgerData.entries.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3 px-4 text-zinc-600">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-bold text-[10px] text-zinc-800">{item.type}</td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-900">{item.reference}</td>
                          <td className="py-3 px-4 text-zinc-600">{item.description}</td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-900">
                            {Number(item.debit) > 0 ? `₹${item.debit}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700">
                            {Number(item.credit) > 0 ? `₹${item.credit}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-zinc-900">
                            ₹{item.runningBalance}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-400">
                          {t('finance.students.noLedger', 'No transactions recorded for this student.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Content: Invoices */}
          {activeTab === 'INVOICES' && (
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total (₹)</th>
                    <th className="py-3 px-4 text-right">Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {invoicesData?.data && invoicesData.data.length > 0 ? (
                    invoicesData.data.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-50">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900">{inv.invoiceNumber}</td>
                        <td className="py-3 px-4 text-zinc-600">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">₹{inv.totalAmount}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">₹{inv.paidAmount}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                          ₹{inv.outstandingAmount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-800">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-zinc-400">
                        No invoices found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab Content: Receipts */}
          {activeTab === 'RECEIPTS' && (
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {receiptsData?.data && receiptsData.data.length > 0 ? (
                    receiptsData.data.map((rcpt) => (
                      <tr key={rcpt.id} className="hover:bg-zinc-50">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900">{rcpt.receiptNumber}</td>
                        <td className="py-3 px-4 text-zinc-600">
                          {new Date(rcpt.receiptDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100">
                            {rcpt.feePayment?.paymentMethod || rcpt.breakdownSnapshot?.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          ₹{rcpt.breakdownSnapshot?.totalAmount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rcpt.isCancelled ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {rcpt.isCancelled ? 'CANCELLED' : 'VALID'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-400">
                        No receipts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab Content: Refund Payout */}
          {activeTab === 'REFUND' && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm max-w-lg">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 mb-4 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>{t('finance.students.refundTitle', 'Disburse Student Fee Refund')}</span>
              </h3>

              <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Refund Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Disbursing Cash / Bank Account *
                  </label>
                  <select
                    required
                    value={refundDisbursingAccountId}
                    onChange={(e) => setRefundDisbursingAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  >
                    <option value="">-- Select Disbursing Account --</option>
                    {accounts?.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} &bull; {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Refund Method *
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold"
                  >
                    <option value="BANK_TRANSFER">BANK TRANSFER (NEFT/RTGS)</option>
                    <option value="CASH">CASH</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Justification / Reason *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Caution deposit reimbursement or excess fee refund"
                    className="w-full p-2.5 border border-zinc-300 rounded-lg"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={refundMutation.isPending}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm"
                  >
                    {refundMutation.isPending ? 'Processing...' : 'Disburse Refund Payout'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-500" />
              <span>{t('finance.students.selectPrompt', 'Select a Student to View Financial Ledger & Invoices')}</span>
            </h3>
            <button
              type="button"
              onClick={() => fetchStudents(searchQuery)}
              className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1 font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
          {isSearching ? (
            <div className="py-12 text-center text-xs text-zinc-400">Loading student roster...</div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {searchResults.map((stu) => (
                <div
                  key={stu.id}
                  onClick={() => {
                    setSelectedStudent(stu);
                    toast.info(`Selected ${stu.firstName} ${stu.lastName}`, 'Student Selected');
                  }}
                  className="p-3 border border-zinc-200 rounded-xl hover:border-mehndi-500 hover:bg-mehndi-50/40 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate">
                      {stu.firstName} {stu.lastName}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate">
                      ADM: {stu.admissionNumber} {stu.currentClass?.name ? `• ${stu.currentClass.name}` : stu.enrollments?.[0]?.class?.name ? `• ${stu.enrollments[0].class.name}` : ''}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0 ml-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 border-2 border-dashed border-zinc-200 rounded-2xl text-center text-zinc-400 text-xs">
              {t(
                'finance.students.emptyPrompt',
                'No students found. Use search box above.'
              )}
            </div>
          )}
        </div>
      )}

      {/* Printable Statement Modal */}
      <StatementPrintModal
        isOpen={isPrintModalOpen}
        student={selectedStudent}
        ledger={ledgerData || null}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
export default StudentFeesView;
