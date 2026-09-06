import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface GuardianChild {
  studentId: string;
  code: string;
  admissionNumber: string;
  name: string;
  status: string;
  relationship: string;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  hasPickupPermission: boolean;
  livesWithStudent: boolean;
  currentClass?: string | null;
  currentSection?: string | null;
}

export interface GuardianFamily {
  id: string;
  familyNumber: string;
  familyName: string;
  role: string;
}

export interface GuardianDocument {
  id: string;
  documentType: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNotes?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface GuardianNote {
  id: string;
  category: string;
  content: string;
  isConfidential: boolean;
  createdAt: string;
}

export interface Guardian {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  relationship: string;
  phone: string;
  normalizedPhone: string;
  altPhone?: string | null;
  email?: string | null;
  normalizedEmail?: string | null;
  occupation?: string | null;
  employer?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  preferredLanguage: 'en' | 'hi' | 'hinglish';
  emailNotification: boolean;
  smsNotification: boolean;
  whatsappNotification: boolean;
  emergencyContactPreference: 'PHONE' | 'EMAIL' | 'SMS';
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  userId?: string | null;
  hasPortalAccess: boolean;
  childrenCount?: number;
  children?: GuardianChild[];
  families?: GuardianFamily[];
  students?: any[];
  familyGuardians?: any[];
  documents?: GuardianDocument[];
  notes?: GuardianNote[];
  householdSiblings?: Array<{
    id: string;
    studentId: string;
    admissionNumber: string;
    name: string;
    status: string;
    sourceFamily: string;
  }>;
  user?: {
    id: string;
    email: string;
    isActive: boolean;
    mustChangePassword: boolean;
    createdAt: string;
  } | null;
  _count?: {
    documents: number;
    notes: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GuardiansOverviewKPIs {
  totalGuardians: number;
  totalFamilies: number;
  portalAccessCount: number;
  noPortalAccessCount: number;
  duplicateCandidatesCount: number;
  languageDistribution: {
    en: number;
    hi: number;
    hinglish: number;
  };
}

export interface GuardiansListResponse {
  data: Guardian[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GuardiansFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  relationship?: string;
  hasPortalAccess?: string | boolean;
  isEmergencyContact?: string | boolean;
  hasPickupPermission?: string | boolean;
  preferredLanguage?: string;
}

export function useGuardiansOverview() {
  return useQuery<GuardiansOverviewKPIs>({
    queryKey: ['guardians', 'overview'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/guardians/overview');
      return res.data;
    },
  });
}

export function useGuardians(params: GuardiansFilterParams) {
  return useQuery<GuardiansListResponse>({
    queryKey: ['guardians', params],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/guardians', { params });
      return res.data;
    },
  });
}

export function useGuardian(id: string | undefined) {
  return useQuery<Guardian>({
    queryKey: ['guardians', id],
    queryFn: async () => {
      if (!id) throw new Error('Guardian ID is required');
      const res = await apiClient.get(`/api/v1/guardians/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCheckDuplicateGuardians() {
  return useMutation({
    mutationFn: async (payload: { phone?: string; email?: string; firstName?: string; lastName?: string; excludeGuardianId?: string }) => {
      const res = await apiClient.post('/api/v1/guardians/check-duplicate', payload);
      return res.data;
    },
  });
}

export function useCreateGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/api/v1/guardians', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['guardians', 'overview'] });
    },
  });
}

export function useUpdateGuardian(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/api/v1/guardians/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', id] });
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
    },
  });
}

export function useArchiveGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/api/v1/guardians/${id}/archive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['guardians', 'overview'] });
    },
  });
}

export function useRestoreGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/api/v1/guardians/${id}/restore`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['guardians', 'overview'] });
    },
  });
}

export function useMergeGuardians() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { canonicalGuardianId: string; duplicateGuardianId: string; resolvedFields?: any }) => {
      const res = await apiClient.post('/api/v1/guardians/merge', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['guardians', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useLinkStudent(guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { studentId: string; relationship: string; isPrimary?: boolean; isEmergencyContact?: boolean; hasPickupPermission?: boolean; livesWithStudent?: boolean }) => {
      const res = await apiClient.post(`/api/v1/guardians/${guardianId}/students`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', guardianId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUpdateStudentLink(guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, data }: { studentId: string; data: any }) => {
      const res = await apiClient.patch(`/api/v1/guardians/${guardianId}/students/${studentId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', guardianId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUnlinkStudent(guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      const res = await apiClient.delete(`/api/v1/guardians/${guardianId}/students/${studentId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', guardianId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useCreatePortalAccess(guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/api/v1/guardians/${guardianId}/portal-access`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', guardianId] });
      queryClient.invalidateQueries({ queryKey: ['guardians', 'overview'] });
    },
  });
}

export function useDisablePortalAccess(guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.delete(`/api/v1/guardians/${guardianId}/portal-access`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', guardianId] });
      queryClient.invalidateQueries({ queryKey: ['guardians', 'overview'] });
    },
  });
}

export function useUpdatePreferences(guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/api/v1/guardians/${guardianId}/preferences`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', guardianId] });
    },
  });
}

export function useUploadGuardianDoc(guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      const res = await apiClient.post(`/api/v1/guardians/${guardianId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', guardianId] });
    },
  });
}

export function useVerifyGuardianDoc(guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, status, verificationNotes }: { docId: string; status: 'VERIFIED' | 'REJECTED'; verificationNotes?: string }) => {
      const res = await apiClient.patch(`/api/v1/guardians/${guardianId}/documents/${docId}/verify`, {
        status,
        verificationNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', guardianId] });
    },
  });
}

export function useAddGuardianNote(guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { category: string; content: string; isConfidential?: boolean }) => {
      const res = await apiClient.post(`/api/v1/guardians/${guardianId}/notes`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians', guardianId] });
    },
  });
}
