import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { AppConfigService } from '../config/app-config.service';

export const GENERATION_QUEUE = 'QUEUE_CODE_GENERATION';
export const RISK_QUEUE = 'QUEUE_RISK_EVAL';
export const WEBHOOK_QUEUE = 'QUEUE_WEBHOOK_DELIVERY';
export const DIGEST_QUEUE = 'QUEUE_SCAN_DIGEST';
export const REAPER_QUEUE = 'QUEUE_GENERATION_REAPER';
export const BULLMQ_CONNECTION = 'BULLMQ_CONNECTION';

function queueProvider(token: string, name: string) {
  return {
    provide: token,
    useFactory: (connection: Redis) => new Queue(name, { connection }),
    inject: [BULLMQ_CONNECTION],
  };
}

/** BullMQ queues (§2.1): generation, webhook delivery, digests, risk eval,
 *  generation reaper (A3 stalled-batch compensation). */
@Global()
@Module({
  providers: [
    {
      provide: BULLMQ_CONNECTION,
      // family: 0 — dual-stack DNS; Railway's private network is IPv6-only
      // and ioredis defaults to IPv4-only (ENOTFOUND). maxRetriesPerRequest
      // must stay null for BullMQ workers.
      useFactory: (config: AppConfigService) =>
        new Redis(config.redisUrl, { family: 0, maxRetriesPerRequest: null }),
      inject: [AppConfigService],
    },
    queueProvider(GENERATION_QUEUE, 'code-generation'),
    queueProvider(RISK_QUEUE, 'risk-eval'),
    queueProvider(WEBHOOK_QUEUE, 'webhook-delivery'),
    queueProvider(DIGEST_QUEUE, 'scan-digest'),
    queueProvider(REAPER_QUEUE, 'generation-reaper'),
  ],
  exports: [
    BULLMQ_CONNECTION,
    GENERATION_QUEUE,
    RISK_QUEUE,
    WEBHOOK_QUEUE,
    DIGEST_QUEUE,
    REAPER_QUEUE,
  ],
})
export class QueuesModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(QueuesModule.name);

  constructor(
    @Inject(BULLMQ_CONNECTION) private readonly connection: Redis,
    @Inject(GENERATION_QUEUE) private readonly generation: Queue,
    @Inject(RISK_QUEUE) private readonly risk: Queue,
    @Inject(WEBHOOK_QUEUE) private readonly webhook: Queue,
    @Inject(DIGEST_QUEUE) private readonly digest: Queue,
    @Inject(REAPER_QUEUE) private readonly reaper: Queue,
  ) {}

  onApplicationBootstrap(): void {
    // A3 diagnostic: the production Redis (Railway internal network) cannot
    // be inspected remotely, so log its persistence posture once per boot —
    // this line answers "do BullMQ jobs survive a Redis restart?".
    // Deliberately NOT awaited (with Redis unreachable the command sits in
    // ioredis' offline queue — awaiting would block bootstrap, 2026-07-13
    // incident) and failures are silently skipped.
    void this.connection
      .info('persistence')
      .then((info) => {
        const pick = (key: string) =>
          info.match(new RegExp(`^${key}:(.*)$`, 'm'))?.[1]?.trim() ?? 'unknown';
        const lastSaveEpoch = Number(pick('rdb_last_save_time'));
        const lastSaveIso = Number.isFinite(lastSaveEpoch)
          ? new Date(lastSaveEpoch * 1000).toISOString()
          : 'unknown';
        this.logger.log(
          `redis persistence: aof_enabled=${pick('aof_enabled')} ` +
            `rdb_last_bgsave_status=${pick('rdb_last_bgsave_status')} ` +
            `rdb_last_save_time=${lastSaveIso}`,
        );
      })
      .catch(() => undefined);
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([
      this.generation.close(),
      this.risk.close(),
      this.webhook.close(),
      this.digest.close(),
      this.reaper.close(),
    ]);
    await this.connection.quit();
  }
}
