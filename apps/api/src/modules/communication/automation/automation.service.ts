import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../lib/errors.js';
import { ScopeContext, RuleCondition, RuleAction } from '../communication.types.js';
import { AutomationEventType, TaskStatus } from '@prisma/client';
import { DomainEventService } from '../events/domain-event.service.js';
import { SchedulerService } from './scheduler.service.js';

export interface CreateRuleDto {
  code: string;
  name: string;
  description?: string;
  eventType: AutomationEventType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdateRuleDto {
  name?: string;
  description?: string;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export class AutomationService {
  // ==========================================
  // 1. AUTOMATION RULES
  // ==========================================

  public static async createRule(ctx: ScopeContext, dto: CreateRuleDto) {
    const existing = await prisma.automationRule.findFirst({
      where: { schoolId: ctx.schoolId, code: dto.code },
    });
    if (existing) {
      throw new ConflictError(`Automation rule with code '${dto.code}' already exists`);
    }

    return prisma.automationRule.create({
      data: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        eventType: dto.eventType,
        conditions: dto.conditions as any,
        actions: dto.actions as any,
        isActive: dto.isActive ?? false, // Rule 65: Disabled by default
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        version: 1,
        createdBy: ctx.userId,
      },
    });
  }

  public static async updateRule(ctx: ScopeContext, ruleId: string, dto: UpdateRuleDto) {
    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, schoolId: ctx.schoolId },
    });
    if (!rule) throw new NotFoundError('Automation rule not found');

    return prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        name: dto.name ?? rule.name,
        description: dto.description !== undefined ? dto.description : rule.description,
        conditions: dto.conditions ? (dto.conditions as any) : undefined,
        actions: dto.actions ? (dto.actions as any) : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : rule.isActive,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        version: { increment: 1 }, // Rule 40: Version incremented on update
      },
    });
  }

  public static async listRules(ctx: ScopeContext, eventType?: AutomationEventType) {
    const where: any = { schoolId: ctx.schoolId };
    if (eventType) where.eventType = eventType;

    return prisma.automationRule.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  public static async getRule(ctx: ScopeContext, ruleId: string) {
    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, schoolId: ctx.schoolId },
    });
    if (!rule) throw new NotFoundError('Automation rule not found');
    return rule;
  }

  public static async deleteRule(ctx: ScopeContext, ruleId: string) {
    const rule = await prisma.automationRule.findFirst({
      where: { id: ruleId, schoolId: ctx.schoolId },
    });
    if (!rule) throw new NotFoundError('Automation rule not found');

    return prisma.automationRule.delete({
      where: { id: ruleId },
    });
  }

  // ==========================================
  // 2. EXECUTIONS
  // ==========================================

  public static async listExecutions(ctx: ScopeContext, limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      prisma.automationExecution.findMany({
        where: { schoolId: ctx.schoolId },
        orderBy: { executedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          rule: { select: { code: true, name: true, eventType: true } },
          event: { select: { eventType: true, sourceType: true, sourceId: true, occurredAt: true } },
          actionExecutions: true,
        },
      }),
      prisma.automationExecution.count({ where: { schoolId: ctx.schoolId } }),
    ]);

    return { items, total };
  }

  // ==========================================
  // 3. SCHEDULED JOBS
  // ==========================================

  public static async listJobs(ctx: ScopeContext, status?: any, limit = 50, offset = 0) {
    const where: any = { schoolId: ctx.schoolId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.scheduledAutomationJob.findMany({
        where,
        orderBy: { scheduledFor: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.scheduledAutomationJob.count({ where }),
    ]);

    return { items, total };
  }

  public static async cancelJob(ctx: ScopeContext, jobId: string) {
    const job = await prisma.scheduledAutomationJob.findFirst({
      where: { id: jobId, schoolId: ctx.schoolId },
    });
    if (!job) throw new NotFoundError('Scheduled job not found');

    if (job.status === 'PROCESSING') {
      throw new BadRequestError('Job is currently being processed and cannot be cancelled');
    }

    return prisma.scheduledAutomationJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED' },
    });
  }

  // ==========================================
  // 4. AUTOMATION TASKS
  // ==========================================

  public static async listTasks(ctx: ScopeContext, status?: TaskStatus, limit = 50, offset = 0) {
    const where: any = { schoolId: ctx.schoolId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.automationTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      prisma.automationTask.count({ where }),
    ]);

    return { items, total };
  }

  public static async updateTaskStatus(ctx: ScopeContext, taskId: string, status: TaskStatus) {
    const task = await prisma.automationTask.findFirst({
      where: { id: taskId, schoolId: ctx.schoolId },
    });
    if (!task) throw new NotFoundError('Task not found');

    return prisma.automationTask.update({
      where: { id: taskId },
      data: { status },
    });
  }

  // ==========================================
  // 5. TEST EVENT & MANUAL WORKER TRIGGER
  // ==========================================

  /**
   * Admin test event trigger API (Rule 78).
   * Marks isTest = true, so test messages are safely marked.
   */
  public static async triggerTestEvent(ctx: ScopeContext, dto: {
    eventType: AutomationEventType;
    sourceType: string;
    sourceId?: string;
    payload: Record<string, any>;
  }) {
    const sourceId = dto.sourceId || ctx.userId;

    const event = await DomainEventService.emitDomainEvent(prisma, {
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      eventType: dto.eventType,
      sourceType: dto.sourceType,
      sourceId,
      payload: dto.payload,
      isTest: true, // Rule 78: clearly mark isTest = true
    });

    return event;
  }

  /**
   * Manual processing endpoint for pending automation jobs and outbox (Rule 8).
   * Strictly respects tenant/school scope and concurrency locks.
   */
  public static async processPending(ctx: ScopeContext) {
    const workerId = `manual-${ctx.userId.slice(0, 8)}-${Date.now().toString(36)}`;
    const results = await SchedulerService.processPendingWork(workerId, 25, ctx.schoolId);
    return results;
  }
}
