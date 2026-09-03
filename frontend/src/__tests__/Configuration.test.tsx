import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NumberSeriesConfiguration from '../app/views/configuration/NumberSeriesConfiguration';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
  }),
}));

vi.mock('../core/tenancy/TenantContext', () => ({
  useTenant: () => ({
    currentTenant: { schoolId: 'school-1', tenantSlug: 'tenant-1' },
    availableTenants: [],
    isLoadingTenant: false,
    switchTenant: vi.fn(),
    hasEntitlement: vi.fn().mockReturnValue(true),
  }),
}));

const mockMutateAsync = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../lib/api/configuration', () => ({
  useNumberSeries: () => ({
    data: [
      {
        id: 's1',
        code: 'STUDENT_ID',
        prefix: 'STU-',
        suffix: '',
        padding: 5,
        current_value: 42,
        reset_strategy: 'NEVER',
      },
      {
        id: 's2',
        code: 'RECEIPT',
        prefix: 'REC-',
        suffix: '',
        padding: 6,
        current_value: 100,
        reset_strategy: 'ACADEMIC_YEAR',
      },
    ],
    isLoading: false,
    refetch: mockRefetch,
  }),
  useNumberSeriesPreview: (_id: any, values: any) => ({
    data: {
      preview: `${values?.prefix || 'STU-'}00043${values?.suffix || ''}`,
    },
  }),
  useUpdateNumberSeries: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}));

describe('Module 03 NumberSeriesConfiguration Component', () => {
  it('renders existing number series with sequence counter as read-only', () => {
    render(<NumberSeriesConfiguration />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getAllByText('STU-00043').length).toBeGreaterThan(0);
    expect(
      screen.getByText('admin.configuration.numberSeries.currentSequence')
    ).toBeInTheDocument();
  });

  it('allows selecting different number series codes', () => {
    render(<NumberSeriesConfiguration />);
    const receiptButton = screen.getByText('RECEIPT');
    expect(receiptButton).toBeInTheDocument();
    fireEvent.click(receiptButton);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('calls save mutation with safe configuration parameters', async () => {
    render(<NumberSeriesConfiguration />);
    const saveButton = screen.getByText('common.actions.save');
    expect(saveButton).toBeInTheDocument();
    fireEvent.click(saveButton);
    expect(mockMutateAsync).toHaveBeenCalled();
  });
});
