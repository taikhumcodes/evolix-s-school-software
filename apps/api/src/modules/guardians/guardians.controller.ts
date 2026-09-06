import { Request, Response, NextFunction } from 'express';
import { GuardiansService } from './guardians.service.js';
import { ValidationError } from '../../lib/errors.js';
import { getClientIp } from '../../lib/ip.js';

const getIp = (req: Request): string | undefined => {
  const ip = getClientIp(req);
  return Array.isArray(ip) ? ip[0] : ip;
};

const getParam = (param: string | string[] | undefined): string => {
  return Array.isArray(param) ? param[0] : param || '';
};

export class GuardiansController {
  public static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const overview = await GuardiansService.getOverview(tenantId, schoolId);
      res.json(overview);
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.listGuardians(tenantId, schoolId, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const canManage = Boolean(req.user?.permissions?.has('guardians.manage') || req.user?.isSuperadmin);
      const result = await GuardiansService.getGuardianById(tenantId, schoolId, getParam(req.params.id), canManage);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async checkDuplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.checkDuplicate(tenantId, schoolId, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.createGuardian(
        tenantId,
        schoolId,
        req.body,
        req.user?.id,
        getIp(req)
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.updateGuardian(
        tenantId,
        schoolId,
        getParam(req.params.id),
        req.body,
        req.user?.id,
        getIp(req)
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.archiveGuardian(
        tenantId,
        schoolId,
        getParam(req.params.id),
        req.user?.id,
        getIp(req)
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.restoreGuardian(
        tenantId,
        schoolId,
        getParam(req.params.id),
        req.user?.id,
        getIp(req)
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async merge(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.mergeGuardians(
        tenantId,
        schoolId,
        req.body,
        req.user?.id,
        getIp(req)
      );
      res.json({ message: 'Guardians merged successfully', guardian: result });
    } catch (err) {
      next(err);
    }
  }

  public static async linkStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.linkStudent(
        tenantId,
        schoolId,
        getParam(req.params.id),
        req.body,
        req.user?.id,
        getIp(req)
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async updateStudentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.updateStudentLink(
        tenantId,
        schoolId,
        getParam(req.params.id),
        getParam(req.params.studentId),
        req.body,
        req.user?.id,
        getIp(req)
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async unlinkStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.unlinkStudent(
        tenantId,
        schoolId,
        getParam(req.params.id),
        getParam(req.params.studentId),
        req.user?.id,
        getIp(req)
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async createPortalAccess(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.createPortalAccess(
        tenantId,
        schoolId,
        getParam(req.params.id),
        req.user?.id,
        getIp(req)
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async disablePortalAccess(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.disablePortalAccess(
        tenantId,
        schoolId,
        getParam(req.params.id),
        req.user?.id,
        getIp(req)
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.updatePreferences(
        tenantId,
        schoolId,
        getParam(req.params.id),
        req.body
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');
      if (!req.file) throw new ValidationError('No document file was uploaded');

      const result = await GuardiansService.uploadDocument(
        tenantId,
        schoolId,
        getParam(req.params.id),
        req.file,
        req.body.documentType || 'OTHER',
        req.user?.id
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async verifyDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.verifyDocument(
        tenantId,
        schoolId,
        getParam(req.params.id),
        getParam(req.params.docId),
        req.body.status,
        req.body.verificationNotes,
        req.user?.id
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async addNote(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.addNote(
        tenantId,
        schoolId,
        getParam(req.params.id),
        req.body,
        req.user?.id
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async exportGuardians(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const csv = await GuardiansService.exportGuardians(tenantId, schoolId, req.query);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="guardians_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  public static async previewImport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');
      if (!req.file) throw new ValidationError('CSV file is required');

      const result = await GuardiansService.previewImport(tenantId, schoolId, req.file.buffer);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async commitImport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await GuardiansService.commitImport(
        tenantId,
        schoolId,
        req.body.records || [],
        req.user?.id
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
