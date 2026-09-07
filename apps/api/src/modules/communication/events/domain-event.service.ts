import { Prisma, PrismaClient, AutomationEventType } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';
import { RuleEngine } from '../automation/rule-engine.js';

export interface EmitDomainEventOptions {
  tenantId: string;
  schoolId: string;
  eventType: AutomationEventType;
  sourceType: string;
  sourceId: string;
  payload: Record<string, any>;
  isTest?: boolean;
}

export class DomainEventService {
  /**
   * Emits a domain event within an existing transaction client (Rules 1 & 2).
   * Atomically commits alongside the core business record.
   */
  public static async emitDomainEvent(
    tx: Prisma.TransactionClient | PrismaClient,
    options: EmitDomainEventOptions
  ) {
    const { tenantId, schoolId, eventType, sourceType, sourceId, payload, isTest = false } = options;

    return tx.domainEvent.create({
      data: {
        tenantId,
        schoolId,
        eventType,
        sourceType,
        sourceId,
        payload,
        processingStatus: 'PENDING',
        isTest,
      },
    });
  }

  /**
   * Recovers stale locked events that may have been abandoned by a crashed worker (Rule 5).
   */
  public static async recoverStaleLocks(staleTimeoutMinutes = 5): Promise<number> {
    const threshold = new Date(Date.now() - staleTimeoutMinutes * 60 * 1000);

    const result = await prisma.domainEvent.updateMany({
      where: {
        processingStatus: 'PROCESSING',
        lockedAt: {
          lt: threshold,
        },
      },
      data: {
        processingStatus: 'PENDING',
        lockedAt: null,
        lockedBy: null,
      },
    });

    if (result.count > 0) {
      logger.warn({ recoveredCount: result.count }, '[DomainEvent] Recovered stale event locks');
    }

    return result.count;
  }

  /**
   * Concurrency-safe claiming of pending events using PostgreSQL SELECT FOR UPDATE SKIP LOCKED (Rule 4, 7, 47).
   */
  public static async claimPendingEvents(
    workerId: string,
    batchSize = 25,
    scopeSchoolId?: string
  ): Promise<any[]> {
    return prisma.$transaction(async (tx) => {
      // Build raw query for atomic SKIP LOCKED claim
      const schoolFilter = scopeSchoolId ? Prisma.sql`AND "school_id" = ${scopeSchoolId}::uuid` : Prisma.empty;

      const claimedRows: any[] = await tx.$queryRaw`
        SELECT "id"
        FROM "domain_events"
        WHERE "processing_status" = 'PENDING'
          ${schoolFilter}
        ORDER BY "occurred_at" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      `;

      if (!claimedRows || claimedRows.length === 0) {
        return [];
      }

      const ids = claimedRows.map((r) => r.id);

      await tx.domainEvent.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          processingStatus: 'PROCESSING',
          lockedAt: new Date(),
          lockedBy: workerId,
          attemptCount: {
            increment: 1,
          },
        },
      });

      return tx.domainEvent.findMany({
        where: { id: { in: ids } },
      });
    });
  }

  /**
   * Processes a single claimed domain event through the rule engine (Rule 3).
   */
  public static async processEvent(event: any): Promise<void> {
    try {
      await RuleEngine.evaluateAndExecute(event);

      await prisma.domainEvent.update({
        where: { id: event.id },
        data: {
          processingStatus: 'PROCESSED',
          processedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
        },
      });
    } catch (err: any) {
      logger.error({ eventId: event.id, err: err.message }, '[DomainEvent] Error processing domain event');

      await prisma.domainEvent.update({
        where: { id: event.id },
        data: {
          processingStatus: 'FAILED',
          lastError: err.message || 'Unknown processing error',
          lockedAt: null,
          lockedBy: null,
        },
      });
    }
  }

  /**
   * Claims and processes a batch of pending events.
   */
  public static async processBatch(workerId: string, batchSize = 25, scopeSchoolId?: string): Promise<number> {
    await this.recoverStaleLocks();
    const events = await this.claimPendingEvents(workerId, batchSize, scopeSchoolId);

    for (const event of events) {
      await this.processEvent(event);
    }

    return events.length;
  }
}
