import { Request, Response, NextFunction } from 'express';
import { SecurityModuleService } from './security.service.js';

export class SecurityController {
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecurityModuleService.changePassword(
        req.user!.id,
        req.user!.tenantId,
        req.body.current_password,
        req.body.new_password
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async setup2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecurityModuleService.setup2fa(req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async verify2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecurityModuleService.verify2faSetup(
        req.user!.id,
        req.user!.tenantId,
        req.body.code
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async disable2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecurityModuleService.disable2fa(req.user!.id, req.user!.tenantId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async regenerateRecoveryCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecurityModuleService.regenerateRecoveryCodes(req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecurityModuleService.listSessions(req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async revokeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = Array.isArray(req.params.session_id) ? req.params.session_id[0] : req.params.session_id;
      const result = await SecurityModuleService.revokeSession(
        sessionId,
        req.user!.id
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Endpoints ---

  static async getPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecurityModuleService.getPolicy(req.user!.tenantId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async updatePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecurityModuleService.updatePolicy(
        req.user!.tenantId,
        req.user!.id,
        req.body
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async listIpRestrictions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecurityModuleService.listIpRestrictions(req.user!.tenantId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async createIpRestriction(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecurityModuleService.createIpRestriction(
        req.user!.tenantId,
        req.user!.id,
        req.body
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async deleteIpRestriction(req: Request, res: Response, next: NextFunction) {
    try {
      const ruleId = Array.isArray(req.params.rule_id) ? req.params.rule_id[0] : req.params.rule_id;
      const result = await SecurityModuleService.deleteIpRestriction(
        ruleId,
        req.user!.tenantId,
        req.user!.id
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async listSecurityEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecurityModuleService.listSecurityEvents(req.user!.tenantId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async adminRevokeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = Array.isArray(req.params.session_id) ? req.params.session_id[0] : req.params.session_id;
      const result = await SecurityModuleService.adminRevokeSession(
        sessionId,
        req.user!.tenantId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async adminReset2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Array.isArray(req.params.user_id) ? req.params.user_id[0] : req.params.user_id;
      const result = await SecurityModuleService.adminReset2fa(
        userId,
        req.user!.tenantId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async adminUnlockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Array.isArray(req.params.user_id) ? req.params.user_id[0] : req.params.user_id;
      const result = await SecurityModuleService.adminUnlockUser(
        userId,
        req.user!.tenantId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
