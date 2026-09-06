import { prisma } from '../../lib/prisma.js';
import { ValidationError, NotFoundError, ConflictError } from '../../lib/errors.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { StudentNumberingService } from '../../services/student-numbering.service.js';

export interface CheckDuplicateParams {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  guardianPhone: string;
  guardianEmail?: string | null;
  excludeApplicationId?: string;
}

export class AdmissionsService {
  /**
   * Normalize contact information for comparison
   */
  public static normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10);
  }

  public static normalizeEmail(email?: string | null): string | null {
    return email ? email.trim().toLowerCase() : null;
  }

  /**
   * Two-tier duplicate detection across Admissions and active Students
   */
  public static async checkDuplicates(
    tenantId: string,
    schoolId: string,
    params: CheckDuplicateParams
  ) {
    const normPhone = this.normalizePhone(params.guardianPhone);
    const normEmail = this.normalizeEmail(params.guardianEmail);
    const dob = new Date(params.dateOfBirth);

    const matches: Array<{
      type: 'EXACT_STUDENT' | 'EXACT_APPLICATION' | 'PARTIAL_PHONE' | 'PARTIAL_EMAIL' | 'SAME_NAME';
      message: string;
      recordId: string;
      details?: any;
    }> = [];

    // 1. Check existing active Students in this school
    const students = await prisma.student.findMany({
      where: {
        tenantId,
        schoolId,
        archivedAt: null,
      },
      include: {
        guardians: {
          include: { guardian: true },
        },
      },
    });

    for (const student of students) {
      const isNameMatch =
        student.firstName.trim().toLowerCase() === params.firstName.trim().toLowerCase() &&
        student.lastName.trim().toLowerCase() === params.lastName.trim().toLowerCase();
      
      const isDobMatch =
        student.dateOfBirth.toISOString().split('T')[0] === params.dateOfBirth;

      const hasMatchingPhone = student.guardians.some(
        (sg) => this.normalizePhone(sg.guardian.phone) === normPhone
      );
      const hasMatchingEmail = normEmail
        ? student.guardians.some(
            (sg) => this.normalizeEmail(sg.guardian.email) === normEmail
          )
        : false;

      if (isNameMatch && isDobMatch && (hasMatchingPhone || hasMatchingEmail)) {
        matches.push({
          type: 'EXACT_STUDENT',
          message: `Active student already exists (${student.studentId} - ${student.firstName} ${student.lastName})`,
          recordId: student.id,
          details: { studentId: student.studentId, admissionNumber: student.admissionNumber },
        });
      } else if (hasMatchingPhone || hasMatchingEmail) {
        matches.push({
          type: hasMatchingPhone ? 'PARTIAL_PHONE' : 'PARTIAL_EMAIL',
          message: `Guardian contact matches active student ${student.firstName} ${student.lastName} (${student.studentId}) - potential sibling`,
          recordId: student.id,
          details: { studentId: student.studentId, guardianName: student.guardians[0]?.guardian.firstName },
        });
      } else if (isNameMatch && isDobMatch) {
        matches.push({
          type: 'SAME_NAME',
          message: `Student with identical name and date of birth exists (${student.studentId})`,
          recordId: student.id,
        });
      }
    }

    // 2. Check pending/active Admission Applications in this school
    const applications = await prisma.admissionApplication.findMany({
      where: {
        tenantId,
        schoolId,
        archivedAt: null,
        status: { in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] },
        ...(params.excludeApplicationId ? { id: { not: params.excludeApplicationId } } : {}),
      },
    });

    for (const app of applications) {
      const isNameMatch =
        app.firstName.trim().toLowerCase() === params.firstName.trim().toLowerCase() &&
        app.lastName.trim().toLowerCase() === params.lastName.trim().toLowerCase();

      const isDobMatch =
        app.dateOfBirth.toISOString().split('T')[0] === params.dateOfBirth;

      const hasMatchingPhone = this.normalizePhone(app.guardianPhone) === normPhone;
      const hasMatchingEmail = normEmail
        ? this.normalizeEmail(app.guardianEmail) === normEmail
        : false;

      if (isNameMatch && isDobMatch && (hasMatchingPhone || hasMatchingEmail)) {
        matches.push({
          type: 'EXACT_APPLICATION',
          message: `Active admission application already exists (${app.applicationNumber})`,
          recordId: app.id,
          details: { applicationNumber: app.applicationNumber, status: app.status },
        });
      } else if (hasMatchingPhone || hasMatchingEmail) {
        matches.push({
          type: hasMatchingPhone ? 'PARTIAL_PHONE' : 'PARTIAL_EMAIL',
          message: `Guardian contact matches pending application (${app.applicationNumber})`,
          recordId: app.id,
          details: { applicationNumber: app.applicationNumber },
        });
      }
    }

    const isExactDuplicate = matches.some((m) =>
      ['EXACT_STUDENT', 'EXACT_APPLICATION'].includes(m.type)
    );
    const isPotentialDuplicate = matches.length > 0 && !isExactDuplicate;

    return {
      isExactDuplicate,
      isPotentialDuplicate,
      matches,
    };
  }

  /**
   * List admission applications with pagination, search, and filtering
   */
  public static async listAdmissions(
    tenantId: string,
    schoolId: string,
    query: {
      status?: string;
      academicYearId?: string;
      appliedClassId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      schoolId,
      archivedAt: null,
    };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.academicYearId) {
      where.academicYearId = query.academicYearId;
    }
    if (query.appliedClassId) {
      where.appliedClassId = query.appliedClassId;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { applicationNumber: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { guardianName: { contains: s, mode: 'insensitive' } },
        { guardianPhone: { contains: s } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.admissionApplication.count({ where }),
      prisma.admissionApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          academicYear: { select: { id: true, name: true } },
          appliedClass: { select: { id: true, name: true, code: true } },
          convertedStudent: { select: { id: true, studentId: true, admissionNumber: true } },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single admission application by ID
   */
  public static async getAdmissionById(tenantId: string, schoolId: string, id: string) {
    const application = await prisma.admissionApplication.findFirst({
      where: { id, tenantId, schoolId, archivedAt: null },
      include: {
        academicYear: true,
        appliedClass: true,
        convertedStudent: {
          select: { id: true, studentId: true, admissionNumber: true, status: true },
        },
        documents: {
          where: { archivedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!application) {
      throw new NotFoundError('Admission application not found');
    }

    return application;
  }

  /**
   * Create a new admission application
   */
  public static async createAdmission(
    tenantId: string,
    schoolId: string,
    actorId: string | undefined,
    data: any,
    ipAddress?: string
  ) {
    // 1. Check duplicate signals
    const dupCheck = await this.checkDuplicates(tenantId, schoolId, {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      guardianPhone: data.guardianPhone,
      guardianEmail: data.guardianEmail,
    });

    if (dupCheck.isExactDuplicate) {
      throw new ConflictError(
        'Exact active student or admission application already exists with this student name, DOB, and guardian contact.',
        { matches: dupCheck.matches }
      );
    }

    if (dupCheck.isPotentialDuplicate && !data.confirmDuplicate) {
      throw new ValidationError('Potential duplicate detected. Please review matches before confirming.', {
        code: 'POTENTIAL_DUPLICATE',
        matches: dupCheck.matches,
      });
    }

    // 2. Validate academic year and class existence
    const [academicYear, appliedClass] = await Promise.all([
      prisma.academicYear.findFirst({ where: { id: data.academicYearId, schoolId } }),
      prisma.classMaster.findFirst({ where: { id: data.appliedClassId, tenantId, schoolId, isActive: true } }),
    ]);

    if (!academicYear) {
      throw new ValidationError('Invalid or inactive academic year');
    }
    if (!appliedClass) {
      throw new ValidationError('Invalid or inactive applied class');
    }

    // 3. Generate Application Number atomically
    const applicationNumber = await StudentNumberingService.generateApplicationNumber(tenantId, schoolId);

    const application = await prisma.admissionApplication.create({
      data: {
        tenantId,
        schoolId,
        academicYearId: data.academicYearId,
        appliedClassId: data.appliedClassId,
        applicationNumber,
        applicationDate: data.applicationDate ? new Date(data.applicationDate) : new Date(),
        status: data.status || 'SUBMITTED',
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
        guardianName: data.guardianName.trim(),
        guardianRelationship: data.guardianRelationship.trim(),
        guardianPhone: data.guardianPhone.trim(),
        guardianAltPhone: data.guardianAltPhone?.trim() || null,
        guardianEmail: data.guardianEmail?.trim() || null,
        guardianOccupation: data.guardianOccupation?.trim() || null,
        guardianId: data.guardianId || null,
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'ADMISSION_CREATED',
      entityType: 'AdmissionApplication',
      entityId: application.id,
      afterData: application,
      ipAddress,
    });

    return application;
  }

  /**
   * Update an existing admission application
   */
  public static async updateAdmission(
    tenantId: string,
    schoolId: string,
    id: string,
    actorId: string | undefined,
    data: any,
    ipAddress?: string
  ) {
    const existing = await this.getAdmissionById(tenantId, schoolId, id);

    if (existing.status === 'CONVERTED') {
      throw new ValidationError('Converted admission applications cannot be edited');
    }

    const updateData: any = {};
    const stringFields = [
      'firstName', 'middleName', 'lastName', 'displayName', 'gender',
      'placeOfBirth', 'nationality', 'religionId', 'categoryId', 'casteId',
      'bloodGroup', 'primaryLanguage', 'previousSchool', 'previousClass',
      'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country',
      'guardianName', 'guardianRelationship', 'guardianPhone', 'guardianAltPhone',
      'guardianEmail', 'guardianOccupation', 'guardianId', 'appliedClassId', 'academicYearId'
    ];

    for (const f of stringFields) {
      if (data[f] !== undefined) {
        updateData[f] = data[f];
      }
    }

    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }
    if (data.applicationDate) {
      updateData.applicationDate = new Date(data.applicationDate);
    }

    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: updateData,
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: 'ADMISSION_UPDATED',
      entityType: 'AdmissionApplication',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      ipAddress,
    });

    return updated;
  }

  /**
   * Update admission application status (SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED)
   */
  public static async updateStatus(
    tenantId: string,
    schoolId: string,
    id: string,
    actorId: string | undefined,
    status: string,
    rejectionReason?: string,
    reviewNotes?: string,
    ipAddress?: string
  ) {
    const existing = await this.getAdmissionById(tenantId, schoolId, id);

    if (existing.status === 'CONVERTED') {
      throw new ValidationError('Converted application status cannot be modified');
    }

    // Status transition rules
    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ['SUBMITTED', 'REJECTED'],
      SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      UNDER_REVIEW: ['APPROVED', 'REJECTED', 'SUBMITTED'],
      APPROVED: ['UNDER_REVIEW', 'SUBMITTED'], // Can revert approval if needed before conversion
      REJECTED: ['UNDER_REVIEW', 'SUBMITTED'], // Can re-open for reconsideration
    };

    if (!allowedTransitions[existing.status]?.includes(status)) {
      throw new ValidationError(
        `Invalid status transition from ${existing.status} to ${status}`
      );
    }

    if (status === 'REJECTED' && (!rejectionReason || !rejectionReason.trim())) {
      throw new ValidationError('Rejection reason is mandatory when rejecting an application');
    }

    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason?.trim() : null,
        reviewNotes: reviewNotes !== undefined ? reviewNotes : existing.reviewNotes,
        reviewedBy: actorId || null,
        reviewedAt: new Date(),
      },
    });

    await writeAuditLog({
      tenantId,
      schoolId,
      actorId,
      action: status === 'APPROVED' ? 'ADMISSION_APPROVED' : status === 'REJECTED' ? 'ADMISSION_REJECTED' : 'ADMISSION_STATUS_CHANGED',
      entityType: 'AdmissionApplication',
      entityId: id,
      beforeData: { status: existing.status, rejectionReason: existing.rejectionReason },
      afterData: { status: updated.status, rejectionReason: updated.rejectionReason },
      ipAddress,
    });

    return updated;
  }

  /**
   * Transactional conversion of an APPROVED admission application into a full Student
   */
  public static async convertToStudent(
    tenantId: string,
    schoolId: string,
    id: string,
    actorId: string | undefined,
    params: {
      classId?: string;
      sectionId?: string | null;
      rollNumber?: string | null;
      admissionDate?: string;
    },
    ipAddress?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch and validate application with lock
      const application = await tx.admissionApplication.findFirst({
        where: { id, tenantId, schoolId, archivedAt: null },
      });

      if (!application) {
        throw new NotFoundError('Admission application not found');
      }

      if (application.status === 'CONVERTED') {
        throw new ConflictError('This admission application has already been converted to a student.');
      }

      if (application.status !== 'APPROVED') {
        throw new ValidationError('Only approved admission applications can be converted to students.');
      }

      const targetClassId = params.classId || application.appliedClassId;

      // 2. Validate class
      const classMaster = await tx.classMaster.findFirst({
        where: { id: targetClassId, tenantId, schoolId, isActive: true },
      });
      if (!classMaster) {
        throw new ValidationError('Selected class is invalid or inactive');
      }

      // 3. Validate section if specified
      if (params.sectionId) {
        const classSection = await tx.classSection.findFirst({
          where: {
            classId: targetClassId,
            sectionId: params.sectionId,
            tenantId,
            schoolId,
            isActive: true,
          },
        });
        if (!classSection) {
          throw new ValidationError('The selected section is not mapped to this class');
        }
      }

      // 4. Generate immutable Student ID and Admission Number
      const studentId = await StudentNumberingService.generateStudentId(tenantId, schoolId, tx);
      const admissionNumber = await StudentNumberingService.generateAdmissionNumber(tenantId, schoolId, tx);

      // 5. Determine roll number
      let rollNumber = params.rollNumber?.trim() || null;
      if (!rollNumber) {
        rollNumber = await StudentNumberingService.suggestNextRollNumber(
          tenantId,
          schoolId,
          application.academicYearId,
          targetClassId,
          params.sectionId,
          tx
        );
      }

      // Check roll number uniqueness within class (and section if configured)
      const config = await tx.schoolConfiguration.findFirst({
        where: { tenantId, schoolId },
      });
      const scope = config?.rollNumberScope || 'CLASS_SECTION_YEAR';

      const rollWhere: any = {
        tenantId,
        schoolId,
        academicYearId: application.academicYearId,
        classId: targetClassId,
        rollNumber,
        status: 'ACTIVE',
      };
      if (scope === 'CLASS_SECTION_YEAR' && params.sectionId) {
        rollWhere.sectionId = params.sectionId;
      }

      const existingRoll = await tx.studentEnrollment.findFirst({
        where: rollWhere,
      });

      if (existingRoll) {
        throw new ConflictError(
          `Roll number ${rollNumber} is already assigned in this ${scope === 'CLASS_SECTION_YEAR' ? 'class & section' : 'class'} for this academic year.`
        );
      }

      // 6. Handle Guardian: deduplicate by phone/email or link existing
      let guardianId = application.guardianId;

      if (!guardianId) {
        const normPhone = this.normalizePhone(application.guardianPhone);
        const normEmail = this.normalizeEmail(application.guardianEmail);

        // Find existing guardian in this school
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
          // Split guardianName into first/last
          const nameParts = application.guardianName.trim().split(' ');
          const gFirst = nameParts[0] || 'Guardian';
          const gLast = nameParts.slice(1).join(' ') || 'Parent';

          const newGuardian = await tx.guardian.create({
            data: {
              tenantId,
              schoolId,
              firstName: gFirst,
              lastName: gLast,
              relationship: application.guardianRelationship,
              phone: application.guardianPhone,
              normalizedPhone: normPhone,
              email: application.guardianEmail,
              normalizedEmail: normEmail,
              occupation: application.guardianOccupation,
              address: application.addressLine1,
              city: application.city,
              state: application.state,
              postalCode: application.postalCode,
              country: application.country,
            },
          });
          guardianId = newGuardian.id;
        }
      }

      // 7. Create Student record
      const admissionDate = params.admissionDate ? new Date(params.admissionDate) : new Date();

      const student = await tx.student.create({
        data: {
          tenantId,
          schoolId,
          studentId,
          admissionNumber,
          admissionDate,
          admittedAcademicYearId: application.academicYearId,
          admissionApplicationId: application.id,
          status: 'ACTIVE',
          firstName: application.firstName,
          middleName: application.middleName,
          lastName: application.lastName,
          displayName: application.displayName,
          gender: application.gender,
          dateOfBirth: application.dateOfBirth,
          placeOfBirth: application.placeOfBirth,
          nationality: application.nationality,
          religionId: application.religionId,
          categoryId: application.categoryId,
          casteId: application.casteId,
          bloodGroup: application.bloodGroup,
          primaryLanguage: application.primaryLanguage,
          photoFileId: application.photoFileId,
          photoStorageKey: application.photoStorageKey,
          previousSchool: application.previousSchool,
          previousClass: application.previousClass,
          addressLine1: application.addressLine1,
          addressLine2: application.addressLine2,
          city: application.city,
          state: application.state,
          postalCode: application.postalCode,
          country: application.country,
        },
      });

      // 8. Create StudentGuardian link
      await tx.studentGuardian.create({
        data: {
          tenantId,
          schoolId,
          studentId: student.id,
          guardianId,
          relationship: application.guardianRelationship,
          isPrimary: true,
          isEmergencyContact: true,
          hasPickupPermission: true,
          livesWithStudent: true,
        },
      });

      // 9. Create StudentEnrollment
      const enrollment = await tx.studentEnrollment.create({
        data: {
          tenantId,
          schoolId,
          studentId: student.id,
          academicYearId: application.academicYearId,
          classId: targetClassId,
          sectionId: params.sectionId || null,
          rollNumber,
          status: 'ACTIVE',
          enrollmentDate: admissionDate,
        },
      });

      // 10. Link existing documents to student
      await tx.studentDocument.updateMany({
        where: {
          applicationId: application.id,
          tenantId,
          schoolId,
        },
        data: {
          studentId: student.id,
        },
      });

      // 11. Mark Admission Application as CONVERTED
      const updatedApp = await tx.admissionApplication.update({
        where: { id: application.id },
        data: {
          status: 'CONVERTED',
          convertedAt: new Date(),
        },
      });

      // 12. Write audit logs
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'ADMISSION_CONVERTED',
        entityType: 'AdmissionApplication',
        entityId: application.id,
        afterData: { convertedStudentId: student.id, studentId: student.studentId, admissionNumber: student.admissionNumber },
        ipAddress,
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
        application: updatedApp,
      };
    });
  }
}
