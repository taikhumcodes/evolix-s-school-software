import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { NotFoundError } from '../../lib/errors.js';

const router = Router();

router.use(authenticate);

router.get('/:school_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = Array.isArray(req.params.school_id) ? req.params.school_id[0] : req.params.school_id;
    const school = await prisma.school.findFirst({
      where: {
        id: schoolId,
        tenantId: req.user!.tenantId,
        isDeleted: false,
      },
    });

    if (!school) {
      throw new NotFoundError('School not found');
    }

    res.json({
      id: school.id,
      name: school.name,
      code: school.code,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:school_id/settings',
  requirePermissions(['settings.manage']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = Array.isArray(req.params.school_id) ? req.params.school_id[0] : req.params.school_id;
      const school = await prisma.school.findFirst({
        where: {
          id: schoolId,
          tenantId: req.user!.tenantId,
          isDeleted: false,
        },
      });

      if (!school) {
        throw new NotFoundError('School not found');
      }

      res.json({ status: 'ok' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
