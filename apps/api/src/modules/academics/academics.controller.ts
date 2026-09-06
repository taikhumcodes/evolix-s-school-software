import { Request, Response, NextFunction } from 'express';
import { AcademicsService, ScopeContext } from './academics.service.js';
import { ValidationError } from '../../lib/errors.js';

function getScopeContext(req: Request): ScopeContext {
  const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
  const rawSchoolId = req.headers['x-school-id'];
  const headerSchoolId = Array.isArray(rawSchoolId) ? rawSchoolId[0] : rawSchoolId;
  const schoolId =
    headerSchoolId ||
    (req as any).schoolId ||
    (req as any).user?.schoolId ||
    (req as any).user?.schools?.[0]?.id;

  if (!tenantId || !schoolId) {
    throw new ValidationError('Tenant and School context are required', {
      code: 'SCOPE_REQUIRED',
    });
  }

  const userPerms = (req as any).user?.permissions;
  const permissions: string[] = userPerms
    ? Array.from(userPerms).map((p: any) => String(p).toLowerCase())
    : [];

  const isSuperadmin = Boolean((req as any).user?.isSuperadmin);
  if (isSuperadmin) {
    permissions.push(
      'academics.manage',
      'timetable.manage',
      'homework.manage',
      'exams.manage',
      'marks.enter',
      'marks.moderate',
      'results.finalize',
      'results.publish',
      'promotion.manage'
    );
  }

  return {
    tenantId,
    schoolId,
    userId: (req as any).user?.id || (req as any).userId,
    ipAddress: req.ip,
    permissions,
    isSuperadmin,
  };
}

function getParam(param: any): string {
  if (!param) return '';
  return Array.isArray(param) ? String(param[0]) : String(param);
}

export class AcademicsController {
  // 1. Overview
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const academicYearId = req.query.academicYearId ? getParam(req.query.academicYearId) : undefined;
      const data = await AcademicsService.getAcademicsOverview(ctx, academicYearId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 2. Terms
  static async getTerms(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const academicYearId = req.query.academicYearId ? getParam(req.query.academicYearId) : undefined;
      const data = await AcademicsService.getAcademicTerms(ctx, academicYearId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async createTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.createAcademicTerm(ctx, req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async updateTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.updateAcademicTerm(ctx, getParam(req.params.id), req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async deleteTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.deleteAcademicTerm(ctx, getParam(req.params.id));
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 3. Class Teachers
  static async getClassTeachers(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const academicYearId = req.query.academicYearId ? getParam(req.query.academicYearId) : undefined;
      const classId = req.query.classId ? getParam(req.query.classId) : undefined;
      const data = await AcademicsService.getClassTeacherAssignments(ctx, academicYearId, classId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async assignClassTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.assignClassTeacher(ctx, req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async removeClassTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.removeClassTeacher(ctx, getParam(req.params.id));
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 4. Subject Teachers
  static async getSubjectTeachers(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const academicYearId = req.query.academicYearId ? getParam(req.query.academicYearId) : undefined;
      const classId = req.query.classId ? getParam(req.query.classId) : undefined;
      const sectionId = req.query.sectionId ? getParam(req.query.sectionId) : undefined;
      const data = await AcademicsService.getSubjectTeacherAssignments(ctx, academicYearId, classId, sectionId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async assignSubjectTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.assignSubjectTeacher(ctx, req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async removeSubjectTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.removeSubjectTeacher(ctx, getParam(req.params.id));
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async getMyAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const academicYearId = req.query.academicYearId ? getParam(req.query.academicYearId) : undefined;
      const data = await AcademicsService.getTeacherAssignments(ctx, ctx.userId, academicYearId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 5. Periods
  static async getPeriods(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const dayOfWeek = req.query.dayOfWeek ? Number(req.query.dayOfWeek) : undefined;
      const data = await AcademicsService.getSchoolPeriods(ctx, dayOfWeek);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async createPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.createSchoolPeriod(ctx, req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async updatePeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.updateSchoolPeriod(ctx, getParam(req.params.id), req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async deletePeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.deleteSchoolPeriod(ctx, getParam(req.params.id));
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 6. Timetable
  static async getClassTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const academicYearId = getParam(req.query.academicYearId);
      const classId = getParam(req.query.classId);
      const sectionId = getParam(req.query.sectionId);
      const termId = req.query.termId ? getParam(req.query.termId) : undefined;

      if (!academicYearId || !classId || !sectionId) {
        throw new ValidationError('academicYearId, classId, and sectionId are required', {
          code: 'PARAMS_REQUIRED',
        });
      }

      const data = await AcademicsService.getClassTimetable(ctx, {
        academicYearId,
        classId,
        sectionId,
        termId,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async getTeacherTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const teacherUserId = getParam(req.params.teacherUserId) || ctx.userId;
      const academicYearId = getParam(req.query.academicYearId);

      if (!academicYearId) {
        throw new ValidationError('academicYearId is required', { code: 'YEAR_REQUIRED' });
      }

      const data = await AcademicsService.getTeacherTimetable(ctx, teacherUserId, academicYearId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async saveTimetableSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.saveTimetableSlot(ctx, req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async bulkSaveTimetableSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.bulkSaveTimetableSlots(ctx, req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async deleteTimetableSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.deleteTimetableSlot(ctx, getParam(req.params.id));
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 7. Homework
  static async getHomework(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const academicYearId = req.query.academicYearId ? getParam(req.query.academicYearId) : undefined;
      const classId = req.query.classId ? getParam(req.query.classId) : undefined;
      const sectionId = req.query.sectionId ? getParam(req.query.sectionId) : undefined;
      const subjectId = req.query.subjectId ? getParam(req.query.subjectId) : undefined;
      const status = req.query.status ? getParam(req.query.status) : undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const data = await AcademicsService.getHomeworkList(ctx, {
        academicYearId,
        classId,
        sectionId,
        subjectId,
        status,
        page,
        limit,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async createHomework(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.createHomework(ctx, req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async updateHomework(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.updateHomework(ctx, getParam(req.params.id), req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async getParentHomework(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.getParentHomework(ctx, getParam(req.params.studentId));
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 8. Exams
  static async getExams(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const academicYearId = req.query.academicYearId ? getParam(req.query.academicYearId) : undefined;
      const status = req.query.status ? getParam(req.query.status) : undefined;
      const data = await AcademicsService.getExams(ctx, academicYearId, status);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async getExamDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.getExamDetail(ctx, getParam(req.params.id));
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async createExam(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.createExam(ctx, req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  static async updateExam(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.updateExam(ctx, getParam(req.params.id), req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async configureExamSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.configureExamSubjects(ctx, getParam(req.params.id), req.body.subjects);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async saveExamSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const examId = getParam(req.params.id || req.params.examId);
      const data = await AcademicsService.saveExamSchedule(ctx, examId, req.body.schedules);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 9. Grade Scales
  static async getGradeScales(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.getGradeScales(ctx);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async createGradeScale(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.createGradeScale(ctx, req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  // 10. Marks Entry
  static async getMarksRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const examId = getParam(req.query.examId);
      const classId = getParam(req.query.classId);
      const sectionId = req.query.sectionId ? getParam(req.query.sectionId) : undefined;
      const subjectId = getParam(req.query.subjectId);

      if (!examId || !classId || !subjectId) {
        throw new ValidationError('examId, classId, and subjectId are required', {
          code: 'PARAMS_REQUIRED',
        });
      }

      const data = await AcademicsService.getMarksRegister(ctx, {
        examId,
        classId,
        sectionId,
        subjectId,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async saveMarksRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.saveMarksRegister(ctx, req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async moderateMarks(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const data = await AcademicsService.moderateFinalizedMark(ctx, req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 11. Results & Finalization
  static async getExamResults(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const examId = getParam(req.params.examId);
      const classId = getParam(req.query.classId);
      const sectionId = req.query.sectionId ? getParam(req.query.sectionId) : undefined;

      if (!classId) {
        throw new ValidationError('classId is required', { code: 'CLASS_REQUIRED' });
      }

      const data = await AcademicsService.getExamResults(ctx, { examId, classId, sectionId });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async finalizeExam(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const examId = getParam(req.params.examId || req.params.id);
      const data = await AcademicsService.finalizeExam(ctx, examId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async publishExam(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const examId = getParam(req.params.examId || req.params.id);
      const data = await AcademicsService.publishExam(ctx, examId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async unpublishExam(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const { reason } = req.body;
      const examId = getParam(req.params.examId || req.params.id);
      const data = await AcademicsService.unpublishExam(ctx, examId, reason);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 12. Report Card
  static async getStudentReportCard(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const examId = getParam(req.params.examId || req.params.id || req.query.examId);
      const studentId = getParam(req.params.studentId || req.query.studentId);
      const data = await AcademicsService.getStudentReportCard(ctx, examId, studentId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 13. Promotion
  static async getPromotionRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const fromAcademicYearId = getParam(req.query.fromAcademicYearId || req.query.sourceAcademicYearId);
      const classId = getParam(req.query.classId || req.query.sourceClassId);
      const sectionId = (req.query.sectionId || req.query.sourceSectionId) ? getParam(req.query.sectionId || req.query.sourceSectionId) : undefined;

      if (!fromAcademicYearId || !classId) {
        throw new ValidationError('fromAcademicYearId and classId are required', {
          code: 'PARAMS_REQUIRED',
        });
      }

      const data = await AcademicsService.getPromotionRegister(ctx, {
        fromAcademicYearId,
        classId,
        sectionId,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async executePromotion(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const b = req.body;
      const normalizedBody = {
        fromAcademicYearId: b.fromAcademicYearId || b.sourceAcademicYearId,
        fromClassId: b.fromClassId || b.sourceClassId,
        fromSectionId: b.fromSectionId || b.sourceSectionId,
        toAcademicYearId: b.toAcademicYearId || b.targetAcademicYearId,
        toClassId: b.toClassId || b.targetClassId,
        toSectionId: b.toSectionId || b.targetSectionId,
        promotions: Array.isArray(b.promotions)
          ? b.promotions.map((p: any) => ({
              studentId: p.studentId,
              decision: p.decision || p.outcome,
              toAcademicYearId: p.toAcademicYearId || p.targetAcademicYearId,
              toClassId: p.toClassId || p.targetClassId,
              toSectionId: p.toSectionId || p.targetSectionId,
              remarks: p.remarks || p.notes,
            }))
          : [],
      };
      const data = await AcademicsService.executePromotion(ctx, normalizedBody);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  // 14. CSV Exports
  static async exportMarksCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const examId = getParam(req.query.examId);
      const classId = getParam(req.query.classId);
      const sectionId = req.query.sectionId ? getParam(req.query.sectionId) : undefined;
      const subjectId = getParam(req.query.subjectId);

      const register = await AcademicsService.getMarksRegister(ctx, {
        examId,
        classId,
        sectionId,
        subjectId,
      });

      const csvRows = [
        ['Roll Number', 'Admission Number', 'Student Name', 'Section', 'Status', 'Theory', 'Practical', 'Activity', 'Grace', 'Final Marks', 'Grade', 'Passed'],
      ];

      for (const s of register.students) {
        csvRows.push([
          `"${s.rollNumber}"`,
          `"${s.admissionNumber}"`,
          `"${s.studentName}"`,
          `"${s.sectionName}"`,
          `"${s.status}"`,
          s.rawTheoryMarks !== null ? String(s.rawTheoryMarks) : '',
          s.rawPracticalMarks !== null ? String(s.rawPracticalMarks) : '',
          s.rawActivityMarks !== null ? String(s.rawActivityMarks) : '',
          String(s.graceMarks),
          s.finalMarks !== null ? String(s.finalMarks) : '',
          s.grade || '',
          s.isPassed === true ? 'YES' : s.isPassed === false ? 'NO' : '',
        ]);
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="marks_${register.exam.code}_${register.subject.code}.csv"`);
      res.send(csvRows.map((r) => r.join(',')).join('\n'));
    } catch (err) {
      next(err);
    }
  }

  static async exportResultsCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = getScopeContext(req);
      const examId = getParam(req.params.examId);
      const classId = getParam(req.query.classId);
      const sectionId = req.query.sectionId ? getParam(req.query.sectionId) : undefined;

      const data = await AcademicsService.getExamResults(ctx, { examId, classId, sectionId });

      const header = ['Roll Number', 'Admission Number', 'Student Name', 'Section'];
      for (const s of data.subjects) {
        header.push(`${s.name} (${s.maxMarks})`);
      }
      header.push('Total Obtained', 'Total Max', 'Percentage', 'Grade', 'Result');

      const rows = [header.map((h) => `"${h}"`)];
      for (const r of data.results) {
        const row = [
          `"${r.rollNumber}"`,
          `"${r.admissionNumber}"`,
          `"${r.studentName}"`,
          `"${r.sectionName}"`,
        ];
        for (const s of data.subjects) {
          const subDetail = r.subjectDetails.find((d) => d.subjectId === s.id);
          row.push(subDetail && subDetail.finalMarks !== null ? String(subDetail.finalMarks) : (subDetail?.status || '—'));
        }
        row.push(
          String(r.totalObtained),
          String(r.totalMax),
          `${r.percentage}%`,
          `"${r.overallGrade}"`,
          `"${r.overallResult}"`
        );
        rows.push(row);
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="results_${data.exam.code}.csv"`);
      res.send(rows.map((r) => r.join(',')).join('\n'));
    } catch (err) {
      next(err);
    }
  }
}
