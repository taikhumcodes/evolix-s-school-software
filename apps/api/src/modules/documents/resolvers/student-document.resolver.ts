import { prisma } from '../../../lib/prisma.js';
import { isValidUuid, getSampleStudentData } from './sample-data.js';

export class StudentDocumentResolver {
  public static async resolve(
    tenantId: string,
    schoolId: string,
    studentId: string,
    isOfficialFinalize = false
  ): Promise<Record<string, any>> {
    const school = await prisma.school.findFirst({
      where: { id: schoolId, tenantId },
      include: {
        configuration: true,
        branding: true,
      },
    });

    let student = null;
    if (isValidUuid(studentId)) {
      student = await prisma.student.findFirst({
        where: { id: studentId, tenantId, schoolId },
        include: {
          guardians: {
            include: {
              guardian: true,
            },
          },
          enrollments: {
            where: { status: 'ACTIVE' },
            include: {
              class: true,
              section: true,
              academicYear: true,
            },
            take: 1,
          },
        },
      });
    }

    // If not found and in preview mode, try finding any active student in school
    if (!student && !isOfficialFinalize) {
      student = await prisma.student.findFirst({
        where: { tenantId, schoolId, status: 'ACTIVE' },
        include: {
          guardians: {
            include: {
              guardian: true,
            },
          },
          enrollments: {
            where: { status: 'ACTIVE' },
            include: {
              class: true,
              section: true,
              academicYear: true,
            },
            take: 1,
          },
        },
      });
    }

    if (!student) {
      if (isOfficialFinalize) {
        throw new Error(`Student record not found or inaccessible for ID: ${studentId}`);
      }
      return getSampleStudentData(school);
    }

    const currentEnrollment = student.enrollments?.[0];
    const primaryGuardian = student.guardians?.find((g) => g.isPrimary)?.guardian || student.guardians?.[0]?.guardian;
    const father = student.guardians?.find(
      (g) => g.relationship?.toUpperCase() === 'FATHER'
    )?.guardian;
    const mother = student.guardians?.find(
      (g) => g.relationship?.toUpperCase() === 'MOTHER'
    )?.guardian;
    const emergencyG = student.guardians?.find((g) => g.isEmergencyContact)?.guardian || primaryGuardian;

    const dobFormatted = student.dateOfBirth
      ? new Date(student.dateOfBirth).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '';

    const addressParts = [
      school?.configuration?.addressLine1,
      school?.configuration?.addressLine2,
      school?.configuration?.city,
      school?.configuration?.state,
    ].filter(Boolean);

    return {
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        gender: student.gender,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split('T')[0] : '',
        dateOfBirthFormatted: dobFormatted,
        bloodGroup: student.bloodGroup || '',
        emergencyContact: emergencyG?.phone || '',
        photoUrl: student.photoStorageKey || '',
        status: student.status,
        fatherName: father ? `${father.firstName} ${father.lastName}`.trim() : '',
        motherName: mother ? `${mother.firstName} ${mother.lastName}`.trim() : '',
        guardianName: primaryGuardian ? `${primaryGuardian.firstName} ${primaryGuardian.lastName}`.trim() : '',
        guardianPhone: primaryGuardian?.phone || '',
      },
      academic: {
        className: currentEnrollment?.class?.name || '',
        sectionName: currentEnrollment?.section?.name || '',
        academicYear: currentEnrollment?.academicYear?.name || '',
        rollNumber: currentEnrollment?.rollNumber || '',
      },
      school: {
        id: school?.id || '',
        name: school?.name || '',
        shortName: school?.configuration?.shortName || school?.name || '',
        code: school?.code || '',
        board: school?.configuration?.board || 'CBSE',
        affiliationNumber: school?.configuration?.affiliationNumber || '',
        address: addressParts.join(', '),
        phone: school?.configuration?.primaryPhone || '',
        email: school?.configuration?.contactEmail || '',
        logoUrl: school?.branding?.logoStorageKey || '',
      },
    };
  }
}
