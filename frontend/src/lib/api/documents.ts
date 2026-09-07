import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type DocumentType =
  | 'BONAFIDE_CERTIFICATE'
  | 'TRANSFER_CERTIFICATE'
  | 'CHARACTER_CERTIFICATE'
  | 'STUDENT_ID_CARD'
  | 'ADMISSION_FORM'
  | 'STUDENT_PROFILE'
  | 'REPORT_CARD'
  | 'EXAM_RESULT'
  | 'MARKS_STATEMENT'
  | 'FEE_RECEIPT'
  | 'FEE_STATEMENT'
  | 'STUDENT_LEDGER_STATEMENT'
  | 'PAYSLIP'
  | 'SALARY_CERTIFICATE'
  | 'STAFF_ID_CARD'
  | 'EXPERIENCE_CERTIFICATE'
  | 'ROUTE_MANIFEST'
  | 'BUS_PASS'
  | 'VISITOR_PASS'
  | 'EVENT_GATE_PASS'
  | 'CUSTOM_DOCUMENT';

export type DocumentCategory =
  | 'STUDENT'
  | 'ACADEMIC'
  | 'FINANCE'
  | 'HR'
  | 'PAYROLL'
  | 'OPERATIONS'
  | 'GENERAL';

export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type DocumentStatus = 'DRAFT' | 'FINALIZED' | 'SUPERSEDED' | 'CANCELLED';
export type NumberingPolicy =
  | 'NUMBER_SERIES_ON_FINALIZE'
  | 'SOURCE_NUMBER'
  | 'NO_OFFICIAL_NUMBER';

export interface DocumentLayoutElement {
  id: string;
  type: 'TEXT' | 'PARAGRAPH' | 'IMAGE' | 'TABLE' | 'LINE' | 'ROW' | 'COLUMN' | 'QR_CODE' | 'SIGNATURE' | 'WATERMARK';
  content?: string;
  source?: string;
  style?: Record<string, any>;
  columns?: Array<{ header: string; key: string; width?: number; align?: 'left' | 'center' | 'right' }>;
  children?: DocumentLayoutElement[];
  condition?: string;
}

export interface DocumentLayoutDefinition {
  margins?: { top: number; bottom: number; left: number; right: number };
  elements: DocumentLayoutElement[];
  header?: DocumentLayoutElement[];
  footer?: DocumentLayoutElement[];
}

export interface DocumentTemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  layoutDefinition: DocumentLayoutDefinition;
  pageSettings?: {
    pageSize?: string;
    orientation?: string;
    numberingPolicy?: NumberingPolicy;
    numberSeriesCode?: string | null;
  };
  changeSummary?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface DocumentTemplate {
  id: string;
  tenantId: string;
  schoolId: string;
  code: string;
  name: string;
  documentType: DocumentType;
  category: DocumentCategory;
  pageSize: string;
  orientation: string;
  status: TemplateStatus;
  numberingPolicy?: NumberingPolicy;
  currentVersionId?: string | null;
  currentVersion?: DocumentTemplateVersion | null;
  versions?: DocumentTemplateVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDocument {
  id: string;
  tenantId: string;
  schoolId: string;
  templateId: string;
  templateVersionId: string;
  documentType: DocumentType;
  category: DocumentCategory;
  documentNumber?: string | null;
  numberingPolicy?: NumberingPolicy;
  sourceType: string;
  sourceId: string;
  status: DocumentStatus;
  reprintCount: number;
  checksumSha256?: string | null;
  verificationTokenHash?: string | null;
  storageKey?: string | null;
  language?: string;
  dataSnapshotJson: Record<string, any>;
  renderedMetadataJson?: Record<string, any>;
  supersedesDocumentId?: string | null;
  supersededByDocumentId?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  finalizedAt?: string | null;
  createdAt: string;
  template?: {
    name: string;
    code: string;
  };
  actions?: Array<{
    id: string;
    action: string;
    createdAt: string;
    metadata?: any;
    actor?: { firstName?: string; lastName?: string; email?: string };
  }>;
}

export interface DocumentSignatureAsset {
  id: string;
  name: string;
  assetType: 'SIGNATURE' | 'STAMP' | 'SEAL';
  designation?: string | null;
  signatoryName?: string | null;
  storageKey: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number | null;
  height?: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface BulkDocumentJobItem {
  id: string;
  jobId: string;
  sourceId: string;
  documentId?: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface BulkDocumentJob {
  id: string;
  tenantId: string;
  schoolId: string;
  templateId: string;
  sourceType: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalCount: number;
  successCount: number;
  failureCount: number;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
  template?: {
    name: string;
    code: string;
  };
  items?: BulkDocumentJobItem[];
}

export interface PublicVerificationResult {
  isValid: boolean;
  status?: string;
  documentNumber?: string;
  documentType?: string;
  category?: string;
  issueDate?: string;
  schoolName?: string;
  cancelledAt?: string;
  message?: string;
  checksumSha256?: string;
  reason?: string;
}

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

export const useDocumentTemplates = (params?: { category?: string; status?: string; search?: string }) => {
  return useQuery({
    queryKey: ['documentTemplates', params],
    queryFn: async () => {
      const res = await apiClient.get<DocumentTemplate[]>('/documents/templates', { params });
      return res.data;
    },
  });
};

export const useDocumentTemplate = (id?: string) => {
  return useQuery({
    queryKey: ['documentTemplate', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<DocumentTemplate>(`/documents/templates/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
};

export const useCreateDocumentTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post<DocumentTemplate>('/documents/templates', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplates'] });
    },
  });
};

export const useUpdateDocumentTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.put<DocumentTemplate>(`/documents/templates/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['documentTemplate', variables.id] });
    },
  });
};

export const useCreateTemplateVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: any }) => {
      const res = await apiClient.post<DocumentTemplateVersion>(
        `/documents/templates/${templateId}/versions`,
        data
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplate', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ['documentTemplates'] });
    },
  });
};

export const usePublishTemplateVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, versionId }: { templateId: string; versionId: string }) => {
      const res = await apiClient.post<DocumentTemplate>(
        `/documents/templates/${templateId}/versions/${versionId}/publish`
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documentTemplate', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ['documentTemplates'] });
    },
  });
};

export const usePreviewDocument = () => {
  return useMutation({
    mutationFn: async (data: {
      templateId?: string;
      layoutDefinition?: DocumentLayoutDefinition;
      pageSettings?: any;
      sourceType: string;
      sourceId: string;
      customVariables?: Record<string, any>;
      language?: string;
    }) => {
      const res = await apiClient.post<{
        pdfBase64: string;
        pageCount: number;
        checksumSha256: string;
        dataSnapshot: Record<string, any>;
      }>('/documents/preview', data);
      return res.data;
    },
  });
};

export const useGenerateDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      sourceType: string;
      sourceId: string;
      customVariables?: Record<string, any>;
      language?: string;
      options?: {
        autoFinalize?: boolean;
        sendNotification?: boolean;
      };
    }) => {
      const res = await apiClient.post<GeneratedDocument>('/documents/generate', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generatedDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['documentReports'] });
    },
  });
};

export const useFinalizeDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const res = await apiClient.post<GeneratedDocument>(`/documents/${documentId}/finalize`);
      return res.data;
    },
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['generatedDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['documentDetail', documentId] });
      queryClient.invalidateQueries({ queryKey: ['documentReports'] });
    },
  });
};

export const useGeneratedDocuments = (params?: {
  templateId?: string;
  category?: string;
  status?: string;
  sourceType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['generatedDocuments', params],
    queryFn: async () => {
      const res = await apiClient.get<{
        items: GeneratedDocument[];
        total: number;
        page: number;
        limit: number;
      }>('/documents', { params });
      return res.data;
    },
  });
};

export const useDocumentDetail = (documentId?: string) => {
  return useQuery({
    queryKey: ['documentDetail', documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const res = await apiClient.get<GeneratedDocument>(`/documents/${documentId}`);
      return res.data;
    },
    enabled: Boolean(documentId),
  });
};

export const useCancelDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      const res = await apiClient.post<GeneratedDocument>(`/documents/${documentId}/cancel`, {
        reason,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['generatedDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['documentDetail', variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ['documentReports'] });
    },
  });
};

export const useSupersedeDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      documentId,
      data,
    }: {
      documentId: string;
      data: {
        templateId: string;
        sourceType: string;
        sourceId: string;
        customVariables?: Record<string, any>;
        language?: string;
      };
    }) => {
      const res = await apiClient.post<GeneratedDocument>(
        `/documents/${documentId}/supersede`,
        data
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generatedDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['documentReports'] });
    },
  });
};

export const downloadOrReprintPdf = async (documentId: string, filename?: string) => {
  const res = await apiClient.get(`/documents/${documentId}/reprint`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || `document_${documentId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const useBulkDocumentJobs = () => {
  return useQuery({
    queryKey: ['bulkDocumentJobs'],
    queryFn: async () => {
      const res = await apiClient.get<BulkDocumentJob[]>('/documents/bulk-jobs');
      return res.data;
    },
  });
};

export const useBulkDocumentJob = (jobId?: string) => {
  return useQuery({
    queryKey: ['bulkDocumentJob', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await apiClient.get<BulkDocumentJob>(`/documents/bulk-jobs/${jobId}`);
      return res.data;
    },
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'QUEUED' || status === 'PROCESSING' ? 1500 : false;
    },
  });
};

export const useCreateBulkDocumentJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      sourceType: string;
      sourceIds: string[];
      language?: string;
      autoFinalize?: boolean;
    }) => {
      const res = await apiClient.post<BulkDocumentJob>('/documents/bulk-jobs', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulkDocumentJobs'] });
    },
  });
};

export const useSignatureAssets = () => {
  return useQuery({
    queryKey: ['documentSignatureAssets'],
    queryFn: async () => {
      const res = await apiClient.get<DocumentSignatureAsset[]>('/documents/signatures');
      return res.data;
    },
  });
};

export const useUploadSignatureAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiClient.post<DocumentSignatureAsset>('/documents/signatures', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentSignatureAssets'] });
    },
  });
};

export const useDeleteSignatureAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/documents/signatures/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentSignatureAssets'] });
    },
  });
};

export const useDocumentReports = () => {
  return useQuery({
    queryKey: ['documentReports'],
    queryFn: async () => {
      const res = await apiClient.get<{
        totalDocuments: number;
        finalizedDocuments: number;
        cancelledDocuments: number;
        draftDocuments: number;
        reprintCountTotal: number;
        byCategory: Record<string, number>;
        byType: Record<string, number>;
        recentIssuances: GeneratedDocument[];
      }>('/documents/reports/stats');
      return res.data;
    },
  });
};

export const verifyDocumentPublic = async (token: string): Promise<PublicVerificationResult> => {
  // Public endpoint does not require authorization header
  const res = await axios.get<PublicVerificationResult>(`/api/public/documents/verify/${token}`);
  return res.data;
};
