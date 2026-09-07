import {
  CommunicationChannel,
  CommunicationCategory,
  TemplateLanguage,
  MessageStatus,
  RecipientType,
  BatchStatus,
  SendEvidenceType,
  AutomationEventType,
  AutomationActionType,
  EventProcessingStatus,
  JobStatus,
  TaskStatus,
} from '@prisma/client';

export type AutomationConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL'
  | 'CONTAINS'
  | 'IN'
  | 'NOT_IN';

export interface ScopeContext {
  tenantId: string;
  schoolId: string;
  userId: string;
  ipAddress?: string;
  permissions: string[];
  isSuperAdmin?: boolean;
}

export type ConditionDataType = 'STRING' | 'NUMBER' | 'DECIMAL' | 'BOOLEAN' | 'DATE' | 'ENUM';

export interface RuleCondition {
  field: string;
  operator: AutomationConditionOperator;
  value: any;
  dataType?: ConditionDataType;
}

export interface RuleAction {
  actionType: AutomationActionType;
  channel?: CommunicationChannel;
  templateCode?: string;
  recipientType?: RecipientType;
  customRecipientId?: string;
  inAppTitle?: string;
  inAppBody?: string;
  taskTitle?: string;
  taskDescription?: string;
  taskRole?: string;
  taskDueDays?: number;
  deferHours?: number;
  isUrgent?: boolean;
}

export interface ProviderSendOptions {
  messageId: string;
  channel: CommunicationChannel;
  destination: string;
  recipientName?: string;
  subject?: string;
  body: string;
  isTest?: boolean;
  metadata?: Record<string, any>;
}

export interface ProviderSendResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  status: MessageStatus;
  evidenceType?: SendEvidenceType;
  deliveryMode?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponseSafe?: Record<string, any>;
}

export interface ProviderHealthResult {
  provider: string;
  channel: CommunicationChannel;
  configured: boolean;
  available: boolean;
  statusText: string;
  lastCheckedAt: string;
}

export interface ResolvedRecipient {
  referenceId: string;
  type: RecipientType;
  name: string;
  email?: string;
  phone?: string;
  preferredLanguage?: TemplateLanguage;
  studentId?: string;
  studentName?: string;
}
