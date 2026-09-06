import { z } from 'zod';

export const CreateVehicleSchema = z.object({
  vehicleNumber: z.string().min(1).max(50).optional(),
  registrationNumber: z.string().min(1).max(50),
  vehicleTypeId: z.string().uuid().optional(),
  make: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  manufacturingYear: z.number().int().min(1950).max(2100).optional().nullable(),
  seatingCapacity: z.number().int().min(1).max(200).default(40),
  fuelType: z.string().optional().nullable(),
  schoolOwned: z.boolean().default(true),
  ownershipType: z.enum(['SCHOOL_OWNED', 'CONTRACTED', 'LEASED', 'OTHER']).default('SCHOOL_OWNED'),
  ownerName: z.string().max(100).optional().nullable(),
  insuranceExpiryDate: z.string().optional().nullable(),
  fitnessExpiryDate: z.string().optional().nullable(),
  permitExpiryDate: z.string().optional().nullable(),
  pollutionExpiryDate: z.string().optional().nullable(),
  currentOdometer: z.number().int().min(0).default(0).optional(),
  currentOdometerReading: z.number().int().min(0).optional(),
  status: z.enum(['ACTIVE', 'IN_MAINTENANCE', 'OUT_OF_SERVICE', 'SOLD', 'ARCHIVED']).default('ACTIVE'),
});

export const UpdateVehicleSchema = CreateVehicleSchema.partial();

export const AssignVehicleStaffSchema = z.object({
  employeeId: z.string().uuid(),
  assignmentRole: z.enum(['DRIVER', 'CONDUCTOR', 'ATTENDANT']),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional().nullable(),
});

export const CreateTransportRouteSchema = z.object({
  routeCode: z.string().min(1).max(50).optional(),
  routeName: z.string().min(1).max(100),
  description: z.string().max(255).optional().nullable(),
  startLocation: z.string().min(1).max(150),
  endLocation: z.string().min(1).max(150),
  estimatedDistance: z.number().min(0).optional().nullable(),
  estimatedDuration: z.number().int().min(0).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

export const UpdateTransportRouteSchema = CreateTransportRouteSchema.partial();

export const CreateRouteStopSchema = z.object({
  stopName: z.string().min(1).max(100),
  sequence: z.number().int().min(1),
  pickupTime: z.string().max(20).optional().nullable(),
  dropTime: z.string().max(20).optional().nullable(),
  landmark: z.string().max(255).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const UpdateRouteStopSchema = CreateRouteStopSchema.partial();

export const AssignRouteVehicleSchema = z.object({
  vehicleId: z.string().uuid(),
  shift: z.enum(['MORNING', 'AFTERNOON', 'BOTH']).default('BOTH'),
  departureTime: z.string().max(20).optional().nullable(),
  arrivalTime: z.string().max(20).optional().nullable(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional().nullable(),
});

export const AssignStudentTransportSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  routeId: z.string().uuid(),
  pickupStopId: z.string().uuid(),
  dropStopId: z.string().uuid(),
  vehicleId: z.string().uuid().optional().nullable(),
  shift: z.enum(['MORNING', 'AFTERNOON', 'BOTH']).default('BOTH'),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional().nullable(),
  transportFeeHeadId: z.string().uuid().optional().nullable(),
  feeAmount: z.number().min(0).optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
});

export const CreateTransportTripSchema = z.object({
  routeId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  driverEmployeeId: z.string().uuid(),
  conductorEmployeeId: z.string().uuid().optional().nullable(),
  tripDate: z.string(),
  tripType: z.enum(['PICKUP', 'DROP', 'OTHER']),
  shift: z.string().max(30).optional().nullable(),
  startOdometer: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
});

export const UpdateTransportTripSchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  endOdometer: z.number().int().min(0).optional().nullable(),
  completedAt: z.string().optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
});

export const UpdateTripBoardingSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(['EXPECTED', 'BOARDED', 'NOT_BOARDED', 'DROPPED', 'ABSENT_FROM_TRIP']),
  notes: z.string().max(255).optional().nullable(),
});

export const LogOdometerSchema = z.object({
  reading: z.number().int().min(0),
  recordedAt: z.string().optional(),
  sourceType: z.enum(['TRIP', 'MAINTENANCE', 'FUEL', 'MANUAL', 'CORRECTION']).default('MANUAL'),
  reference: z.string().max(100).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
  allowCorrection: z.boolean().default(false),
  correctionReason: z.string().optional().nullable(),
});

export const LogFuelSchema = z.object({
  fuelDate: z.string(),
  quantity: z.number().positive(),
  unit: z.string().max(20).default('LITER'),
  amount: z.number().min(0).optional().nullable(),
  odometer: z.number().int().min(0).optional().nullable(),
  vendor: z.string().max(150).optional().nullable(),
  receiptFileKey: z.string().max(255).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const LogMaintenanceSchema = z.object({
  serviceDate: z.string(),
  odometer: z.number().int().min(0).optional().nullable(),
  maintenanceType: z.enum(['ROUTINE', 'REPAIR', 'INSPECTION', 'TYRE', 'BATTERY', 'OTHER']),
  description: z.string().min(1),
  vendor: z.string().max(150).optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  nextServiceDate: z.string().optional().nullable(),
  nextServiceOdometer: z.number().int().min(0).optional().nullable(),
  linkedExpenseBillId: z.string().uuid().optional().nullable(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('COMPLETED'),
});

export const BillTransportFeeSchema = z.object({
  assignmentId: z.string().uuid(),
  periodName: z.string().min(1).max(50), // e.g. "2026-06" or "Term 1"
  dueDate: z.string().optional(),
});
