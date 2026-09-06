import { Request, Response, NextFunction } from 'express';
import { OperationsService } from './operations.service.js';
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

function jsonToCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(',');
  const lines = rows.map((row) =>
    headers
      .map((header) => {
        const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(',')
  );
  return [headerLine, ...lines].join('\n');
}

export class OperationsController {
  public static async getDashboardOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const overview = await OperationsService.getDashboardOverview(ctx);
      res.json(overview);
    } catch (err) {
      next(err);
    }
  }

  // Reports
  public static async getTransportReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const rows = await OperationsService.getTransportReport(ctx);
      if (req.query.format === 'csv') {
        const csv = jsonToCsv(rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transport_report.csv"');
        res.send(csv);
        return;
      }
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }

  public static async getInventoryStockReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const rows = await OperationsService.getInventoryStockReport(ctx);
      if (req.query.format === 'csv') {
        const csv = jsonToCsv(rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="inventory_stock_report.csv"');
        res.send(csv);
        return;
      }
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }

  public static async getAssetRegisterReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const rows = await OperationsService.getAssetRegisterReport(ctx);
      if (req.query.format === 'csv') {
        const csv = jsonToCsv(rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="asset_register_report.csv"');
        res.send(csv);
        return;
      }
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }

  public static async getVisitorLogReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const fromDate = req.query.fromDate as string;
      const toDate = req.query.toDate as string;
      const rows = await OperationsService.getVisitorLogReport(ctx, fromDate, toDate);
      if (req.query.format === 'csv') {
        const csv = jsonToCsv(rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="visitor_log_report.csv"');
        res.send(csv);
        return;
      }
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }

  public static async getEventReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const rows = await OperationsService.getEventReport(ctx);
      if (req.query.format === 'csv') {
        const csv = jsonToCsv(rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="events_report.csv"');
        res.send(csv);
        return;
      }
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }
}
