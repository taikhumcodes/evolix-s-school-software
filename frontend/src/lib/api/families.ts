import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface FamilySibling {
  id: string;
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  photoStorageKey?: string | null;
  currentClass?: string | null;
  currentSection?: string | null;
  rollNumber?: string | null;
}

export interface FamilyMemberGuardian {
  id: string;
  role: string;
  guardian: {
    id: string;
    firstName: string;
    lastName: string;
    relationship: string;
    phone: string;
    email?: string | null;
    user?: {
      id: string;
      email: string;
      isActive: boolean;
    } | null;
  };
}

export interface Family {
  id: string;
  familyNumber: string;
  familyName: string;
  primaryGuardianId?: string | null;
  primaryGuardianName?: string | null;
  primaryGuardian?: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    phone: string;
    email?: string | null;
    relationship: string;
  } | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  notes?: string | null;
  guardiansCount?: number;
  studentsCount?: number;
  studentNames?: string[];
  guardians?: FamilyMemberGuardian[];
  students?: any[];
  siblings?: FamilySibling[];
  createdAt: string;
  updatedAt: string;
}

export interface FamiliesListResponse {
  data: Family[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useFamilies(params: { page?: number; limit?: number; search?: string }) {
  return useQuery<FamiliesListResponse>({
    queryKey: ['families', params],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/families', { params });
      return res.data;
    },
  });
}

export function useFamily(id: string | undefined) {
  return useQuery<Family>({
    queryKey: ['families', id],
    queryFn: async () => {
      if (!id) throw new Error('Family ID is required');
      const res = await apiClient.get(`/api/v1/families/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      familyName: string;
      primaryGuardianId?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string;
      notes?: string | null;
      guardianIds?: string[];
      studentIds?: string[];
    }) => {
      const res = await apiClient.post('/api/v1/families', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['guardians', 'overview'] });
    },
  });
}

export function useUpdateFamily(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/api/v1/families/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', id] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useAddFamilyMember(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { memberType: 'STUDENT' | 'GUARDIAN'; memberId: string; role?: string }) => {
      const res = await apiClient.post(`/api/v1/families/${familyId}/members`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useRemoveFamilyMember(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { memberType: 'STUDENT' | 'GUARDIAN'; memberId: string }) => {
      const res = await apiClient.delete(`/api/v1/families/${familyId}/members`, { data: payload });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}
