import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { FamiliesController } from './families.controller.js';
import {
  createFamilySchema,
  updateFamilySchema,
  addFamilyMemberSchema,
  removeFamilyMemberSchema,
} from './families.schema.js';

const router = Router();

router.use(authenticate);

const canView = requirePermissions(['families.view']);
const canManage = requirePermissions(['families.manage']);

router.get('/', canView, FamiliesController.list);
router.post('/', canManage, validateRequest({ body: createFamilySchema }), FamiliesController.create);
router.get('/:id', canView, FamiliesController.getById);
router.patch('/:id', canManage, validateRequest({ body: updateFamilySchema }), FamiliesController.update);
router.post('/:id/members', canManage, validateRequest({ body: addFamilyMemberSchema }), FamiliesController.addMember);
router.delete('/:id/members', canManage, validateRequest({ body: removeFamilyMemberSchema }), FamiliesController.removeMember);

export default router;
