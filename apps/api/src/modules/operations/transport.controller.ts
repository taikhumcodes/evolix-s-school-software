import { Request, Response, NextFunction } from 'express';
import { TransportService } from './transport.service.js';
import { ScopeContext } from './operations.types.js';

function getContext(req: Request): ScopeContext {
  const perms = req.user?.permissions;
  const permissions = perms instanceof Set ? Array.from(perms) : (Array.isArray(perms) ? perms : []);
  return {
    tenantId: req.user!.tenantId,
    schoolId: req.schoolId!,
    userId: req.user!.id,
    ipAddress: req.ip,
    permissions,
    isSuperAdmin: (req.user as any)?.isSuperadmin ?? false,
  };
}

export class TransportController {
  // 1. Vehicles
  public static async listVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const query = {
        search: req.query.search as string,
        status: req.query.status as string,
        vehicleTypeId: req.query.vehicleTypeId as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await TransportService.listVehicles(ctx, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getVehicleById(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const vehicle = await TransportService.getVehicleById(ctx, req.params.id as string);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  }

  public static async createVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const vehicle = await TransportService.createVehicle(ctx, req.body);
      res.status(201).json(vehicle);
    } catch (err) {
      next(err);
    }
  }

  public static async updateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const vehicle = await TransportService.updateVehicle(ctx, req.params.id as string, req.body);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  }

  public static async archiveVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const vehicle = await TransportService.archiveVehicle(ctx, req.params.id as string);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  }

  public static async assignVehicleStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const assignment = await TransportService.assignVehicleStaff(ctx, req.params.id as string, req.body);
      res.status(201).json(assignment);
    } catch (err) {
      next(err);
    }
  }

  // 2. Routes
  public static async listRoutes(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const query = {
        search: req.query.search as string,
        status: req.query.status as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await TransportService.listRoutes(ctx, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getRouteById(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const route = await TransportService.getRouteById(ctx, req.params.id as string);
      res.json(route);
    } catch (err) {
      next(err);
    }
  }

  public static async createRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const route = await TransportService.createRoute(ctx, req.body);
      res.status(201).json(route);
    } catch (err) {
      next(err);
    }
  }

  public static async updateRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const route = await TransportService.updateRoute(ctx, req.params.id as string, req.body);
      res.json(route);
    } catch (err) {
      next(err);
    }
  }

  public static async archiveRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const route = await TransportService.archiveRoute(ctx, req.params.id as string);
      res.json(route);
    } catch (err) {
      next(err);
    }
  }

  public static async createRouteStop(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const stop = await TransportService.createRouteStop(ctx, req.params.id as string, req.body);
      res.status(201).json(stop);
    } catch (err) {
      next(err);
    }
  }

  public static async assignRouteVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const assignment = await TransportService.assignRouteVehicle(ctx, req.params.id as string, req.body);
      res.status(201).json(assignment);
    } catch (err) {
      next(err);
    }
  }

  // 3. Student Transport Assignment & Manifest
  public static async assignStudentTransport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      if (req.params.id && !req.body.routeId) {
        req.body.routeId = req.params.id;
      }
      const assignment = await TransportService.assignStudentTransport(ctx, req.body);
      res.status(201).json(assignment);
    } catch (err) {
      next(err);
    }
  }

  public static async cancelStudentTransport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const cancelled = await TransportService.cancelStudentTransport(ctx, req.params.id as string);
      res.json(cancelled);
    } catch (err) {
      next(err);
    }
  }

  public static async getRouteManifest(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const manifest = await TransportService.getRouteManifest(ctx, {
        routeId: req.params.id as string,
        vehicleId: req.query.vehicleId as string,
        shift: req.query.shift as string,
        date: req.query.date as string,
      });
      res.json(manifest);
    } catch (err) {
      next(err);
    }
  }

  // 4. Trips
  public static async listTrips(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const query = {
        routeId: req.query.routeId as string,
        vehicleId: req.query.vehicleId as string,
        tripDate: req.query.tripDate as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await TransportService.listTrips(ctx, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async createTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const trip = await TransportService.createTrip(ctx, req.body);
      res.status(201).json(trip);
    } catch (err) {
      next(err);
    }
  }

  public static async updateTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const trip = await TransportService.updateTrip(ctx, req.params.id as string, req.body);
      res.json(trip);
    } catch (err) {
      next(err);
    }
  }

  public static async updateTripBoarding(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const record = await TransportService.updateTripBoarding(
        ctx,
        req.params.id as string,
        req.body.studentId,
        req.body.status,
        req.body.notes
      );
      res.json(record);
    } catch (err) {
      next(err);
    }
  }

  // 5. Odometer, Fuel, Maintenance
  public static async logOdometer(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const log = await TransportService.logOdometer(ctx, req.params.id as string, req.body);
      res.status(201).json(log);
    } catch (err) {
      next(err);
    }
  }

  public static async logFuel(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const log = await TransportService.logFuel(ctx, req.params.id as string, req.body);
      res.status(201).json(log);
    } catch (err) {
      next(err);
    }
  }

  public static async logMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const log = await TransportService.logMaintenance(ctx, req.params.id as string, req.body);
      res.status(201).json(log);
    } catch (err) {
      next(err);
    }
  }

  // 6. Fees
  public static async billTransportFee(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const result = await TransportService.billTransportFee(ctx, req.body);
      res.status(result.isDuplicate ? 200 : 201).json(result);
    } catch (err) {
      next(err);
    }
  }
}
