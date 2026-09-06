import { prisma } from '../../lib/prisma.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { StudentNumberingService } from '../../services/student-numbering.service.js';
import { getStorageProvider } from '../../services/storage.service.js';
import { AdmissionsService } from '../admissions/admissions.service.js';

export class StudentsService {
  /**
   * Get module overview statistics (factual database counts)
   */
  public static async getOverview(tenantId: string, schoolId: string, academicYearId?: string) {
    const currentYear = academicYearId
      ? await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } })
      : await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });

    const yearId = currentYear?.id;

    const [
      totalActiveStudents,
      pendingAdmissions,
      approvedAdmissions,
      withdrawnStudents,
      admissionsThisYear,
    ] = await Promise.all([
      prisma.student.count({
        where: { tenantId, schoolId, status: 'ACTIVE', archivedAt: null },
      }),
      prisma.admissionApplication.count({
        where: {
          tenantId,
          schoolId,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
          archivedAt: null,
          ...(yearId ? { academicYearId: yearId } : {}),
        },
      }),
      prisma.admissionApplication.count({
        where: {
          tenantId,
          schoolId,
          status: 'APPROVED',
          archivedAt: null,
          ...(yearId ? { academicYearId: yearId } : {}),
        },
      }),
      prisma.student.count({
        where: { tenantId, schoolId, status: 'WITHDRAWN', archivedAt: null },
      }),
      yearId
        ? prisma.student.count({
            where: { tenantId, schoolId, admittedAcademicYearId: yearId, archivedAt: null },
          })
        : 0,
    ]);

    return {
      totalActiveStudents,
      pendingAdmissions,
      approvedAdmissions,
      withdrawnStudents,
      admissionsThisYear,
      academicYearName: currentYear?.name || 'N/A',
    };
  }

  public static async suggestRollNumber(
    tenantId: string,
    schoolId: string,
    academicYearId: string,
    classId: string,
    sectionId?: string
  ) {
    return await StudentNumberingService.suggestNextRollNumber(
      tenantId,
      schoolId,
      academicYearId,
      classId,
      sectionId
    );
  }

  /**
   * List students with filtering, pagination, and multi-field deep search
   */
  public static async listStudents(
    tenantId: string,
    schoolId: string,
    query: {
      academicYearId?: string;
      classId?: string;
      sectionId?: string;
      status?: string;
      gender?: string;
      search?: string;
      page?: number;
      limit?: number;
      studentIds?: string[];
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const studentWhere: any = {
      tenantId,
      schoolId,
      archivedAt: null,
    };

    if (query.studentIds) {
      studentWhere.id = { in: query.studentIds };
    }

    if (query.status && query.status !== 'ALL') {
      studentWhere.status = query.status;
    }
    if (query.gender && query.gender !== 'ALL') {
      studentWhere.gender = query.gender;
    }

    // Enrollment filter
    const enrollmentWhere: any = {
      tenantId,
      schoolId,
      status: 'ACTIVE',
    };
    if (query.academicYearId) {
      enrollmentWhere.academicYearId = query.academicYearId;
    }
    if (query.classId) {
      enrollmentWhere.classId = query.classId;
    }
    if (query.sectionId) {
      enrollmentWhere.sectionId = query.sectionId;
    }

    // Connect enrollment filtering to student
    if (query.academicYearId || query.classId || query.sectionId) {
      studentWhere.enrollments = {
        some: enrollmentWhere,
      };
    }

    // Search query
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      studentWhere.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { displayName: { contains: s, mode: 'insensitive' } },
        { studentId: { contains: s, mode: 'insensitive' } },
        { admissionNumber: { contains: s, mode: 'insensitive' } },
        {
          enrollments: {
            some: {
              rollNumber: { contains: s, mode: 'insensitive' },
            },
          },
        },
        {
          guardians: {
            some: {
              guardian: {
                OR: [
                  { firstName: { contains: s, mode: 'insensitive' } },
                  { lastName: { contains: s, mode: 'insensitive' } },
                  { phone: { contains: s, mode: 'insensitive' } },
                  ...(s.replace(/[^0-9]/g, '').length >= 3
                    ? [{ normalizedPhone: { contains: s.replace(/[^0-9]/g, '') } }]
                    : []),
                ],
              },
            },
          },
        },
      ];
    }

    const total = await prisma.student.count({ where: studentWhere });
    const items = await prisma.student.findMany({
      where: studentWhere,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            class: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true, code: true } },
            academicYear: { select: { id: true, name: true } },
          },
        },
        guardians: {
          where: { isPrimary: true },
          take: 1,
          include: {
            guardian: true,
          },
        },
      },
    });

    // Format students with flattened current enrollment and primary guardian
    const formatted = items.map((student) => {
      const activeEnrollment = student.enrollments[0] || null;
      const primaryGuardian = student.guardians[0]?.guardian || null;

      return {
        ...student,
        currentClass: activeEnrollment?.class || null,
        currentSection: activeEnrollment?.section || null,
        currentRollNumber: activeEnrollment?.rollNumber || null,
        currentAcademicYear: activeEnrollment?.academicYear || null,
        primaryGuardian: primaryGuardian
          ? {
              id: primaryGuardian.id,
              name: `${primaryGuardian.firstName} ${primaryGuardian.lastName}`.trim(),
              relationship: student.guardians[0]?.relationship || primaryGuardian.relationship,
              phone: primaryGuardian.phone,
              email: primaryGuardian.email,
            }
          : null,
      };
    });

    return {
      items: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get complete 360-degree student profile
   */
  public static async getStudentById(
    tenantId: string,
    schoolId: string,
    id: string,
    includeDiscipline = false,
    includeConfidentialNotes = true
  ) {
    const student = await prisma.student.findFirst({
      where: { id, tenantId, schoolId, archivedAt: null },
      include: {
        admittedAcademicYear: true,
        admissionApplication: {
          select: { id: true, applicationNumber: true, applicationDate: true, status: true },
        },
        enrollments: {
          orderBy: { createdAt: 'desc' },
          include: {
            class: true,
            section: true,
            academicYear: true,
          },
        },
        guardians: {
          include: {
            guardian: true,
          },
        },
        documents: {
          where: { archivedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          where: includeConfidentialNotes ? undefined : { isConfidential: false },
          orderBy: { createdAt: 'desc' },
        },
        ...(includeDiscipline
          ? {
              disciplines: {
                orderBy: { incidentDate: 'desc' },
              },
            }
          : {}),
      },
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    return student;
  }

  /**
   * Direct creation of student record (with auto-generated Student ID & Admission Number)
   */
  public static async createStudentDirect(
    tenantId: string,
    schoolId: string,
    actorId: string | undefined,
    data: any,
    ipAddress?: string
  ) {
    // 1. Check duplicate signals
    const dupCheck = await AdmissionsService.checkDuplicates(tenantId, schoolId, {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      guardianPhone: data.guardianPhone,
      guardianEmail: data.guardianEmail,
    });

    if (dupCheck.isExactDuplicate) {
      throw new ConflictError(
        'An active student or application already exists with this student name, DOB, and guardian contact.',
        { matches: dupCheck.matches }
      );
    }

    if (dupCheck.isPotentialDuplicate && !data.confirmDuplicate) {
      throw new ValidationError('Potential duplicate detected. Please review matches before confirming.', {
        code: 'POTENTIAL_DUPLICATE',
        matches: dupCheck.matches,
      });
    }

    // 2. Validate Class, Section, Academic Year
    const [academicYear, classMaster] = await Promise.all([
      prisma.academicYear.findFirst({ where: { id: data.academicYearId, schoolId } }),
      prisma.classMaster.findFirst({ where: { id: data.classId, tenantId, schoolId, isActive: true } }),
    ]);

    if (!academicYear) throw new ValidationError('Invalid or inactive academic year');
    if (!classMaster) throw new ValidationError('Invalid or inactive class');

    if (data.sectionId) {
      const classSection = await prisma.classSection.findFirst({
        where: {
          classId: data.classId,
          sectionId: data.sectionId,
          tenantId,
          schoolId,
          isActive: true,
        },
      });
      if (!classSection) {
        throw new ValidationError('The selected section is not mapped to this class');
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 3. Generate Student ID & Admission Number atomically
      const studentId = await StudentNumberingService.generateStudentId(tenantId, schoolId, tx);
      const admissionNumber = await StudentNumberingService.generateAdmissionNumber(tenantId, schoolId, tx);

      // 4. Roll number suggestion and uniqueness
      let rollNumber = data.rollNumber?.trim() || null;
      if (!rollNumber) {
        rollNumber = await StudentNumberingService.suggestNextRollNumber(
          tenantId,
          schoolId,
          data.academicYearId,
          data.classId,
          data.sectionId,
          tx
        );
      }

      // Check roll number conflict
      const config = await tx.schoolConfiguration.findFirst({ where: { tenantId, schoolId } });
      const scope = config?.rollNumberScope || 'CLASS_SECTION_YEAR';

      const rollWhere: any = {
        tenantId,
        schoolId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        rollNumber,
        status: 'ACTIVE',
      };
      if (scope === 'CLASS_SECTION_YEAR' && data.sectionId) {
        rollWhere.sectionId = data.sectionId;
      }

      const existingRoll = await tx.studentEnrollment.findFirst({ where: rollWhere });
      if (existingRoll) {
        throw new ConflictError(`Roll number ${rollNumber} is already taken in this class/section.`);
      }

      // 5. Guardian deduplication or creation
      let guardianId = data.guardianId;
      const normPhone = AdmissionsService.normalizePhone(data.guardianPhone);
      const normEmail = AdmissionsService.normalizeEmail(data.guardianEmail);

      if (!guardianId) {
        const existingGuardian = await tx.guardian.findFirst({
          where: {
            tenantId,
            schoolId,
            archivedAt: null,
            OR: [
              { normalizedPhone: normPhone },
              ...(normEmail ? [{ normalizedEmail: normEmail }] : []),
            ],
          },
        });

        if (existingGuardian) {
          guardianId = existingGuardian.id;
        } else {
          const nameParts = data.guardianName.trim().split(' ');
          const gFirst = nameParts[0] || 'Guardian';
          const gLast = nameParts.slice(1).join(' ') || 'Parent';

          const newGuardian = await tx.guardian.create({
            data: {
              tenantId,
              schoolId,
              firstName: gFirst,
              lastName: gLast,
              relationship: data.guardianRelationship,
              phone: data.guardianPhone,
              normalizedPhone: normPhone,
              email: data.guardianEmail,
              normalizedEmail: normEmail,
              occupation: data.guardianOccupation,
              address: data.addressLine1,
              city: data.city,
              state: data.state,
              postalCode: data.postalCode,
              country: data.country || 'IN',
            },
          });
          guardianId = newGuardian.id;
        }
      }

      // 6. Create Student
      const admissionDate = data.admissionDate ? new Date(data.admissionDate) : new Date();

      const student = await tx.student.create({
        data: {
          tenantId,
          schoolId,
          studentId,
          admissionNumber,
          admissionDate,
          admittedAcademicYearId: data.academicYearId,
          status: 'ACTIVE',
          firstName: data.firstName.trim(),
          middleName: data.middleName?.trim() || null,
          lastName: data.lastName.trim(),
          displayName: data.displayName?.trim() || `${data.firstName.trim()} ${data.lastName.trim()}`,
          gender: data.gender,
          dateOfBirth: new Date(data.dateOfBirth),
          placeOfBirth: data.placeOfBirth?.trim() || null,
          nationality: data.nationality?.trim() || 'IN',
          religionId: data.religionId || null,
          categoryId: data.categoryId || null,
          casteId: data.casteId || null,
          bloodGroup: data.bloodGroup?.trim() || null,
          primaryLanguage: data.primaryLanguage?.trim() || null,
          previousSchool: data.previousSchool?.trim() || null,
          previousClass: data.previousClass?.trim() || null,
          addressLine1: data.addressLine1?.trim() || null,
          addressLine2: data.addressLine2?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null,
          postalCode: data.postalCode?.trim() || null,
          country: data.country?.trim() || 'IN',
        },
      });

      // 7. Link Guardian
      await tx.studentGuardian.create({
        data: {
          tenantId,
          schoolId,
          studentId: student.id,
          guardianId,
          relationship: data.guardianRelationship,
          isPrimary: true,
          isEmergencyContact: true,
          hasPickupPermission: true,
          livesWithStudent: true,
        },
      });

      // 8. Create Enrollment
      const enrollment = await tx.studentEnrollment.create({
        data: {
          tenantId,
          schoolId,
          studentId: student.id,
          academicYearId: data.academicYearId,
          classId: data.classId,
          sectionId: data.sectionId || null,
          rollNumber,
          status: 'ACTIVE',
          enrollmentDate: admissionDate,
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'STUDENT_CREATED',
        entityType: 'Student',
        entityId: student.id,
        afterData: student,
        ipAddress,
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'STUDENT_ENROLLMENT_CREATED',
        entityType: 'StudentEnrollment',
        entityId: enrollment.id,
        afterData: enrollment,
        ipAddress,
      });

      return {
        ...student,
        currentRollNumber: rollNumber,
        student,
        enrollment,
      };
    });
  }

  /**
   * Update student profile demographics (Student ID & Admission Number are strictly immutable)
   */
  public static async updateStudent(
    tenantId: string,
    schoolId: string,
    id: string,
    actorId: string | undefined,
    data: any,
    ipAddress?: string
  ) {
    const existing = await prisma.student.findFirst({
      where: { id, tenantId, schoolId, archivedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Student not found');
    }

    // Disallow manual alteration of studentId or admissionNumber
    delete data.studentId;
    delete data.admissionNumber;

    const updateData: any = {};
    const fields = [
      'firstName', 'middleName', 'lastName', 'displayName', 'gender',
      'placeOfBirth', 'nationality', 'religionId', 'categoryId', 'casteId',
      'bloodGroup', 'primaryLanguage', 'previousSchool', 'previousClass',
      'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country'
    ];

    for (const f of fields) {
      if (data[f] !== undefined) {
        updateData[f] = data[f];
      }
    }

    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }

    const updated = await prisma.student.update({
      where: { id },
      data: updateData,
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'STUDENT_UPDATED',
      entityType: 'Student',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  /**
   * Upload student photo with storage provider
   */
  public static async uploadPhoto(
    tenantId: string,
    schoolId: string,
    id: string,
    actorId: string | undefined,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    ipAddress?: string
  ) {
    const student = await prisma.student.findFirst({
      where: { id, tenantId, schoolId, archivedAt: null },
    });
    if (!student) throw new NotFoundError('Student not found');

    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      throw new ValidationError('Invalid photo format. Only PNG, JPEG, and WebP are allowed.');
    }

    const ext = originalName.split('.').pop() || 'jpg';
    const storageKey = `tenants/${tenantId}/schools/${schoolId}/students/${id}/photo_${Date.now()}.${ext}`;

    const storage = getStorageProvider();
    await storage.upload(fileBuffer, storageKey, mimeType);

    const updated = await prisma.student.update({
      where: { id },
      data: {
        photoFileId: originalName,
        photoStorageKey: storageKey,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'STUDENT_UPDATED',
      entityType: 'Student',
      entityId: id,
      metadataInfo: { photoUploaded: true, originalName },
      ipAddress,
    });

    return updated;
  }

  /**
   * Remove student photo
   */
  public static async removePhoto(tenantId: string, schoolId: string, id: string, actorId?: string) {
    const student = await prisma.student.findFirst({
      where: { id, tenantId, schoolId, archivedAt: null },
    });
    if (!student) throw new NotFoundError('Student not found');

    if (student.photoStorageKey) {
      const storage = getStorageProvider();
      await storage.delete(student.photoStorageKey);
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        photoFileId: null,
        photoStorageKey: null,
      },
    });

    return updated;
  }

  /**
   * Change class or section for current active enrollment with history recording
   */
  public static async changeClassSection(
    tenantId: string,
    schoolId: string,
    studentId: string,
    actorId: string | undefined,
    params: {
      classId: string;
      sectionId?: string | null;
      rollNumber?: string | null;
      reason?: string;
    },
    ipAddress?: string
  ) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId, schoolId, archivedAt: null },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) throw new NotFoundError('Student not found');
    const currentEnrollment = student.enrollments[0];
    if (!currentEnrollment) {
      throw new ValidationError('Student does not have an active enrollment to modify');
    }

    // Validate target class and section
    const classMaster = await prisma.classMaster.findFirst({
      where: { id: params.classId, tenantId, schoolId, isActive: true },
    });
    if (!classMaster) throw new ValidationError('Invalid or inactive target class');

    if (params.sectionId) {
      const classSection = await prisma.classSection.findFirst({
        where: {
          classId: params.classId,
          sectionId: params.sectionId,
          tenantId,
          schoolId,
          isActive: true,
        },
      });
      if (!classSection) {
        throw new ValidationError('Target section is not mapped to target class');
      }
    }

    // Determine roll number
    let rollNumber = params.rollNumber?.trim() || null;
    if (!rollNumber) {
      rollNumber = await StudentNumberingService.suggestNextRollNumber(
        tenantId,
        schoolId,
        currentEnrollment.academicYearId,
        params.classId,
        params.sectionId
      );
    }

    // Check roll uniqueness
    const config = await prisma.schoolConfiguration.findFirst({ where: { tenantId, schoolId } });
    const scope = config?.rollNumberScope || 'CLASS_SECTION_YEAR';

    const rollWhere: any = {
      tenantId,
      schoolId,
      academicYearId: currentEnrollment.academicYearId,
      classId: params.classId,
      rollNumber,
      status: 'ACTIVE',
      studentId: { not: studentId },
    };
    if (scope === 'CLASS_SECTION_YEAR' && params.sectionId) {
      rollWhere.sectionId = params.sectionId;
    }

    const existingRoll = await prisma.studentEnrollment.findFirst({ where: rollWhere });
    if (existingRoll) {
      throw new ConflictError(`Roll number ${rollNumber} is already occupied in target class/section.`);
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Mark current enrollment as TRANSFERRED
      await tx.studentEnrollment.update({
        where: { id: currentEnrollment.id },
        data: {
          status: 'TRANSFERRED',
          completionDate: new Date(),
          remarks: params.reason || 'Class/Section transferred',
        },
      });

      // 2. Create new active enrollment
      const newEnrollment = await tx.studentEnrollment.create({
        data: {
          tenantId,
          schoolId,
          studentId,
          academicYearId: currentEnrollment.academicYearId,
          classId: params.classId,
          sectionId: params.sectionId || null,
          rollNumber,
          status: 'ACTIVE',
          enrollmentDate: new Date(),
          remarks: params.reason,
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'STUDENT_CLASS_CHANGED',
        entityType: 'StudentEnrollment',
        entityId: newEnrollment.id,
        beforeData: { classId: currentEnrollment.classId, sectionId: currentEnrollment.sectionId },
        afterData: { classId: newEnrollment.classId, sectionId: newEnrollment.sectionId, reason: params.reason },
        ipAddress,
      });

      return newEnrollment;
    });
  }

  /**
   * Withdraw student workflow
   */
  public static async withdrawStudent(
    tenantId: string,
    schoolId: string,
    studentId: string,
    actorId: string | undefined,
    params: {
      withdrawalDate?: string;
      effectiveDate?: string;
      reason: string;
      remarks?: string;
      destinationSchool?: string;
      lastAttendanceDate?: string;
    },
    ipAddress?: string
  ) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId, schoolId, archivedAt: null },
    });
    if (!student) throw new NotFoundError('Student not found');
    if (student.status === 'WITHDRAWN') {
      throw new ValidationError('Student is already marked as withdrawn');
    }

    const effectiveDateStr = params.withdrawalDate || params.effectiveDate || new Date().toISOString().slice(0, 10);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          status: 'WITHDRAWN',
          statusReason: params.reason,
          statusChangeDate: new Date(effectiveDateStr),
          destinationSchool: params.destinationSchool || null,
          lastAttendanceDate: params.lastAttendanceDate ? new Date(params.lastAttendanceDate) : null,
        },
      });

      await tx.studentEnrollment.updateMany({
        where: { studentId, tenantId, schoolId, status: 'ACTIVE' },
        data: {
          status: 'WITHDRAWN',
          completionDate: new Date(effectiveDateStr),
          remarks: params.reason,
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'STUDENT_WITHDRAWN',
        entityType: 'Student',
        entityId: studentId,
        beforeData: { status: student.status },
        afterData: { status: 'WITHDRAWN', reason: params.reason },
        ipAddress,
      });

      return updated;
    });
  }

  /**
   * Transfer student out workflow
   */
  public static async transferStudent(
    tenantId: string,
    schoolId: string,
    studentId: string,
    actorId: string | undefined,
    params: {
      transferDate?: string;
      effectiveDate?: string;
      reason: string;
      destinationSchool?: string;
      remarks?: string;
    },
    ipAddress?: string
  ) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId, schoolId, archivedAt: null },
    });
    if (!student) throw new NotFoundError('Student not found');
    if (student.status === 'TRANSFERRED') {
      throw new ValidationError('Student is already marked as transferred');
    }

    const effectiveDateStr = params.transferDate || params.effectiveDate || new Date().toISOString().slice(0, 10);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          status: 'TRANSFERRED',
          statusReason: params.reason,
          statusChangeDate: new Date(effectiveDateStr),
          destinationSchool: params.destinationSchool || null,
        },
      });

      await tx.studentEnrollment.updateMany({
        where: { studentId, tenantId, schoolId, status: 'ACTIVE' },
        data: {
          status: 'TRANSFERRED',
          completionDate: new Date(effectiveDateStr),
          remarks: params.reason,
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'STUDENT_TRANSFERRED',
        entityType: 'Student',
        entityId: studentId,
        beforeData: { status: student.status },
        afterData: { status: 'TRANSFERRED', reason: params.reason, destinationSchool: params.destinationSchool },
        ipAddress,
      });

      return updated;
    });
  }

  /**
   * Reactivate student: Restrictive policy allows INACTIVE or WITHDRAWN students; requires reason and class assignment
   */
  public static async reactivateStudent(
    tenantId: string,
    schoolId: string,
    studentId: string,
    actorId: string | undefined,
    params: {
      reason: string;
      academicYearId?: string;
      classId: string;
      sectionId?: string | null;
      rollNumber?: string | null;
    },
    ipAddress?: string
  ) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId, schoolId, archivedAt: null },
    });
    if (!student) throw new NotFoundError('Student not found');

    if (student.status === 'ACTIVE') {
      throw new ValidationError('Student is already active');
    }

    if (['TRANSFERRED', 'ALUMNI'].includes(student.status)) {
      throw new ValidationError(
        `Cannot reactivate student with status '${student.status}'. Transferred students must go through a new admission application.`
      );
    }

    let targetAcademicYearId = params.academicYearId;
    if (!targetAcademicYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
      });
      if (!currentYear) throw new ValidationError('No active academic year found for school');
      targetAcademicYearId = currentYear.id;
    }

    // Validate class and section
    const [academicYear, classMaster] = await Promise.all([
      prisma.academicYear.findFirst({ where: { id: targetAcademicYearId, schoolId } }),
      prisma.classMaster.findFirst({ where: { id: params.classId, tenantId, schoolId, isActive: true } }),
    ]);

    if (!academicYear) throw new ValidationError('Invalid or inactive academic year');
    if (!classMaster) throw new ValidationError('Invalid or inactive class');

    if (params.sectionId) {
      const cs = await prisma.classSection.findFirst({
        where: { classId: params.classId, sectionId: params.sectionId, tenantId, schoolId, isActive: true },
      });
      if (!cs) throw new ValidationError('Section is not mapped to this class');
    }

    return await prisma.$transaction(async (tx) => {
      let rollNumber = params.rollNumber?.trim() || null;
      if (!rollNumber) {
        rollNumber = await StudentNumberingService.suggestNextRollNumber(
          tenantId,
          schoolId,
          targetAcademicYearId!,
          params.classId,
          params.sectionId,
          tx
        );
      }

      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          status: 'ACTIVE',
          statusReason: params.reason,
          statusChangeDate: new Date(),
        },
      });

      const enrollment = await tx.studentEnrollment.create({
        data: {
          tenantId,
          schoolId,
          studentId,
          academicYearId: targetAcademicYearId!,
          classId: params.classId,
          sectionId: params.sectionId || null,
          rollNumber,
          status: 'ACTIVE',
          enrollmentDate: new Date(),
          remarks: `Reactivated: ${params.reason}`,
        },
      });

      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'STUDENT_STATUS_CHANGED',
        entityType: 'Student',
        entityId: studentId,
        beforeData: { status: student.status },
        afterData: { status: 'ACTIVE', reason: params.reason },
        ipAddress,
      });

      return {
        ...updated,
        currentRollNumber: rollNumber,
        student: updated,
        enrollment,
      };
    });
  }

  /**
   * Guardian Linking and Management
   */
  public static async linkGuardian(
    tenantId: string,
    schoolId: string,
    studentId: string,
    actorId: string | undefined,
    data: any,
    ipAddress?: string
  ) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId, schoolId, archivedAt: null },
    });
    if (!student) throw new NotFoundError('Student not found');

    let guardianId = data.guardianId;

    if (!guardianId) {
      if (!data.firstName || !data.lastName || !data.phone) {
        throw new ValidationError('Guardian name and phone are required for a new guardian record');
      }

      const normPhone = AdmissionsService.normalizePhone(data.phone);
      const normEmail = AdmissionsService.normalizeEmail(data.email);

      // Check existing guardian with matching normalized phone
      const existing = await prisma.guardian.findFirst({
        where: {
          tenantId,
          schoolId,
          archivedAt: null,
          OR: [
            { normalizedPhone: normPhone },
            ...(normEmail ? [{ normalizedEmail: normEmail }] : []),
          ],
        },
      });

      if (existing) {
        guardianId = existing.id;
      } else {
        const created = await prisma.guardian.create({
          data: {
            tenantId,
            schoolId,
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            relationship: data.relationship,
            phone: data.phone.trim(),
            normalizedPhone: normPhone,
            email: data.email?.trim() || null,
            normalizedEmail: normEmail,
            occupation: data.occupation?.trim() || null,
          },
        });
        guardianId = created.id;
      }
    }

    // If making primary, unset other primaries for this student
    if (data.isPrimary) {
      await prisma.studentGuardian.updateMany({
        where: { studentId, tenantId, schoolId },
        data: { isPrimary: false },
      });
    }

    const studentGuardian = await prisma.studentGuardian.upsert({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
      update: {
        relationship: data.relationship,
        isPrimary: data.isPrimary || false,
        isEmergencyContact: data.isEmergencyContact || false,
        hasPickupPermission: data.hasPickupPermission ?? true,
        livesWithStudent: data.livesWithStudent ?? true,
      },
      create: {
        tenantId,
        schoolId,
        studentId,
        guardianId,
        relationship: data.relationship,
        isPrimary: data.isPrimary || false,
        isEmergencyContact: data.isEmergencyContact || false,
        hasPickupPermission: data.hasPickupPermission ?? true,
        livesWithStudent: data.livesWithStudent ?? true,
      },
      include: { guardian: true },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'GUARDIAN_LINKED',
      entityType: 'StudentGuardian',
      entityId: studentGuardian.id,
      afterData: studentGuardian,
      ipAddress,
    });

    return studentGuardian;
  }

  public static async unlinkGuardian(
    tenantId: string,
    schoolId: string,
    studentId: string,
    guardianId: string,
    actorId?: string
  ) {
    const existing = await prisma.studentGuardian.findFirst({
      where: { studentId, guardianId, tenantId, schoolId },
    });
    if (!existing) throw new NotFoundError('Guardian link not found');

    await prisma.studentGuardian.delete({
      where: { id: existing.id },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'GUARDIAN_UNLINKED',
      entityType: 'StudentGuardian',
      entityId: existing.id,
      beforeData: existing,
    });

    return { success: true };
  }

  /**
   * Student Documents Management
   */
  public static async uploadDocument(
    tenantId: string,
    schoolId: string,
    studentId: string | undefined,
    applicationId: string | undefined,
    actorId: string | undefined,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    documentType: string,
    notes?: string,
    ipAddress?: string
  ) {
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      throw new ValidationError('Invalid document format. Only PDF, PNG, JPEG, and WebP are allowed.');
    }

    const ext = originalName.split('.').pop() || 'dat';
    const targetId = studentId || applicationId || 'temp';
    const storageKey = `tenants/${tenantId}/schools/${schoolId}/docs/${targetId}/${Date.now()}_${originalName.replace(/\s+/g, '_')}`;

    const storage = getStorageProvider();
    await storage.upload(fileBuffer, storageKey, mimeType);

    const document = await prisma.studentDocument.create({
      data: {
        tenantId,
        schoolId,
        studentId: studentId || null,
        applicationId: applicationId || null,
        documentType,
        originalFileName: originalName,
        storageKey,
        mimeType,
        fileSize: fileBuffer.length,
        verificationStatus: 'PENDING',
        verificationNotes: notes || null,
        uploadedBy: actorId || null,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'STUDENT_DOCUMENT_UPLOADED',
      entityType: 'StudentDocument',
      entityId: document.id,
      afterData: { documentType, originalFileName: originalName, fileSize: fileBuffer.length },
      ipAddress,
    });

    return document;
  }

  public static async verifyDocument(
    tenantId: string,
    schoolId: string,
    docId: string,
    actorId: string | undefined,
    status: 'VERIFIED' | 'REJECTED',
    notes?: string,
    ipAddress?: string
  ) {
    const document = await prisma.studentDocument.findFirst({
      where: { id: docId, tenantId, schoolId, archivedAt: null },
    });
    if (!document) throw new NotFoundError('Document not found');

    const updated = await prisma.studentDocument.update({
      where: { id: docId },
      data: {
        verificationStatus: status,
        verificationNotes: notes || null,
        verifiedBy: actorId || null,
        verifiedAt: new Date(),
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'STUDENT_DOCUMENT_VERIFIED',
      entityType: 'StudentDocument',
      entityId: docId,
      beforeData: { status: document.verificationStatus },
      afterData: { status: updated.verificationStatus, notes },
      ipAddress,
    });

    return updated;
  }

  public static async archiveDocument(
    tenantId: string,
    schoolId: string,
    docId: string,
    actorId?: string
  ) {
    const document = await prisma.studentDocument.findFirst({
      where: { id: docId, tenantId, schoolId, archivedAt: null },
    });
    if (!document) throw new NotFoundError('Document not found');

    const updated = await prisma.studentDocument.update({
      where: { id: docId },
      data: { archivedAt: new Date() },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'STUDENT_DOCUMENT_ARCHIVED',
      entityType: 'StudentDocument',
      entityId: docId,
      beforeData: document,
    });

    return updated;
  }

  /**
   * Notes Management
   */
  public static async addNote(
    tenantId: string,
    schoolId: string,
    studentId: string,
    actorId: string | undefined,
    data: { category: string; content: string; isConfidential?: boolean }
  ) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId, schoolId, archivedAt: null },
    });
    if (!student) throw new NotFoundError('Student not found');

    return await prisma.studentNote.create({
      data: {
        tenantId,
        schoolId,
        studentId,
        category: data.category,
        content: data.content,
        isConfidential: data.isConfidential || false,
        createdBy: actorId || null,
      },
    });
  }

  /**
   * Discipline Management (Guarded by student.discipline.* permissions)
   */
  public static async addDiscipline(
    tenantId: string,
    schoolId: string,
    studentId: string,
    actorId: string | undefined,
    data: any,
    ipAddress?: string
  ) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId, schoolId, archivedAt: null },
    });
    if (!student) throw new NotFoundError('Student not found');

    const record = await prisma.studentDiscipline.create({
      data: {
        tenantId,
        schoolId,
        studentId,
        incidentDate: new Date(data.incidentDate),
        incidentType: data.incidentType,
        title: data.title.trim(),
        description: data.description.trim(),
        severity: data.severity || 'LOW',
        actionTaken: data.actionTaken?.trim() || null,
        reportedBy: actorId || null,
        status: data.status || 'OPEN',
        followUpNotes: data.followUpNotes?.trim() || null,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'DISCIPLINE_CREATED',
      entityType: 'StudentDiscipline',
      entityId: record.id,
      afterData: record,
      ipAddress,
    });

    return record;
  }

  public static async updateDiscipline(
    tenantId: string,
    schoolId: string,
    disciplineId: string,
    actorId: string | undefined,
    data: any,
    ipAddress?: string
  ) {
    const record = await prisma.studentDiscipline.findFirst({
      where: { id: disciplineId, tenantId, schoolId },
    });
    if (!record) throw new NotFoundError('Discipline record not found');

    const updateData: any = {};
    if (data.status) {
      updateData.status = data.status;
      if (['RESOLVED', 'DISMISSED'].includes(data.status)) {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = actorId || null;
      }
    }
    if (data.actionTaken !== undefined) updateData.actionTaken = data.actionTaken;
    if (data.followUpNotes !== undefined) updateData.followUpNotes = data.followUpNotes;
    if (data.severity) updateData.severity = data.severity;

    const updated = await prisma.studentDiscipline.update({
      where: { id: disciplineId },
      data: updateData,
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'DISCIPLINE_UPDATED',
      entityType: 'StudentDiscipline',
      entityId: disciplineId,
      beforeData: record,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  /**
   * Bulk CSV Import Workflow
   */
  public static getImportTemplate(): string {
    return 'First Name,Last Name,Date of Birth,Gender,Admission Date,Class,Section,Roll Number,Student ID,Admission Number,Guardian Name,Guardian Relationship,Guardian Phone,Guardian Email,Address,City,State,Postal Code\nJohn,Doe,2012-05-15,MALE,2026-04-01,Grade 9,Section A,001,,,Robert Doe,FATHER,9876543210,robert@example.com,123 School Road,Indore,Madhya Pradesh,452001';
  }

  public static async previewImport(tenantId: string, schoolId: string, csvContent: string) {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      throw new ValidationError('CSV file is empty or missing data rows');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1);

    // Fetch classes, sections, and existing active students for lookup and duplicate protection
    const [classes, sections, existingStudents] = await Promise.all([
      prisma.classMaster.findMany({ where: { tenantId, schoolId, isActive: true } }),
      prisma.sectionMaster.findMany({ where: { tenantId, schoolId, isActive: true } }),
      prisma.student.findMany({
        where: { tenantId, schoolId, archivedAt: null },
        select: {
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          guardians: {
            select: {
              guardian: {
                select: { phone: true, normalizedPhone: true },
              },
            },
          },
        },
      }),
    ]);

    const classMap = new Map<string, string>(); // name/code lowercase -> id
    for (const c of classes) {
      classMap.set(c.name.toLowerCase(), c.id);
      classMap.set(c.code.toLowerCase(), c.id);
    }

    const sectionMap = new Map<string, string>();
    for (const s of sections) {
      sectionMap.set(s.name.toLowerCase(), s.id);
      sectionMap.set(s.code.toLowerCase(), s.id);
    }

    const previewRows: any[] = [];
    const errors: Array<{ row: number; field: string; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const cols = rows[i].split(',').map((c) => c.trim());

      const getCol = (name: string): string => {
        const idx = headers.indexOf(name.toLowerCase());
        return idx >= 0 && cols[idx] ? cols[idx] : '';
      };

      const firstName = getCol('first name');
      const lastName = getCol('last name');
      const dob = getCol('date of birth');
      const gender = getCol('gender').toUpperCase();
      const className = getCol('class');
      const sectionName = getCol('section');
      const rollNumber = getCol('roll number');
      const studentId = getCol('student id');
      const admissionNumber = getCol('admission number');
      const guardianName = getCol('guardian name');
      const guardianRel = getCol('guardian relationship') || 'PARENT';
      const guardianPhone = getCol('guardian phone');
      const guardianEmail = getCol('guardian email');

      if (!firstName) errors.push({ row: rowNum, field: 'First Name', message: 'First name is required' });
      if (!lastName) errors.push({ row: rowNum, field: 'Last Name', message: 'Last name is required' });
      if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        errors.push({ row: rowNum, field: 'Date of Birth', message: 'DOB must be in YYYY-MM-DD format' });
      }
      if (!['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
        errors.push({ row: rowNum, field: 'Gender', message: 'Gender must be MALE, FEMALE, or OTHER' });
      }
      if (!className) {
        errors.push({ row: rowNum, field: 'Class', message: 'Class is required' });
      } else if (!classMap.has(className.toLowerCase())) {
        errors.push({ row: rowNum, field: 'Class', message: `Class '${className}' not found in active master data` });
      }

      let matchedSectionId: string | null = null;
      if (sectionName) {
        if (!sectionMap.has(sectionName.toLowerCase())) {
          errors.push({ row: rowNum, field: 'Section', message: `Section '${sectionName}' not found in active master data` });
        } else {
          matchedSectionId = sectionMap.get(sectionName.toLowerCase())!;
        }
      }

      if (!guardianName) errors.push({ row: rowNum, field: 'Guardian Name', message: 'Guardian name is required' });
      if (!guardianPhone || guardianPhone.length < 5) {
        errors.push({ row: rowNum, field: 'Guardian Phone', message: 'Valid guardian phone is required' });
      }

      // Duplicate detection against existing active students
      if (firstName && lastName && dob && guardianPhone) {
        const normPhone = AdmissionsService.normalizePhone(guardianPhone);
        const isDuplicate = existingStudents.some((st) => {
          const nameMatch =
            st.firstName.toLowerCase() === firstName.toLowerCase() &&
            st.lastName.toLowerCase() === lastName.toLowerCase();
          const d = st.dateOfBirth;
          const isoDate = d ? d.toISOString().split('T')[0] : '';
          const localDate = d
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            : '';
          const dobMatch = isoDate === dob || localDate === dob;
          const phoneMatch = st.guardians.some(
            (g) =>
              g.guardian.normalizedPhone === normPhone ||
              (g.guardian.phone && g.guardian.phone.replace(/[^0-9]/g, '') === normPhone)
          );
          return nameMatch && (dobMatch || phoneMatch);
        });

        if (isDuplicate) {
          errors.push({
            row: rowNum,
            field: 'Duplicate',
            message: `Duplicate student: '${firstName} ${lastName}' with matching DOB and guardian phone already exists`,
          });
        }
      }

      previewRows.push({
        row: rowNum,
        firstName,
        lastName,
        dateOfBirth: dob,
        gender,
        classId: className ? classMap.get(className.toLowerCase()) : null,
        className,
        sectionId: matchedSectionId,
        sectionName,
        rollNumber,
        studentId,
        admissionNumber,
        guardianName,
        guardianRelationship: guardianRel,
        guardianPhone,
        guardianEmail,
        hasError: errors.some((e) => e.row === rowNum),
      });
    }

    return {
      totalRows: rows.length,
      validRows: previewRows.filter((r) => !r.hasError).length,
      errors,
      preview: previewRows.slice(0, 50),
    };
  }

  public static async commitImport(
    tenantId: string,
    schoolId: string,
    actorId: string | undefined,
    academicYearId: string,
    rows: any[],
    ipAddress?: string
  ) {
    if (!rows || rows.length === 0) {
      throw new ValidationError('No rows provided for import');
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });
    if (!academicYear) throw new ValidationError('Invalid academic year');

    const createdStudentIds: string[] = [];

    // Process rows sequentially or in chunks with atomic number generation
    for (const row of rows) {
      await prisma.$transaction(async (tx) => {
        // Generate or use legacy ID
        let studentId = row.studentId?.trim();
        if (!studentId) {
          studentId = await StudentNumberingService.generateStudentId(tenantId, schoolId, tx);
        }

        let admissionNumber = row.admissionNumber?.trim();
        if (!admissionNumber) {
          admissionNumber = await StudentNumberingService.generateAdmissionNumber(tenantId, schoolId, tx);
        }

        let rollNumber = row.rollNumber?.trim();
        if (!rollNumber) {
          rollNumber = await StudentNumberingService.suggestNextRollNumber(
            tenantId,
            schoolId,
            academicYearId,
            row.classId,
            row.sectionId,
            tx
          );
        }

        // Guardian lookup or creation
        const normPhone = AdmissionsService.normalizePhone(row.guardianPhone);
        const normEmail = AdmissionsService.normalizeEmail(row.guardianEmail);

        let guardian = await tx.guardian.findFirst({
          where: {
            tenantId,
            schoolId,
            archivedAt: null,
            OR: [
              { normalizedPhone: normPhone },
              ...(normEmail ? [{ normalizedEmail: normEmail }] : []),
            ],
          },
        });

        if (!guardian) {
          const nameParts = row.guardianName.trim().split(' ');
          guardian = await tx.guardian.create({
            data: {
              tenantId,
              schoolId,
              firstName: nameParts[0] || 'Guardian',
              lastName: nameParts.slice(1).join(' ') || 'Parent',
              relationship: row.guardianRelationship || 'PARENT',
              phone: row.guardianPhone,
              normalizedPhone: normPhone,
              email: row.guardianEmail || null,
              normalizedEmail: normEmail,
            },
          });
        }

        // Create Student
        const student = await tx.student.create({
          data: {
            tenantId,
            schoolId,
            studentId,
            admissionNumber,
            admissionDate: new Date(),
            admittedAcademicYearId: academicYearId,
            status: 'ACTIVE',
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            displayName: `${row.firstName.trim()} ${row.lastName.trim()}`,
            gender: row.gender,
            dateOfBirth: new Date(row.dateOfBirth),
          },
        });

        // Link Guardian
        await tx.studentGuardian.create({
          data: {
            tenantId,
            schoolId,
            studentId: student.id,
            guardianId: guardian.id,
            relationship: row.guardianRelationship || 'PARENT',
            isPrimary: true,
            isEmergencyContact: true,
          },
        });

        // Create Enrollment
        await tx.studentEnrollment.create({
          data: {
            tenantId,
            schoolId,
            studentId: student.id,
            academicYearId,
            classId: row.classId,
            sectionId: row.sectionId || null,
            rollNumber,
            status: 'ACTIVE',
            enrollmentDate: new Date(),
          },
        });

        createdStudentIds.push(student.id);
      });
    }

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'STUDENTS_BULK_IMPORTED',
      entityType: 'Student',
      metadataInfo: { count: createdStudentIds.length },
      ipAddress,
    });

    return {
      importedCount: createdStudentIds.length,
      studentIds: createdStudentIds,
    };
  }

  /**
   * Export students to CSV respecting filters
   */
  public static async exportStudents(
    tenantId: string,
    schoolId: string,
    filters: {
      academicYearId?: string;
      classId?: string;
      sectionId?: string;
      status?: string;
    }
  ): Promise<string> {
    const listResult = await this.listStudents(tenantId, schoolId, {
      ...filters,
      page: 1,
      limit: 5000,
    });

    const headers = [
      'student_id',
      'admission_number',
      'first_name',
      'last_name',
      'gender',
      'date_of_birth',
      'status',
      'class',
      'section',
      'roll_number',
      'guardian_name',
      'guardian_phone',
    ];

    const rows = listResult.items.map((s: any) => [
      `"${s.studentId}"`,
      `"${s.admissionNumber}"`,
      `"${s.firstName}"`,
      `"${s.lastName}"`,
      `"${s.gender}"`,
      `"${s.dateOfBirth.toISOString().split('T')[0]}"`,
      `"${s.status}"`,
      `"${s.currentClass?.name || ''}"`,
      `"${s.currentSection?.name || ''}"`,
      `"${s.currentRollNumber || ''}"`,
      `"${s.primaryGuardian?.name || ''}"`,
      `"${s.primaryGuardian?.phone || ''}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
