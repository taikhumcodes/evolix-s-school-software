import { Request, Response, NextFunction } from 'express';
import { DocumentsService } from './documents.service.js';
import {
  CancelDocumentSchema,
  CreateBulkJobSchema,
  CreateSignatureAssetSchema,
  CreateTemplateSchema,
  CreateTemplateVersionSchema,
  GenerateDocumentSchema,
  UpdateTemplateSchema,
} from './documents.types.js';

function getScope(req: Request) {
  const tenantId = req.user?.tenantId;
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = req.user?.id;

  if (!tenantId || !schoolId) {
    throw new Error('Tenant ID and School ID are required in request context.');
  }

  return {
    tenantId,
    schoolId,
    userId: userId || '',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  };
}

export class DocumentsController {
  // ==========================================
  // TEMPLATES
  // ==========================================

  public static async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = getScope(req);
      const { category, documentType, status, search } = req.query as any;
      const templates = await DocumentsService.listTemplates(tenantId, schoolId, {
        category,
        documentType,
        status,
        search,
      });
      res.json(templates);
    } catch (err) {
      next(err);
    }
  }

  public static async getTemplateById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = getScope(req);
      const template = await DocumentsService.getTemplateById(
        tenantId,
        schoolId,
        req.params.id as string
      );
      res.json(template);
    } catch (err) {
      next(err);
    }
  }

  public static async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = getScope(req);
      const dto = CreateTemplateSchema.parse(req.body);
      const template = await DocumentsService.createTemplate(tenantId, schoolId, userId, dto);
      res.status(201).json(template);
    } catch (err) {
      next(err);
    }
  }

  public static async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = getScope(req);
      const dto = UpdateTemplateSchema.parse(req.body);
      const template = await DocumentsService.updateTemplate(
        tenantId,
        schoolId,
        req.params.id as string,
        userId,
        dto
      );
      res.json(template);
    } catch (err) {
      next(err);
    }
  }

  public static async createTemplateVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = getScope(req);
      const dto = CreateTemplateVersionSchema.parse(req.body);
      const version = await DocumentsService.createTemplateVersion(
        tenantId,
        schoolId,
        req.params.id as string,
        userId,
        dto
      );
      res.status(201).json(version);
    } catch (err) {
      next(err);
    }
  }

  public static async publishVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = getScope(req);
      const template = await DocumentsService.publishVersion(
        tenantId,
        schoolId,
        req.params.id as string,
        req.params.versionId as string,
        userId
      );
      res.json(template);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // PREVIEW
  // ==========================================

  public static async previewDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = getScope(req);
      const { templateId, sourceType, sourceId, templateVersionId, customVariables, layoutDefinition } = req.body;

      if (!templateId) {
        return res.status(400).json({ error: 'templateId is required.' });
      }

      const preview = await DocumentsService.previewDocument(
        tenantId,
        schoolId,
        templateId,
        sourceType || 'STUDENT',
        sourceId || 'preview-sample-id',
        { templateVersionId, customVariables, layoutDefinition }
      );

      // Return PDF if requested as application/pdf or JSON snapshot
      if (req.headers.accept?.includes('application/pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
        res.setHeader('X-Page-Count', String(preview.pageCount));
        res.setHeader('X-Checksum-SHA256', preview.checksumSha256);
        return res.send(preview.pdfBuffer);
      }

      res.json({
        pageCount: preview.pageCount,
        checksumSha256: preview.checksumSha256,
        dataSnapshot: preview.dataSnapshot,
        pdfBase64: preview.pdfBuffer.toString('base64'),
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // GENERATION & ATOMIC FINALIZATION
  // ==========================================

  public static async generateDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = getScope(req);
      const dto = GenerateDocumentSchema.parse(req.body);
      const document = await DocumentsService.generateDocument(tenantId, schoolId, userId, dto);
      res.status(201).json(document);
    } catch (err) {
      next(err);
    }
  }

  public static async finalizeDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = getScope(req);
      const document = await DocumentsService.finalizeDocument(
        tenantId,
        schoolId,
        req.params.id as string,
        userId
      );
      res.json(document);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // REPRINT / DOWNLOAD (IMMUTABLE BYTES)
  // ==========================================

  public static async reprintOrDownloadDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { tenantId, schoolId, userId, ipAddress, userAgent } = getScope(req);
      const result = await DocumentsService.getOrReprintDocument(
        tenantId,
        schoolId,
        req.params.id as string,
        userId,
        ipAddress,
        userAgent
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${result.filename}"`);
      res.setHeader('X-Document-Number', result.document.documentNumber || '');
      res.setHeader('X-Checksum-SHA256', result.checksumSha256);
      res.setHeader('X-Reprint-Count', String(result.document.reprintCount));

      res.send(result.pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // CANCELLATION & SUPERSEDING
  // ==========================================

  public static async cancelDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = getScope(req);
      const dto = CancelDocumentSchema.parse(req.body);
      const cancelled = await DocumentsService.cancelDocument(
        tenantId,
        schoolId,
        req.params.id as string,
        userId,
        dto.reason
      );
      res.json(cancelled);
    } catch (err) {
      next(err);
    }
  }

  public static async supersedeDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = getScope(req);
      const dto = GenerateDocumentSchema.parse(req.body);
      const newDoc = await DocumentsService.supersedeDocument(
        tenantId,
        schoolId,
        req.params.id as string,
        userId,
        dto
      );
      res.status(201).json(newDoc);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // BULK GENERATION
  // ==========================================

  public static async createBulkJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = getScope(req);
      const dto = CreateBulkJobSchema.parse(req.body);
      const job = await DocumentsService.createBulkJob(tenantId, schoolId, userId, dto);
      res.status(202).json(job);
    } catch (err) {
      next(err);
    }
  }

  public static async getBulkJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = getScope(req);
      const job = await DocumentsService.getBulkJobById(
        tenantId,
        schoolId,
        req.params.jobId as string
      );
      res.json(job);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // SIGNATURES & BRANDING ASSETS
  // ==========================================

  public static async listSignatureAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = getScope(req);
      const assets = await DocumentsService.listSignatureAssets(tenantId, schoolId);
      res.json(assets);
    } catch (err) {
      next(err);
    }
  }

  public static async createSignatureAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = getScope(req);
      const dto = CreateSignatureAssetSchema.parse(req.body);
      const asset = await DocumentsService.createSignatureAsset(tenantId, schoolId, dto);
      res.status(201).json(asset);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // GENERATED DOCUMENTS LISTING
  // ==========================================

  public static async listGeneratedDocuments(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { tenantId, schoolId } = getScope(req);
      const { documentType, category, status, search, page, limit } = req.query as any;
      const list = await DocumentsService.listGeneratedDocuments(tenantId, schoolId, {
        documentType,
        category,
        status,
        search,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  public static async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = getScope(req);
      const csv = await DocumentsService.exportDocumentRegisterCsv(tenantId, schoolId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="document_register_${new Date().toISOString().slice(0, 10)}.csv"`
      );
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}

