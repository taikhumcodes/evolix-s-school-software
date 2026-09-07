import { CommunicationChannel } from '@prisma/client';
import { CommunicationProvider } from './provider.interface.js';
import { InAppProvider } from './in-app.provider.js';
import { EmailProvider } from './email.provider.js';
import { SmsProvider } from './sms.provider.js';
import { WhatsAppProvider } from './whatsapp.provider.js';
import { ProviderHealthResult } from '../communication.types.js';

export class ProviderRegistry {
  private static providers: Map<CommunicationChannel, CommunicationProvider> = new Map();

  public static initialize(): void {
    if (this.providers.size > 0) return;

    this.register(new InAppProvider());
    this.register(new EmailProvider());
    this.register(new SmsProvider());
    this.register(new WhatsAppProvider());
  }

  public static register(provider: CommunicationProvider): void {
    this.providers.set(provider.channel, provider);
  }

  public static getProvider(channel: CommunicationChannel): CommunicationProvider | undefined {
    this.initialize();
    return this.providers.get(channel);
  }

  /**
   * Returns safe provider metadata without any credentials or secrets (Rule 16, 64)
   */
  public static async getProvidersStatus(): Promise<ProviderHealthResult[]> {
    this.initialize();
    const results: ProviderHealthResult[] = [];
    for (const provider of this.providers.values()) {
      try {
        const health = await provider.checkHealth();
        results.push(health);
      } catch (err: any) {
        results.push({
          provider: provider.name,
          channel: provider.channel,
          configured: false,
          available: false,
          statusText: `Error checking health: ${err.message}`,
          lastCheckedAt: new Date().toISOString(),
        });
      }
    }
    return results;
  }
}
