import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/rbac.js';
import { OperationsController } from './operations.controller.js';
import { transportRouter } from './transport.routes.js';
import { inventoryRouter, assetsRouter } from './inventory.routes.js';
import { gateRouter } from './gate.routes.js';
import { eventsRouter } from './events.routes.js';

export const operationsRouter = Router();
operationsRouter.use(authenticate);

// 1. Dashboard Overview (Self-filtering per user permissions)
const dashboardPerms = [
  'operations.view',
  'transport.view',
  'transport.manage',
  'inventory.view',
  'inventory.manage',
  'inventory.assets.view',
  'inventory.assets.manage',
  'assets.view',
  'assets.manage',
  'gate.view',
  'gate.manage',
  'events.view',
  'events.manage',
];

operationsRouter.get(
  ['/dashboard', '/dashboard/overview'],
  requireAnyPermission(dashboardPerms),
  OperationsController.getDashboardOverview
);

// 2. Reports
operationsRouter.get(
  '/reports/transport',
  requireAnyPermission(['transport.view', 'transport.export', 'transport.manage']),
  OperationsController.getTransportReport
);

operationsRouter.get(
  '/reports/inventory',
  requireAnyPermission(['inventory.view', 'inventory.export', 'inventory.manage']),
  OperationsController.getInventoryStockReport
);

operationsRouter.get(
  '/reports/assets',
  requireAnyPermission(['inventory.assets.view', 'inventory.export', 'inventory.assets.manage', 'assets.view', 'assets.manage']),
  OperationsController.getAssetRegisterReport
);

operationsRouter.get(
  '/reports/visitors',
  requireAnyPermission(['gate.view', 'gate.export', 'gate.manage']),
  OperationsController.getVisitorLogReport
);

operationsRouter.get(
  '/reports/events',
  requireAnyPermission(['events.view', 'events.export', 'events.manage']),
  OperationsController.getEventReport
);

// 3. Sub-domain Routers
operationsRouter.use('/transport', transportRouter);
operationsRouter.use('/inventory', inventoryRouter);
operationsRouter.use('/assets', assetsRouter);
operationsRouter.use('/gate', gateRouter);
operationsRouter.use('/events', eventsRouter);
