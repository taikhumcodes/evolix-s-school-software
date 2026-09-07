import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions, requireAnyPermission } from '../../middleware/rbac.js';
import { CommunicationController } from './communication.controller.js';
import { AutomationController } from './automation.controller.js';

export const communicationRouter = Router();
communicationRouter.use(authenticate);

// 1. Templates
communicationRouter.get(
  '/templates',
  requireAnyPermission(['communication.view', 'communication.templates.manage']),
  CommunicationController.listTemplates
);
communicationRouter.post(
  '/templates',
  requirePermissions(['communication.templates.manage']),
  CommunicationController.createTemplate
);
communicationRouter.put(
  '/templates/:id',
  requirePermissions(['communication.templates.manage']),
  CommunicationController.updateTemplate
);

// 2. Batches
communicationRouter.post(
  '/batches',
  requirePermissions(['communication.bulk.manage']),
  CommunicationController.createBatch
);
communicationRouter.get(
  '/batches/:id/preview',
  requirePermissions(['communication.bulk.manage']),
  CommunicationController.previewBatch
);
communicationRouter.post(
  '/batches/:id/approve',
  requirePermissions(['communication.bulk.approve']),
  CommunicationController.approveBatch
);
communicationRouter.post(
  '/batches/:id/queue',
  requirePermissions(['communication.bulk.manage']),
  CommunicationController.queueBatch
);

// 3. Messages Outbox & History
communicationRouter.get(
  '/messages',
  requireAnyPermission(['communication.view', 'payroll.view', 'exams.view', 'results.view', 'transport.view']),
  CommunicationController.listMessages
);
communicationRouter.get(
  '/messages/export',
  requirePermissions(['communication.export']),
  CommunicationController.exportMessagesCsv
);
communicationRouter.get(
  '/messages/:id',
  requireAnyPermission(['communication.view', 'payroll.view', 'exams.view', 'results.view', 'transport.view']),
  CommunicationController.getMessageDetail
);
communicationRouter.post(
  '/messages/:id/retry',
  requirePermissions(['communication.send']),
  CommunicationController.retryMessage
);
communicationRouter.post(
  '/messages/:id/cancel',
  requirePermissions(['communication.send']),
  CommunicationController.cancelMessage
);
communicationRouter.post(
  '/messages/:id/manual-confirm',
  requirePermissions(['communication.send']),
  CommunicationController.recordManualSend
);

// 4. In-App Notifications (Current User)
communicationRouter.get(
  '/notifications',
  CommunicationController.listMyNotifications
);
communicationRouter.put(
  '/notifications/:id/read',
  CommunicationController.markNotificationAsRead
);
communicationRouter.put(
  '/notifications/mark-all-read',
  CommunicationController.markAllNotificationsAsRead
);

// 5. Settings & Provider Health
communicationRouter.get(
  '/settings',
  requireAnyPermission(['communication.view', 'communication.settings.manage']),
  CommunicationController.getSettings
);
communicationRouter.put(
  '/settings',
  requirePermissions(['communication.settings.manage']),
  CommunicationController.updateSettings
);
communicationRouter.get(
  '/providers/status',
  requireAnyPermission(['communication.view', 'communication.settings.manage']),
  CommunicationController.getProvidersStatus
);

// ==========================================
// AUTOMATION ROUTER
// ==========================================
export const automationRouter = Router();
automationRouter.use(authenticate);

// 1. Rules
automationRouter.get(
  '/rules',
  requireAnyPermission(['automation.view', 'automation.manage']),
  AutomationController.listRules
);
automationRouter.get(
  '/rules/:id',
  requireAnyPermission(['automation.view', 'automation.manage']),
  AutomationController.getRule
);
automationRouter.post(
  '/rules',
  requirePermissions(['automation.manage']),
  AutomationController.createRule
);
automationRouter.put(
  '/rules/:id',
  requirePermissions(['automation.manage']),
  AutomationController.updateRule
);
automationRouter.delete(
  '/rules/:id',
  requirePermissions(['automation.manage']),
  AutomationController.deleteRule
);

// 2. Executions Log
automationRouter.get(
  '/executions',
  requireAnyPermission(['automation.view', 'automation.manage']),
  AutomationController.listExecutions
);

// 3. Scheduled Jobs
automationRouter.get(
  '/jobs',
  requireAnyPermission(['automation.view', 'automation.manage']),
  AutomationController.listJobs
);
automationRouter.post(
  '/jobs/:id/cancel',
  requirePermissions(['automation.manage']),
  AutomationController.cancelJob
);

// 4. Tasks
automationRouter.get(
  '/tasks',
  requireAnyPermission(['automation.view', 'automation.tasks.manage']),
  AutomationController.listTasks
);
automationRouter.put(
  '/tasks/:id/status',
  requirePermissions(['automation.tasks.manage']),
  AutomationController.updateTaskStatus
);

// 5. Trigger Test Event (Rule 78)
automationRouter.post(
  '/test-event',
  requirePermissions(['automation.execute']),
  AutomationController.triggerTestEvent
);

// 6. Manual Process Pending Worker (Rule 8)
automationRouter.post(
  '/jobs/process-pending',
  requirePermissions(['automation.execute']),
  AutomationController.processPending
);
