import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Permission {
  id: string;
  code: string;
  description: string | null;
}

export interface Role {
  id: string;
  name: string;
  is_system: boolean;
  permissions: Permission[];
}

export const useRoles = () => {
  return useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await apiClient.get('/roles');
      return data;
    },
  });
};

export const usePermissions = () => {
  return useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/permissions');
      return data;
    },
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roleData: any) => {
      const { data } = await apiClient.post('/roles', roleData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: responseData } = await apiClient.patch(`/roles/${id}`, data);
      return responseData;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['roles', variables.id] });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/roles/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
};
