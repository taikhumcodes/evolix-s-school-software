import crypto from 'node:crypto';
import path from 'node:path';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import {
  ConflictError,
  ValidationError,
  NotFoundError,
} from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { getStorageProvider } from '../../services/storage.service.js';
import {
  CAMEL_TO_SNAKE,
  SECTION_FIELDS,
  SNAKE_TO_CAMEL,
  validateIdentifierFormat,
} from './configuration.constants.js';
import { ConfigurationService } from './configuration.service.js';

const router = Router();
const ALLOWED_BRANDING_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.ico']);
const ALLOWED_BRANDING_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/pjpeg',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_BRANDING_EXTS.has(ext)) {
      return cb(new ValidationError('Unsupported file format. Allowed types: PNG, JPEG, WebP, ICO'));
    }
    const mime = file.mimetype.toLowerCase();
    if (!ALLOWED_BRANDING_MIMES.has(mime)) {
      return cb(new ValidationError('Unsupported MIME type. Allowed types: image/png, image/jpeg, image/webp, image/x-icon'));
    }
    cb(null, true);
  },
});

// Public asset retrieval (must be before authenticate so HTML <img> tags can render without Authorization header)
router.get('/branding/asset/:asset_type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.school_id as string;
    if (!schoolId) {
      throw new ValidationError('school_id is required');
    }

    const branding = await prisma.brandingConfiguration.findUnique({
      where: { schoolId },
    });

    if (!branding) {
      throw new NotFoundError('Branding asset not found');
    }

    const assetType = Array.isArray(req.params.asset_type) ? req.params.asset_type[0] : req.params.asset_type;
    let storageKey: string | null = null;
    let contentType = 'image/png';

    if (assetType === 'logo') {
      if (!branding.logoFileId && !branding.logoStorageKey) {
        throw new NotFoundError('Branding asset not found');
      }
      storageKey = branding.logoStorageKey || `schools/${schoolId}/branding/logo`;
      contentType = branding.logoContentType || 'image/png';
    } else if (assetType === 'compact_logo') {
      if (!branding.compactLogoFileId) {
        throw new NotFoundError('Branding asset not found');
      }
      storageKey = `schools/${schoolId}/branding/compact_logo`;
      contentType = 'image/png';
    } else if (assetType === 'favicon') {
      if (!branding.faviconFileId) {
        throw new NotFoundError('Branding asset not found');
      }
      storageKey = `schools/${schoolId}/branding/favicon`;
      contentType = 'image/x-icon';
    } else {
      throw new NotFoundError('Branding asset not found');
    }

    if (!storageKey) {
      throw new NotFoundError('Branding asset not found');
    }

    const storage = getStorageProvider();
    const bytes = await storage.getBytes(storageKey);
    if (!bytes) {
      throw new NotFoundError('Asset file missing');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.send(bytes);
  } catch (err) {
    next(err);
  }
});

router.use(authenticate);

// 1. Overview
router.get('', requirePermissions(['settings.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.school_id as string | undefined;
    const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);
    const config = await ConfigurationService.getOrCreateConfig(req.user!.tenantId, school.id);
    const branding = await ConfigurationService.getOrCreateBranding(req.user!.tenantId, school.id);

    const categories: Record<string, any> = {};
    for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
      const isConfigured = fields.some((f) => {
        const val = (config as any)[f];
        return val !== null && val !== undefined && val !== '';
      });
      categories[section] = {
        status: isConfigured ? 'Configured' : 'Needs Setup',
        updated_at: config.updatedAt.toISOString(),
      };
    }
    categories['branding'] = {
      status: branding.logoFileId || branding.letterheadText ? 'Configured' : 'Needs Setup',
      updated_at: branding.updatedAt.toISOString(),
    };

    res.json({
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
      },
      version: config.version,
      categories,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Effective Configuration
router.get('/effective', requirePermissions(['settings.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.school_id as string | undefined;
    const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);
    const config = await ConfigurationService.getOrCreateConfig(req.user!.tenantId, school.id);
    res.json(ConfigurationService.serializeConfig(config));
  } catch (err) {
    next(err);
  }
});

// 3. Branding
router.get('/branding', requirePermissions(['settings.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.school_id as string | undefined;
    const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);
    const branding = await ConfigurationService.getOrCreateBranding(req.user!.tenantId, school.id);
    res.json(ConfigurationService.serializeBranding(branding));
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/branding',
  requirePermissions(['settings.manage']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.query.school_id as string | undefined;
      const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);
      const branding = await ConfigurationService.getOrCreateBranding(req.user!.tenantId, school.id);

      const { version, values } = req.body;
      if (version !== undefined && version !== branding.version) {
        throw new ConflictError('CONFIGURATION_VERSION_CONFLICT');
      }

      const before = ConfigurationService.serializeBranding(branding);
      const updateData: any = { version: branding.version + 1 };

      if (values && typeof values === 'object') {
        const ignoredKeys = new Set([
          'id',
          'school_id',
          'schoolId',
          'version',
          'tenant_id',
          'tenantId',
          'created_at',
          'createdAt',
          'updated_at',
          'updatedAt',
        ]);

        for (const [rawKey, rawVal] of Object.entries(values)) {
          if (ignoredKeys.has(rawKey)) continue;

          // Support both snake_case and camelCase keys
          const key = rawKey.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());

          if (key === 'primaryPrintColor' || rawKey === 'primary_print_color') {
            if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
              const str = String(rawVal).trim();
              if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(str)) {
                throw new ValidationError('Invalid hex color for Primary Print Color: must be #RRGGBB or #RGB');
              }
              updateData.primaryPrintColor = str;
            }
          } else if (key === 'accentPrintColor' || rawKey === 'accent_print_color') {
            if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
              const str = String(rawVal).trim();
              if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(str)) {
                throw new ValidationError('Invalid hex color for Accent Print Color: must be #RRGGBB or #RGB');
              }
              updateData.accentPrintColor = str;
            }
          } else if (key === 'letterheadText' || rawKey === 'letterhead_text') {
            if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '') {
              updateData.letterheadText = null;
            } else {
              const str = String(rawVal).trim();
              if (str.length > 500) {
                throw new ValidationError('Letterhead text exceeds maximum allowed length of 500 characters');
              }
              updateData.letterheadText = str;
            }
          } else if (key === 'footerText' || rawKey === 'footer_text') {
            if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '') {
              updateData.footerText = null;
            } else {
              const str = String(rawVal).trim();
              if (str.length > 500) {
                throw new ValidationError('Footer text exceeds maximum allowed length of 500 characters');
              }
              updateData.footerText = str;
            }
          } else if (key === 'logoFileId' || rawKey === 'logo_file_id') {
            updateData.logoFileId = rawVal ? String(rawVal).trim().substring(0, 255) : null;
          } else if (key === 'logoStorageKey' || rawKey === 'logo_storage_key') {
            updateData.logoStorageKey = rawVal ? String(rawVal).trim().substring(0, 500) : null;
          } else if (key === 'logoContentType' || rawKey === 'logo_content_type') {
            updateData.logoContentType = rawVal ? String(rawVal).trim().substring(0, 100) : null;
          } else if (key === 'logoSize' || rawKey === 'logo_size') {
            if (rawVal === null || rawVal === undefined || rawVal === '') {
              updateData.logoSize = null;
            } else {
              const num = parseInt(String(rawVal), 10);
              updateData.logoSize = isNaN(num) ? null : num;
            }
          } else if (key === 'compactLogoFileId' || rawKey === 'compact_logo_file_id') {
            updateData.compactLogoFileId = rawVal ? String(rawVal).trim().substring(0, 255) : null;
          } else if (key === 'faviconFileId' || rawKey === 'favicon_file_id') {
            updateData.faviconFileId = rawVal ? String(rawVal).trim().substring(0, 255) : null;
          } else {
            throw new ValidationError(`Unsupported branding field: ${rawKey}`);
          }
        }
      }

      const updated = await prisma.brandingConfiguration.update({
        where: { id: branding.id },
        data: updateData,
      });

      const after = ConfigurationService.serializeBranding(updated);

      await writeAuditLog({
        tenantId: req.user!.tenantId,
        actorId: req.user!.id,
        action: 'BRANDING_UPDATED',
        entityType: 'BrandingConfiguration',
        entityId: branding.id,
        schoolId: school.id,
        beforeData: before,
        afterData: after,
      });

      res.json(after);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/branding/asset/:asset_type',
  requirePermissions(['settings.manage']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.query.school_id as string | undefined;
      const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);
      const branding = await ConfigurationService.getOrCreateBranding(req.user!.tenantId, school.id);
      const assetType = Array.isArray(req.params.asset_type) ? req.params.asset_type[0] : req.params.asset_type;

      const storage = getStorageProvider();
      await storage.delete(`schools/${school.id}/branding/${assetType}`);
      if (assetType === 'logo' && branding.logoStorageKey) {
        await storage.delete(branding.logoStorageKey);
      }

      const updateData: any = { version: branding.version + 1 };

      if (assetType === 'logo') {
        updateData.logoFileId = null;
        updateData.logoStorageKey = null;
        updateData.logoContentType = null;
        updateData.logoSize = null;
      } else if (assetType === 'compact_logo') {
        updateData.compactLogoFileId = null;
      } else if (assetType === 'favicon') {
        updateData.faviconFileId = null;
      } else {
        throw new ValidationError('Unsupported branding asset');
      }

      const updated = await prisma.brandingConfiguration.update({
        where: { id: branding.id },
        data: updateData,
      });

      await writeAuditLog({
        tenantId: req.user!.tenantId,
        actorId: req.user!.id,
        action: 'BRANDING_ASSET_DELETED',
        entityType: 'BrandingConfiguration',
        entityId: branding.id,
        schoolId: school.id,
        afterData: { asset_type: assetType },
      });

      res.json(ConfigurationService.serializeBranding(updated));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/branding/upload',
  requirePermissions(['settings.manage']),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    let uploadedStorageKey: string | null = null;
    try {
      const schoolId = req.query.school_id as string | undefined;
      const assetType = (req.query.asset_type as string) || 'logo';
      const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);

      if (!req.file || req.file.size === 0) {
        throw new ValidationError('Branding file must be between 1 byte and 5 MB');
      }

      const data = req.file.buffer;
      if (data.length > 5 * 1024 * 1024) {
        throw new ValidationError('Branding file must be between 1 byte and 5 MB');
      }

      // Check magic byte signatures
      const isPng = data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const isJpg = data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
      const isWebp = data.length >= 12 && data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
      const isIco = data.length >= 4 && data[0] === 0x00 && data[1] === 0x00 && data[2] === 0x01 && data[3] === 0x00;

      let contentType: string | null = null;
      const fileExt = path.extname(req.file.originalname).toLowerCase();

      if (isPng) {
        if (fileExt !== '.png') throw new ValidationError('Unsupported or unsafe branding file: signature mismatch');
        contentType = 'image/png';
      } else if (isJpg) {
        if (fileExt !== '.jpg' && fileExt !== '.jpeg') throw new ValidationError('Unsupported or unsafe branding file: signature mismatch');
        contentType = 'image/jpeg';
      } else if (isWebp) {
        if (fileExt !== '.webp') throw new ValidationError('Unsupported or unsafe branding file: signature mismatch');
        contentType = 'image/webp';
      } else if (isIco) {
        if (fileExt !== '.ico') throw new ValidationError('Unsupported or unsafe branding file: signature mismatch');
        contentType = 'image/x-icon';
      }

      if (!contentType) {
        throw new ValidationError('Unsupported or unsafe branding file: signature mismatch');
      }

      if (!['logo', 'compact_logo', 'favicon'].includes(assetType)) {
        throw new ValidationError('Unsupported branding asset');
      }

      const storageKey = `schools/${school.id}/branding/${assetType}`;
      const storage = getStorageProvider();
      await storage.upload(data, storageKey, contentType);
      uploadedStorageKey = storageKey;

      const branding = await ConfigurationService.getOrCreateBranding(req.user!.tenantId, school.id);
      const fileId = crypto.randomUUID();

      const updateData: any = { version: branding.version + 1 };
      if (assetType === 'logo') {
        updateData.logoFileId = fileId;
        updateData.logoStorageKey = storageKey;
        updateData.logoContentType = contentType;
        updateData.logoSize = data.length;
      } else if (assetType === 'compact_logo') {
        updateData.compactLogoFileId = fileId;
      } else {
        updateData.faviconFileId = fileId;
      }

      const updated = await prisma.brandingConfiguration.update({
        where: { id: branding.id },
        data: updateData,
      });

      await writeAuditLog({
        tenantId: req.user!.tenantId,
        actorId: req.user!.id,
        action: 'BRANDING_UPLOADED',
        entityType: 'BrandingConfiguration',
        entityId: branding.id,
        schoolId: school.id,
        afterData: {
          asset_type: assetType,
          file_id: fileId,
          content_type: contentType,
          size: data.length,
        },
      });

      res.json(ConfigurationService.serializeBranding(updated));
    } catch (err) {
      if (uploadedStorageKey) {
        try {
          const storage = getStorageProvider();
          await storage.delete(uploadedStorageKey);
        } catch {}
      }
      next(err);
    }
  }
);

router.post(
  '/branding/upload-metadata',
  requirePermissions(['settings.manage']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.query.school_id as string | undefined;
      const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);
      const branding = await ConfigurationService.getOrCreateBranding(req.user!.tenantId, school.id);

      const { file_id, storage_key, content_type, size } = req.body;

      const updated = await prisma.brandingConfiguration.update({
        where: { id: branding.id },
        data: {
          logoFileId: file_id,
          logoStorageKey: storage_key,
          logoContentType: content_type,
          logoSize: size,
          version: branding.version + 1,
        },
      });

      await writeAuditLog({
        tenantId: req.user!.tenantId,
        actorId: req.user!.id,
        action: 'BRANDING_UPDATED',
        entityType: 'BrandingConfiguration',
        entityId: branding.id,
        schoolId: school.id,
        afterData: { logo_file_id: file_id, logo_content_type: content_type, logo_size: size },
      });

      res.json(ConfigurationService.serializeBranding(updated));
    } catch (err) {
      next(err);
    }
  }
);

// 4. Number Series in Configuration
router.get('/number-series', requirePermissions(['settings.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.school_id as string | undefined;
    const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);

    const seriesList = await prisma.numberSeries.findMany({
      where: {
        tenantId: req.user!.tenantId,
        OR: [{ schoolId: school.id }, { schoolId: null }],
      },
      orderBy: { code: 'asc' },
    });

    res.json(
      seriesList.map((s) => ({
        id: s.id,
        code: s.code,
        prefix: s.prefix,
        suffix: s.suffix,
        padding: s.padding,
        current_value: s.currentValue,
        reset_strategy: s.resetStrategy,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/number-series/:series_id',
  requirePermissions(['settings.manage']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.query.school_id as string | undefined;
      const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);

      const seriesId = Array.isArray(req.params.series_id) ? req.params.series_id[0] : req.params.series_id;
      const series = await prisma.numberSeries.findFirst({
        where: {
          id: seriesId,
          tenantId: req.user!.tenantId,
          OR: [{ schoolId: school.id }, { schoolId: null }],
        },
      });

      if (!series) {
        throw new NotFoundError('Number series not found');
      }

      const updates: any = {};
      if (req.body.prefix !== undefined) updates.prefix = req.body.prefix;
      if (req.body.suffix !== undefined) updates.suffix = req.body.suffix;
      if (req.body.padding !== undefined) updates.padding = parseInt(String(req.body.padding), 10);
      if (req.body.reset_strategy !== undefined) updates.resetStrategy = req.body.reset_strategy;

      // Ensure current sequence cannot be arbitrarily rolled back or modified
      delete updates.currentValue;
      delete updates.current_value;

      const padding = updates.padding !== undefined ? updates.padding : series.padding;
      const resetStrategy = updates.resetStrategy !== undefined ? updates.resetStrategy : series.resetStrategy;

      if (isNaN(padding) || padding < 1 || padding > 12) {
        throw new ValidationError('Invalid number series configuration: padding must be between 1 and 12');
      }

      if (resetStrategy && !['NEVER', 'ACADEMIC_YEAR', 'CALENDAR_YEAR', 'MONTHLY'].includes(resetStrategy)) {
        throw new ValidationError('Invalid number series configuration: unsupported reset strategy');
      }

      const updated = await prisma.numberSeries.update({
        where: { id: series.id },
        data: updates,
      });

      await writeAuditLog({
        tenantId: req.user!.tenantId,
        actorId: req.user!.id,
        action: 'NUMBER_SERIES_UPDATED',
        entityType: 'NumberSeries',
        entityId: series.id,
        schoolId: school.id,
        afterData: {
          code: updated.code,
          prefix: updated.prefix,
          suffix: updated.suffix,
          padding: updated.padding,
          reset_strategy: updated.resetStrategy,
        },
      });

      res.json({
        id: updated.id,
        code: updated.code,
        prefix: updated.prefix,
        suffix: updated.suffix,
        padding: updated.padding,
        current_value: updated.currentValue,
        reset_strategy: updated.resetStrategy,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/number-series/:series_id/preview', requirePermissions(['settings.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.school_id as string | undefined;
    const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);

    const seriesId = Array.isArray(req.params.series_id) ? req.params.series_id[0] : req.params.series_id;
    const series = await prisma.numberSeries.findFirst({
      where: {
        id: seriesId,
        tenantId: req.user!.tenantId,
        OR: [{ schoolId: school.id }, { schoolId: null }],
      },
    });

    if (!series) {
      throw new NotFoundError('Number series not found');
    }

    const padding = req.query.padding ? parseInt(req.query.padding as string, 10) : series.padding;
    if (isNaN(padding) || padding < 1 || padding > 12) {
      throw new ValidationError('Invalid number series padding');
    }

    const now = new Date();
    let expandedPrefix = (req.query.prefix as string) ?? series.prefix ?? '';
    let expandedSuffix = (req.query.suffix as string) ?? series.suffix ?? '';

    const year = String(now.getUTCFullYear());
    const yy = year.slice(-2);
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');

    for (const [token, rep] of [
      ['{YYYY}', year],
      ['{YY}', yy],
      ['{MM}', mm],
      ['{DD}', dd],
    ]) {
      expandedPrefix = expandedPrefix.replaceAll(token, rep);
      expandedSuffix = expandedSuffix.replaceAll(token, rep);
    }

    const seqRegex = /\{SEQ(?::(\d+))?\}/i;
    if (seqRegex.test(expandedPrefix) || seqRegex.test(expandedSuffix)) {
      expandedPrefix = expandedPrefix.replace(/\{SEQ(?::(\d+))?\}/gi, (_, widthStr) => {
        const w = widthStr ? parseInt(widthStr, 10) : padding;
        return String(series.currentValue + 1).padStart(w, '0');
      });
      expandedSuffix = expandedSuffix.replace(/\{SEQ(?::(\d+))?\}/gi, (_, widthStr) => {
        const w = widthStr ? parseInt(widthStr, 10) : padding;
        return String(series.currentValue + 1).padStart(w, '0');
      });
      res.json({ preview: `${expandedPrefix}${expandedSuffix}` });
    } else {
      const seqStr = String(series.currentValue + 1).padStart(padding, '0');
      res.json({ preview: `${expandedPrefix}${seqStr}${expandedSuffix}` });
    }
  } catch (err) {
    next(err);
  }
});

// 5. History
router.get('/history', requirePermissions(['settings.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.school_id as string | undefined;
    if (schoolId) {
      await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);
    }

    const action = req.query.action as string | undefined;
    const userId = req.query.user_id as string | undefined;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;

    const where: any = {
      tenantId: req.user!.tenantId,
      OR: [
        { action: { contains: 'CONFIGURATION' } },
        { action: { startsWith: 'BRANDING_' } },
        { action: 'NUMBER_SERIES_UPDATED' },
      ],
    };

    if (schoolId) where.schoolId = schoolId;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const history = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(
      history.map((item) => ({
        id: item.id,
        created_at: item.createdAt.toISOString(),
        user_id: item.userId,
        school_id: item.schoolId,
        action: item.action,
        entity_type: item.entityType,
        entity_id: item.entityId,
        before_data: item.beforeData,
        after_data: item.afterData,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// 6. Section routes for school, academic, student-identity, attendance, fees, finance, exams, promotion, localization, printing
for (const section of Object.keys(SECTION_FIELDS)) {
  const allowedFields = SECTION_FIELDS[section];

  router.get(`/${section}`, requirePermissions(['settings.manage']), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.query.school_id as string | undefined;
      const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);
      const config = await ConfigurationService.getOrCreateConfig(req.user!.tenantId, school.id);
      const serialized = ConfigurationService.serializeConfig(config);

      // Filter values to only this section
      const sectionValues: Record<string, any> = {};
      for (const field of allowedFields) {
        const snakeKey = CAMEL_TO_SNAKE[field] || field;
        if (serialized.values[snakeKey] !== undefined) {
          sectionValues[snakeKey] = serialized.values[snakeKey];
        } else if (serialized.values[field] !== undefined) {
          sectionValues[field] = serialized.values[field];
        }
      }

      res.json({
        id: serialized.id,
        school_id: serialized.school_id,
        version: serialized.version,
        values: sectionValues,
      });
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    `/${section}`,
    requirePermissions(['settings.manage']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const schoolId = req.query.school_id as string | undefined;
        const school = await ConfigurationService.resolveSchool(schoolId, req.user!.tenantId, req.user!);
        const config = await ConfigurationService.getOrCreateConfig(req.user!.tenantId, school.id);

        const { version, values } = req.body;
        if (version !== undefined && version !== config.version) {
          throw new ConflictError('CONFIGURATION_VERSION_CONFLICT');
        }

        if (!values || typeof values !== 'object') {
          throw new ValidationError('values payload must be an object');
        }

        const intFields = new Set([
          'weekStart',
          'attendanceLockHours',
          'teacherGeofenceRadiusMeters',
          'feePrecision',
          'lateFeeGraceDays',
          'fiscalYearStartMonth',
          'fiscalYearStartDay',
          'maximumMarks',
          'maximumGraceMarks',
          'marksDecimalPrecision',
          'failedSubjectTolerance',
        ]);
        const decimalFields = new Set([
          'passingPercentage',
          'minimumAttendancePercentage',
          'minimumPassingPercentage',
        ]);
        const booleanFields = new Set([
          'academicLockingEnabled',
          'attendanceLockEnabled',
          'attendanceCorrectionAllowed',
          'attendanceCorrectionReasonRequired',
          'attendancePrincipalOverride',
          'teacherGeofenceEnabled',
          'allowPartialPayment',
          'allowAdvancePayment',
          'lateFeeEnabled',
          'autoGenerateReceipt',
          'receiptCancellationReasonRequired',
          'refundApprovalRequired',
          'concessionApprovalRequired',
          'scholarshipApprovalRequired',
          'voucherApprovalRequired',
          'backdatedTransactionsAllowed',
          'futureDatedTransactionsAllowed',
          'reversalReasonRequired',
          'gstEnabled',
          'tdsEnabled',
          'internalMarksEnabled',
          'practicalMarksEnabled',
          'graceMarksEnabled',
          'revaluationEnabled',
          'rankCalculationEnabled',
          'gpaEnabled',
          'cgpaEnabled',
          'resultPublicationApprovalRequired',
          'automaticPromotionEnabled',
          'graceMarksConsidered',
          'manualPromotionOverride',
          'principalPromotionApprovalRequired',
          'promotionLockingEnabled',
          'printShowLogo',
          'printShowAddress',
          'printShowContact',
          'printShowTimestamp',
          'printShowDocumentNumber',
          'signaturePlaceholders',
        ]);

        const updateData: any = {};
        for (const [key, rawVal] of Object.entries(values)) {
          const camelKey = SNAKE_TO_CAMEL[key] || key;
          if (!allowedFields.includes(camelKey)) {
            throw new ValidationError(`Unsupported field: ${key}`);
          }

          let coercedVal: any = rawVal;
          if (intFields.has(camelKey)) {
            if (coercedVal === '' || coercedVal === null || coercedVal === undefined) {
              coercedVal = null;
            } else {
              const num = parseInt(String(coercedVal), 10);
              if (isNaN(num)) throw new ValidationError(`Invalid integer value for ${key}`);
              coercedVal = num;
            }
          } else if (decimalFields.has(camelKey)) {
            if (coercedVal === '' || coercedVal === null || coercedVal === undefined) {
              coercedVal = null;
            } else {
              try {
                coercedVal = new Prisma.Decimal(String(coercedVal));
              } catch {
                throw new ValidationError(`Invalid decimal percentage for ${key}`);
              }
            }
          } else if (booleanFields.has(camelKey)) {
            coercedVal = coercedVal === true || coercedVal === 'true';
          } else if (typeof coercedVal === 'string') {
            coercedVal = coercedVal.trim();
          }

          if (['studentIdFormat', 'admissionNumberFormat', 'rollNumberFormat'].includes(camelKey)) {
            try {
              validateIdentifierFormat(String(coercedVal));
            } catch (err: any) {
              throw new ValidationError(err.message);
            }
          }

          updateData[camelKey] = coercedVal;
        }

        updateData.version = config.version + 1;

        const before = ConfigurationService.serializeConfig(config);
        const updated = await prisma.schoolConfiguration.update({
          where: { id: config.id },
          data: updateData,
        });
        const after = ConfigurationService.serializeConfig(updated);

        await writeAuditLog({
          tenantId: req.user!.tenantId,
          actorId: req.user!.id,
          action: `${section.toUpperCase().replaceAll('-', '_')}_CONFIGURATION_UPDATED`,
          entityType: 'SchoolConfiguration',
          entityId: config.id,
          schoolId: school.id,
          beforeData: before.values,
          afterData: after.values,
        });

        // Filter returned values to only this section
        const sectionValues: Record<string, any> = {};
        for (const field of allowedFields) {
          const snakeKey = CAMEL_TO_SNAKE[field] || field;
          if (after.values[snakeKey] !== undefined) {
            sectionValues[snakeKey] = after.values[snakeKey];
          } else if (after.values[field] !== undefined) {
            sectionValues[field] = after.values[field];
          }
        }

        res.json({
          id: updated.id,
          school_id: school.id,
          version: updated.version,
          values: sectionValues,
        });
      } catch (err) {
        next(err);
      }
    }
  );
}

export default router;
