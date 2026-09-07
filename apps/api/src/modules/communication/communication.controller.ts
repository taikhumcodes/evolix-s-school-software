import { Request, Response, NextFunction } from 'express';
import { CommunicationService } from './communication.service.js';
import { NotificationsService } from './notifications.service.js';
import { ProviderRegistry } from './providers/provider.registry.js';
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

export class CommunicationController {
  // Templates
  public static async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { category, channel } = req.query as any;
      const templates = await CommunicationService.getTemplates(ctx, category, channel);
      res.json(templates);
    } catch (err) {
      next(err);
    }
  }

  public static async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const template = await CommunicationService.createTemplate(ctx, req.body);
      res.status(201).json(template);
    } catch (err) {
      next(err);
    }
  }

  public static async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const template = await CommunicationService.updateTemplate(ctx, String(req.params.id), req.body);
      res.json(template);
    } catch (err) {
      next(err);
    }
  }

  // Batches
  public static async createBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const batch = await CommunicationService.createBatch(ctx, req.body);
      res.status(201).json(batch);
    } catch (err) {
      next(err);
    }
  }

  public static async previewBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const batch = await (await import('../../lib/prisma.js')).prisma.communicationBatch.findFirst({
        where: { id: String(req.params.id), schoolId: ctx.schoolId },
      });
      if (!batch) return res.status(404).json({ message: 'Batch not found' });

      const recipients = await CommunicationService.resolveBatchRecipients(ctx, batch);
      res.json({ count: recipients.length, sample: recipients.slice(0, 10) });
    } catch (err) {
      next(err);
    }
  }

  public static async approveBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { expectedVersion } = req.body;
      const batch = await CommunicationService.approveBatch(ctx, String(req.params.id), Number(expectedVersion));
      res.json(batch);
    } catch (err) {
      next(err);
    }
  }

  public static async queueBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const batch = await CommunicationService.queueBatch(ctx, String(req.params.id));
      res.json(batch);
    } catch (err) {
      next(err);
    }
  }

  // Messages
  public static async listMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const { category, channel, status, limit, offset } = req.query as any;
      const result = await CommunicationService.listMessages(ctx, {
        category,
        channel,
        status,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getMessageDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const msg = await CommunicationService.getMessageDetail(ctx, String(req.params.id));
      res.json(msg);
    } catch (err) {
      next(err);
    }
  }

  public static async retryMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const msg = await CommunicationService.retryMessage(ctx, String(req.params.id));
      res.json(msg);
    } catch (err) {
      next(err);
    }
  }

  public static async cancelMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const msg = await CommunicationService.cancelMessage(ctx, String(req.params.id));
      res.json(msg);
    } catch (err) {
      next(err);
    }
  }

  public static async recordManualSend(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const msg = await CommunicationService.recordManualSend(ctx, String(req.params.id));
      res.json(msg);
    } catch (err) {
      next(err);
    }
  }

  // In-App Notifications
  public static async listMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const unreadOnly = req.query.unreadOnly === 'true';
      const result = await NotificationsService.getUserNotifications(ctx, { unreadOnly });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async markNotificationAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const updated = await NotificationsService.markAsRead(ctx, String(req.params.id));
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async markAllNotificationsAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const result = await NotificationsService.markAllAsRead(ctx);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // Settings & Providers
  public static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const settings = await CommunicationService.getSettings(ctx);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }

  public static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const settings = await CommunicationService.updateSettings(ctx, req.body);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }

  public static async getProvidersStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const statuses = await ProviderRegistry.getProvidersStatus();
      res.json(statuses);
    } catch (err) {
      next(err);
    }
  }

  // CSV Export with Masked PII (Rule 56)
  public static async exportMessagesCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const result = await CommunicationService.listMessages(ctx, { limit: 1000 });

      const headers = ['ID', 'Category', 'Channel', 'Recipient Type', 'Destination', 'Status', 'Sent At', 'Provider'];
      const rows = result.items.map((m) => [
        m.id,
        m.category,
        m.channel,
        m.recipientType,
        m.destinationMasked, // Rule 56: Masked destination
        m.status,
        m.sentAt ? m.sentAt.toISOString() : '',
        m.provider || '',
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell || ''}"`).join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="communication_messages.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}
