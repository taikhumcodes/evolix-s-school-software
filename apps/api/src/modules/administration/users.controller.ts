import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service.js';

export class UsersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UsersService.listUsers(req.user!.tenantId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await UsersService.getUser(id, req.user!.tenantId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UsersService.createUser(req.body, req.user!);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await UsersService.updateUser(id, req.body, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await UsersService.deleteUser(id, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
