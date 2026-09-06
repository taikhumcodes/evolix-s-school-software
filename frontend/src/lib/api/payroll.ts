import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface SalaryComponent {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
  calculationType: 'FLAT' | 'PERCENTAGE_OF_COMPONENT' | 'FORMULA' | 'ATTENDANCE_PRORATED';
  dependsOnComponentId?: string | null;
  dependsOnComponent?: SalaryComponent | null;
  percentageRate?: number | null;
  formulaExpression?: string | null;
  glAccountId: string;
  glAccount?: { id: string; code: string; name: string } | null;
  isTaxable: boolean;
  isStatutory: boolean;
  affectsGross: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface SalaryStructure {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  components: Array<{
    id: string;
    salaryComponentId: string;
    salaryComponent: SalaryComponent;
    calculationType: string;
    flatAmount?: number | null;
    percentageRate?: number | null;
    displayOrder: number;
  }>;
}

export interface SalaryAssignment {
  id: string;
  employeeId: string;
  employee?: { id: string; employeeNumber: string; displayName: string } | null;
  salaryStructureId: string;
  salaryStructure: SalaryStructure;
  baseSalary: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt: string;
}

export interface PayrollPeriod {
  id: string;
  financialYearId: string;
  periodName: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
  payDate: string;
  status: 'UPCOMING' | 'OPEN' | 'PROCESSING' | 'COMPLETED' | 'CLOSED';
}

export interface PayrollRun {
  id: string;
  periodId: string;
  period: PayrollPeriod;
  runNumber: string;
  runType: 'REGULAR' | 'ADJUSTMENT' | 'OFF_CYCLE';
  status: 'DRAFT' | 'PROCESSING' | 'REVIEWED' | 'APPROVED' | 'POSTED' | 'PAID' | 'CLOSED' | 'REVERSED';
  version: number;
  totalGross: number;
  totalDeductions: number;
  totalEmployerContributions: number;
  totalNetPay: number;
  employeeCount: number;
  journalEntryId?: string | null;
  journalEntry?: any | null;
  reversalJournalEntryId?: string | null;
  reversalReason?: string | null;
  remarks?: string | null;
  employees: PayrollRunEmployee[];
  createdAt: string;
  approvedAt?: string | null;
  postedAt?: string | null;
}

export interface PayrollRunEmployee {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employee: {
    id: string;
    employeeNumber: string;
    displayName: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
    bankAccounts?: any[];
  };
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  lossOfPayDays: number;
  grossEarnings: number;
  totalDeductions: number;
  employerContributions: number;
  netPay: number;
  paidAmount: number;
  remainingPayable: number;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  lineItems: PayrollLineItem[];
}

export interface PayrollLineItem {
  id: string;
  salaryComponentId: string;
  componentName: string;
  componentCode: string;
  componentType: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
  amount: number;
  glAccountId: string;
}

export interface PayrollConfig {
  id: string;
  payrollFrequency: string;
  salaryProrationBasis: string;
  payrollPayableAccountId?: string | null;
  salaryExpenseClearingAccountId?: string | null;
  taxClearingAccountId?: string | null;
  pfClearingAccountId?: string | null;
  esiClearingAccountId?: string | null;
  autoPostToFinance: boolean;
  payslipVisibilityState: string;
}

export function usePayrollConfig() {
  return useQuery<PayrollConfig>({
    queryKey: ['payroll', 'config'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/config');
      return res.data;
    },
  });
}

export function useUpdatePayrollConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.put('/payroll/config', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', 'config'] });
    },
  });
}

export function useSalaryComponents() {
  return useQuery<SalaryComponent[]>({
    queryKey: ['payroll', 'salary-components'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/salary-components');
      return res.data;
    },
  });
}

export function useCreateSalaryComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/payroll/salary-components', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', 'salary-components'] });
    },
  });
}

export function useSalaryStructures() {
  return useQuery<SalaryStructure[]>({
    queryKey: ['payroll', 'salary-structures'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/salary-structures');
      return res.data;
    },
  });
}

export function useCreateSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/payroll/salary-structures', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', 'salary-structures'] });
    },
  });
}

export function useAssignSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/payroll/salary-assignments', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] });
    },
  });
}

export function usePayrollPeriods() {
  return useQuery<PayrollPeriod[]>({
    queryKey: ['payroll', 'periods'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/periods');
      return res.data;
    },
  });
}

export function useCreatePayrollPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/payroll/periods', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', 'periods'] });
    },
  });
}

export function usePayrollRuns(params?: { periodId?: string; status?: string }) {
  return useQuery<PayrollRun[]>({
    queryKey: ['payroll', 'runs', params],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/runs', { params });
      return res.data;
    },
  });
}

export function usePayrollRun(id: string) {
  return useQuery<PayrollRun>({
    queryKey: ['payroll', 'runs', id],
    queryFn: async () => {
      const res = await apiClient.get(`/payroll/runs/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/payroll/runs', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', 'runs'] });
    },
  });
}

export function useCalculatePayrollRun(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: { employeeIds?: string[] }) => {
      const res = await apiClient.post(`/payroll/runs/${runId}/calculate`, payload || {});
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', 'runs'] });
      qc.invalidateQueries({ queryKey: ['payroll', 'runs', runId] });
    },
  });
}

export function useUpdatePayrollRunStatus(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { status: string; version: number; remarks?: string }) => {
      const res = await apiClient.put(`/payroll/runs/${runId}/status`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', 'runs'] });
      qc.invalidateQueries({ queryKey: ['payroll', 'runs', runId] });
    },
  });
}

export function usePostPayrollRun(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { version: number; remarks?: string }) => {
      const res = await apiClient.post(`/payroll/runs/${runId}/post`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', 'runs'] });
      qc.invalidateQueries({ queryKey: ['payroll', 'runs', runId] });
      qc.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function useReversePayrollRun(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { version: number; reversalReason: string }) => {
      const res = await apiClient.post(`/payroll/runs/${runId}/reverse`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', 'runs'] });
      qc.invalidateQueries({ queryKey: ['payroll', 'runs', runId] });
      qc.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function useDisbursePayrollPayment(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      paymentDate: string;
      paymentMode: string;
      paymentAccountId: string;
      allocations: Array<{ employeeId: string; amount: number }>;
      remarks?: string;
    }) => {
      const res = await apiClient.post(`/payroll/runs/${runId}/disburse`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', 'runs'] });
      qc.invalidateQueries({ queryKey: ['payroll', 'runs', runId] });
      qc.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function usePayslip(employeeOrRunEmployeeId: string, payrollRunId?: string) {
  return useQuery<any>({
    queryKey: ['payroll', 'payslips', employeeOrRunEmployeeId, payrollRunId],
    queryFn: async () => {
      const res = await apiClient.get(`/payroll/payslips/${employeeOrRunEmployeeId}`, {
        params: payrollRunId ? { payrollRunId } : undefined,
      });
      return res.data;
    },
    enabled: Boolean(employeeOrRunEmployeeId),
  });
}

export function useMyPayslips() {
  return useQuery<any[]>({
    queryKey: ['payroll', 'my-payslips'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/my-payslips');
      return res.data;
    },
  });
}
