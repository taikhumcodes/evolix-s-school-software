import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAnyPermission } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { InventoryController } from './inventory.controller.js';
import {
  CreateInventoryCategorySchema,
  CreateInventoryLocationSchema,
  CreateInventoryItemSchema,
  StockOpeningSchema,
  StockInwardSchema,
  StockIssueSchema,
  StockReturnSchema,
  StockTransferSchema,
  StockAdjustmentSchema,
  CreateAssetSchema,
  AssignAssetSchema,
  ReturnAssetSchema,
  TransferAssetSchema,
  DisposeAssetSchema,
} from './inventory.schema.js';

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

export const assetsRouter = Router();
assetsRouter.use(authenticate);

// ==========================================
// 1. Categories
// ==========================================
inventoryRouter.get(
  '/categories',
  requireAnyPermission(['inventory.view', 'inventory.manage']),
  InventoryController.listCategories
);

inventoryRouter.post(
  '/categories',
  requireAnyPermission(['inventory.manage', 'inventory.items.manage']),
  validateRequest({ body: CreateInventoryCategorySchema }),
  InventoryController.createCategory
);

// ==========================================
// 2. Locations
// ==========================================
inventoryRouter.get(
  '/locations',
  requireAnyPermission(['inventory.view', 'inventory.manage', 'inventory.assets.view', 'inventory.assets.manage', 'assets.view', 'assets.manage']),
  InventoryController.listLocations
);

inventoryRouter.post(
  '/locations',
  requireAnyPermission(['inventory.manage']),
  validateRequest({ body: CreateInventoryLocationSchema }),
  InventoryController.createLocation
);

// ==========================================
// 3. Items
// ==========================================
inventoryRouter.get(
  '/items',
  requireAnyPermission(['inventory.view', 'inventory.manage']),
  InventoryController.listItems
);

inventoryRouter.get(
  '/items/:id',
  requireAnyPermission(['inventory.view', 'inventory.manage']),
  InventoryController.getItemById
);

inventoryRouter.post(
  '/items',
  requireAnyPermission(['inventory.manage', 'inventory.items.manage', 'inventory.item.manage']),
  validateRequest({ body: CreateInventoryItemSchema }),
  InventoryController.createItem
);

// ==========================================
// 4. Stock Operations & Movements
// ==========================================
const stockManagePerms = ['inventory.manage', 'inventory.issue', 'inventory.movement', 'inventory.movement.manage', 'inventory.stock.inward', 'inventory.stock.issue'];
const adjustPerms = ['inventory.manage', 'inventory.adjust', 'inventory.adjust.manage', 'inventory.stock.adjust'];

// Opening Balance
inventoryRouter.post(
  ['/stock/opening', '/movements/opening'],
  requireAnyPermission(stockManagePerms),
  validateRequest({ body: StockOpeningSchema }),
  InventoryController.recordOpeningStock
);

// Inward
inventoryRouter.post(
  ['/stock/inward', '/movements/inward'],
  requireAnyPermission(stockManagePerms),
  validateRequest({ body: StockInwardSchema }),
  InventoryController.recordInward
);

// Issue
inventoryRouter.post(
  ['/stock/issue', '/movements/issue'],
  requireAnyPermission(stockManagePerms),
  validateRequest({ body: StockIssueSchema }),
  InventoryController.recordIssue
);

// Return
inventoryRouter.post(
  ['/stock/return', '/movements/return'],
  requireAnyPermission(stockManagePerms),
  validateRequest({ body: StockReturnSchema }),
  InventoryController.recordReturn
);

// Transfer
inventoryRouter.post(
  ['/stock/transfer', '/movements/transfer'],
  requireAnyPermission(stockManagePerms),
  validateRequest({ body: StockTransferSchema }),
  InventoryController.recordTransfer
);

// Adjust
inventoryRouter.post(
  ['/stock/adjust', '/movements/adjust', '/movements/adjustment'],
  requireAnyPermission(adjustPerms),
  validateRequest({ body: StockAdjustmentSchema }),
  InventoryController.recordAdjustment
);

inventoryRouter.get(
  ['/stock/ledger', '/movements/ledger'],
  requireAnyPermission(['inventory.view', 'inventory.manage']),
  InventoryController.listStockLedger
);

inventoryRouter.post(
  '/stock/reconcile/:itemId/:locationId',
  requireAnyPermission(['inventory.manage']),
  InventoryController.reconcileStockBalance
);

// ==========================================
// 5. Assets (Attached to assetsRouter)
// ==========================================
const assetViewPerms = ['inventory.assets.view', 'inventory.assets.manage', 'assets.view', 'assets.manage', 'inventory.view', 'inventory.manage'];
const assetManagePerms = ['inventory.assets.manage', 'assets.manage', 'assets.item.manage', 'assets.assign.manage', 'assets.assign', 'inventory.manage'];
const assetDisposePerms = ['inventory.assets.dispose', 'assets.dispose.manage', 'assets.dispose', 'inventory.assets.manage', 'assets.manage', 'inventory.manage'];

assetsRouter.get('/', requireAnyPermission(assetViewPerms), InventoryController.listAssets);
assetsRouter.get('/:id', requireAnyPermission(assetViewPerms), InventoryController.getAssetById);
assetsRouter.post('/', requireAnyPermission(assetManagePerms), validateRequest({ body: CreateAssetSchema }), InventoryController.createAsset);
assetsRouter.post('/:id/assign', requireAnyPermission(assetManagePerms), validateRequest({ body: AssignAssetSchema }), InventoryController.assignAsset);
assetsRouter.post('/:id/return', requireAnyPermission(assetManagePerms), validateRequest({ body: ReturnAssetSchema }), InventoryController.returnAsset);
assetsRouter.post('/:id/transfer', requireAnyPermission(assetManagePerms), validateRequest({ body: TransferAssetSchema }), InventoryController.transferAsset);
assetsRouter.post('/:id/dispose', requireAnyPermission(assetDisposePerms), validateRequest({ body: DisposeAssetSchema }), InventoryController.disposeAsset);

// Mount assets router on inventory router as well
inventoryRouter.use('/assets', assetsRouter);
