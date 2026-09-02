import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  roles?: { id: string; name: string }[];
  schools?: { id: string; name: string }[];
}

export interface PaginatedUsers {
  items: User[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

export const useUsers = (page = 1, pageSize = 25, search = '') => {
  return useQuery<PaginatedUsers>({
    queryKey: ['users', page, pageSize, search],
    queryFn: async () => {
      const { data } = await apiClient.get('/users', {
        params: { page, page_size: pageSize, search },
      });
      return data;
    },
  });
};

export const useUser = (id: string) => {
  return useQuery<User>({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userData: any) => {
      const { data } = await apiClient.post('/users', userData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: responseData } = await apiClient.patch(`/users/${id}`, data);
      return responseData;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/users/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
