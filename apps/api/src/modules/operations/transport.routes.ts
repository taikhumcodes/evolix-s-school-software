import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { TransportController } from './transport.controller.js';
import {
  CreateVehicleSchema,
  UpdateVehicleSchema,
  AssignVehicleStaffSchema,
  CreateTransportRouteSchema,
  UpdateTransportRouteSchema,
  CreateRouteStopSchema,
  AssignRouteVehicleSchema,
  AssignStudentTransportSchema,
  CreateTransportTripSchema,
  UpdateTransportTripSchema,
  UpdateTripBoardingSchema,
  LogOdometerSchema,
  LogFuelSchema,
  LogMaintenanceSchema,
  BillTransportFeeSchema,
} from './transport.schema.js';

export const transportRouter = Router();
transportRouter.use(authenticate);

const viewPerms = ['transport.view', 'transport.manage', 'operations.view'];
const managePerms = ['transport.manage', 'transport.vehicle.manage', 'transport.route.manage'];
const assignPerms = ['transport.manage', 'transport.assign', 'transport.assign.manage'];
const tripPerms = ['transport.manage', 'transport.trip.manage'];

// 1. Vehicles
transportRouter.get(
  '/vehicles',
  requireAnyPermission(viewPerms),
  TransportController.listVehicles
);

transportRouter.get(
  '/vehicles/:id',
  requireAnyPermission(viewPerms),
  TransportController.getVehicleById
);

transportRouter.post(
  '/vehicles',
  requireAnyPermission(managePerms),
  validateRequest({ body: CreateVehicleSchema }),
  TransportController.createVehicle
);

transportRouter.patch(
  '/vehicles/:id',
  requireAnyPermission(managePerms),
  validateRequest({ body: UpdateVehicleSchema }),
  TransportController.updateVehicle
);

transportRouter.put(
  '/vehicles/:id',
  requireAnyPermission(managePerms),
  validateRequest({ body: UpdateVehicleSchema }),
  TransportController.updateVehicle
);

transportRouter.delete(
  '/vehicles/:id',
  requireAnyPermission(managePerms),
  TransportController.archiveVehicle
);

transportRouter.post(
  '/vehicles/:id/staff',
  requireAnyPermission(managePerms),
  validateRequest({ body: AssignVehicleStaffSchema }),
  TransportController.assignVehicleStaff
);

// 2. Routes & Stops
transportRouter.get(
  '/routes',
  requireAnyPermission(viewPerms),
  TransportController.listRoutes
);

transportRouter.get(
  '/routes/:id',
  requireAnyPermission(viewPerms),
  TransportController.getRouteById
);

transportRouter.post(
  '/routes',
  requireAnyPermission(managePerms),
  validateRequest({ body: CreateTransportRouteSchema }),
  TransportController.createRoute
);

transportRouter.patch(
  '/routes/:id',
  requireAnyPermission(managePerms),
  validateRequest({ body: UpdateTransportRouteSchema }),
  TransportController.updateRoute
);

transportRouter.put(
  '/routes/:id',
  requireAnyPermission(managePerms),
  validateRequest({ body: UpdateTransportRouteSchema }),
  TransportController.updateRoute
);

transportRouter.delete(
  '/routes/:id',
  requireAnyPermission(managePerms),
  TransportController.archiveRoute
);

transportRouter.post(
  '/routes/:id/stops',
  requireAnyPermission(managePerms),
  validateRequest({ body: CreateRouteStopSchema }),
  TransportController.createRouteStop
);

transportRouter.post(
  '/routes/:id/vehicles',
  requireAnyPermission(managePerms),
  validateRequest({ body: AssignRouteVehicleSchema }),
  TransportController.assignRouteVehicle
);

// 3. Student Assignments & Manifest
transportRouter.post(
  ['/assignments', '/routes/:id/students'],
  requireAnyPermission(assignPerms),
  validateRequest({ body: AssignStudentTransportSchema }),
  TransportController.assignStudentTransport
);

transportRouter.post(
  '/assignments/:id/cancel',
  requireAnyPermission(assignPerms),
  TransportController.cancelStudentTransport
);

transportRouter.get(
  '/routes/:id/manifest',
  requireAnyPermission(viewPerms),
  TransportController.getRouteManifest
);

// 4. Trips & Boarding
transportRouter.get(
  '/trips',
  requireAnyPermission(viewPerms),
  TransportController.listTrips
);

transportRouter.post(
  '/trips',
  requireAnyPermission(tripPerms),
  validateRequest({ body: CreateTransportTripSchema }),
  TransportController.createTrip
);

transportRouter.patch(
  '/trips/:id',
  requireAnyPermission(tripPerms),
  validateRequest({ body: UpdateTransportTripSchema }),
  TransportController.updateTrip
);

transportRouter.put(
  '/trips/:id',
  requireAnyPermission(tripPerms),
  validateRequest({ body: UpdateTransportTripSchema }),
  TransportController.updateTrip
);

transportRouter.post(
  '/trips/:id/boarding',
  requireAnyPermission(tripPerms),
  validateRequest({ body: UpdateTripBoardingSchema }),
  TransportController.updateTripBoarding
);

// 5. Operations Logs
transportRouter.post(
  '/vehicles/:id/odometer',
  requireAnyPermission(managePerms),
  validateRequest({ body: LogOdometerSchema }),
  TransportController.logOdometer
);

transportRouter.post(
  '/vehicles/:id/fuel',
  requireAnyPermission(managePerms),
  validateRequest({ body: LogFuelSchema }),
  TransportController.logFuel
);

transportRouter.post(
  '/vehicles/:id/maintenance',
  requireAnyPermission(managePerms),
  validateRequest({ body: LogMaintenanceSchema }),
  TransportController.logMaintenance
);

// 6. Fee Integration
transportRouter.post(
  '/billing',
  requireAnyPermission(['transport.manage', 'finance.manage']),
  validateRequest({ body: BillTransportFeeSchema }),
  TransportController.billTransportFee
);
