import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { AdmissionsController } from './admissions.controller.js';
import {
  createAdmissionSchema,
  updateAdmissionSchema,
  checkDuplicateSchema,
  updateStatusSchema,
  convertAdmissionSchema,
} from './admissions.schema.js';

const router = Router();

router.use(authenticate);

const canView = requirePermissions(['admissions.view']);
const canManage = requirePermissions(['admissions.manage']);

router.get('/', canView, AdmissionsController.list);
router.post('/check-duplicate', canView, validateRequest({ body: checkDuplicateSchema }), AdmissionsController.checkDuplicates);
router.post('/', canManage, validateRequest({ body: createAdmissionSchema }), AdmissionsController.create);
router.get('/:id', canView, AdmissionsController.getById);
router.patch('/:id', canManage, validateRequest({ body: updateAdmissionSchema }), AdmissionsController.update);
router.post('/:id/status', canManage, validateRequest({ body: updateStatusSchema }), AdmissionsController.updateStatus);
router.post('/:id/convert', canManage, validateRequest({ body: convertAdmissionSchema }), AdmissionsController.convert);

export default router;
