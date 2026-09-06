import { prisma } from '../../lib/prisma.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { ScopeContext } from './operations.types.js';

export class OperationsService {
  /**
   * Operations Dashboard Overview with strict permission-aware response filtering (Amendment 53).
   * Users only receive KPI blocks for domains they have permission to view.
   */
  public static async getDashboardOverview(ctx: ScopeContext) {
    const { tenantId, schoolId, permissions = [], isSuperAdmin } = ctx;
    const permsList = permissions || [];

    const hasTransport = isSuperAdmin || permsList.includes('transport.view') || permsList.includes('transport.manage');
    const hasInventory = isSuperAdmin || permsList.includes('inventory.view') || permsList.includes('inventory.manage');
    const hasAssets = isSuperAdmin || permsList.includes('inventory.assets.view') || permsList.includes('inventory.assets.manage');
    const hasGate = isSuperAdmin || permsList.includes('gate.view') || permsList.includes('gate.manage');
    const hasEvents = isSuperAdmin || permsList.includes('events.view') || permsList.includes('events.manage');

    const result: any = {
      permissions: {
        hasTransport,
        hasInventory,
        hasAssets,
        hasGate,
        hasEvents,
      },
    };

    const promises: Promise<void>[] = [];

    // 1. Transport KPIs
    if (hasTransport) {
      promises.push((async () => {
        const [totalVehicles, activeVehicles, totalRoutes, activeRoutes, activeAssignments] = await Promise.all([
          prisma.vehicle.count({ where: { tenantId, schoolId, archivedAt: null } }),
          prisma.vehicle.count({ where: { tenantId, schoolId, status: 'ACTIVE', archivedAt: null } }),
          prisma.transportRoute.count({ where: { tenantId, schoolId, archivedAt: null } }),
          prisma.transportRoute.count({ where: { tenantId, schoolId, status: 'ACTIVE', archivedAt: null } }),
          prisma.studentTransportAssignment.count({ where: { tenantId, schoolId, status: 'ACTIVE' } }),
        ]);

        result.transport = {
          totalVehicles,
          activeVehicles,
          totalRoutes,
          activeRoutes,
          activeAssignments,
        };
      })());
    }

    // 2. Inventory KPIs
    if (hasInventory) {
      promises.push((async () => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [totalItems, lowStockItems, todayMovements] = await Promise.all([
          prisma.inventoryItem.count({ where: { tenantId, schoolId, status: 'ACTIVE' } }),
          prisma.$queryRawUnsafe<any[]>(
            `SELECT COUNT(DISTINCT i.id) as count
             FROM inventory_items i
             JOIN inventory_stock_balances b ON b.item_id = i.id
             WHERE i.tenant_id = $1::uuid AND i.school_id = $2::uuid AND i.status = 'ACTIVE'
             GROUP BY i.id, i.minimum_stock_level
             HAVING SUM(b.current_quantity) <= i.minimum_stock_level`,
            tenantId,
            schoolId
          ).then((rows) => rows.length),
          prisma.stockMovement.count({
            where: {
              tenantId,
              schoolId,
              createdAt: { gte: todayStart },
            },
          }),
        ]);

        result.inventory = {
          totalItems,
          lowStockItems,
          todayMovements,
        };
      })());
    }

    // 3. Assets KPIs
    if (hasAssets) {
      promises.push((async () => {
        const [totalAssets, availableAssets, assignedAssets, inMaintenanceAssets] = await Promise.all([
          prisma.asset.count({ where: { tenantId, schoolId, status: { not: 'ARCHIVED' } } }),
          prisma.asset.count({ where: { tenantId, schoolId, status: 'AVAILABLE' } }),
          prisma.asset.count({ where: { tenantId, schoolId, status: 'ASSIGNED' } }),
          prisma.asset.count({ where: { tenantId, schoolId, status: 'IN_MAINTENANCE' } }),
        ]);

        result.assets = {
          totalAssets,
          availableAssets,
          assignedAssets,
          inMaintenanceAssets,
        };
      })());
    }

    // 4. Gate KPIs
    if (hasGate) {
      promises.push((async () => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [todayVisits, currentlyCheckedIn, todayPickups] = await Promise.all([
          prisma.visitorVisit.count({
            where: { tenantId, schoolId, checkInAt: { gte: todayStart } },
          }),
          prisma.visitorVisit.count({
            where: { tenantId, schoolId, status: 'CHECKED_IN' },
          }),
          prisma.studentPickupRelease.count({
            where: { tenantId, schoolId, pickupSessionDate: { gte: todayStart } },
          }),
        ]);

        result.gate = {
          todayVisits,
          currentlyCheckedIn,
          todayPickups,
        };
      })());
    }

    // 5. Events KPIs
    if (hasEvents) {
      promises.push((async () => {
        const now = new Date();
        const [upcomingEvents, activeEvents, totalParticipants] = await Promise.all([
          prisma.schoolEvent.count({
            where: { tenantId, schoolId, startDateTime: { gte: now }, status: { in: ['PUBLISHED', 'DRAFT'] } },
          }),
          prisma.schoolEvent.count({
            where: { tenantId, schoolId, status: 'IN_PROGRESS' },
          }),
          prisma.eventParticipant.count({
            where: { tenantId, schoolId, status: { notIn: ['WITHDRAWN', 'DISQUALIFIED'] } },
          }),
        ]);

        result.events = {
          upcomingEvents,
          activeEvents,
          totalParticipants,
        };
      })());
    }

    await Promise.all(promises);
    return result;
  }

  // ==========================================
  // Reports (Server-Authoritative Aggregations)
  // ==========================================
  public static async getTransportReport(ctx: ScopeContext) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const routes = await prisma.transportRoute.findMany({
      where: { tenantId, schoolId, archivedAt: null },
      include: {
        stops: { where: { isActive: true }, orderBy: { sequence: 'asc' } },
        vehicleAssignments: {
          where: { isActive: true },
          include: {
            vehicle: {
              include: {
                staffAssignments: {
                  where: { isActive: true },
                  include: { employee: { select: { firstName: true, lastName: true } } },
                },
              },
            },
          },
        },
        studentAssignments: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    const rows = routes.map((r) => {
      const activeVehicle = r.vehicleAssignments[0]?.vehicle;
      const seatingCapacity = activeVehicle?.seatingCapacity || 0;
      const assignedCount = r.studentAssignments.length;
      const utilization = seatingCapacity > 0 ? Math.round((assignedCount / seatingCapacity) * 100) : 0;
      const driver = activeVehicle?.staffAssignments?.find((s) => s.assignmentRole === 'DRIVER')?.employee;
      const driverName = driver ? `${driver.firstName} ${driver.lastName}`.trim() : 'Unassigned';

      return {
        routeCode: r.routeCode,
        routeName: r.routeName,
        shift: r.vehicleAssignments[0]?.shift || 'MORNING',
        registrationNumber: activeVehicle?.registrationNumber || 'N/A',
        vehicleRegistration: activeVehicle?.registrationNumber || 'N/A',
        driver: driverName,
        seatingCapacity,
        assignedStudents: assignedCount,
        capacityUtilizationPct: utilization,
        stopsCount: r.stops.length,
        status: r.status,
      };
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'EXPORT',
      entityType: 'ReportTransport',
      entityId: 'ALL',
      ipAddress,
    });

    return rows;
  }

  public static async getInventoryStockReport(ctx: ScopeContext) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const items = await prisma.inventoryItem.findMany({
      where: { tenantId, schoolId, status: { not: 'ARCHIVED' } },
      include: {
        category: true,
        stockBalances: {
          include: { location: true },
        },
      },
    });

    const rows: any[] = [];
    for (const item of items) {
      if (item.stockBalances.length === 0) {
        rows.push({
          itemCode: item.itemCode,
          itemName: item.name,
          category: item.category.name,
          location: 'N/A',
          quantity: '0.000',
          unitOfMeasure: item.unitOfMeasure,
          minimumStockLevel: item.minimumStockLevel.toString(),
          status: item.status,
        });
      } else {
        for (const bal of item.stockBalances) {
          rows.push({
            itemCode: item.itemCode,
            itemName: item.name,
            category: item.category.name,
            location: bal.location.name,
            quantity: bal.currentQuantity.toString(),
            unitOfMeasure: item.unitOfMeasure,
            minimumStockLevel: item.minimumStockLevel.toString(),
            status: item.status,
          });
        }
      }
    }

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'EXPORT',
      entityType: 'ReportInventoryStock',
      entityId: 'ALL',
      ipAddress,
    });

    return rows;
  }

  public static async getAssetRegisterReport(ctx: ScopeContext) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const assets = await prisma.asset.findMany({
      where: { tenantId, schoolId, status: { not: 'ARCHIVED' } },
      include: {
        inventoryItem: true,
        location: true,
        assignments: {
          where: { returnedAt: null },
          include: {
            employee: { select: { firstName: true, lastName: true } },
            department: { select: { name: true } },
            location: { select: { name: true } },
          },
        },
      },
    });

    const rows = assets.map((a) => {
      const activeAssign = a.assignments[0];
      let assignedTo = 'Unassigned';
      if (activeAssign?.employee) {
        assignedTo = `Employee: ${activeAssign.employee.firstName} ${activeAssign.employee.lastName}`;
      } else if (activeAssign?.department) {
        assignedTo = `Department: ${activeAssign.department.name}`;
      } else if (activeAssign?.location) {
        assignedTo = `Location: ${activeAssign.location.name}`;
      }

      return {
        assetTag: a.assetTag,
        itemName: a.inventoryItem.name,
        location: a.location.name,
        assignedTo,
        condition: a.condition,
        purchaseDate: a.purchaseDate ? a.purchaseDate.toISOString().split('T')[0] : 'N/A',
        purchaseCost: a.purchaseCost ? a.purchaseCost.toString() : '0.00',
        status: a.status,
      };
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'EXPORT',
      entityType: 'ReportAssetRegister',
      entityId: 'ALL',
      ipAddress,
    });

    return rows;
  }

  public static async getVisitorLogReport(ctx: ScopeContext, fromDate?: string, toDate?: string) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const where: any = { tenantId, schoolId };
    if (fromDate || toDate) {
      where.checkInAt = {};
      if (fromDate) where.checkInAt.gte = new Date(fromDate);
      if (toDate) where.checkInAt.lte = new Date(toDate);
    }

    const visits = await prisma.visitorVisit.findMany({
      where,
      orderBy: { checkInAt: 'desc' },
      include: {
        visitor: true,
        personToMeet: { select: { firstName: true, lastName: true } },
        department: { select: { name: true } },
      },
    });

    const rows = visits.map((v) => ({
      visitNumber: v.visitNumber,
      visitorName: v.visitor.name,
      visitorPhone: v.visitor.phone,
      organization: v.visitor.organization || 'N/A',
      purpose: v.purpose,
      personToMeet: v.personToMeet ? `${v.personToMeet.firstName} ${v.personToMeet.lastName}` : 'N/A',
      department: v.department?.name || 'N/A',
      checkInTime: v.checkInAt.toISOString(),
      checkOutTime: v.checkOutAt ? v.checkOutAt.toISOString() : 'STILL_IN',
      badgeNumber: v.badgeNumber || 'N/A',
      status: v.status,
    }));

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'EXPORT',
      entityType: 'ReportVisitorLog',
      entityId: 'ALL',
      ipAddress,
    });

    return rows;
  }

  public static async getEventReport(ctx: ScopeContext) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    const events = await prisma.schoolEvent.findMany({
      where: { tenantId, schoolId },
      orderBy: { startDateTime: 'desc' },
      include: {
        category: true,
        _count: { select: { participants: true, achievements: true, expenseLinks: true } },
      },
    });

    const rows = events.map((e) => ({
      eventCode: e.eventCode,
      title: e.title,
      category: e.category.name,
      startDateTime: e.startDateTime.toISOString(),
      endDateTime: e.endDateTime.toISOString(),
      venue: e.venue,
      capacity: e.capacity ?? 'UNLIMITED',
      participantsCount: e._count.participants,
      achievementsCount: e._count.achievements,
      estimatedBudget: e.estimatedBudget ? e.estimatedBudget.toString() : '0.00',
      status: e.status,
    }));

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'EXPORT',
      entityType: 'ReportEvents',
      entityId: 'ALL',
      ipAddress,
    });

    return rows;
  }
}
