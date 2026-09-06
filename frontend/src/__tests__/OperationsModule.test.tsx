import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OperationsNav } from '../app/views/operations/OperationsNav';
import { OperationsOverview } from '../app/views/operations/OperationsOverview';
import { TransportView } from '../app/views/operations/TransportView';
import { InventoryView } from '../app/views/operations/InventoryView';
import { AssetsView } from '../app/views/operations/AssetsView';
import { GateView } from '../app/views/operations/GateView';
import { EventsView } from '../app/views/operations/EventsView';
import { OperationsReportsView } from '../app/views/operations/OperationsReportsView';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
  }),
}));

// Mock AuthContext
const mockHasPermission = vi.fn().mockReturnValue(true);
vi.mock('../core/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-admin', name: 'Ops Admin', isSuperadmin: true },
    hasPermission: mockHasPermission,
  }),
}));

// Mock Operations API
vi.mock('../lib/api/operations', () => ({
  useOperationsDashboard: () => ({
    data: {
      permissions: {
        hasTransport: true,
        hasInventory: true,
        hasAssets: true,
        hasGate: true,
        hasEvents: true,
      },
      transport: {
        totalVehicles: 8,
        activeVehicles: 7,
        totalRoutes: 5,
        activeRoutes: 4,
        activeAssignments: 142,
      },
      inventory: {
        totalItems: 55,
        lowStockItems: 3,
        todayMovements: 12,
      },
      assets: {
        totalAssets: 120,
        assignedAssets: 95,
        inRepairAssets: 4,
        disposedAssets: 1,
      },
      gate: {
        activeVisitors: 4,
        todayTotalVisits: 18,
        todayPickups: 26,
      },
      events: {
        upcomingEvents: 3,
        ongoingEvents: 1,
        totalParticipants: 84,
      },
    },
    isLoading: false,
    error: null,
  }),
  useVehicles: () => ({
    data: [
      {
        id: 'veh-1',
        registrationNumber: 'DL-01-AB-1234',
        seatingCapacity: 40,
        status: 'ACTIVE',
        make: 'Tata',
        model: 'Starbus',
        currentOdometer: 15420,
      },
    ],
    isLoading: false,
  }),
  useRoutes: () => ({
    data: [
      {
        id: 'route-1',
        routeCode: 'RT-NORTH-01',
        routeName: 'North Campus Express',
        startLocation: 'Sector 14',
        endLocation: 'Main Campus',
        stops: [{ id: 'stop-1', stopName: 'Metro Station', sequence: 1 }],
      },
    ],
    isLoading: false,
  }),
  useTrips: () => ({
    data: [],
    isLoading: false,
  }),
  useCreateVehicle: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateRoute: () => ({ mutate: vi.fn(), isPending: false }),
  useInventoryItems: () => ({
    data: [
      {
        id: 'item-1',
        itemCode: 'ITEM-A4-PAPER',
        name: 'A4 Printing Paper (Rim)',
        unitOfMeasure: 'RIM',
        minStockThreshold: '10.000',
        currentStock: '45.000',
        category: { name: 'Stationery' },
      },
    ],
    isLoading: false,
  }),
  useInventoryCategories: () => ({
    data: [{ id: 'cat-1', name: 'Stationery', code: 'STAT' }],
    isLoading: false,
  }),
  useInventoryLocations: () => ({
    data: [{ id: 'loc-1', name: 'Main Store Room', code: 'STORE-01' }],
    isLoading: false,
  }),
  useStockLedger: () => ({
    data: [],
    isLoading: false,
  }),
  useCreateInventoryItem: () => ({ mutate: vi.fn(), isPending: false }),
  useStockMovementMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useAssets: () => ({
    data: [
      {
        id: 'asset-1',
        assetTag: 'AST-2026-000001',
        status: 'AVAILABLE',
        serialNumber: 'SN-98745',
        item: { name: 'Dell Latitude 3520', itemCode: 'ITEM-LAPTOP' },
        location: { name: 'IT Lab 1' },
      },
    ],
    isLoading: false,
  }),
  useCreateAsset: () => ({ mutate: vi.fn(), isPending: false }),
  useAssignAsset: () => ({ mutate: vi.fn(), isPending: false }),
  useReturnAsset: () => ({ mutate: vi.fn(), isPending: false }),
  useDisposeAsset: () => ({ mutate: vi.fn(), isPending: false }),
  useVisits: () => ({
    data: [
      {
        id: 'visit-1',
        status: 'CHECKED_IN',
        checkInTime: '2026-09-06T10:00:00.000Z',
        visitor: { fullName: 'Rajesh Sharma', phone: '+91 9876543210', visitorType: 'VENDOR' },
        purpose: 'HVAC Maintenance',
      },
    ],
    isLoading: false,
  }),
  useStudentPickupReleases: () => ({
    data: [],
    isLoading: false,
  }),
  useCheckInVisitor: () => ({ mutate: vi.fn(), isPending: false }),
  useCheckOutVisitor: () => ({ mutate: vi.fn(), isPending: false }),
  useReleaseStudentPickup: () => ({ mutate: vi.fn(), isPending: false }),
  useSchoolEvents: () => ({
    data: [
      {
        id: 'evt-1',
        eventCode: 'EVT-2026-001',
        title: 'Annual Science Fair',
        startDate: '2026-10-15',
        endDate: '2026-10-16',
        status: 'SCHEDULED',
        capacity: 100,
        category: { name: 'Academic' },
        _count: { participants: 45 },
      },
    ],
    isLoading: false,
  }),
  useActivityCategories: () => ({
    data: [{ id: 'act-cat-1', name: 'Academic', code: 'ACAD' }],
    isLoading: false,
  }),
  useCreateSchoolEvent: () => ({ mutate: vi.fn(), isPending: false }),
  useRegisterEventParticipant: () => ({ mutate: vi.fn(), isPending: false }),
  useOperationsReports: () => ({
    data: [
      {
        registrationNumber: 'DL-01-AB-1234',
        seatingCapacity: 40,
        status: 'ACTIVE',
      },
    ],
    isLoading: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{component}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Major Module 09 — Operations UI & Integration Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders OperationsNav with all sub-navigation sections', () => {
    renderWithProviders(<OperationsNav />);
    expect(screen.getByText(/Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Transport & Fleet/i)).toBeInTheDocument();
    expect(screen.getByText(/Inventory & Supplies/i)).toBeInTheDocument();
    expect(screen.getByText(/Asset Register/i)).toBeInTheDocument();
    expect(screen.getByText(/Gate & Visitors/i)).toBeInTheDocument();
    expect(screen.getByText(/Activities & Events/i)).toBeInTheDocument();
    expect(screen.getByText(/Reports & Exports/i)).toBeInTheDocument();
  });

  it('renders OperationsOverview dashboard with 5 domain cards and invariants notice', () => {
    renderWithProviders(<OperationsOverview />);
    expect(screen.getByText(/School Operations & Facilities/i)).toBeInTheDocument();
    expect(screen.getByText(/Transport & Fleet/i)).toBeInTheDocument();
    expect(screen.getByText(/Inventory & Supplies/i)).toBeInTheDocument();
    expect(screen.getByText(/Fixed Asset Register/i)).toBeInTheDocument();
    expect(screen.getByText(/Gate & Visitors/i)).toBeInTheDocument();
    expect(screen.getByText(/Activities & Events/i)).toBeInTheDocument();
    expect(screen.getByText(/5 Operations Integrity Guarantees Active/i)).toBeInTheDocument();
  });

  it('renders TransportView with vehicles and routes', () => {
    renderWithProviders(<TransportView />);
    expect(screen.getByText(/Transport & Fleet Management/i)).toBeInTheDocument();
    expect(screen.getByText('DL-01-AB-1234')).toBeInTheDocument();
  });

  it('renders InventoryView with stock items catalog and ledger', () => {
    renderWithProviders(<InventoryView />);
    expect(screen.getByText(/Inventory & Supplies Management/i)).toBeInTheDocument();
    expect(screen.getByText(/ITEM-A4-PAPER/i)).toBeInTheDocument();
    expect(screen.getByText(/A4 Printing Paper/i)).toBeInTheDocument();
  });

  it('renders AssetsView with asset tag and status', () => {
    renderWithProviders(<AssetsView />);
    expect(screen.getByText(/Fixed Asset Register/i)).toBeInTheDocument();
    expect(screen.getByText('AST-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('Dell Latitude 3520')).toBeInTheDocument();
  });

  it('renders GateView with active visitor register', () => {
    renderWithProviders(<GateView />);
    expect(screen.getByText(/Gate & Visitor Safety Register/i)).toBeInTheDocument();
    expect(screen.getByText(/Rajesh Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/HVAC Maintenance/i)).toBeInTheDocument();
  });

  it('renders EventsView with scheduled events and participation', () => {
    renderWithProviders(<EventsView />);
    expect(screen.getByText(/School Activities & Events/i)).toBeInTheDocument();
    expect(screen.getByText(/Annual Science Fair/i)).toBeInTheDocument();
    expect(screen.getByText(/EVT-2026-001/i)).toBeInTheDocument();
  });

  it('renders OperationsReportsView with table and export option', () => {
    renderWithProviders(<OperationsReportsView />);
    expect(screen.getByText(/Authoritative Operations Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Export .* CSV/i)).toBeInTheDocument();
  });
});
