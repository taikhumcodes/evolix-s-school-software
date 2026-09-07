import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';
import { CommunicationService } from '../communication.service.js';
import { DomainEventService } from '../events/domain-event.service.js';

export class SchedulerService {
  private static workerLoopTimer: NodeJS.Timeout | null = null;
  private static isShuttingDown = false;
  private static isLoopRunning = false;

  /**
   * Recovers stale locked jobs from crashed workers (Rule 5).
   */
  public static async recoverStaleJobs(staleTimeoutMinutes = 5): Promise<number> {
    const threshold = new Date(Date.now() - staleTimeoutMinutes * 60 * 1000);

    const result = await prisma.scheduledAutomationJob.updateMany({
      where: {
        status: 'PROCESSING',
        lockedAt: {
          lt: threshold,
        },
      },
      data: {
        status: 'PENDING',
        lockedAt: null,
        lockedBy: null,
      },
    });

    if (result.count > 0) {
      logger.warn({ count: result.count }, '[SchedulerService] Recovered stale scheduled jobs');
    }

    return result.count;
  }

  /**
   * Concurrency-safe job claiming using PostgreSQL SELECT FOR UPDATE SKIP LOCKED (Rule 47 & 48).
   */
  public static async claimDueJobs(workerId: string, batchSize = 25, scopeSchoolId?: string): Promise<any[]> {
    return prisma.$transaction(async (tx) => {
      const schoolFilter = scopeSchoolId ? Prisma.sql`AND "school_id" = ${scopeSchoolId}::uuid` : Prisma.empty;

      const claimedRows: any[] = await tx.$queryRaw`
        SELECT "id"
        FROM "scheduled_automation_jobs"
        WHERE "status" = 'PENDING'
          AND "scheduled_for" <= (NOW() AT TIME ZONE 'UTC')
          ${schoolFilter}
        ORDER BY "scheduled_for" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      `;

      if (!claimedRows || claimedRows.length === 0) {
        return [];
      }

      const ids = claimedRows.map((r) => r.id);

      await tx.scheduledAutomationJob.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'PROCESSING',
          lockedAt: new Date(),
          lockedBy: workerId,
          attemptCount: { increment: 1 },
        },
      });

      return tx.scheduledAutomationJob.findMany({
        where: { id: { in: ids } },
      });
    });
  }

  /**
   * Executes authoritative double guards before sending/executing a job (Rules 29, 32, 34, 35, 36).
   * Returns null if eligible, or a skip reason string if no longer eligible.
   */
  public static async checkAuthoritativeDoubleGuards(job: any): Promise<string | null> {
    const { jobType, sourceType, sourceId, schoolId } = job;

    // Rule 29: Fee reminder final recheck
    if (jobType === 'FEE_DUE_REMINDER' || sourceType === 'FeeInvoice') {
      const invoice = await prisma.feeInvoice.findFirst({
        where: { id: sourceId, schoolId },
      });

      if (!invoice) return 'INVOICE_NOT_FOUND';
      if (invoice.status === 'PAID') return 'SOURCE_NO_LONGER_ELIGIBLE_INVOICE_PAID';
      if (invoice.status === 'CANCELLED' || invoice.status === 'REVERSED') return 'SOURCE_NO_LONGER_ELIGIBLE_CANCELLED';
      if (new Prisma.Decimal(invoice.outstandingAmount).lessThanOrEqualTo(0)) {
        return 'SOURCE_NO_LONGER_ELIGIBLE_ZERO_BALANCE';
      }
    }

    // Rule 32: Result publication double guard
    if (jobType === 'EXAM_RESULT_NOTIFICATION' || sourceType === 'Exam') {
      const exam = await prisma.exam.findFirst({
        where: { id: sourceId, schoolId },
      });

      if (!exam) return 'EXAM_NOT_FOUND';
      if (exam.status !== 'PUBLISHED') return 'SOURCE_NOT_PUBLISHED';
    }

    // Rule 34: Payslip double guard
    if (jobType === 'PAYSLIP_NOTIFICATION' || sourceType === 'PayrollPayment' || sourceType === 'PayrollRun') {
      if (sourceType === 'PayrollPayment') {
        const payment = await prisma.payrollPayment.findFirst({
          where: { id: sourceId, schoolId },
          include: { payrollRun: true },
        });
        if (!payment) return 'PAYMENT_NOT_ELIGIBLE';
        if (payment.payrollRun && payment.payrollRun.status !== 'POSTED' && payment.payrollRun.status !== 'PAID') {
          return 'PAYROLL_RUN_NOT_POSTED';
        }
      }
    }

    // Rule 35: Transport NOT_BOARDED double guard
    if (jobType === 'TRANSPORT_BOARDING_ALERT' || sourceType === 'TransportTripBoarding') {
      const boarding = await (prisma as any).transportTripBoarding?.findFirst({
        where: { id: sourceId },
      });
      // If boarding record exists and status became BOARDED, skip stale alert!
      if (boarding && boarding.status === 'BOARDED') {
        return 'BOARDING_STATUS_ALREADY_BOARDED';
      }
    }

    // Rule 36: Event reminder recheck
    if (jobType === 'EVENT_REMINDER' || sourceType === 'SchoolEvent') {
      const event = await prisma.schoolEvent.findFirst({
        where: { id: sourceId, schoolId },
      });
      if (!event) return 'EVENT_NOT_FOUND';
      if (event.status === 'CANCELLED' || event.status === 'ARCHIVED' || event.status === 'COMPLETED') {
        return 'EVENT_NO_LONGER_ACTIVE';
      }
    }

    return null; // All double guards passed!
  }

  /**
   * Classifies error as transient (retryable) or permanent (Rule 49 & 50).
   */
  public static isPermanentError(errorCode?: string): boolean {
    if (!errorCode) return false;
    const permanentCodes = [
      'INVALID_EMAIL_DESTINATION',
      'INVALID_PHONE_DESTINATION',
      'USER_NOT_FOUND',
      'SMTP_NOT_CONFIGURED',
      'SMS_NOT_CONFIGURED',
      'PROVIDER_AUTH_FAILED',
      'SOURCE_NO_LONGER_ELIGIBLE',
      'TEMPLATE_VARIABLE_INVALID',
      'INVALID_TEMPLATE',
      'TEMPLATE_NOT_FOUND',
      'PROVIDER_CONFIGURATION_MISSING',
      'MISSING_DESTINATION',
    ];
    return permanentCodes.includes(errorCode);
  }

  /**
   * Processes a single claimed job.
   */
  public static async processJob(job: any): Promise<void> {
    try {
      // 1. Authoritative double guards check (Rules 29, 32, 34, 35, 36)
      const skipReason = await this.checkAuthoritativeDoubleGuards(job);
      if (skipReason) {
        logger.info({ jobId: job.id, skipReason }, '[SchedulerService] Job skipped due to double guard');
        await prisma.scheduledAutomationJob.update({
          where: { id: job.id },
          data: {
            status: 'SKIPPED',
            skipReason,
            completedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
          },
        });
        return;
      }

      // 2. Execute job logic
      const payload = job.payload || {};
      if (job.jobType === 'DEFERRED_COMMUNICATION') {
        const action = payload.action;
        const origPayload = payload.originalPayload || {};

        if (action?.channel && action?.templateCode) {
          await CommunicationService.queueMessageFromAutomation({
            tenantId: job.tenantId,
            schoolId: job.schoolId,
            channel: action.channel,
            templateCode: action.templateCode,
            recipientType: action.recipientType || 'STUDENT_GUARDIAN',
            customRecipientId: action.customRecipientId,
            sourceType: job.sourceType,
            sourceId: job.sourceId,
            payload: origPayload,
            isTest: false,
          });
        }
      }

      // Mark completed
      await prisma.scheduledAutomationJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
        },
      });
    } catch (err: any) {
      logger.error({ jobId: job.id, err: err.message }, '[SchedulerService] Job failed');

      const errorCode = err.code || err.errorCode;
      const isPermanent = this.isPermanentError(errorCode);
      const maxAttempts = 3;
      const willRetry = !isPermanent && job.attemptCount < maxAttempts;

      if (willRetry) {
        // Bounded exponential backoff: 2^attemptCount * 30 seconds
        const backoffSeconds = Math.pow(2, job.attemptCount) * 30;
        const nextRun = new Date(Date.now() + backoffSeconds * 1000);
        await prisma.scheduledAutomationJob.update({
          where: { id: job.id },
          data: {
            status: 'PENDING',
            scheduledFor: nextRun,
            lastError: err.message || 'Job execution error',
            lockedAt: null,
            lockedBy: null,
          },
        });
      } else {
        await prisma.scheduledAutomationJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            lastError: err.message || 'Job execution error',
            lockedAt: null,
            lockedBy: null,
          },
        });
      }
    }
  }

  /**
   * Processes all pending domain events and scheduled jobs (called manually or via worker loop).
   */
  public static async processPendingWork(
    workerId: string,
    batchSize = 25,
    scopeSchoolId?: string
  ): Promise<{ eventsProcessed: number; jobsProcessed: number; outboxProcessed: number }> {
    // 1. Process Domain Events
    const eventsProcessed = await DomainEventService.processBatch(workerId, batchSize, scopeSchoolId);

    // 2. Process Scheduled Jobs
    await this.recoverStaleJobs();
    const dueJobs = await this.claimDueJobs(workerId, batchSize, scopeSchoolId);
    for (const job of dueJobs) {
      await this.processJob(job);
    }

    // 3. Process Outbox Communication Messages
    const outboxProcessed = await CommunicationService.processOutbox(workerId, batchSize, scopeSchoolId);

    return {
      eventsProcessed,
      jobsProcessed: dueJobs.length,
      outboxProcessed,
    };
  }

  /**
   * Worker Loop Lifecycle management (Rule 6).
   * Safe for multi-instance, starts only once, graceful shutdown on SIGINT/SIGTERM.
   */
  public static startWorker(intervalMs = 10000): void {
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_WORKER === 'true') {
      logger.info('[SchedulerWorker] In-process worker skipped in test/CLI environment');
      return;
    }

    if (this.workerLoopTimer) {
      return; // Already started
    }

    const workerId = `worker-${process.pid}-${Date.now().toString(36)}`;
    logger.info({ workerId, intervalMs }, '[SchedulerWorker] In-process worker loop started');

    const runLoop = async () => {
      if (this.isShuttingDown || this.isLoopRunning) return;
      this.isLoopRunning = true;
      try {
        await this.processPendingWork(workerId, 25);
      } catch (err: any) {
        logger.error({ err: err.message }, '[SchedulerWorker] Loop execution error');
      } finally {
        this.isLoopRunning = false;
      }
    };

    this.workerLoopTimer = setInterval(runLoop, intervalMs);

    // Graceful shutdown hooks
    const shutdownHandler = () => {
      this.stopWorker();
    };
    process.once('SIGTERM', shutdownHandler);
    process.once('SIGINT', shutdownHandler);
  }

  public static stopWorker(): void {
    this.isShuttingDown = true;
    if (this.workerLoopTimer) {
      clearInterval(this.workerLoopTimer);
      this.workerLoopTimer = null;
      logger.info('[SchedulerWorker] In-process worker loop stopped gracefully');
    }
  }
}
