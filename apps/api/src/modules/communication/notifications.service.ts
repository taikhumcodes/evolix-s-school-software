import { prisma } from '../../lib/prisma.js';
import { CommunicationCategory } from '@prisma/client';
import { ScopeContext } from './communication.types.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';

export interface CreateInAppNotificationDto {
  userId: string;
  title: string;
  body: string;
  category: CommunicationCategory;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  sourceId?: string;
}

export class NotificationsService {
  /**
   * Sanitizes in-app action URLs (Rule 52).
   * Only allows safe relative paths starting with '/'.
   * Rejects 'javascript:', 'data:', 'file:', and external arbitrary URLs.
   */
  public static sanitizeActionUrl(url?: string | null): string | null {
    if (!url) return null;
    const trimmed = url.trim();

    // Check forbidden protocols
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('file:') ||
      lower.startsWith('vbscript:')
    ) {
      throw new BadRequestError('Forbidden actionUrl protocol');
    }

    // Must start with '/' for internal route
    if (!trimmed.startsWith('/')) {
      throw new BadRequestError('actionUrl must be an internal application path starting with /');
    }

    // Reject double slashes or protocol relative paths
    if (trimmed.startsWith('//')) {
      throw new BadRequestError('Protocol-relative actionUrl is not permitted');
    }

    return trimmed;
  }

  /**
   * Creates an in-app notification with idempotency check (Rule 51).
   */
  public static async createNotification(
    ctx: ScopeContext,
    dto: CreateInAppNotificationDto
  ) {
    const safeUrl = this.sanitizeActionUrl(dto.actionUrl);

    // Idempotency: if sourceId + userId already has a notification, don't duplicate
    if (dto.sourceId) {
      const existing = await prisma.inAppNotification.findFirst({
        where: {
          tenantId: ctx.tenantId,
          schoolId: ctx.schoolId,
          userId: dto.userId,
          sourceId: dto.sourceId,
        },
      });
      if (existing) {
        return existing;
      }
    }

    return prisma.inAppNotification.create({
      data: {
        tenantId: ctx.tenantId,
        schoolId: ctx.schoolId,
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        category: dto.category,
        entityType: dto.entityType || null,
        entityId: dto.entityId || null,
        actionUrl: safeUrl,
        sourceId: dto.sourceId || null,
      },
    });
  }

  /**
   * Lists in-app notifications for the authenticated user (Rule 53).
   */
  public static async getUserNotifications(
    ctx: ScopeContext,
    options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
  ) {
    const limit = Math.min(options.limit || 30, 100);
    const offset = options.offset || 0;

    const where: any = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    };

    if (options.unreadOnly) {
      where.isRead = false;
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.inAppNotification.count({ where }),
      prisma.inAppNotification.count({
        where: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          isRead: false,
        },
      }),
    ]);

    return {
      items,
      total,
      unreadCount,
    };
  }

  /**
   * Marks a notification as read with user ownership check (Rule 53).
   */
  public static async markAsRead(ctx: ScopeContext, notificationId: string) {
    const notification = await prisma.inAppNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    // Rule 53: notification.userId === authenticated User
    if (notification.userId !== ctx.userId) {
      throw new ForbiddenError('You can only modify your own notifications');
    }

    return prisma.inAppNotification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Marks all notifications as read for authenticated user.
   */
  public static async markAllAsRead(ctx: ScopeContext) {
    return prisma.inAppNotification.updateMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
