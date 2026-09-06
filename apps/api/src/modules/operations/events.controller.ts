import { Request, Response, NextFunction } from 'express';
import { EventsService } from './events.service.js';
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

export class EventsController {
  // 1. Categories
  public static async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const categories = await EventsService.listCategories(ctx);
      res.json(categories);
    } catch (err) {
      next(err);
    }
  }

  public static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const category = await EventsService.createCategory(ctx, req.body);
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  }

  // 2. Events CRUD
  public static async listEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const query = {
        categoryId: req.query.categoryId as string,
        status: req.query.status as string,
        search: req.query.search as string,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await EventsService.listEvents(ctx, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getEventById(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const event = await EventsService.getEventById(ctx, req.params.id as string);
      res.json(event);
    } catch (err) {
      next(err);
    }
  }

  public static async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const event = await EventsService.createEvent(ctx, req.body);
      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  }

  public static async updateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const event = await EventsService.updateEvent(ctx, req.params.id as string, req.body);
      res.json(event);
    } catch (err) {
      next(err);
    }
  }

  // 3. Coordinators
  public static async assignCoordinator(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const coordinator = await EventsService.assignCoordinator(ctx, req.params.id as string, req.body);
      res.status(201).json(coordinator);
    } catch (err) {
      next(err);
    }
  }

  public static async removeCoordinator(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const result = await EventsService.removeCoordinator(ctx, req.params.id as string, req.params.employeeId as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 4. Participants
  public static async registerParticipant(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const participant = await EventsService.registerParticipant(ctx, req.params.id as string, req.body);
      res.status(201).json(participant);
    } catch (err) {
      next(err);
    }
  }

  public static async bulkRegisterSection(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const result = await EventsService.bulkRegisterSection(ctx, req.params.id as string, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async updateParticipantStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const participant = await EventsService.updateParticipantStatus(
        ctx,
        req.params.id as string,
        req.params.participantId as string,
        req.body
      );
      res.json(participant);
    } catch (err) {
      next(err);
    }
  }

  // 5. Achievements
  public static async recordAchievement(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const achievement = await EventsService.recordAchievement(ctx, req.params.id as string, req.body);
      res.status(201).json(achievement);
    } catch (err) {
      next(err);
    }
  }

  // 6. Expense Links
  public static async linkExpenseBill(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const link = await EventsService.linkExpenseBill(ctx, req.params.id as string, req.body);
      res.status(201).json(link);
    } catch (err) {
      next(err);
    }
  }

  public static async unlinkExpenseBill(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const result = await EventsService.unlinkExpenseBill(ctx, req.params.id as string, req.params.expenseBillId as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
