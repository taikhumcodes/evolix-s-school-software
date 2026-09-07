import { Request, Response, NextFunction } from 'express';
import { AutomationService } from './automation/automation.service.js';
import { ScopeContext } from './communication.types.js';

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

export class AutomationController {
  // Rules
  public static async listRules(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const rules = await AutomationService.listRules(ctx, req.query.eventType as any);
      res.json(rules);
    } catch (err) {
      next(err);
    }
  }

  public static async getRule(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const rule = await AutomationService.getRule(ctx, String(req.params.id));
      res.json(rule);
    } catch (err) {
      next(err);
    }
  }

  public static async createRule(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const rule = await AutomationService.createRule(ctx, req.body);
      res.status(201).json(rule);
    } catch (err) {
      next(err);
    }
  }

  public static async updateRule(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const rule = await AutomationService.updateRule(ctx, String(req.params.id), req.body);
      res.json(rule);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteRule(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      await AutomationService.deleteRule(ctx, String(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  // Executions
  public static async listExecutions(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { limit, offset } = req.query as any;
      const result = await AutomationService.listExecutions(ctx, limit ? Number(limit) : 50, offset ? Number(offset) : 0);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // Scheduled Jobs
  public static async listJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { status, limit, offset } = req.query as any;
      const result = await AutomationService.listJobs(ctx, status, limit ? Number(limit) : 50, offset ? Number(offset) : 0);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async cancelJob(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const job = await AutomationService.cancelJob(ctx, String(req.params.id));
      res.json(job);
    } catch (err) {
      next(err);
    }
  }

  // Tasks
  public static async listTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { status, limit, offset } = req.query as any;
      const result = await AutomationService.listTasks(ctx, status, limit ? Number(limit) : 50, offset ? Number(offset) : 0);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async updateTaskStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { status } = req.body;
      const task = await AutomationService.updateTaskStatus(ctx, String(req.params.id), status);
      res.json(task);
    } catch (err) {
      next(err);
    }
  }

  // Test Event API (Rule 78)
  public static async triggerTestEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const event = await AutomationService.triggerTestEvent(ctx, req.body);
      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  }

  // Manual Process Pending Worker (Rule 8)
  public static async processPending(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const summary = await AutomationService.processPending(ctx);
      res.json({ message: 'Pending automation and outbox processing completed', summary });
    } catch (err) {
      next(err);
    }
  }
}
