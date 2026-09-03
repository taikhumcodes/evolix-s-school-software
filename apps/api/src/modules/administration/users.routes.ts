import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { createUserSchema, updateUserSchema } from './users.schema.js';

const router = Router();

router.use(authenticate);

router.get('', requirePermissions(['users.manage']), UsersController.list);
router.get('/:id', requirePermissions(['users.manage']), UsersController.get);
router.post('', requirePermissions(['users.manage']), validateRequest({ body: createUserSchema }), UsersController.create);
router.patch('/:id', requirePermissions(['users.manage']), validateRequest({ body: updateUserSchema }), UsersController.update);
router.delete('/:id', requirePermissions(['users.manage']), UsersController.delete);

export default router;
