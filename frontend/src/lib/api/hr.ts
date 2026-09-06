import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Employee {
  id: string;
  tenantId: string;
  schoolId: string;
  userId?: string | null;
  employeeNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  displayName: string;
  gender: string;
  dateOfBirth?: string | null;
  contactNumber?: string | null;
  emergencyContact?: string | null;
  address?: string | null;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'PROBATION';
  employmentStatus: 'ACTIVE' | 'PROBATION' | 'NOTICE_PERIOD' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED' | 'RETIRED';
  joiningDate: string;
  confirmationDate?: string | null;
  resignationDate?: string | null;
  relievingDate?: string | null;
  noticePeriodDays: number;
  departmentId?: string | null;
  designationId?: string | null;
  department?: { id: string; name: string; code: string } | null;
  designation?: { id: string; name: string; code: string } | null;
  bankAccounts?: EmployeeBankAccount[];
  salaryAssignments?: any[];
  leaveBalances?: any[];
  user?: { id: string; email: string } | null;
}

export interface EmployeeBankAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  branchName?: string | null;
  maskedAccountNumber: string;
  ifscCode: string;
  accountType: string;
  isPrimary: boolean;
  isVerified: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  headOfDepartmentId?: string | null;
  isActive: boolean;
  _count?: { employees: number };
}

export interface Designation {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  level: number;
  isActive: boolean;
  _count?: { employees: number };
}

export interface StaffLeaveType {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  annualQuota: number;
  carryForwardMax: number;
  isEncashable: boolean;
  isUnpaid: boolean;
  requiresApproval: boolean;
  isActive: boolean;
}

export interface EmployeeLeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType: StaffLeaveType;
  entitlementPeriod: string;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  carryForwardDays: number;
  closingBalance: number;
}

export interface LeaveBalanceTransaction {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType: StaffLeaveType;
  entitlementPeriod: string;
  transactionType: string;
  days: number;
  balanceAfter: number;
  sourceType: string;
  sourceId: string;
  remarks?: string | null;
  createdAt: string;
}

export interface HrOverviewMetrics {
  totalEmployees: number;
  activeEmployees: number;
  probationEmployees: number;
  onLeaveEmployees: number;
  departmentsCount: number;
  designationsCount: number;
  recentEmployees: any[];
}

export function useHrOverview() {
  return useQuery<HrOverviewMetrics>({
    queryKey: ['hr', 'overview'],
    queryFn: async () => {
      const res = await apiClient.get('/hr/overview');
      return res.data;
    },
  });
}

export function useEmployees(params?: {
  departmentId?: string;
  designationId?: string;
  employmentStatus?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<{ data: Employee[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }>({
    queryKey: ['hr', 'employees', params],
    queryFn: async () => {
      const res = await apiClient.get('/hr/employees', { params });
      return res.data;
    },
  });
}

export function useEmployee(id: string) {
  return useQuery<Employee>({
    queryKey: ['hr', 'employees', id],
    queryFn: async () => {
      const res = await apiClient.get(`/hr/employees/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/hr/employees', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] });
      qc.invalidateQueries({ queryKey: ['hr', 'overview'] });
    },
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.put(`/hr/employees/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] });
      qc.invalidateQueries({ queryKey: ['hr', 'employees', id] });
    },
  });
}

export function useSetEmployeeBankAccount(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post(`/hr/employees/${employeeId}/bank-account`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'employees', employeeId] });
    },
  });
}

export function useDepartments(schoolId?: string) {
  return useQuery<Department[]>({
    queryKey: ['hr', 'departments', schoolId],
    queryFn: async () => {
      const res = await apiClient.get('/hr/departments', {
        params: schoolId ? { school_id: schoolId } : undefined,
      });
      return res.data;
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/hr/departments', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'departments'] });
    },
  });
}

export function useDesignations(schoolId?: string) {
  return useQuery<Designation[]>({
    queryKey: ['hr', 'designations', schoolId],
    queryFn: async () => {
      const res = await apiClient.get('/hr/designations', {
        params: schoolId ? { school_id: schoolId } : undefined,
      });
      return res.data;
    },
  });
}

export function useCreateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/hr/designations', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'designations'] });
    },
  });
}

export function useStaffLeaveTypes() {
  return useQuery<StaffLeaveType[]>({
    queryKey: ['hr', 'leave-types'],
    queryFn: async () => {
      const res = await apiClient.get('/hr/leave-types');
      return res.data;
    },
  });
}

export function useCreateStaffLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/hr/leave-types', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'leave-types'] });
    },
  });
}

export function useEmployeeLeaveBalances(employeeId: string) {
  return useQuery<EmployeeLeaveBalance[]>({
    queryKey: ['hr', 'employees', employeeId, 'leave-balances'],
    queryFn: async () => {
      const res = await apiClient.get(`/hr/employees/${employeeId}/leave-balances`);
      return res.data;
    },
    enabled: Boolean(employeeId),
  });
}

export function useLeaveBalanceHistory(employeeId: string) {
  return useQuery<LeaveBalanceTransaction[]>({
    queryKey: ['hr', 'employees', employeeId, 'leave-history'],
    queryFn: async () => {
      const res = await apiClient.get(`/hr/employees/${employeeId}/leave-history`);
      return res.data;
    },
    enabled: Boolean(employeeId),
  });
}

export function useAllocateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/hr/leave-allocations', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] });
    },
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leaveId, remarks }: { leaveId: string; remarks?: string }) => {
      const res = await apiClient.post(`/hr/leaves/${leaveId}/approve`, { remarks });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] });
    },
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leaveId, reason }: { leaveId: string; reason?: string }) => {
      const res = await apiClient.post(`/hr/leaves/${leaveId}/cancel`, { reason });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] });
    },
  });
}
