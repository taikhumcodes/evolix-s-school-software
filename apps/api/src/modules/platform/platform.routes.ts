import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

export const platformRouter = Router();

platformRouter.use(authenticate);

import { PlatformController } from './platform.controller.js';
import { requirePermissions } from '../../middleware/rbac.js';

platformRouter.get('/overview', requirePermissions(['platform.view']), PlatformController.getOverview);
platformRouter.get('/health', requirePermissions(['platform.view']), PlatformController.getHealth);
platformRouter.get('/audit-logs', requirePermissions(['platform.audit']), PlatformController.getAuditLogs);

platformRouter.get('/exports', requirePermissions(['platform.export']), PlatformController.listExports);
platformRouter.post('/exports', requirePermissions(['platform.export']), PlatformController.exportData);

platformRouter.get('/backups', requirePermissions(['platform.backup']), PlatformController.listBackups);
platformRouter.post('/backups', requirePermissions(['platform.backup']), PlatformController.backupSystem);
platformRouter.get('/backups/:id/preflight', requirePermissions(['platform.backup']), PlatformController.restorePreflight);
