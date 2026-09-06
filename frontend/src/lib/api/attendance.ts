import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface SchoolHoliday {
  id: string;
  name: string;
  startDate: string;
  endDate?: string | null;
  type: 'PUBLIC_HOLIDAY' | 'SCHOOL_HOLIDAY' | 'VACATION' | 'EMERGENCY_CLOSURE' | 'OTHER';
  description?: string | null;
  isWorkingOverride: boolean;
  academicYearId: string;
}

export interface AttendanceRegisterStudent {
  studentId: string;
  enrollmentId: string;
  studentCode: string;
  admissionNumber: string;
  rollNumber?: string | null;
  name: string;
  gender: string;
  attendanceId?: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'EXCUSED' | 'LEAVE' | null;
  remarks?: string | null;
  isLocked: boolean;
  hasApprovedLeave: boolean;
  leaveType?: string | null;
}

export interface AttendanceRegister {
  date: string;
  academicYearId: string;
  classId: string;
  sectionId?: string | null;
  mode: string;
  dayStatus: {
    isWorkingDay: boolean;
    isHoliday: boolean;
    holidayName?: string;
    isWorkingOverride: boolean;
  };
  isLocked: boolean;
  isMarked: boolean;
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    excused: number;
    leave: number;
    unmarked: number;
  };
  items: AttendanceRegisterStudent[];
}

export interface StudentLeave {
  id: string;
  studentId: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
  leaveType: 'SICK' | 'FAMILY' | 'PERSONAL' | 'MEDICAL' | 'OTHER';
  reason: string;
  attachmentKey?: string | null;
  attachmentName?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requestedBy: string;
  isParentRequest: boolean;
  rejectionReason?: string | null;
  createdAt: string;
  student?: {
    id: string;
    studentId: string;
    admissionNumber: string;
    firstName: string;
    lastName?: string | null;
    displayName?: string | null;
  };
}

export interface StaffAttendanceRecord {
  id: string;
  userId: string;
  attendanceDate: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
  checkInAt?: string | null;
  checkOutAt?: string | null;
  checkInDistanceMeters?: number | null;
  checkOutDistanceMeters?: number | null;
  isManualCorrection: boolean;
  correctionReason?: string | null;
  remarks?: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
  };
}

export interface StaffLeave {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
  };
}

export interface AttendanceOverviewData {
  date: string;
  students: {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    excused: number;
    leave: number;
  };
  staff: {
    present: number;
    absent: number;
    late: number;
    leave: number;
  };
  pendingStudentLeaves: number;
  classes: {
    total: number;
    marked: number;
    unmarked: number;
  };
}

// 1. Overview
export function useAttendanceOverview(academicYearId?: string) {
  return useQuery<AttendanceOverviewData>({
    queryKey: ['attendance', 'overview', academicYearId],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/attendance/overview', {
        params: academicYearId ? { academicYearId } : {},
      });
      return res.data;
    },
  });
}

// 2. Holidays
export function useHolidays(academicYearId?: string) {
  return useQuery<SchoolHoliday[]>({
    queryKey: ['attendance', 'holidays', academicYearId],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/attendance/holidays', {
        params: academicYearId ? { academicYearId } : {},
      });
      return res.data;
    },
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<SchoolHoliday>) => {
      const res = await apiClient.post('/api/v1/attendance/holidays', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'holidays'] });
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SchoolHoliday> }) => {
      const res = await apiClient.patch(`/api/v1/attendance/holidays/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'holidays'] });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/api/v1/attendance/holidays/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'holidays'] });
    },
  });
}

// 3. Student Attendance Register
export function useStudentRegister(params: {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  date?: string;
  mode?: string;
}) {
  return useQuery<AttendanceRegister>({
    queryKey: ['attendance', 'register', params],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/attendance/students/register', {
        params,
      });
      return res.data;
    },
    enabled: Boolean(params.academicYearId && params.classId && params.date),
  });
}

export function useSaveStudentRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      academicYearId: string;
      classId: string;
      sectionId?: string | null;
      date: string;
      mode?: string;
      records: Array<{ studentId: string; status: string; remarks?: string | null }>;
    }) => {
      const res = await apiClient.post('/api/v1/attendance/students/register', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'register'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'overview'] });
    },
  });
}

export function useCorrectStudentAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      attendanceId,
      newStatus,
      reason,
    }: {
      attendanceId: string;
      newStatus: string;
      reason: string;
    }) => {
      const res = await apiClient.patch(`/api/v1/attendance/students/${attendanceId}/correct`, {
        newStatus,
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'register'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'summary'] });
    },
  });
}

export function useStudentSummary(studentId: string, month?: number, year?: number) {
  return useQuery({
    queryKey: ['attendance', 'summary', studentId, month, year],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/attendance/students/${studentId}/summary`, {
        params: { month, year },
      });
      return res.data;
    },
    enabled: Boolean(studentId),
  });
}

// 4. Student Leave
export function useStudentLeaves(params?: {
  studentId?: string;
  academicYearId?: string;
  status?: string;
}) {
  return useQuery<StudentLeave[]>({
    queryKey: ['attendance', 'student-leave', params],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/student-leave', { params });
      return res.data;
    },
  });
}

export function useCreateStudentLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      studentId: string;
      academicYearId?: string;
      startDate: string;
      endDate: string;
      leaveType: string;
      reason: string;
    }) => {
      const res = await apiClient.post('/api/v1/student-leave', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'student-leave'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'overview'] });
    },
  });
}

export function useReviewStudentLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      rejectionReason,
    }: {
      id: string;
      action: 'APPROVE' | 'REJECT';
      rejectionReason?: string | null;
    }) => {
      const res = await apiClient.post(`/api/v1/student-leave/${id}/review`, {
        action,
        rejectionReason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'student-leave'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'register'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'overview'] });
    },
  });
}

// 5. Staff Attendance & Geofence
export function useStaffAttendance(params?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}) {
  return useQuery<StaffAttendanceRecord[]>({
    queryKey: ['attendance', 'staff', params],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/staff-attendance', { params });
      return res.data;
    },
  });
}

export function useStaffCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { latitude: number; longitude: number; remarks?: string | null }) => {
      const res = await apiClient.post('/api/v1/staff-attendance/check-in', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'staff'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'overview'] });
    },
  });
}

export function useStaffCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { latitude?: number | null; longitude?: number | null; remarks?: string | null }) => {
      const res = await apiClient.post('/api/v1/staff-attendance/check-out', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'staff'] });
    },
  });
}

export function useManualStaffAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      date: string;
      status: string;
      reason: string;
      remarks?: string | null;
    }) => {
      const res = await apiClient.post('/api/v1/staff-attendance/manual', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'staff'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'overview'] });
    },
  });
}

// 6. Staff Leave
export function useStaffLeaves(params?: { userId?: string; status?: string }) {
  return useQuery<StaffLeave[]>({
    queryKey: ['attendance', 'staff-leave', params],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/staff-leave', { params });
      return res.data;
    },
  });
}

export function useCreateStaffLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      startDate: string;
      endDate: string;
      leaveType: string;
      reason: string;
    }) => {
      const res = await apiClient.post('/api/v1/staff-leave', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'staff-leave'] });
    },
  });
}

export function useReviewStaffLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      rejectionReason,
    }: {
      id: string;
      action: 'APPROVE' | 'REJECT';
      rejectionReason?: string | null;
    }) => {
      const res = await apiClient.post(`/api/v1/staff-leave/${id}/review`, {
        action,
        rejectionReason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'staff-leave'] });
    },
  });
}

// 7. Reports
export function useDailyReport(params: { date?: string; classId?: string; sectionId?: string }) {
  return useQuery({
    queryKey: ['attendance', 'reports', 'daily', params],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/attendance/reports/daily', { params });
      return res.data;
    },
    enabled: Boolean(params.date),
  });
}

export function useMonthlyReport(params: {
  month: number;
  year: number;
  classId?: string;
  sectionId?: string;
}) {
  return useQuery({
    queryKey: ['attendance', 'reports', 'monthly', params],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/attendance/reports/monthly', { params });
      return res.data;
    },
    enabled: Boolean(params.month && params.year),
  });
}

export async function downloadAttendanceCsv(params: {
  type: 'daily' | 'monthly';
  date?: string;
  month?: number;
  year?: number;
  classId?: string;
  sectionId?: string;
}) {
  const res = await apiClient.get('/api/v1/attendance/reports/export', {
    params,
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `attendance_${params.type}_${params.date || `${params.year}_${params.month}`}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
