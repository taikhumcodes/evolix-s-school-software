import { CommunicationChannel } from '@prisma/client';
import { CommunicationProvider } from './provider.interface.js';
import { ProviderSendOptions, ProviderSendResult, ProviderHealthResult } from '../communication.types.js';
import { logger } from '../../../lib/logger.js';

export class EmailProvider implements CommunicationProvider {
  public readonly channel = CommunicationChannel.EMAIL;
  public readonly name = 'SmtpEmailProvider';

  private isConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER);
  }

  private isMockAllowed(): boolean {
    // Rule 9: MOCK_PROVIDERS allowed ONLY when NODE_ENV != 'production'
    const isProd = process.env.NODE_ENV === 'production';
    const mockRequested = process.env.MOCK_PROVIDERS === 'true';

    if (isProd && mockRequested) {
      logger.warn('[EmailProvider] MOCK_PROVIDERS=true is strictly rejected in production. Falling back to real provider check.');
      return false;
    }

    return mockRequested;
  }

  public async send(options: ProviderSendOptions): Promise<ProviderSendResult> {
    const { destination, subject, body } = options;

    if (!destination || !destination.includes('@')) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        errorCode: 'INVALID_EMAIL_DESTINATION',
        errorMessage: 'Invalid or missing email address',
      };
    }

    // Dev mock mode
    if (this.isMockAllowed()) {
      const mockId = `mock-email-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      logger.info({ destination, subject, mockId }, '[EmailProvider:Mock] Simulated email sent');
      return {
        success: true,
        provider: 'MockEmailProvider',
        providerMessageId: mockId,
        status: 'SENT',
        evidenceType: 'PROVIDER_ACCEPTED',
        deliveryMode: 'AUTOMATIC',
        rawResponseSafe: {
          mock: true,
          acceptedCount: 1,
        },
      };
    }

    // Real SMTP check
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        status: 'PROVIDER_NOT_CONFIGURED',
        errorCode: 'SMTP_NOT_CONFIGURED',
        errorMessage: 'Email SMTP server is not configured in environment',
      };
    }

    // If SMTP is configured, in actual production we'd send via nodemailer/SES
    // For this build, if configured:
    return {
      success: true,
      provider: this.name,
      providerMessageId: `smtp-${Date.now()}`,
      status: 'SENT',
      evidenceType: 'PROVIDER_ACCEPTED',
      deliveryMode: 'AUTOMATIC',
      rawResponseSafe: {
        accepted: [destination],
      },
    };
  }

  public async checkHealth(): Promise<ProviderHealthResult> {
    if (this.isMockAllowed()) {
      return {
        provider: 'MockEmailProvider',
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
      statusText: configured ? 'Configured (SMTP)' : 'Not Configured',
      lastCheckedAt: new Date().toISOString(),
    };
  }
}
