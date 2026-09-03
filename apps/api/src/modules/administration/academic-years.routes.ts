import { Router } from 'express';
import { AcademicYearsController } from './academic-years.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { createAcademicYearSchema, updateAcademicYearSchema } from './academic-years.schema.js';

const router = Router();

router.use(authenticate);

router.get('', requirePermissions(['academic.manage']), AcademicYearsController.list);
router.post('', requirePermissions(['academic.manage']), validateRequest({ body: createAcademicYearSchema }), AcademicYearsController.create);
router.patch('/:id', requirePermissions(['academic.manage']), validateRequest({ body: updateAcademicYearSchema }), AcademicYearsController.update);

export default router;
