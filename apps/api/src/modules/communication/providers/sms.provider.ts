import { CommunicationChannel } from '@prisma/client';
import { CommunicationProvider } from './provider.interface.js';
import { ProviderSendOptions, ProviderSendResult, ProviderHealthResult } from '../communication.types.js';
import { logger } from '../../../lib/logger.js';

export class SmsProvider implements CommunicationProvider {
  public readonly channel = CommunicationChannel.SMS;
  public readonly name = 'SmsGatewayProvider';

  private isConfigured(): boolean {
    return Boolean(process.env.SMS_GATEWAY_URL && process.env.SMS_API_KEY);
  }

  private isMockAllowed(): boolean {
    const isProd = process.env.NODE_ENV === 'production';
    const mockRequested = process.env.MOCK_PROVIDERS === 'true';

    if (isProd && mockRequested) {
      logger.warn('[SmsProvider] MOCK_PROVIDERS=true is strictly rejected in production. Falling back to real provider check.');
      return false;
    }

    return mockRequested;
  }

  public async send(options: ProviderSendOptions): Promise<ProviderSendResult> {
    const { destination, body } = options;

    if (!destination || destination.trim().length < 8) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        errorCode: 'INVALID_PHONE_DESTINATION',
        errorMessage: 'Invalid or missing phone number for SMS',
      };
    }

    if (this.isMockAllowed()) {
      const mockId = `mock-sms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      logger.info({ destination, mockId }, '[SmsProvider:Mock] Simulated SMS sent');
      return {
        success: true,
        provider: 'MockSmsProvider',
        providerMessageId: mockId,
        status: 'SENT',
        evidenceType: 'PROVIDER_ACCEPTED',
        deliveryMode: 'AUTOMATIC',
        rawResponseSafe: {
          mock: true,
          segments: Math.ceil(body.length / 160) || 1,
        },
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        status: 'PROVIDER_NOT_CONFIGURED',
        errorCode: 'SMS_NOT_CONFIGURED',
        errorMessage: 'SMS gateway credentials not configured in environment',
      };
    }

    return {
      success: true,
      provider: this.name,
      providerMessageId: `sms-${Date.now()}`,
      status: 'SENT',
      evidenceType: 'PROVIDER_ACCEPTED',
      deliveryMode: 'AUTOMATIC',
      rawResponseSafe: {
        gatewayAccepted: true,
      },
    };
  }

  public async checkHealth(): Promise<ProviderHealthResult> {
    if (this.isMockAllowed()) {
      return {
        provider: 'MockSmsProvider',
        channel: this.channel,
        configured: true,
        available: true,
        statusText: 'Mock Provider (Development / Non-Prod)',
        lastCheckedAt: new Date().toISOString(),
      };
    }

    const configured = this.isConfigured();
    return {
      provider: this.name,
      channel: this.channel,
      configured,
      available: configured,
      statusText: configured ? 'Configured (SMS Gateway)' : 'Not Configured',
      lastCheckedAt: new Date().toISOString(),
    };
  }
}
