import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AttendanceNav } from '../app/views/attendance/AttendanceNav';
import AttendanceOverview from '../app/views/attendance/AttendanceOverview';
import StudentAttendanceRegister from '../app/views/attendance/StudentAttendanceRegister';
import HolidaysView from '../app/views/attendance/HolidaysView';
import StaffAttendanceView from '../app/views/attendance/StaffAttendanceView';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal?: any) => {
      if (typeof defaultVal === 'string') return defaultVal;
      return _key;
    },
  }),
}));

// Mock AuthContext
const mockHasPermission = vi.fn().mockReturnValue(true);
vi.mock('../core/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-admin', name: 'Principal Admin', firstName: 'Principal', role: 'ADMIN' },
    hasPermission: mockHasPermission,
  }),
}));

// Mock TenantContext
vi.mock('../core/tenancy/TenantContext', () => ({
  useTenant: () => ({
    currentTenant: { schoolId: 'school-1', tenantSlug: 'tenant-1' },
    availableTenants: [],
    isLoadingTenant: false,
    switchTenant: vi.fn(),
    hasEntitlement: vi.fn().mockReturnValue(true),
  }),
}));

// Stable test data to prevent infinite re-renders in useEffect dependencies
const STABLE_ACADEMIC_YEARS = [{ id: 'ay-1', name: '2026-2027', isCurrent: true, is_current: true }];
const STABLE_CLASSES = [
  {
    id: 'c-1',
    name: 'Grade 6',
    code: 'G6',
    sections: [{ id: 's-1', name: 'Section A', code: '6A' }],
  },
];
const STABLE_REGISTER = {
  date: '2026-09-04',
  academicYearId: 'ay-1',
  classId: 'c-1',
  sectionId: 's-1',
  mode: 'DAILY',
  dayStatus: {
    isWorkingDay: true,
    isHoliday: false,
    isWorkingOverride: false,
  },
  isLocked: false,
  isMarked: true,
  summary: {
    total: 2,
    present: 1,
    absent: 1,
    late: 0,
    halfDay: 0,
    excused: 0,
    leave: 0,
    unmarked: 0,
  },
  items: [
    {
      studentId: 'stu-1',
      enrollmentId: 'enr-1',
      studentCode: 'STU-001',
      admissionNumber: 'ADM-101',
      rollNumber: '1',
      name: 'Aarav Sharma',
      gender: 'MALE',
      status: 'PRESENT',
      remarks: 'On time',
      isLocked: false,
      hasApprovedLeave: false,
    },
    {
      studentId: 'stu-2',
      enrollmentId: 'enr-2',
      studentCode: 'STU-002',
      admissionNumber: 'ADM-102',
      rollNumber: '2',
      name: 'Diya Patel',
      gender: 'FEMALE',
      status: 'ABSENT',
      remarks: 'Uninformed absence',
      isLocked: false,
      hasApprovedLeave: false,
    },
  ],
  students: [
    {
      studentId: 'stu-1',
      enrollmentId: 'enr-1',
      studentCode: 'STU-001',
      admissionNumber: 'ADM-101',
      rollNumber: '1',
      name: 'Aarav Sharma',
      gender: 'MALE',
      status: 'PRESENT',
      remarks: 'On time',
      isLocked: false,
      hasApprovedLeave: false,
    },
    {
      studentId: 'stu-2',
      enrollmentId: 'enr-2',
      studentCode: 'STU-002',
      admissionNumber: 'ADM-102',
      rollNumber: '2',
      name: 'Diya Patel',
      gender: 'FEMALE',
      status: 'ABSENT',
      remarks: 'Uninformed absence',
      isLocked: false,
      hasApprovedLeave: false,
    },
  ],
};
const STABLE_HOLIDAYS = [
  {
    id: 'hol-1',
    name: 'Gandhi Jayanti',
    startDate: '2026-10-02',
    endDate: '2026-10-02',
    type: 'PUBLIC_HOLIDAY',
    isWorkingOverride: false,
  },
  {
    id: 'hol-2',
    name: 'Compensatory Working Saturday',
    startDate: '2026-10-10',
    endDate: '2026-10-10',
    type: 'SCHOOL_HOLIDAY',
    isWorkingOverride: true,
  },
];
const STABLE_STAFF = [
  {
    id: 'staff-att-1',
    userId: 'u-teacher-1',
    attendanceDate: '2026-09-04',
    status: 'PRESENT',
    checkInAt: '2026-09-04T08:45:00Z',
    checkOutAt: null,
    checkInDistanceMeters: 35,
    isManualCorrection: false,
    user: {
      id: 'u-teacher-1',
      firstName: 'Anita',
      lastName: 'Verma',
      email: 'anita@school.edu',
    },
  },
];
const STABLE_OVERVIEW = {
  date: '2026-09-04',
  students: {
    present: 120,
    absent: 8,
    late: 4,
    halfDay: 2,
    excused: 1,
    leave: 5,
  },
  staff: {
    present: 24,
    absent: 1,
    late: 2,
    leave: 1,
  },
  pendingStudentLeaves: 3,
  classes: {
    total: 12,
    marked: 10,
    unmarked: 2,
  },
};

// Mock Attendance API
const mockSaveRegisterMutate = vi.fn().mockResolvedValue({ success: true, savedCount: 2 });
const mockCreateHolidayMutate = vi.fn().mockResolvedValue({ id: 'h-new', name: 'Diwali' });
const mockCheckInMutate = vi.fn().mockResolvedValue({
  isInsideGeofence: true,
  distanceMeters: 45,
  record: { status: 'PRESENT', checkInAt: '2026-09-04T09:00:00Z' },
});

vi.mock('../lib/api/attendance', () => ({
  useAttendanceOverview: () => ({
    data: STABLE_OVERVIEW,
    isLoading: false,
    refetch: vi.fn().mockResolvedValue({}),
  }),
  useStudentRegister: () => ({
    data: STABLE_REGISTER,
    isLoading: false,
    refetch: vi.fn().mockResolvedValue({}),
  }),
  useSaveStudentRegister: () => ({
    mutateAsync: mockSaveRegisterMutate,
    isPending: false,
  }),
  useCorrectStudentAttendance: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useHolidays: () => ({
    data: STABLE_HOLIDAYS,
    isLoading: false,
    refetch: vi.fn().mockResolvedValue({}),
  }),
  useCreateHoliday: () => ({
    mutateAsync: mockCreateHolidayMutate,
    isPending: false,
  }),
  useUpdateHoliday: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useDeleteHoliday: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useStaffAttendance: () => ({
    data: STABLE_STAFF,
    isLoading: false,
    refetch: vi.fn().mockResolvedValue({}),
  }),
  useStaffCheckIn: () => ({
    mutateAsync: mockCheckInMutate,
    isPending: false,
  }),
  useStaffCheckOut: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useManualStaffAttendance: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useStudentAttendanceSummary: () => ({
    data: {
      studentId: 'stu-1',
      month: 9,
      year: 2026,
      workingDays: 24,
      percentage: 95.83,
      counts: { present: 23, absent: 1, late: 0, halfDay: 0, excused: 0, leave: 0 },
      recentRecords: [],
    },
    isLoading: false,
  }),
}));

// Mock Master Data & Academic Year
vi.mock('../lib/api/academic-years', () => ({
  useAcademicYears: () => ({
    data: STABLE_ACADEMIC_YEARS,
    isLoading: false,
  }),
}));

vi.mock('../lib/api/master-data', () => ({
  useClasses: () => ({
    data: STABLE_CLASSES,
    isLoading: false,
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/attendance']}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Major Module 05: Attendance & Leave Management Frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Navigation Tabs
  it('1. AttendanceNav renders all 7 attendance module navigation tabs', () => {
    renderWithProviders(<AttendanceNav />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Student Attendance')).toBeInTheDocument();
    expect(screen.getByText('Student Leave')).toBeInTheDocument();
    expect(screen.getByText('Staff Attendance')).toBeInTheDocument();
    expect(screen.getByText('Staff Leave')).toBeInTheDocument();
    expect(screen.getByText('Holidays')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  // 2. Attendance Overview Dashboard
  it('2. AttendanceOverview renders student & staff KPI metrics correctly', () => {
    renderWithProviders(<AttendanceOverview />);

    // Present student count (120) and staff count (24)
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    // Marked classes
    expect(screen.getByText(/10 \/ 12/i)).toBeInTheDocument();
  });

  // 3. Student Attendance Register
  it('3. StudentAttendanceRegister displays roster, allows quick status toggling and saves register', async () => {
    renderWithProviders(<StudentAttendanceRegister />);

    // Verify students in roster
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Diya Patel')).toBeInTheDocument();

    // Find "Mark All Present" button
    const markAllBtn = screen.getByText('Mark All Present');
    expect(markAllBtn).toBeInTheDocument();
    fireEvent.click(markAllBtn);

    // Save attendance
    const saveBtn = screen.getByText('Save Register');
    expect(saveBtn).toBeInTheDocument();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSaveRegisterMutate).toHaveBeenCalled();
    });
  });

  // 4. Live Search Filter on Register
  it('4. StudentAttendanceRegister filters students via search input', () => {
    renderWithProviders(<StudentAttendanceRegister />);

    const searchInput = screen.getByPlaceholderText('Filter by name or roll...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Aarav' } });
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Diya Patel')).not.toBeInTheDocument();
  });

  // 5. Holidays Calendar Management
  it('5. HolidaysView lists scheduled holidays and special working day overrides', () => {
    renderWithProviders(<HolidaysView />);

    expect(screen.getByText('Gandhi Jayanti')).toBeInTheDocument();
    expect(screen.getByText('Compensatory Working Saturday')).toBeInTheDocument();
    expect(screen.getByText('Add Holiday')).toBeInTheDocument();
  });

  // 6. Staff Attendance & Geofence
  it('6. StaffAttendanceView renders Geofence Check-In widget and staff register roster', () => {
    renderWithProviders(<StaffAttendanceView />);

    expect(screen.getByText('School Geofenced Attendance Terminal')).toBeInTheDocument();
    expect(screen.getByText('Anita Verma')).toBeInTheDocument();
    expect(screen.getByText('anita@school.edu')).toBeInTheDocument();
  });

  // 7. Real Browser Geolocation Denial Handling
  it('7. StaffAttendanceView displays localized error banner and blocks check-in when browser geolocation is denied', async () => {
    const originalGeo = navigator.geolocation;
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_success, error) => {
        error({
          code: 1,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'User denied Geolocation',
        });
      }),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };

    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });

    renderWithProviders(<StaffAttendanceView />);

    const checkInBtn = screen.getByText('Check In Now');
    expect(checkInBtn).toBeInTheDocument();
    fireEvent.click(checkInBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Location permission denied by browser. Please enable location.')
      ).toBeInTheDocument();
    });

    expect(mockCheckInMutate).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeo,
      writable: true,
      configurable: true,
    });
  });
});
