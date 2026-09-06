import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Student {
  id: string;
  tenantId: string;
  schoolId: string;
  studentId: string;
  admissionNumber: string;
  admissionDate: string;
  admittedAcademicYearId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'WITHDRAWN' | 'TRANSFERRED' | 'ALUMNI';
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
  photoFileId?: string | null;
  photoStorageKey?: string | null;
  previousSchool?: string | null;
  previousClass?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;

  statusReason?: string | null;
  statusChangeDate?: string | null;
  destinationSchool?: string | null;
  lastAttendanceDate?: string | null;

  // Flattened from list or expanded from detail
  currentClass?: { id: string; name: string; code?: string } | null;
  currentSection?: { id: string; name: string; code?: string } | null;
  currentRollNumber?: string | null;
  currentAcademicYear?: { id: string; name: string } | null;
  primaryGuardian?: {
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string | null;
  } | null;

  enrollments?: Array<{
    id: string;
    academicYearId: string;
    classId: string;
    sectionId?: string | null;
    rollNumber?: string | null;
    status: string;
    enrollmentDate: string;
    completionDate?: string | null;
    remarks?: string | null;
    class: { id: string; name: string; code: string };
    section?: { id: string; name: string; code: string } | null;
    academicYear: { id: string; name: string };
  }>;

  guardians?: Array<{
    id: string;
    relationship: string;
    isPrimary: boolean;
    isEmergencyContact: boolean;
    hasPickupPermission: boolean;
    livesWithStudent: boolean;
    guardian: {
      id: string;
      firstName: string;
      middleName?: string | null;
      lastName: string;
      relationship: string;
      phone: string;
      email?: string | null;
      occupation?: string | null;
      address?: string | null;
    };
  }>;

  documents?: Array<{
    id: string;
    documentType: string;
    originalFileName: string;
    storageKey: string;
    mimeType: string;
    fileSize: number;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
    verificationNotes?: string | null;
    createdAt: string;
  }>;

  notes?: Array<{
    id: string;
    category: string;
    content: string;
    isConfidential: boolean;
    createdAt: string;
  }>;

  disciplines?: Array<{
    id: string;
    incidentDate: string;
    incidentType: string;
    title: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    actionTaken?: string | null;
    status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED';
    followUpNotes?: string | null;
    createdAt: string;
  }>;

  admittedAcademicYear?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface StudentsListResponse {
  items: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StudentsOverview {
  totalActiveStudents: number;
  pendingAdmissions: number;
  approvedAdmissions: number;
  withdrawnStudents: number;
  admissionsThisYear: number;
  academicYearName: string;
}

export const useStudentsOverview = (academicYearId?: string) => {
  return useQuery<StudentsOverview>({
    queryKey: ['students-overview', academicYearId],
    queryFn: async () => {
      const { data } = await apiClient.get('/students/overview', {
        params: { academic_year_id: academicYearId },
      });
      return data;
    },
  });
};

export const useNextRollNumber = (params: {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
}) => {
  return useQuery<{ rollNumber: string }>({
    queryKey: ['next-roll-number', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/students/next-roll-number', {
        params: {
          academic_year_id: params.academicYearId,
          class_id: params.classId,
          section_id: params.sectionId,
        },
      });
      return data;
    },
    enabled: !!params.academicYearId && !!params.classId,
  });
};

export const useStudents = (params: {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: string;
  gender?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery<StudentsListResponse>({
    queryKey: ['students', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/students', {
        params: {
          academic_year_id: params.academicYearId,
          class_id: params.classId,
          section_id: params.sectionId,
          status: params.status,
          gender: params.gender,
          search: params.search,
          page: params.page,
          limit: params.limit,
        },
      });
      return data;
    },
  });
};

export const useStudent = (id: string) => {
  return useQuery<Student>({
    queryKey: ['student', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/students/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: any) => {
      const { data } = await apiClient.post('/students', formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students-overview'] });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.patch(`/students/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useUploadStudentPhoto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('photo', file);
      const { data } = await apiClient.post(`/students/${id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useRemoveStudentPhoto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/students/${id}/photo`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useChangeClassSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.post(`/students/${id}/enrollments`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useWithdrawStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.post(`/students/${id}/withdraw`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students-overview'] });
    },
  });
};

export const useTransferStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.post(`/students/${id}/transfer`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students-overview'] });
    },
  });
};

export const useReactivateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.post(`/students/${id}/reactivate`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students-overview'] });
    },
  });
};

export const useGuardiansSearch = (search: string) => {
  return useQuery<any[]>({
    queryKey: ['guardians-search', search],
    queryFn: async () => {
      const { data } = await apiClient.get('/students/guardians/search', {
        params: { search },
      });
      return data;
    },
    enabled: search.trim().length >= 3,
  });
};

export const useLinkGuardian = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.post(`/students/${id}/guardians`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
    },
  });
};

export const useUnlinkGuardian = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, guardianId }: { id: string; guardianId: string }) => {
      const res = await apiClient.delete(`/students/${id}/guardians/${guardianId}`);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
    },
  });
};

export const useUploadStudentDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      file,
      documentType,
      notes,
    }: {
      id: string;
      file: File;
      documentType: string;
      notes?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      if (notes) formData.append('notes', notes);

      const { data } = await apiClient.post(`/students/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
    },
  });
};

export const useVerifyStudentDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      docId,
      status,
      notes,
    }: {
      id: string;
      docId: string;
      status: 'VERIFIED' | 'REJECTED';
      notes?: string;
    }) => {
      const { data } = await apiClient.patch(`/students/${id}/documents/${docId}/verify`, {
        verificationStatus: status,
        verificationNotes: notes,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
    },
  });
};

export const useArchiveStudentDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, docId }: { id: string; docId: string }) => {
      const { data } = await apiClient.delete(`/students/${id}/documents/${docId}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
    },
  });
};

export const useAddStudentNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.post(`/students/${id}/notes`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
    },
  });
};

export const useAddDiscipline = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.post(`/students/${id}/discipline`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
    },
  });
};

export const useUpdateDiscipline = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      disciplineId,
      data,
    }: {
      id: string;
      disciplineId: string;
      data: any;
    }) => {
      const res = await apiClient.patch(`/students/${id}/discipline/${disciplineId}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
    },
  });
};

export const usePreviewImport = () => {
  return useMutation({
    mutationFn: async (csvContent: string) => {
      const { data } = await apiClient.post('/students/import/preview', { csvContent });
      return data;
    },
  });
};

export const useCommitImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ academicYearId, rows }: { academicYearId: string; rows: any[] }) => {
      const { data } = await apiClient.post('/students/import/commit', { academicYearId, rows });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students-overview'] });
    },
  });
};
