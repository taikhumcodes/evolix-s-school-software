import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FinanceNav } from '../app/views/finance/FinanceNav';
import { FinanceOverview } from '../app/views/finance/FinanceOverview';
import { ReceiptPrintModal } from '../app/views/finance/ReceiptPrintModal';
import { StatementPrintModal } from '../app/views/finance/StatementPrintModal';
import { FeeCollectionView } from '../app/views/finance/FeeCollectionView';
import { FeeInvoicesView } from '../app/views/finance/FeeInvoicesView';
import { StudentFeesView } from '../app/views/finance/StudentFeesView';
import { ExpensesView } from '../app/views/finance/ExpensesView';
import { AccountsLedgerView } from '../app/views/finance/AccountsLedgerView';
import { BankingView } from '../app/views/finance/BankingView';
import { FinancialReportsView } from '../app/views/finance/FinancialReportsView';
import { ParentFinanceView } from '../app/views/finance/ParentFinanceView';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
  }),
}));

// Mock AuthContext
const mockHasPermission = vi.fn().mockReturnValue(true);
vi.mock('../core/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-admin', name: 'Finance Controller', role: 'ACCOUNTANT' },
    hasPermission: mockHasPermission,
  }),
}));

// Mock external module hooks
vi.mock('../lib/api/academic-years', () => ({
  useAcademicYears: () => ({
    data: [{ id: 'ay-1', name: '2026-2027', status: 'ACTIVE' }],
    isLoading: false,
  }),
}));

vi.mock('../lib/api/master-data', () => ({
  useClasses: () => ({
    data: [{ id: 'cls-1', name: 'Grade 10' }],
    isLoading: false,
  }),
  useFeeHeads: () => ({
    data: [{ id: 'fh-1', name: 'Tuition Fee', code: 'TUF' }],
    isLoading: false,
  }),
}));

// Mock Finance API data structures
const mockOverview = {
  feeDemand: '100000.00',
  totalCollected: '65000.00',
  totalOutstanding: '35000.00',
  totalOverdue: '12000.00',
  todayCollection: '15000.00',
  monthExpenses: '22000.00',
  cashBalance: '8500.00',
  bankBalance: '145000.00',
  netSurplus: '43000.00',
  collectionEfficiency: '65.0',
  collectionRate: 65.0,
  recentCollections: [
    {
      id: 'rec-1',
      receiptNumber: 'RCPT-2026-000001',
      student: { id: 's-1', firstName: 'Aarav', lastName: 'Sharma', admissionNumber: 'ADM-101' },
      paymentDate: '2026-09-05T10:00:00Z',
      amount: '5000.00',
      paymentMethod: 'CASH',
      status: 'VALID',
    },
  ],
};

const mockInvoices = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-000001',
    student: { id: 's-1', firstName: 'Aarav', lastName: 'Sharma', admissionNumber: 'ADM-101' },
    invoiceDate: '2026-09-01T00:00:00Z',
    dueDate: '2026-09-15T00:00:00Z',
    totalAmount: '10000.00',
    paidAmount: '4000.00',
    outstandingAmount: '6000.00',
    status: 'PARTIALLY_PAID',
    lines: [],
  },
];

const mockAccounts = [
  {
    id: 'acc-1',
    code: '1000',
    name: 'Cash in Hand',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    isSystem: true,
    isActive: true,
    children: [],
  },
  {
    id: 'acc-2',
    code: '4000',
    name: 'Tuition Fee Income',
    type: 'INCOME',
    normalBalance: 'CREDIT',
    isSystem: false,
    isActive: true,
    children: [],
  },
];

const mockBankAccounts = [
  {
    id: 'bank-1',
    bankName: 'HDFC Bank',
    accountName: 'School Main Current A/C',
    accountNumberMasked: '•••• 5432',
    ifscCode: 'HDFC0001234',
    isActive: true,
  },
];

const mockStudentLedger = {
  summary: {
    totalCharges: '10000.00',
    totalPaid: '4000.00',
    totalConcessions: '0.00',
    totalRefunds: '0.00',
    outstandingBalance: '6000.00',
    advanceBalance: '0.00',
    overdueAmount: '0.00',
  },
  entries: [
    {
      date: '2026-09-01T00:00:00Z',
      type: 'INVOICE',
      reference: 'INV-2026-000001',
      description: 'Term 1 Tuition Fee',
      debit: '10000.00',
      credit: '0.00',
      runningBalance: '10000.00',
    },
  ],
};

vi.mock('../lib/api/finance', () => ({
  useFinanceOverview: () => ({ data: mockOverview, isLoading: false, error: null }),
  useFeeInvoices: () => ({ data: { data: mockInvoices, total: 1 }, isLoading: false, refetch: vi.fn() }),
  useFeeReceipts: () => ({ data: { data: mockOverview.recentCollections, total: 1 }, isLoading: false, refetch: vi.fn() }),
  useAccounts: () => ({ data: mockAccounts, isLoading: false, refetch: vi.fn() }),
  useJournals: () => ({ data: { data: [], total: 0 }, isLoading: false, refetch: vi.fn() }),
  useCreateAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePostJournal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReverseJournal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBankAccounts: () => ({ data: mockBankAccounts, isLoading: false, refetch: vi.fn() }),
  useCreateBankTransfer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useImportBankStatement: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBankStatementLines: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
  useReconciliations: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
  useCloseReconciliation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReopenReconciliation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMatchStatementLine: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useExpenseBills: () => ({ data: { data: [], meta: { total: 0, pages: 1 } }, isLoading: false, refetch: vi.fn() }),
  useVendors: () => ({ data: [], isLoading: false }),
  useCreateExpenseBill: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateVendor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePayVendorExpense: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCollectFeePayment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReverseReceipt: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStudentLedger: () => ({ data: mockStudentLedger, isLoading: false, refetch: vi.fn() }),
  useBatchGenerateInvoices: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateFeeInvoice: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateBankAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useInitializeStandardAccounts: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateCreditNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useWriteOffInvoice: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateRefund: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTrialBalance: () => ({ data: { accounts: [], totalDebit: '0.00', totalCredit: '0.00', isBalanced: true }, isLoading: false }),
  useProfitAndLoss: () => ({ data: { incomeAccounts: [], expenseAccounts: [], totalIncome: '0.00', totalExpense: '0.00', netSurplus: '0.00' }, isLoading: false }),
  useBalanceSheet: () => ({ data: { assetAccounts: [], liabilityAccounts: [], equityAccounts: [], totalAssets: '0.00', totalLiabilities: '0.00', totalEquity: '0.00', totalLiabilitiesAndEquity: '0.00', isBalanced: true }, isLoading: false }),
  useAgingReport: () => ({ data: { summary: { current: '0.00', days30: '0.00', days60: '0.00', days90: '0.00', days90Plus: '0.00', total: '0.00' }, students: [] }, isLoading: false }),
  useParentChildFinance: () => ({
    data: {
      summary: mockStudentLedger.summary,
      invoices: mockInvoices,
      receipts: mockOverview.recentCollections,
      statement: mockStudentLedger.entries,
    },
    isLoading: false,
  }),
}));

describe('Major Module 07 — Finance & Accounting Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renders Finance top navigation tabs with proper routes and badges', () => {
    render(
      <MemoryRouter initialEntries={['/finance']}>
        <FinanceNav />
      </MemoryRouter>
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Student Ledger')).toBeInTheDocument();
    expect(screen.getByText('Fee Invoices')).toBeInTheDocument();
    expect(screen.getByText('Collections')).toBeInTheDocument();
    expect(screen.getByText('Expenses & Vendors')).toBeInTheDocument();
    expect(screen.getByText('Chart of Accounts & GL')).toBeInTheDocument();
    expect(screen.getByText('Banking & Reconciliation')).toBeInTheDocument();
    expect(screen.getByText('Financial Reports')).toBeInTheDocument();
  });

  it('2. Renders Finance Overview dashboard with factual financial metrics', () => {
    render(
      <MemoryRouter>
        <FinanceOverview />
      </MemoryRouter>
    );

    expect(screen.getByText('Fee Demand')).toBeInTheDocument();
    expect(screen.getByText('Total Collected')).toBeInTheDocument();
    expect(screen.getByText('Total Outstanding')).toBeInTheDocument();
    expect(screen.getByText('Fee Collection Efficiency')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('RCPT-2026-000001')).toBeInTheDocument();
  });

  it('3. Renders Fee Invoices register with invoice statuses and actions', () => {
    render(
      <MemoryRouter>
        <FeeInvoicesView />
      </MemoryRouter>
    );

    expect(screen.getByText('Batch Generate Invoices')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('PARTIALLY PAID')).toBeInTheDocument();
  });

  it('4. Renders Receipt Print Modal with official school layout and duplicate indicator', () => {
    const mockReceiptData = {
      receiptNumber: 'RCPT-2026-000001',
      paymentDate: '2026-09-05T10:00:00Z',
      amount: '5000.00',
      paymentMethod: 'CASH',
      referenceNumber: 'TXN-9871',
      student: { firstName: 'Aarav', lastName: 'Sharma', admissionNumber: 'ADM-101' },
      allocations: [
        {
          id: 'alloc-1',
          allocatedAmount: '4000.00',
          invoice: { invoiceNumber: 'INV-2026-000001' },
        },
      ],
      unappliedAdvanceAmount: '1000.00',
    };

    render(
      <ReceiptPrintModal
        isOpen={true}
        onClose={vi.fn()}
        receipt={mockReceiptData}
        isReprint={true}
      />
    );

    expect(screen.getByText('Official Fee Receipt')).toBeInTheDocument();
    expect(screen.getByText('DUPLICATE COPY / REPRINT')).toBeInTheDocument();
    expect(screen.getByText('RCPT-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('ADM-101')).toBeInTheDocument();
    expect(screen.getByText('CASH')).toBeInTheDocument();
  });

  it('5. Renders Statement Print Modal with student financial ledger', () => {
    const student = { id: 's-1', firstName: 'Aarav', lastName: 'Sharma', admissionNumber: 'ADM-101', studentId: 'STU-101' };

    render(
      <StatementPrintModal
        isOpen={true}
        onClose={vi.fn()}
        student={student}
        ledger={mockStudentLedger}
      />
    );

    expect(screen.getByText('STUDENT FINANCIAL ACCOUNT STATEMENT')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Term 1 Tuition Fee')).toBeInTheDocument();
  });

  it('6. Renders Student Fees View with running balance ledger and search input', () => {
    render(
      <MemoryRouter>
        <StudentFeesView />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Search student name, admission number, or ID...')).toBeInTheDocument();
  });

  it('7. Renders Fee Collection view terminal', () => {
    render(
      <MemoryRouter>
        <FeeCollectionView />
      </MemoryRouter>
    );

    expect(screen.getByText('Find Student Account')).toBeInTheDocument();
    expect(screen.getByText('Fee Receipt Register')).toBeInTheDocument();
  });

  it('8. Renders Expenses view with expense vouchers and vendor tabs', () => {
    render(
      <MemoryRouter>
        <ExpensesView />
      </MemoryRouter>
    );

    expect(screen.getByText('Expense Bills & Vouchers')).toBeInTheDocument();
    expect(screen.getByText('Vendor Master')).toBeInTheDocument();
    expect(screen.getByText('Record Expense Bill')).toBeInTheDocument();
  });

  it('9. Renders Chart of Accounts and General Ledger view', () => {
    render(
      <MemoryRouter>
        <AccountsLedgerView />
      </MemoryRouter>
    );

    expect(screen.getByText('Chart of Accounts')).toBeInTheDocument();
    expect(screen.getByText('General Ledger Journal Register')).toBeInTheDocument();
    expect(screen.getByText('Cash in Hand')).toBeInTheDocument();
    expect(screen.getByText('Tuition Fee Income')).toBeInTheDocument();
  });

  it('10. Renders Banking view with masked account numbers and transfer action', () => {
    render(
      <MemoryRouter>
        <BankingView />
      </MemoryRouter>
    );

    expect(screen.getByText('Bank Accounts')).toBeInTheDocument();
    expect(screen.getByText('Internal Transfers')).toBeInTheDocument();
    expect(screen.getByText('Bank Statement & Reconciliation')).toBeInTheDocument();
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    expect(screen.getByText('•••• 5432')).toBeInTheDocument();
  });

  it('11. Renders Financial Reports view with Trial Balance and CSV Export', () => {
    render(
      <MemoryRouter>
        <FinancialReportsView />
      </MemoryRouter>
    );

    expect(screen.getByText('Trial Balance')).toBeInTheDocument();
    expect(screen.getByText('Profit & Loss (P&L)')).toBeInTheDocument();
    expect(screen.getByText('Balance Sheet')).toBeInTheDocument();
    expect(screen.getByText('Receivable Aging')).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('12. Renders Parent Finance View with linked child fee dues', () => {
    render(
      <MemoryRouter>
        <ParentFinanceView />
      </MemoryRouter>
    );

    expect(screen.getByText('Parent Fee & Dues Portal')).toBeInTheDocument();
  });
});
