import { Request, Response, NextFunction } from 'express';
import { FamiliesService } from './families.service.js';
import { ValidationError } from '../../lib/errors.js';
import { getClientIp } from '../../lib/ip.js';

const getIp = (req: Request): string | undefined => {
  const ip = getClientIp(req);
  return Array.isArray(ip) ? ip[0] : ip;
};

const getParam = (param: string | string[] | undefined): string => {
  return Array.isArray(param) ? param[0] : param || '';
};

export class FamiliesController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await FamiliesService.listFamilies(tenantId, schoolId, req.query);
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

      const result = await FamiliesService.getFamilyById(tenantId, schoolId, getParam(req.params.id));
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

      const result = await FamiliesService.createFamily(
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

      const result = await FamiliesService.updateFamily(
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

  public static async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await FamiliesService.addMember(
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

  public static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await FamiliesService.removeMember(
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
}
