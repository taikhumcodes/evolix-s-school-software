import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

import { ReportsController } from './reports.controller.js';

reportsRouter.get('/datasets', ReportsController.getDatasets);
reportsRouter.post('/execute', ReportsController.execute);

reportsRouter.get('/', ReportsController.listReports);
reportsRouter.post('/', ReportsController.saveReport);
reportsRouter.get('/:id', ReportsController.getReport);
reportsRouter.delete('/:id', ReportsController.deleteReport);
