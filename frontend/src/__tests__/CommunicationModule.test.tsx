import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommunicationLayout } from '../app/views/communication/CommunicationLayout';
import { CommunicationOverview } from '../app/views/communication/CommunicationOverview';
import { MessagesView } from '../app/views/communication/MessagesView';
import { TemplatesView } from '../app/views/communication/TemplatesView';
import { AutomationRulesView } from '../app/views/communication/AutomationRulesView';
import { ScheduledJobsView } from '../app/views/communication/ScheduledJobsView';
import { NotificationsView } from '../app/views/communication/NotificationsView';
import { TasksView } from '../app/views/communication/TasksView';
import { ReportsView } from '../app/views/communication/ReportsView';
import { SettingsView } from '../app/views/communication/SettingsView';
import { NotificationBell } from '../components/notifications/NotificationBell';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
  }),
}));

// Mock api-client
vi.mock('../lib/api-client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: 'col1,col2\nval1,val2' }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

// Stable Mock Data
const mockNotificationsData = {
  items: [
    {
      id: 'notif-1',
      userId: 'u-1',
      title: 'Student Marked Absent',
      body: 'Aarav Sharma was marked absent today.',
      category: 'ATTENDANCE',
      actionUrl: '/attendance',
      isRead: false,
      createdAt: '2026-09-07T00:00:00Z',
    },
  ],
  total: 1,
  unreadCount: 1,
};

const mockMessagesData = {
  items: [
    {
      id: 'msg-1',
      category: 'ATTENDANCE',
      channel: 'SMS',
      recipientType: 'STUDENT_GUARDIAN',
      destinationMasked: '******3210',
      subjectRendered: 'Absent Alert',
      bodyRendered: '[REDACTED]',
      status: 'SENT',
      queuedAt: '2026-09-07T00:00:00Z',
      sentAt: '2026-09-07T00:01:00Z',
      provider: 'mock-sms',
      attemptCount: 1,
      createdAt: '2026-09-07T00:00:00Z',
    },
  ],
  total: 1,
};

const mockMessageDetail = {
  id: 'msg-1',
  category: 'ATTENDANCE',
  channel: 'SMS',
  recipientType: 'STUDENT_GUARDIAN',
  destinationMasked: '******3210',
  subjectRendered: 'Absent Alert',
  bodyRendered: 'Student Aarav is absent.',
  status: 'SENT',
  queuedAt: '2026-09-07T00:00:00Z',
  sentAt: '2026-09-07T00:01:00Z',
  provider: 'mock-sms',
  attemptCount: 1,
  createdAt: '2026-09-07T00:00:00Z',
};

const mockTemplates = [
  {
    id: 'tmpl-1',
    name: 'Absent Alert SMS',
    code: 'ATTENDANCE_ABSENT_GUARDIAN_SMS',
    category: 'ATTENDANCE',
    channel: 'SMS',
    body: 'Hello {{studentName}}, absent today.',
    language: 'en',
    status: 'ACTIVE',
    version: 1,
    createdAt: '2026-09-07T00:00:00Z',
    updatedAt: '2026-09-07T00:00:00Z',
  },
];

const mockRules = [
  {
    id: 'rule-1',
    code: 'RULE_ABSENT_ALERT',
    name: 'Absent Alert Auto SMS',
    eventType: 'STUDENT_ABSENT',
    conditions: [],
    actions: [{ actionType: 'SEND_COMMUNICATION', channel: 'SMS' }],
    isActive: true,
    version: 1,
    createdAt: '2026-09-07T00:00:00Z',
    updatedAt: '2026-09-07T00:00:00Z',
  },
];

const mockJobsData = {
  items: [
    {
      id: 'job-1',
      jobType: 'DISPATCH_COMMUNICATION',
      sourceType: 'TEST',
      sourceId: 'src-1',
      scheduledFor: '2026-09-07T00:00:00Z',
      status: 'COMPLETED',
      attemptCount: 1,
      deferCount: 0,
      createdAt: '2026-09-07T00:00:00Z',
    },
  ],
  total: 1,
};

const mockTasksData = {
  items: [
    {
      id: 'task-1',
      title: 'Follow up on unexcused absence',
      priority: 'HIGH',
      status: 'PENDING',
      createdAt: '2026-09-07T00:00:00Z',
    },
  ],
  total: 1,
};

const mockSettings = {
  id: 'set-1',
  schoolId: 'sch-1',
  defaultChannels: ['IN_APP', 'SMS'],
  quietHoursEnabled: true,
  quietHoursStart: '21:00',
  quietHoursEnd: '07:00',
  bulkApprovalThreshold: 100,
  version: 1,
};

const mockProviders = [
  {
    provider: 'mock-sms',
    channel: 'SMS',
    configured: true,
    available: true,
    statusText: 'Mock SMS gateway active for dev/test',
    lastCheckedAt: '2026-09-07T00:00:00Z',
  },
];

// Mock Communication API
vi.mock('../lib/api/communication', () => ({
  useProcessPending: () => ({ mutate: vi.fn(), isPending: false }),
  useMyNotifications: () => ({ data: mockNotificationsData, isLoading: false }),
  useMarkNotificationRead: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useMarkAllNotificationsRead: () => ({ mutate: vi.fn(), isPending: false }),
  useCommunicationMessages: () => ({ data: mockMessagesData, isLoading: false, refetch: vi.fn() }),
  useMessageDetail: () => ({ data: mockMessageDetail, isLoading: false }),
  useRetryMessage: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelMessage: () => ({ mutate: vi.fn(), isPending: false }),
  useRecordManualSend: () => ({ mutate: vi.fn(), isPending: false }),
  useCommunicationTemplates: () => ({ data: mockTemplates, isLoading: false, refetch: vi.fn() }),
  useCreateTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAutomationRules: () => ({ data: mockRules, isLoading: false, refetch: vi.fn() }),
  useCreateRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTriggerTestEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useScheduledJobs: () => ({ data: mockJobsData, isLoading: false, refetch: vi.fn() }),
  useCancelScheduledJob: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAutomationTasks: () => ({ data: mockTasksData, isLoading: false }),
  useUpdateTaskStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useAutomationExecutions: () => ({ data: { items: [], total: 0 }, isLoading: false }),
  useCommunicationSettings: () => ({ data: mockSettings, isLoading: false }),
  useUpdateCommunicationSettings: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useProviderStatuses: () => ({ data: mockProviders, isLoading: false }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{component}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('EVOLIX School ERP — Frontend Major Module 10 Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CommunicationLayout with all navigation sub-tabs and Process Pending button', () => {
    renderWithProviders(<CommunicationLayout />);

    expect(screen.getByText('Communication & Automation')).toBeDefined();
    expect(screen.getByText('M10')).toBeDefined();
    expect(screen.getByText('Process Pending')).toBeDefined();

    // Verify sub-nav tabs
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Messages')).toBeDefined();
    expect(screen.getByText('Templates')).toBeDefined();
    expect(screen.getByText('Automation Rules')).toBeDefined();
    expect(screen.getByText('Scheduled Jobs')).toBeDefined();
    expect(screen.getByText('Notifications')).toBeDefined();
    expect(screen.getByText('Internal Tasks')).toBeDefined();
    expect(screen.getByText('Reports & Logs')).toBeDefined();
    expect(screen.getByText('Settings & Providers')).toBeDefined();
  });

  it('renders NotificationBell with unread count badge and toggles dropdown', () => {
    renderWithProviders(<NotificationBell />);

    const bellBtn = screen.getByTitle('In-App Notifications');
    expect(bellBtn).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();

    fireEvent.click(bellBtn);
    expect(screen.getByText('Student Marked Absent')).toBeDefined();
    expect(screen.getByText('Aarav Sharma was marked absent today.')).toBeDefined();
  });

  it('renders CommunicationOverview with KPIs and provider cards', () => {
    renderWithProviders(<CommunicationOverview />);

    expect(screen.getByText('Total Messages')).toBeDefined();
    expect(screen.getByText('Active Rules')).toBeDefined();
    expect(screen.getByText('Provider Connectivity Status')).toBeDefined();
  });

  it('renders MessagesView with masked destination and outbox list', () => {
    renderWithProviders(<MessagesView />);

    expect(screen.getByText('All Categories')).toBeDefined();
    expect(screen.getByText('******3210')).toBeDefined();
    expect(screen.getByText('SENT')).toBeDefined();
  });

  it('renders TemplatesView with template code and version badge', () => {
    renderWithProviders(<TemplatesView />);

    expect(screen.getByText('Absent Alert SMS')).toBeDefined();
    expect(screen.getByText('ATTENDANCE_ABSENT_GUARDIAN_SMS')).toBeDefined();
    expect(screen.getByText('v1')).toBeDefined();
    expect(screen.getByText('New Template')).toBeDefined();
  });

  it('renders AutomationRulesView with rules list and trigger event button', () => {
    renderWithProviders(<AutomationRulesView />);

    expect(screen.getByText('Event-Driven Automation Workflows')).toBeDefined();
    expect(screen.getByText('Absent Alert Auto SMS')).toBeDefined();
    expect(screen.getByText(/RULE_ABSENT_ALERT/)).toBeDefined();
    expect(screen.getByText('Trigger Test Event')).toBeDefined();
  });

  it('renders ScheduledJobsView with scheduled job list', () => {
    renderWithProviders(<ScheduledJobsView />);

    expect(screen.getByText('All Statuses')).toBeDefined();
    expect(screen.getByText('DISPATCH_COMMUNICATION')).toBeDefined();
    expect(screen.getByText('COMPLETED')).toBeDefined();
  });

  it('renders NotificationsView with in-app notification list', () => {
    renderWithProviders(<NotificationsView />);

    expect(screen.getByText('In-App Notifications')).toBeDefined();
    expect(screen.getByText('Student Marked Absent')).toBeDefined();
    expect(screen.getByText('Open')).toBeDefined();
  });

  it('renders TasksView with automated workflow task cards', () => {
    renderWithProviders(<TasksView />);

    expect(screen.getByText('Internal Automated Tasks')).toBeDefined();
    expect(screen.getByText('Follow up on unexcused absence')).toBeDefined();
    expect(screen.getByText('HIGH')).toBeDefined();
  });

  it('renders ReportsView with audit telemetry tabs', () => {
    renderWithProviders(<ReportsView />);

    expect(screen.getByText('Reports & Audit Logs')).toBeDefined();
    expect(screen.getByText('Export Messages CSV')).toBeDefined();
  });

  it('renders SettingsView with quiet hours form and provider status grid', () => {
    renderWithProviders(<SettingsView />);

    expect(screen.getByText('Communication & Provider Settings')).toBeDefined();
    expect(screen.getByText('Quiet Hours Protection')).toBeDefined();
    expect(screen.getByText('Bulk Send Approval Threshold')).toBeDefined();
    expect(screen.getByText('Provider Status Grid')).toBeDefined();
    expect(screen.getByText('Save Configuration')).toBeDefined();
  });
});
