import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ScopeContext, normalizeRegistration, doShiftsOverlap, doDateRangesOverlap } from './operations.types.js';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { FinanceService } from '../finance/finance.service.js';

export class TransportService {
  // =========================================================================
  // 1. VEHICLE MASTER
  // =========================================================================

  public static async listVehicles(
    ctx: ScopeContext,
    params: { search?: string; status?: string; vehicleTypeId?: string; page?: number; limit?: number }
  ) {
    const { schoolId } = ctx;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {
      schoolId,
      archivedAt: null,
    };

    if (params.status) {
      where.status = params.status;
    }
    if (params.vehicleTypeId) {
      where.vehicleTypeId = params.vehicleTypeId;
    }
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { vehicleNumber: { contains: q, mode: 'insensitive' } },
        { registrationNumber: { contains: q, mode: 'insensitive' } },
        { make: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        include: {
          vehicleType: { select: { id: true, name: true, code: true, capacity: true } },
          staffAssignments: {
            where: { isActive: true },
            include: { employee: { select: { id: true, employeeNumber: true, displayName: true, phone: true } } },
          },
          routeAssignments: {
            where: { isActive: true },
            include: { route: { select: { id: true, routeCode: true, routeName: true } } },
          },
          _count: {
            select: {
              studentAssignments: { where: { status: 'ACTIVE' } },
              trips: true,
              documents: true,
            },
          },
        },
        orderBy: { vehicleNumber: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  }

  public static async getVehicleById(ctx: ScopeContext, id: string) {
    const { schoolId } = ctx;
    const vehicle = await prisma.vehicle.findFirst({
      where: { id, schoolId, archivedAt: null },
      include: {
        vehicleType: true,
        staffAssignments: {
          include: { employee: { select: { id: true, employeeNumber: true, displayName: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
        },
        routeAssignments: {
          include: { route: true },
          orderBy: { effectiveFrom: 'desc' },
        },
        documents: { orderBy: { createdAt: 'desc' } },
        odometerLogs: {
          include: { enteredByUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
          orderBy: { recordedAt: 'desc' },
          take: 20,
        },
        fuelLogs: { orderBy: { fuelDate: 'desc' }, take: 20 },
        maintenanceLogs: {
          include: { linkedExpenseBill: { select: { id: true, billNumber: true, totalAmount: true, status: true } } },
          orderBy: { serviceDate: 'desc' },
          take: 20,
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }
    return vehicle;
  }

  public static async createVehicle(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const normReg = normalizeRegistration(data.registrationNumber);
    if (!normReg) {
      throw new BadRequestError('Registration number is required');
    }

    // Check duplicate normalized registration in school
    const existing = await prisma.vehicle.findFirst({
      where: { schoolId, normalizedRegistration: normReg, archivedAt: null },
    });
    if (existing) {
      throw new ConflictError('A vehicle with this registration number already exists in this school', {
        code: 'VEHICLE_ALREADY_EXISTS',
      });
    }

    // Validate vehicle type or find/create default
    let vTypeId = data.vehicleTypeId;
    let vTypeCapacity: number | null = null;
    if (vTypeId) {
      const vType = await prisma.vehicleType.findFirst({
        where: { id: vTypeId, tenantId, archivedAt: null },
      });
      if (!vType) {
        throw new BadRequestError('Invalid vehicle type');
      }
      vTypeCapacity = vType.capacity;
    } else {
      let defaultVt = await prisma.vehicleType.findFirst({
        where: { tenantId, archivedAt: null },
      });
      if (!defaultVt) {
        defaultVt = await prisma.vehicleType.create({
          data: {
            tenantId,
            schoolId,
            name: 'Standard Bus',
            code: 'BUS-STD',
            capacity: 40,
          },
        });
      }
      vTypeId = defaultVt.id;
      vTypeCapacity = defaultVt.capacity;
    }

    const odo = data.currentOdometer ?? data.currentOdometerReading ?? 0;
    const vNum = (data.vehicleNumber || data.registrationNumber).trim();

    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId,
        schoolId,
        vehicleNumber: vNum,
        registrationNumber: data.registrationNumber.trim().toUpperCase(),
        normalizedRegistration: normReg,
        vehicleTypeId: vTypeId,
        make: data.make || null,
        model: data.model || null,
        manufacturingYear: data.manufacturingYear || null,
        seatingCapacity: data.seatingCapacity ?? vTypeCapacity ?? 40,
        schoolOwned: data.schoolOwned ?? true,
        ownershipType: data.ownershipType || 'SCHOOL_OWNED',
        ownerName: data.ownerName || null,
        insuranceExpiryDate: data.insuranceExpiryDate ? new Date(data.insuranceExpiryDate) : null,
        fitnessExpiryDate: data.fitnessExpiryDate ? new Date(data.fitnessExpiryDate) : null,
        permitExpiryDate: data.permitExpiryDate ? new Date(data.permitExpiryDate) : null,
        pollutionExpiryDate: data.pollutionExpiryDate ? new Date(data.pollutionExpiryDate) : null,
        currentOdometer: odo,
        status: data.status || 'ACTIVE',
      },
      include: { vehicleType: true },
    });

    // Record initial odometer log if > 0
    if (vehicle.currentOdometer > 0) {
      await prisma.vehicleOdometerLog.create({
        data: {
          tenantId,
          schoolId,
          vehicleId: vehicle.id,
          reading: vehicle.currentOdometer,
          recordedAt: new Date(),
          sourceType: 'MANUAL',
          reference: 'INITIAL_READING',
          enteredByUserId: userId,
          remarks: 'Initial odometer reading on vehicle creation',
        },
      });
    }

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'VEHICLE_CREATED',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      afterData: vehicle,
      ipAddress,
    });

    return vehicle;
  }

  public static async updateVehicle(ctx: ScopeContext, id: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const existing = await prisma.vehicle.findFirst({
      where: { id, schoolId, archivedAt: null },
    });
    if (!existing) {
      throw new NotFoundError('Vehicle not found');
    }

    let normReg = existing.normalizedRegistration;
    if (data.registrationNumber) {
      normReg = normalizeRegistration(data.registrationNumber);
      if (normReg !== existing.normalizedRegistration) {
        const dup = await prisma.vehicle.findFirst({
          where: { schoolId, normalizedRegistration: normReg, id: { not: id }, archivedAt: null },
        });
        if (dup) {
          throw new ConflictError('A vehicle with this registration number already exists in this school', {
            code: 'VEHICLE_ALREADY_EXISTS',
          });
        }
      }
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        vehicleNumber: data.vehicleNumber ? data.vehicleNumber.trim() : undefined,
        registrationNumber: data.registrationNumber ? data.registrationNumber.trim().toUpperCase() : undefined,
        normalizedRegistration: normReg,
        vehicleTypeId: data.vehicleTypeId || undefined,
        make: data.make !== undefined ? data.make : undefined,
        model: data.model !== undefined ? data.model : undefined,
        manufacturingYear: data.manufacturingYear !== undefined ? data.manufacturingYear : undefined,
        seatingCapacity: data.seatingCapacity !== undefined ? data.seatingCapacity : undefined,
        schoolOwned: data.schoolOwned !== undefined ? data.schoolOwned : undefined,
        ownershipType: data.ownershipType || undefined,
        ownerName: data.ownerName !== undefined ? data.ownerName : undefined,
        insuranceExpiryDate: data.insuranceExpiryDate !== undefined ? (data.insuranceExpiryDate ? new Date(data.insuranceExpiryDate) : null) : undefined,
        fitnessExpiryDate: data.fitnessExpiryDate !== undefined ? (data.fitnessExpiryDate ? new Date(data.fitnessExpiryDate) : null) : undefined,
        permitExpiryDate: data.permitExpiryDate !== undefined ? (data.permitExpiryDate ? new Date(data.permitExpiryDate) : null) : undefined,
        pollutionExpiryDate: data.pollutionExpiryDate !== undefined ? (data.pollutionExpiryDate ? new Date(data.pollutionExpiryDate) : null) : undefined,
        status: data.status || undefined,
      },
      include: { vehicleType: true },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'VEHICLE_UPDATED',
      entityType: 'Vehicle',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  public static async archiveVehicle(ctx: ScopeContext, id: string) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const existing = await prisma.vehicle.findFirst({
      where: { id, schoolId, archivedAt: null },
    });
    if (!existing) {
      throw new NotFoundError('Vehicle not found');
    }

    // Check if vehicle has active trips or assignments
    const activeTrips = await prisma.transportTrip.count({
      where: { vehicleId: id, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
    });
    if (activeTrips > 0) {
      throw new BadRequestError('Cannot archive vehicle with active or planned trips');
    }

    const archived = await prisma.vehicle.update({
      where: { id },
      data: { archivedAt: new Date(), status: 'ARCHIVED' },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'VEHICLE_ARCHIVED',
      entityType: 'Vehicle',
      entityId: id,
      beforeData: existing,
      ipAddress,
    });

    return archived;
  }

  // =========================================================================
  // 2. VEHICLE STAFF ASSIGNMENTS (DRIVER / CONDUCTOR)
  // =========================================================================

  public static async assignVehicleStaff(
    ctx: ScopeContext,
    vehicleId: string,
    data: { employeeId: string; assignmentRole: string; effectiveFrom: string; effectiveTo?: string | null }
  ) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, schoolId, archivedAt: null },
    });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // Validate employee: same tenant & school, not archived, not separated
    const employee = await prisma.employee.findFirst({
      where: {
        id: data.employeeId,
        tenantId,
        schoolId,
        status: { in: ['ACTIVE', 'PROBATION'] },
      },
    });
    if (!employee) {
      throw new BadRequestError('Employee is not valid, active, or does not belong to this school');
    }

    const effFrom = new Date(data.effectiveFrom);
    const effTo = data.effectiveTo ? new Date(data.effectiveTo) : null;

    // Deactivate previous active assignment for this vehicle & role if overlapping
    await prisma.vehicleStaffAssignment.updateMany({
      where: {
        vehicleId,
        assignmentRole: data.assignmentRole,
        isActive: true,
      },
      data: {
        isActive: false,
        effectiveTo: effFrom,
      },
    });

    const assignment = await prisma.vehicleStaffAssignment.create({
      data: {
        tenantId,
        schoolId,
        vehicleId,
        employeeId: data.employeeId,
        assignmentRole: data.assignmentRole,
        effectiveFrom: effFrom,
        effectiveTo: effTo,
        isActive: true,
      },
      include: {
        employee: { select: { id: true, employeeNumber: true, displayName: true, phone: true } },
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'VEHICLE_STAFF_ASSIGNED',
      entityType: 'VehicleStaffAssignment',
      entityId: assignment.id,
      afterData: assignment,
      ipAddress,
    });

    return assignment;
  }

  // =========================================================================
  // 3. TRANSPORT ROUTES & STOPS
  // =========================================================================

  public static async listRoutes(
    ctx: ScopeContext,
    params: { search?: string; status?: string; page?: number; limit?: number }
  ) {
    const { schoolId } = ctx;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TransportRouteWhereInput = {
      schoolId,
      archivedAt: null,
    };

    if (params.status) {
      where.status = params.status;
    }
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { routeCode: { contains: q, mode: 'insensitive' } },
        { routeName: { contains: q, mode: 'insensitive' } },
        { startLocation: { contains: q, mode: 'insensitive' } },
        { endLocation: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.transportRoute.count({ where }),
      prisma.transportRoute.findMany({
        where,
        include: {
          stops: { where: { isActive: true }, orderBy: { sequence: 'asc' } },
          vehicleAssignments: {
            where: { isActive: true },
            include: { vehicle: { select: { id: true, vehicleNumber: true, seatingCapacity: true } } },
          },
          _count: {
            select: {
              studentAssignments: { where: { status: 'ACTIVE' } },
              stops: true,
              trips: true,
            },
          },
        },
        orderBy: { routeCode: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  }

  public static async getRouteById(ctx: ScopeContext, id: string) {
    const { schoolId } = ctx;
    const route = await prisma.transportRoute.findFirst({
      where: { id, schoolId, archivedAt: null },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        vehicleAssignments: {
          where: { isActive: true },
          include: { vehicle: true },
        },
        studentAssignments: {
          where: { status: 'ACTIVE' },
          include: {
            student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
            pickupStop: true,
            dropStop: true,
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundError('Route not found');
    }
    return route;
  }

  public static async createRoute(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    let routeCode = data.routeCode?.trim();
    if (!routeCode) {
      routeCode = await FinanceService.getNextNumber(tenantId, schoolId, 'TRANSPORT_ROUTE', 'ROUTE-', 3);
    }

    const existing = await prisma.transportRoute.findFirst({
      where: { schoolId, routeCode, archivedAt: null },
    });
    if (existing) {
      throw new ConflictError('A route with this code already exists', { code: 'ROUTE_ALREADY_EXISTS' });
    }

    const route = await prisma.transportRoute.create({
      data: {
        tenantId,
        schoolId,
        routeCode,
        routeName: data.routeName.trim(),
        description: data.description || null,
        startLocation: data.startLocation.trim(),
        endLocation: data.endLocation.trim(),
        estimatedDistance: data.estimatedDistance !== undefined ? new Prisma.Decimal(data.estimatedDistance) : null,
        estimatedDuration: data.estimatedDuration || null,
        status: data.status || 'ACTIVE',
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'ROUTE_CREATED',
      entityType: 'TransportRoute',
      entityId: route.id,
      afterData: route,
      ipAddress,
    });

    return route;
  }

  public static async updateRoute(ctx: ScopeContext, id: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const existing = await prisma.transportRoute.findFirst({
      where: { id, schoolId, archivedAt: null },
    });
    if (!existing) {
      throw new NotFoundError('Route not found');
    }

    const updated = await prisma.transportRoute.update({
      where: { id },
      data: {
        routeName: data.routeName ? data.routeName.trim() : undefined,
        description: data.description !== undefined ? data.description : undefined,
        startLocation: data.startLocation ? data.startLocation.trim() : undefined,
        endLocation: data.endLocation ? data.endLocation.trim() : undefined,
        estimatedDistance: data.estimatedDistance !== undefined ? new Prisma.Decimal(data.estimatedDistance) : undefined,
        estimatedDuration: data.estimatedDuration !== undefined ? data.estimatedDuration : undefined,
        status: data.status || undefined,
      },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'ROUTE_UPDATED',
      entityType: 'TransportRoute',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  public static async archiveRoute(ctx: ScopeContext, id: string) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;
    const existing = await prisma.transportRoute.findFirst({
      where: { id, schoolId, archivedAt: null },
    });
    if (!existing) {
      throw new NotFoundError('Route not found');
    }
    const updated = await prisma.transportRoute.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'ROUTE_ARCHIVED',
      entityType: 'TransportRoute',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      ipAddress,
    });
    return updated;
  }

  public static async createRouteStop(ctx: ScopeContext, routeId: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const route = await prisma.transportRoute.findFirst({
      where: { id: routeId, schoolId, archivedAt: null },
    });
    if (!route) {
      throw new NotFoundError('Route not found');
    }

    // Verify sequence positive and unique in route
    if (data.sequence <= 0) {
      throw new BadRequestError('Stop sequence must be a positive integer', { code: 'ROUTE_STOP_INVALID' });
    }

    const existingSeq = await prisma.transportRouteStop.findFirst({
      where: { routeId, sequence: data.sequence },
    });
    if (existingSeq) {
      throw new ConflictError(`Stop sequence ${data.sequence} already exists on this route`, {
        code: 'ROUTE_STOP_SEQUENCE_EXISTS',
      });
    }

    const stop = await prisma.transportRouteStop.create({
      data: {
        tenantId,
        schoolId,
        routeId,
        stopName: data.stopName.trim(),
        sequence: data.sequence,
        pickupTime: data.pickupTime || null,
        dropTime: data.dropTime || null,
        landmark: data.landmark || null,
        latitude: data.latitude !== undefined ? new Prisma.Decimal(data.latitude) : null,
        longitude: data.longitude !== undefined ? new Prisma.Decimal(data.longitude) : null,
        isActive: data.isActive ?? true,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'ROUTE_STOP_CREATED',
      entityType: 'TransportRouteStop',
      entityId: stop.id,
      afterData: stop,
      ipAddress,
    });

    return stop;
  }

  // =========================================================================
  // 4. ROUTE VEHICLE ASSIGNMENT & SCHEDULE CONFLICT CHECK
  // =========================================================================

  public static async assignRouteVehicle(ctx: ScopeContext, routeId: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const route = await prisma.transportRoute.findFirst({
      where: { id: routeId, schoolId, archivedAt: null },
    });
    if (!route) {
      throw new NotFoundError('Route not found');
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: data.vehicleId, schoolId, archivedAt: null },
    });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const effFrom = new Date(data.effectiveFrom);
    const effTo = data.effectiveTo ? new Date(data.effectiveTo) : null;
    const shift = data.shift || 'BOTH';

    // Conflict Check: Check if this vehicle is already actively assigned to another route on an overlapping shift & date
    const existingVehicleAssignments = await prisma.transportRouteVehicleAssignment.findMany({
      where: {
        vehicleId: data.vehicleId,
        routeId: { not: routeId },
        isActive: true,
      },
    });

    for (const va of existingVehicleAssignments) {
      if (doShiftsOverlap(va.shift, shift) && doDateRangesOverlap(va.effectiveFrom, va.effectiveTo, effFrom, effTo)) {
        throw new ConflictError(
          `Vehicle ${vehicle.vehicleNumber} is already scheduled on another route for shift ${va.shift} during this time window`,
          { code: 'VEHICLE_ROUTE_CONFLICT' }
        );
      }
    }

    const assignment = await prisma.transportRouteVehicleAssignment.create({
      data: {
        tenantId,
        schoolId,
        routeId,
        vehicleId: data.vehicleId,
        shift,
        departureTime: data.departureTime || null,
        arrivalTime: data.arrivalTime || null,
        effectiveFrom: effFrom,
        effectiveTo: effTo,
        isActive: true,
      },
      include: { vehicle: true, route: true },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'ROUTE_VEHICLE_ASSIGNED',
      entityType: 'TransportRouteVehicleAssignment',
      entityId: assignment.id,
      afterData: assignment,
      ipAddress,
    });

    return assignment;
  }

  // =========================================================================
  // 5. STUDENT TRANSPORT ASSIGNMENT & CAPACITY ENFORCEMENT
  // =========================================================================

  public static async assignStudentTransport(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      // 1. Validate student
      const student = await tx.student.findFirst({
        where: { id: data.studentId, schoolId, archivedAt: null },
      });
      if (!student) {
        throw new NotFoundError('Student not found in this school');
      }

      // 2. Validate route
      const route = await tx.transportRoute.findFirst({
        where: { id: data.routeId, schoolId, archivedAt: null, status: 'ACTIVE' },
      });
      if (!route) {
        throw new NotFoundError('Active transport route not found');
      }

      // 3. Validate pickup & drop stops belong to route
      const [pickupStop, dropStop] = await Promise.all([
        tx.transportRouteStop.findFirst({ where: { id: data.pickupStopId, routeId: data.routeId, schoolId, isActive: true } }),
        tx.transportRouteStop.findFirst({ where: { id: data.dropStopId, routeId: data.routeId, schoolId, isActive: true } }),
      ]);
      if (!pickupStop || !dropStop) {
        throw new BadRequestError('Pickup or drop stop is invalid, inactive, or does not belong to the selected route', {
          code: 'ROUTE_STOP_INVALID',
        });
      }

      const effFrom = new Date(data.effectiveFrom);
      const effTo = data.effectiveTo ? new Date(data.effectiveTo) : null;
      const shift = data.shift || 'BOTH';

      // 4. Overlap Protection: Student cannot have conflicting active transport assignment on overlapping shift & date
      const existingStudentAssignments = await tx.studentTransportAssignment.findMany({
        where: {
          studentId: data.studentId,
          schoolId,
          status: 'ACTIVE',
        },
      });

      for (const sa of existingStudentAssignments) {
        if (doShiftsOverlap(sa.shift, shift) && doDateRangesOverlap(sa.effectiveFrom, sa.effectiveTo, effFrom, effTo)) {
          throw new ConflictError(
            'Student already has an active transport assignment for this shift during this period',
            { code: 'TRANSPORT_ASSIGNMENT_OVERLAP' }
          );
        }
      }

      // 5. Determine vehicle: either explicit or from active route vehicle assignment
      let targetVehicleId = data.vehicleId;
      if (!targetVehicleId) {
        const routeVehicle = await tx.transportRouteVehicleAssignment.findFirst({
          where: { routeId: data.routeId, isActive: true },
        });
        if (routeVehicle) {
          targetVehicleId = routeVehicle.vehicleId;
        }
      }

      if (targetVehicleId) {
        // ROW-LEVEL LOCK ON VEHICLE to prevent overbooking races
        const lockedVehicles = await tx.$queryRaw<Array<{ id: string; seating_capacity: number }>>`
          SELECT id, seating_capacity
          FROM vehicles
          WHERE id = ${targetVehicleId}::uuid AND school_id = ${schoolId}::uuid
          FOR UPDATE
        `;

        if (!lockedVehicles || lockedVehicles.length === 0) {
          throw new NotFoundError('Vehicle not found or not in this school');
        }

        const vehicleCapacity = lockedVehicles[0].seating_capacity;

        // Count current simultaneous applicable passengers:
        // Same vehicle, ACTIVE status, overlapping shift, overlapping date
        const activePassengers = await tx.studentTransportAssignment.findMany({
          where: {
            vehicleId: targetVehicleId,
            schoolId,
            status: 'ACTIVE',
          },
        });

        const simultaneousCount = activePassengers.filter(
          (p) => doShiftsOverlap(p.shift, shift) && doDateRangesOverlap(p.effectiveFrom, p.effectiveTo, effFrom, effTo)
        ).length;

        if (simultaneousCount >= vehicleCapacity) {
          throw new ConflictError(
            `Vehicle seating capacity of ${vehicleCapacity} has been reached for this shift (${simultaneousCount} active assignments)`,
            { code: 'VEHICLE_CAPACITY_EXCEEDED' }
          );
        }
      }

      const assignment = await tx.studentTransportAssignment.create({
        data: {
          tenantId,
          schoolId,
          studentId: data.studentId,
          academicYearId: data.academicYearId,
          routeId: data.routeId,
          pickupStopId: data.pickupStopId,
          dropStopId: data.dropStopId,
          vehicleId: targetVehicleId || null,
          shift,
          effectiveFrom: effFrom,
          effectiveTo: effTo,
          status: 'ACTIVE',
          transportFeeHeadId: data.transportFeeHeadId || null,
          feeAmount: data.feeAmount !== undefined && data.feeAmount !== null ? new Prisma.Decimal(data.feeAmount) : null,
          notes: data.notes || null,
        },
        include: {
          student: { select: { id: true, studentId: true, firstName: true, lastName: true } },
          route: true,
          pickupStop: true,
          dropStop: true,
          vehicle: true,
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'TRANSPORT_STUDENT_ASSIGNED',
        entityType: 'StudentTransportAssignment',
        entityId: assignment.id,
        afterData: assignment,
        ipAddress,
      });

      return assignment;
    });
  }

  public static async cancelStudentTransport(ctx: ScopeContext, assignmentId: string) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const existing = await prisma.studentTransportAssignment.findFirst({
      where: { id: assignmentId, schoolId },
    });
    if (!existing) {
      throw new NotFoundError('Transport assignment not found');
    }

    const updated = await prisma.studentTransportAssignment.update({
      where: { id: assignmentId },
      data: { status: 'CANCELLED', effectiveTo: new Date() },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'TRANSPORT_STUDENT_CANCELLED',
      entityType: 'StudentTransportAssignment',
      entityId: assignmentId,
      beforeData: existing,
      ipAddress,
    });

    return updated;
  }

  // =========================================================================
  // 6. ROUTE MANIFEST
  // =========================================================================

  public static async getRouteManifest(
    ctx: ScopeContext,
    params: { routeId: string; vehicleId?: string; shift?: string; date?: string }
  ) {
    const { schoolId } = ctx;
    const targetDate = params.date ? new Date(params.date) : new Date();

    const route = await prisma.transportRoute.findFirst({
      where: { id: params.routeId, schoolId, archivedAt: null },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });
    if (!route) {
      throw new NotFoundError('Route not found');
    }

    const assignments = await prisma.studentTransportAssignment.findMany({
      where: {
        schoolId,
        routeId: params.routeId,
        status: 'ACTIVE',
        vehicleId: params.vehicleId || undefined,
        effectiveFrom: { lte: targetDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: targetDate } }],
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
            displayName: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { class: true, section: true },
              take: 1,
            },
            guardians: {
              where: { isEmergencyContact: true },
              include: { guardian: { select: { firstName: true, lastName: true, phone: true } } },
              take: 1,
            },
          },
        },
        pickupStop: true,
        dropStop: true,
        vehicle: true,
      },
    });

    const filtered = params.shift
      ? assignments.filter((a) => doShiftsOverlap(a.shift, params.shift))
      : assignments;

    const passengers = filtered.map((a) => ({
      assignmentId: a.id,
      studentId: a.student.studentId,
      admissionNumber: a.student.admissionNumber,
      studentName: a.student.displayName || `${a.student.firstName} ${a.student.lastName}`.trim(),
      className: a.student.enrollments[0]?.class?.name || 'N/A',
      sectionName: a.student.enrollments[0]?.section?.name || 'N/A',
      pickupStop: a.pickupStop.stopName,
      pickupTime: a.pickupStop.pickupTime,
      dropStop: a.dropStop.stopName,
      dropTime: a.dropStop.dropTime,
      shift: a.shift,
      emergencyContactName: a.student.guardians[0]?.guardian
        ? `${a.student.guardians[0].guardian.firstName} ${a.student.guardians[0].guardian.lastName}`.trim()
        : 'N/A',
      emergencyContactPhone: a.student.guardians[0]?.guardian?.phone || 'N/A',
    }));

    return {
      route: {
        id: route.id,
        routeCode: route.routeCode,
        routeName: route.routeName,
        startLocation: route.startLocation,
        endLocation: route.endLocation,
        stopsCount: route.stops.length,
      },
      targetDate: targetDate.toISOString().split('T')[0],
      totalPassengers: passengers.length,
      passengers,
    };
  }

  // =========================================================================
  // 7. TRIPS & BOARDING TRACKING
  // =========================================================================

  public static async listTrips(
    ctx: ScopeContext,
    query: { routeId?: string; vehicleId?: string; tripDate?: string; page?: number; limit?: number }
  ) {
    const { tenantId, schoolId } = ctx;
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId, schoolId };
    if (query.routeId) where.routeId = query.routeId;
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.tripDate) where.tripDate = new Date(`${query.tripDate}T00:00:00.000Z`);

    const [total, trips] = await Promise.all([
      prisma.transportTrip.count({ where }),
      prisma.transportTrip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tripDate: 'desc' },
        include: {
          route: { select: { id: true, routeName: true, routeCode: true } },
          vehicle: { select: { id: true, registrationNumber: true, vehicleNumber: true } },
          driverEmployee: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { students: true } },
        },
      }),
    ]);

    return {
      items: trips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async createTrip(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const [route, vehicle, driver] = await Promise.all([
      prisma.transportRoute.findFirst({ where: { id: data.routeId, schoolId, archivedAt: null } }),
      prisma.vehicle.findFirst({ where: { id: data.vehicleId, schoolId, archivedAt: null } }),
      prisma.employee.findFirst({ where: { id: data.driverEmployeeId, schoolId, status: { in: ['ACTIVE', 'PROBATION'] } } }),
    ]);

    if (!route || !vehicle || !driver) {
      throw new BadRequestError('Invalid route, vehicle, or driver');
    }

    const tripDate = new Date(data.tripDate);

    const trip = await prisma.transportTrip.create({
      data: {
        tenantId,
        schoolId,
        routeId: data.routeId,
        vehicleId: data.vehicleId,
        driverEmployeeId: data.driverEmployeeId,
        conductorEmployeeId: data.conductorEmployeeId || null,
        tripDate,
        tripType: data.tripType,
        shift: data.shift || null,
        startOdometer: data.startOdometer || vehicle.currentOdometer,
        status: 'PLANNED',
        routeCodeSnapshot: route.routeCode,
        routeNameSnapshot: route.routeName,
        vehicleNumberSnapshot: vehicle.vehicleNumber,
        driverNameSnapshot: driver.displayName,
        notes: data.notes || null,
      },
    });

    // Populate expected passengers snapshot from active route assignments
    const activeAssignments = await prisma.studentTransportAssignment.findMany({
      where: {
        routeId: data.routeId,
        schoolId,
        status: 'ACTIVE',
        effectiveFrom: { lte: tripDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: tripDate } }],
      },
    });

    const relevant = data.shift
      ? activeAssignments.filter((a) => doShiftsOverlap(a.shift, data.shift))
      : activeAssignments;

    if (relevant.length > 0) {
      await prisma.transportTripStudent.createMany({
        data: relevant.map((a) => ({
          tripId: trip.id,
          studentId: a.studentId,
          pickupStopId: a.pickupStopId,
          dropStopId: a.dropStopId,
          status: 'EXPECTED',
        })),
        skipDuplicates: true,
      });
    }

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'TRANSPORT_TRIP_CREATED',
      entityType: 'TransportTrip',
      entityId: trip.id,
      afterData: trip,
      ipAddress,
    });

    return trip;
  }

  public static async updateTrip(ctx: ScopeContext, id: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const trip = await prisma.transportTrip.findFirst({
      where: { id, schoolId },
    });
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    // Monotonic odometer check for completed trip
    if (data.status === 'COMPLETED' && data.endOdometer !== undefined) {
      if (trip.startOdometer !== null && data.endOdometer < trip.startOdometer) {
        throw new BadRequestError('Trip end odometer cannot be less than start odometer', {
          code: 'ODOMETER_READING_INVALID',
        });
      }
    }

    const updated = await prisma.transportTrip.update({
      where: { id },
      data: {
        status: data.status || undefined,
        endOdometer: data.endOdometer !== undefined ? data.endOdometer : undefined,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
    });

    // If trip completed and endOdometer was higher than current vehicle odometer, update vehicle
    if (data.status === 'COMPLETED' && data.endOdometer && data.endOdometer > 0) {
      await prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { currentOdometer: data.endOdometer },
      });
      await prisma.vehicleOdometerLog.create({
        data: {
          tenantId,
          schoolId,
          vehicleId: trip.vehicleId,
          reading: data.endOdometer,
          recordedAt: new Date(),
          sourceType: 'TRIP',
          reference: trip.id,
          enteredByUserId: userId,
          remarks: `Odometer updated upon trip completion (${trip.routeCodeSnapshot})`,
        },
      });
    }

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'TRANSPORT_TRIP_UPDATED',
      entityType: 'TransportTrip',
      entityId: id,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  public static async updateTripBoarding(ctx: ScopeContext, tripId: string, studentId: string, status: string, notes?: string) {
    const { schoolId } = ctx;

    const trip = await prisma.transportTrip.findFirst({
      where: { id: tripId, schoolId },
    });
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    const existingRecord = await prisma.transportTripStudent.findUnique({
      where: { tripId_studentId: { tripId, studentId } },
    });

    // Legal state transitions:
    // EXPECTED -> BOARDED -> DROPPED
    // EXPECTED -> NOT_BOARDED / ABSENT_FROM_TRIP
    // Cannot do DROPPED -> BOARDED
    if (existingRecord && existingRecord.status === 'DROPPED' && status === 'BOARDED') {
      throw new BadRequestError('Student has already been dropped; cannot re-board without trip reset', {
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    const record = await prisma.transportTripStudent.upsert({
      where: { tripId_studentId: { tripId, studentId } },
      update: {
        status,
        recordedAt: new Date(),
        notes: notes || undefined,
      },
      create: {
        tripId,
        studentId,
        status,
        recordedAt: new Date(),
        notes: notes || null,
      },
    });

    // Invariant: This does NOT modify Module 05 StudentAttendance
    return record;
  }

  // =========================================================================
  // 8. ODOMETER & FUEL LOGS
  // =========================================================================

  public static async logOdometer(ctx: ScopeContext, vehicleId: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      // Row-level lock on vehicle
      const locked = await tx.$queryRaw<Array<{ id: string; current_odometer: number }>>`
        SELECT id, current_odometer
        FROM vehicles
        WHERE id = ${vehicleId}::uuid AND school_id = ${schoolId}::uuid
        FOR UPDATE
      `;

      if (!locked || locked.length === 0) {
        throw new NotFoundError('Vehicle not found');
      }

      const current = locked[0].current_odometer;

      if (data.reading < current && !data.allowCorrection) {
        throw new BadRequestError(
          `New odometer reading (${data.reading}) cannot be less than current reading (${current}). Use correction workflow if authorized.`,
          { code: 'ODOMETER_READING_INVALID' }
        );
      }

      const log = await tx.vehicleOdometerLog.create({
        data: {
          tenantId,
          schoolId,
          vehicleId,
          reading: data.reading,
          recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
          sourceType: data.allowCorrection ? 'CORRECTION' : (data.sourceType || 'MANUAL'),
          reference: data.reference || null,
          enteredByUserId: userId,
          remarks: data.allowCorrection ? `Correction: ${data.correctionReason || 'Audited adjustment'}` : data.remarks || null,
        },
      });

      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { currentOdometer: data.reading },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: data.allowCorrection ? 'ODOMETER_CORRECTION' : 'ODOMETER_LOGGED',
        entityType: 'VehicleOdometerLog',
        entityId: log.id,
        afterData: log,
        ipAddress,
      });

      return log;
    });
  }

  public static async logFuel(ctx: ScopeContext, vehicleId: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, schoolId, archivedAt: null },
    });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    const log = await prisma.vehicleFuelLog.create({
      data: {
        tenantId,
        schoolId,
        vehicleId,
        fuelDate: new Date(data.fuelDate),
        quantity: new Prisma.Decimal(data.quantity),
        unit: data.unit || 'LITER',
        amount: data.amount !== undefined && data.amount !== null ? new Prisma.Decimal(data.amount) : null,
        odometer: data.odometer || null,
        vendor: data.vendor || null,
        receiptFileKey: data.receiptFileKey || null,
        remarks: data.remarks || null,
        enteredByUserId: userId,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'VEHICLE_FUEL_LOGGED',
      entityType: 'VehicleFuelLog',
      entityId: log.id,
      afterData: log,
      ipAddress,
    });

    return log;
  }

  public static async logMaintenance(ctx: ScopeContext, vehicleId: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, schoolId, archivedAt: null },
    });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (data.linkedExpenseBillId) {
      const bill = await prisma.expenseBill.findFirst({
        where: { id: data.linkedExpenseBillId, schoolId },
      });
      if (!bill) {
        throw new BadRequestError('Linked expense bill does not exist in this school');
      }
    }

    const log = await prisma.vehicleMaintenanceLog.create({
      data: {
        tenantId,
        schoolId,
        vehicleId,
        serviceDate: new Date(data.serviceDate),
        odometer: data.odometer || null,
        maintenanceType: data.maintenanceType,
        description: data.description,
        vendor: data.vendor || null,
        cost: data.cost !== undefined && data.cost !== null ? new Prisma.Decimal(data.cost) : null,
        nextServiceDate: data.nextServiceDate ? new Date(data.nextServiceDate) : null,
        nextServiceOdometer: data.nextServiceOdometer || null,
        linkedExpenseBillId: data.linkedExpenseBillId || null,
        status: data.status || 'COMPLETED',
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'VEHICLE_MAINTENANCE_LOGGED',
      entityType: 'VehicleMaintenanceLog',
      entityId: log.id,
      afterData: log,
      ipAddress,
    });

    return log;
  }

  // =========================================================================
  // 9. TRANSPORT FEE INTEGRATION (MODULE 07 REUSE WITH IDEMPOTENCY)
  // =========================================================================

  public static async billTransportFee(ctx: ScopeContext, data: { assignmentId: string; periodName: string; dueDate?: string }) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const assignment = await prisma.studentTransportAssignment.findFirst({
      where: { id: data.assignmentId, schoolId, status: 'ACTIVE' },
      include: {
        student: true,
        route: true,
        transportFeeHead: true,
      },
    });

    if (!assignment) {
      throw new NotFoundError('Active transport assignment not found');
    }

    if (!assignment.transportFeeHeadId || !assignment.feeAmount || Number(assignment.feeAmount) <= 0) {
      throw new BadRequestError('Assignment does not have a configured transport fee head or amount');
    }

    const generationSourceKey = `TRANSPORT_ASSIGNMENT:${assignment.id}:${data.periodName.trim()}`;

    // Check idempotency: if invoice with same generationSourceKey already exists, return it
    const existingInvoice = await prisma.feeInvoice.findFirst({
      where: { schoolId, generationSourceKey },
      include: { lines: true },
    });

    if (existingInvoice) {
      return { invoice: existingInvoice, isDuplicate: true };
    }

    // Get active financial year
    const finYear = await prisma.financialYear.findFirst({
      where: { schoolId, isClosed: false },
      orderBy: { startDate: 'desc' },
    });
    if (!finYear) {
      throw new BadRequestError('No active financial year found for this school');
    }

    const invoiceNumber = await FinanceService.getNextNumber(tenantId, schoolId, 'FEE_INVOICE', 'INV-{YYYY}-', 5);
    const invoiceDate = new Date();
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const feeAmount = assignment.feeAmount;

    const invoice = await prisma.feeInvoice.create({
      data: {
        tenantId,
        schoolId,
        studentId: assignment.studentId,
        academicYearId: assignment.academicYearId,
        financialYearId: finYear.id,
        invoiceNumber,
        invoiceDate,
        dueDate,
        subtotal: feeAmount,
        totalAmount: feeAmount,
        outstandingAmount: feeAmount,
        status: 'POSTED',
        generationSourceKey,
        lines: {
          create: [
            {
              feeHeadId: assignment.transportFeeHeadId,
              description: `Transport Fee - ${assignment.route.routeName} (${data.periodName})`,
              quantity: 1,
              rate: feeAmount,
              amount: feeAmount,
              netAmount: feeAmount,
            },
          ],
        },
      },
      include: { lines: true },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'TRANSPORT_FEE_INVOICED',
      entityType: 'FeeInvoice',
      entityId: invoice.id,
      afterData: { invoiceNumber, generationSourceKey, totalAmount: feeAmount },
      ipAddress,
    });

    return { invoice, isDuplicate: false };
  }
}
