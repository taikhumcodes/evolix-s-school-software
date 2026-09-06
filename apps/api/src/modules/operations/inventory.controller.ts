import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service.js';
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

export class InventoryController {
  // 1. Categories
  public static async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const categories = await InventoryService.listCategories(ctx);
      res.json(categories);
    } catch (err) {
      next(err);
    }
  }

  public static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const category = await InventoryService.createCategory(ctx, req.body);
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  }

  // 2. Locations
  public static async listLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const locations = await InventoryService.listLocations(ctx);
      res.json(locations);
    } catch (err) {
      next(err);
    }
  }

  public static async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const location = await InventoryService.createLocation(ctx, req.body);
      res.status(201).json(location);
    } catch (err) {
      next(err);
    }
  }

  // 3. Items
  public static async listItems(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const query = {
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        itemType: req.query.itemType as string,
        status: req.query.status as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await InventoryService.listItems(ctx, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getItemById(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const item = await InventoryService.getItemById(ctx, req.params.id as string);
      res.json(item);
    } catch (err) {
      next(err);
    }
  }

  public static async createItem(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const item = await InventoryService.createItem(ctx, req.body);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  }

  // 4. Stock Operations
  public static async recordOpeningStock(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const movement = await InventoryService.recordOpeningStock(ctx, req.body);
      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  }

  public static async recordInward(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const movement = await InventoryService.recordInward(ctx, req.body);
      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  }

  public static async recordIssue(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const movement = await InventoryService.recordIssue(ctx, req.body);
      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  }

  public static async recordReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const movement = await InventoryService.recordReturn(ctx, req.body);
      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  }

  public static async recordTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const result = await InventoryService.recordTransfer(ctx, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async recordAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const movement = await InventoryService.recordAdjustment(ctx, req.body);
      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  }

  public static async listStockLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const query = {
        itemId: req.query.itemId as string,
        locationId: req.query.locationId as string,
        movementType: req.query.movementType as string,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await InventoryService.listStockLedger(ctx, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async reconcileStockBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const result = await InventoryService.reconcileStockBalance(ctx, req.params.itemId as string, req.params.locationId as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 5. Assets
  public static async listAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const query = {
        search: req.query.search as string,
        status: req.query.status as string,
        locationId: req.query.locationId as string,
        itemId: req.query.itemId as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await InventoryService.listAssets(ctx, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getAssetById(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const asset = await InventoryService.getAssetById(ctx, req.params.id as string);
      res.json(asset);
    } catch (err) {
      next(err);
    }
  }

  public static async createAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const asset = await InventoryService.createAsset(ctx, req.body);
      res.status(201).json(asset);
    } catch (err) {
      next(err);
    }
  }

  public static async assignAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const assignment = await InventoryService.assignAsset(ctx, req.params.id as string, req.body);
      res.status(201).json(assignment);
    } catch (err) {
      next(err);
    }
  }

  public static async returnAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const result = await InventoryService.returnAsset(ctx, req.params.id as string, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async transferAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const assignment = await InventoryService.transferAsset(ctx, req.params.id as string, req.body);
      res.status(201).json(assignment);
    } catch (err) {
      next(err);
    }
  }

  public static async disposeAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getContext(req);
      const disposal = await InventoryService.disposeAsset(ctx, req.params.id as string, req.body);
      res.status(201).json(disposal);
    } catch (err) {
      next(err);
    }
  }
}
