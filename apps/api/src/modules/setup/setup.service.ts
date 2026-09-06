import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { hashPassword, generateTemporaryPassword } from '../../lib/crypto.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { ConfigurationService } from '../configuration/configuration.service.js';

export class SetupService {
  private static readonly STEP_ORDER = [
    'school_name',
    'logo',
    'academic_year',
    'classes',
    'sections',
    'subjects',
    'fee_structure',
    'users',
    'transport',
    'done',
  ];

  static async getOrCreateProgress(tenantId: string, schoolId: string) {
    let progress = await prisma.schoolSetupProgress.findUnique({
      where: { schoolId },
    });

    if (!progress) {
      progress = await prisma.schoolSetupProgress.create({
        data: {
          tenantId,
          schoolId,
          setupStatus: 'IN_PROGRESS',
          currentStep: 'school_name',
          completedSteps: JSON.stringify([]),
        },
      });
    }

    return progress;
  }

  static async getStatus(tenantId: string, schoolId: string) {
    const progress = await this.getOrCreateProgress(tenantId, schoolId);

    // Compute underlying operational readiness
    const [school, config, branding, academicYearsCount, classesCount, classSectionsCount, subjectsCount, feeHeadsCount, vehicleTypesCount, userSchoolsCount] =
      await Promise.all([
        prisma.school.findUnique({ where: { id: schoolId } }),
        prisma.schoolConfiguration.findUnique({ where: { schoolId } }),
        prisma.brandingConfiguration.findUnique({ where: { schoolId } }),
        prisma.academicYear.count({ where: { schoolId, isDeleted: false } }),
        prisma.classMaster.count({ where: { schoolId, archivedAt: null } }),
        prisma.classSection.count({ where: { schoolId } }),
        prisma.subjectMaster.count({ where: { schoolId, archivedAt: null } }),
        prisma.feeHead.count({ where: { schoolId, archivedAt: null } }),
        prisma.vehicleType.count({ where: { tenantId, archivedAt: null } }),
        prisma.userSchool.count({ where: { schoolId } }),
      ]);

    const completedStepsList: string[] = JSON.parse(progress.completedSteps || '[]');

    return {
      progress: {
        id: progress.id,
        schoolId: progress.schoolId,
        setupStatus: progress.setupStatus,
        currentStep: progress.currentStep,
        completedSteps: completedStepsList,
        completedAt: progress.completedAt?.toISOString() || null,
      },
      summary: {
        school: {
          name: school?.name || '',
          shortName: config?.shortName || '',
          board: config?.board || '',
          code: school?.code || '',
        },
        hasLogo: Boolean(branding?.logoFileId),
        hasAcademicYear: academicYearsCount > 0,
        academicYearsCount,
        classesCount,
        classSectionsCount,
        subjectsCount,
        feeHeadsCount,
        vehicleTypesCount,
        userCount: userSchoolsCount,
        isCompleted: progress.setupStatus === 'COMPLETED',
      },
    };
  }

  static async executeStep(tenantId: string, schoolId: string, stepName: string, payload: any, actorId?: string) {
    const progress = await this.getOrCreateProgress(tenantId, schoolId);
    let stepResultData: any = null;

    switch (stepName) {
      case 'school_name': {
        const { name, shortName, board, contactEmail, contactPhone, address } = payload;
        await prisma.school.update({
          where: { id: schoolId },
          data: { name },
        });
        await ConfigurationService.getOrCreateConfig(tenantId, schoolId);
        await prisma.schoolConfiguration.update({
          where: { schoolId },
          data: {
            legalName: name,
            shortName: shortName || name,
            board: board || 'CBSE',
            contactEmail,
            primaryPhone: contactPhone,
            addressLine1: address,
          },
        });
        break;
      }

      case 'logo': {
        // Logo is uploaded via existing branding upload endpoints.
        // This step just acknowledges completion.
        break;
      }

      case 'academic_year': {
        const { academicYearId, name, startDate, endDate } = payload;
        if (academicYearId) {
          // Set as current
          await prisma.academicYear.updateMany({
            where: { schoolId },
            data: { isCurrent: false },
          });
          await prisma.academicYear.update({
            where: { id: academicYearId },
            data: { isCurrent: true },
          });
        } else if (name && startDate && endDate) {
          await prisma.academicYear.updateMany({
            where: { schoolId },
            data: { isCurrent: false },
          });
          await prisma.academicYear.create({
            data: {
              schoolId,
              name,
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              isCurrent: true,
            },
          });
        }
        break;
      }

      case 'classes': {
        const { classes } = payload;
        for (const cls of classes) {
          await prisma.classMaster.upsert({
            where: { schoolId_code: { schoolId, code: cls.code } },
            update: {
              name: cls.name,
              displayOrder: cls.displayOrder ?? 0,
              academicLevel: cls.academicLevel,
              archivedAt: null,
              isActive: true,
            },
            create: {
              tenantId,
              schoolId,
              name: cls.name,
              code: cls.code,
              displayOrder: cls.displayOrder ?? 0,
              academicLevel: cls.academicLevel,
              isActive: true,
            },
          });
        }
        break;
      }

      case 'sections': {
        const { mappings } = payload;
        for (const map of mappings) {
          const cls = await prisma.classMaster.findFirst({
            where: { schoolId, code: map.classCode, archivedAt: null },
          });
          if (!cls) continue;

          for (const secName of map.sectionNames) {
            const secCode = `SEC-${secName.toUpperCase()}`;
            const sec = await prisma.sectionMaster.upsert({
              where: { schoolId_code: { schoolId, code: secCode } },
              update: { name: secName, archivedAt: null, isActive: true },
              create: {
                tenantId,
                schoolId,
                name: secName,
                code: secCode,
                isActive: true,
              },
            });

            await prisma.classSection.upsert({
              where: {
                classId_sectionId: {
                  classId: cls.id,
                  sectionId: sec.id,
                },
              },
              update: { isActive: true },
              create: {
                tenantId,
                schoolId,
                classId: cls.id,
                sectionId: sec.id,
                capacity: 40,
                isActive: true,
              },
            });
          }
        }
        break;
      }

      case 'subjects': {
        const { subjects } = payload;
        for (const sub of subjects) {
          const createdSub = await prisma.subjectMaster.upsert({
            where: { schoolId_code: { schoolId, code: sub.code } },
            update: {
              name: sub.name,
              type: sub.type || 'THEORY',
              archivedAt: null,
              isActive: true,
            },
            create: {
              tenantId,
              schoolId,
              name: sub.name,
              code: sub.code,
              type: sub.type || 'THEORY',
              isActive: true,
            },
          });

          if (Array.isArray(sub.classCodes) && sub.classCodes.length > 0) {
            const targetClasses = await prisma.classMaster.findMany({
              where: { schoolId, code: { in: sub.classCodes }, archivedAt: null },
            });
            for (const cls of targetClasses) {
              await prisma.classSubject.upsert({
                where: {
                  classId_subjectId: {
                    classId: cls.id,
                    subjectId: createdSub.id,
                  },
                },
                update: { isActive: true },
                create: {
                  tenantId,
                  schoolId,
                  classId: cls.id,
                  subjectId: createdSub.id,
                  isElective: false,
                  isActive: true,
                },
              });
            }
          }
        }
        break;
      }

      case 'fee_structure': {
        const { feeHeads } = payload;
        for (const fh of feeHeads) {
          await prisma.feeHead.upsert({
            where: { schoolId_code: { schoolId, code: fh.code } },
            update: {
              name: fh.name,
              description: fh.description,
              isRefundable: fh.isRefundable ?? false,
              archivedAt: null,
              isActive: true,
            },
            create: {
              tenantId,
              schoolId,
              name: fh.name,
              code: fh.code,
              description: fh.description,
              isRefundable: fh.isRefundable ?? false,
              isActive: true,
            },
          });
        }
        break;
      }

      case 'users': {
        const { users } = payload;
        const createdUsers: Array<{
          id: string;
          email: string;
          temporaryPassword: string;
          firstName: string;
          lastName: string | null;
        }> = [];

        for (const u of users) {
          let user = await prisma.user.findUnique({ where: { email: u.email } });
          if (!user) {
            const temporaryPassword = u.password || generateTemporaryPassword(16);
            const hashedPassword = await hashPassword(temporaryPassword);
            let firstName = u.firstName;
            let lastName = u.lastName;
            if (!firstName && u.fullName) {
              const parts = u.fullName.trim().split(' ');
              firstName = parts[0];
              lastName = parts.slice(1).join(' ') || '-';
            }
            user = await prisma.user.create({
              data: {
                tenantId,
                email: u.email,
                firstName: firstName || 'Staff',
                lastName: lastName || 'User',
                hashedPassword,
                mustChangePassword: true,
                isActive: true,
              },
            });
            createdUsers.push({
              id: user.id,
              email: user.email,
              temporaryPassword,
              firstName: user.firstName,
              lastName: user.lastName,
            });
          }

          // Assign to school
          await prisma.userSchool.upsert({
            where: { userId_schoolId: { userId: user.id, schoolId } },
            update: {},
            create: { userId: user.id, schoolId },
          });

          // Assign role if role specified (by id, code, or name)
          const roleIdentifier = u.roleId || u.roleCode || u.roleName;
          if (roleIdentifier) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleIdentifier);
            const role = await prisma.role.findFirst({
              where: {
                tenantId,
                OR: [
                  ...(isUuid ? [{ id: roleIdentifier }] : []),
                  { name: { equals: roleIdentifier, mode: 'insensitive' } },
                ],
              },
            });
            if (role) {
              await prisma.userRole.upsert({
                where: { userId_roleId: { userId: user.id, roleId: role.id } },
                update: {},
                create: { userId: user.id, roleId: role.id },
              });
            }
          }
        }
        stepResultData = { createdUsers };
        break;
      }

      case 'transport': {
        const { vehicleTypes } = payload;
        if (Array.isArray(vehicleTypes)) {
          for (const vt of vehicleTypes) {
            const existing = await prisma.vehicleType.findFirst({
              where: { tenantId, code: vt.code },
            });
            if (!existing) {
              await prisma.vehicleType.create({
                data: {
                  tenantId,
                  schoolId,
                  name: vt.name,
                  code: vt.code,
                  capacity: vt.capacity !== undefined ? Number(vt.capacity) : null,
                  isActive: true,
                },
              });
            } else if (existing.archivedAt) {
              await prisma.vehicleType.update({
                where: { id: existing.id },
                data: {
                  archivedAt: null,
                  isActive: true,
                  name: vt.name,
                  capacity: vt.capacity !== undefined ? Number(vt.capacity) : existing.capacity,
                },
              });
            }
          }
        }
        break;
      }

      case 'done': {
        // Handled in completeSetup
        break;
      }

      default:
        throw new ValidationError(`Unknown setup step: ${stepName}`);
    }

    // Update completed steps
    const completedSet = new Set<string>(JSON.parse(progress.completedSteps || '[]'));
    completedSet.add(stepName);

    const stepIdx = this.STEP_ORDER.indexOf(stepName);
    const nextStep = stepIdx >= 0 && stepIdx < this.STEP_ORDER.length - 1 ? this.STEP_ORDER[stepIdx + 1] : 'done';

    const updated = await prisma.schoolSetupProgress.update({
      where: { schoolId },
      data: {
        completedSteps: JSON.stringify(Array.from(completedSet)),
        currentStep: nextStep,
      },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: `SCHOOL_SETUP_STEP_${stepName.toUpperCase()}_COMPLETED`,
        entityType: 'SchoolSetupProgress',
        entityId: updated.id,
        afterData: { stepName, payload },
      });
    }

    const status = await this.getStatus(tenantId, schoolId);
    return stepResultData ? { ...status, ...stepResultData } : status;
  }

  static async completeSetup(tenantId: string, schoolId: string, actorId?: string) {
    const school = await prisma.school.findFirst({ where: { id: schoolId, tenantId, deletedAt: null } });
    if (!school) throw new ValidationError('School profile not found. Please complete school profile setup.');

    const classCount = await prisma.classMaster.count({ where: { schoolId, tenantId, archivedAt: null } });
    if (classCount === 0) throw new ValidationError('At least one class is required before completing setup.');

    const progress = await this.getOrCreateProgress(tenantId, schoolId);

    const completedSet = new Set<string>(JSON.parse(progress.completedSteps || '[]'));
    for (const step of this.STEP_ORDER) {
      completedSet.add(step);
    }

    const updated = await prisma.schoolSetupProgress.update({
      where: { schoolId },
      data: {
        setupStatus: 'COMPLETED',
        currentStep: 'done',
        completedSteps: JSON.stringify(Array.from(completedSet)),
        completedAt: new Date(),
      },
    });

    if (actorId) {
      await writeAuditLog({
        tenantId,
        schoolId,
        actorId,
        action: 'SCHOOL_SETUP_COMPLETED',
        entityType: 'SchoolSetupProgress',
        entityId: updated.id,
        afterData: { completedAt: updated.completedAt },
      });
    }

    return this.getStatus(tenantId, schoolId);
  }
}
