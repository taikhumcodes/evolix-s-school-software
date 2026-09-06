import { z } from 'zod';

export const CreateInventoryCategorySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const UpdateInventoryCategorySchema = CreateInventoryCategorySchema.partial();

export const CreateInventoryLocationSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  description: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const UpdateInventoryLocationSchema = CreateInventoryLocationSchema.partial();

export const CreateInventoryItemSchema = z.object({
  itemCode: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(150),
  categoryId: z.string().uuid(),
  description: z.string().optional().nullable(),
  unitOfMeasure: z.string().max(30).default('PCS'),
  itemType: z.enum(['CONSUMABLE', 'NON_CONSUMABLE', 'ASSET_TRACKED']).default('CONSUMABLE'),
  minimumStockLevel: z.number().min(0).default(0),
  reorderLevel: z.number().min(0).optional().nullable(),
  defaultUnitCost: z.number().min(0).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();

export const StockOpeningSchema = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).optional().nullable(),
  batchNumber: z.string().max(100).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const StockInwardSchema = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).optional().nullable(),
  referenceType: z.enum(['PURCHASE_RECEIPT', 'INWARD', 'DONATION']).default('INWARD'),
  referenceId: z.string().max(100).optional().nullable(),
  batchNumber: z.string().max(100).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const StockIssueSchema = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().positive(),
  recipientEmployeeId: z.string().uuid().optional().nullable(),
  recipientDepartmentId: z.string().uuid().optional().nullable(),
  referenceId: z.string().max(100).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const StockReturnSchema = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().positive(),
  originalIssueMovementId: z.string().uuid().optional().nullable(),
  recipientEmployeeId: z.string().uuid().optional().nullable(),
  recipientDepartmentId: z.string().uuid().optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const StockTransferSchema = z.object({
  itemId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: z.number().positive(),
  remarks: z.string().max(255).optional().nullable(),
});

export const StockAdjustmentSchema = z.object({
  itemId: z.string().uuid(),
  locationId: z.string().uuid(),
  adjustmentType: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']),
  quantity: z.number().positive(),
  reason: z.string().min(3).max(255),
  remarks: z.string().max(255).optional().nullable(),
});

export const CreateAssetSchema = z.object({
  inventoryItemId: z.string().uuid(),
  locationId: z.string().uuid(),
  assetTag: z.string().max(50).optional(),
  serialNumber: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  purchaseCost: z.number().min(0).optional().nullable(),
  warrantyExpiryDate: z.string().optional().nullable(),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'DAMAGED', 'LOST', 'DISPOSED', 'ARCHIVED']).default('AVAILABLE'),
  condition: z.string().max(50).default('GOOD'),
  remarks: z.string().max(255).optional().nullable(),
});

export const UpdateAssetSchema = CreateAssetSchema.partial();

export const AssignAssetSchema = z.object({
  employeeId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  expectedReturnDate: z.string().optional().nullable(),
  conditionOnIssue: z.string().max(50).default('GOOD'),
  remarks: z.string().max(255).optional().nullable(),
});

export const ReturnAssetSchema = z.object({
  conditionOnReturn: z.string().max(50).default('GOOD'),
  statusAfterReturn: z.enum(['AVAILABLE', 'IN_MAINTENANCE', 'DAMAGED']).default('AVAILABLE'),
  remarks: z.string().max(255).optional().nullable(),
});

export const TransferAssetSchema = z.object({
  newEmployeeId: z.string().uuid().optional().nullable(),
  newDepartmentId: z.string().uuid().optional().nullable(),
  newLocationId: z.string().uuid().optional().nullable(),
  conditionOnTransfer: z.string().max(50).default('GOOD'),
  remarks: z.string().max(255).optional().nullable(),
});

export const LogAssetMaintenanceSchema = z.object({
  serviceDate: z.string(),
  maintenanceType: z.string().max(50).default('REPAIR'),
  description: z.string().min(1),
  vendor: z.string().max(150).optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  linkedExpenseBillId: z.string().uuid().optional().nullable(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('COMPLETED'),
});

export const DisposeAssetSchema = z.object({
  disposalDate: z.string(),
  method: z.enum(['SCRAP', 'SALE', 'DONATION', 'WRITE_OFF', 'OTHER']),
  reason: z.string().min(3),
  valueReceived: z.number().min(0).optional().nullable(),
});
