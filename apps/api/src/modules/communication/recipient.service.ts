import { prisma } from '../../lib/prisma.js';
import { RecipientType, CommunicationChannel, CommunicationCategory, TemplateLanguage } from '@prisma/client';
import { ResolvedRecipient, ScopeContext } from './communication.types.js';

export class RecipientService {
  /**
   * Resolves recipient contact information for a given target entity.
   */
  public static async resolveRecipient(
    ctx: ScopeContext,
    recipientType: RecipientType,
    referenceId: string,
    studentIdContext?: string
  ): Promise<ResolvedRecipient[]> {
    const results: ResolvedRecipient[] = [];

    switch (recipientType) {
      case 'STUDENT_GUARDIAN': {
        // Find guardians linked to this student
        const targetStudentId = studentIdContext || referenceId;
        const student = await prisma.student.findFirst({
          where: { id: targetStudentId, schoolId: ctx.schoolId },
          include: {
            guardians: {
              include: {
                guardian: true,
              },
            },
          },
        });

        if (!student) return [];

        const studentName = `${student.firstName} ${student.lastName || ''}`.trim();

        // Include primary guardians first, or all guardians
        for (const link of student.guardians) {
          if (link.guardian && !link.guardian.archivedAt) {
            results.push({
              referenceId: link.guardian.id,
              type: 'STUDENT_GUARDIAN',
              name: `${link.guardian.firstName} ${link.guardian.lastName || ''}`.trim(),
              email: link.guardian.email || undefined,
              phone: link.guardian.phone || link.guardian.altPhone || undefined,
              preferredLanguage: link.guardian.preferredLanguage === 'hi' ? 'HINDI' : link.guardian.preferredLanguage === 'hinglish' ? 'HINGLISH' : 'ENGLISH',
              studentId: student.id,
              studentName,
            });
          }
        }
        break;
      }

      case 'GUARDIAN': {
        const guardian = await prisma.guardian.findFirst({
          where: { id: referenceId, schoolId: ctx.schoolId },
        });
        if (guardian && !guardian.archivedAt) {
          results.push({
            referenceId: guardian.id,
            type: 'GUARDIAN',
            name: `${guardian.firstName} ${guardian.lastName || ''}`.trim(),
            email: guardian.email || undefined,
            phone: guardian.phone || guardian.altPhone || undefined,
            preferredLanguage: guardian.preferredLanguage === 'hi' ? 'HINDI' : guardian.preferredLanguage === 'hinglish' ? 'HINGLISH' : 'ENGLISH',
          });
        }
        break;
      }

      case 'EMPLOYEE': {
        const employee = await prisma.employee.findFirst({
          where: { id: referenceId, schoolId: ctx.schoolId },
          include: { user: true },
        });
        if (employee && employee.status === 'ACTIVE') {
          results.push({
            referenceId: employee.id,
            type: 'EMPLOYEE',
            name: `${employee.firstName} ${employee.lastName || ''}`.trim(),
            email: employee.email || employee.user?.email,
            phone: employee.phone || undefined,
            preferredLanguage: 'ENGLISH',
          });
        }
        break;
      }

      case 'USER': {
        const user = await prisma.user.findFirst({
          where: { id: referenceId, tenantId: ctx.tenantId },
        });
        if (user && user.isActive && !user.isDeleted) {
          results.push({
            referenceId: user.id,
            type: 'USER',
            name: `${user.firstName} ${user.lastName || ''}`.trim(),
            email: user.email,
            phone: undefined,
            preferredLanguage: 'ENGLISH',
          });
        }
        break;
      }

      case 'CUSTOM_INTERNAL_TARGET': {
        results.push({
          referenceId,
          type: 'CUSTOM_INTERNAL_TARGET',
          name: 'Internal Target',
        });
        break;
      }
    }

    return results;
  }

  /**
   * Checks whether the recipient has opted out of this category/channel.
   */
  public static async isChannelAllowed(
    schoolId: string,
    recipientType: RecipientType,
    recipientReferenceId: string,
    category: CommunicationCategory,
    channel: CommunicationChannel
  ): Promise<boolean> {
    const pref = await prisma.communicationPreference.findUnique({
      where: {
        unique_recipient_channel_pref: {
          schoolId,
          recipientType,
          recipientReferenceId,
          category,
          channel,
        },
      },
    });

    if (pref && !pref.enabled) {
      return false; // Opted out explicitly
    }
    return true;
  }

  /**
   * Deduplicates recipients intelligently based on student context (Rule 20).
   * - If studentId is present, deduplicate by (referenceId + studentId + channel).
   * - If no studentId (e.g. general school announcement), deduplicate by (referenceId + channel).
   */
  public static deduplicateRecipients(
    recipients: ResolvedRecipient[],
    channel: CommunicationChannel,
    isStudentSpecific: boolean
  ): ResolvedRecipient[] {
    const map = new Map<string, ResolvedRecipient>();

    for (const r of recipients) {
      const key = isStudentSpecific && r.studentId
        ? `${r.referenceId}:${r.studentId}:${channel}`
        : `${r.referenceId}:${channel}`;

      if (!map.has(key)) {
        map.set(key, r);
      }
    }

    return Array.from(map.values());
  }
}
