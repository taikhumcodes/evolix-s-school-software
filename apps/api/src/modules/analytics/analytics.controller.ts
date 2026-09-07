import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  static async getExecutiveKpi(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;

      const kpis = await AnalyticsService.getExecutiveKpis(tenantId, schoolId);
      res.json(kpis);
    } catch (error) {
      next(error);
    }
  }

  static async getStudentAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const analytics = await AnalyticsService.getStudentAnalytics(tenantId, schoolId, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }

  static async getAttendanceAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const analytics = await AnalyticsService.getAttendanceAnalytics(tenantId, schoolId, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }

  static async getFinanceAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const analytics = await AnalyticsService.getFinanceAnalytics(tenantId, schoolId, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }

  static async getHrAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId!;
      
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const analytics = await AnalyticsService.getHrAnalytics(tenantId, schoolId, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }
}
