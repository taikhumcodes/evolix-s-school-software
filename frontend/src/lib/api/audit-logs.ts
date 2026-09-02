import apiClient from '../api-client';
import { useQuery } from '@tanstack/react-query';

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: string | null;
  after_data: string | null;
  metadata_info: string | null;
  ip_address: string | null;
  created_at: string;
  user_id: string | null;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

export const useAuditLogs = (page = 1, pageSize = 50, entityType = '', action = '') => {
  return useQuery<PaginatedAuditLogs>({
    queryKey: ['audit-logs', page, pageSize, entityType, action],
    queryFn: async () => {
      const params: any = { page, page_size: pageSize };
      if (entityType) params.entity_type = entityType;
      if (action) params.action = action;

      const { data } = await apiClient.get('/audit-logs', { params });
      return data;
    },
  });
};
