import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { SetupController } from './setup.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermissions(['settings.manage']));

router.get('/status', SetupController.getStatus);
router.post('/step/:step_name', SetupController.executeStep);
router.post('/complete', SetupController.completeSetup);

export default router;
