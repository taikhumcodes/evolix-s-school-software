import { Request, Response, NextFunction } from 'express';
import { StudentsService } from './students.service.js';
import { ValidationError, ForbiddenError } from '../../lib/errors.js';
import { getClientIp } from '../../lib/ip.js';
import { prisma } from '../../lib/prisma.js';

const getIp = (req: Request): string | undefined => {
  const ip = getClientIp(req);
  return Array.isArray(ip) ? ip[0] : ip;
};

export class StudentsController {
  public static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const overview = await StudentsService.getOverview(
        tenantId,
        schoolId,
        req.query.academic_year_id as string
      );
      res.json(overview);
    } catch (err) {
      next(err);
    }
  }

  public static async suggestRollNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const academicYearId = req.query.academic_year_id as string;
      const classId = req.query.class_id as string;
      const sectionId = req.query.section_id as string | undefined;

      if (!academicYearId || !classId) {
        return res.json({ rollNumber: '1' });
      }

      const rollNumber = await StudentsService.suggestRollNumber(
        tenantId,
        schoolId,
        academicYearId,
        classId,
        sectionId
      );

      res.json({ rollNumber });
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const isStaffWithStudentView =
        req.user?.isSuperadmin || req.user?.permissions.has('students.view');

      // Check if user is linked to a guardian profile
      const linkedGuardian = await prisma.guardian.findUnique({
        where: { userId: req.user!.id },
        include: {
          students: { select: { studentId: true } },
          familyGuardians: {
            include: {
              family: {
                include: {
                  students: { select: { studentId: true } },
                },
              },
            },
          },
        },
      });

      let studentIdsFilter: string[] | undefined = undefined;

      // If user is a parent (has linked guardian or lacks staff students.view permission)
      if (linkedGuardian || !isStaffWithStudentView) {
        if (!linkedGuardian) {
          throw new ForbiddenError('Access denied. No guardian profile linked to this user account.');
        }

        const allowedStudentIds = new Set<string>();
        for (const sg of linkedGuardian.students) {
          allowedStudentIds.add(sg.studentId);
        }
        for (const fg of linkedGuardian.familyGuardians) {
          for (const fs of fg.family.students) {
            allowedStudentIds.add(fs.studentId);
          }
        }
        studentIdsFilter = Array.from(allowedStudentIds);
      }

      const result = await StudentsService.listStudents(tenantId, schoolId, {
        academicYearId: req.query.academic_year_id as string,
        classId: req.query.class_id as string,
        sectionId: req.query.section_id as string,
        status: req.query.status as string,
        gender: req.query.gender as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        studentIds: studentIdsFilter,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const isStaffWithStudentView =
        req.user?.isSuperadmin || req.user?.permissions.has('students.view');

      // Check if user is linked to a guardian profile
      const linkedGuardian = await prisma.guardian.findUnique({
        where: { userId: req.user!.id },
        include: {
          students: { select: { studentId: true } },
          familyGuardians: {
            include: {
              family: {
                include: {
                  students: { select: { studentId: true } },
                },
              },
            },
          },
        },
      });

      // If user is a parent (has linked guardian or lacks staff students.view permission)
      if (linkedGuardian || !isStaffWithStudentView) {
        if (!linkedGuardian) {
          throw new ForbiddenError('Access denied. No guardian profile linked to this user account.');
        }

        const allowedStudentIds = new Set<string>();
        for (const sg of linkedGuardian.students) {
          allowedStudentIds.add(sg.studentId);
        }
        for (const fg of linkedGuardian.familyGuardians) {
          for (const fs of fg.family.students) {
            allowedStudentIds.add(fs.studentId);
          }
        }

        const studentId = req.params.id as string;
        if (!allowedStudentIds.has(studentId)) {
          throw new ForbiddenError('Access denied. You are not authorized to view this student.');
        }

        // Parent child access: strictly omit discipline records and internal confidential notes
        const student = await StudentsService.getStudentById(
          tenantId,
          schoolId,
          studentId,
          false, // includeDiscipline = false
          false  // includeConfidentialNotes = false
        );

        return res.json(student);
      }

      // Staff access
      const hasDisciplinePerm =
        req.user?.isSuperadmin ||
        req.user?.permissions.has('student.discipline.view') ||
        req.user?.permissions.has('student.discipline.manage');

      const canViewConfidentialNotes =
        req.user?.isSuperadmin ||
        req.user?.permissions.has('students.manage');

      const student = await StudentsService.getStudentById(
        tenantId,
        schoolId,
        req.params.id as string,
        Boolean(hasDisciplinePerm),
        Boolean(canViewConfidentialNotes)
      );

      res.json(student);
    } catch (err) {
      next(err);
    }
  }

  public static async createDirect(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await StudentsService.createStudentDirect(
        tenantId,
        schoolId,
        req.user?.id,
        req.body,
        getIp(req)
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const updated = await StudentsService.updateStudent(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        req.body,
        getIp(req)
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const file = req.file;
      if (!file) {
        throw new ValidationError('Photo file is required');
      }

      const updated = await StudentsService.uploadPhoto(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        file.buffer,
        file.originalname,
        file.mimetype,
        getIp(req)
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async removePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const updated = await StudentsService.removePhoto(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async changeClassSection(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const newEnrollment = await StudentsService.changeClassSection(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        req.body,
        getIp(req)
      );

      const student = await StudentsService.getStudentById(
        tenantId,
        schoolId,
        req.params.id as string
      );

      const activeEnrollment = student.enrollments.find((e) => e.status === 'ACTIVE') || student.enrollments[0];

      res.json({
        ...student,
        currentRollNumber: activeEnrollment?.rollNumber || null,
        enrollment: newEnrollment,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async withdraw(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const updated = await StudentsService.withdrawStudent(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        req.body,
        getIp(req)
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const updated = await StudentsService.transferStudent(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        req.body,
        getIp(req)
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async reactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await StudentsService.reactivateStudent(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        req.body,
        getIp(req)
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async listGuardians(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const search = (req.query.search as string)?.trim() || '';

      const where: any = {
        tenantId,
        schoolId,
        archivedAt: null,
      };

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const guardians = await prisma.guardian.findMany({
        where,
        take: 30,
        orderBy: { firstName: 'asc' },
        include: {
          students: {
            include: {
              student: { select: { id: true, firstName: true, lastName: true, studentId: true } },
            },
          },
        },
      });

      res.json(guardians);
    } catch (err) {
      next(err);
    }
  }

  public static async linkGuardian(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const studentGuardian = await StudentsService.linkGuardian(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        req.body,
        getIp(req)
      );

      res.json(studentGuardian);
    } catch (err) {
      next(err);
    }
  }

  public static async unlinkGuardian(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const result = await StudentsService.unlinkGuardian(
        tenantId,
        schoolId,
        req.params.id as string,
        req.params.guardianId as string,
        req.user?.id
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const file = req.file;
      if (!file) throw new ValidationError('Document file is required');

      const document = await StudentsService.uploadDocument(
        tenantId,
        schoolId,
        req.params.id as string,
        req.body.applicationId,
        req.user?.id,
        file.buffer,
        file.originalname,
        file.mimetype,
        req.body.documentType || 'OTHER',
        req.body.notes,
        getIp(req)
      );

      res.status(201).json(document);
    } catch (err) {
      next(err);
    }
  }

  public static async verifyDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const updated = await StudentsService.verifyDocument(
        tenantId,
        schoolId,
        req.params.docId as string,
        req.user?.id,
        req.body.verificationStatus,
        req.body.verificationNotes,
        getIp(req)
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async archiveDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const updated = await StudentsService.archiveDocument(
        tenantId,
        schoolId,
        req.params.docId as string,
        req.user?.id
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async addNote(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const note = await StudentsService.addNote(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        req.body
      );

      res.status(201).json(note);
    } catch (err) {
      next(err);
    }
  }

  public static async addDiscipline(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const record = await StudentsService.addDiscipline(
        tenantId,
        schoolId,
        req.params.id as string,
        req.user?.id,
        req.body,
        getIp(req)
      );

      res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  }

  public static async updateDiscipline(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const updated = await StudentsService.updateDiscipline(
        tenantId,
        schoolId,
        req.params.disciplineId as string,
        req.user?.id,
        req.body,
        getIp(req)
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async getImportTemplate(req: Request, res: Response) {
    const csv = StudentsService.getImportTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students_import_template.csv"');
    res.send(csv);
  }

  public static async previewImport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const csvContent = req.body.csvContent || (req.file ? req.file.buffer.toString('utf-8') : '');
      if (!csvContent) throw new ValidationError('CSV content is required');

      const preview = await StudentsService.previewImport(tenantId, schoolId, csvContent);
      res.json(preview);
    } catch (err) {
      next(err);
    }
  }

  public static async commitImport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const { academicYearId, rows } = req.body;
      if (!academicYearId) throw new ValidationError('Academic year is required');

      const result = await StudentsService.commitImport(
        tenantId,
        schoolId,
        req.user?.id,
        academicYearId,
        rows,
        getIp(req)
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async exportStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const schoolId = req.schoolId;
      if (!schoolId) throw new ValidationError('School context is required');

      const csv = await StudentsService.exportStudents(tenantId, schoolId, {
        academicYearId: (req.query.academic_year_id || req.query.academicYearId) as string,
        classId: (req.query.class_id || req.query.classId) as string,
        sectionId: (req.query.section_id || req.query.sectionId) as string,
        status: req.query.status as string,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}
