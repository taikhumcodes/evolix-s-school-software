import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });
    res.json(
      permissions.map((p) => ({
        id: p.id,
        code: p.code,
        description: p.description,
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
