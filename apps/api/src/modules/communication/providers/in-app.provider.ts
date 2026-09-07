import { CommunicationChannel } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { CommunicationProvider } from './provider.interface.js';
import { ProviderSendOptions, ProviderSendResult, ProviderHealthResult } from '../communication.types.js';

export class InAppProvider implements CommunicationProvider {
  public readonly channel = CommunicationChannel.IN_APP;
  public readonly name = 'InAppNotificationProvider';

  public async send(options: ProviderSendOptions): Promise<ProviderSendResult> {
    try {
      const { metadata, subject, body, destination } = options;
      // For IN_APP, destination or metadata.userId is the target userId
      const targetUserId = destination || metadata?.userId;

      if (!targetUserId) {
        return {
          success: false,
          provider: this.name,
          status: 'FAILED',
          errorCode: 'MISSING_USER_ID',
          errorMessage: 'In-app notification requires a valid userId destination',
        };
      }

      // Check user exists
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, tenantId: true },
      });

      if (!user) {
        return {
          success: false,
          provider: this.name,
          status: 'FAILED',
          errorCode: 'USER_NOT_FOUND',
          errorMessage: `User with id ${targetUserId} not found`,
        };
      }

      const schoolId = metadata?.schoolId;
      if (!schoolId) {
        return {
          success: false,
          provider: this.name,
          status: 'FAILED',
          errorCode: 'MISSING_SCHOOL_ID',
          errorMessage: 'In-app notification requires schoolId scope',
        };
      }

      const notification = await prisma.inAppNotification.create({
        data: {
          tenantId: user.tenantId,
          schoolId,
          userId: user.id,
          title: subject || 'School Notification',
          body,
          category: metadata?.category || 'GENERAL',
          entityType: metadata?.entityType || null,
          entityId: metadata?.entityId || null,
          actionUrl: metadata?.actionUrl || null,
          sourceId: metadata?.sourceId || options.messageId || null,
        },
      });

      return {
        success: true,
        provider: this.name,
        providerMessageId: notification.id,
        status: 'SENT',
        evidenceType: 'PROVIDER_ACCEPTED',
        deliveryMode: 'AUTOMATIC',
        rawResponseSafe: {
          notificationId: notification.id,
          userId: user.id,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        errorCode: 'IN_APP_DELIVERY_ERROR',
        errorMessage: err.message || 'Error writing in-app notification',
      };
    }
  }

  public async checkHealth(): Promise<ProviderHealthResult> {
    return {
      provider: this.name,
      channel: this.channel,
      configured: true,
      available: true,
      statusText: 'Healthy (Database Backed)',
      lastCheckedAt: new Date().toISOString(),
    };
  }
}
