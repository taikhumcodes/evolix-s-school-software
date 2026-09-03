import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = (req.query.school_id as string) || req.schoolId;
    const where: any = { tenantId: req.user!.tenantId };
    if (schoolId) {
      where.OR = [{ schoolId }, { schoolId: null }];
    }

    const list = await prisma.numberSeries.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    res.json(
      list.map((ns) => ({
        id: ns.id,
        code: ns.code,
        current_value: ns.currentValue,
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
