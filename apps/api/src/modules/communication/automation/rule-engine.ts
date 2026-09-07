import { Prisma, AutomationActionType } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';
import { RuleCondition, RuleAction, ConditionDataType, AutomationConditionOperator } from '../communication.types.js';
import { CommunicationService } from '../communication.service.js';
import { NotificationsService } from '../notifications.service.js';
import { resolveSafeProperty } from '../template-engine.js';

export class RuleEngine {
  /**
   * Compares two values accurately with strict type awareness (Rule 38 & 39).
   */
  public static evaluateCondition(payload: Record<string, any>, condition: RuleCondition): boolean {
    const { field, operator, value, dataType = 'STRING' } = condition;
    const rawActual = resolveSafeProperty(payload, field);

    switch (dataType) {
      case 'DECIMAL':
      case 'NUMBER': {
        // Decimal safe comparison using Prisma.Decimal (Rule 39)
        if (rawActual === '' || rawActual === null || rawActual === undefined) return false;
        try {
          const actualDec = new Prisma.Decimal(String(rawActual));
          const targetDec = new Prisma.Decimal(String(value));

          switch (operator) {
            case 'EQUALS':
              return actualDec.equals(targetDec);
            case 'NOT_EQUALS':
              return !actualDec.equals(targetDec);
            case 'GREATER_THAN':
              return actualDec.greaterThan(targetDec);
            case 'GREATER_THAN_OR_EQUAL':
              return actualDec.greaterThanOrEqualTo(targetDec);
            case 'LESS_THAN':
              return actualDec.lessThan(targetDec);
            case 'LESS_THAN_OR_EQUAL':
              return actualDec.lessThanOrEqualTo(targetDec);
            default:
              return false;
          }
        } catch {
          return false;
        }
      }

      case 'BOOLEAN': {
        const actualBool = String(rawActual).toLowerCase() === 'true';
        const targetBool = String(value).toLowerCase() === 'true';
        if (operator === 'EQUALS') return actualBool === targetBool;
        if (operator === 'NOT_EQUALS') return actualBool !== targetBool;
        return false;
      }

      case 'DATE': {
        if (!rawActual) return false;
        const actualTime = new Date(rawActual).getTime();
        const targetTime = new Date(value).getTime();
        if (isNaN(actualTime) || isNaN(targetTime)) return false;

        switch (operator) {
          case 'EQUALS':
            return actualTime === targetTime;
          case 'NOT_EQUALS':
            return actualTime !== targetTime;
          case 'GREATER_THAN':
            return actualTime > targetTime;
          case 'GREATER_THAN_OR_EQUAL':
            return actualTime >= targetTime;
          case 'LESS_THAN':
            return actualTime < targetTime;
          case 'LESS_THAN_OR_EQUAL':
            return actualTime <= targetTime;
          default:
            return false;
        }
      }

      case 'ENUM':
      case 'STRING':
      default: {
        const actualStr = String(rawActual ?? '');
        const targetStr = String(value ?? '');

        switch (operator) {
          case 'EQUALS':
            return actualStr.toLowerCase() === targetStr.toLowerCase();
          case 'NOT_EQUALS':
            return actualStr.toLowerCase() !== targetStr.toLowerCase();
          case 'CONTAINS':
            return actualStr.toLowerCase().includes(targetStr.toLowerCase());
          case 'IN': {
            const list = Array.isArray(value) ? value : targetStr.split(',').map((s) => s.trim());
            return list.some((item) => String(item).toLowerCase() === actualStr.toLowerCase());
          }
          case 'NOT_IN': {
            const list = Array.isArray(value) ? value : targetStr.split(',').map((s) => s.trim());
            return !list.some((item) => String(item).toLowerCase() === actualStr.toLowerCase());
          }
          default:
            return false;
        }
      }
    }
  }

  /**
   * Evaluates all conditions of a rule against the domain event payload.
   */
  public static matchesConditions(payload: Record<string, any>, conditions: RuleCondition[]): boolean {
    if (!conditions || conditions.length === 0) return true;
    // All conditions must pass (AND evaluation)
    return conditions.every((cond) => this.evaluateCondition(payload, cond));
  }

  /**
   * Main evaluation & execution entry point for a claimed domain event.
   */
  public static async evaluateAndExecute(event: any): Promise<void> {
    const { tenantId, schoolId, eventType, payload } = event;

    // Find all matching automation rules for this school and event type
    const rules = await prisma.automationRule.findMany({
      where: {
        tenantId,
        schoolId,
        eventType,
      },
    });

    const now = new Date();

    for (const rule of rules) {
      // Rule 41: Rule disable timing check
      if (!rule.isActive) {
        logger.info({ ruleId: rule.id, eventId: event.id }, '[RuleEngine] Skipping inactive rule');
        continue;
      }

      // Rule 42: Effective dates check
      if (rule.effectiveFrom && now < rule.effectiveFrom) {
        logger.info({ ruleId: rule.id, eventId: event.id }, '[RuleEngine] Skipping rule before effective date');
        continue;
      }
      if (rule.effectiveTo && now > rule.effectiveTo) {
        logger.info({ ruleId: rule.id, eventId: event.id }, '[RuleEngine] Skipping rule after effective date');
        continue;
      }

      // Evaluate conditions
      const conditions = (rule.conditions as unknown as RuleCondition[]) || [];
      const matches = this.matchesConditions(payload, conditions);

      if (!matches) {
        continue;
      }

      // Rule 40 & 43: Create or find AutomationExecution preserving ruleVersion
      let execution: any;
      try {
        execution = await prisma.automationExecution.create({
          data: {
            tenantId,
            schoolId,
            ruleId: rule.id,
            eventId: event.id,
            ruleVersion: rule.version,
            status: 'PROCESSING',
          },
        });
      } catch (err: any) {
        // P2002: Unique constraint violation (ruleId + eventId + ruleVersion) -> already executed! (Rule 43)
        if (err.code === 'P2002') {
          logger.info({ ruleId: rule.id, eventId: event.id }, '[RuleEngine] Duplicate rule execution blocked by DB constraint');
          continue;
        }
        throw err;
      }

      // Execute actions with action-level idempotency (Rule 44)
      const actions = (rule.actions as unknown as RuleAction[]) || [];
      await this.executeActions(execution, rule, event, actions);
    }
  }

  /**
   * Executes individual actions with action-level idempotency tracking (Rule 44).
   */
  private static async executeActions(
    execution: any,
    rule: any,
    event: any,
    actions: RuleAction[]
  ): Promise<void> {
    const { tenantId, schoolId, payload } = event;
    let allSucceeded = true;

    for (let index = 0; index < actions.length; index++) {
      const action = actions[index];

      // Check if action execution already recorded (Rule 44)
      const existingActionExec = await prisma.automationActionExecution.findUnique({
        where: {
          executionId_actionIndex: {
            executionId: execution.id,
            actionIndex: index,
          },
        },
      });

      if (existingActionExec && existingActionExec.status === 'PROCESSED') {
        continue; // Action already completed in prior attempt
      }

      const normalizedActionType = (action.actionType as string) === 'CREATE_TASK'
        ? 'CREATE_INTERNAL_TASK'
        : (action.actionType as any);

      const actionExec = existingActionExec || await prisma.automationActionExecution.create({
        data: {
          executionId: execution.id,
          actionIndex: index,
          actionType: normalizedActionType,
          status: 'PROCESSING',
        },
      });

      try {
        const output = await this.dispatchAction(tenantId, schoolId, execution.id, index, action, event);

        await prisma.automationActionExecution.update({
          where: { id: actionExec.id },
          data: {
            status: 'PROCESSED',
            completedAt: new Date(),
            outputData: output as any,
          },
        });
      } catch (err: any) {
        allSucceeded = false;
        logger.error({ actionIndex: index, executionId: execution.id, err: err.message }, '[RuleEngine] Action failed');

        await prisma.automationActionExecution.update({
          where: { id: actionExec.id },
          data: {
            status: 'FAILED',
            errorMessage: err.message || 'Action execution error',
          },
        });
      }
    }

    // Update overall execution status
    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: allSucceeded ? 'PROCESSED' : 'FAILED',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Dispatches a single action to the appropriate handler.
   */
  private static async dispatchAction(
    tenantId: string,
    schoolId: string,
    executionId: string,
    actionIndex: number,
    action: RuleAction,
    event: any
  ): Promise<any> {
    const payload = event.payload || {};

    switch (action.actionType) {
      case 'SEND_COMMUNICATION': {
        if (!action.channel || !action.templateCode) {
          throw new Error('SEND_COMMUNICATION action missing channel or templateCode');
        }

        const isUrgent = Boolean(action.isUrgent || (action as any).urgent);

        // Queue communication message
        return CommunicationService.queueMessageFromAutomation({
          tenantId,
          schoolId,
          channel: action.channel,
          templateCode: action.templateCode,
          recipientType: action.recipientType || 'STUDENT_GUARDIAN',
          customRecipientId: action.customRecipientId,
          sourceType: event.sourceType,
          sourceId: event.sourceId,
          payload,
          isTest: event.isTest || false,
          isUrgent,
        });
      }

      case 'CREATE_IN_APP_NOTIFICATION': {
        const targetUserId = payload.userId || action.customRecipientId;
        if (!targetUserId) {
          throw new Error('CREATE_IN_APP_NOTIFICATION requires target userId');
        }

        return NotificationsService.createNotification(
          { tenantId, schoolId, userId: targetUserId, permissions: [] },
          {
            userId: targetUserId,
            title: action.inAppTitle || 'Automated Notification',
            body: action.inAppBody || 'Automated system update',
            category: 'SYSTEM',
            entityType: event.sourceType,
            entityId: event.sourceId,
            sourceId: `${executionId}_${actionIndex}`, // Rule 51: source identity for idempotency
          }
        );
      }

      case 'CREATE_TASK' as any:
      case 'CREATE_INTERNAL_TASK': {
        // Rule 45: Task idempotency with unique sourceExecutionId + sourceActionIndex
        const dueDate = action.taskDueDays
          ? new Date(Date.now() + action.taskDueDays * 24 * 60 * 60 * 1000)
          : null;

        try {
          return await prisma.automationTask.create({
            data: {
              tenantId,
              schoolId,
              title: action.taskTitle || (action as any).title || 'Automated Task',
              description: action.taskDescription || (action as any).description || null,
              priority: (action as any).priority || 'MEDIUM',
              assignedRole: action.taskRole || (action as any).assignedRole || null,
              assignedUserId: action.customRecipientId || (action as any).assignedUserId || null,
              dueDate,
              status: 'PENDING',
              sourceExecutionId: executionId,
              sourceActionIndex: actionIndex,
            },
          });
        } catch (err: any) {
          if (err.code === 'P2002') {
            // Task already created for this execution action
            return prisma.automationTask.findUnique({
              where: {
                sourceExecutionId_sourceActionIndex: {
                  sourceExecutionId: executionId,
                  sourceActionIndex: actionIndex,
                },
              },
            });
          }
          throw err;
        }
      }

      case 'DEFER_COMMUNICATION': {
        // Rule 46: Defer action loop protection
        const hours = action.deferHours || 2;
        const scheduledFor = new Date(Date.now() + hours * 60 * 60 * 1000);
        const idempotencyKey = `defer:${event.sourceType}:${event.sourceId}:${executionId}:${actionIndex}`;

        return prisma.scheduledAutomationJob.create({
          data: {
            tenantId,
            schoolId,
            jobType: 'DEFERRED_COMMUNICATION',
            sourceType: event.sourceType,
            sourceId: event.sourceId,
            scheduledFor,
            idempotencyKey,
            payload: {
              originalPayload: payload,
              action: action as any,
            },
            status: 'PENDING',
            deferCount: 1,
            maxDefers: 3,
          },
        });
      }

      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }
  }
}
