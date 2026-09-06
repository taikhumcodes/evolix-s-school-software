import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HrNav } from '../app/views/hr/HrNav';
import { HrOverview } from '../app/views/hr/HrOverview';
import { EmployeesDirectory } from '../app/views/hr/EmployeesDirectory';
import { SalarySetup } from '../app/views/hr/SalarySetup';
import { PayrollTerminal } from '../app/views/hr/PayrollTerminal';
import { PayslipsView } from '../app/views/hr/PayslipsView';
import { HrSettings } from '../app/views/hr/HrSettings';

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
    user: { id: 'u-admin', name: 'HR Admin', isSuperadmin: true },
    hasPermission: mockHasPermission,
  }),
}));

// Mock HR API
vi.mock('../lib/api/hr', () => ({
  useHrOverview: () => ({
    data: {
      totalEmployees: 42,
      activeEmployees: 38,
      probationEmployees: 3,
      onLeaveEmployees: 1,
      departmentsCount: 6,
      designationsCount: 12,
      recentEmployees: [],
    },
    isLoading: false,
    error: null,
  }),
  useEmployees: () => ({
    data: {
      data: [
        {
          id: 'emp-1',
          employeeNumber: 'EMP-2026-000001',
          displayName: 'Amit Sharma',
          gender: 'MALE',
          contactNumber: '+91 98765 43210',
          employmentStatus: 'ACTIVE',
          department: { name: 'Mathematics' },
          designation: { name: 'Senior Teacher' },
          bankAccounts: [
            {
              id: 'bank-1',
              bankName: 'State Bank of India',
              maskedAccountNumber: '•••• 4821',
              ifscCode: 'SBIN0001234',
              isPrimary: true,
            },
          ],
        },
      ],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    },
    isLoading: false,
  }),
  useDepartments: () => ({
    data: [{ id: 'dept-1', name: 'Mathematics', code: 'MATH' }],
    isLoading: false,
  }),
  useDesignations: () => ({
    data: [{ id: 'desig-1', name: 'Senior Teacher', code: 'SR_TCH' }],
    isLoading: false,
  }),
  useStaffLeaveTypes: () => ({
    data: [
      {
        id: 'lt-1',
        name: 'Casual Leave',
        code: 'CL',
        annualQuota: 12,
        carryForwardMax: 4,
        isUnpaid: false,
      },
    ],
    isLoading: false,
  }),
  useCreateEmployee: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateStaffLeaveType: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useAllocateLeave: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useEmployee: () => ({
    data: null,
    isLoading: false,
  }),
  useEmployeeLeaveBalances: () => ({
    data: [],
    isLoading: false,
  }),
  useLeaveBalanceHistory: () => ({
    data: [],
    isLoading: false,
  }),
  useSetEmployeeBankAccount: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// Mock Payroll API
vi.mock('../lib/api/payroll', () => ({
  usePayrollConfig: () => ({
    data: {
      id: 'cfg-1',
      payrollFrequency: 'MONTHLY',
      salaryProrationBasis: 'CALENDAR_DAYS',
      payrollPayableAccountId: 'acc-pay',
      salaryExpenseClearingAccountId: 'acc-exp',
      autoPostToFinance: false,
      payslipVisibilityState: 'POSTED',
    },
    isLoading: false,
  }),
  useUpdatePayrollConfig: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSalaryComponents: () => ({
    data: [
      {
        id: 'comp-1',
        name: 'Basic Salary',
        code: 'BASIC',
        type: 'EARNING',
        calculationType: 'FLAT',
        affectsGross: true,
        glAccount: { code: 'EXP-5001', name: 'Teaching Salary Expense' },
      },
      {
        id: 'comp-2',
        name: 'Provident Fund (Employee)',
        code: 'PF_EMP',
        type: 'DEDUCTION',
        calculationType: 'PERCENTAGE_OF_COMPONENT',
        affectsGross: false,
        glAccount: { code: 'LIA-2001', name: 'Provident Fund Payable' },
      },
    ],
    isLoading: false,
  }),
  useCreateSalaryComponent: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSalaryStructures: () => ({
    data: [
      {
        id: 'str-1',
        name: 'Senior Teaching Band',
        code: 'STR_TCH_SR',
        components: [
          {
            id: 'sc-1',
            salaryComponent: { name: 'Basic Salary', type: 'EARNING' },
            calculationType: 'FLAT',
            flatAmount: 30000,
          },
        ],
      },
    ],
    isLoading: false,
  }),
  useCreateSalaryStructure: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePayrollPeriods: () => ({
    data: [
      {
        id: 'per-1',
        periodName: 'September 2026',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        payDate: '2026-10-05',
        status: 'OPEN',
      },
    ],
    isLoading: false,
  }),
  useCreatePayrollPeriod: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePayrollRuns: () => ({
    data: [
      {
        id: 'run-1',
        runNumber: 'PR-2026-000001',
        runType: 'REGULAR',
        status: 'POSTED',
        version: 3,
        totalGross: 36000,
        totalDeductions: 3000,
        totalNetPay: 33000,
        employeeCount: 1,
        period: { periodName: 'September 2026', payDate: '2026-10-05' },
      },
    ],
    isLoading: false,
  }),
  usePayrollRun: () => ({
    data: {
      id: 'run-1',
      runNumber: 'PR-2026-000001',
      runType: 'REGULAR',
      status: 'POSTED',
      version: 3,
      totalGross: 36000,
      totalDeductions: 3000,
      totalNetPay: 33000,
      employeeCount: 1,
      period: { periodName: 'September 2026', payDate: '2026-10-05' },
      employees: [
        {
          id: 're-1',
          employeeId: 'emp-1',
          employee: {
            id: 'emp-1',
            employeeNumber: 'EMP-2026-000001',
            displayName: 'Amit Sharma',
          },
          workingDays: 30,
          lossOfPayDays: 0,
          grossEarnings: 36000,
          totalDeductions: 3000,
          employerContributions: 3000,
          netPay: 33000,
          paidAmount: 0,
          remainingPayable: 33000,
          paymentStatus: 'UNPAID',
        },
      ],
    },
    isLoading: false,
  }),
  useCreatePayrollRun: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCalculatePayrollRun: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdatePayrollRunStatus: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostPayrollRun: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useReversePayrollRun: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDisbursePayrollPayment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePayslip: () => ({
    data: {
      id: 're-1',
      runNumber: 'PR-2026-000001',
      periodName: 'September 2026',
      payDate: '2026-10-05',
      employee: {
        id: 'emp-1',
        employeeNumber: 'EMP-2026-000001',
        displayName: 'Amit Sharma',
        department: 'Mathematics',
        designation: 'Senior Teacher',
      },
      attendance: {
        workingDays: 30,
        presentDays: 30,
        paidLeaveDays: 0,
        lossOfPayDays: 0,
      },
      earnings: [
        { id: 'e-1', componentName: 'Basic Salary', amount: 30000 },
        { id: 'e-2', componentName: 'House Rent Allowance', amount: 6000 },
      ],
      deductions: [{ id: 'd-1', componentName: 'Provident Fund', amount: 3000 }],
      employerContributions: [{ id: 'ec-1', componentName: 'Employer PF', amount: 3000 }],
      grossEarnings: 36000,
      totalDeductions: 3000,
      netPay: 33000,
      bankAccount: {
        bankName: 'State Bank of India',
        maskedAccountNumber: '•••• 4821',
      },
      paymentStatus: 'UNPAID',
    },
    isLoading: false,
    error: null,
  }),
}));

// Mock Finance API
vi.mock('../lib/api/finance', () => ({
  useAccounts: () => ({
    data: [
      { id: 'acc-pay', code: 'LIA-2001', name: 'Payroll Payable', type: 'LIABILITY' },
      { id: 'acc-exp', code: 'EXP-5001', name: 'Teaching Salary Expense', type: 'EXPENSE' },
    ],
    isLoading: false,
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Module 08 HR & Payroll Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders HrNav with all required tabs', () => {
    render(<HrNav />, { wrapper: createWrapper() });
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Staff Directory')).toBeDefined();
    expect(screen.getByText('Leave Policies & Ledger')).toBeDefined();
    expect(screen.getByText('Salary Components & Structures')).toBeDefined();
    expect(screen.getByText('Payroll Processing')).toBeDefined();
    expect(screen.getByText('Payslips & Self-Service')).toBeDefined();
    expect(screen.getByText('HR & GL Settings')).toBeDefined();
  });

  it('renders HrOverview with stats and action hub', () => {
    render(<HrOverview />, { wrapper: createWrapper() });
    expect(screen.getByText('HR & Payroll Command Center')).toBeDefined();
    expect(screen.getByText('Total Staff')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
    expect(screen.getByText('Active Staff')).toBeDefined();
    expect(screen.getByText('38')).toBeDefined();
    expect(screen.getByText('Payroll Integrity Active')).toBeDefined();
  });

  it('renders EmployeesDirectory with masked bank account numbers', () => {
    render(<EmployeesDirectory />, { wrapper: createWrapper() });
    expect(screen.getAllByText('Staff Directory').length).toBeGreaterThan(0);
    expect(screen.getByText('Amit Sharma')).toBeDefined();
    expect(screen.getByText('EMP-2026-000001')).toBeDefined();
    // Verify bank account masking (•••• 4821)
    expect(screen.getByText('•••• 4821')).toBeDefined();
    expect(screen.getByText('State Bank of India')).toBeDefined();
  });

  it('renders SalarySetup with cycle detection notices and GL mapping', () => {
    render(<SalarySetup />, { wrapper: createWrapper() });
    expect(screen.getAllByText('Salary Components & Structures').length).toBeGreaterThan(0);
    expect(screen.getByText(/Payroll Rule & Cycle Protection Active/i)).toBeDefined();
    expect(screen.getByText('Basic Salary')).toBeDefined();
    expect(screen.getByText('BASIC')).toBeDefined();
    expect(screen.getByText('EXP-5001')).toBeDefined();
  });

  it('renders PayrollTerminal with run status and gross/net calculations', () => {
    render(<PayrollTerminal />, { wrapper: createWrapper() });
    expect(screen.getByText('Payroll Processing Terminal')).toBeDefined();
    expect(screen.getAllByText('PR-2026-000001').length).toBeGreaterThan(0);
    expect(screen.getByText('Status: POSTED')).toBeDefined();
    expect(screen.getAllByText('Gross Earnings').length).toBeGreaterThan(0);
    expect(screen.getByText('Net Payable')).toBeDefined();
  });

  it('renders PayslipsView compliant with finalized run states and earnings breakdown', () => {
    render(<PayslipsView />, { wrapper: createWrapper() });
    expect(screen.getByText('Payslip Generation & Audit')).toBeDefined();
    expect(screen.getByText('EVOLIX SCHOOL ERP')).toBeDefined();
    expect(screen.getByText('Basic Salary')).toBeDefined();
    expect(screen.getByText('House Rent Allowance')).toBeDefined();
    expect(screen.getByText('Provident Fund')).toBeDefined();
    expect(screen.getByText('•••• 4821')).toBeDefined();
  });

  it('renders HrSettings with proration and GL accounts', () => {
    render(<HrSettings />, { wrapper: createWrapper() });
    expect(screen.getByText('Payroll & General Ledger Rules')).toBeDefined();
    expect(screen.getByText('Calculation & Proration Rules')).toBeDefined();
    expect(screen.getByText('Module 07 Financial Account Mapping')).toBeDefined();
  });
});
