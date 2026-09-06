import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Filter,
  Sparkles,
  CheckCircle,
  Plus,
  X,
  Trash2,
  Search,
} from 'lucide-react';
import { FinanceNav } from './FinanceNav';
import {
  useFeeInvoices,
  useBatchGenerateInvoices,
  useCreateCreditNote,
  useWriteOffInvoice,
  useCreateFeeInvoice,
  FeeInvoice,
} from '../../../lib/api/finance';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { useClasses, useFeeHeads } from '../../../lib/api/master-data';
import { useToast } from '../../../components/ui/Toast';
import apiClient from '../../../lib/api-client';

export const FeeInvoicesView: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page] = useState(1);

  // Modals
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchAcademicYearId, setBatchAcademicYearId] = useState('');
  const [batchClassId, setBatchClassId] = useState('');
  const [batchInstallmentName, setBatchInstallmentName] = useState('Term 1 Installment');
  const [batchInvoiceDate, setBatchInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchDueDate, setBatchDueDate] = useState(
    new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [batchResult, setBatchResult] = useState<any | null>(null);

  // Credit Note Modal
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<FeeInvoice | null>(null);
  const [creditNoteAmount, setCreditNoteAmount] = useState('');
  const [creditNoteReason, setCreditNoteReason] = useState('');

  // Write Off Modal
  const [writeOffInvoice, setWriteOffInvoice] = useState<FeeInvoice | null>(null);
  const [writeOffAmount, setWriteOffAmount] = useState('');
  const [writeOffReason, setWriteOffReason] = useState('');

  // Single Student Invoice Modal
  const [isSingleInvoiceModalOpen, setIsSingleInvoiceModalOpen] = useState(false);
  const [singleStudentSearch, setSingleStudentSearch] = useState('');
  const [singleStudentList, setSingleStudentList] = useState<any[]>([]);
  const [singleSelectedStudent, setSingleSelectedStudent] = useState<any | null>(null);
  const [singleAcademicYearId, setSingleAcademicYearId] = useState('');
  const [singleInvoiceDate, setSingleInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [singleDueDate, setSingleDueDate] = useState(
    new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [singleLines, setSingleLines] = useState<Array<{ feeHeadId: string; description: string; rate: string; quantity: number; concession: string }>>([
    { feeHeadId: '', description: '', rate: '', quantity: 1, concession: '0' },
  ]);

  const currentSchoolId = localStorage.getItem('selected_school_id') || '';

  const { data: invoicesData, isLoading, refetch } = useFeeInvoices({
    status: selectedStatus || undefined,
    page,
  });
  const { data: academicYears } = useAcademicYears(currentSchoolId);
  const { data: classes } = useClasses(currentSchoolId);
  const { data: feeHeads } = useFeeHeads(currentSchoolId);

  const batchMutation = useBatchGenerateInvoices();
  const createFeeInvoiceMutation = useCreateFeeInvoice();
  const creditNoteMutation = useCreateCreditNote();
  const writeOffMutation = useWriteOffInvoice();

  const fetchSingleStudents = useCallback(async (q = '') => {
    try {
      const { data } = await apiClient.get('/students', { params: { search: q.trim() || undefined, limit: 15 } });
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
      setSingleStudentList(list);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isSingleInvoiceModalOpen) {
      fetchSingleStudents(singleStudentSearch);
      if (academicYears && academicYears.length > 0 && !singleAcademicYearId) {
        setSingleAcademicYearId(academicYears[0].id);
      }
    }
  }, [isSingleInvoiceModalOpen, academicYears]);

  useEffect(() => {
    if (isSingleInvoiceModalOpen) {
      const t = setTimeout(() => fetchSingleStudents(singleStudentSearch), 250);
      return () => clearTimeout(t);
    }
  }, [singleStudentSearch, isSingleInvoiceModalOpen]);

  const handleAddSingleLine = () => {
    setSingleLines([...singleLines, { feeHeadId: '', description: '', rate: '', quantity: 1, concession: '0' }]);
  };

  const handleRemoveSingleLine = (idx: number) => {
    if (singleLines.length > 1) {
      setSingleLines(singleLines.filter((_, i) => i !== idx));
    }
  };

  const handleSingleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleSelectedStudent) {
      toast.warning('Please select a student for this fee invoice.');
      return;
    }
    if (!singleAcademicYearId) {
      toast.warning('Please select an academic year.');
      return;
    }
    if (singleLines.some(l => !l.feeHeadId || !l.rate || parseFloat(l.rate) <= 0)) {
      toast.warning('Please fill in all line items with valid fee head and amount.');
      return;
    }

    try {
      await createFeeInvoiceMutation.mutateAsync({
        studentId: singleSelectedStudent.id,
        academicYearId: singleAcademicYearId,
        invoiceDate: singleInvoiceDate,
        dueDate: singleDueDate,
        lines: singleLines.map(l => ({
          feeHeadId: l.feeHeadId,
          description: l.description || feeHeads?.find(h => h.id === l.feeHeadId)?.name || 'Fee item',
          rate: parseFloat(l.rate) || 0,
          quantity: l.quantity || 1,
          concession: parseFloat(l.concession) || 0,
        })),
      });

      setIsSingleInvoiceModalOpen(false);
      setSingleSelectedStudent(null);
      setSingleLines([{ feeHeadId: '', description: '', rate: '', quantity: 1, concession: '0' }]);
      refetch();
      toast.success('Fee invoice created successfully and dues posted to student account.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create fee invoice');
    }
  };

  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchAcademicYearId || !batchClassId) return;

    try {
      const res = await batchMutation.mutateAsync({
        academicYearId: batchAcademicYearId,
        classId: batchClassId,
        installmentName: batchInstallmentName,
        invoiceDate: batchInvoiceDate,
        dueDate: batchDueDate,
      });
      setBatchResult(res);
      refetch();
      toast.success(`Batch fee invoices generated: ${res.generatedCount} invoices created.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Batch generation failed');
    }
  };

  const handleCreditNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditNoteInvoice || !creditNoteAmount || !creditNoteReason.trim()) return;

    try {
      await creditNoteMutation.mutateAsync({
        invoiceId: creditNoteInvoice.id,
        amount: parseFloat(creditNoteAmount),
        reason: creditNoteReason.trim(),
      });
      setCreditNoteInvoice(null);
      setCreditNoteAmount('');
      setCreditNoteReason('');
      refetch();
      toast.success('Credit note applied successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Credit note failed');
    }
  };

  const handleWriteOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeOffInvoice || !writeOffAmount || !writeOffReason.trim()) return;

    try {
      await writeOffMutation.mutateAsync({
        invoiceId: writeOffInvoice.id,
        amount: parseFloat(writeOffAmount),
        reason: writeOffReason.trim(),
      });
      setWriteOffInvoice(null);
      setWriteOffAmount('');
      setWriteOffReason('');
      refetch();
      toast.success('Invoice written off successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Write off failed');
    }
  };

  return (
    <div className="space-y-6">
      <FinanceNav />

      {/* Control Header & Filters */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            {t('finance.invoices.filterStatus', 'Status')}:
          </span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-1.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mehndi-500 font-medium"
          >
            <option value="">{t('finance.common.all', 'All Statuses')}</option>
            <option value="POSTED">POSTED (UNPAID)</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PAID">PAID</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsSingleInvoiceModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Student Invoice</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setBatchResult(null);
              setIsBatchModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('finance.invoices.batchGenerate', 'Batch Generate Invoices')}</span>
          </button>
        </div>
      </div>

      {/* Invoices Register Table */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">{t('finance.invoices.invoiceNumber', 'Invoice #')}</th>
                <th className="py-3 px-4">{t('finance.invoices.student', 'Student')}</th>
                <th className="py-3 px-4">{t('finance.invoices.invoiceDate', 'Issue Date')}</th>
                <th className="py-3 px-4">{t('finance.invoices.dueDate', 'Due Date')}</th>
                <th className="py-3 px-4 text-right">{t('finance.invoices.total', 'Total (₹)')}</th>
                <th className="py-3 px-4 text-right">{t('finance.invoices.paid', 'Paid (₹)')}</th>
                <th className="py-3 px-4 text-right">{t('finance.invoices.outstanding', 'Due (₹)')}</th>
                <th className="py-3 px-4 text-center">{t('finance.invoices.status', 'Status')}</th>
                <th className="py-3 px-4 text-right">{t('finance.common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <div className="inline-block w-6 h-6 border-2 border-mehndi-600 border-t-transparent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : invoicesData?.data && invoicesData.data.length > 0 ? (
                invoicesData.data.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-zinc-800">
                        {inv.student?.firstName} {inv.student?.lastName}
                      </span>
                      <span className="block text-[10px] text-zinc-400 font-mono">
                        {inv.student?.admissionNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {new Date(inv.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 font-medium">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                      ₹{inv.totalAmount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700">
                      ₹{inv.paidAmount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-rose-700">
                      ₹{inv.outstandingAmount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : inv.status === 'CANCELLED'
                            ? 'bg-zinc-100 text-zinc-500'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {parseFloat(inv.outstandingAmount) > 0 && inv.status !== 'CANCELLED' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCreditNoteInvoice(inv);
                              setCreditNoteAmount(inv.outstandingAmount);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded border border-indigo-200 transition-colors"
                          >
                            {t('finance.invoices.creditNote', 'Credit Note')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWriteOffInvoice(inv);
                              setWriteOffAmount(inv.outstandingAmount);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                          >
                            {t('finance.invoices.writeOff', 'Write-Off')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400">
                    {t('finance.invoices.noInvoices', 'No fee invoices found for the selected criteria.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Invoice Generation Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-mehndi-100 flex items-center justify-center text-mehndi-700 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-900">
                  {t('finance.invoices.batchModalTitle', 'Generate Batch Invoices')}
                </h3>
                <p className="text-xs text-zinc-500">
                  {t(
                    'finance.invoices.batchModalSub',
                    'Idempotent class billing based on active fee structures'
                  )}
                </p>
              </div>
            </div>

            {batchResult ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle className="w-4 h-4" />
                  <span>{t('finance.invoices.batchComplete', 'Batch Generation Completed')}</span>
                </div>
                <p>
                  <strong>{batchResult.generatedCount}</strong> invoices generated successfully.
                </p>
                <p>
                  <strong>{batchResult.skippedCount}</strong> duplicate students skipped safely.
                </p>
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="mt-3 w-full py-2 bg-emerald-700 text-white font-bold rounded-lg"
                >
                  {t('finance.common.close', 'Close')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleBatchGenerate} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    {t('finance.invoices.academicYear', 'Academic Year')} *
                  </label>
                  <select
                    value={batchAcademicYearId}
                    onChange={(e) => setBatchAcademicYearId(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg font-medium"
                  >
                    <option value="">-- Select Academic Year --</option>
                    {academicYears?.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    {t('finance.invoices.targetClass', 'Target Class')} *
                  </label>
                  <select
                    value={batchClassId}
                    onChange={(e) => setBatchClassId(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg font-medium"
                  >
                    <option value="">-- Select Class --</option>
                    {classes?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    {t('finance.invoices.installmentName', 'Installment / Schedule Title')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={batchInstallmentName}
                    onChange={(e) => setBatchInstallmentName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      {t('finance.invoices.invoiceDate', 'Invoice Date')}
                    </label>
                    <input
                      type="date"
                      required
                      value={batchInvoiceDate}
                      onChange={(e) => setBatchInvoiceDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      {t('finance.invoices.dueDate', 'Due Date')}
                    </label>
                    <input
                      type="date"
                      required
                      value={batchDueDate}
                      onChange={(e) => setBatchDueDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-600"
                  >
                    {t('finance.common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={batchMutation.isPending}
                    className="px-5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-lg shadow-sm"
                  >
                    {batchMutation.isPending ? 'Generating...' : 'Start Batch Run'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Credit Note Modal */}
      {creditNoteInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900">
              {t('finance.creditNote.modalTitle', 'Issue Fee Credit Note')}
            </h3>
            <p className="text-xs text-zinc-500">
              Reduces outstanding balance on invoice{' '}
              <strong className="font-mono">{creditNoteInvoice.invoiceNumber}</strong>.
            </p>

            <form onSubmit={handleCreditNoteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  {t('finance.creditNote.amount', 'Credit Amount (₹)')} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={creditNoteInvoice.outstandingAmount}
                  required
                  value={creditNoteAmount}
                  onChange={(e) => setCreditNoteAmount(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  {t('finance.creditNote.reason', 'Adjustment Justification')} *
                </label>
                <textarea
                  rows={2}
                  required
                  value={creditNoteReason}
                  onChange={(e) => setCreditNoteReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreditNoteInvoice(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600"
                >
                  {t('finance.common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creditNoteMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {creditNoteMutation.isPending ? 'Posting...' : 'Commit Credit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Write-Off Modal */}
      {writeOffInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900 text-rose-700">
              {t('finance.writeOff.modalTitle', 'Authoritative Fee Write-Off')}
            </h3>
            <p className="text-xs text-zinc-500">
              Posts bad-debt adjustment for invoice{' '}
              <strong className="font-mono">{writeOffInvoice.invoiceNumber}</strong>.
            </p>

            <form onSubmit={handleWriteOffSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  {t('finance.writeOff.amount', 'Write-Off Amount (₹)')} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={writeOffInvoice.outstandingAmount}
                  required
                  value={writeOffAmount}
                  onChange={(e) => setWriteOffAmount(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  {t('finance.writeOff.reason', 'Audit Justification')} *
                </label>
                <textarea
                  rows={2}
                  required
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  placeholder="e.g. Uncollectible remainder approved by board"
                  className="w-full text-xs p-2.5 border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWriteOffInvoice(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600"
                >
                  {t('finance.common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={writeOffMutation.isPending}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {writeOffMutation.isPending ? 'Posting...' : 'Confirm Bad-Debt Write-Off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Create Single Student Fee Invoice */}
      {isSingleInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-zinc-900">Create Student Fee Invoice</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSingleInvoiceModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSingleInvoiceSubmit} className="space-y-4 text-xs">
              {/* Student Picker */}
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Select Student *
                </label>
                {singleSelectedStudent ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-emerald-950 text-xs">
                        {singleSelectedStudent.firstName} {singleSelectedStudent.lastName}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-mono">
                        ADM: {singleSelectedStudent.admissionNumber} {singleSelectedStudent.currentClass?.name ? `• ${singleSelectedStudent.currentClass.name}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSingleSelectedStudent(null)}
                      className="text-[11px] font-bold text-emerald-800 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search student name or admission #..."
                        value={singleStudentSearch}
                        onChange={(e) => setSingleStudentSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-zinc-300 rounded-lg text-xs"
                      />
                    </div>
                    {singleStudentList.length > 0 && (
                      <div className="border border-zinc-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-zinc-100 bg-zinc-50/50">
                        {singleStudentList.map((stu) => (
                          <div
                            key={stu.id}
                            onClick={() => {
                              setSingleSelectedStudent(stu);
                            }}
                            className="p-2 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-zinc-800">
                              {stu.firstName} {stu.lastName}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              ADM: {stu.admissionNumber}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Academic Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Academic Year *
                  </label>
                  <select
                    required
                    value={singleAcademicYearId}
                    onChange={(e) => setSingleAcademicYearId(e.target.value)}
                    className="w-full px-2.5 py-2 border border-zinc-300 rounded-lg text-xs"
                  >
                    <option value="">-- Year --</option>
                    {academicYears?.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={singleInvoiceDate}
                    onChange={(e) => setSingleInvoiceDate(e.target.value)}
                    className="w-full px-2.5 py-2 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={singleDueDate}
                    onChange={(e) => setSingleDueDate(e.target.value)}
                    className="w-full px-2.5 py-2 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Fee Line Items */}
              <div className="space-y-2 border-t border-b border-zinc-100 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-700 uppercase tracking-wider">
                    Fee Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSingleLine}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {singleLines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-zinc-50/60 p-2 rounded-lg border border-zinc-200/60">
                    <div className="col-span-5">
                      <select
                        required
                        value={l.feeHeadId}
                        onChange={(e) => {
                          const updated = [...singleLines];
                          updated[idx].feeHeadId = e.target.value;
                          const head = feeHeads?.find((h) => h.id === e.target.value);
                          if (head && !updated[idx].description) {
                            updated[idx].description = head.name;
                          }
                          setSingleLines(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white"
                      >
                        <option value="">-- Select Fee Head --</option>
                        {feeHeads?.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Description"
                        value={l.description}
                        onChange={(e) => {
                          const updated = [...singleLines];
                          updated[idx].description = e.target.value;
                          setSingleLines(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Amount (₹)"
                        value={l.rate}
                        onChange={(e) => {
                          const updated = [...singleLines];
                          updated[idx].rate = e.target.value;
                          setSingleLines(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-zinc-300 rounded-lg font-mono font-bold text-xs bg-white"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveSingleLine(idx)}
                        disabled={singleLines.length === 1}
                        className="text-zinc-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Total Preview */}
                <div className="flex justify-between items-center pt-2 px-1 text-xs">
                  <span className="font-bold text-zinc-600">Total Invoice Dues:</span>
                  <span className="font-mono font-black text-sm text-emerald-800">
                    ₹
                    {singleLines
                      .reduce((sum, l) => sum + (parseFloat(l.rate) || 0) * (l.quantity || 1), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSingleInvoiceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFeeInvoiceMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  {createFeeInvoiceMutation.isPending ? 'Generating...' : 'Issue Invoice & Post Dues'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default FeeInvoicesView;
