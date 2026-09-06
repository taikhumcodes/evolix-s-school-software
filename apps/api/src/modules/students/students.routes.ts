import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions, requireAnyPermission } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { StudentsController } from './students.controller.js';
import {
  createStudentSchema,
  updateStudentSchema,
  changeClassSectionSchema,
  withdrawStudentSchema,
  transferStudentSchema,
  reactivateStudentSchema,
  linkGuardianSchema,
  documentVerifySchema,
  addNoteSchema,
  disciplineSchema,
} from './students.schema.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const router = Router();

router.use(authenticate);

const canView = requirePermissions(['students.view']);
const canViewStudentOrChild = requireAnyPermission(['students.view', 'parent.children.view']);
const canManage = requirePermissions(['students.manage']);
const canDocManage = requirePermissions(['student.documents.manage']);
const canDisciplineManage = requirePermissions(['student.discipline.manage']);
const canImport = requirePermissions(['student.import']);
const canExport = requirePermissions(['student.export']);

// Overview & Directory
router.get('/overview', canView, StudentsController.getOverview);
router.get('/next-roll-number', canView, StudentsController.suggestRollNumber);
router.get('/', canViewStudentOrChild, StudentsController.list);
router.get('/export', canExport, StudentsController.exportStudents);

// Bulk Import
router.get('/import/template', canImport, StudentsController.getImportTemplate);
router.post('/import/preview', canImport, upload.single('file'), StudentsController.previewImport);
router.post('/import/commit', canImport, StudentsController.commitImport);

// Guardians lookup (for typeahead deduplication)
router.get('/guardians/search', canView, StudentsController.listGuardians);

// Direct Student Creation
router.post('/', canManage, validateRequest({ body: createStudentSchema }), StudentsController.createDirect);

// Single Student operations
router.get('/:id', canViewStudentOrChild, StudentsController.getById);
router.patch('/:id', canManage, validateRequest({ body: updateStudentSchema }), StudentsController.update);

// Photo
router.post('/:id/photo', canManage, upload.single('photo'), StudentsController.uploadPhoto);
router.delete('/:id/photo', canManage, StudentsController.removePhoto);

// Academic Enrollment & Class/Section Change
router.post('/:id/enrollments', canManage, validateRequest({ body: changeClassSectionSchema }), StudentsController.changeClassSection);

// Lifecycle: Withdrawal, Transfer, Reactivation
router.post('/:id/withdraw', canManage, validateRequest({ body: withdrawStudentSchema }), StudentsController.withdraw);
router.post('/:id/transfer', canManage, validateRequest({ body: transferStudentSchema }), StudentsController.transfer);
router.post('/:id/reactivate', canManage, validateRequest({ body: reactivateStudentSchema }), StudentsController.reactivate);

// Guardians linking
router.post('/:id/guardians', canManage, validateRequest({ body: linkGuardianSchema }), StudentsController.linkGuardian);
router.delete('/:id/guardians/:guardianId', canManage, StudentsController.unlinkGuardian);

// Documents
router.post('/:id/documents', canDocManage, upload.single('file'), StudentsController.uploadDocument);
router.patch('/:id/documents/:docId/verify', canDocManage, validateRequest({ body: documentVerifySchema }), StudentsController.verifyDocument);
router.delete('/:id/documents/:docId', canDocManage, StudentsController.archiveDocument);

// Notes
router.post('/:id/notes', canManage, validateRequest({ body: addNoteSchema }), StudentsController.addNote);

// Discipline
router.post('/:id/discipline', canDisciplineManage, validateRequest({ body: disciplineSchema }), StudentsController.addDiscipline);
router.patch('/:id/discipline/:disciplineId', canDisciplineManage, StudentsController.updateDiscipline);

export default router;
