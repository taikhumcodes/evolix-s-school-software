import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from '../components/navigation/Header';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../core/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'admin@evolix.local', roles: ['OWNER'] },
    hasPermission: () => true,
    logout: vi.fn(),
  }),
}));

vi.mock('../core/tenancy/TenantContext', () => ({
  useTenant: () => ({
    currentTenant: { schoolId: 'school-1', tenantSlug: 'tenant-1', schoolName: 'Burhani' },
    availableTenants: [],
    hasEntitlement: () => true,
    switchTenant: vi.fn(),
  }),
}));

vi.mock('../lib/api/search', () => ({
  useGlobalSearch: (query: string) => {
    if (query && query.toLowerCase().includes('grade 9')) {
      return {
        data: [
          {
            id: 'c-9',
            type: 'class',
            category: 'Classes',
            title: 'Grade 9',
            subtitle: 'Code: G9 • Level: Middle',
            url: '/master-data?tab=academic&sub=classes&search=Grade%209',
            score: 1000,
          },
        ],
        isFetching: false,
      };
    }
    return { data: [], isFetching: false };
  },
}));

const renderHeader = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Global Header Search Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders interactive global search bar with placeholder and keyboard badge', () => {
    renderHeader();

    const searchInput = screen.getByPlaceholderText(
      'Search students, staff, receipts... (Ctrl+K)'
    );
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).not.toHaveAttribute('readonly');
    expect(screen.getByText('Ctrl K')).toBeInTheDocument();
  });

  it('filters navigation items as user types and navigates when clicked', () => {
    renderHeader();

    const searchInput = screen.getByPlaceholderText(
      'Search students, staff, receipts... (Ctrl+K)'
    );

    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'classes' } });

    // Should display matching results dropdown
    expect(screen.getByText('Search Results')).toBeInTheDocument();

    const classButton = screen.getByRole('button', { name: /Classes.*Grades/i });
    expect(classButton).toBeInTheDocument();

    // Click result
    fireEvent.click(classButton);
    expect(mockNavigate).toHaveBeenCalledWith('/master-data?tab=academic&sub=classes');
  });

  it('shows clear button and clears search input on click', () => {
    renderHeader();

    const searchInput = screen.getByPlaceholderText(
      'Search students, staff, receipts... (Ctrl+K)'
    );

    fireEvent.change(searchInput, { target: { value: 'branding' } });
    expect(searchInput).toHaveValue('branding');

    const clearBtn = screen.getByLabelText('Clear search');
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(searchInput).toHaveValue('');
  });

  it('displays empty state when no pages, features or records match', () => {
    renderHeader();

    const searchInput = screen.getByPlaceholderText(
      'Search students, staff, receipts... (Ctrl+K)'
    );

    fireEvent.change(searchInput, { target: { value: 'xyz123randomnonexistent' } });
    expect(
      screen.getByText(/No matching records, pages or features found for/i)
    ).toBeInTheDocument();
  });

  it('queries real ERP records and renders highlighted ERP match with navigation', async () => {
    renderHeader();

    const searchInput = screen.getByPlaceholderText(
      'Search students, staff, receipts... (Ctrl+K)'
    );

    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'Grade 9' } });

    // Wait for debounced search hook to trigger
    await waitFor(() => {
      expect(screen.getByText('School Records & Master Data')).toBeInTheDocument();
    });

    const erpMatch = screen.getByRole('button', { name: /Grade.*9/i });
    expect(erpMatch).toBeInTheDocument();

    fireEvent.click(erpMatch);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/master-data?tab=academic&sub=classes&search=Grade%209'
    );
  });

  it('supports keyboard navigation using ArrowDown, ArrowUp, and Enter', () => {
    renderHeader();

    const searchInput = screen.getByPlaceholderText(
      'Search students, staff, receipts... (Ctrl+K)'
    );

    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'branding' } });

    // Press ArrowDown to select first match
    fireEvent.keyDown(searchInput, { key: 'ArrowDown', code: 'ArrowDown' });

    // Press Enter to navigate
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/configuration/branding');
  });
});
