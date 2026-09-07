import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

analyticsRouter.get(
  '/executive-kpi',
  requirePermissions(['analytics.view']),
  AnalyticsController.getExecutiveKpi
);

analyticsRouter.get(
  '/students',
  requirePermissions(['analytics.view', 'students.view']),
  AnalyticsController.getStudentAnalytics
);

analyticsRouter.get(
  '/attendance',
  requirePermissions(['analytics.view', 'attendance.view']),
  AnalyticsController.getAttendanceAnalytics
);

analyticsRouter.get(
  '/finance',
  requirePermissions(['analytics.view', 'finance.view']),
  AnalyticsController.getFinanceAnalytics
);

analyticsRouter.get(
  '/hr',
  requirePermissions(['analytics.view', 'hr.view']),
  AnalyticsController.getHrAnalytics
);
