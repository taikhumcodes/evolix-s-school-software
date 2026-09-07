import { Request, Response, NextFunction } from 'express';
import { PlatformService } from './platform.service.js';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

export class PlatformController {
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const overview = await PlatformService.getOverview(tenantId);
      res.json(overview);
    } catch (error) {
      next(error);
    }
  }

  static async getHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.query.type as string;
      const tenantId = req.user!.tenantId;

      if (type === 'detailed') {
        const health = await PlatformService.getDetailedHealth(tenantId);
        res.json(health);
      } else {
        const health = await PlatformService.getBasicHealth();
        res.json(health);
      }
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const logs = await PlatformService.getAuditLogs(tenantId, schoolId, limit, offset);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  }

  static async exportData(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({ datasets: z.array(z.string()).min(1) });
      const { datasets } = schema.parse(req.body);

      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      const userId = req.user!.id;

      const exportJob = await PlatformService.initiateExport(tenantId, schoolId, userId, datasets as unknown as string[]);
      res.status(202).json(exportJob);
    } catch (error) {
      next(error);
    }
  }

  static async listExports(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;

      const exports = await prisma.dataExport.findMany({
        where: { tenantId, schoolId: schoolId || undefined },
        orderBy: { createdAt: 'desc' }
      });
      res.json(exports);
    } catch (error) {
      next(error);
    }
  }

  static async backupSystem(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({ type: z.enum(['FULL', 'SCHEMA_ONLY', 'DATA_ONLY']) });
      const { type } = schema.parse(req.body);

      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const backup = await PlatformService.initiateBackup(tenantId, userId, type);
      res.status(202).json(backup);
    } catch (error) {
      next(error);
    }
  }

  static async listBackups(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;

      const backups = await prisma.backupRecord.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(backups);
    } catch (error) {
      next(error);
    }
  }

  static async restorePreflight(req: Request, res: Response, next: NextFunction) {
    try {
      const preflight = await PlatformService.restorePreflight(req.params.id as string);
      res.json(preflight);
    } catch (error) {
      next(error);
    }
  }
}
