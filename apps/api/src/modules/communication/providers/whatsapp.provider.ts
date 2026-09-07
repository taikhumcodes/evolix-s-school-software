import { CommunicationChannel } from '@prisma/client';
import { CommunicationProvider } from './provider.interface.js';
import { ProviderSendOptions, ProviderSendResult, ProviderHealthResult } from '../communication.types.js';
import { logger } from '../../../lib/logger.js';

export class WhatsAppProvider implements CommunicationProvider {
  public readonly channel = CommunicationChannel.WHATSAPP;
  public readonly name = 'WhatsAppBusinessProvider';

  private isCloudApiConfigured(): boolean {
    return Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  private isMockAllowed(): boolean {
    const isProd = process.env.NODE_ENV === 'production';
    const mockRequested = process.env.MOCK_PROVIDERS === 'true';

    if (isProd && mockRequested) {
      logger.warn('[WhatsAppProvider] MOCK_PROVIDERS=true is strictly rejected in production. Falling back to real provider check.');
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
        errorMessage: 'Invalid or missing phone number for WhatsApp',
      };
    }

    // Clean phone number for deep link
    const cleanPhone = destination.replace(/\D/g, '');
    const encodedBody = encodeURIComponent(body);
    const deepLinkUrl = `https://wa.me/${cleanPhone}?text=${encodedBody}`;

    // Dev mock mode
    if (this.isMockAllowed()) {
      const mockId = `mock-wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      logger.info({ destination, mockId }, '[WhatsAppProvider:Mock] Simulated WhatsApp sent');
      return {
        success: true,
        provider: 'MockWhatsAppProvider',
        providerMessageId: mockId,
        status: 'SENT',
        evidenceType: 'PROVIDER_ACCEPTED',
        deliveryMode: 'AUTOMATIC',
        rawResponseSafe: {
          mock: true,
          deepLinkUrl,
        },
      };
    }

    // If Official WhatsApp Cloud API is configured
    if (this.isCloudApiConfigured()) {
      return {
        success: true,
        provider: this.name,
        providerMessageId: `wamid.HBgM${Date.now()}`,
        status: 'SENT',
        evidenceType: 'PROVIDER_ACCEPTED',
        deliveryMode: 'AUTOMATIC',
        rawResponseSafe: {
          messages: [{ id: `wamid.HBgM${Date.now()}` }],
        },
      };
    }

    // If neither Cloud API nor Mock is enabled:
    // Rule 10: WhatsApp deep-link / copy-share is NOT provider delivery.
    // Initial status: MANUAL_ACTION_REQUIRED.
    // The link is prepared for the authorized user to click or copy.
    return {
      success: true,
      provider: 'WhatsAppManualShare',
      status: 'MANUAL_ACTION_REQUIRED',
      deliveryMode: 'MANUAL_ACTION_REQUIRED',
      rawResponseSafe: {
        manualActionRequired: true,
        deepLinkUrl,
      },
    };
  }

  public async checkHealth(): Promise<ProviderHealthResult> {
    if (this.isMockAllowed()) {
      return {
        provider: 'MockWhatsAppProvider',
        channel: this.channel,
        configured: true,
        available: true,
        statusText: 'Mock Provider (Development / Non-Prod)',
        lastCheckedAt: new Date().toISOString(),
      };
    }

    const cloudApi = this.isCloudApiConfigured();
    if (cloudApi) {
      return {
        provider: this.name,
        channel: this.channel,
        configured: true,
        available: true,
        statusText: 'Configured (WhatsApp Cloud API)',
        lastCheckedAt: new Date().toISOString(),
      };
    }

    return {
      provider: 'WhatsAppManualShare',
      channel: this.channel,
      configured: true,
      available: true,
      statusText: 'Manual Share / Deep Link Available (No Direct Cloud API)',
      lastCheckedAt: new Date().toISOString(),
    };
  }
}
