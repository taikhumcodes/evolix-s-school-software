import { Request, Response, NextFunction } from 'express';
import { AdmissionsService } from './admissions.service.js';
import { ValidationError } from '../../lib/errors.js';
import { getClientIp } from '../../lib/ip.js';

const getIp = (req: Request): string | undefined => {
  const ip = getClientIp(req);
  return Array.isArray(ip) ? ip[0] : ip;
};

export class AdmissionsController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;

      if (!schoolId) {
        throw new ValidationError('School context is required');
      }

      const result = await AdmissionsService.listAdmissions(tenantId, schoolId, {
        status: req.query.status as string,
        academicYearId: req.query.academic_year_id as string,
        appliedClassId: req.query.applied_class_id as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;

      if (!schoolId) {
        throw new ValidationError('School context is required');
      }

      const application = await AdmissionsService.getAdmissionById(tenantId, schoolId, req.params.id as string);
      res.json(application);
    } catch (err) {
      next(err);
    }
  }

  public static async checkDuplicates(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;

      if (!schoolId) {
        throw new ValidationError('School context is required');
      }

      const result = await AdmissionsService.checkDuplicates(tenantId, schoolId, {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        dateOfBirth: req.body.dateOfBirth,
        guardianPhone: req.body.guardianPhone,
        guardianEmail: req.body.guardianEmail,
        excludeApplicationId: req.body.excludeApplicationId,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;

      if (!schoolId) {
        throw new ValidationError('School context is required');
      }

      const application = await AdmissionsService.createAdmission(
        tenantId,
        schoolId,
        req.user?.id,
        req.body,
        getIp(req)
      );

      res.status(201).json(application);
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;

      if (!schoolId) {
        throw new ValidationError('School context is required');
      }

      const updated = await AdmissionsService.updateAdmission(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        req.body,
        getIp(req)
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;

      if (!schoolId) {
        throw new ValidationError('School context is required');
      }

      const updated = await AdmissionsService.updateStatus(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        req.body.status,
        req.body.rejectionReason,
        req.body.reviewNotes,
        getIp(req)
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async convert(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;

      if (!schoolId) {
        throw new ValidationError('School context is required');
      }

      const result = await AdmissionsService.convertToStudent(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        req.body || {},
        getIp(req)
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}
