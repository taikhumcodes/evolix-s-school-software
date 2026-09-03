import { Request, Response, NextFunction } from 'express';
import { RolesService } from './roles.service.js';

export class RolesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RolesService.listRoles(req.user!.tenantId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RolesService.createRole(req.body, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await RolesService.updateRole(id, req.body, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await RolesService.deleteRole(id, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
