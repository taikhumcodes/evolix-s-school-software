import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { NotFoundError } from '../../lib/errors.js';
import { HrService } from '../hr/hr.service.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schools = await prisma.school.findMany({
      where: {
        tenantId: req.user!.tenantId,
        isDeleted: false,
      },
      orderBy: { name: 'asc' },
    });
    res.json(schools.map((s) => ({ id: s.id, name: s.name, code: s.code })));
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermissions(['school.create']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code } = req.body;
    const school = await prisma.school.create({
      data: {
        tenantId: req.user!.tenantId,
        name,
        code,
      },
    });

    // Initialize school configurations and setup progress
    await prisma.schoolConfiguration.create({
      data: {
        tenantId: req.user!.tenantId,
        schoolId: school.id,
      },
    });

    await prisma.brandingConfiguration.create({
      data: {
        tenantId: req.user!.tenantId,
        schoolId: school.id,
      },
    });

    await prisma.schoolSetupProgress.create({
      data: {
        tenantId: req.user!.tenantId,
        schoolId: school.id,
        currentStep: 'school_name',
        setupStatus: 'IN_PROGRESS',
        completedSteps: '[]',
      },
    });

    // Initialize standard baseline departments and designations
    await HrService.ensureDefaultDepartmentsAndDesignations(school.tenantId, school.id);

    // Assign current user to the new school
    await prisma.userSchool.upsert({
      where: { userId_schoolId: { userId: req.user!.id, schoolId: school.id } },
      update: {},
      create: { userId: req.user!.id, schoolId: school.id },
    });

    res.status(201).json({ id: school.id, name: school.name, code: school.code });
  } catch (err) {
    next(err);
  }
});

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
