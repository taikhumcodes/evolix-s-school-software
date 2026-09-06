import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AcademicsNav } from '../app/views/academics/AcademicsNav';
import { AcademicsOverview } from '../app/views/academics/AcademicsOverview';
import { TermsView } from '../app/views/academics/TermsView';
import { TeacherAssignmentsView } from '../app/views/academics/TeacherAssignmentsView';
import { TimetableManager } from '../app/views/academics/TimetableManager';
import { HomeworkView } from '../app/views/academics/HomeworkView';
import { ExamsView } from '../app/views/academics/ExamsView';
import { MarksEntryView } from '../app/views/academics/MarksEntryView';
import { ResultsView } from '../app/views/academics/ResultsView';
import { ReportCardModal } from '../app/views/academics/ReportCardModal';
import { PromotionView } from '../app/views/academics/PromotionView';

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

// Stable mock datasets to prevent infinite re-render loops in useEffect dependencies
const STABLE_CLASSES = [
  { id: 'c-9', name: 'Class 9', code: 'C9' },
  { id: 'c-10', name: 'Class 10', code: 'C10' },
];
const STABLE_SECTIONS = [{ sectionId: 's-a', section: { id: 's-a', name: 'Section A' } }];
const STABLE_SUBJECTS = [
  { subjectId: 'sub-m', subject: { id: 'sub-m', name: 'Mathematics', code: 'MATH' } },
  { subjectId: 'sub-s', subject: { id: 'sub-s', name: 'Science', code: 'SCI' } },
];
const STABLE_ALL_SUBJECTS = STABLE_SUBJECTS.map((s) => s.subject);
const STABLE_ACADEMIC_YEARS = [
  { id: 'ay-2026', name: '2026-2027', is_current: true, isCurrent: true },
  { id: 'ay-2027', name: '2027-2028', is_current: false, isCurrent: false },
];
const STABLE_USERS = {
  items: [
    { id: 'u-t1', firstName: 'Anita', lastName: 'Deshmukh', email: 'anita@evolix.local' },
    { id: 'u-t2', firstName: 'Vikram', lastName: 'Singh', email: 'vikram@evolix.local' },
  ],
};

// Mock Master Data
vi.mock('../lib/api/master-data', () => ({
  useClasses: () => ({ data: STABLE_CLASSES }),
  useClassSections: () => ({ data: STABLE_SECTIONS }),
  useClassSubjects: () => ({ data: STABLE_SUBJECTS }),
  useSubjects: () => ({ data: STABLE_ALL_SUBJECTS }),
}));

// Mock Academic Years
vi.mock('../lib/api/academic-years', () => ({
  useAcademicYears: () => ({ data: STABLE_ACADEMIC_YEARS }),
}));

// Mock Users
vi.mock('../lib/api/users', () => ({
  useUsers: () => ({ data: STABLE_USERS }),
}));

// Mock Academics API
const mockTerms = [
  {
    id: 'term-1',
    name: 'Term 1',
    code: 'T1',
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-09-30T00:00:00.000Z',
    displayOrder: 1,
    weightagePercent: 50,
    isActive: true,
  },
];

const mockExams = [
  {
    id: 'exam-1',
    name: 'Mid-Term Examination 2026',
    code: 'MID2026',
    examType: 'TERM',
    startDate: '2026-09-15T00:00:00.000Z',
    endDate: '2026-09-25T00:00:00.000Z',
    status: 'PUBLISHED',
    weightagePercent: 50,
    examClasses: [{ classId: 'c-9', class: { id: 'c-9', name: 'Class 9' } }],
  },
];

const mockMarksRegister = {
  exam: { id: 'exam-1', name: 'Mid-Term 2026', code: 'MID2026', status: 'IN_PROGRESS', isLocked: false },
  class: { id: 'c-9', name: 'Class 9' },
  section: { id: 's-a', name: 'Section A' },
  subject: { id: 'sub-m', name: 'Mathematics', code: 'MATH' },
  config: { maxMarks: 100, passMarks: 33, allowGrace: true, maxGraceMarks: 5 },
  rows: [
    {
      studentId: 'st-1',
      studentName: 'Aarav Sharma',
      admissionNumber: 'ADM-2026-001',
      rollNumber: '1',
      status: 'PRESENT',
      rawTheoryMarks: 31,
      graceMarks: 4,
      finalMarks: 35,
      isPassed: true,
      grade: 'C',
      version: 1,
    },
  ],
};

const mockReportCard = {
  school: {
    name: 'Greenwood High School',
    code: 'CBSE-102938',
    address: 'Sector 21, Gandhinagar, Gujarat',
    contactNumber: '+91 79 2324 0000',
    email: 'info@greenwood.edu.in',
  },
  student: {
    id: 'st-1',
    name: 'Aarav Sharma',
    admissionNumber: 'ADM-2026-001',
    rollNumber: '1',
    gender: 'MALE',
    fatherName: 'Rajesh Sharma',
  },
  academic: {
    academicYear: '2026-2027',
    term: 'Term 1',
    className: 'Class 9',
    sectionName: 'Section A',
    examName: 'Mid-Term Examination 2026',
    examCode: 'MID2026',
  },
  attendanceSummary: {
    totalWorkingDays: 95,
    presentDays: 90,
    absentDays: 5,
    attendancePercentage: 94.7,
  },
  marks: [
    {
      subjectName: 'Mathematics',
      subjectCode: 'MATH',
      maxMarks: 100,
      passMarks: 33,
      rawTheory: 31,
      graceMarks: 4,
      finalMarks: 35,
      grade: 'C',
      isPassed: true,
      status: 'PRESENT',
    },
  ],
  summary: {
    totalMaxMarks: 100,
    totalMarksObtained: 35,
    overallPercentage: 35.0,
    overallGrade: 'C',
    isPassed: true,
    statusText: 'PASSED',
  },
};

const STABLE_OVERVIEW = {
  termsCount: 2,
  timetableSlotsCount: 40,
  activeHomeworkCount: 5,
  examsCount: 3,
  publishedExamsCount: 1,
  promotionsCount: 0,
  recentExams: mockExams,
};

const STABLE_CLASS_TEACHERS = [
  {
    id: 'cta-1',
    class: { id: 'c-9', name: 'Class 9' },
    section: { id: 's-a', name: 'Section A' },
    teacher: { id: 'u-t1', firstName: 'Anita', lastName: 'Deshmukh', email: 'anita@evolix.local' },
    isPrimary: true,
  },
];

const STABLE_SUBJECT_TEACHERS = [
  {
    id: 'sta-1',
    class: { id: 'c-9', name: 'Class 9' },
    section: { id: 's-a', name: 'Section A' },
    subject: { id: 'sub-m', name: 'Mathematics', code: 'MATH' },
    teacher: { id: 'u-t2', firstName: 'Vikram', lastName: 'Singh', email: 'vikram@evolix.local' },
    isPrimary: true,
  },
];

const STABLE_PERIODS = [
  { id: 'p-1', name: 'Period 1', startTime: '09:00', endTime: '09:45', type: 'TEACHING' },
  { id: 'p-2', name: 'Recess', startTime: '11:00', endTime: '11:30', type: 'RECESS' },
];

const STABLE_TIMETABLE_SLOTS = [
  {
    id: 'slot-1',
    dayOfWeek: 1,
    periodId: 'p-1',
    subjectId: 'sub-m',
    subject: { id: 'sub-m', name: 'Mathematics', code: 'MATH' },
    teacher: { id: 'u-t2', firstName: 'Vikram', lastName: 'Singh' },
    roomNumber: '101',
  },
];

const STABLE_HOMEWORK = [
  {
    id: 'hw-1',
    classId: 'c-9',
    subjectId: 'sub-m',
    class: { id: 'c-9', name: 'Class 9' },
    section: { id: 's-a', name: 'Section A' },
    subject: { id: 'sub-m', name: 'Mathematics', code: 'MATH' },
    title: 'Trigonometry Problems 1-10',
    description: 'Complete all questions in chapter 3.',
    assignedDate: '2026-09-01T00:00:00.000Z',
    dueDate: '2026-09-06T00:00:00.000Z',
    allowLateSubmission: false,
    maxPoints: 50,
  },
];

const STABLE_CALCULATED_RESULTS = [
  {
    studentId: 'st-1',
    studentName: 'Aarav Sharma',
    admissionNumber: 'ADM-2026-001',
    rollNumber: '1',
    totalMarksObtained: 35,
    totalMaxMarks: 100,
    percentage: 35.0,
    finalGrade: 'C',
    isPassed: true,
  },
];

const STABLE_PROMOTION_PREVIEW = {
  students: [
    {
      studentId: 'st-1',
      studentName: 'Aarav Sharma',
      admissionNumber: 'ADM-2026-001',
      rollNumber: '1',
      currentClass: 'Class 9',
      currentSection: 'Section A',
      currentPercentage: 88,
      isPassed: true,
      suggestedOutcome: 'PROMOTE',
      selectedOutcome: 'PROMOTE',
    },
  ],
};

const STABLE_GRADE_SCALES: any[] = [];

vi.mock('../lib/api/academics', () => ({
  useAcademicsOverview: () => ({
    data: STABLE_OVERVIEW,
    isLoading: false,
  }),
  useAcademicTerms: () => ({
    data: mockTerms,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useCreateAcademicTerm: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateAcademicTerm: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteAcademicTerm: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useClassTeacherAssignments: () => ({
    data: STABLE_CLASS_TEACHERS,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useSubjectTeacherAssignments: () => ({
    data: STABLE_SUBJECT_TEACHERS,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useAssignClassTeacher: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveClassTeacher: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAssignSubjectTeacher: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveSubjectTeacher: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useSchoolPeriods: () => ({
    data: STABLE_PERIODS,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useCreateSchoolPeriod: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteSchoolPeriod: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useTimetableSlots: () => ({
    data: STABLE_TIMETABLE_SLOTS,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useSaveTimetableSlot: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTimetableSlot: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useHomeworkList: () => ({
    data: STABLE_HOMEWORK,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useCreateHomework: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateHomework: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteHomework: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useExamsList: () => ({
    data: mockExams,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useExamDetail: () => ({
    data: mockExams[0],
    refetch: vi.fn(),
  }),
  useCreateExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSaveExamSubjects: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSaveExamSchedules: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFinalizeExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePublishExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnpublishExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGradeScales: () => ({ data: STABLE_GRADE_SCALES, isLoading: false }),

  useMarksRegister: () => ({
    data: mockMarksRegister,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useSaveMarksRegister: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useModerateMark: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useCalculatedResults: () => ({
    data: STABLE_CALCULATED_RESULTS,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useStudentReportCard: () => ({
    data: mockReportCard,
    isLoading: false,
  }),

  usePromotionPreview: () => ({
    data: STABLE_PROMOTION_PREVIEW,
    isLoading: false,
  }),
  useExecutePromotions: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Major Module 06 — Academic & Examination Management Frontend Component Verifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. AcademicsNav renders all tabs and displays Module 06 badge', () => {
    renderWithClient(<AcademicsNav />);
    expect(screen.getByText('Academic & Examination Management')).toBeInTheDocument();
    expect(screen.getByText('Module 06')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Academic Terms')).toBeInTheDocument();
    expect(screen.getByText('Teacher Assignments')).toBeInTheDocument();
    expect(screen.getByText('Timetable')).toBeInTheDocument();
    expect(screen.getByText('Homework')).toBeInTheDocument();
    expect(screen.getByText('Exams')).toBeInTheDocument();
    expect(screen.getByText('Marks Entry')).toBeInTheDocument();
    expect(screen.getByText('Results & Cards')).toBeInTheDocument();
    expect(screen.getByText('Promotions')).toBeInTheDocument();
  });

  it('2. AcademicsOverview renders KPI statistics and active exam cards', () => {
    renderWithClient(<AcademicsOverview />);
    expect(screen.getAllByText('Academic Terms').length).toBeGreaterThan(0);
    expect(screen.getByText('Active Homework')).toBeInTheDocument();
    expect(screen.getByText('Mid-Term Examination 2026')).toBeInTheDocument();
    expect(screen.getByText('MID2026')).toBeInTheDocument();
  });

  it('3. TermsView displays configured terms and launches Add Term modal', async () => {
    renderWithClient(<TermsView />);
    expect(screen.getByText('Academic Terms & Semesters')).toBeInTheDocument();
    expect(screen.getByText('Term 1')).toBeInTheDocument();
    expect(screen.getByText('T1')).toBeInTheDocument();

    const addBtn = screen.getByText('Add Term');
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Create Academic Term')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Term 1 / First Semester')).toBeInTheDocument();
    });
  });

  it('4. TeacherAssignmentsView renders Class Teachers and Subject Teachers tabs', () => {
    renderWithClient(<TeacherAssignmentsView />);
    expect(screen.getByText('Teacher Class & Subject Assignments')).toBeInTheDocument();
    expect(screen.getByText('Anita Deshmukh')).toBeInTheDocument();
    expect(screen.getByText('anita@evolix.local')).toBeInTheDocument();

    const subjectTab = screen.getByText('Subject Teachers');
    fireEvent.click(subjectTab);
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
  });

  it('5. TimetableManager renders weekday schedule and periods', () => {
    renderWithClient(<TimetableManager />);
    expect(screen.getByText('Class Timetable & Period Schedules')).toBeInTheDocument();
    expect(screen.getByText('Manage Bell Periods')).toBeInTheDocument();
    expect(screen.getByText('Please select a Class and Section to view and edit its timetable.')).toBeInTheDocument();
  });

  it('6. HomeworkView displays posted homework assignments', () => {
    renderWithClient(<HomeworkView />);
    expect(screen.getByText('Homework & Assignments')).toBeInTheDocument();
    expect(screen.getByText('Trigonometry Problems 1-10')).toBeInTheDocument();
    expect(screen.getByText('50 pts')).toBeInTheDocument();
  });

  it('7. ExamsView displays examinations and actions', () => {
    renderWithClient(<ExamsView />);
    expect(screen.getByText('Examinations & Assessments')).toBeInTheDocument();
    expect(screen.getByText('Mid-Term Examination 2026')).toBeInTheDocument();
    expect(screen.getByText('PUBLISHED')).toBeInTheDocument();
  });

  it('8. MarksEntryView renders register with students, inputs, and grace marks', () => {
    renderWithClient(<MarksEntryView />);
    expect(screen.getByText('Marks Entry Register')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('ADM-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Save Register')).toBeInTheDocument();
  });

  it('9. ResultsView renders student results and percentage', () => {
    renderWithClient(<ResultsView />);
    expect(screen.getByText('Examination Results & Report Cards')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getAllByText('Passed').length).toBeGreaterThan(0);
    expect(screen.getByText('Print Card')).toBeInTheDocument();
  });

  it('10. ReportCardModal renders school letterhead, marks, and attendance summary from Module 05', () => {
    renderWithClient(<ReportCardModal examId="exam-1" studentId="st-1" onClose={vi.fn()} />);
    expect(screen.getByText('Official Student Progress Report Card')).toBeInTheDocument();
    expect(screen.getByText('Greenwood High School')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Attendance Record (Official)')).toBeInTheDocument();
    expect(screen.getByText('Total School Working Days:')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('94.7%')).toBeInTheDocument();
  });

  it('11. PromotionView renders candidate list and bulk promotion controls', () => {
    renderWithClient(<PromotionView />);
    expect(screen.getByText('Annual Student Promotions & Rollover')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('All Promote')).toBeInTheDocument();
    expect(screen.getByText('All Detain')).toBeInTheDocument();
    expect(screen.getByText('All Complete')).toBeInTheDocument();
  });
});
