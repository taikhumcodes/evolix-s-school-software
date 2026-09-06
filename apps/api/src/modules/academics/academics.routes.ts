import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions, requireAnyPermission } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { AcademicsController } from './academics.controller.js';
import {
  createAcademicTermSchema,
  updateAcademicTermSchema,
  assignClassTeacherSchema,
  assignSubjectTeacherSchema,
  createSchoolPeriodSchema,
  updateSchoolPeriodSchema,
  saveTimetableSlotSchema,
  bulkSaveTimetableSlotsSchema,
  createHomeworkSchema,
  updateHomeworkSchema,
  createExamSchema,
  updateExamSchema,
  configureExamSubjectsSchema,
  saveExamScheduleSchema,
  createGradeScaleSchema,
  saveMarksRegisterSchema,
  moderateMarksSchema,
  executePromotionSchema,
} from './academics.schema.js';

// 1. Academics Main / Overview Router
export const academicsRouter = Router();
academicsRouter.use(authenticate);

academicsRouter.get(
  '/overview',
  requireAnyPermission(['academics.view', 'academics.manage', 'exams.view', 'timetable.view']),
  AcademicsController.getOverview
);

// 2. Terms Router
export const academicTermsRouter = Router();
academicTermsRouter.use(authenticate);

academicTermsRouter.get(
  '/',
  requireAnyPermission(['academics.view', 'academics.manage']),
  AcademicsController.getTerms
);
academicTermsRouter.post(
  '/',
  requirePermissions(['academics.manage']),
  validateRequest({ body: createAcademicTermSchema }),
  AcademicsController.createTerm
);
academicTermsRouter.put(
  '/:id',
  requirePermissions(['academics.manage']),
  validateRequest({ body: updateAcademicTermSchema }),
  AcademicsController.updateTerm
);
academicTermsRouter.delete(
  '/:id',
  requirePermissions(['academics.manage']),
  AcademicsController.deleteTerm
);

// 3. Teacher Assignments Router
export const academicAssignmentsRouter = Router();
academicAssignmentsRouter.use(authenticate);

academicAssignmentsRouter.get(
  '/class-teachers',
  requireAnyPermission(['academics.view', 'academics.manage']),
  AcademicsController.getClassTeachers
);
academicAssignmentsRouter.post(
  '/class-teachers',
  requirePermissions(['academics.manage']),
  validateRequest({ body: assignClassTeacherSchema }),
  AcademicsController.assignClassTeacher
);
academicAssignmentsRouter.delete(
  '/class-teachers/:id',
  requirePermissions(['academics.manage']),
  AcademicsController.removeClassTeacher
);

academicAssignmentsRouter.get(
  '/subject-teachers',
  requireAnyPermission(['academics.view', 'academics.manage']),
  AcademicsController.getSubjectTeachers
);
academicAssignmentsRouter.post(
  '/subject-teachers',
  requirePermissions(['academics.manage']),
  validateRequest({ body: assignSubjectTeacherSchema }),
  AcademicsController.assignSubjectTeacher
);
academicAssignmentsRouter.delete(
  '/subject-teachers/:id',
  requirePermissions(['academics.manage']),
  AcademicsController.removeSubjectTeacher
);

academicAssignmentsRouter.get(
  '/my',
  requireAnyPermission(['academics.view', 'homework.view', 'timetable.view', 'marks.enter']),
  AcademicsController.getMyAssignments
);

// 4. Periods Router
export const periodsRouter = Router();
periodsRouter.use(authenticate);

periodsRouter.get(
  '/',
  requireAnyPermission(['timetable.view', 'timetable.manage']),
  AcademicsController.getPeriods
);
periodsRouter.post(
  '/',
  requirePermissions(['timetable.manage']),
  validateRequest({ body: createSchoolPeriodSchema }),
  AcademicsController.createPeriod
);
periodsRouter.put(
  '/:id',
  requirePermissions(['timetable.manage']),
  validateRequest({ body: updateSchoolPeriodSchema }),
  AcademicsController.updatePeriod
);
periodsRouter.delete(
  '/:id',
  requirePermissions(['timetable.manage']),
  AcademicsController.deletePeriod
);

// 5. Timetable Router
export const timetableRouter = Router();
timetableRouter.use(authenticate);

timetableRouter.get(
  '/class',
  requireAnyPermission(['timetable.view', 'timetable.manage']),
  AcademicsController.getClassTimetable
);
timetableRouter.get(
  '/teacher/:teacherUserId',
  requireAnyPermission(['timetable.view', 'timetable.manage']),
  AcademicsController.getTeacherTimetable
);
timetableRouter.get(
  '/my',
  requireAnyPermission(['timetable.view', 'timetable.manage']),
  AcademicsController.getTeacherTimetable
);
timetableRouter.post(
  '/slot',
  requirePermissions(['timetable.manage']),
  validateRequest({ body: saveTimetableSlotSchema }),
  AcademicsController.saveTimetableSlot
);
timetableRouter.post(
  '/bulk',
  requirePermissions(['timetable.manage']),
  validateRequest({ body: bulkSaveTimetableSlotsSchema }),
  AcademicsController.bulkSaveTimetableSlots
);
timetableRouter.delete(
  '/slot/:id',
  requirePermissions(['timetable.manage']),
  AcademicsController.deleteTimetableSlot
);

// 6. Homework Router
export const homeworkRouter = Router();
homeworkRouter.use(authenticate);

homeworkRouter.get(
  '/',
  requireAnyPermission(['homework.view', 'homework.manage']),
  AcademicsController.getHomework
);
homeworkRouter.post(
  '/',
  requireAnyPermission(['homework.manage', 'homework.view']),
  validateRequest({ body: createHomeworkSchema }),
  AcademicsController.createHomework
);
homeworkRouter.put(
  '/:id',
  requireAnyPermission(['homework.manage', 'homework.view']),
  validateRequest({ body: updateHomeworkSchema }),
  AcademicsController.updateHomework
);
homeworkRouter.get(
  '/student/:studentId',
  requireAnyPermission(['parent.homework.view', 'homework.view']),
  AcademicsController.getParentHomework
);

// 7. Exams Router
export const examsRouter = Router();
examsRouter.use(authenticate);

examsRouter.get(
  '/',
  requireAnyPermission(['exams.view', 'exams.manage']),
  AcademicsController.getExams
);
examsRouter.get(
  '/grade-scales',
  requireAnyPermission(['exams.view', 'exams.manage']),
  AcademicsController.getGradeScales
);
examsRouter.get(
  '/grading/scales',
  requireAnyPermission(['exams.view', 'exams.manage']),
  AcademicsController.getGradeScales
);
examsRouter.post(
  '/grade-scales',
  requirePermissions(['exams.manage']),
  validateRequest({ body: createGradeScaleSchema }),
  AcademicsController.createGradeScale
);
examsRouter.post(
  '/grading/scales',
  requirePermissions(['exams.manage']),
  validateRequest({ body: createGradeScaleSchema }),
  AcademicsController.createGradeScale
);
examsRouter.get(
  '/:id',
  requireAnyPermission(['exams.view', 'exams.manage']),
  AcademicsController.getExamDetail
);
examsRouter.post(
  '/',
  requirePermissions(['exams.manage']),
  validateRequest({ body: createExamSchema }),
  AcademicsController.createExam
);
examsRouter.put(
  '/:id',
  requirePermissions(['exams.manage']),
  validateRequest({ body: updateExamSchema }),
  AcademicsController.updateExam
);
examsRouter.post(
  '/:id/subjects',
  requirePermissions(['exams.manage']),
  validateRequest({ body: configureExamSubjectsSchema }),
  AcademicsController.configureExamSubjects
);
examsRouter.post(
  '/:id/schedule',
  requirePermissions(['exams.manage']),
  validateRequest({ body: saveExamScheduleSchema }),
  AcademicsController.saveExamSchedule
);
examsRouter.post(
  '/:id/schedules',
  requirePermissions(['exams.manage']),
  validateRequest({ body: saveExamScheduleSchema }),
  AcademicsController.saveExamSchedule
);
examsRouter.post(
  '/:id/finalize',
  requirePermissions(['results.finalize']),
  AcademicsController.finalizeExam
);
examsRouter.post(
  '/:id/publish',
  requirePermissions(['results.publish']),
  AcademicsController.publishExam
);
examsRouter.post(
  '/:id/unpublish',
  requirePermissions(['results.publish']),
  AcademicsController.unpublishExam
);

// 8. Marks Router
export const marksRouter = Router();
marksRouter.use(authenticate);

marksRouter.get(
  '/register',
  requireAnyPermission(['marks.view', 'marks.enter']),
  AcademicsController.getMarksRegister
);
marksRouter.post(
  '/register',
  requirePermissions(['marks.enter']),
  validateRequest({ body: saveMarksRegisterSchema }),
  AcademicsController.saveMarksRegister
);
marksRouter.post(
  '/moderate',
  requirePermissions(['marks.moderate']),
  validateRequest({ body: moderateMarksSchema }),
  AcademicsController.moderateMarks
);
marksRouter.get(
  '/export',
  requireAnyPermission(['marks.view', 'marks.enter']),
  AcademicsController.exportMarksCsv
);

// 9. Results Router
export const resultsRouter = Router();
resultsRouter.use(authenticate);

resultsRouter.get(
  '/exam/:examId',
  requireAnyPermission(['results.view', 'results.finalize', 'results.publish']),
  AcademicsController.getExamResults
);
resultsRouter.get(
  '/calculate',
  requireAnyPermission(['results.view', 'results.finalize', 'results.publish']),
  (req, res, next) => {
    req.params.examId = String(req.query.examId || '');
    return AcademicsController.getExamResults(req, res, next);
  }
);
resultsRouter.get(
  '/report-card',
  requireAnyPermission(['results.view', 'parent.results.view']),
  (req, res, next) => {
    req.params.examId = String(req.query.examId || '');
    req.params.studentId = String(req.query.studentId || '');
    return AcademicsController.getStudentReportCard(req, res, next);
  }
);
resultsRouter.post(
  '/:examId/finalize',
  requirePermissions(['results.finalize']),
  AcademicsController.finalizeExam
);
resultsRouter.post(
  '/:examId/publish',
  requirePermissions(['results.publish']),
  AcademicsController.publishExam
);
resultsRouter.post(
  '/:examId/unpublish',
  requirePermissions(['results.publish']),
  AcademicsController.unpublishExam
);
resultsRouter.get(
  '/:examId/student/:studentId',
  requireAnyPermission(['results.view', 'parent.results.view']),
  AcademicsController.getStudentReportCard
);
resultsRouter.get(
  '/export/:examId',
  requireAnyPermission(['results.view']),
  AcademicsController.exportResultsCsv
);

// 10. Promotions Router
export const promotionsRouter = Router();
promotionsRouter.use(authenticate);

promotionsRouter.get(
  '/register',
  requireAnyPermission(['promotion.view', 'promotion.manage']),
  AcademicsController.getPromotionRegister
);
promotionsRouter.get(
  '/preview',
  requireAnyPermission(['promotion.view', 'promotion.manage']),
  (req, res, next) => {
    req.query.fromAcademicYearId = req.query.fromAcademicYearId || req.query.sourceAcademicYearId;
    req.query.classId = req.query.classId || req.query.sourceClassId;
    req.query.sectionId = req.query.sectionId || req.query.sourceSectionId;
    return AcademicsController.getPromotionRegister(req, res, next);
  }
);
promotionsRouter.post(
  '/execute',
  requirePermissions(['promotion.manage']),
  validateRequest({ body: executePromotionSchema }),
  AcademicsController.executePromotion
);
