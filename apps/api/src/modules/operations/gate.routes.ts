import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { GateController } from './gate.controller.js';
import {
  CreateVisitorSchema,
  UpdateVisitorSchema,
  CheckInVisitorSchema,
  CheckOutVisitorSchema,
  CancelOrDenyVisitSchema,
  StudentPickupReleaseSchema,
} from './gate.schema.js';

export const gateRouter = Router();
gateRouter.use(authenticate);

// 1. Visitors
gateRouter.get(
  '/visitors',
  requireAnyPermission(['gate.view', 'gate.manage', 'gate.visitor.manage']),
  GateController.listVisitors
);

gateRouter.get(
  '/visitors/:id',
  requireAnyPermission(['gate.view', 'gate.manage', 'gate.visitor.manage']),
  GateController.getVisitorById
);

gateRouter.post(
  '/visitors',
  requireAnyPermission(['gate.manage', 'gate.checkin', 'gate.visitor.manage', 'gate.visitors.checkin']),
  validateRequest({ body: CreateVisitorSchema }),
  GateController.createVisitor
);

gateRouter.patch(
  '/visitors/:id',
  requireAnyPermission(['gate.manage', 'gate.visitor.manage']),
  validateRequest({ body: UpdateVisitorSchema }),
  GateController.updateVisitor
);

// 2. Visits & Passes
gateRouter.get(
  '/visits',
  requireAnyPermission(['gate.view', 'gate.manage', 'gate.visitor.manage']),
  GateController.listVisits
);

gateRouter.get(
  '/visits/:id',
  requireAnyPermission(['gate.view', 'gate.manage', 'gate.visitor.manage']),
  GateController.getVisitById
);

gateRouter.post(
  '/visits/check-in',
  requireAnyPermission(['gate.manage', 'gate.checkin', 'gate.visitor.manage', 'gate.visitors.checkin']),
  validateRequest({ body: CheckInVisitorSchema }),
  GateController.checkInVisitor
);

gateRouter.post(
  '/visits/:id/check-out',
  requireAnyPermission(['gate.manage', 'gate.checkout', 'gate.visitor.manage', 'gate.visitors.checkout']),
  validateRequest({ body: CheckOutVisitorSchema }),
  GateController.checkOutVisitor
);

gateRouter.post(
  '/visits/:id/cancel-or-deny',
  requireAnyPermission(['gate.manage', 'gate.visitor.manage']),
  validateRequest({ body: CancelOrDenyVisitSchema }),
  GateController.cancelOrDenyVisit
);

// 3. Student Pickup Releases
gateRouter.get(
  '/pickups',
  requireAnyPermission(['gate.view', 'gate.manage', 'gate.pickup', 'gate.pickup.manage', 'gate.pickup.release']),
  GateController.listStudentPickupReleases
);

gateRouter.post(
  '/pickups',
  requireAnyPermission(['gate.manage', 'gate.pickup', 'gate.pickup.manage', 'gate.pickup.release']),
  validateRequest({ body: StudentPickupReleaseSchema }),
  GateController.releaseStudentPickup
);
