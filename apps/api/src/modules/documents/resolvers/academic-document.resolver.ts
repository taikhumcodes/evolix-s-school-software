import { prisma } from '../../../lib/prisma.js';
import { isValidUuid, getSampleAcademicData } from './sample-data.js';

export class AcademicDocumentResolver {
  public static async resolve(
    tenantId: string,
    schoolId: string,
    sourceId: string,
    isOfficialFinalize = false
  ): Promise<Record<string, any>> {
    const school = await prisma.school.findFirst({
      where: { id: schoolId, tenantId },
      include: { configuration: true, branding: true },
    });

    let marks: any[] = [];

    if (isValidUuid(sourceId)) {
      // sourceId can be a studentId or examId
      marks = await prisma.studentExamMark.findMany({
        where: { studentId: sourceId, schoolId, tenantId },
        include: {
          exam: {
            include: { term: true },
          },
          student: {
            include: {
              enrollments: {
                where: { status: 'ACTIVE' },
                include: { class: true, section: true, academicYear: true },
                take: 1,
              },
            },
          },
          subject: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      if (marks.length === 0) {
        // Try by examId
        marks = await prisma.studentExamMark.findMany({
          where: { examId: sourceId, schoolId, tenantId },
          include: {
            exam: {
              include: { term: true },
            },
            student: {
              include: {
                enrollments: {
                  where: { status: 'ACTIVE' },
                  include: { class: true, section: true, academicYear: true },
                  take: 1,
                },
              },
            },
            subject: true,
          },
          take: 20,
        });
      }
    }

    if (marks.length === 0 && !isOfficialFinalize) {
      // For preview, try finding any marks in the school
      marks = await prisma.studentExamMark.findMany({
        where: { schoolId, tenantId },
        include: {
          exam: {
            include: { term: true },
          },
          student: {
            include: {
              enrollments: {
                where: { status: 'ACTIVE' },
                include: { class: true, section: true, academicYear: true },
                take: 1,
              },
            },
          },
          subject: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }

    if (marks.length === 0) {
      // Fallback to student record if marks not yet entered
      let student = null;
      if (isValidUuid(sourceId)) {
        student = await prisma.student.findFirst({
          where: { id: sourceId, schoolId, tenantId },
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { class: true, section: true, academicYear: true },
              take: 1,
            },
          },
        });
      }

      if (!student && !isOfficialFinalize) {
        student = await prisma.student.findFirst({
          where: { schoolId, tenantId, status: 'ACTIVE' },
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { class: true, section: true, academicYear: true },
              take: 1,
            },
          },
        });
      }

      if (!student) {
        if (isOfficialFinalize) {
          throw new Error(`Academic result or student record not found for ID: ${sourceId}`);
        }
        return getSampleAcademicData(school);
      }

      const currentEnrollment = student.enrollments?.[0];

      return {
        student: {
          id: student.id,
          admissionNumber: student.admissionNumber,
          fullName: `${student.firstName} ${student.lastName}`.trim(),
          rollNumber: currentEnrollment?.rollNumber || '',
        },
        academic: {
          className: currentEnrollment?.class?.name || '',
          sectionName: currentEnrollment?.section?.name || '',
          academicYear: currentEnrollment?.academicYear?.name || '',
        },
        exam: {
          name: 'Academic Evaluation',
          term: 'Term 1',
          status: 'PUBLISHED',
        },
        result: {
          totalMarks: 0,
          maxPossibleMarks: 0,
          percentageFormatted: 'N/A',
          overallGrade: '-',
          subjects: [],
        },
        school: {
          name: school?.name || '',
          shortName: school?.configuration?.shortName || school?.name || '',
          code: school?.code || '',
          board: school?.configuration?.board || 'CBSE',
        },
      };
    }

    const firstMark = marks[0];
    const exam = firstMark.exam;

    // Official Report Card Requirement: Exam must be published
    if (isOfficialFinalize && exam?.status !== 'PUBLISHED') {
      throw new Error(
        `Cannot issue official report card: Examination '${exam?.name}' status is '${exam?.status}', but must be 'PUBLISHED'.`
      );
    }
    const student = firstMark.student;
    const currentEnrollment = student.enrollments?.[0];

    let totalMarks = 0;
    let maxMarks = 0;

    const subjects = marks.map((m) => {
      const scored = m.finalMarks ? Number(m.finalMarks) : 0;
      totalMarks += scored;
      maxMarks += 100;
      return {
        subjectName: m.subject?.name || 'Subject',
        maxMarks: 100,
        marksObtained: scored,
        grade: m.grade || '-',
        status: m.status,
      };
    });

    const percentage = maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0;

    return {
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        rollNumber: currentEnrollment?.rollNumber || '',
      },
      academic: {
        className: currentEnrollment?.class?.name || '',
        sectionName: currentEnrollment?.section?.name || '',
        academicYear: currentEnrollment?.academicYear?.name || '',
      },
      exam: {
        id: exam.id,
        name: exam.name || 'Annual Examination',
        term: exam.term?.name || 'Term 1',
        status: exam.status,
      },
      result: {
        totalMarks,
        maxPossibleMarks: maxMarks,
        percentage,
        percentageFormatted: `${percentage.toFixed(1)}%`,
        overallGrade: percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : 'D',
        remarks: 'Satisfactory Performance',
        subjects,
      },
      school: {
        name: school?.name || '',
        shortName: school?.configuration?.shortName || school?.name || '',
        code: school?.code || '',
        board: school?.configuration?.board || 'CBSE',
      },
    };
  }
}
