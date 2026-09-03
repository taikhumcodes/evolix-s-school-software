import { Request, Response, NextFunction } from 'express';
import { AcademicYearsService } from './academic-years.service.js';
import { ValidationError } from '../../lib/errors.js';

export class AcademicYearsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = (req.query.school_id as string) || req.schoolId || req.user!.schools[0]?.id;
      if (!schoolId) {
        throw new ValidationError('school_id query parameter is required');
      }
      const result = await AcademicYearsService.list(schoolId, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.body.school_id || req.schoolId || req.user!.schools[0]?.id;
      const result = await AcademicYearsService.create({ ...req.body, school_id: schoolId }, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await AcademicYearsService.update(id, req.body, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
