import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AcademicYear {
  id: string;
  name: string;
  school_id: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
}

export const useAcademicYears = (schoolId: string) => {
  return useQuery<AcademicYear[]>({
    queryKey: ['academic-years', schoolId],
    queryFn: async () => {
      const { data } = await apiClient.get('/academic-years', {
        params: { school_id: schoolId },
      });
      return data;
    },
    enabled: !!schoolId,
  });
};

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ayData: any) => {
      const { data } = await apiClient.post('/academic-years', ayData);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['academic-years', data.school_id] });
    },
  });
};

export const useUpdateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: responseData } = await apiClient.patch(`/academic-years/${id}`, data);
      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['academic-years', data.school_id] });
    },
  });
};
