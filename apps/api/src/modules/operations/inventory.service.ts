import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ScopeContext, getMovementMultiplier } from './operations.types.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { FinanceService } from '../finance/finance.service.js';

export class InventoryService {
  // =========================================================================
  // 1. CATEGORIES & LOCATIONS
  // =========================================================================

  public static async listCategories(ctx: ScopeContext) {
    return prisma.inventoryCategory.findMany({
      where: { schoolId: ctx.schoolId },
      include: { _count: { select: { items: true } } },
      orderBy: { name: 'asc' },
    });
  }

  public static async createCategory(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;
    const existing = await prisma.inventoryCategory.findFirst({
      where: { schoolId, code: data.code.trim() },
    });
    if (existing) {
      throw new ConflictError('A category with this code already exists in this school');
    }

    const category = await prisma.inventoryCategory.create({
      data: {
        tenantId,
        schoolId,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description || null,
        isActive: data.isActive ?? true,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'INVENTORY_CATEGORY_CREATED',
      entityType: 'InventoryCategory',
      entityId: category.id,
      afterData: category,
      ipAddress,
    });

    return category;
  }

  public static async listLocations(ctx: ScopeContext) {
    return prisma.inventoryLocation.findMany({
      where: { schoolId: ctx.schoolId },
      include: {
        _count: { select: { stockBalances: true, assets: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  public static async createLocation(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;
    const existing = await prisma.inventoryLocation.findFirst({
      where: { schoolId, code: data.code.trim() },
    });
    if (existing) {
      throw new ConflictError('A location with this code already exists in this school');
    }

    const location = await prisma.inventoryLocation.create({
      data: {
        tenantId,
        schoolId,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description || null,
        isActive: data.isActive ?? true,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'INVENTORY_LOCATION_CREATED',
      entityType: 'InventoryLocation',
      entityId: location.id,
      afterData: location,
      ipAddress,
    });

    return location;
  }

  // =========================================================================
  // 2. INVENTORY ITEMS MASTER
  // =========================================================================

  public static async listItems(
    ctx: ScopeContext,
    params: { search?: string; categoryId?: string; itemType?: string; status?: string; page?: number; limit?: number }
  ) {
    const { schoolId } = ctx;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = {
      schoolId,
      archivedAt: null,
    };

    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.itemType) where.itemType = params.itemType;
    if (params.status) where.status = params.status;
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { itemCode: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, code: true } },
          stockBalances: {
            include: { location: { select: { id: true, name: true, code: true } } },
          },
          _count: { select: { assets: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    // Calculate aggregated stock per item from balances
    const enriched = items.map((it) => {
      const currentStock = it.stockBalances.reduce((acc, b) => acc.add(b.currentQuantity), new Prisma.Decimal(0));
      return {
        ...it,
        currentStock,
        isLowStock: currentStock.lessThanOrEqualTo(it.minimumStockLevel),
      };
    });

    return { total, page, limit, items: enriched };
  }

  public static async getItemById(ctx: ScopeContext, id: string) {
    const { schoolId } = ctx;
    const item = await prisma.inventoryItem.findFirst({
      where: { id, schoolId, archivedAt: null },
      include: {
        category: true,
        stockBalances: {
          include: { location: true },
        },
        assets: {
          include: { location: true, assignments: { where: { isActive: true }, include: { employee: true } } },
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Inventory item not found');
    }

    const currentStock = item.stockBalances.reduce((acc, b) => acc.add(b.currentQuantity), new Prisma.Decimal(0));
    return {
      ...item,
      currentStock,
      isLowStock: currentStock.lessThanOrEqualTo(item.minimumStockLevel),
    };
  }

  public static async createItem(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    let itemCode = data.itemCode?.trim();
    if (!itemCode) {
      itemCode = await FinanceService.getNextNumber(tenantId, schoolId, 'INVENTORY_ITEM', 'ITEM-{YYYY}-', 5);
    }

    const existing = await prisma.inventoryItem.findFirst({
      where: { schoolId, itemCode, archivedAt: null },
    });
    if (existing) {
      throw new ConflictError('An item with this code already exists in this school', { code: 'ITEM_ALREADY_EXISTS' });
    }

    const category = await prisma.inventoryCategory.findFirst({
      where: { id: data.categoryId, schoolId },
    });
    if (!category) {
      throw new BadRequestError('Invalid inventory category');
    }

    const item = await prisma.inventoryItem.create({
      data: {
        tenantId,
        schoolId,
        categoryId: data.categoryId,
        itemCode,
        name: data.name.trim(),
        description: data.description || null,
        unitOfMeasure: data.unitOfMeasure || 'PCS',
        itemType: data.itemType || 'CONSUMABLE',
        minimumStockLevel: data.minimumStockLevel !== undefined ? new Prisma.Decimal(data.minimumStockLevel) : new Prisma.Decimal(0),
        reorderLevel: data.reorderLevel !== undefined && data.reorderLevel !== null ? new Prisma.Decimal(data.reorderLevel) : null,
        defaultUnitCost: data.defaultUnitCost !== undefined && data.defaultUnitCost !== null ? new Prisma.Decimal(data.defaultUnitCost) : null,
        status: data.status || 'ACTIVE',
      },
      include: { category: true },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId: userId,
      action: 'INVENTORY_ITEM_CREATED',
      entityType: 'InventoryItem',
      entityId: item.id,
      afterData: item,
      ipAddress,
    });

    return item;
  }

  // =========================================================================
  // 3. CORE STOCK MOVEMENT ENGINE & INVARIANTS
  // =========================================================================

  /**
   * Internal transactional worker:
   * Mutates cached balance row (with SELECT ... FOR UPDATE) and appends immutable StockMovement in SAME transaction.
   * Enforces positive stock unless explicitly allowed.
   */
  public static async executeMovement(
    tx: Prisma.TransactionClient,
    ctx: ScopeContext,
    params: {
      itemId: string;
      locationId: string;
      movementType: string;
      quantity: Prisma.Decimal;
      unitCost?: Prisma.Decimal | null;
      referenceType?: string | null;
      referenceId?: string | null;
      batchNumber?: string | null;
      recipientEmployeeId?: string | null;
      recipientDepartmentId?: string | null;
      remarks?: string | null;
      allowNegativeStock?: boolean;
    }
  ) {
    const { tenantId, schoolId, userId } = ctx;
    const multiplier = getMovementMultiplier(params.movementType);
    const delta = params.quantity.mul(multiplier);

    // 1. Lock or initialize InventoryStockBalance row FOR UPDATE
    let balanceRecord = await tx.inventoryStockBalance.findUnique({
      where: { itemId_locationId: { itemId: params.itemId, locationId: params.locationId } },
    });

    if (!balanceRecord) {
      balanceRecord = await tx.inventoryStockBalance.create({
        data: {
          tenantId,
          schoolId,
          itemId: params.itemId,
          locationId: params.locationId,
          currentQuantity: new Prisma.Decimal(0),
          lastMovementAt: new Date(),
        },
      });
    }

    // Explicit row-level lock
    const lockedBalances = await tx.$queryRaw<Array<{ id: string; current_quantity: string }>>`
      SELECT id, current_quantity
      FROM inventory_stock_balances
      WHERE id = ${balanceRecord.id}::uuid
      FOR UPDATE
    `;

    const currentBalance = new Prisma.Decimal(lockedBalances[0].current_quantity);
    const newBalance = currentBalance.add(delta);

    if (newBalance.lessThan(0) && !params.allowNegativeStock) {
      throw new ConflictError(
        `Insufficient stock for item at this location. Available: ${currentBalance.toFixed(3)}, requested reduction: ${params.quantity.toFixed(3)}`,
        { code: 'STOCK_INSUFFICIENT' }
      );
    }

    // 2. Update cached balance
    await tx.inventoryStockBalance.update({
      where: { id: balanceRecord.id },
      data: {
        currentQuantity: newBalance,
        lastMovementAt: new Date(),
      },
    });

    // 3. Create immutable StockMovement entry
    const totalCost = params.unitCost ? params.quantity.mul(params.unitCost) : null;

    const movement = await tx.stockMovement.create({
      data: {
        tenantId,
        schoolId,
        itemId: params.itemId,
        locationId: params.locationId,
        movementType: params.movementType,
        quantity: params.quantity,
        unitCost: params.unitCost || null,
        totalCost,
        balanceAfter: newBalance,
        movementDate: new Date(),
        referenceType: params.referenceType || null,
        referenceId: params.referenceId || null,
        batchNumber: params.batchNumber || null,
        recipientEmployeeId: params.recipientEmployeeId || null,
        recipientDepartmentId: params.recipientDepartmentId || null,
        remarks: params.remarks || null,
        actorId: userId,
      },
      include: { item: true, location: true },
    });

    return movement;
  }

  // =========================================================================
  // 4. STOCK MOVEMENTS (OPENING, INWARD, ISSUE, RETURN, TRANSFER, ADJUSTMENT)
  // =========================================================================

  public static async recordOpeningStock(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      // Opening stock idempotency: Cannot record OPENING twice for same item + location
      const existingOpening = await tx.stockMovement.findFirst({
        where: {
          schoolId,
          itemId: data.itemId,
          locationId: data.locationId,
          movementType: 'OPENING',
        },
      });

      if (existingOpening) {
        throw new ConflictError('Opening stock has already been recorded for this item at this location', {
          code: 'OPENING_STOCK_ALREADY_EXISTS',
        });
      }

      const qty = new Prisma.Decimal(data.quantity);
      const unitCost = data.unitCost !== undefined && data.unitCost !== null ? new Prisma.Decimal(data.unitCost) : null;

      const movement = await InventoryService.executeMovement(tx, ctx, {
        itemId: data.itemId,
        locationId: data.locationId,
        movementType: 'OPENING',
        quantity: qty,
        unitCost,
        batchNumber: data.batchNumber || null,
        remarks: data.remarks || 'Opening stock entry',
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'STOCK_OPENING',
        entityType: 'StockMovement',
        entityId: movement.id,
        afterData: movement,
        ipAddress,
      });

      return movement;
    });
  }

  public static async recordInward(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      const qty = new Prisma.Decimal(data.quantity);
      const unitCost = data.unitCost !== undefined && data.unitCost !== null ? new Prisma.Decimal(data.unitCost) : null;

      const movement = await InventoryService.executeMovement(tx, ctx, {
        itemId: data.itemId,
        locationId: data.locationId,
        movementType: data.referenceType || 'INWARD',
        quantity: qty,
        unitCost,
        referenceType: data.referenceType || 'INWARD',
        referenceId: data.referenceId || null,
        batchNumber: data.batchNumber || null,
        remarks: data.remarks || null,
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'STOCK_INWARD',
        entityType: 'StockMovement',
        entityId: movement.id,
        afterData: movement,
        ipAddress,
      });

      return movement;
    });
  }

  public static async recordIssue(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      // Validate recipient employee / department if provided
      if (data.recipientEmployeeId) {
        const emp = await tx.employee.findFirst({
          where: { id: data.recipientEmployeeId, schoolId },
        });
        if (!emp) throw new BadRequestError('Recipient employee not found in this school');
      }
      if (data.recipientDepartmentId) {
        const dept = await tx.department.findFirst({
          where: { id: data.recipientDepartmentId, schoolId },
        });
        if (!dept) throw new BadRequestError('Recipient department not found in this school');
      }

      const qty = new Prisma.Decimal(data.quantity);

      const movement = await InventoryService.executeMovement(tx, ctx, {
        itemId: data.itemId,
        locationId: data.locationId,
        movementType: 'ISSUE',
        quantity: qty,
        referenceType: data.recipientEmployeeId ? 'EMPLOYEE_ISSUE' : (data.recipientDepartmentId ? 'DEPT_ISSUE' : 'GENERAL_ISSUE'),
        referenceId: data.referenceId || null,
        recipientEmployeeId: data.recipientEmployeeId || null,
        recipientDepartmentId: data.recipientDepartmentId || null,
        remarks: data.remarks || null,
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'STOCK_ISSUED',
        entityType: 'StockMovement',
        entityId: movement.id,
        afterData: movement,
        ipAddress,
      });

      return movement;
    });
  }

  public static async recordReturn(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      const qty = new Prisma.Decimal(data.quantity);

      // Return validation: If linked to original issue movement, verify returns do not exceed original issue quantity
      if (data.originalIssueMovementId) {
        const originalIssue = await tx.stockMovement.findFirst({
          where: { id: data.originalIssueMovementId, schoolId, movementType: 'ISSUE' },
        });
        if (!originalIssue) {
          throw new NotFoundError('Original issue record not found');
        }

        const priorReturns = await tx.stockMovement.findMany({
          where: {
            schoolId,
            referenceType: 'RETURN_FOR_ISSUE',
            referenceId: data.originalIssueMovementId,
          },
        });

        const totalReturned = priorReturns.reduce((acc, r) => acc.add(r.quantity), new Prisma.Decimal(0));
        const maxReturnable = originalIssue.quantity.sub(totalReturned);

        if (qty.greaterThan(maxReturnable)) {
          throw new BadRequestError(
            `Return quantity (${qty.toFixed(3)}) exceeds remaining returnable quantity (${maxReturnable.toFixed(3)}) for this issue`,
            { code: 'STOCK_RETURN_EXCEEDED' }
          );
        }
      }

      const movement = await InventoryService.executeMovement(tx, ctx, {
        itemId: data.itemId,
        locationId: data.locationId,
        movementType: 'RETURN',
        quantity: qty,
        referenceType: data.originalIssueMovementId ? 'RETURN_FOR_ISSUE' : 'RETURN',
        referenceId: data.originalIssueMovementId || null,
        recipientEmployeeId: data.recipientEmployeeId || null,
        recipientDepartmentId: data.recipientDepartmentId || null,
        remarks: data.remarks || null,
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'STOCK_RETURNED',
        entityType: 'StockMovement',
        entityId: movement.id,
        afterData: movement,
        ipAddress,
      });

      return movement;
    });
  }

  public static async recordTransfer(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    if (data.fromLocationId === data.toLocationId) {
      throw new BadRequestError('Source and destination locations must be different', {
        code: 'STOCK_TRANSFER_INVALID',
      });
    }

    return await prisma.$transaction(async (tx) => {
      const [fromLoc, toLoc] = await Promise.all([
        tx.inventoryLocation.findFirst({ where: { id: data.fromLocationId, schoolId } }),
        tx.inventoryLocation.findFirst({ where: { id: data.toLocationId, schoolId } }),
      ]);
      if (!fromLoc || !toLoc) {
        throw new NotFoundError('Source or destination location not found');
      }

      const qty = new Prisma.Decimal(data.quantity);
      const transferReferenceId = `XFER-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // 1. Atomic TRANSFER_OUT from source location
      const outMovement = await InventoryService.executeMovement(tx, ctx, {
        itemId: data.itemId,
        locationId: data.fromLocationId,
        movementType: 'TRANSFER_OUT',
        quantity: qty,
        referenceType: 'TRANSFER',
        referenceId: transferReferenceId,
        remarks: `Transfer to ${toLoc.name}. ${data.remarks || ''}`.trim(),
      });

      // 2. Atomic TRANSFER_IN to destination location sharing same transfer reference
      const inMovement = await InventoryService.executeMovement(tx, ctx, {
        itemId: data.itemId,
        locationId: data.toLocationId,
        movementType: 'TRANSFER_IN',
        quantity: qty,
        referenceType: 'TRANSFER',
        referenceId: transferReferenceId,
        remarks: `Transfer from ${fromLoc.name}. ${data.remarks || ''}`.trim(),
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'STOCK_TRANSFERRED',
        entityType: 'StockMovement',
        entityId: outMovement.id,
        afterData: { transferReferenceId, fromLocationId: data.fromLocationId, toLocationId: data.toLocationId, quantity: qty },
        ipAddress,
      });

      return { transferReferenceId, outMovement, inMovement };
    });
  }

  public static async recordAdjustment(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      const qty = new Prisma.Decimal(data.quantity);

      const movement = await InventoryService.executeMovement(tx, ctx, {
        itemId: data.itemId,
        locationId: data.locationId,
        movementType: data.adjustmentType, // ADJUSTMENT_IN or ADJUSTMENT_OUT
        quantity: qty,
        referenceType: 'MANUAL_ADJUSTMENT',
        referenceId: `ADJ-${Date.now()}`,
        remarks: `Reason: ${data.reason.trim()}. ${data.remarks || ''}`.trim(),
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'STOCK_ADJUSTED',
        entityType: 'StockMovement',
        entityId: movement.id,
        afterData: { ...movement, reason: data.reason },
        ipAddress,
      });

      return movement;
    });
  }

  // =========================================================================
  // 5. STOCK LEDGER & AUDIT INVARIANT RECONCILIATION
  // =========================================================================

  public static async listStockLedger(
    ctx: ScopeContext,
    params: { itemId?: string; locationId?: string; movementType?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }
  ) {
    const { schoolId } = ctx;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = { schoolId };
    if (params.itemId) where.itemId = params.itemId;
    if (params.locationId) where.locationId = params.locationId;
    if (params.movementType) where.movementType = params.movementType;
    if (params.fromDate || params.toDate) {
      where.movementDate = {};
      if (params.fromDate) where.movementDate.gte = new Date(params.fromDate);
      if (params.toDate) where.movementDate.lte = new Date(params.toDate);
    }

    const [total, items] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        include: {
          item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
          location: { select: { id: true, name: true, code: true } },
          recipientEmployee: { select: { id: true, displayName: true, employeeNumber: true } },
          recipientDepartment: { select: { id: true, name: true, code: true } },
          actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { movementDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  }

  /**
   * Reconcile invariant:
   * InventoryStockBalance.currentQuantity == SUM(signed StockMovement.quantity)
   */
  public static async reconcileStockBalance(ctx: ScopeContext, itemId: string, locationId: string) {
    const { schoolId } = ctx;

    const [balanceRecord, movements] = await Promise.all([
      prisma.inventoryStockBalance.findUnique({
        where: { itemId_locationId: { itemId, locationId } },
      }),
      prisma.stockMovement.findMany({
        where: { schoolId, itemId, locationId },
        select: { movementType: true, quantity: true },
      }),
    ]);

    let sum = new Prisma.Decimal(0);
    for (const m of movements) {
      const mult = getMovementMultiplier(m.movementType);
      sum = sum.add(m.quantity.mul(mult));
    }

    const cached = balanceRecord ? balanceRecord.currentQuantity : new Prisma.Decimal(0);
    const reconciles = cached.equals(sum);

    return {
      itemId,
      locationId,
      cachedQuantity: cached,
      summedMovementsQuantity: sum,
      reconciles,
      movementsCount: movements.length,
    };
  }

  // =========================================================================
  // 6. ASSET REGISTER & LIFECYCLE MANAGEMENT
  // =========================================================================

  public static async listAssets(
    ctx: ScopeContext,
    params: { search?: string; status?: string; locationId?: string; itemId?: string; page?: number; limit?: number }
  ) {
    const { schoolId } = ctx;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = { schoolId, archivedAt: null };
    if (params.status) where.status = params.status;
    if (params.locationId) where.locationId = params.locationId;
    if (params.itemId) where.inventoryItemId = params.itemId;
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { assetTag: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
        { manufacturer: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        include: {
          inventoryItem: { select: { id: true, itemCode: true, name: true } },
          location: { select: { id: true, name: true, code: true } },
          assignments: {
            where: { isActive: true },
            include: {
              employee: { select: { id: true, displayName: true, employeeNumber: true } },
              department: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: { assetTag: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  }

  public static async getAssetById(ctx: ScopeContext, id: string) {
    const { schoolId } = ctx;
    const asset = await prisma.asset.findFirst({
      where: { id, schoolId, archivedAt: null },
      include: {
        inventoryItem: true,
        location: true,
        assignments: {
          include: {
            employee: true,
            department: true,
            assignedByUser: { select: { id: true, firstName: true, lastName: true } },
            returnedToUser: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
        maintenances: {
          include: { linkedExpenseBill: true },
          orderBy: { serviceDate: 'desc' },
        },
        disposals: {
          include: { approvedByUser: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!asset) {
      throw new NotFoundError('Asset not found');
    }
    return asset;
  }

  public static async createAsset(ctx: ScopeContext, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      let assetTag = data.assetTag?.trim();
      if (!assetTag) {
        assetTag = await FinanceService.getNextNumber(tenantId, schoolId, 'ASSET_TAG', 'AST-{YYYY}-', 6, tx);
      }

      const existingTag = await tx.asset.findFirst({
        where: { schoolId, assetTag },
      });
      if (existingTag) {
        throw new ConflictError('An asset with this tag already exists in this school', { code: 'ASSET_TAG_EXISTS' });
      }

      if (data.serialNumber) {
        const existingSerial = await tx.asset.findFirst({
          where: { schoolId, serialNumber: data.serialNumber.trim(), status: { not: 'DISPOSED' } },
        });
        if (existingSerial) {
          throw new ConflictError('An active asset with this serial number already exists in this school', {
            code: 'ASSET_SERIAL_EXISTS',
          });
        }
      }

      const asset = await tx.asset.create({
        data: {
          tenantId,
          schoolId,
          inventoryItemId: data.inventoryItemId,
          locationId: data.locationId,
          assetTag,
          serialNumber: data.serialNumber ? data.serialNumber.trim() : null,
          manufacturer: data.manufacturer || null,
          model: data.model || null,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          purchaseCost: data.purchaseCost !== undefined && data.purchaseCost !== null ? new Prisma.Decimal(data.purchaseCost) : null,
          warrantyExpiryDate: data.warrantyExpiryDate ? new Date(data.warrantyExpiryDate) : null,
          status: 'AVAILABLE',
          condition: data.condition || 'GOOD',
          remarks: data.remarks || null,
        },
        include: { inventoryItem: true, location: true },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'ASSET_CREATED',
        entityType: 'Asset',
        entityId: asset.id,
        afterData: asset,
        ipAddress,
      });

      return asset;
    });
  }

  public static async assignAsset(ctx: ScopeContext, assetId: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      // Row-level lock on Asset
      const lockedAssets = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT id, status
        FROM assets
        WHERE id = ${assetId}::uuid AND school_id = ${schoolId}::uuid
        FOR UPDATE
      `;

      if (!lockedAssets || lockedAssets.length === 0) {
        throw new NotFoundError('Asset not found');
      }

      if (lockedAssets[0].status !== 'AVAILABLE') {
        throw new ConflictError(`Asset is currently not available (status: ${lockedAssets[0].status})`, {
          code: 'ASSET_ALREADY_ASSIGNED',
        });
      }

      // Invariant: Maximum one active assignment
      const activeCount = await tx.assetAssignment.count({
        where: { assetId, isActive: true },
      });
      if (activeCount > 0) {
        throw new ConflictError('Asset already has an active assignment', { code: 'ASSET_ALREADY_ASSIGNED' });
      }

      const assignment = await tx.assetAssignment.create({
        data: {
          tenantId,
          schoolId,
          assetId,
          employeeId: data.employeeId || null,
          departmentId: data.departmentId || null,
          locationId: data.locationId || null,
          assignedAt: new Date(),
          expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
          conditionOnIssue: data.conditionOnIssue || 'GOOD',
          remarks: data.remarks || null,
          isActive: true,
          assignedByUserId: userId,
        },
        include: { employee: true, department: true },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: { status: 'ASSIGNED' },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'ASSET_ASSIGNED',
        entityType: 'AssetAssignment',
        entityId: assignment.id,
        afterData: assignment,
        ipAddress,
      });

      return assignment;
    });
  }

  public static async returnAsset(ctx: ScopeContext, assetId: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      const activeAssignment = await tx.assetAssignment.findFirst({
        where: { assetId, isActive: true },
      });
      if (!activeAssignment) {
        throw new BadRequestError('Asset has no active assignment to return', { code: 'ASSET_NOT_ASSIGNED' });
      }

      await tx.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          isActive: false,
          returnedAt: new Date(),
          conditionOnReturn: data.conditionOnReturn || 'GOOD',
          returnedToUserId: userId,
          remarks: data.remarks || activeAssignment.remarks,
        },
      });

      const nextStatus = data.statusAfterReturn || 'AVAILABLE';
      await tx.asset.update({
        where: { id: assetId },
        data: { status: nextStatus, condition: data.conditionOnReturn || 'GOOD' },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'ASSET_RETURNED',
        entityType: 'AssetAssignment',
        entityId: activeAssignment.id,
        afterData: { assetId, status: nextStatus, returnedAt: new Date() },
        ipAddress,
      });

      return { assetId, status: nextStatus };
    });
  }

  public static async transferAsset(ctx: ScopeContext, assetId: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      const activeAssignment = await tx.assetAssignment.findFirst({
        where: { assetId, isActive: true },
      });

      // Close previous assignment if active
      if (activeAssignment) {
        await tx.assetAssignment.update({
          where: { id: activeAssignment.id },
          data: {
            isActive: false,
            returnedAt: new Date(),
            conditionOnReturn: data.conditionOnTransfer || 'GOOD',
            returnedToUserId: userId,
            remarks: `Transferred to new custodian. ${data.remarks || ''}`.trim(),
          },
        });
      }

      // Open new assignment
      const newAssignment = await tx.assetAssignment.create({
        data: {
          tenantId,
          schoolId,
          assetId,
          employeeId: data.newEmployeeId || null,
          departmentId: data.newDepartmentId || null,
          locationId: data.newLocationId || null,
          assignedAt: new Date(),
          conditionOnIssue: data.conditionOnTransfer || 'GOOD',
          remarks: data.remarks || 'Asset transfer',
          isActive: true,
          assignedByUserId: userId,
        },
        include: { employee: true, department: true },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: { status: 'ASSIGNED' },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'ASSET_TRANSFERRED',
        entityType: 'AssetAssignment',
        entityId: newAssignment.id,
        afterData: newAssignment,
        ipAddress,
      });

      return newAssignment;
    });
  }

  public static async disposeAsset(ctx: ScopeContext, assetId: string, data: any) {
    const { tenantId, schoolId, userId, ipAddress } = ctx;

    return await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findFirst({
        where: { id: assetId, schoolId },
      });
      if (!asset) {
        throw new NotFoundError('Asset not found');
      }

      // Invariant: Asset cannot have active assignment before disposal
      const activeAssignment = await tx.assetAssignment.findFirst({
        where: { assetId, isActive: true },
      });
      if (activeAssignment) {
        throw new BadRequestError('Asset has an active assignment. You must return or close the assignment before disposal.', {
          code: 'ASSET_ASSIGNED_DISPOSAL_BLOCKED',
        });
      }

      if (asset.status === 'DISPOSED') {
        throw new BadRequestError('Asset is already disposed', { code: 'ASSET_ALREADY_DISPOSED' });
      }

      const disposal = await tx.assetDisposal.create({
        data: {
          tenantId,
          schoolId,
          assetId,
          disposalDate: new Date(data.disposalDate),
          method: data.method,
          reason: data.reason.trim(),
          valueReceived: data.valueReceived !== undefined && data.valueReceived !== null ? new Prisma.Decimal(data.valueReceived) : null,
          approvedByUserId: userId,
        },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: { status: 'DISPOSED' },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId: userId,
        action: 'ASSET_DISPOSED',
        entityType: 'AssetDisposal',
        entityId: disposal.id,
        afterData: disposal,
        ipAddress,
      });

      return disposal;
    });
  }
}
