import { z } from 'zod';

export const createAcademicTermSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50),
  academicYearId: z.string().uuid('Invalid academic year ID'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  displayOrder: z.number().int().optional().default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  isActive: z.boolean().optional(),
});

export const updateAcademicTermSchema = createAcademicTermSchema.partial().omit({ academicYearId: true });

export const assignClassTeacherSchema = z.object({
  academicYearId: z.string().uuid('Invalid academic year ID'),
  classId: z.string().uuid('Invalid class ID'),
  sectionId: z.string().uuid('Invalid section ID'),
  teacherUserId: z.string().uuid('Invalid teacher user ID'),
  isPrimary: z.boolean().optional().default(true),
});

export const assignSubjectTeacherSchema = z.object({
  academicYearId: z.string().uuid('Invalid academic year ID'),
  classId: z.string().uuid('Invalid class ID'),
  sectionId: z.string().uuid('Invalid section ID'),
  subjectId: z.string().uuid('Invalid subject ID'),
  teacherUserId: z.string().uuid('Invalid teacher user ID'),
  isPrimary: z.boolean().optional().default(true),
});

export const createSchoolPeriodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  periodNumber: z.number().int().optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be HH:mm'),
  displayOrder: z.number().int().optional().default(0),
  type: z.enum(['TEACHING', 'BREAK', 'LUNCH', 'ASSEMBLY', 'OTHER']).optional().default('TEACHING'),
  dayOfWeek: z.number().int().min(1).max(7).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateSchoolPeriodSchema = createSchoolPeriodSchema.partial();

export const saveTimetableSlotSchema = z.object({
  academicYearId: z.string().uuid(),
  termId: z.string().uuid().optional().nullable(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  dayOfWeek: z.number().int().min(1).max(7),
  periodId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherUserId: z.string().uuid(),
  room: z.string().max(50).optional().nullable(),
});

export const bulkSaveTimetableSlotsSchema = z.object({
  academicYearId: z.string().uuid(),
  termId: z.string().uuid().optional().nullable(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  slots: z.array(
    z.object({
      dayOfWeek: z.number().int().min(1).max(7),
      periodId: z.string().uuid(),
      subjectId: z.string().uuid(),
      teacherUserId: z.string().uuid(),
      room: z.string().max(50).optional().nullable(),
    })
  ),
});

export const createHomeworkSchema = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(200),
  instructions: z.string().min(1, 'Instructions are required'),
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Assigned date must be YYYY-MM-DD'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
  attachmentKey: z.string().max(500).optional().nullable(),
  attachmentName: z.string().max(255).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().default('DRAFT'),
});

export const updateHomeworkSchema = createHomeworkSchema.partial().omit({ academicYearId: true });

export const createExamSchema = z.object({
  academicYearId: z.string().uuid(),
  termId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Exam name is required').max(150),
  code: z.string().min(1, 'Exam code is required').max(50),
  examType: z.enum(['UNIT_TEST', 'MID_TERM', 'TERM', 'FINAL', 'PRACTICAL', 'INTERNAL', 'OTHER']).optional().default('MID_TERM'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  classIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateExamSchema = createExamSchema.partial().omit({ academicYearId: true });

export const configureExamSubjectsSchema = z.object({
  subjects: z.array(
    z.object({
      classId: z.string().uuid(),
      subjectId: z.string().uuid(),
      maxMarks: z.number().positive('Max marks must be greater than zero'),
      passMarks: z.number().min(0, 'Pass marks cannot be negative'),
      theoryMaxMarks: z.number().min(0).optional().nullable(),
      practicalMaxMarks: z.number().min(0).optional().nullable(),
      activityMaxMarks: z.number().min(0).optional().nullable(),
      allowGrace: z.boolean().optional().default(false),
      maxGraceMarks: z.number().min(0).optional().nullable(),
      weightage: z.number().min(0).max(100).optional().default(100),
    })
  ),
});

export const saveExamScheduleSchema = z.object({
  schedules: z.array(
    z.object({
      classId: z.string().uuid(),
      subjectId: z.string().uuid(),
      examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Exam date must be YYYY-MM-DD'),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:mm'),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be HH:mm'),
      durationMinutes: z.number().int().positive().optional().nullable(),
      room: z.string().max(50).optional().nullable(),
      roomNumber: z.string().max(50).optional().nullable(),
      invigilatorUserId: z.string().uuid().optional().nullable(),
    })
  ),
});

export const createGradeScaleSchema = z.object({
  name: z.string().min(1, 'Scale name is required').max(100),
  isDefault: z.boolean().optional().default(false),
  bands: z.array(
    z.object({
      grade: z.string().min(1).max(20),
      minPercentage: z.number().min(0).max(100),
      maxPercentage: z.number().min(0).max(100),
      gradePoint: z.number().min(0).optional().nullable(),
      description: z.string().max(100).optional().nullable(),
      resultStatus: z.enum(['PASS', 'FAIL']).optional().default('PASS'),
    })
  ).min(1, 'At least one grade band is required'),
});

export const updateGradeScaleSchema = createGradeScaleSchema.partial();

export const markEntryItemSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(['PRESENT', 'ABSENT', 'EXEMPT']).default('PRESENT'),
  rawTheoryMarks: z.number().min(0).optional().nullable(),
  rawPracticalMarks: z.number().min(0).optional().nullable(),
  rawActivityMarks: z.number().min(0).optional().nullable(),
  graceMarks: z.number().min(0).optional().default(0),
  graceReason: z.string().max(255).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
  version: z.number().int().optional().default(1),
});

export const saveMarksRegisterSchema = z.object({
  examId: z.string().uuid(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid().optional().nullable(),
  subjectId: z.string().uuid(),
  marks: z.array(markEntryItemSchema),
});

export const moderateMarksSchema = z.object({
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  status: z.enum(['PRESENT', 'ABSENT', 'EXEMPT']).optional(),
  rawTheoryMarks: z.number().min(0).optional().nullable(),
  rawPracticalMarks: z.number().min(0).optional().nullable(),
  rawActivityMarks: z.number().min(0).optional().nullable(),
  graceMarks: z.number().min(0).optional().nullable(),
  graceReason: z.string().max(255).optional().nullable(),
  reason: z.string().min(1, 'Correction reason is mandatory'),
});

export const executePromotionSchema = z.object({
  fromAcademicYearId: z.string().uuid().optional(),
  sourceAcademicYearId: z.string().uuid().optional(),
  fromClassId: z.string().uuid().optional(),
  sourceClassId: z.string().uuid().optional(),
  fromSectionId: z.string().uuid().optional().nullable(),
  sourceSectionId: z.string().uuid().optional().nullable(),
  toAcademicYearId: z.string().uuid().optional().nullable(),
  targetAcademicYearId: z.string().uuid().optional().nullable(),
  toClassId: z.string().uuid().optional().nullable(),
  targetClassId: z.string().uuid().optional().nullable(),
  toSectionId: z.string().uuid().optional().nullable(),
  targetSectionId: z.string().uuid().optional().nullable(),
  promotions: z.array(
    z.object({
      studentId: z.string().uuid(),
      decision: z.enum(['PROMOTE', 'DETAIN', 'COMPLETE']).optional(),
      outcome: z.enum(['PROMOTE', 'DETAIN', 'COMPLETE']).optional(),
      toAcademicYearId: z.string().uuid().optional().nullable(),
      targetAcademicYearId: z.string().uuid().optional().nullable(),
      toClassId: z.string().uuid().optional().nullable(),
      targetClassId: z.string().uuid().optional().nullable(),
      toSectionId: z.string().uuid().optional().nullable(),
      targetSectionId: z.string().uuid().optional().nullable(),
      remarks: z.string().max(255).optional().nullable(),
      notes: z.string().max(255).optional().nullable(),
    })
  ).min(1, 'At least one student must be selected for promotion'),
});
