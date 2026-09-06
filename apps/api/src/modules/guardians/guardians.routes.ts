import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { GuardiansController } from './guardians.controller.js';
import {
  createGuardianSchema,
  updateGuardianSchema,
  linkStudentSchema,
  updateStudentLinkSchema,
  checkDuplicateSchema,
  mergeGuardiansSchema,
  updatePreferencesSchema,
  verifyDocumentSchema,
  addNoteSchema,
} from './guardians.schema.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const router = Router();

router.use(authenticate);

const canView = requirePermissions(['guardians.view']);
const canManage = requirePermissions(['guardians.manage']);
const canMerge = requirePermissions(['guardians.merge']);
const canDocManage = requirePermissions(['guardians.documents.manage']);
const canParentAccess = requirePermissions(['parent_access.manage']);
const canImport = requirePermissions(['guardian.import']);
const canExport = requirePermissions(['guardian.export']);

// Overview & Directory
router.get('/overview', canView, GuardiansController.getOverview);
router.get('/', canView, GuardiansController.list);
router.get('/export', canExport, GuardiansController.exportGuardians);

// Bulk Import
router.post('/import/preview', canImport, upload.single('file'), GuardiansController.previewImport);
router.post('/import/commit', canImport, GuardiansController.commitImport);

// Deduplication & Merge
router.post('/check-duplicate', canView, validateRequest({ body: checkDuplicateSchema }), GuardiansController.checkDuplicate);
router.post('/merge', canMerge, validateRequest({ body: mergeGuardiansSchema }), GuardiansController.merge);

// Direct Creation
router.post('/', canManage, validateRequest({ body: createGuardianSchema }), GuardiansController.create);

// Single Guardian operations
router.get('/:id', canView, GuardiansController.getById);
router.patch('/:id', canManage, validateRequest({ body: updateGuardianSchema }), GuardiansController.update);
router.post('/:id/archive', canManage, GuardiansController.archive);
router.post('/:id/restore', canManage, GuardiansController.restore);

// Child Links
router.post('/:id/students', canManage, validateRequest({ body: linkStudentSchema }), GuardiansController.linkStudent);
router.patch('/:id/students/:studentId', canManage, validateRequest({ body: updateStudentLinkSchema }), GuardiansController.updateStudentLink);
router.delete('/:id/students/:studentId', canManage, GuardiansController.unlinkStudent);

// Parent Portal Access Foundation
router.post('/:id/portal-access', canParentAccess, GuardiansController.createPortalAccess);
router.delete('/:id/portal-access', canParentAccess, GuardiansController.disablePortalAccess);

// Preferences
router.patch('/:id/preferences', canManage, validateRequest({ body: updatePreferencesSchema }), GuardiansController.updatePreferences);

// Documents
router.post('/:id/documents', canDocManage, upload.single('file'), GuardiansController.uploadDocument);
router.patch('/:id/documents/:docId/verify', canDocManage, validateRequest({ body: verifyDocumentSchema }), GuardiansController.verifyDocument);

// Staff Notes
router.post('/:id/notes', canManage, validateRequest({ body: addNoteSchema }), GuardiansController.addNote);

export default router;
