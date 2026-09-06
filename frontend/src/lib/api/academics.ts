import apiClient from '../api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =========================================================================
// TYPES & INTERFACES
// =========================================================================

export interface AcademicTerm {
  id: string;
  academicYearId: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  displayOrder: number;
  weightagePercent?: number | null;
  isActive: boolean;
  status?: string;
  academicYear?: {
    id: string;
    name: string;
    code: string;
    startDate: string;
    endDate: string;
  };
}

export interface ClassTeacherAssignment {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  teacherUserId: string;
  isPrimary: boolean;
  notes?: string | null;
  class?: { id: string; name: string };
  section?: { id: string; name: string };
  teacher?: { id: string; firstName: string; lastName?: string | null; email: string };
}

export interface SubjectTeacherAssignment {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherUserId: string;
  isPrimary: boolean;
  notes?: string | null;
  class?: { id: string; name: string };
  section?: { id: string; name: string };
  subject?: { id: string; name: string; code: string };
  teacher?: { id: string; firstName: string; lastName?: string | null; email: string };
}

export interface SchoolPeriod {
  id: string;
  name: string;
  periodNumber?: number | null;
  startTime: string;
  endTime: string;
  displayOrder: number;
  type: 'TEACHING' | 'RECESS' | 'ASSEMBLY' | 'ZERO_PERIOD' | 'OTHER';
  dayOfWeek?: number | null;
  isActive: boolean;
}

export interface TimetableSlot {
  id: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  dayOfWeek: number;
  periodId: string;
  subjectId: string;
  teacherUserId?: string | null;
  roomNumber?: string | null;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  period?: SchoolPeriod;
  subject?: { id: string; name: string; code: string };
  teacher?: { id: string; firstName: string; lastName?: string | null; email: string };
  class?: { id: string; name: string };
  section?: { id: string; name: string };
}

export interface Homework {
  id: string;
  academicYearId: string;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  allowLateSubmission: boolean;
  maxPoints?: number | null;
  attachments?: Array<{ key: string; name: string; size: number }> | null;
  createdByUserId: string;
  class?: { id: string; name: string };
  section?: { id: string; name: string };
  subject?: { id: string; name: string; code: string };
  createdByUser?: { id: string; firstName: string; lastName?: string | null; email: string };
}

export interface Exam {
  id: string;
  academicYearId: string;
  termId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  examType: 'TERM' | 'UNIT' | 'PRACTICAL' | 'FINAL' | 'ENTRANCE' | 'CLASS_TEST';
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'FINALIZED' | 'PUBLISHED';
  weightagePercent?: number | null;
  gradeScaleId?: string | null;
  publishedAt?: string | null;
  academicYear?: { id: string; name: string };
  term?: { id: string; name: string; code: string };
  gradeScale?: GradeScale;
  examClasses?: Array<{
    classId: string;
    class: { id: string; name: string };
  }>;
  examSubjects?: ExamSubjectConfig[];
  examSchedules?: ExamScheduleItem[];
  _count?: {
    marks: number;
  };
}

export interface ExamSubjectConfig {
  id: string;
  examId: string;
  classId: string;
  subjectId: string;
  maxMarks: number;
  passMarks: number;
  theoryMaxMarks?: number | null;
  practicalMaxMarks?: number | null;
  activityMaxMarks?: number | null;
  weightagePercent?: number | null;
  allowGrace: boolean;
  maxGraceMarks?: number | null;
  class?: { id: string; name: string };
  subject?: { id: string; name: string; code: string };
}

export interface ExamScheduleItem {
  id: string;
  examId: string;
  classId: string;
  subjectId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomNumber?: string | null;
  invigilatorUserId?: string | null;
  instructions?: string | null;
  class?: { id: string; name: string };
  subject?: { id: string; name: string; code: string };
  invigilator?: { id: string; firstName: string; lastName?: string | null; email: string };
}

export interface GradeBand {
  id?: string;
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint?: number | null;
  description?: string | null;
  displayOrder: number;
}

export interface GradeScale {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isDefault: boolean;
  bands: GradeBand[];
}

export interface StudentExamMarkRecord {
  id?: string;
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  rollNumber?: string | null;
  gender?: string;
  status: 'PRESENT' | 'ABSENT' | 'EXEMPT';
  rawTheoryMarks?: number | null;
  rawPracticalMarks?: number | null;
  rawActivityMarks?: number | null;
  graceMarks?: number;
  graceReason?: string | null;
  finalMarks?: number | null;
  grade?: string | null;
  gradePoint?: number | null;
  isPassed: boolean;
  remarks?: string | null;
  version: number;
}

export interface MarksRegisterData {
  exam: {
    id: string;
    name: string;
    code: string;
    status: string;
    isLocked: boolean;
  };
  class: { id: string; name: string };
  section?: { id: string; name: string };
  subject: { id: string; name: string; code: string };
  config: {
    maxMarks: number;
    passMarks: number;
    theoryMaxMarks?: number | null;
    practicalMaxMarks?: number | null;
    activityMaxMarks?: number | null;
    allowGrace: boolean;
    maxGraceMarks?: number | null;
  };
  rows: StudentExamMarkRecord[];
}

export interface CalculatedResultItem {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber?: string | null;
  totalMarksObtained: number;
  totalMaxMarks: number;
  percentage: number;
  finalGrade?: string | null;
  gpa?: number | null;
  isPassed: boolean;
  subjectBreakdown: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    status: string;
    maxMarks: number;
    finalMarks?: number | null;
    grade?: string | null;
    isPassed: boolean;
  }>;
}

export interface StudentReportCardData {
  school: {
    name: string;
    code?: string;
    address?: string;
    contactNumber?: string;
    email?: string;
    website?: string;
    logoKey?: string;
    primaryPrintColor?: string;
    letterheadText?: string;
  };
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    rollNumber?: string | null;
    gender: string;
    dateOfBirth?: string | null;
    fatherName?: string;
    motherName?: string;
  };
  academic: {
    academicYear: string;
    term?: string;
    className: string;
    sectionName?: string;
    examName: string;
    examCode: string;
  };
  attendanceSummary: {
    totalWorkingDays: number;
    presentDays: number;
    absentDays: number;
    attendancePercentage: number;
  };
  marks: Array<{
    subjectName: string;
    subjectCode: string;
    maxMarks: number;
    passMarks: number;
    rawTheory?: number | null;
    rawPractical?: number | null;
    rawActivity?: number | null;
    graceMarks?: number;
    finalMarks?: number | null;
    grade?: string | null;
    gradePoint?: number | null;
    isPassed: boolean;
    status: string;
  }>;
  summary: {
    totalMaxMarks: number;
    totalMarksObtained: number;
    overallPercentage: number;
    overallGrade?: string | null;
    gpa?: number | null;
    isPassed: boolean;
    statusText: string;
  };
}

export interface PromotionPreviewStudent {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber?: string | null;
  currentClass: string;
  currentSection: string;
  currentPercentage?: number | null;
  isPassed?: boolean;
  suggestedOutcome: 'PROMOTE' | 'DETAIN' | 'COMPLETE';
  selectedOutcome: 'PROMOTE' | 'DETAIN' | 'COMPLETE';
  targetClassId?: string;
  targetSectionId?: string;
}

// =========================================================================
// 1. ACADEMIC OVERVIEW
// =========================================================================

export function useAcademicsOverview(academicYearId?: string) {
  return useQuery({
    queryKey: ['academics', 'overview', academicYearId],
    queryFn: async () => {
      const res = await apiClient.get('/academics/overview', {
        params: academicYearId ? { academicYearId } : {},
      });
      return res.data;
    },
  });
}

// =========================================================================
// 2. ACADEMIC TERMS
// =========================================================================

export function useAcademicTerms(academicYearId?: string) {
  return useQuery<AcademicTerm[]>({
    queryKey: ['academics', 'terms', academicYearId],
    queryFn: async () => {
      const res = await apiClient.get('/academic-terms', {
        params: academicYearId ? { academicYearId } : {},
      });
      return res.data;
    },
  });
}

export function useCreateAcademicTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<AcademicTerm>) => {
      const res = await apiClient.post('/academic-terms', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'terms'] });
      qc.invalidateQueries({ queryKey: ['academics', 'overview'] });
    },
  });
}

export function useUpdateAcademicTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AcademicTerm> }) => {
      const res = await apiClient.put(`/academic-terms/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'terms'] });
    },
  });
}

export function useDeleteAcademicTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/academic-terms/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'terms'] });
    },
  });
}

// =========================================================================
// 3. TEACHER ASSIGNMENTS
// =========================================================================

export function useClassTeacherAssignments(academicYearId?: string, classId?: string) {
  return useQuery<ClassTeacherAssignment[]>({
    queryKey: ['academics', 'class-teachers', academicYearId, classId],
    queryFn: async () => {
      const res = await apiClient.get('/academic-assignments/class-teachers', {
        params: { academicYearId, classId },
      });
      return res.data;
    },
  });
}

export function useAssignClassTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      academicYearId: string;
      classId: string;
      sectionId: string;
      teacherUserId: string;
      isPrimary?: boolean;
      notes?: string;
    }) => {
      const res = await apiClient.post('/academic-assignments/class-teachers', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'class-teachers'] });
      qc.invalidateQueries({ queryKey: ['academics', 'overview'] });
    },
  });
}

export function useRemoveClassTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/academic-assignments/class-teachers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'class-teachers'] });
    },
  });
}

export function useSubjectTeacherAssignments(academicYearId?: string, classId?: string, sectionId?: string) {
  return useQuery<SubjectTeacherAssignment[]>({
    queryKey: ['academics', 'subject-teachers', academicYearId, classId, sectionId],
    queryFn: async () => {
      const res = await apiClient.get('/academic-assignments/subject-teachers', {
        params: { academicYearId, classId, sectionId },
      });
      return res.data;
    },
  });
}

export function useAssignSubjectTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      academicYearId: string;
      classId: string;
      sectionId: string;
      subjectId: string;
      teacherUserId: string;
      isPrimary?: boolean;
      notes?: string;
    }) => {
      const res = await apiClient.post('/academic-assignments/subject-teachers', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'subject-teachers'] });
    },
  });
}

export function useRemoveSubjectTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/academic-assignments/subject-teachers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'subject-teachers'] });
    },
  });
}

// =========================================================================
// 4. PERIODS & TIMETABLE
// =========================================================================

export function useSchoolPeriods() {
  return useQuery<SchoolPeriod[]>({
    queryKey: ['academics', 'periods'],
    queryFn: async () => {
      const res = await apiClient.get('/periods');
      return res.data;
    },
  });
}

export function useCreateSchoolPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<SchoolPeriod>) => {
      const res = await apiClient.post('/periods', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'periods'] });
    },
  });
}

export function useUpdateSchoolPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SchoolPeriod> }) => {
      const res = await apiClient.put(`/periods/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'periods'] });
    },
  });
}

export function useDeleteSchoolPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/periods/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'periods'] });
    },
  });
}

export function useTimetableSlots(params: {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  teacherUserId?: string;
  dayOfWeek?: number;
}) {
  return useQuery<TimetableSlot[]>({
    queryKey: ['academics', 'timetable', params],
    queryFn: async () => {
      const res = await apiClient.get('/timetable', { params });
      return res.data;
    },
    enabled: !!(params.classId && params.sectionId) || !!params.teacherUserId,
  });
}

export function useSaveTimetableSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<TimetableSlot>) => {
      const res = await apiClient.post('/timetable/slot', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'timetable'] });
    },
  });
}

export function useBulkSaveTimetable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      academicYearId: string;
      classId: string;
      sectionId: string;
      slots: Array<{
        dayOfWeek: number;
        periodId: string;
        subjectId: string;
        teacherUserId?: string | null;
        roomNumber?: string | null;
      }>;
    }) => {
      const res = await apiClient.post('/timetable/bulk', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'timetable'] });
    },
  });
}

export function useDeleteTimetableSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/timetable/slot/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'timetable'] });
    },
  });
}

// =========================================================================
// 5. HOMEWORK
// =========================================================================

export function useHomeworkList(params: {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  assignedDate?: string;
  dueDate?: string;
}) {
  return useQuery<Homework[]>({
    queryKey: ['academics', 'homework', params],
    queryFn: async () => {
      const res = await apiClient.get('/homework', { params });
      return res.data;
    },
  });
}

export function useCreateHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Homework>) => {
      const res = await apiClient.post('/homework', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'homework'] });
    },
  });
}

export function useUpdateHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Homework> }) => {
      const res = await apiClient.put(`/homework/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'homework'] });
    },
  });
}

export function useDeleteHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/homework/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'homework'] });
    },
  });
}

// =========================================================================
// 6. EXAMS & SCHEDULES
// =========================================================================

export function useExamsList(params?: { academicYearId?: string; termId?: string; status?: string }) {
  return useQuery<Exam[]>({
    queryKey: ['academics', 'exams', params],
    queryFn: async () => {
      const res = await apiClient.get('/exams', { params });
      return res.data;
    },
  });
}

export function useExamDetail(examId: string) {
  return useQuery<Exam>({
    queryKey: ['academics', 'exams', examId],
    queryFn: async () => {
      const res = await apiClient.get(`/exams/${examId}`);
      return res.data;
    },
    enabled: !!examId,
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Exam> & { classIds?: string[] }) => {
      const res = await apiClient.post('/exams', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'exams'] });
      qc.invalidateQueries({ queryKey: ['academics', 'overview'] });
    },
  });
}

export function useUpdateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Exam> & { classIds?: string[] } }) => {
      const res = await apiClient.put(`/exams/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'exams'] });
    },
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/exams/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'exams'] });
    },
  });
}

export function useSaveExamSubjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      examId,
      subjects,
    }: {
      examId: string;
      subjects: Array<{
        classId: string;
        subjectId: string;
        maxMarks: number;
        passMarks: number;
        theoryMaxMarks?: number;
        practicalMaxMarks?: number;
        activityMaxMarks?: number;
        allowGrace?: boolean;
        maxGraceMarks?: number;
      }>;
    }) => {
      const res = await apiClient.post(`/exams/${examId}/subjects`, { subjects });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['academics', 'exams', variables.examId] });
    },
  });
}

export function useSaveExamSchedules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      examId,
      schedules,
    }: {
      examId: string;
      schedules: Array<{
        classId: string;
        subjectId: string;
        examDate: string;
        startTime: string;
        endTime: string;
        roomNumber?: string;
        invigilatorUserId?: string;
        instructions?: string;
      }>;
    }) => {
      const res = await apiClient.post(`/exams/${examId}/schedules`, { schedules });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['academics', 'exams', variables.examId] });
    },
  });
}

export function useFinalizeExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (examId: string) => {
      const res = await apiClient.post(`/exams/${examId}/finalize`);
      return res.data;
    },
    onSuccess: (_data, examId) => {
      qc.invalidateQueries({ queryKey: ['academics', 'exams', examId] });
      qc.invalidateQueries({ queryKey: ['academics', 'exams'] });
    },
  });
}

export function usePublishExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (examId: string) => {
      const res = await apiClient.post(`/exams/${examId}/publish`);
      return res.data;
    },
    onSuccess: (_data, examId) => {
      qc.invalidateQueries({ queryKey: ['academics', 'exams', examId] });
      qc.invalidateQueries({ queryKey: ['academics', 'exams'] });
    },
  });
}

export function useUnpublishExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ examId, reason }: { examId: string; reason: string }) => {
      const res = await apiClient.post(`/exams/${examId}/unpublish`, { reason });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['academics', 'exams', variables.examId] });
      qc.invalidateQueries({ queryKey: ['academics', 'exams'] });
    },
  });
}

// =========================================================================
// 7. MARKS ENTRY & MODERATION
// =========================================================================

export function useMarksRegister(params: {
  examId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
}) {
  return useQuery<MarksRegisterData>({
    queryKey: ['academics', 'marks-register', params],
    queryFn: async () => {
      const res = await apiClient.get('/marks/register', { params });
      return res.data;
    },
    enabled: !!(params.examId && params.classId && params.subjectId),
  });
}

export function useSaveMarksRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      examId: string;
      classId: string;
      sectionId?: string;
      subjectId: string;
      marks: Array<{
        studentId: string;
        status: 'PRESENT' | 'ABSENT' | 'EXEMPT';
        rawTheoryMarks?: number | null;
        rawPracticalMarks?: number | null;
        rawActivityMarks?: number | null;
        graceMarks?: number;
        graceReason?: string | null;
        remarks?: string | null;
        version?: number;
      }>;
    }) => {
      const res = await apiClient.post('/marks/register', data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['academics', 'marks-register', {
          examId: variables.examId,
          classId: variables.classId,
          sectionId: variables.sectionId,
          subjectId: variables.subjectId,
        }],
      });
      qc.invalidateQueries({ queryKey: ['academics', 'results'] });
    },
  });
}

export function useModerateMark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      examId: string;
      studentId: string;
      subjectId: string;
      rawTheoryMarks?: number;
      rawPracticalMarks?: number;
      rawActivityMarks?: number;
      graceMarks?: number;
      reason: string;
    }) => {
      const res = await apiClient.post('/marks/moderate', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'marks-register'] });
      qc.invalidateQueries({ queryKey: ['academics', 'results'] });
    },
  });
}

// =========================================================================
// 8. RESULTS & REPORT CARD
// =========================================================================

export function useCalculatedResults(params: {
  examId?: string;
  classId?: string;
  sectionId?: string;
}) {
  return useQuery<CalculatedResultItem[]>({
    queryKey: ['academics', 'results', params],
    queryFn: async () => {
      const res = await apiClient.get('/results/calculate', { params });
      return res.data;
    },
    enabled: !!(params.examId && params.classId),
  });
}

export function useStudentReportCard(params: {
  examId?: string;
  studentId?: string;
}) {
  return useQuery<StudentReportCardData>({
    queryKey: ['academics', 'report-card', params],
    queryFn: async () => {
      const res = await apiClient.get('/results/report-card', { params });
      return res.data;
    },
    enabled: !!(params.examId && params.studentId),
  });
}

// =========================================================================
// 9. GRADE SCALES
// =========================================================================

export function useGradeScales() {
  return useQuery<GradeScale[]>({
    queryKey: ['academics', 'grade-scales'],
    queryFn: async () => {
      const res = await apiClient.get('/exams/grading/scales');
      return res.data;
    },
  });
}

export function useCreateGradeScale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      code: string;
      description?: string;
      isDefault?: boolean;
      bands: GradeBand[];
    }) => {
      const res = await apiClient.post('/exams/grading/scales', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'grade-scales'] });
    },
  });
}

// =========================================================================
// 10. PROMOTIONS
// =========================================================================

export function usePromotionPreview(params: {
  sourceAcademicYearId?: string;
  sourceClassId?: string;
  sourceSectionId?: string;
  targetAcademicYearId?: string;
}) {
  return useQuery<{ students: PromotionPreviewStudent[] }>({
    queryKey: ['academics', 'promotions', 'preview', params],
    queryFn: async () => {
      const res = await apiClient.get('/promotions/preview', { params });
      return res.data;
    },
    enabled: !!(params.sourceAcademicYearId && params.sourceClassId),
  });
}

export function useExecutePromotions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      sourceAcademicYearId: string;
      sourceClassId: string;
      sourceSectionId?: string;
      targetAcademicYearId?: string;
      promotions: Array<{
        studentId: string;
        outcome: 'PROMOTE' | 'DETAIN' | 'COMPLETE';
        targetClassId?: string;
        targetSectionId?: string;
        notes?: string;
      }>;
    }) => {
      const res = await apiClient.post('/promotions/execute', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academics', 'promotions'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
