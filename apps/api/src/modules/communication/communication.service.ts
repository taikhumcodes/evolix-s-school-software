import { Prisma, CommunicationChannel, CommunicationCategory, TemplateLanguage, MessageStatus, RecipientType, BatchStatus, SendEvidenceType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { ScopeContext } from './communication.types.js';
import { renderTemplate, validateTemplate } from './template-engine.js';
import { encryptDestination, maskDestination } from './encryption.util.js';
import { ProviderRegistry } from './providers/provider.registry.js';
import { RecipientService } from './recipient.service.js';
import { logger } from '../../lib/logger.js';

export interface CreateTemplateDto {
  name: string;
  code: string;
  category: CommunicationCategory;
  channel: CommunicationChannel;
  subject?: string;
  body: string;
  language?: TemplateLanguage;
}

export interface UpdateTemplateDto {
  name?: string;
  subject?: string;
  body?: string;
  language?: TemplateLanguage;
  changeDescription?: string;
}

export interface CreateBatchDto {
  name: string;
  category: CommunicationCategory;
  channel: CommunicationChannel;
  templateId?: string;
  audienceDefinition: Record<string, any>;
  scheduledAt?: string;
}

export interface QueueMessageDto {
  channel: CommunicationChannel;
  templateCode: string;
  recipientType: RecipientType;
  recipientReferenceId: string;
  studentIdContext?: string;
  payload: Record<string, any>;
  scheduledAt?: Date;
  sourceType?: string;
  sourceId?: string;
  isTest?: boolean;
}

export class CommunicationService {
  // ==========================================
  // 1. TEMPLATES & VERSIONING
  // ==========================================

  public static async createTemplate(ctx: ScopeContext, dto: CreateTemplateDto) {
    validateTemplate(dto.body);
    if (dto.subject) validateTemplate(dto.subject);

    const existing = await prisma.communicationTemplate.findFirst({
      where: { schoolId: ctx.schoolId, code: dto.code },
    });
    if (existing) {
      throw new ConflictError(`Template with code '${dto.code}' already exists`);
    }

    return prisma.$transaction(async (tx) => {
      const template = await tx.communicationTemplate.create({
        data: {
          tenantId: ctx.tenantId,
          schoolId: ctx.schoolId,
          name: dto.name,
          code: dto.code,
          category: dto.category,
          channel: dto.channel,
          subject: dto.subject || null,
          body: dto.body,
          language: dto.language || 'ENGLISH',
          version: 1,
        },
      });

      await tx.communicationTemplateVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          subject: template.subject,
          body: template.body,
          language: template.language,
          changeSummary: 'Initial creation',
          createdBy: ctx.userId,
        },
      });

      return template;
    });
  }

  public static async updateTemplate(ctx: ScopeContext, templateId: string, dto: UpdateTemplateDto) {
    if (dto.body) validateTemplate(dto.body);
    if (dto.subject) validateTemplate(dto.subject);

    const template = await prisma.communicationTemplate.findFirst({
      where: { id: templateId, schoolId: ctx.schoolId },
    });
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Rule 17: Only increment version if content meaningfully changed
    const contentChanged = (dto.subject !== undefined && dto.subject !== template.subject) ||
      (dto.body !== undefined && dto.body !== template.body);

    const nextVersion = contentChanged ? template.version + 1 : template.version;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.communicationTemplate.update({
        where: { id: templateId },
        data: {
          name: dto.name ?? template.name,
          subject: dto.subject ?? template.subject,
          body: dto.body ?? template.body,
          language: dto.language ?? template.language,
          version: nextVersion,
        },
      });

      if (contentChanged) {
        await tx.communicationTemplateVersion.create({
          data: {
            templateId: template.id,
            version: nextVersion,
            subject: updated.subject,
            body: updated.body,
            language: updated.language,
            changeSummary: dto.changeDescription || `Updated to version ${nextVersion}`,
            createdBy: ctx.userId,
          },
        });
      }

      return updated;
    });
  }

  public static async getTemplates(ctx: ScopeContext, category?: CommunicationCategory, channel?: CommunicationChannel) {
    const where: any = { schoolId: ctx.schoolId, status: 'ACTIVE' };
    if (category) where.category = category;
    if (channel) where.channel = channel;

    return prisma.communicationTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
  }

  // ==========================================
  // 2. QUIET HOURS & TIMEZONES
  // ==========================================

  /**
   * Checks if current time is within quiet hours (Rules 25 & 26).
   * Supports midnight wrap-around (e.g. 21:00 -> 07:00).
   */
  public static isWithinQuietHours(settings: any, referenceDate = new Date()): boolean {
    if (!settings || !settings.quietHoursEnabled) return false;

    const startStr = settings.quietHoursStart || '21:00';
    const endStr = settings.quietHoursEnd || '07:00';

    const [sHours, sMins] = startStr.split(':').map(Number);
    const [eHours, eMins] = endStr.split(':').map(Number);

    const currentHours = referenceDate.getHours();
    const currentMins = referenceDate.getMinutes();

    const currentTotalMins = currentHours * 60 + currentMins;
    const startTotalMins = sHours * 60 + sMins;
    const endTotalMins = eHours * 60 + eMins;

    if (startTotalMins > endTotalMins) {
      // Midnight wrap-around (e.g. 21:00 to 07:00)
      return currentTotalMins >= startTotalMins || currentTotalMins < endTotalMins;
    } else {
      // Normal range within same day (e.g. 13:00 to 15:00)
      return currentTotalMins >= startTotalMins && currentTotalMins < endTotalMins;
    }
  }

  // ==========================================
  // 3. QUEUEING & SENDING MESSAGES
  // ==========================================

  /**
   * Queues an automated communication message triggered by domain event / rule engine.
   */
  public static async queueMessageFromAutomation(options: {
    tenantId: string;
    schoolId: string;
    channel: CommunicationChannel;
    templateCode: string;
    recipientType: RecipientType;
    customRecipientId?: string;
    sourceType: string;
    sourceId: string;
    payload: Record<string, any>;
    isTest: boolean;
    isUrgent?: boolean;
    now?: Date;
  }) {
    const { tenantId, schoolId, channel, templateCode, recipientType, customRecipientId, sourceType, sourceId, payload, isTest, isUrgent = false, now } = options;

    const template = await prisma.communicationTemplate.findFirst({
      where: { schoolId, code: templateCode, status: 'ACTIVE' },
    });
    if (!template) {
      logger.warn({ templateCode, schoolId }, '[CommunicationService] Template not found for automated message');
      return null;
    }

    const scopeCtx: ScopeContext = { tenantId, schoolId, userId: '00000000-0000-0000-0000-000000000000', permissions: [] };

    // Resolve recipient(s)
    const targetId = customRecipientId || payload.studentId || payload.employeeId || payload.userId || sourceId;
    const recipients = await RecipientService.resolveRecipient(scopeCtx, recipientType, targetId, payload.studentId);

    // Filter by communication preferences
    const validRecipients: any[] = [];
    for (const r of recipients) {
      const allowed = await RecipientService.isChannelAllowed(schoolId, recipientType, r.referenceId, template.category, channel);
      if (allowed) validRecipients.push(r);
    }

    // Deduplicate recipients intelligently (Rule 20)
    const isStudentSpecific = Boolean(payload.studentId || payload.studentName || payload['student.name']);
    const dedupedRecipients = RecipientService.deduplicateRecipients(validRecipients, channel, isStudentSpecific);

    // Check quiet hours (Rules 25, 26, 27)
    // Urgency must be RULE-DRIVEN (isUrgent = true)
    // Categories (including ATTENDANCE) MUST NOT automatically bypass quiet hours!
    const settings = await prisma.communicationSettings.findUnique({ where: { schoolId } });
    const inQuietHours = this.isWithinQuietHours(settings, now);

    const queuedMessages: any[] = [];

    for (const recipient of dedupedRecipients) {
      // Merge recipient context into template variables
      const mergedVariables = {
        ...payload,
        recipient: { name: recipient.name, email: recipient.email, phone: recipient.phone },
        student: { name: recipient.studentName || payload.studentName || '' },
      };

      const subjectRendered = template.subject ? renderTemplate({ template: template.subject, variables: mergedVariables }) : null;
      const isHtml = channel === 'EMAIL';
      const bodyRendered = renderTemplate({ template: template.body, variables: mergedVariables, isHtml });

      const destination = recipient.email || recipient.phone || recipient.referenceId;
      const destinationEncrypted = encryptDestination(destination);
      const destinationMasked = maskDestination(destination, channel);

      // Stable idempotency key (Rule 24, 70)
      const idempotencyKey = `auto:${sourceType}:${sourceId}:${recipient.referenceId}:${channel}${isStudentSpecific && recipient.studentId ? `:${recipient.studentId}` : ''}`;

      // Defer date if quiet hours apply and NOT urgent
      let scheduledAt: Date | null = null;
      if (inQuietHours && !isUrgent && channel !== 'IN_APP') {
        const deferDate = now ? new Date(now) : new Date();
        const [eHours, eMins] = (settings?.quietHoursEnd || '07:00').split(':').map(Number);
        deferDate.setDate(deferDate.getDate() + (deferDate.getHours() >= eHours ? 1 : 0));
        deferDate.setHours(eHours, eMins, 0, 0);
        scheduledAt = deferDate;
      }

      try {
        const message = await prisma.communicationMessage.create({
          data: {
            tenantId,
            schoolId,
            templateId: template.id,
            templateVersion: template.version,
            category: template.category,
            channel,
            recipientType,
            recipientReferenceId: recipient.referenceId,
            destinationEncrypted,
            destinationMasked,
            subjectRendered,
            bodyRendered,
            status: 'QUEUED',
            scheduledAt,
            sourceType,
            sourceId,
            idempotencyKey,
            isTest,
          },
        });
        queuedMessages.push(message);
      } catch (err: any) {
        if (err.code === 'P2002') {
          logger.info({ idempotencyKey }, '[CommunicationService] Message already queued (idempotency key matched)');
          continue;
        }
        throw err;
      }
    }

    return queuedMessages;
  }

  // ==========================================
  // 4. BULK BATCH MANAGEMENT
  // ==========================================

  public static async createBatch(ctx: ScopeContext, dto: CreateBatchDto) {
    const settings = await prisma.communicationSettings.findUnique({ where: { schoolId: ctx.schoolId } });
    const threshold = settings?.bulkApprovalThreshold || 100;

    return prisma.communicationBatch.create({
      data: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        name: dto.name,
        category: dto.category,
        channel: dto.channel,
        templateId: dto.templateId || null,
        audienceDefinitionSafeJson: dto.audienceDefinition,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: 'DRAFT',
        createdBy: ctx.userId,
      },
    });
  }

  public static async updateBatch(ctx: ScopeContext, batchId: string, dto: Partial<CreateBatchDto>) {
    const batch = await prisma.communicationBatch.findFirst({
      where: { id: batchId, schoolId: ctx.schoolId },
    });
    if (!batch) throw new NotFoundError('Batch not found');

    if (batch.status === 'QUEUED' || batch.status === 'PROCESSING' || batch.status === 'COMPLETED') {
      throw new BadRequestError(`Cannot modify batch with status ${batch.status}`);
    }

    // Rule 22: If batch was APPROVED and content or audience changes, invalidate approval!
    const isApproved = batch.status === 'APPROVED';
    const contentOrAudienceChanged =
      (dto.name !== undefined && dto.name !== batch.name) ||
      (dto.templateId !== undefined && dto.templateId !== batch.templateId) ||
      (dto.channel !== undefined && dto.channel !== batch.channel) ||
      (dto.audienceDefinition !== undefined);

    const newStatus = isApproved && contentOrAudienceChanged ? 'DRAFT' : batch.status;
    const approvedAt = isApproved && contentOrAudienceChanged ? null : batch.approvedAt;
    const approvedBy = isApproved && contentOrAudienceChanged ? null : batch.approvedBy;

    return prisma.communicationBatch.update({
      where: { id: batchId },
      data: {
        name: dto.name ?? batch.name,
        category: dto.category ?? batch.category,
        channel: dto.channel ?? batch.channel,
        templateId: dto.templateId !== undefined ? dto.templateId : batch.templateId,
        audienceDefinitionSafeJson: dto.audienceDefinition ? dto.audienceDefinition : (batch.audienceDefinitionSafeJson as any),
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : batch.scheduledAt,
        status: newStatus,
        approvedAt,
        approvedBy,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Resolves recipients for a bulk batch preview or final queue (Rule 21).
   */
  public static async resolveBatchRecipients(ctx: ScopeContext, batch: any): Promise<any[]> {
    const audience = batch.audienceDefinitionSafeJson || {};
    const recipientType: RecipientType = audience.recipientType || 'STUDENT_GUARDIAN';

    if (recipientType === 'STUDENT_GUARDIAN' || recipientType === 'GUARDIAN') {
      const where: any = { schoolId: ctx.schoolId, status: 'ACTIVE' };
      if (audience.classId) where.classId = audience.classId;

      const enrollments = await prisma.studentEnrollment.findMany({
        where,
        include: {
          student: {
            include: {
              guardians: { include: { guardian: true } },
            },
          },
        },
      });

      const recipients: any[] = [];
      for (const e of enrollments) {
        if (!e.student) continue;
        for (const link of e.student.guardians) {
          if (link.guardian && !link.guardian.archivedAt) {
            recipients.push({
              referenceId: link.guardian.id,
              type: recipientType,
              name: `${link.guardian.firstName} ${link.guardian.lastName || ''}`.trim(),
              email: link.guardian.email || undefined,
              phone: link.guardian.phone || link.guardian.altPhone || undefined,
              studentId: e.student.id,
              studentName: `${e.student.firstName} ${e.student.lastName || ''}`.trim(),
            });
          }
        }
      }
      return recipients;
    }

    if (recipientType === 'EMPLOYEE') {
      const employees = await prisma.employee.findMany({
        where: { schoolId: ctx.schoolId, status: 'ACTIVE' },
      });
      return employees.map((emp) => ({
        referenceId: emp.id,
        type: 'EMPLOYEE',
        name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
        email: emp.email || undefined,
        phone: emp.phone || undefined,
      }));
    }

    return [];
  }

  /**
   * Approves a batch if required (Rule 22 & 23).
   */
  public static async approveBatch(ctx: ScopeContext, batchId: string, expectedVersion: number) {
    const batch = await prisma.communicationBatch.findFirst({
      where: { id: batchId, schoolId: ctx.schoolId },
    });
    if (!batch) throw new NotFoundError('Batch not found');

    if (batch.version !== expectedVersion) {
      throw new ConflictError('Batch version mismatch. The batch was modified since review.');
    }

    return prisma.communicationBatch.update({
      where: { id: batchId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: ctx.userId,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Queues an approved or eligible batch for delivery (Rules 21, 22, 23, 24).
   */
  public static async queueBatch(ctx: ScopeContext, batchId: string) {
    const batch = await prisma.communicationBatch.findFirst({
      where: { id: batchId, schoolId: ctx.schoolId },
      include: { template: true },
    });
    if (!batch) throw new NotFoundError('Batch not found');

    // Rule 21: Re-resolve recipients authoritatively
    const rawRecipients = await this.resolveBatchRecipients(ctx, batch);
    const resolvedRecipients = RecipientService.deduplicateRecipients(rawRecipients, batch.channel, true);

    // Rule 23: Backend threshold check on actual count
    const settings = await prisma.communicationSettings.findUnique({ where: { schoolId: ctx.schoolId } });
    const threshold = settings?.bulkApprovalThreshold || 100;

    const requiresApproval = resolvedRecipients.length >= threshold;

    if (requiresApproval && batch.status !== 'APPROVED') {
      await prisma.communicationBatch.update({
        where: { id: batchId },
        data: {
          recipientCount: resolvedRecipients.length,
          requiresApproval: true,
          status: 'PENDING_APPROVAL',
        },
      });
      throw new BadRequestError(`Batch recipient count (${resolvedRecipients.length}) meets approval threshold (${threshold}). Admin approval is required before queueing.`);
    }

    // Rule 24: Bulk idempotency - create messages inside transaction
    return prisma.$transaction(async (tx) => {
      const currentBatch = await tx.communicationBatch.findUnique({
        where: { id: batch.id },
      });
      if (!currentBatch) throw new NotFoundError('Batch not found');
      if (currentBatch.status === 'QUEUED' || currentBatch.status === 'PROCESSING' || currentBatch.status === 'COMPLETED') {
        throw new BadRequestError('Batch has already been queued or processed');
      }

      const template = batch.template;
      let preparedCount = 0;

      for (const r of resolvedRecipients) {
        const dest = r.email || r.phone || r.referenceId;
        const idempotencyKey = `batch:${batch.id}:${r.referenceId}${r.studentId ? `:${r.studentId}` : ''}`;

        const bodyRendered = template
          ? renderTemplate({ template: template.body, variables: { recipient: r, student: { name: r.studentName } }, isHtml: batch.channel === 'EMAIL' })
          : batch.name;

        const subjectRendered = template?.subject
          ? renderTemplate({ template: template.subject, variables: { recipient: r, student: { name: r.studentName } } })
          : batch.name;

        try {
          await tx.communicationMessage.create({
            data: {
              tenantId: ctx.tenantId,
              schoolId: ctx.schoolId,
              batchId: batch.id,
              templateId: template?.id || null,
              templateVersion: template?.version || null,
              category: batch.category,
              channel: batch.channel,
              recipientType: r.type,
              recipientReferenceId: r.referenceId,
              destinationEncrypted: encryptDestination(dest),
              destinationMasked: maskDestination(dest, batch.channel),
              subjectRendered,
              bodyRendered,
              status: 'QUEUED',
              scheduledAt: batch.scheduledAt,
              idempotencyKey,
            },
          });
          preparedCount++;
        } catch (err: any) {
          if (err.code === 'P2002') continue; // Idempotency
          throw err;
        }
      }

      const updatedBatch = await tx.communicationBatch.update({
        where: { id: batch.id },
        data: {
          recipientCount: resolvedRecipients.length,
          preparedCount,
          status: 'QUEUED',
          version: { increment: 1 },
        },
      });

      return updatedBatch;
    });
  }

  // ==========================================
  // 5. OUTBOX DISPATCHER (WORKER)
  // ==========================================

  /**
   * Claims and dispatches due queued messages safely (Rules 4, 12, 13, 14).
   */
  public static async processOutbox(workerId: string, batchSize = 25, scopeSchoolId?: string): Promise<number> {
    const now = new Date();
    const schoolFilter = scopeSchoolId ? Prisma.sql`AND "school_id" = ${scopeSchoolId}::uuid` : Prisma.empty;

    // Concurrency-safe lock
    const claimedMessages = await prisma.$transaction(async (tx) => {
      const rows: any[] = await tx.$queryRaw`
        SELECT "id"
        FROM "communication_messages"
        WHERE "status" = 'QUEUED'
          AND ("scheduled_at" IS NULL OR "scheduled_at" <= (NOW() AT TIME ZONE 'UTC'))
          ${schoolFilter}
        ORDER BY "queued_at" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      `;

      if (!rows || rows.length === 0) return [];
      const ids = rows.map((r) => r.id);

      await tx.communicationMessage.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'PROCESSING',
          processedAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });

      return tx.communicationMessage.findMany({
        where: { id: { in: ids } },
      });
    });

    for (const msg of claimedMessages) {
      await this.dispatchMessage(msg);
    }

    return claimedMessages.length;
  }

  /**
   * Dispatches a single message to its registered channel provider.
   */
  public static async dispatchMessage(msg: any): Promise<void> {
    const provider = ProviderRegistry.getProvider(msg.channel);
    const destination = msg.destinationEncrypted ? (await import('./encryption.util.js')).decryptDestination(msg.destinationEncrypted) : '';

    const attemptNumber = msg.attemptCount || 1;
    const attemptStart = new Date();

    if (!provider) {
      await prisma.communicationMessage.update({
        where: { id: msg.id },
        data: {
          status: 'FAILED',
          lastErrorCode: 'PROVIDER_NOT_REGISTERED',
          lastErrorMessage: `No provider registered for channel ${msg.channel}`,
        },
      });
      return;
    }

    try {
      const result = await provider.send({
        messageId: msg.id,
        channel: msg.channel,
        destination,
        subject: msg.subjectRendered || undefined,
        body: msg.bodyRendered,
        isTest: msg.isTest,
        metadata: {
          schoolId: msg.schoolId,
          category: msg.category,
          sourceId: msg.sourceId,
        },
      });

      // Record delivery attempt (Rule 14)
      await prisma.communicationDeliveryAttempt.create({
        data: {
          messageId: msg.id,
          attemptNumber,
          provider: result.provider,
          startedAt: attemptStart,
          completedAt: new Date(),
          resultStatus: result.status,
          errorCode: result.errorCode || null,
          errorMessage: result.errorMessage || null,
          providerMessageId: result.providerMessageId || null,
          safeMetadata: result.rawResponseSafe || Prisma.JsonNull,
        },
      });

      // Update message state (Rule 12 & 13)
      await prisma.communicationMessage.update({
        where: { id: msg.id },
        data: {
          status: result.status,
          sendEvidenceType: result.evidenceType || null,
          deliveryMode: result.deliveryMode || 'AUTOMATIC',
          sentAt: result.status === 'SENT' ? new Date() : null,
          provider: result.provider,
          providerMessageId: result.providerMessageId || null,
          lastErrorCode: result.errorCode || null,
          lastErrorMessage: result.errorMessage || null,
          lastAttemptAt: new Date(),
        },
      });
    } catch (err: any) {
      // Record failed attempt
      await prisma.communicationDeliveryAttempt.create({
        data: {
          messageId: msg.id,
          attemptNumber,
          provider: provider.name,
          startedAt: attemptStart,
          completedAt: new Date(),
          resultStatus: 'FAILED',
          errorCode: 'DELIVERY_EXCEPTION',
          errorMessage: err.message,
        },
      });

      await prisma.communicationMessage.update({
        where: { id: msg.id },
        data: {
          status: 'FAILED',
          lastErrorCode: 'DELIVERY_EXCEPTION',
          lastErrorMessage: err.message,
          lastAttemptAt: new Date(),
        },
      });
    }
  }

  // ==========================================
  // 6. MANUAL SEND RECORDING
  // ==========================================

  /**
   * Confirms a manual send (e.g. WhatsApp shared manually) (Rules 10, 11, 62).
   * Sets status = SENT, deliveryMode = MANUAL_CONFIRMED, sendEvidenceType = MANUAL_CONFIRMED.
   * NEVER sets DELIVERED!
   */
  public static async recordManualSend(ctx: ScopeContext, messageId: string) {
    const msg = await prisma.communicationMessage.findFirst({
      where: { id: messageId, schoolId: ctx.schoolId },
    });
    if (!msg) throw new NotFoundError('Message not found');

    if (msg.status !== 'MANUAL_ACTION_REQUIRED' && msg.status !== 'PREPARED') {
      throw new BadRequestError(`Cannot confirm manual send on message with status ${msg.status}`);
    }

    const now = new Date();

    return prisma.$transaction(async (tx) => {
      // Delivery attempt
      await tx.communicationDeliveryAttempt.create({
        data: {
          messageId: msg.id,
          attemptNumber: (msg.attemptCount || 0) + 1,
          provider: 'ManualUserConfirmation',
          startedAt: now,
          completedAt: now,
          resultStatus: 'SENT',
          safeMetadata: { confirmedByUserId: ctx.userId },
        },
      });

      return tx.communicationMessage.update({
        where: { id: messageId },
        data: {
          status: 'SENT',
          deliveryMode: 'MANUAL_CONFIRMED',
          sendEvidenceType: 'MANUAL_CONFIRMED',
          manualConfirmedAt: now,
          manualConfirmedBy: ctx.userId,
          sentAt: now,
        },
      });
    });
  }

  // ==========================================
  // 7. MESSAGE RETRY & CANCELLATION
  // ==========================================

  /**
   * Validates valid message state machine transitions (Rule 22).
   */
  public static validateMessageTransition(current: MessageStatus, next: MessageStatus): void {
    if (current === next) return;

    const invalidTransitions: Partial<Record<MessageStatus, MessageStatus[]>> = {
      DELIVERED: ['QUEUED', 'DRAFT', 'PREPARED', 'PROCESSING', 'CANCELLED'],
      READ: ['QUEUED', 'DRAFT', 'PREPARED', 'PROCESSING', 'CANCELLED'],
      SENT: ['DRAFT', 'QUEUED', 'PREPARED', 'CANCELLED'],
      CANCELLED: ['QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ'],
      SKIPPED: ['QUEUED', 'PROCESSING', 'SENT', 'DELIVERED'],
    };

    if (invalidTransitions[current]?.includes(next)) {
      throw new BadRequestError(`Invalid message status transition from ${current} to ${next}`);
    }
  }

  /**
   * Concurrency-safe message retry (Rule 61).
   */
  public static async retryMessage(ctx: ScopeContext, messageId: string) {
    return prisma.$transaction(async (tx) => {
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT "id", "status"
        FROM "communication_messages"
        WHERE "id" = ${messageId}::uuid AND "school_id" = ${ctx.schoolId}::uuid
        FOR UPDATE
      `;
      if (!lockedRows || lockedRows.length === 0) throw new NotFoundError('Message not found');

      const currentStatus = lockedRows[0].status;
      this.validateMessageTransition(currentStatus, 'QUEUED');

      if (currentStatus !== 'FAILED' && currentStatus !== 'PROVIDER_NOT_CONFIGURED') {
        throw new BadRequestError(`Cannot retry message with status ${currentStatus}`);
      }

      return tx.communicationMessage.update({
        where: { id: messageId },
        data: {
          status: 'QUEUED',
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
    });
  }

  /**
   * Concurrency-safe schedule cancellation (Rule 60).
   */
  public static async cancelMessage(ctx: ScopeContext, messageId: string) {
    return prisma.$transaction(async (tx) => {
      const msg = await tx.communicationMessage.findFirst({
        where: { id: messageId, schoolId: ctx.schoolId },
      });
      if (!msg) throw new NotFoundError('Message not found');

      this.validateMessageTransition(msg.status, 'CANCELLED');

      if (msg.status === 'PROCESSING') {
        throw new ConflictError('Message is already being processed by worker and cannot be cancelled');
      }

      if (msg.status === 'SENT' || msg.status === 'DELIVERED') {
        throw new BadRequestError('Cannot cancel a message that has already been sent');
      }

      return tx.communicationMessage.update({
        where: { id: messageId },
        data: {
          status: 'CANCELLED',
        },
      });
    });
  }

  // ==========================================
  // 8. MESSAGE HISTORY & AUTHORIZATION
  // ==========================================

  /**
   * Checks category/source authorization (Rule 54).
   */
  public static checkCategoryPermission(ctx: ScopeContext, category: CommunicationCategory) {
    if (ctx.isSuperAdmin) return;

    switch (category) {
      case 'PAYROLL':
        if (!ctx.permissions.includes('payroll.view') && !ctx.permissions.includes('payroll.manage')) {
          throw new ForbiddenError('Viewing payroll communications requires payroll authorization');
        }
        break;
      case 'EXAM':
      case 'RESULT':
        if (!ctx.permissions.includes('exams.view') && !ctx.permissions.includes('results.view')) {
          throw new ForbiddenError('Viewing academic/exam communications requires examination authorization');
        }
        break;
      case 'TRANSPORT':
        if (!ctx.permissions.includes('transport.view') && !ctx.permissions.includes('transport.manage')) {
          throw new ForbiddenError('Viewing transport communications requires transport authorization');
        }
        break;
      default:
        if (!ctx.permissions.includes('communication.view')) {
          throw new ForbiddenError('Viewing communications requires communication.view permission');
        }
        break;
    }
  }

  /**
   * Lists communication messages with body redaction (Rule 55).
   */
  public static async listMessages(ctx: ScopeContext, options: {
    category?: CommunicationCategory;
    channel?: CommunicationChannel;
    status?: MessageStatus;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    const where: any = { schoolId: ctx.schoolId };
    if (options.category) {
      this.checkCategoryPermission(ctx, options.category);
      where.category = options.category;
    }
    if (options.channel) where.channel = options.channel;
    if (options.status) where.status = options.status;

    const [items, total] = await Promise.all([
      prisma.communicationMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          category: true,
          channel: true,
          recipientType: true,
          destinationMasked: true, // Rule 15 & 55: Masked destination only
          status: true,
          sendEvidenceType: true,
          deliveryMode: true,
          queuedAt: true,
          sentAt: true,
          deliveredAt: true,
          provider: true,
          attemptCount: true,
          lastErrorMessage: true,
          sourceType: true,
          sourceId: true,
          createdAt: true,
          // Note: bodyRendered and destinationEncrypted are EXCLUDED from list response (Rule 55)
        },
      }),
      prisma.communicationMessage.count({ where }),
    ]);

    const mappedItems = items.map((item) => ({
      ...item,
      bodyRendered: '[REDACTED]',
    }));

    return { items: mappedItems, total };
  }

  /**
   * Detail endpoint for a single message with category permission check (Rule 54 & 55).
   */
  public static async getMessageDetail(ctx: ScopeContext, messageId: string) {
    const msg = await prisma.communicationMessage.findFirst({
      where: { id: messageId, schoolId: ctx.schoolId },
      include: {
        deliveryAttempts: {
          orderBy: { attemptNumber: 'desc' },
        },
      },
    });
    if (!msg) throw new NotFoundError('Message not found');

    this.checkCategoryPermission(ctx, msg.category);

    return msg;
  }

  // ==========================================
  // 9. SETTINGS & PREFERENCES
  // ==========================================

  public static async getSettings(ctx: ScopeContext) {
    let settings = await prisma.communicationSettings.findUnique({
      where: { schoolId: ctx.schoolId },
    });

    if (!settings) {
      settings = await prisma.communicationSettings.create({
        data: {
          tenantId: ctx.tenantId,
          schoolId: ctx.schoolId,
          defaultChannels: ['IN_APP'],
          quietHoursEnabled: false,
          bulkApprovalThreshold: 100,
          version: 1,
        },
      });
    }

    return settings;
  }

  public static async updateSettings(ctx: ScopeContext, updateData: {
    defaultChannels?: CommunicationChannel[];
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    bulkApprovalThreshold?: number;
    expectedVersion: number;
  }) {
    const existing = await this.getSettings(ctx);

    // Rule 63: Optimistic concurrency version check
    if (existing.version !== updateData.expectedVersion) {
      throw new ConflictError('Communication settings were modified by another administrator. Please refresh.');
    }

    return prisma.communicationSettings.update({
      where: { schoolId: ctx.schoolId },
      data: {
        defaultChannels: updateData.defaultChannels ? (updateData.defaultChannels as any) : undefined,
        quietHoursEnabled: updateData.quietHoursEnabled,
        quietHoursStart: updateData.quietHoursStart,
        quietHoursEnd: updateData.quietHoursEnd,
        bulkApprovalThreshold: updateData.bulkApprovalThreshold,
        version: { increment: 1 },
      },
    });
  }
}
