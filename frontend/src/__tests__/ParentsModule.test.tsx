import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ParentsNav } from '../app/views/guardians/ParentsNav';
import ParentsOverview from '../app/views/guardians/ParentsOverview';
import { GuardianMergeModal } from '../app/views/guardians/GuardianMergeModal';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
  }),
}));

// Mock AuthContext
const mockHasPermission = vi.fn();
vi.mock('../core/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1', name: 'Admin', role: 'ADMIN' },
    hasPermission: mockHasPermission,
  }),
}));

// Mock Families API
vi.mock('../lib/api/families', () => ({
  useFamilies: () => ({
    data: {
      data: [
        {
          id: 'f-1',
          familyNumber: 'FAM-0001',
          familyName: 'Sharma Household',
          primaryGuardian: { firstName: 'Rajesh', lastName: 'Sharma' },
          _count: { students: 2, members: 2 },
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    },
    isLoading: false,
    error: null,
  }),
}));

// Mock Guardians API
const mockMergeMutateAsync = vi.fn().mockResolvedValue({ success: true });
const mockTargetGuardian = {
  id: 'target-1',
  firstName: 'Rajesh',
  lastName: 'Sharma',
  fullName: 'Rajesh Sharma',
  relationship: 'FATHER',
  phone: '+919876543210',
  email: 'rajesh@sharma.in',
  occupation: 'Architect',
  address: '123 Park Street',
  city: 'Jaipur',
  preferredLanguage: 'hi',
  students: [{ student: { id: 's-1', firstName: 'Aarav' } }],
};

const mockDuplicateGuardian = {
  id: 'dup-1',
  firstName: 'R. K.',
  lastName: 'Sharma',
  fullName: 'R. K. Sharma',
  relationship: 'FATHER',
  phone: '+919876543210',
  email: 'rajesh.work@sharma.in',
  occupation: 'Senior Architect',
  address: '123 Park Street, Civil Lines',
  city: 'Jaipur',
  preferredLanguage: 'en',
  students: [{ student: { id: 's-2', firstName: 'Diya' } }],
};

vi.mock('../lib/api/guardians', () => ({
  useGuardiansOverview: () => ({
    data: {
      totalGuardians: 142,
      activeGuardians: 138,
      totalFamilies: 85,
      groupedHouseholds: 80,
      portalAccessCount: 94,
      noPortalAccessCount: 48,
      duplicateCandidatesCount: 3,
      recentGuardians: [mockTargetGuardian],
      recentFamilies: [
        {
          id: 'f-1',
          familyNumber: 'FAM-0001',
          familyName: 'Sharma Household',
          primaryGuardian: { firstName: 'Rajesh', lastName: 'Sharma' },
          _count: { students: 2, members: 2 },
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
  useGuardians: () => ({
    data: {
      data: [mockTargetGuardian, mockDuplicateGuardian],
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    },
    isLoading: false,
    error: null,
  }),
  useGuardian: (id?: string) => {
    if (id === 'target-1') return { data: mockTargetGuardian, isLoading: false };
    if (id === 'dup-1') return { data: mockDuplicateGuardian, isLoading: false };
    return { data: null, isLoading: false };
  },
  useDuplicateCandidates: () => ({
    data: [mockTargetGuardian, mockDuplicateGuardian],
    isLoading: false,
  }),
  useMergeGuardians: () => ({
    mutateAsync: mockMergeMutateAsync,
    isPending: false,
  }),
}));

describe('Major Module 04: Parents & Family Management UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  describe('ParentsNav Navigation Bar', () => {
    it('renders all three core Module 04 tabs', () => {
      render(
        <MemoryRouter>
          <ParentsNav />
        </MemoryRouter>
      );

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Guardians Directory')).toBeInTheDocument();
      expect(screen.getByText('Family Households')).toBeInTheDocument();
      expect(screen.getByText('Module 04')).toBeInTheDocument();
    });

    it('renders action buttons according to user permissions', () => {
      const onOpenMerge = vi.fn();
      const onExport = vi.fn();

      render(
        <MemoryRouter>
          <ParentsNav onOpenMerge={onOpenMerge} onExport={onExport} />
        </MemoryRouter>
      );

      expect(screen.getByText('Add Guardian')).toBeInTheDocument();
      expect(screen.getByText('New Family')).toBeInTheDocument();
      expect(screen.getByText('Merge Duplicates')).toBeInTheDocument();
      expect(screen.getByText('Import CSV')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Merge Duplicates'));
      expect(onOpenMerge).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Export'));
      expect(onExport).toHaveBeenCalledTimes(1);
    });

    it('hides manage actions when user lacks permissions', () => {
      mockHasPermission.mockReturnValue(false);

      render(
        <MemoryRouter>
          <ParentsNav />
        </MemoryRouter>
      );

      expect(screen.queryByText('Add Guardian')).not.toBeInTheDocument();
      expect(screen.queryByText('New Family')).not.toBeInTheDocument();
      expect(screen.queryByText('Merge Duplicates')).not.toBeInTheDocument();
    });
  });

  describe('ParentsOverview Dashboard', () => {
    it('displays factual KPI cards with accurate metric counts', () => {
      render(
        <MemoryRouter>
          <ParentsOverview />
        </MemoryRouter>
      );

      expect(screen.getByText('142')).toBeInTheDocument(); // Total Guardians
      expect(screen.getByText('85')).toBeInTheDocument(); // Family Households
      expect(screen.getByText('94')).toBeInTheDocument(); // Portal Active
      expect(screen.getByText('48')).toBeInTheDocument(); // No Portal Login
      expect(screen.getByText('3')).toBeInTheDocument(); // Duplicate Candidates
    });

    it('renders duplicate resolution action card', () => {
      render(
        <MemoryRouter>
          <ParentsOverview />
        </MemoryRouter>
      );

      expect(screen.getByText('Guardian Deduplication Engine')).toBeInTheDocument();
      expect(screen.getByText('Launch Merge Tool')).toBeInTheDocument();
    });

    it('renders recent records for guardians and family households', () => {
      render(
        <MemoryRouter>
          <ParentsOverview />
        </MemoryRouter>
      );

      expect(screen.getAllByText('Rajesh Sharma').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Sharma Household').length).toBeGreaterThan(0);
      expect(screen.getAllByText('FAM-0001').length).toBeGreaterThan(0);
    });
  });

  describe('GuardianMergeModal Deduplication Engine', () => {
    it('renders side-by-side field values for target and duplicate records', () => {
      render(
        <MemoryRouter>
          <GuardianMergeModal
            isOpen={true}
            onClose={vi.fn()}
            defaultCanonicalId="target-1"
            defaultDuplicateId="dup-1"
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Merge Duplicate Guardians')).toBeInTheDocument();
      expect(screen.getByText('Canonical Record (Keep)')).toBeInTheDocument();
      expect(screen.getByText('Duplicate Record (Archive)')).toBeInTheDocument();
      expect(screen.getByText('Architect')).toBeInTheDocument();
      expect(screen.getByText('Senior Architect')).toBeInTheDocument();
    });

    it('executes atomic merge mutation with selected field overrides', async () => {
      const onClose = vi.fn();

      render(
        <MemoryRouter>
          <GuardianMergeModal
            isOpen={true}
            onClose={onClose}
            defaultCanonicalId="target-1"
            defaultDuplicateId="dup-1"
          />
        </MemoryRouter>
      );

      const submitButton = screen.getByText('Execute Merge & Transfer');
      expect(submitButton).toBeInTheDocument();

      fireEvent.click(submitButton);

      expect(mockMergeMutateAsync).toHaveBeenCalledWith({
        canonicalGuardianId: 'target-1',
        duplicateGuardianId: 'dup-1',
        resolvedFields: expect.any(Object),
      });
    });
  });
});
