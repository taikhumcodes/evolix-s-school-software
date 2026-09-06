import apiClient from '../api-client';
import { useQuery } from '@tanstack/react-query';

export interface GlobalSearchResult {
  id: string;
  type: 'class' | 'section' | 'subject' | 'academic_year' | 'user' | 'role';
  category: string;
  title: string;
  subtitle: string;
  code?: string;
  url: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  count: number;
  results: GlobalSearchResult[];
}

export async function searchGlobal(query: string, schoolId?: string): Promise<GlobalSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { data } = await apiClient.get<SearchResponse>('/search', {
    params: { q: trimmed, ...(schoolId ? { school_id: schoolId } : {}) },
  });
  return data.results || [];
}

export const useGlobalSearch = (query: string, schoolId?: string, enabled = true) => {
  return useQuery<GlobalSearchResult[]>({
    queryKey: ['globalSearch', query, schoolId],
    queryFn: () => searchGlobal(query, schoolId),
    enabled: enabled && Boolean(query.trim()),
    staleTime: 1000 * 30,
  });
};
