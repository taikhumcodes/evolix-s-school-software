import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AdmissionApplication {
  id: string;
  tenantId: string;
  schoolId: string;
  academicYearId: string;
  appliedClassId: string;
  applicationNumber: string;
  applicationDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
  firstName: string;
  middleName?: string | null;
  lastName: string;
  displayName?: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  placeOfBirth?: string | null;
  nationality?: string;
  religionId?: string | null;
  categoryId?: string | null;
  casteId?: string | null;
  bloodGroup?: string | null;
  primaryLanguage?: string | null;
  previousSchool?: string | null;
  previousClass?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;

  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianAltPhone?: string | null;
  guardianEmail?: string | null;
  guardianOccupation?: string | null;
  guardianId?: string | null;

  reviewNotes?: string | null;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  convertedAt?: string | null;

  academicYear?: { id: string; name: string };
  appliedClass?: { id: string; name: string; code: string };
  convertedStudent?: { id: string; studentId: string; admissionNumber: string; status?: string } | null;
  documents?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface AdmissionsListResponse {
  items: AdmissionApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CheckDuplicateParams {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  guardianPhone: string;
  guardianEmail?: string | null;
  excludeApplicationId?: string;
}

export interface CheckDuplicateResponse {
  isExactDuplicate: boolean;
  isPotentialDuplicate: boolean;
  matches: Array<{
    type: 'EXACT_STUDENT' | 'EXACT_APPLICATION' | 'PARTIAL_PHONE' | 'PARTIAL_EMAIL' | 'SAME_NAME';
    message: string;
    recordId: string;
    details?: any;
  }>;
}

export const useAdmissions = (params: {
  status?: string;
  academicYearId?: string;
  appliedClassId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery<AdmissionsListResponse>({
    queryKey: ['admissions', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/admissions', {
        params: {
          status: params.status,
          academic_year_id: params.academicYearId,
          applied_class_id: params.appliedClassId,
          search: params.search,
          page: params.page,
          limit: params.limit,
        },
      });
      return data;
    },
  });
};

export const useAdmission = (id: string) => {
  return useQuery<AdmissionApplication>({
    queryKey: ['admission', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/admissions/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCheckDuplicate = () => {
  return useMutation<CheckDuplicateResponse, Error, CheckDuplicateParams>({
    mutationFn: async (params) => {
      const { data } = await apiClient.post('/admissions/check-duplicate', params);
      return data;
    },
  });
};

export const useCreateAdmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: any) => {
      const { data } = await apiClient.post('/admissions', formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['students-overview'] });
    },
  });
};

export const useUpdateAdmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.patch(`/admissions/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admission', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
    },
  });
};

export const useUpdateAdmissionStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      rejectionReason,
      reviewNotes,
    }: {
      id: string;
      status: string;
      rejectionReason?: string;
      reviewNotes?: string;
    }) => {
      const { data } = await apiClient.post(`/admissions/${id}/status`, {
        status,
        rejectionReason,
        reviewNotes,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admission', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['students-overview'] });
    },
  });
};

export const useConvertAdmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      conversionData,
    }: {
      id: string;
      conversionData: {
        classId?: string;
        sectionId?: string | null;
        rollNumber?: string | null;
        admissionDate?: string;
      };
    }) => {
      const { data } = await apiClient.post(`/admissions/${id}/convert`, conversionData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admission', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students-overview'] });
    },
  });
};
