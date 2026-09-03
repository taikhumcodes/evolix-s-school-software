import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticate);

router.get('', requirePermissions(['users.manage', 'security.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId;
    const action = req.query.action as string | undefined;
    const entityType = req.query.entity_type as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.page_size as string) || '25', 10)));

    const where: any = { tenantId };
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = logs.map((a) => ({
      id: a.id,
      action: a.action,
      entity_type: a.entityType,
      entity_id: a.entityId,
      user_id: a.userId,
      school_id: a.schoolId,
      before_data: a.beforeData,
      after_data: a.afterData,
      ip_address: a.ipAddress,
      created_at: a.createdAt.toISOString(),
    }));

    res.json({
      items,
      total,
      page,
      page_size: pageSize,
      pages: total > 0 ? Math.ceil(total / pageSize) : 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
