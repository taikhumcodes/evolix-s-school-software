import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export function validateRequest(schemas: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.params) {
        const parsedParams = await schemas.params.parseAsync(req.params);
        try {
          req.params = parsedParams;
        } catch {
          Object.assign(req.params, parsedParams);
        }
      }
      if (schemas.query) {
        const parsedQuery = await schemas.query.parseAsync(req.query);
        try {
          req.query = parsedQuery;
        } catch {
          for (const key of Object.keys(req.query)) {
            delete (req.query as any)[key];
          }
          Object.assign(req.query, parsedQuery);
        }
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
