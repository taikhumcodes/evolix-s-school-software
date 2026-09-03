import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import {
  loginSchema,
  refreshSchema,
  verify2faSchema,
  recoveryLoginSchema,
} from './auth.schema.js';

const router = Router();

router.post('/login', validateRequest({ body: loginSchema }), AuthController.login);
router.post('/verify-2fa', validateRequest({ body: verify2faSchema }), AuthController.verify2fa);
router.post('/recovery-login', validateRequest({ body: recoveryLoginSchema }), AuthController.recoveryLogin);
router.post('/refresh', validateRequest({ body: refreshSchema }), AuthController.refresh);
router.post('/logout', validateRequest({ body: refreshSchema }), AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);

export default router;
