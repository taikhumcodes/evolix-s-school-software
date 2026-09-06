import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { SearchController } from './search.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', SearchController.search);
router.get('/deep', SearchController.search);

export default router;
