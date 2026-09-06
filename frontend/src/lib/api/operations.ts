import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ==========================================
// 1. Dashboard Overview
// ==========================================
export interface OperationsOverviewData {
  permissions: {
    hasTransport: boolean;
    hasInventory: boolean;
    hasAssets: boolean;
    hasGate: boolean;
    hasEvents: boolean;
  };
  transport?: {
    totalVehicles: number;
    activeVehicles: number;
    totalRoutes: number;
    activeRoutes: number;
    activeAssignments: number;
  };
  inventory?: {
    totalItems: number;
    lowStockItems: number;
    todayMovements: number;
  };
  assets?: {
    totalAssets: number;
    availableAssets: number;
    assignedAssets: number;
    inMaintenanceAssets: number;
  };
  gate?: {
    todayVisits: number;
    currentlyCheckedIn: number;
    todayPickups: number;
  };
  events?: {
    upcomingEvents: number;
    activeEvents: number;
    totalParticipants: number;
  };
}

export function useOperationsDashboard() {
  return useQuery({
    queryKey: ['operations', 'dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<OperationsOverviewData>('/operations/dashboard/overview');
      return res.data;
    },
  });
}

// ==========================================
// 2. Transport Management
// ==========================================
export interface TransportVehicle {
  id: string;
  registrationNumber: string;
  vehicleNumber?: string | null;
  make?: string | null;
  model?: string | null;
  yearOfManufacture?: number | null;
  seatingCapacity: number;
  fuelType?: string | null;
  currentOdometerReading: number;
  status: string;
  vehicleType?: { id: string; name: string } | null;
  staffAssignments?: Array<{
    id: string;
    assignmentRole: string;
    employee: { id: string; firstName: string; lastName: string; employeeNumber: string };
  }>;
}

export interface TransportRoute {
  id: string;
  routeCode: string;
  routeName: string;
  description?: string | null;
  startLocation: string;
  endLocation: string;
  estimatedDistance?: string | number | null;
  estimatedDuration?: number | null;
  status: string;
  stops?: TransportRouteStop[];
  vehicleAssignments?: Array<{
    id: string;
    shift: string;
    vehicle: { id: string; registrationNumber: string; seatingCapacity: number };
  }>;
  _count?: { studentAssignments: number; stops: number };
}

export interface TransportRouteStop {
  id: string;
  routeId: string;
  stopName: string;
  sequence: number;
  pickupTime?: string | null;
  dropTime?: string | null;
  landmark?: string | null;
  isActive: boolean;
}

export function useVehicles(query?: { search?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['operations', 'transport', 'vehicles', query],
    queryFn: async () => {
      const res = await apiClient.get('/operations/transport/vehicles', { params: query });
      return res.data;
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/transport/vehicles', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'transport', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useAssignVehicleStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicleId, data }: { vehicleId: string; data: any }) => {
      const res = await apiClient.post(`/operations/transport/vehicles/${vehicleId}/staff`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'transport', 'vehicles'] });
    },
  });
}

export function useRoutes(query?: { search?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['operations', 'transport', 'routes', query],
    queryFn: async () => {
      const res = await apiClient.get('/operations/transport/routes', { params: query });
      return res.data;
    },
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/transport/routes', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'transport', 'routes'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useAssignRouteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ routeId, data }: { routeId: string; data: any }) => {
      const res = await apiClient.post(`/operations/transport/routes/${routeId}/vehicles`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'transport', 'routes'] });
    },
  });
}

export function useAssignStudentTransport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/transport/assignments', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'transport'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useTrips(query?: { routeId?: string; vehicleId?: string; tripDate?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['operations', 'transport', 'trips', query],
    queryFn: async () => {
      const res = await apiClient.get('/operations/transport/trips', { params: query });
      return res.data;
    },
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/transport/trips', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'transport', 'trips'] });
    },
  });
}

// ==========================================
// 3. Inventory & Assets Management
// ==========================================
export interface InventoryCategory {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

export interface InventoryLocation {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  categoryId: string;
  unitOfMeasure: string;
  itemType: string;
  minimumStockLevel: number;
  status: string;
  category: { id: string; name: string; code: string };
  stockBalances?: Array<{
    id: string;
    currentQuantity: string | number;
    location: { id: string; name: string };
  }>;
}

export interface AssetRecord {
  id: string;
  assetTag: string;
  serialNumber?: string | null;
  status: string;
  condition: string;
  purchaseDate?: string | null;
  purchaseCost?: string | number | null;
  inventoryItem: { id: string; name: string; itemCode: string };
  location: { id: string; name: string };
  assignments?: Array<{
    id: string;
    employee?: { firstName: string; lastName: string } | null;
    department?: { name: string } | null;
    assignedAt: string;
  }>;
}

export function useInventoryCategories() {
  return useQuery({
    queryKey: ['operations', 'inventory', 'categories'],
    queryFn: async () => {
      const res = await apiClient.get<InventoryCategory[]>('/operations/inventory/categories');
      return res.data;
    },
  });
}

export function useCreateInventoryCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/inventory/categories', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'inventory', 'categories'] });
    },
  });
}

export function useInventoryLocations() {
  return useQuery({
    queryKey: ['operations', 'inventory', 'locations'],
    queryFn: async () => {
      const res = await apiClient.get<InventoryLocation[]>('/operations/inventory/locations');
      return res.data;
    },
  });
}

export function useCreateInventoryLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/inventory/locations', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'inventory', 'locations'] });
    },
  });
}

export function useInventoryItems(query?: { search?: string; categoryId?: string; itemType?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['operations', 'inventory', 'items', query],
    queryFn: async () => {
      const res = await apiClient.get('/operations/inventory/items', { params: query });
      return res.data;
    },
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/inventory/items', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useStockMovementMutation(type: 'opening' | 'inward' | 'issue' | 'return' | 'transfer' | 'adjust') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post(`/operations/inventory/stock/${type}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'inventory'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useStockLedger(query?: { itemId?: string; locationId?: string; movementType?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['operations', 'inventory', 'ledger', query],
    queryFn: async () => {
      const res = await apiClient.get('/operations/inventory/stock/ledger', { params: query });
      return res.data;
    },
  });
}

export function useAssets(query?: { search?: string; status?: string; locationId?: string; itemId?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['operations', 'inventory', 'assets', query],
    queryFn: async () => {
      const res = await apiClient.get('/operations/inventory/assets', { params: query });
      return res.data;
    },
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/inventory/assets', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'inventory', 'assets'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useAssignAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, data }: { assetId: string; data: any }) => {
      const res = await apiClient.post(`/operations/inventory/assets/${assetId}/assign`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'inventory', 'assets'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useReturnAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, data }: { assetId: string; data: any }) => {
      const res = await apiClient.post(`/operations/inventory/assets/${assetId}/return`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'inventory', 'assets'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useDisposeAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, data }: { assetId: string; data: any }) => {
      const res = await apiClient.post(`/operations/inventory/assets/${assetId}/dispose`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'inventory', 'assets'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

// ==========================================
// 4. Gate & Visitor Management
// ==========================================
export interface Visitor {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  organization?: string | null;
  address?: string | null;
  governmentIdType?: string | null;
  governmentIdLast4?: string | null;
  _count?: { visits: number };
}

export interface VisitorVisit {
  id: string;
  visitNumber: string;
  purpose: string;
  checkInAt: string;
  checkOutAt?: string | null;
  status: string;
  numberOfVisitors: number;
  badgeNumber?: string | null;
  visitor: Visitor;
  personToMeet?: { firstName: string; lastName: string } | null;
  department?: { name: string } | null;
}

export function useVisitors(query?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['operations', 'gate', 'visitors', query],
    queryFn: async () => {
      const res = await apiClient.get('/operations/gate/visitors', { params: query });
      return res.data;
    },
  });
}

export function useCreateVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/gate/visitors', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'gate', 'visitors'] });
    },
  });
}

export function useVisits(query?: { status?: string; visitorId?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['operations', 'gate', 'visits', query],
    queryFn: async () => {
      const res = await apiClient.get('/operations/gate/visits', { params: query });
      return res.data;
    },
  });
}

export function useCheckInVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/gate/visits/check-in', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'gate'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useCheckOutVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ visitId, remarks }: { visitId: string; remarks?: string }) => {
      const res = await apiClient.post(`/operations/gate/visits/${visitId}/check-out`, { remarks });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'gate'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useStudentPickupReleases(query?: { studentId?: string; pickupSessionDate?: string; pickupSession?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['operations', 'gate', 'pickups', query],
    queryFn: async () => {
      const res = await apiClient.get('/operations/gate/pickups', { params: query });
      return res.data;
    },
  });
}

export function useReleaseStudentPickup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/gate/pickups', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'gate', 'pickups'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

// ==========================================
// 5. School Activities & Events
// ==========================================
export interface ActivityCategory {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

export interface SchoolEvent {
  id: string;
  eventCode: string;
  title: string;
  description?: string | null;
  startDateTime: string;
  endDateTime: string;
  venue: string;
  capacity?: number | null;
  estimatedBudget?: string | number | null;
  status: string;
  category: { id: string; name: string; code: string };
  academicYear?: { id: string; name: string } | null;
  _count?: {
    participants: number;
    coordinators: number;
    achievements: number;
    expenseLinks: number;
  };
}

export function useActivityCategories() {
  return useQuery({
    queryKey: ['operations', 'events', 'categories'],
    queryFn: async () => {
      const res = await apiClient.get<ActivityCategory[]>('/operations/events/categories');
      return res.data;
    },
  });
}

export function useCreateActivityCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/events/categories', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'events', 'categories'] });
    },
  });
}

export function useSchoolEvents(query?: { categoryId?: string; status?: string; search?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['operations', 'events', query],
    queryFn: async () => {
      const res = await apiClient.get('/operations/events', { params: query });
      return res.data;
    },
  });
}

export function useSchoolEventById(id: string) {
  return useQuery({
    queryKey: ['operations', 'events', id],
    queryFn: async () => {
      const res = await apiClient.get(`/operations/events/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateSchoolEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/operations/events', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useRegisterEventParticipant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: any }) => {
      const res = await apiClient.post(`/operations/events/${eventId}/participants`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'events', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useBulkRegisterSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: any }) => {
      const res = await apiClient.post(`/operations/events/${eventId}/participants/bulk`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'events', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
    },
  });
}

export function useRecordAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: any }) => {
      const res = await apiClient.post(`/operations/events/${eventId}/achievements`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'events', variables.eventId] });
    },
  });
}

// ==========================================
// 6. Reports (Authoritative Aggregations)
// ==========================================
export function useOperationsReports(reportType: 'transport' | 'inventory' | 'assets' | 'visitors' | 'events', params?: any) {
  return useQuery({
    queryKey: ['operations', 'reports', reportType, params],
    queryFn: async () => {
      const res = await apiClient.get(`/operations/reports/${reportType}`, { params });
      return res.data;
    },
  });
}
