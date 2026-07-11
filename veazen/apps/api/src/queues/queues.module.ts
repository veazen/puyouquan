import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { AppConfigService } from '../config/app-config.service';

export const GENERATION_QUEUE = 'QUEUE_CODE_GENERATION';
export const RISK_QUEUE = 'QUEUE_RISK_EVAL';
export const WEBHOOK_QUEUE = 'QUEUE_WEBHOOK_DELIVERY';
export const DIGEST_QUEUE = 'QUEUE_SCAN_DIGEST';
export const BULLMQ_CONNECTION = 'BULLMQ_CONNECTION';

function queueProvider(token: string, name: string) {
  return {
    provide: token,
    useFactory: (connection: Redis) => new Queue(name, { connection }),
    inject: [BULLMQ_CONNECTION],
  };
}

/** BullMQ queues (§2.1): generation, webhook delivery, digests, risk eval. */
@Global()
@Module({
  providers: [
    {
      provide: BULLMQ_CONNECTION,
      useFactory: (config: AppConfigService) =>
        new Redis(config.redisUrl, { maxRetriesPerRequest: null }),
      inject: [AppConfigService],
    },
    queueProvider(GENERATION_QUEUE, 'code-generation'),
    queueProvider(RISK_QUEUE, 'risk-eval'),
    queueProvider(WEBHOOK_QUEUE, 'webhook-delivery'),
    queueProvider(DIGEST_QUEUE, 'scan-digest'),
  ],
  exports: [BULLMQ_CONNECTION, GENERATION_QUEUE, RISK_QUEUE, WEBHOOK_QUEUE, DIGEST_QUEUE],
})
export class QueuesModule implements OnApplicationShutdown {
  constructor(
    @Inject(BULLMQ_CONNECTION) private readonly connection: Redis,
    @Inject(GENERATION_QUEUE) private readonly generation: Queue,
    @Inject(RISK_QUEUE) private readonly risk: Queue,
    @Inject(WEBHOOK_QUEUE) private readonly webhook: Queue,
    @Inject(DIGEST_QUEUE) private readonly digest: Queue,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([
      this.generation.close(),
      this.risk.close(),
      this.webhook.close(),
      this.digest.close(),
    ]);
    await this.connection.quit();
  }
}
