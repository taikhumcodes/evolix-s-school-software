import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface FinanceOverviewMetrics {
  feeDemand: string;
  totalCollected: string;
  totalOutstanding: string;
  totalOverdue: string;
  collectionRate: number;
  todayCollection: string;
  monthCollection: string;
  monthExpenses: string;
  cashBalance: string;
  bankBalance: string;
  netSurplus: string;
}

export interface FinancialYear {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED';
}

export interface AccountingPeriod {
  id: string;
  tenantId: string;
  schoolId: string;
  financialYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
  closedAt?: string | null;
  reopenReason?: string | null;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  normalBalance: 'DEBIT' | 'CREDIT';
  parentAccountId?: string | null;
  parentAccount?: Account | null;
  description?: string | null;
  isSystemAccount: boolean;
  systemMapping?: string | null;
  isActive: boolean;
  currentBalance?: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  account?: Account;
  description: string;
  debit: string;
  credit: string;
  studentId?: string | null;
  vendorId?: string | null;
}

export interface JournalEntry {
  id: string;
  journalNumber: string;
  postingDate: string;
  description: string;
  sourceType: string;
  sourceId?: string | null;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  postedAt?: string;
  reversedAt?: string | null;
  lines: JournalLine[];
}

export interface FeeInvoiceLine {
  id: string;
  feeHeadId: string;
  feeHead?: { id: string; name: string; code: string };
  description: string;
  rate: string;
  quantity: number;
  amount: string;
  concessionAmount: string;
  netAmount: string;
}

export interface FeeInvoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  student?: {
    id: string;
    studentId: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    enrollments?: Array<{ class: { name: string }; section?: { name: string } }>;
  };
  invoiceDate: string;
  dueDate: string;
  subtotal: string;
  concessionTotal: string;
  lateFeeAmount: string;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  status: 'DRAFT' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'REVERSED';
  lines: FeeInvoiceLine[];
}

export interface FeeReceipt {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  isCancelled: boolean;
  cancelReason?: string | null;
  studentSnapshot: {
    studentId: string;
    name: string;
    admissionNumber: string;
  };
  breakdownSnapshot: {
    totalAmount: string;
    allocatedAmount: string;
    advanceAmount: string;
    paymentMethod: string;
  };
  feePayment: {
    id: string;
    paymentMethod: string;
    transactionReference?: string | null;
    chequeNumber?: string | null;
    bankName?: string | null;
    status: string;
    receivingAccount?: Account;
    allocations: Array<{
      feeInvoiceId: string;
      allocatedAmount: string;
      feeInvoice: FeeInvoice;
    }>;
  };
}

export interface StudentLedgerEntry {
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface StudentLedgerResponse {
  summary: {
    totalCharges: string;
    totalPaid: string;
    totalConcessions: string;
    totalRefunds: string;
    outstandingBalance: string;
    advanceBalance: string;
    overdueAmount: string;
  };
  entries: StudentLedgerEntry[];
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  bankDetails?: string | null;
  isActive: boolean;
}

export interface ExpenseBill {
  id: string;
  billNumber: string;
  vendorId?: string | null;
  vendor?: Vendor | null;
  billDate: string;
  dueDate?: string | null;
  description: string;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  status: 'DRAFT' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'REVERSED';
  lines: Array<{
    id: string;
    description: string;
    amount: string;
    account?: Account;
    expenseHead?: { id: string; name: string };
  }>;
}

export interface BankAccount {
  id: string;
  accountId: string;
  account?: Account;
  bankName: string;
  accountDisplayName: string;
  accountNumberMasked: string;
  ifscCode?: string | null;
  branchName?: string | null;
  isActive: boolean;
}

export interface BankStatementLine {
  id: string;
  transactionDate: string;
  description: string;
  referenceNumber?: string | null;
  debit: string;
  credit: string;
  balanceAfter?: string | null;
  reconciliationStatus: 'UNMATCHED' | 'MATCHED' | 'IGNORED';
  matchedJournalLineId?: string | null;
}

export interface BankReconciliationRecord {
  id: string;
  bankAccountId: string;
  bankAccount?: BankAccount;
  periodStartDate: string;
  periodEndDate: string;
  closingBalanceBank: string;
  closingBalanceBook: string;
  status: 'DRAFT' | 'CLOSED';
  closedAt?: string | null;
  reopenedAt?: string | null;
}

// =========================================================================
// HOOKS
// =========================================================================

export const useFinanceOverview = () => {
  return useQuery<FinanceOverviewMetrics>({
    queryKey: ['finance-overview'],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/overview');
      return data;
    },
  });
};

export const useFinancialYears = () => {
  return useQuery<FinancialYear[]>({
    queryKey: ['finance-financial-years'],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/financial-years');
      return data;
    },
  });
};

export const useCreateFinancialYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; startDate: string; endDate: string }) => {
      const { data } = await apiClient.post('/finance/financial-years', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-financial-years'] });
    },
  });
};

export const useAccountingPeriods = (financialYearId?: string) => {
  return useQuery<AccountingPeriod[]>({
    queryKey: ['finance-accounting-periods', financialYearId],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/accounting-periods', {
        params: { financialYearId },
      });
      return data;
    },
  });
};

export const useClosePeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { data } = await apiClient.post(`/finance/accounting-periods/${periodId}/close`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-accounting-periods'] });
    },
  });
};

export const useReopenPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, reason }: { periodId: string; reason: string }) => {
      const { data } = await apiClient.post(`/finance/accounting-periods/${periodId}/reopen`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-accounting-periods'] });
    },
  });
};

export const useAccounts = (type?: string) => {
  return useQuery<Account[]>({
    queryKey: ['finance-accounts', type],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/accounts', {
        params: { type },
      });
      return data;
    },
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/finance/accounts', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
    },
  });
};

export const useJournals = (page: number = 1, limit: number = 20) => {
  return useQuery<{ data: JournalEntry[]; meta: { total: number; pages: number } }>({
    queryKey: ['finance-journals', page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/journals', { params: { page, limit } });
      return data;
    },
  });
};

export const usePostJournal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/finance/journals', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-journals'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    },
  });
};

export const useReverseJournal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ journalId, reason }: { journalId: string; reason: string }) => {
      const { data } = await apiClient.post(`/finance/journals/${journalId}/reverse`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-journals'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
    },
  });
};

export const useFeeInvoices = (filters?: { studentId?: string; status?: string; page?: number }) => {
  return useQuery<{ data: FeeInvoice[]; meta: { total: number; pages: number } }>({
    queryKey: ['finance-invoices', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/invoices', { params: filters });
      return data;
    },
  });
};

export const useCreateFeeInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/finance/invoices', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    },
  });
};

export const useBatchGenerateInvoices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/finance/invoices/batch-generate', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    },
  });
};

export const useFeeReceipts = (page: number = 1, studentId?: string) => {
  return useQuery<{ data: FeeReceipt[]; meta: { total: number; pages: number } }>({
    queryKey: ['finance-receipts', page, studentId],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/collections/receipts', {
        params: { page, studentId },
      });
      return data;
    },
  });
};

export const useCollectFeePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const idempotencyKey = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const { data } = await apiClient.post('/finance/collections/pay', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
    },
  });
};

export const useReverseReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ receiptId, reason, isBouncedCheque }: { receiptId: string; reason: string; isBouncedCheque?: boolean }) => {
      const { data } = await apiClient.post(`/finance/collections/receipts/${receiptId}/reverse`, {
        reason,
        isBouncedCheque: !!isBouncedCheque,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    },
  });
};

export const useStudentLedger = (studentId: string) => {
  return useQuery<StudentLedgerResponse>({
    queryKey: ['student-ledger', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/finance/students/${studentId}/ledger`);
      return data;
    },
    enabled: !!studentId,
  });
};

export const useCreateCreditNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/finance/credit-notes', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
    },
  });
};

export const useWriteOffInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, amount, reason }: { invoiceId: string; amount: number; reason: string }) => {
      const { data } = await apiClient.post(`/finance/invoices/${invoiceId}/write-off`, { amount, reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
    },
  });
};

export const useCreateRefund = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/finance/refunds', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
    },
  });
};

export const useVendors = () => {
  return useQuery<Vendor[]>({
    queryKey: ['finance-vendors'],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/vendors');
      return data;
    },
  });
};

export const useCreateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/finance/vendors', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-vendors'] });
    },
  });
};

export const useExpenseBills = (page: number = 1) => {
  return useQuery<{ data: ExpenseBill[]; meta: { total: number; pages: number } }>({
    queryKey: ['finance-expenses', page],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/expenses', { params: { page } });
      return data;
    },
  });
};

export const useCreateExpenseBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/finance/expenses', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    },
  });
};

export const usePayVendorExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const idempotencyKey = `VPAY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const { data } = await apiClient.post('/finance/expenses/pay', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    },
  });
};

export const useBankAccounts = () => {
  return useQuery<BankAccount[]>({
    queryKey: ['finance-bank-accounts'],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/banking/accounts');
      return data;
    },
  });
};

export const useCreateBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      accountId: string;
      bankName: string;
      accountDisplayName: string;
      accountNumber: string;
      ifscCode?: string | null;
      branchName?: string | null;
    }) => {
      const { data } = await apiClient.post('/finance/banking/accounts', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    },
  });
};

export const useInitializeStandardAccounts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/finance/accounts/initialize-defaults');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    },
  });
};

export const useCreateBankTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/finance/banking/transfers', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
    },
  });
};

export const useImportBankStatement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/finance/banking/statements/import', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-bank-statements'] });
    },
  });
};

export const useBankStatementLines = (bankAccountId: string) => {
  return useQuery<BankStatementLine[]>({
    queryKey: ['finance-bank-statements', bankAccountId],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/banking/statements/lines', {
        params: { bankAccountId },
      });
      return data;
    },
    enabled: !!bankAccountId,
  });
};

export const useReconciliations = (bankAccountId?: string) => {
  return useQuery<BankReconciliationRecord[]>({
    queryKey: ['finance-reconciliations', bankAccountId],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/banking/reconciliation', {
        params: { bankAccountId },
      });
      return data;
    },
  });
};

export const useMatchStatementLine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { statementLineId: string; journalLineId: string }) => {
      const { data } = await apiClient.post('/finance/banking/reconciliation/match', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-bank-statements'] });
    },
  });
};

export const useCloseReconciliation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/finance/banking/reconciliation/close', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-reconciliations'] });
    },
  });
};

export const useReopenReconciliation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await apiClient.post(`/finance/banking/reconciliation/${id}/reopen`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-reconciliations'] });
    },
  });
};

export const useTrialBalance = () => {
  return useQuery<{
    accounts: Array<{
      id: string;
      code: string;
      name: string;
      type: string;
      openingBalance: string;
      totalDebit: string;
      totalCredit: string;
      closingBalance: string;
    }>;
    totalDebit: string;
    totalCredit: string;
    isBalanced: boolean;
  }>({
    queryKey: ['finance-trial-balance'],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/reports/trial-balance');
      return data;
    },
  });
};

export const useProfitAndLoss = () => {
  return useQuery<{
    incomeAccounts: Array<{ id: string; code: string; name: string; amount: string }>;
    expenseAccounts: Array<{ id: string; code: string; name: string; amount: string }>;
    totalIncome: string;
    totalExpense: string;
    netSurplus: string;
  }>({
    queryKey: ['finance-profit-and-loss'],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/reports/profit-and-loss');
      return data;
    },
  });
};

export const useBalanceSheet = () => {
  return useQuery<{
    assetAccounts: Array<{ id: string; code: string; name: string; amount: string }>;
    liabilityAccounts: Array<{ id: string; code: string; name: string; amount: string }>;
    equityAccounts: Array<{ id: string; code: string; name: string; amount: string }>;
    totalAssets: string;
    totalLiabilities: string;
    totalEquity: string;
    totalLiabilitiesAndEquity: string;
    isBalanced: boolean;
  }>({
    queryKey: ['finance-balance-sheet'],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/reports/balance-sheet');
      return data;
    },
  });
};

export const useAgingReport = (classId?: string) => {
  return useQuery<{
    summary: { current: string; days30: string; days60: string; days90: string; days90Plus: string; total: string };
    students: Array<{
      studentId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      current: string;
      days30: string;
      days60: string;
      days90: string;
      days90Plus: string;
      total: string;
    }>;
  }>({
    queryKey: ['finance-aging', classId],
    queryFn: async () => {
      const { data } = await apiClient.get('/finance/reports/aging', { params: { classId } });
      return data;
    },
  });
};

export const useParentChildFinance = (studentId: string) => {
  return useQuery<{
    summary: {
      totalCharges: string;
      totalPaid: string;
      totalConcessions: string;
      totalRefunds: string;
      outstandingBalance: string;
      advanceBalance: string;
      overdueAmount: string;
    };
    invoices: FeeInvoice[];
    receipts: FeeReceipt[];
    statement: StudentLedgerEntry[];
  }>({
    queryKey: ['parent-child-finance', studentId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/finance/parent/student/${studentId}`);
      return data;
    },
    enabled: !!studentId,
  });
};
