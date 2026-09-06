import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AuthService } from './auth.service.js';
import { getClientIp } from '../../lib/ip.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const ipAddress = getClientIp(req);
      const userAgent = req.headers['user-agent'];
      const result = await AuthService.login({
        email: req.body.email,
        password: req.body.password,
        ipAddress,
        userAgent,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async verify2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const ipAddress = getClientIp(req);
      const userAgent = req.headers['user-agent'];
      const result = await AuthService.verify2fa({
        challengeToken: req.body.challenge_token,
        totpCode: req.body.totp_code,
        ipAddress,
        userAgent,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async recoveryLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const ipAddress = getClientIp(req);
      const userAgent = req.headers['user-agent'];
      const result = await AuthService.recoveryLogin({
        challengeToken: req.body.challenge_token,
        recoveryCode: req.body.recovery_code,
        ipAddress,
        userAgent,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const ipAddress = getClientIp(req);
      const result = await AuthService.refresh({
        refreshToken: req.body.refresh_token,
        ipAddress,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.logout(req.body.refresh_token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const twoFactor = await prisma.userTwoFactor.findUnique({
        where: { userId: user.id },
      });

      res.json({
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        tenant_id: user.tenantId,
        selected_tenant_id: user.tenantId,
        schools: user.schools.map((s) => ({ id: s.id, name: s.name, code: s.code })),
        selected_school_id: req.schoolId || user.schools[0]?.id || null,
        school_id: req.schoolId || user.schools[0]?.id || null,
        roles: user.roles.map((r) => r.name),
        permissions: Array.from(user.permissions),
        isSuperadmin: user.isSuperadmin,
        is_2fa_enabled: Boolean(twoFactor?.isActive),
        must_change_password: user.mustChangePassword,
      });
    } catch (err) {
      next(err);
    }
  }
}
