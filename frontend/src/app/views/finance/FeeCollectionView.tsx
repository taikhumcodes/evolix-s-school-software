import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Receipt,
  CreditCard,
  CheckCircle2,
  Printer,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  X,
  Users,
  Loader2,
  RefreshCw,
  Plus,
  FileText,
} from 'lucide-react';
import { FinanceNav } from './FinanceNav';
import {
  useAccounts,
  useFeeReceipts,
  useCollectFeePayment,
  useReverseReceipt,
  useStudentLedger,
  FeeReceipt,
  useFeeInvoices,
  useCreateFeeInvoice,
} from '../../../lib/api/finance';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { useFeeHeads } from '../../../lib/api/master-data';
import { ReceiptPrintModal } from './ReceiptPrintModal';
import { useToast } from '../../../components/ui/Toast';
import apiClient from '../../../lib/api-client';

export const FeeCollectionView: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Form State
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [receivingAccountId, setReceivingAccountId] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [chequeBankName, setChequeBankName] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Modals
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [activeReceiptForPrint, setActiveReceiptForPrint] = useState<FeeReceipt | null>(null);
  const [isReprint, setIsReprint] = useState(false);
  const [reverseModalReceipt, setReverseModalReceipt] = useState<FeeReceipt | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [isChequeBounce, setIsChequeBounce] = useState(false);

  // Quick Fee Invoice Modal (to add dues to selected student)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceAcademicYearId, setInvoiceAcademicYearId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDueDate, setInvoiceDueDate] = useState(
    new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [invoiceLines, setInvoiceLines] = useState<Array<{ feeHeadId: string; description: string; rate: string; quantity: number; concession: string }>>([
    { feeHeadId: '', description: '', rate: '', quantity: 1, concession: '0' },
  ]);

  const currentSchoolId = localStorage.getItem('selected_school_id') || '';
  const { data: academicYears } = useAcademicYears(currentSchoolId);
  const { data: feeHeads } = useFeeHeads(currentSchoolId);
  const createFeeInvoiceMutation = useCreateFeeInvoice();

  useEffect(() => {
    if (isInvoiceModalOpen && academicYears && academicYears.length > 0 && !invoiceAcademicYearId) {
      setInvoiceAcademicYearId(academicYears[0].id);
    }
  }, [isInvoiceModalOpen, academicYears, invoiceAcademicYearId]);

  const handleAddInvoiceLine = () => {
    setInvoiceLines([...invoiceLines, { feeHeadId: '', description: '', rate: '', quantity: 1, concession: '0' }]);
  };

  const handleRemoveInvoiceLine = (idx: number) => {
    if (invoiceLines.length > 1) {
      setInvoiceLines(invoiceLines.filter((_, i) => i !== idx));
    }
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !invoiceAcademicYearId) {
      toast.warning('Please select an academic year.', 'Academic Year Required');
      return;
    }
    const validLines = invoiceLines.filter((l) => l.feeHeadId && parseFloat(l.rate) > 0);
    if (validLines.length === 0) {
      toast.warning('Please select a fee head and enter an amount greater than ₹0.', 'Fee Line Required');
      return;
    }
    try {
      const created = await createFeeInvoiceMutation.mutateAsync({
        studentId: selectedStudent.id,
        academicYearId: invoiceAcademicYearId,
        invoiceDate,
        dueDate: invoiceDueDate,
        lines: validLines.map((l) => ({
          feeHeadId: l.feeHeadId,
          description: l.description.trim() || undefined,
          rate: parseFloat(l.rate),
          quantity: l.quantity || 1,
          concession: parseFloat(l.concession || '0'),
        })),
      });

      toast.success(
        `Invoice ${created.invoiceNumber} (₹${created.totalAmount}) generated and posted to GL. Dues are now ready for collection!`,
        'Fee Invoice Issued'
      );
      setIsInvoiceModalOpen(false);
      setInvoiceLines([{ feeHeadId: '', description: '', rate: '', quantity: 1, concession: '0' }]);
      refetchInvoices();
      refetchLedger();
      setPaymentAmount(created.totalAmount);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create fee invoice');
    }
  };

  // Queries
  const { data: accounts } = useAccounts('ASSET');
  const { data: openInvoicesData, refetch: refetchInvoices } = useFeeInvoices(
    selectedStudent ? { studentId: selectedStudent.id, status: 'POSTED' } : undefined
  );
  const { data: receiptsData, refetch: refetchReceipts } = useFeeReceipts(1);
  const { data: ledgerData, refetch: refetchLedger } = useStudentLedger(
    selectedStudent?.id || ''
  );

  const collectMutation = useCollectFeePayment();
  const reverseMutation = useReverseReceipt();

  const cashAndBankAccounts =
    accounts?.filter((a) => a.code.startsWith('10') || a.type === 'ASSET') || [];

  // Auto-fetch students roster on mount and upon search query
  const fetchStudents = useCallback(async (query = '') => {
    setIsLoadingStudents(true);
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
      setStudents(list);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  }, []);

  // Fetch initial students roster on mount
  useEffect(() => {
    fetchStudents('');
  }, [fetchStudents]);

  // Debounced search as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchStudents]);

  // Auto-suggest receiving account & dues amount when student is selected
  useEffect(() => {
    if (selectedStudent) {
      if (!receivingAccountId && cashAndBankAccounts.length > 0) {
        setReceivingAccountId(cashAndBankAccounts[0].id);
      }
      const dues = parseFloat(ledgerData?.summary?.outstandingBalance || '0');
      if (dues > 0 && (!paymentAmount || paymentAmount === '0')) {
        setPaymentAmount(dues.toFixed(2));
      }
    }
  }, [selectedStudent, ledgerData, cashAndBankAccounts, receivingAccountId, paymentAmount]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(searchQuery);
  };

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    if (!receivingAccountId && cashAndBankAccounts.length > 0) {
      setReceivingAccountId(cashAndBankAccounts[0].id);
    }
    toast.info(
      `${student.firstName} ${student.lastName} (ADM: ${student.admissionNumber}) selected.`,
      'Student Account Selected'
    );
  };

  const handleVerifyClick = () => {
    if (!selectedStudent) {
      toast.warning(
        'Please select a student from the left panel before collecting fees.',
        'Student Selection Required'
      );
      return;
    }
    const amt = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amt) || amt <= 0) {
      toast.warning(
        'Please enter a valid collection amount greater than ₹0.',
        'Collection Amount Required'
      );
      return;
    }
    if (!receivingAccountId) {
      toast.warning(
        'Please select a receiving Cash or Bank account.',
        'Receiving Account Required'
      );
      return;
    }
    setIsConfirmOpen(true);
  };

  // Submit payment
  const handleConfirmPayment = async () => {
    if (!selectedStudent || !paymentAmount || !receivingAccountId) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;

    // Simple oldest-first allocation against open invoices
    let remaining = amt;
    const allocations: Array<{ invoiceId: string; allocatedAmount: number }> = [];

    if (openInvoicesData?.data) {
      for (const inv of openInvoicesData.data) {
        if (remaining <= 0) break;
        const outstanding = parseFloat(inv.outstandingAmount);
        const alloc = Math.min(remaining, outstanding);
        allocations.push({ invoiceId: inv.id, allocatedAmount: alloc });
        remaining -= alloc;
      }
    }

    try {
      const result = await collectMutation.mutateAsync({
        studentId: selectedStudent.id,
        receivingAccountId,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod,
        totalAmount: amt,
        referenceNumber: referenceNumber || undefined,
        chequeNumber: chequeNumber || undefined,
        chequeDate: chequeDate || undefined,
        chequeBankName: chequeBankName || undefined,
        remarks: remarks || undefined,
        allocations: allocations.length > 0 ? allocations : undefined,
      });

      setIsConfirmOpen(false);
      setPaymentAmount('');
      setReferenceNumber('');
      setChequeNumber('');
      setChequeDate('');
      setChequeBankName('');
      setRemarks('');

      refetchInvoices();
      refetchLedger();
      refetchReceipts();

      toast.success(
        `Receipt ${result.receipt?.receiptNumber || ''} generated successfully for ₹${amt.toFixed(2)}`,
        'Fee Payment Collected'
      );

      if (result.receipt) {
        setActiveReceiptForPrint(result.receipt);
        setIsReprint(false);
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || 'Payment processing failed',
        'Payment Failed'
      );
    }
  };

  // Reverse receipt
  const handleReverseSubmit = async () => {
    if (!reverseModalReceipt || !reverseReason.trim()) return;
    try {
      await reverseMutation.mutateAsync({
        receiptId: reverseModalReceipt.id,
        reason: reverseReason.trim(),
        isBouncedCheque: isChequeBounce,
      });
      setReverseModalReceipt(null);
      setReverseReason('');
      setIsChequeBounce(false);
      refetchReceipts();
      refetchInvoices();
      refetchLedger();
      toast.success('Fee receipt reversed successfully and invoice balance restored.', 'Receipt Reversed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to reverse receipt', 'Reversal Failed');
    }
  };

  return (
    <div className="space-y-6">
      <FinanceNav />

      {/* Main Cashier Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student Lookup & Fee Status (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Student Search Box */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-mehndi-600" />
                <span>{t('finance.collection.searchStudent', 'Find Student Account')}</span>
              </h2>
              {students.length > 0 && (
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {students.length} active
                </span>
              )}
            </div>

            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={t(
                    'finance.collection.searchPlaceholder',
                    'Search name, student ID, admission #...'
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-3 pr-8 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mehndi-500 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      fetchStudents('');
                    }}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoadingStudents}
                className="px-3.5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1 shrink-0"
              >
                {isLoadingStudents ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('finance.common.search', 'Search')}
              </button>
            </form>
          </div>

          {/* Selected Student Account Summary Card (if selected) */}
          {selectedStudent && (
            <div className="bg-white border-2 border-emerald-500/80 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
                    {selectedStudent.firstName?.[0] || 'S'}{selectedStudent.lastName?.[0] || ''}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-zinc-900 truncate">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Selected
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono truncate">
                      ADM: {selectedStudent.admissionNumber} {selectedStudent.studentId ? `• ID: ${selectedStudent.studentId}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-2 py-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-md transition-colors shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Outstanding Balance Badges */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                    {t('finance.collection.totalOutstanding', 'Total Dues')}
                  </span>
                  <span className="text-lg font-black text-amber-900 font-mono mt-0.5 block">
                    ₹{ledgerData?.summary?.outstandingBalance || '0.00'}
                  </span>
                </div>
                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">
                    {t('finance.collection.advanceBalance', 'Advance Credit')}
                  </span>
                  <span className="text-lg font-black text-teal-900 font-mono mt-0.5 block">
                    ₹{ledgerData?.summary?.advanceBalance || '0.00'}
                  </span>
                </div>
              </div>

              {/* Open Invoices List */}
              <div>
                <h4 className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>{t('finance.collection.openInvoices', 'Pending Fee Invoices')}</span>
                  {openInvoicesData?.data && openInvoicesData.data.length > 0 && (
                    <span className="text-[10px] text-zinc-500">({openInvoicesData.data.length})</span>
                  )}
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {openInvoicesData?.data && openInvoicesData.data.length > 0 ? (
                    openInvoicesData.data.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-2 rounded-lg border border-zinc-200 text-xs flex items-center justify-between bg-zinc-50/70"
                      >
                        <div>
                          <span className="font-mono font-bold text-zinc-900 text-[11px]">{inv.invoiceNumber}</span>
                          <span className="block text-[10px] text-zinc-500">
                            Due: {new Date(inv.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-rose-700 block text-xs">
                            ₹{inv.outstandingAmount}
                          </span>
                          <span className="block text-[10px] text-zinc-400">
                            Total: ₹{inv.totalAmount}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-2.5 px-3 bg-zinc-50 rounded-lg border border-dashed border-zinc-200 text-center space-y-1.5">
                      <p className="text-[11px] text-zinc-500">
                        {t('finance.collection.noOpenInvoices', 'No open pending invoices for this student.')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsInvoiceModalOpen(true)}
                        className="px-2.5 py-1 text-[11px] font-bold text-mehndi-700 bg-mehndi-50 border border-mehndi-200 hover:bg-mehndi-100 rounded-md inline-flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Issue Fee Invoice to Add Dues</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Student Roster / Search Results List */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>{searchQuery ? 'Search Results' : 'Students Roster'}</span>
              </h3>
              <button
                type="button"
                onClick={() => fetchStudents(searchQuery)}
                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 flex items-center gap-1"
                title="Refresh Roster"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingStudents ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingStudents ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-2.5 rounded-lg border border-zinc-100 bg-zinc-50 animate-pulse flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-zinc-200 rounded w-1/3" />
                      <div className="h-2 bg-zinc-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : students.length > 0 ? (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 divide-y divide-zinc-50">
                {students.map((stu) => {
                  const isSelected = selectedStudent?.id === stu.id;
                  const initials = `${stu.firstName?.[0] || 'S'}${stu.lastName?.[0] || ''}`;
                  return (
                    <div
                      key={stu.id}
                      onClick={() => handleSelectStudent(stu)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500/30 shadow-xs'
                          : 'border-zinc-200/80 bg-white hover:border-mehndi-400 hover:bg-mehndi-50/40 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate">
                            {stu.firstName} {stu.lastName}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono truncate">
                            ADM: {stu.admissionNumber} {stu.currentClass?.name ? `• ${stu.currentClass.name}` : stu.enrollments?.[0]?.class?.name ? `• ${stu.enrollments[0].class.name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2">
                        {isSelected ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Selected
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="text-[11px] font-bold text-mehndi-700 bg-mehndi-50 hover:bg-mehndi-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <span>Select</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-zinc-500 text-xs border border-dashed border-zinc-200 rounded-xl space-y-2">
                <p>No students found matching "{searchQuery}".</p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      fetchStudents('');
                    }}
                    className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cashier Payment Entry Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-mehndi-600" />
                <span>{t('finance.collection.paymentEntry', 'Fee Collection Terminal')}</span>
              </h2>
              <span className="text-[11px] font-bold text-zinc-500">
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            {/* Status Notice Banner */}
            {selectedStudent ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    Active collection for <strong>{selectedStudent.firstName} {selectedStudent.lastName}</strong> ({selectedStudent.admissionNumber})
                  </span>
                </div>
                {parseFloat(ledgerData?.summary?.outstandingBalance || '0') > 0 ? (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(ledgerData?.summary?.outstandingBalance || '')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors shrink-0 ml-2"
                  >
                    Fill Dues: ₹{ledgerData?.summary?.outstandingBalance}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-zinc-500 font-medium">₹0 Outstanding</span>
                    <button
                      type="button"
                      onClick={() => setIsInvoiceModalOpen(true)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Dues / Issue Invoice</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Step 1:</strong> Select a student from the list on the left to link this collection. Terminal inputs below are unlocked and ready for entry.
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Amount */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    {t('finance.collection.amountToCollect', 'Collection Amount (₹)')} *
                  </label>
                  {selectedStudent && parseFloat(ledgerData?.summary?.outstandingBalance || '0') > 0 && (
                    <span className="text-[11px] text-amber-700 font-mono font-bold">
                      Dues: ₹{ledgerData?.summary?.outstandingBalance}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-base font-mono font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mehndi-500 bg-white"
                  />
                </div>
                {/* Quick amount suggestion chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPaymentAmount(amt.toString())}
                      className="px-2 py-0.5 text-[10px] font-bold font-mono bg-zinc-100 hover:bg-mehndi-100 hover:text-mehndi-900 text-zinc-600 rounded border border-zinc-200 transition-colors"
                    >
                      ₹{amt.toLocaleString()}
                    </button>
                  ))}
                  {selectedStudent && parseFloat(ledgerData?.summary?.outstandingBalance || '0') > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(ledgerData?.summary?.outstandingBalance || '')}
                      className="px-2 py-0.5 text-[10px] font-bold font-mono bg-amber-100 hover:bg-amber-200 text-amber-900 rounded border border-amber-300 transition-colors"
                    >
                      All Dues
                    </button>
                  )}
                </div>
              </div>

              {/* Receiving Account */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  {t('finance.collection.receivingAccount', 'Receiving Account')} *
                </label>
                <select
                  value={receivingAccountId}
                  onChange={(e) => setReceivingAccountId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mehndi-500 font-medium bg-white"
                >
                  <option value="">{t('finance.common.selectAccount', '-- Select Cash / Bank Account --')}</option>
                  {cashAndBankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} &bull; {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  {t('finance.collection.paymentMethod', 'Payment Mode')} *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mehndi-500 font-bold bg-white"
                >
                  <option value="CASH">CASH</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="CHEQUE">CHEQUE / DEMAND DRAFT</option>
                  <option value="CARD">DEBIT / CREDIT CARD (POS)</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  {t('finance.collection.referenceNumber', 'Txn Reference #')}
                </label>
                <input
                  type="text"
                  placeholder="UTR / UPI Ref / POS Receipt #"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mehndi-500 font-mono bg-white"
                />
              </div>
            </div>

            {/* Cheque Details conditional section */}
            {paymentMethod === 'CHEQUE' && (
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                  {t('finance.collection.chequeDetails', 'Cheque Instrument Details')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      {t('finance.collection.chequeNumber', 'Cheque No')} *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 000421"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-zinc-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      {t('finance.collection.chequeDate', 'Cheque Date')}
                    </label>
                    <input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-zinc-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      {t('finance.collection.chequeBank', 'Drawer Bank')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={chequeBankName}
                      onChange={(e) => setChequeBankName(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-zinc-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                {t('finance.collection.remarks', 'Collection Remarks (Optional)')}
              </label>
              <input
                type="text"
                placeholder="e.g. Received via father at main fee counter"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mehndi-500 bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setPaymentAmount('');
                  setReferenceNumber('');
                  setRemarks('');
                }}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                {t('finance.common.reset', 'Reset')}
              </button>
              <button
                type="button"
                disabled={collectMutation.isPending}
                onClick={handleVerifyClick}
                className="flex items-center gap-2 px-6 py-2.5 bg-mehndi-600 hover:bg-mehndi-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-mehndi-600/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {collectMutation.isPending
                    ? t('finance.collection.processing', 'Processing...')
                    : t('finance.collection.confirmAndCollect', 'Verify & Collect Payment')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal before recording money movement */}
      {isConfirmOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-mehndi-100 flex items-center justify-center text-mehndi-700 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-900">
                  {t('finance.collection.verifyTitle', 'Confirm Fee Collection')}
                </h3>
                <p className="text-xs text-zinc-500">
                  {t('finance.collection.verifySubtitle', 'High-risk monetary posting into General Ledger')}
                </p>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">{t('finance.receipt.student', 'Student')}:</span>
                <span className="font-bold text-zinc-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{t('finance.receipt.amount', 'Amount')}:</span>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  ₹{parseFloat(paymentAmount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{t('finance.receipt.method', 'Payment Mode')}:</span>
                <span className="font-bold text-zinc-800">{paymentMethod}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
              >
                {t('finance.common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="px-5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {t('finance.collection.confirmCommit', 'Commit Collection & Generate Receipt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Previously Issued Receipts Table */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              {t('finance.collection.receiptRegister', 'Fee Receipt Register')}
            </h2>
            <p className="text-xs text-zinc-500">
              {t('finance.collection.receiptRegisterSub', 'Authoritative list of posted student receipts')}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">{t('finance.receipt.receiptNumber', 'Receipt #')}</th>
                <th className="py-3 px-4">{t('finance.receipt.student', 'Student')}</th>
                <th className="py-3 px-4">{t('finance.receipt.date', 'Date')}</th>
                <th className="py-3 px-4">{t('finance.receipt.method', 'Payment Mode')}</th>
                <th className="py-3 px-4 text-right">{t('finance.receipt.amount', 'Amount (₹)')}</th>
                <th className="py-3 px-4 text-center">{t('finance.receipt.status', 'Status')}</th>
                <th className="py-3 px-4 text-right">{t('finance.common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {receiptsData?.data && receiptsData.data.length > 0 ? (
                receiptsData.data.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900">{r.receiptNumber}</td>
                    <td className="py-3 px-4 font-medium text-zinc-800">
                      {r.studentSnapshot?.name}
                      <span className="block text-[10px] text-zinc-400 font-mono">
                        {r.studentSnapshot?.admissionNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {new Date(r.receiptDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700">
                        {r.feePayment?.paymentMethod || r.breakdownSnapshot?.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                      ₹{r.breakdownSnapshot?.totalAmount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.isCancelled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          {t('finance.status.reversed', 'REVERSED')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {t('finance.status.valid', 'VALID')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReceiptForPrint(r);
                            setIsReprint(true);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{t('finance.common.reprint', 'Print')}</span>
                        </button>
                        {!r.isCancelled && (
                          <button
                            type="button"
                            onClick={() => setReverseModalReceipt(r)}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t('finance.common.reverse', 'Reverse')}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400">
                    {t('finance.collection.noReceipts', 'No receipts recorded yet.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      {reverseModalReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-900">
                  {t('finance.reversal.title', 'Reverse Fee Receipt')}
                </h3>
                <p className="text-xs text-zinc-500">
                  {t('finance.reversal.warning', 'Restores invoice dues and posts opposite reversal journal.')}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  {t('finance.reversal.reasonLabel', 'Mandatory Reversal Reason')} *
                </label>
                <textarea
                  rows={2}
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder={t(
                    'finance.reversal.reasonPlaceholder',
                    'e.g. Cashier typo or cheque returned unpaid'
                  )}
                  className="w-full text-xs p-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bouncedChequeCheck"
                  checked={isChequeBounce}
                  onChange={(e) => setIsChequeBounce(e.target.checked)}
                  className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="bouncedChequeCheck" className="text-xs font-medium text-zinc-700">
                  {t('finance.reversal.isBouncedCheque', 'Mark this transaction as Bounced Cheque')}
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReverseModalReceipt(null);
                  setReverseReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
              >
                {t('finance.common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={!reverseReason.trim() || reverseMutation.isPending}
                onClick={handleReverseSubmit}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {reverseMutation.isPending
                  ? t('finance.reversal.processing', 'Reversing...')
                  : t('finance.reversal.confirm', 'Confirm Reversal')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Fee Invoice Modal */}
      {isInvoiceModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-zinc-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-mehndi-600" />
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    Issue Fee Invoice &amp; Add Dues
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Generate an authoritative fee invoice for {selectedStudent.firstName} {selectedStudent.lastName} (ADM: {selectedStudent.admissionNumber})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Academic Year *
                  </label>
                  <select
                    required
                    value={invoiceAcademicYearId}
                    onChange={(e) => setInvoiceAcademicYearId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="">-- Select Academic Year --</option>
                    {academicYears?.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_current ? '(Current)' : ''}
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
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white"
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
                    onClick={handleAddInvoiceLine}
                    className="text-mehndi-700 hover:text-mehndi-800 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line</span>
                  </button>
                </div>

                {invoiceLines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-5">
                      <select
                        required
                        value={l.feeHeadId}
                        onChange={(e) => {
                          const updated = [...invoiceLines];
                          updated[idx].feeHeadId = e.target.value;
                          setInvoiceLines(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white"
                      >
                        <option value="">-- Fee Head --</option>
                        {feeHeads?.map((fh) => (
                          <option key={fh.id} value={fh.id}>
                            {fh.name} ({fh.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="Description (Optional)"
                        value={l.description}
                        onChange={(e) => {
                          const updated = [...invoiceLines];
                          updated[idx].description = e.target.value;
                          setInvoiceLines(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Rate ₹"
                        value={l.rate}
                        onChange={(e) => {
                          const updated = [...invoiceLines];
                          updated[idx].rate = e.target.value;
                          setInvoiceLines(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg font-mono font-bold bg-white"
                      />
                    </div>

                    <div className="sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveInvoiceLine(idx)}
                        disabled={invoiceLines.length === 1}
                        className="text-zinc-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <X className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
                <span className="font-bold text-zinc-700 uppercase tracking-wider">
                  Total Invoice Dues:
                </span>
                <span className="text-base font-extrabold font-mono text-mehndi-800">
                  ₹{invoiceLines
                    .reduce((acc, l) => acc + (parseFloat(l.rate) || 0) * (l.quantity || 1) - (parseFloat(l.concession) || 0), 0)
                    .toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 font-semibold text-zinc-600 hover:text-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFeeInvoiceMutation.isPending}
                  className="px-5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createFeeInvoiceMutation.isPending ? 'Generating & Posting...' : 'Generate & Post Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <ReceiptPrintModal
        isOpen={!!activeReceiptForPrint}
        receipt={activeReceiptForPrint}
        onClose={() => setActiveReceiptForPrint(null)}
        isReprint={isReprint}
      />
    </div>
  );
};
export default FeeCollectionView;
