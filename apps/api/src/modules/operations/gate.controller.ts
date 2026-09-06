import { Request, Response, NextFunction } from 'express';
import { GateService } from './gate.service.js';
import { ScopeContext } from './operations.types.js';

function getContext(req: Request): ScopeContext {
  const perms = req.user?.permissions;
  const permissions = perms instanceof Set ? Array.from(perms) : (Array.isArray(perms) ? perms : []);
  return {
    tenantId: req.user!.tenantId,
    schoolId: req.schoolId!,
    userId: req.user!.id,
    ipAddress: req.ip,
    permissions,
    isSuperAdmin: (req.user as any)?.isSuperadmin ?? false,
  };
}

export class GateController {
  // Visitors
  public static async listVisitors(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const query = {
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await GateService.listVisitors(ctx, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getVisitorById(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const visitor = await GateService.getVisitorById(ctx, req.params.id as string);
      res.json(visitor);
    } catch (err) {
      next(err);
    }
  }

  public static async createVisitor(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const visitor = await GateService.createVisitor(ctx, req.body);
      res.status(201).json(visitor);
    } catch (err) {
      next(err);
    }
  }

  public static async updateVisitor(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const visitor = await GateService.updateVisitor(ctx, req.params.id as string, req.body);
      res.json(visitor);
    } catch (err) {
      next(err);
    }
  }

  // Visits
  public static async listVisits(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const query = {
        status: req.query.status as string,
        visitorId: req.query.visitorId as string,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await GateService.listVisits(ctx, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getVisitById(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const visit = await GateService.getVisitById(ctx, req.params.id as string);
      res.json(visit);
    } catch (err) {
      next(err);
    }
  }

  public static async checkInVisitor(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const visit = await GateService.checkInVisitor(ctx, req.body);
      res.status(201).json(visit);
    } catch (err) {
      next(err);
    }
  }

  public static async checkOutVisitor(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const visit = await GateService.checkOutVisitor(ctx, req.params.id as string, req.body);
      res.json(visit);
    } catch (err) {
      next(err);
    }
  }

  public static async cancelOrDenyVisit(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const visit = await GateService.cancelOrDenyVisit(ctx, req.params.id as string, req.body);
      res.json(visit);
    } catch (err) {
      next(err);
    }
  }

  // Student Pickup
  public static async releaseStudentPickup(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const release = await GateService.releaseStudentPickup(ctx, req.body);
      res.status(201).json(release);
    } catch (err) {
      next(err);
    }
  }

  public static async listStudentPickupReleases(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const query = {
        studentId: req.query.studentId as string,
        pickupSessionDate: req.query.pickupSessionDate as string,
        pickupSession: req.query.pickupSession as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await GateService.listStudentPickupReleases(ctx, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
