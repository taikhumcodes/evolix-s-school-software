import apiClient from '../api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface SetupProgress {
  id: string;
  schoolId: string;
  setupStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  currentStep: string;
  completedSteps: string[];
  completedAt: string | null;
}

export interface SetupSummary {
  school: {
    name: string;
    shortName: string;
    board: string;
    code: string;
  };
  hasLogo: boolean;
  hasAcademicYear: boolean;
  academicYearsCount: number;
  classesCount: number;
  classSectionsCount: number;
  subjectsCount: number;
  feeHeadsCount: number;
  vehicleTypesCount: number;
  userCount: number;
  isCompleted: boolean;
}

export interface SetupStatusResponse {
  progress: SetupProgress;
  summary: SetupSummary;
}

export const useSetupStatus = (schoolId?: string) =>
  useQuery<SetupStatusResponse>({
    queryKey: ['setup', 'status', schoolId],
    queryFn: async () =>
      (await apiClient.get('/setup/status', { params: { school_id: schoolId } })).data,
    enabled: Boolean(schoolId),
  });

export const useExecuteSetupStep = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ stepName, payload }: { stepName: string; payload: any }) =>
      (
        await apiClient.post(`/setup/step/${stepName}`, payload, {
          params: { school_id: schoolId },
        })
      ).data as SetupStatusResponse,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup', 'status'] });
      qc.invalidateQueries({ queryKey: ['master-data'] });
      qc.invalidateQueries({ queryKey: ['configuration'] });
      qc.invalidateQueries({ queryKey: ['academic-years'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useCompleteSetup = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await apiClient.post('/setup/complete', {}, { params: { school_id: schoolId } }))
        .data as SetupStatusResponse,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup', 'status'] });
      qc.invalidateQueries({ queryKey: ['configuration'] });
    },
  });
};

export const useCreateSchool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; code: string }) =>
      (await apiClient.post('/schools', data)).data as { id: string; name: string; code: string },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schools'] });
      qc.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
};
