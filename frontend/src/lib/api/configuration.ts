import apiClient from '../api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type ConfigurationSection =
  | 'school'
  | 'academic'
  | 'student-identity'
  | 'attendance'
  | 'fees'
  | 'finance'
  | 'exams'
  | 'promotion'
  | 'branding'
  | 'localization'
  | 'printing';

export interface ConfigurationPayload {
  id: string;
  school_id: string;
  version: number;
  values: Record<string, string | number | boolean | null>;
}

export interface ConfigurationOverview {
  school: { id: string; name: string; code: string };
  version: number;
  categories: Record<string, { status: string; updated_at: string }>;
}

export type BrandingPayload = ConfigurationPayload;

export interface NumberSeries {
  id: string;
  code: string;
  prefix: string | null;
  suffix: string | null;
  padding: number;
  current_value: number;
  reset_strategy: string | null;
}

export interface ConfigurationHistoryEntry {
  id: string;
  created_at: string;
  user_id: string | null;
  school_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: string | null;
  after_data: string | null;
}

export const useConfigurationOverview = (schoolId?: string) =>
  useQuery<ConfigurationOverview>({
    queryKey: ['configuration', 'overview', schoolId],
    queryFn: async () =>
      (await apiClient.get('/configuration', { params: { school_id: schoolId } })).data,
    enabled: Boolean(schoolId),
  });

export const useConfigurationSection = (section: ConfigurationSection, schoolId?: string) =>
  useQuery<ConfigurationPayload>({
    queryKey: ['configuration', section, schoolId],
    queryFn: async () =>
      (await apiClient.get(`/configuration/${section}`, { params: { school_id: schoolId } })).data,
    enabled: Boolean(schoolId),
  });

export const useUpdateConfiguration = (section: ConfigurationSection, schoolId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      version: number;
      values: Record<string, string | number | boolean | null>;
    }) =>
      (
        await apiClient.patch(`/configuration/${section}`, payload, {
          params: { school_id: schoolId },
        })
      ).data as ConfigurationPayload,
    onSuccess: (data) => {
      queryClient.setQueryData(['configuration', section, schoolId], data);
      queryClient.invalidateQueries({ queryKey: ['configuration', 'overview', schoolId] });
    },
  });
};

export const useBranding = (schoolId?: string) =>
  useQuery<BrandingPayload>({
    queryKey: ['configuration', 'branding', schoolId],
    queryFn: async () =>
      (await apiClient.get('/configuration/branding', { params: { school_id: schoolId } })).data,
    enabled: Boolean(schoolId),
  });

export const useUploadBranding = (schoolId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      assetType,
    }: {
      file: File;
      assetType: 'logo' | 'compact_logo' | 'favicon';
    }) => {
      const body = new FormData();
      body.append('file', file);
      return (
        await apiClient.post('/configuration/branding/upload', body, {
          params: { school_id: schoolId, asset_type: assetType },
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data as BrandingPayload;
    },
    onSuccess: (data) => queryClient.setQueryData(['configuration', 'branding', schoolId], data),
  });
};

export const useDeleteBrandingAsset = (schoolId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assetType: 'logo' | 'compact_logo' | 'favicon') =>
      (
        await apiClient.delete(`/configuration/branding/asset/${assetType}`, {
          params: { school_id: schoolId },
        })
      ).data as BrandingPayload,
    onSuccess: (data) => queryClient.setQueryData(['configuration', 'branding', schoolId], data),
  });
};

export const getBrandingAssetUrl = (assetType: string, schoolId?: string, version?: number) => {
  if (!schoolId) return '';
  return `/api/v1/configuration/branding/asset/${assetType}?school_id=${encodeURIComponent(schoolId)}${version ? `&v=${version}` : ''}`;
};

export const useNumberSeries = (schoolId?: string) =>
  useQuery<NumberSeries[]>({
    queryKey: ['configuration', 'number-series', schoolId],
    queryFn: async () =>
      (await apiClient.get('/configuration/number-series', { params: { school_id: schoolId } }))
        .data,
    enabled: Boolean(schoolId),
  });

export const useUpdateNumberSeries = (schoolId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<NumberSeries> }) =>
      (
        await apiClient.patch(`/configuration/number-series/${id}`, values, {
          params: { school_id: schoolId },
        })
      ).data as NumberSeries,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['configuration', 'number-series', schoolId] }),
  });
};

export const useNumberSeriesPreview = (
  id: string | undefined,
  values: Partial<NumberSeries>,
  schoolId?: string
) =>
  useQuery<{ preview: string }>({
    queryKey: ['configuration', 'number-series-preview', id, values, schoolId],
    queryFn: async () =>
      (
        await apiClient.get(`/configuration/number-series/${id}/preview`, {
          params: { ...values, school_id: schoolId },
        })
      ).data,
    enabled: Boolean(id && schoolId),
  });

export const useConfigurationHistory = (
  schoolId?: string,
  action?: string,
  dateFrom?: string,
  dateTo?: string
) =>
  useQuery<ConfigurationHistoryEntry[]>({
    queryKey: ['configuration', 'history', schoolId, action, dateFrom, dateTo],
    queryFn: async () =>
      (
        await apiClient.get('/configuration/history', {
          params: {
            school_id: schoolId,
            action: action || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          },
        })
      ).data,
    enabled: Boolean(schoolId),
  });
