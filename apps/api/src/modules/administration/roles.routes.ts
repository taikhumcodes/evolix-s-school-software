import { Router } from 'express';
import { RolesController } from './roles.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { createRoleSchema, updateRoleSchema } from './roles.schema.js';

const router = Router();

router.use(authenticate);

router.get('', requirePermissions(['roles.manage']), RolesController.list);
router.post('', requirePermissions(['roles.manage']), validateRequest({ body: createRoleSchema }), RolesController.create);
router.patch('/:id', requirePermissions(['roles.manage']), validateRequest({ body: updateRoleSchema }), RolesController.update);
router.delete('/:id', requirePermissions(['roles.manage']), RolesController.delete);

export default router;
