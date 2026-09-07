import { Request, Response, NextFunction } from 'express';
import { DocumentsService } from './documents.service.js';

export class PublicVerifyController {
  public static async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.params.token as string;
      if (!token) {
        return res.status(400).json({ isValid: false, reason: 'MISSING_TOKEN' });
      }

      const result = await DocumentsService.verifyToken(token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
