import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExamsView } from '../app/views/academics/ExamsView';

// Setup Mock Data
const SCHOOL_A = 'school-alpha';
const SCHOOL_B = 'school-beta';

let activeSchoolId = SCHOOL_A;
let activeLanguage = 'en';

const MOCK_CLASSES = [
  { id: 'c-11', name: 'Grade 11', code: 'G11' },
  { id: 'c-12', name: 'Grade 12', code: 'G12' },
  { id: 'c-empty', name: 'Grade 10', code: 'G10' },
];

// Grade 11 has 3 mapped subjects in School A
const MAPPED_SUBJECTS_SCHOOL_A: Record<string, any[]> = {
  'c-11': [
    {
      id: 'cs-1',
      classId: 'c-11',
      subjectId: 'sub-physics',
      isActive: true,
      subject: { id: 'sub-physics', name: 'Physics UserData', code: 'PHY', type: 'THEORY' },
    },
    {
      id: 'cs-2',
      classId: 'c-11',
      subjectId: 'sub-chemistry',
      isActive: true,
      subject: { id: 'sub-chemistry', name: 'Chemistry UserData', code: 'CHEM', type: 'BOTH' },
    },
    {
      id: 'cs-3',
      classId: 'c-11',
      subjectId: 'sub-biology',
      isActive: true,
      subject: { id: 'sub-biology', name: 'Biology UserData', code: 'BIO', type: 'PRACTICAL' },
    },
  ],
  'c-12': [
    {
      id: 'cs-4',
      classId: 'c-12',
      subjectId: 'sub-maths',
      isActive: true,
      subject: { id: 'sub-maths', name: 'Advanced Mathematics', code: 'MATH', type: 'THEORY' },
    },
  ],
  'c-empty': [],
};

// School B has different subjects
const MAPPED_SUBJECTS_SCHOOL_B: Record<string, any[]> = {
  'c-11': [
    {
      id: 'cs-b1',
      classId: 'c-11',
      subjectId: 'sub-history',
      isActive: true,
      subject: { id: 'sub-history', name: 'World History', code: 'HIST', type: 'THEORY' },
    },
  ],
};

// Mock Exam with a historical ExamSubject that was previously configured
// but whose mapping was later archived / is not in MAPPED_SUBJECTS_SCHOOL_A['c-11']
const MOCK_EXAM_DETAIL = {
  id: 'exam-final-44',
  name: 'final (44)',
  code: 'FINAL44',
  examType: 'TERM',
  startDate: '2026-09-15T00:00:00.000Z',
  endDate: '2026-09-25T00:00:00.000Z',
  status: 'DRAFT',
  examClasses: [
    { classId: 'c-11', class: { id: 'c-11', name: 'Grade 11' } },
    { classId: 'c-12', class: { id: 'c-12', name: 'Grade 12' } },
    { classId: 'c-empty', class: { id: 'c-empty', name: 'Grade 10' } },
  ],
  examSubjects: [
    // Historical subject configured earlier when French was mapped
    {
      id: 'es-historical',
      examId: 'exam-final-44',
      classId: 'c-11',
      subjectId: 'sub-french-historical',
      maxMarks: 100,
      passMarks: 40,
      theoryMaxMarks: 80,
      practicalMaxMarks: 20,
      activityMaxMarks: 0,
      allowGrace: true,
      maxGraceMarks: 5,
      subject: {
        id: 'sub-french-historical',
        name: 'Historical French Literature',
        code: 'FREN',
        type: 'THEORY',
      },
    },
  ],
};

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: activeLanguage },
    t: (key: string, defaultVal?: any) => {
      if (key === 'academics.exams.noMappedSubjects') {
        if (activeLanguage === 'hi') return 'इस कक्षा में अभी कोई विषय मैप नहीं किया गया है।';
        if (activeLanguage === 'hinglish') return 'Is class mein abhi koi subject map nahi kiya gaya hai.';
        return 'No subjects are mapped to this class yet.';
      }
      if (key === 'academics.exams.manageClassSubjects') {
        if (activeLanguage === 'hi') return 'कक्षा के विषय प्रबंधित करें';
        if (activeLanguage === 'hinglish') return 'Class Subjects Manage Karein';
        return 'Manage Class Subjects';
      }
      if (key === 'academics.exams.historicalInactiveMapping') {
        if (activeLanguage === 'hi') return 'पहले कॉन्फ़िगर किया गया / मैपिंग वर्तमान में निष्क्रिय है';
        if (activeLanguage === 'hinglish') return 'Pehle configure kiya gaya / mapping abhi inactive hai';
        return 'Previously configured / mapping currently inactive';
      }
      if (typeof defaultVal === 'string') return defaultVal;
      return key;
    },
  }),
}));

// Mock Auth
vi.mock('../core/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-admin', name: 'Principal Admin', role: 'ADMIN' },
    hasPermission: () => true,
  }),
}));

// Mock TenantContext
vi.mock('../core/tenancy/TenantContext', () => ({
  useTenant: () => ({
    currentTenant: { schoolId: activeSchoolId, tenantSlug: 'evolix-school' },
    availableTenants: [],
    isLoadingTenant: false,
    switchTenant: vi.fn(),
    hasEntitlement: () => true,
  }),
}));

const EMPTY_LIST: any[] = [];

// Mock Master Data
vi.mock('../lib/api/master-data', () => ({
  useClasses: () => ({ data: MOCK_CLASSES, isLoading: false }),
  useClassSections: () => ({ data: EMPTY_LIST, isLoading: false }),
  useSubjects: () => ({ data: EMPTY_LIST, isLoading: false }),
  useClassSubjects: (options?: { schoolId?: string; classId?: string }) => {
    const school = options?.schoolId;
    const classId = options?.classId;
    if (!school || !classId) return { data: EMPTY_LIST, isLoading: false };
    const source = school === SCHOOL_B ? MAPPED_SUBJECTS_SCHOOL_B : MAPPED_SUBJECTS_SCHOOL_A;
    return {
      data: source[classId] || EMPTY_LIST,
      isLoading: false,
    };
  },
}));

// Mock Academics API
const mockSaveExamSubjects = vi.fn().mockResolvedValue([]);
vi.mock('../lib/api/academics', () => ({
  useExamsList: () => ({
    data: [MOCK_EXAM_DETAIL],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useExamDetail: (id: string) => ({
    data: id === MOCK_EXAM_DETAIL.id ? MOCK_EXAM_DETAIL : undefined,
    refetch: vi.fn(),
  }),
  useCreateExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSaveExamSubjects: () => ({ mutateAsync: mockSaveExamSubjects, isPending: false }),
  useSaveExamSchedules: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFinalizeExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePublishExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnpublishExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAcademicTerms: () => ({ data: [], isLoading: false }),
  useGradeScales: () => ({ data: [], isLoading: false }),
}));

// Mock Academic Years
vi.mock('../lib/api/academic-years', () => ({
  useAcademicYears: () => ({
    data: [{ id: 'ay-2026', name: '2026-2027', is_current: true }],
  }),
}));

// Mock Users
vi.mock('../lib/api/users', () => ({
  useUsers: () => ({ data: { items: [] } }),
}));

function renderExamsView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ExamsView />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Module 06 — Final Exam Subject Mapping Remediation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeSchoolId = SCHOOL_A;
    activeLanguage = 'en';
  });

  it('1 & 2. Grade 11 shows exactly mapped subjects and unmapped school subjects do NOT appear', async () => {
    renderExamsView();

    // Open Subject Config Modal for exam final (44)
    const configBtn = screen.getByTitle('Configure Subjects & Marks');
    fireEvent.click(configBtn);

    // Modal title appears
    expect(screen.getByText('Configure Exam Subjects & Marks Scheme')).toBeInTheDocument();

    // Select Grade 11 class tab
    const grade11Tabs = screen.getAllByText('Grade 11');
    fireEvent.click(grade11Tabs[0]);

    // Exactly 3 mapped subjects are shown (plus historical if present)
    expect(screen.getByText('Physics UserData')).toBeInTheDocument();
    expect(screen.getByText('Chemistry UserData')).toBeInTheDocument();
    expect(screen.getByText('Biology UserData')).toBeInTheDocument();

    // Unmapped subjects (e.g. Advanced Mathematics from Grade 12 or World History from School B) do NOT appear
    expect(screen.queryByText('Advanced Mathematics')).not.toBeInTheDocument();
    expect(screen.queryByText('World History')).not.toBeInTheDocument();
  });

  it('3. Class with zero mappings shows localized empty state and Manage Class Subjects button in English, Hindi, Hinglish', async () => {
    // Test in English
    activeLanguage = 'en';
    const { unmount } = renderExamsView();

    fireEvent.click(screen.getByTitle('Configure Subjects & Marks'));
    fireEvent.click(screen.getAllByText('Grade 10')[0]);

    expect(screen.getByText('No subjects are mapped to this class yet.')).toBeInTheDocument();
    expect(screen.getByText('Manage Class Subjects')).toBeInTheDocument();
    unmount();

    // Test in Hindi
    activeLanguage = 'hi';
    const { unmount: unmountHi } = renderExamsView();
    fireEvent.click(screen.getByTitle('Configure Subjects & Marks'));
    fireEvent.click(screen.getAllByText('Grade 10')[0]);

    expect(screen.getByText('इस कक्षा में अभी कोई विषय मैप नहीं किया गया है।')).toBeInTheDocument();
    expect(screen.getByText('कक्षा के विषय प्रबंधित करें')).toBeInTheDocument();
    unmountHi();

    // Test in Hinglish
    activeLanguage = 'hinglish';
    renderExamsView();
    fireEvent.click(screen.getByTitle('Configure Subjects & Marks'));
    fireEvent.click(screen.getAllByText('Grade 10')[0]);

    expect(screen.getByText('Is class mein abhi koi subject map nahi kiya gaya hai.')).toBeInTheDocument();
    expect(screen.getByText('Class Subjects Manage Karein')).toBeInTheDocument();
  });

  it('5. Changing class refreshes the mapped subject list', async () => {
    renderExamsView();

    fireEvent.click(screen.getByTitle('Configure Subjects & Marks'));

    // Select Grade 11
    fireEvent.click(screen.getAllByText('Grade 11')[0]);
    expect(screen.getByText('Physics UserData')).toBeInTheDocument();
    expect(screen.queryByText('Advanced Mathematics')).not.toBeInTheDocument();

    // Select Grade 12
    fireEvent.click(screen.getAllByText('Grade 12')[0]);
    expect(screen.getByText('Advanced Mathematics')).toBeInTheDocument();
    expect(screen.queryByText('Physics UserData')).not.toBeInTheDocument();
  });

  it('6. Subject names remain raw user data and are never translated', async () => {
    activeLanguage = 'hi';
    renderExamsView();

    fireEvent.click(screen.getByTitle('Configure Subjects & Marks'));
    fireEvent.click(screen.getAllByText('Grade 11')[0]);

    // User record strings remain completely intact
    expect(screen.getByText('Physics UserData')).toBeInTheDocument();
    expect(screen.getByText('Chemistry UserData')).toBeInTheDocument();
    expect(screen.getByText('Biology UserData')).toBeInTheDocument();
  });

  it('7. Existing historical ExamSubject remains readable with inactive badge when its mapping is archived', async () => {
    renderExamsView();

    fireEvent.click(screen.getByTitle('Configure Subjects & Marks'));
    fireEvent.click(screen.getAllByText('Grade 11')[0]);

    // Historical French Literature was configured earlier on this exam but is not in current class mappings
    expect(screen.getByText('Historical French Literature')).toBeInTheDocument();
    expect(screen.getByText('Previously configured / mapping currently inactive')).toBeInTheDocument();
  });

  it('8. Active school switching does not leak subjects from another school', async () => {
    // School A Grade 11
    activeSchoolId = SCHOOL_A;
    const { unmount } = renderExamsView();

    fireEvent.click(screen.getByTitle('Configure Subjects & Marks'));
    fireEvent.click(screen.getAllByText('Grade 11')[0]);
    expect(screen.getByText('Physics UserData')).toBeInTheDocument();
    expect(screen.queryByText('World History')).not.toBeInTheDocument();
    unmount();

    // Switch to School B
    activeSchoolId = SCHOOL_B;
    renderExamsView();

    fireEvent.click(screen.getByTitle('Configure Subjects & Marks'));
    fireEvent.click(screen.getAllByText('Grade 11')[0]);

    // School B mapped subject is World History; School A subjects do not leak
    expect(screen.getByText('World History')).toBeInTheDocument();
    expect(screen.queryByText('Physics UserData')).not.toBeInTheDocument();
    expect(screen.queryByText('Chemistry UserData')).not.toBeInTheDocument();
  });
});
