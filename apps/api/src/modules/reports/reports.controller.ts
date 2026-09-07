import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service.js';
import { CreateReportSchema, ExecuteReportSchema } from './reports.schema.js';
import { DatasetRegistry } from './dataset.registry.js';
import { z } from 'zod';

export class ReportsController {
  static async getDatasets(req: Request, res: Response, next: NextFunction) {
    try {
      const userPermissions = Array.isArray((req as any).user?.permissions) ? (req as any).user.permissions : [];
      const datasets = Object.values(DatasetRegistry)
        .filter(ds => ds.requiredPermissions.every(p => userPermissions.includes(p)))
        .map(ds => ({
          id: ds.id,
          name: ds.name,
          description: ds.description,
          dimensions: ds.dimensions.map(d => ({ id: d.id, name: d.name, type: d.type })),
          metrics: ds.metrics.map(m => ({ id: m.id, name: m.name, type: m.type, isNumeric: m.isNumeric })),
        }));

      res.json(datasets);
    } catch (error) {
      next(error);
    }
  }

  static async execute(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = (req as any).schoolId;
      const userPermissions: string[] = Array.isArray((req as any).user?.permissions) ? (req as any).user.permissions : [];

      const payload = ExecuteReportSchema.parse(req.body);

      const results = await ReportsService.executeReport(
        tenantId,
        schoolId,
        userPermissions,
        payload
      );

      res.json({ results });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation Error', details: error.errors });
        return;
      }
      next(error);
    }
  }

  static async saveReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = (req as any).schoolId;
      const userId = req.user!.id;

      const payload = CreateReportSchema.parse(req.body);

      const report = await ReportsService.saveReport(tenantId, schoolId, userId, payload);
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation Error', details: error.errors });
        return;
      }
      next(error);
    }
  }

  static async listReports(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = (req as any).schoolId;
      const userId = req.user!.id;

      const reports = await ReportsService.listSavedReports(tenantId, schoolId, userId);
      res.json(reports);
    } catch (error) {
      next(error);
    }
  }

  static async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const report = await ReportsService.getSavedReport(req.params.id as string, tenantId, userId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  }

  static async deleteReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      await ReportsService.deleteSavedReport(req.params.id as string, tenantId, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
