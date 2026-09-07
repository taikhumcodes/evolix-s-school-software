import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface CommunicationTemplate {
  id: string;
  name: string;
  code: string;
  category: string;
  channel: string;
  subject?: string | null;
  body: string;
  language: string;
  status: string;
  version: number;
  versions?: Array<{
    id: string;
    version: number;
    subject?: string | null;
    body: string;
    changeSummary?: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationMessage {
  id: string;
  category: string;
  channel: string;
  recipientType: string;
  destinationMasked?: string | null;
  destinationEncrypted?: string | null;
  subjectRendered?: string | null;
  bodyRendered?: string;
  status: string;
  sendEvidenceType?: string | null;
  deliveryMode?: string | null;
  queuedAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  provider?: string | null;
  attemptCount: number;
  lastErrorMessage?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  createdAt: string;
  deliveryAttempts?: Array<{
    id: string;
    attemptNumber: number;
    provider: string;
    startedAt: string;
    completedAt?: string | null;
    resultStatus: string;
    errorCode?: string | null;
    errorMessage?: string | null;
  }>;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface CommunicationSettings {
  id: string;
  schoolId: string;
  defaultChannels: string[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  bulkApprovalThreshold: number;
  version: number;
}

export interface ProviderHealth {
  provider: string;
  channel: string;
  configured: boolean;
  available: boolean;
  statusText: string;
  lastCheckedAt: string;
}

export interface AutomationRule {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  eventType: string;
  conditions: any[];
  actions: any[];
  isActive: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  eventId: string;
  ruleVersion: number;
  status: string;
  skipReason?: string | null;
  executedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
  rule?: { code: string; name: string; eventType: string };
  event?: { eventType: string; sourceType: string; sourceId: string; occurredAt: string };
  actionExecutions?: any[];
}

export interface ScheduledJob {
  id: string;
  jobType: string;
  sourceType: string;
  sourceId: string;
  scheduledFor: string;
  status: string;
  attemptCount: number;
  deferCount: number;
  skipReason?: string | null;
  lastError?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface AutomationTask {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  assignedRole?: string | null;
  assignedUserId?: string | null;
  dueDate?: string | null;
  status: string;
  assignedUser?: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
}

// ==========================================
// REACT QUERY HOOKS
// ==========================================

// 1. Templates
export function useCommunicationTemplates(category?: string, channel?: string) {
  return useQuery<CommunicationTemplate[]>({
    queryKey: ['communication-templates', category, channel],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (channel) params.append('channel', channel);
      const res = await apiClient.get(`/api/v1/communication/templates?${params.toString()}`);
      return res.data;
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      const res = await apiClient.post('/api/v1/communication/templates', dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communication-templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: any) => {
      const res = await apiClient.put(`/api/v1/communication/templates/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communication-templates'] });
    },
  });
}

// 2. Messages
export function useCommunicationMessages(filters: { category?: string; channel?: string; status?: string; limit?: number; offset?: number } = {}) {
  return useQuery<{ items: CommunicationMessage[]; total: number }>({
    queryKey: ['communication-messages', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.channel) params.append('channel', filters.channel);
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.offset) params.append('offset', String(filters.offset));
      const res = await apiClient.get(`/api/v1/communication/messages?${params.toString()}`);
      return res.data;
    },
  });
}

export function useMessageDetail(id: string) {
  return useQuery<CommunicationMessage>({
    queryKey: ['communication-message', id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/communication/messages/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useRetryMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/api/v1/communication/messages/${id}/retry`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communication-messages'] });
    },
  });
}

export function useCancelMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/api/v1/communication/messages/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communication-messages'] });
    },
  });
}

export function useRecordManualSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/api/v1/communication/messages/${id}/manual-confirm`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communication-messages'] });
    },
  });
}

// 3. Notifications
export function useMyNotifications(unreadOnly = false) {
  return useQuery<{ items: InAppNotification[]; total: number; unreadCount: number }>({
    queryKey: ['my-notifications', unreadOnly],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/communication/notifications?unreadOnly=${unreadOnly}`);
      return res.data;
    },
    refetchInterval: 15000, // Poll every 15s for new notifications
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.put(`/api/v1/communication/notifications/${id}/read`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.put('/api/v1/communication/notifications/mark-all-read');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });
}

// 4. Settings & Providers
export function useCommunicationSettings() {
  return useQuery<CommunicationSettings>({
    queryKey: ['communication-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/communication/settings');
      return res.data;
    },
  });
}

export function useUpdateCommunicationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.put('/api/v1/communication/settings', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communication-settings'] });
    },
  });
}

export function useProviderStatuses() {
  return useQuery<ProviderHealth[]>({
    queryKey: ['communication-providers-status'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/communication/providers/status');
      return res.data;
    },
  });
}

// 5. Automation Rules
export function useAutomationRules(eventType?: string) {
  return useQuery<AutomationRule[]>({
    queryKey: ['automation-rules', eventType],
    queryFn: async () => {
      const url = eventType ? `/api/v1/automation/rules?eventType=${eventType}` : '/api/v1/automation/rules';
      const res = await apiClient.get(url);
      return res.data;
    },
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      const res = await apiClient.post('/api/v1/automation/rules', dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'] });
    },
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: any) => {
      const res = await apiClient.put(`/api/v1/automation/rules/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'] });
    },
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/api/v1/automation/rules/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'] });
    },
  });
}

// 6. Automation Executions
export function useAutomationExecutions(limit = 50, offset = 0) {
  return useQuery<{ items: AutomationExecution[]; total: number }>({
    queryKey: ['automation-executions', limit, offset],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/automation/executions?limit=${limit}&offset=${offset}`);
      return res.data;
    },
  });
}

// 7. Scheduled Jobs
export function useScheduledJobs(status?: string, limit = 50, offset = 0) {
  return useQuery<{ items: ScheduledJob[]; total: number }>({
    queryKey: ['automation-jobs', status, limit, offset],
    queryFn: async () => {
      const url = status
        ? `/api/v1/automation/jobs?status=${status}&limit=${limit}&offset=${offset}`
        : `/api/v1/automation/jobs?limit=${limit}&offset=${offset}`;
      const res = await apiClient.get(url);
      return res.data;
    },
  });
}

export function useCancelScheduledJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/api/v1/automation/jobs/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-jobs'] });
    },
  });
}

// 8. Automation Tasks
export function useAutomationTasks(status?: string, limit = 50, offset = 0) {
  return useQuery<{ items: AutomationTask[]; total: number }>({
    queryKey: ['automation-tasks', status, limit, offset],
    queryFn: async () => {
      const url = status
        ? `/api/v1/automation/tasks?status=${status}&limit=${limit}&offset=${offset}`
        : `/api/v1/automation/tasks?limit=${limit}&offset=${offset}`;
      const res = await apiClient.get(url);
      return res.data;
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiClient.put(`/api/v1/automation/tasks/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-tasks'] });
    },
  });
}

// 9. Trigger Test Event (Rule 78)
export function useTriggerTestEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      const res = await apiClient.post('/api/v1/automation/test-event', dto);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-executions'] });
      qc.invalidateQueries({ queryKey: ['communication-messages'] });
    },
  });
}

// 10. Process Pending Jobs (Rule 8)
export function useProcessPending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/api/v1/automation/jobs/process-pending');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-executions'] });
      qc.invalidateQueries({ queryKey: ['automation-jobs'] });
      qc.invalidateQueries({ queryKey: ['communication-messages'] });
    },
  });
}
