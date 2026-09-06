import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MasterData from '../app/views/master-data/MasterData';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../core/tenancy/TenantContext', () => ({
  useTenant: () => ({
    currentTenant: { schoolId: 'school-1', tenantSlug: 'tenant-1' },
    hasEntitlement: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({
    toast: { success: vi.fn(), error: vi.fn() },
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

const mockClasses = [
  { id: 'c1', name: 'Grade 1', code: 'G1', displayOrder: 1, academicLevel: 'Primary', isActive: true, archivedAt: null },
  { id: 'c9', name: 'Grade 9', code: 'G9', displayOrder: 9, academicLevel: 'Middle', isActive: true, archivedAt: null },
  { id: 'c2', name: 'Grade 10', code: 'G10', displayOrder: 10, academicLevel: 'Secondary', isActive: true, archivedAt: null },
  { id: 'c3', name: 'Kindergarten', code: 'KG', displayOrder: 0, academicLevel: 'Pre-Primary', isActive: false, archivedAt: '2026-01-01' },
];

const mockSections = [
  { id: 's1', name: 'Section A', code: 'SEC-A', displayOrder: 1, isActive: true, archivedAt: null },
  { id: 's2', name: 'Section B', code: 'SEC-B', displayOrder: 2, isActive: true, archivedAt: null },
];

const mockSubjects = [
  { id: 'sub1', name: 'Mathematics', code: 'MATH', type: 'THEORY', isActive: true, archivedAt: null },
  { id: 'sub2', name: 'Physics Practical', code: 'PHY-LAB', type: 'PRACTICAL', isActive: true, archivedAt: null },
];

const mockCountries = [
  { id: 'ct1', name: 'India', isoCode: 'IN', iso3: 'IND', dialCode: '+91', currency: 'INR' },
  { id: 'ct2', name: 'United States', isoCode: 'US', iso3: 'USA', dialCode: '+1', currency: 'USD' },
];

const mockStates = [
  { id: 'st1', name: 'Maharashtra', code: 'MH', countryId: 'ct1', country: { name: 'India' } },
  { id: 'st2', name: 'Delhi', code: 'DL', countryId: 'ct1', country: { name: 'India' } },
];

const mockCities = [
  { id: 'ci1', name: 'Mumbai', stateId: 'st1', state: { name: 'Maharashtra' } },
  { id: 'ci2', name: 'Pune', stateId: 'st1', state: { name: 'Maharashtra' } },
];

vi.mock('../lib/api/master-data', () => ({
  useClasses: (_schoolId: any, _p: any, includeArchived: boolean) => ({
    data: includeArchived ? mockClasses : mockClasses.filter(c => !c.archivedAt),
    isLoading: false,
  }),
  useCreateClass: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateClass: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveClass: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRestoreClass: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useSections: () => ({ data: mockSections, isLoading: false }),
  useCreateSection: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSection: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveSection: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRestoreSection: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useClassSections: () => ({ data: [], isLoading: false }),
  useCreateClassSection: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteClassSection: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useSubjects: () => ({ data: mockSubjects, isLoading: false }),
  useCreateSubject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSubject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveSubject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRestoreSubject: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useClassSubjects: () => ({ data: [], isLoading: false }),
  useCreateClassSubject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteClassSubject: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useReligions: () => ({ data: [], isLoading: false }),
  useCreateReligion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateReligion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveReligion: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useCategories: () => ({ data: [], isLoading: false }),
  useCreateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useCastes: () => ({ data: [], isLoading: false }),
  useCreateCaste: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCaste: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveCaste: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useVehicleTypes: () => ({ data: [], isLoading: false }),
  useCreateVehicleType: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateVehicleType: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveVehicleType: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useFeeHeads: () => ({ data: [], isLoading: false }),
  useCreateFeeHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateFeeHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveFeeHead: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useExpenseHeads: () => ({ data: [], isLoading: false }),
  useCreateExpenseHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateExpenseHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveExpenseHead: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useDepartments: () => ({ data: [], isLoading: false }),
  useCreateDepartment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateDepartment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveDepartment: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useDesignations: () => ({ data: [], isLoading: false }),
  useCreateDesignation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateDesignation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveDesignation: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useCountries: () => ({ data: mockCountries, isLoading: false }),
  useCreateCountry: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCountry: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useStates: () => ({ data: mockStates, isLoading: false }),
  useCreateState: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateState: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useCities: () => ({ data: mockCities, isLoading: false }),
  useCreateCity: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCity: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('MasterData Search and Filtering Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders classes initially without archived records when includeArchived is false', () => {
    renderWithRouter(<MasterData />);
    expect(screen.getByText('Grade 1')).toBeInTheDocument();
    expect(screen.getByText('Grade 10')).toBeInTheDocument();
    expect(screen.queryByText('Kindergarten')).not.toBeInTheDocument();
  });

  it('filters classes in real-time by search query (case-insensitive & trimmed)', () => {
    renderWithRouter(<MasterData />);
    const searchInput = screen.getByPlaceholderText('Search...');
    
    // Search with trailing space and uppercase
    fireEvent.change(searchInput, { target: { value: '  GRADE 10  ' } });
    expect(screen.getByText('Grade 10')).toBeInTheDocument();
    expect(screen.queryByText('Grade 1')).not.toBeInTheDocument();
  });

  it('filters classes by academicStage / academicLevel', () => {
    renderWithRouter(<MasterData />);
    const searchInput = screen.getByPlaceholderText('Search...');
    
    fireEvent.change(searchInput, { target: { value: 'Secondary' } });
    expect(screen.getByText('Grade 10')).toBeInTheDocument();
    expect(screen.queryByText('Grade 1')).not.toBeInTheDocument();
  });

  it('shows clear search button (X) when search text is entered and clears on click', () => {
    renderWithRouter(<MasterData />);
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Grade 10' } });

    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Grade 1')).toBeInTheDocument();
    expect(screen.getByText('Grade 10')).toBeInTheDocument();
  });

  it('displays localized empty state message when no matching records are found', () => {
    renderWithRouter(<MasterData />);
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'NonExistentGrade999' } });

    expect(screen.getByText('No matching records found.')).toBeInTheDocument();
  });

  it('resets search query when switching academic sub-tabs', () => {
    renderWithRouter(<MasterData />);
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Grade 1' } });
    expect(searchInput).toHaveValue('Grade 1');

    // Switch to Sections subtab
    const sectionsTab = screen.getByText('Sections');
    fireEvent.click(sectionsTab);

    // Search should be cleared
    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Section A')).toBeInTheDocument();
  });

  it('filters geographic tab entities (countries, states, cities) when active', () => {
    renderWithRouter(<MasterData />);
    
    // Switch to Geographic tab
    const geoTab = screen.getByText('Geographic');
    fireEvent.click(geoTab);

    expect(screen.getByText('India')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();

    // Filter by ISO code
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'US' } });

    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.queryByText('India')).not.toBeInTheDocument();
  });

  it('includes archived records when toggle is checked', () => {
    renderWithRouter(<MasterData />);
    const toggleArchived = screen.getByLabelText('Show Archived');
    fireEvent.click(toggleArchived);

    expect(screen.getByText('Kindergarten')).toBeInTheDocument();
  });

  it('specifically narrows down to Grade 9 when searching "Grade 9" without returning Grade 1 or Grade 10', () => {
    renderWithRouter(<MasterData />);
    const searchInput = screen.getByPlaceholderText('Search...');

    fireEvent.change(searchInput, { target: { value: 'Grade 9' } });

    expect(screen.getByText('Grade 9')).toBeInTheDocument();
    expect(screen.queryByText('Grade 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Grade 10')).not.toBeInTheDocument();
  });

  it('matches Grade 9 when searching "Class 9" via bidirectional educational alias', () => {
    renderWithRouter(<MasterData />);
    const searchInput = screen.getByPlaceholderText('Search...');

    fireEvent.change(searchInput, { target: { value: 'Class 9' } });

    expect(screen.getByText('Grade 9')).toBeInTheDocument();
    expect(screen.queryByText('Grade 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Grade 10')).not.toBeInTheDocument();
  });

  it('matches Grade 9 when searching compact format "grade9" or "grade-9"', () => {
    renderWithRouter(<MasterData />);
    const searchInput = screen.getByPlaceholderText('Search...');

    fireEvent.change(searchInput, { target: { value: 'grade9' } });
    expect(screen.getByText('Grade 9')).toBeInTheDocument();
    expect(screen.queryByText('Grade 1')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'grade-9' } });
    expect(screen.getByText('Grade 9')).toBeInTheDocument();
  });
});
