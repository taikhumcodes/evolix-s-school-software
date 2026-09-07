import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAnyPermission, requirePermissions } from '../../middleware/rbac.js';
import { DocumentsController } from './documents.controller.js';

export const documentsRouter = Router();
documentsRouter.use(authenticate);

// ==========================================
// 1. TEMPLATES & VERSIONS
// ==========================================
documentsRouter.get(
  '/templates',
  requireAnyPermission(['documents.templates.view', 'documents.templates.manage']),
  DocumentsController.listTemplates
);

documentsRouter.post(
  '/templates',
  requirePermissions(['documents.templates.manage']),
  DocumentsController.createTemplate
);

documentsRouter.get(
  '/templates/:id',
  requireAnyPermission(['documents.templates.view', 'documents.templates.manage']),
  DocumentsController.getTemplateById
);

documentsRouter.put(
  '/templates/:id',
  requirePermissions(['documents.templates.manage']),
  DocumentsController.updateTemplate
);

documentsRouter.post(
  '/templates/:id/versions',
  requirePermissions(['documents.templates.manage']),
  DocumentsController.createTemplateVersion
);

documentsRouter.post(
  '/templates/:id/versions/:versionId/publish',
  requirePermissions(['documents.templates.manage']),
  DocumentsController.publishVersion
);

// ==========================================
// 2. PREVIEW & GENERATION
// ==========================================
documentsRouter.post(
  '/preview',
  requirePermissions(['documents.generate']),
  DocumentsController.previewDocument
);

documentsRouter.post(
  '/generate',
  requirePermissions(['documents.generate']),
  DocumentsController.generateDocument
);

documentsRouter.post(
  '/:id/finalize',
  requirePermissions(['documents.finalize']),
  DocumentsController.finalizeDocument
);

// ==========================================
// 3. REPRINT / DOWNLOAD (IMMUTABLE BYTES)
// ==========================================
documentsRouter.get(
  '/:id/download',
  requirePermissions(['documents.reprint']),
  DocumentsController.reprintOrDownloadDocument
);

documentsRouter.get(
  '/:id/reprint',
  requirePermissions(['documents.reprint']),
  DocumentsController.reprintOrDownloadDocument
);

// ==========================================
// 4. CANCELLATION & SUPERSEDING
// ==========================================
documentsRouter.post(
  '/:id/cancel',
  requirePermissions(['documents.cancel']),
  DocumentsController.cancelDocument
);

documentsRouter.post(
  '/:id/supersede',
  requirePermissions(['documents.cancel']),
  DocumentsController.supersedeDocument
);

// ==========================================
// 5. BULK GENERATION JOBS
// ==========================================
documentsRouter.post(
  '/bulk-jobs',
  requirePermissions(['documents.bulk.manage']),
  DocumentsController.createBulkJob
);

documentsRouter.get(
  '/bulk-jobs/:jobId',
  requirePermissions(['documents.bulk.manage']),
  DocumentsController.getBulkJob
);

// ==========================================
// 6. SIGNATURES & BRANDING ASSETS
// ==========================================
documentsRouter.get(
  '/signatures',
  requirePermissions(['documents.branding.manage']),
  DocumentsController.listSignatureAssets
);

documentsRouter.post(
  '/signatures',
  requirePermissions(['documents.branding.manage']),
  DocumentsController.createSignatureAsset
);

// ==========================================
// 7. GENERATED DOCUMENTS REGISTRY
// ==========================================
documentsRouter.get(
  '/',
  requireAnyPermission(['documents.verify.view', 'documents.generate']),
  DocumentsController.listGeneratedDocuments
);

// ==========================================
// 8. REPORTS & EXPORT
// ==========================================
documentsRouter.get(
  '/reports/export-csv',
  requireAnyPermission(['documents.verify.view', 'documents.generate']),
  DocumentsController.exportCsv
);

