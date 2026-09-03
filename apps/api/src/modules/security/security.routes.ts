import { Router } from 'express';
import { SecurityController } from './security.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import {
  changePasswordSchema,
  verifyTotpSchema,
  updatePolicySchema,
  createIpRestrictionSchema,
} from './security.schema.js';

const router = Router();

router.use(authenticate);

// Personal Security
router.patch('/password', validateRequest({ body: changePasswordSchema }), SecurityController.changePassword);
router.post('/2fa/setup', SecurityController.setup2fa);
router.post('/2fa/verify', validateRequest({ body: verifyTotpSchema }), SecurityController.verify2fa);
router.post('/2fa/recovery-codes', SecurityController.regenerateRecoveryCodes);
router.delete('/2fa', SecurityController.disable2fa);
router.get('/sessions', SecurityController.getSessions);
router.delete('/sessions/:session_id', SecurityController.revokeSession);

// Admin Security
router.get('/policy', requirePermissions(['security.manage']), SecurityController.getPolicy);
router.patch('/policy', requirePermissions(['security.manage']), validateRequest({ body: updatePolicySchema }), SecurityController.updatePolicy);
router.get('/ip-restrictions', requirePermissions(['security.manage']), SecurityController.listIpRestrictions);
router.post('/ip-restrictions', requirePermissions(['security.manage']), validateRequest({ body: createIpRestrictionSchema }), SecurityController.createIpRestriction);
router.delete('/ip-restrictions/:rule_id', requirePermissions(['security.manage']), SecurityController.deleteIpRestriction);
router.get('/events', requirePermissions(['security.manage']), SecurityController.listSecurityEvents);
router.delete('/admin/sessions/:session_id', requirePermissions(['security.manage']), SecurityController.adminRevokeSession);
router.delete('/admin/2fa/:user_id', requirePermissions(['security.manage']), SecurityController.adminReset2fa);
router.post('/admin/unlock/:user_id', requirePermissions(['security.manage']), SecurityController.adminUnlockUser);

export default router;
