import { CommunicationChannel } from '@prisma/client';
import { ProviderSendOptions, ProviderSendResult, ProviderHealthResult } from '../communication.types.js';

export interface CommunicationProvider {
  readonly channel: CommunicationChannel;
  readonly name: string;

  send(options: ProviderSendOptions): Promise<ProviderSendResult>;
  checkHealth(): Promise<ProviderHealthResult>;
}
