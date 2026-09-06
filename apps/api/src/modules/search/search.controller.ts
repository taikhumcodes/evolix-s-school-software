import { Request, Response, NextFunction } from 'express';
import { SearchService } from './search.service.js';
import { ConfigurationService } from '../configuration/configuration.service.js';

export class SearchController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req.query.q as string) || (req.query.query as string) || '';
      const schoolParam = (req.query.school_id as string) || (req.headers['x-school-id'] as string);

      const school = await ConfigurationService.resolveSchool(
        schoolParam,
        req.user!.tenantId,
        req.user!
      );

      const results = await SearchService.search(
        query,
        req.user!.tenantId,
        school.id,
        req.user!
      );

      res.json({
        query,
        count: results.length,
        results,
      });
    } catch (err) {
      next(err);
    }
  }
}
