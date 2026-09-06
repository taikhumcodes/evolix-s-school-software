import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { EventsController } from './events.controller.js';
import {
  CreateActivityCategorySchema,
  CreateSchoolEventSchema,
  UpdateSchoolEventSchema,
  AssignEventCoordinatorSchema,
  RegisterEventParticipantSchema,
  BulkRegisterSectionParticipantsSchema,
  UpdateParticipantStatusSchema,
  RecordAchievementSchema,
  LinkEventExpenseSchema,
} from './events.schema.js';

export const eventsRouter = Router();
eventsRouter.use(authenticate);

// 1. Categories
eventsRouter.get(
  '/categories',
  requireAnyPermission(['events.view', 'events.manage']),
  EventsController.listCategories
);

eventsRouter.post(
  '/categories',
  requireAnyPermission(['events.manage']),
  validateRequest({ body: CreateActivityCategorySchema }),
  EventsController.createCategory
);

// 2. Events CRUD
eventsRouter.get(
  '/',
  requireAnyPermission(['events.view', 'events.manage']),
  EventsController.listEvents
);

eventsRouter.get(
  '/:id',
  requireAnyPermission(['events.view', 'events.manage']),
  EventsController.getEventById
);

eventsRouter.post(
  '/',
  requireAnyPermission(['events.manage']),
  validateRequest({ body: CreateSchoolEventSchema }),
  EventsController.createEvent
);

eventsRouter.patch(
  '/:id',
  requireAnyPermission(['events.manage']),
  validateRequest({ body: UpdateSchoolEventSchema }),
  EventsController.updateEvent
);

// 3. Coordinators
eventsRouter.post(
  '/:id/coordinators',
  requireAnyPermission(['events.manage']),
  validateRequest({ body: AssignEventCoordinatorSchema }),
  EventsController.assignCoordinator
);

eventsRouter.delete(
  '/:id/coordinators/:employeeId',
  requireAnyPermission(['events.manage']),
  EventsController.removeCoordinator
);

// 4. Participants
eventsRouter.post(
  '/:id/participants',
  requireAnyPermission(['events.manage', 'events.participants.manage']),
  validateRequest({ body: RegisterEventParticipantSchema }),
  EventsController.registerParticipant
);

eventsRouter.post(
  '/:id/participants/bulk',
  requireAnyPermission(['events.manage', 'events.participants.manage']),
  validateRequest({ body: BulkRegisterSectionParticipantsSchema }),
  EventsController.bulkRegisterSection
);

eventsRouter.patch(
  '/:id/participants/:participantId/status',
  requireAnyPermission(['events.manage', 'events.participants.manage']),
  validateRequest({ body: UpdateParticipantStatusSchema }),
  EventsController.updateParticipantStatus
);

// 5. Achievements
eventsRouter.post(
  '/:id/achievements',
  requireAnyPermission(['events.manage', 'events.results.manage']),
  validateRequest({ body: RecordAchievementSchema }),
  EventsController.recordAchievement
);

// 6. Expense Links
eventsRouter.post(
  '/:id/expenses',
  requireAnyPermission(['events.manage']),
  validateRequest({ body: LinkEventExpenseSchema }),
  EventsController.linkExpenseBill
);

eventsRouter.delete(
  '/:id/expenses/:expenseBillId',
  requireAnyPermission(['events.manage']),
  EventsController.unlinkExpenseBill
);
