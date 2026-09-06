import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

export function requirePermissions(permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (req.user.isSuperadmin) {
      return next();
    }

    const missing = permissions.filter(
      (perm) => !req.user!.permissions.has(perm.toLowerCase())
    );

    if (missing.length > 0) {
      return next(new ForbiddenError('Not enough permissions', { missing }));
    }

    next();
  };
}

export function requireAnyPermission(permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (req.user.isSuperadmin) {
      return next();
    }

    const hasAny = permissions.some((perm) =>
      req.user!.permissions.has(perm.toLowerCase())
    );

    if (!hasAny) {
      return next(new ForbiddenError('Not enough permissions', { requiredAny: permissions }));
    }

    next();
  };
}
