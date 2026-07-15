import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { PrismaService } from '../prisma/prisma.service';
import { BULLMQ_CONNECTION, REAPER_QUEUE } from '../queues/queues.module';
import { GenerationWorker } from './generation.worker';

/**
 * A3 (Batch R) stalled-batch compensation. BullMQ keeps its queue state in
 * Redis; a Redis restart without persistence (or a lost enqueue + process
 * restart) silently strands batches in `pending`/`generating` forever — the
 * job's `attempts: 3` only retries jobs that still *exist* in Redis. This
 * sweeper is the database-side safety net:
 *
 * every 5 minutes, batches sitting in pending/generating with no update for
 * ≥15 minutes are re-enqueued (generation is idempotent — see
 * GenerationWorker.generate); after MAX_ATTEMPTS compensation requeues the
 * batch is marked `failed` and surfaced in the console with a retry action.
 * Never a silent hang.
 *
 * Same non-blocking startup discipline as DigestService: the scheduler
 * registration is not awaited and a Redis outage never blocks boot.
 */
@Injectable()
export class GenerationReaperService implements OnModuleInit, OnApplicationShutdown {
  /** minutes without an update before a pending/generating batch is stalled */
  static readonly STALE_MINUTES = 15;
  /** compensation requeues before giving up and marking the batch failed */
  static readonly MAX_ATTEMPTS = 3;

  private readonly logger = new Logger(GenerationReaperService.name);
  private worker: Worker | null = null;

  constructor(
    @Inject(BULLMQ_CONNECTION) private readonly connection: Redis,
    @Inject(REAPER_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly generation: GenerationWorker,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      'generation-reaper',
      async () => {
        await this.sweep();
      },
      { connection: this.connection },
    );
    void this.queue
      .upsertJobScheduler('generation-reaper', { pattern: '*/5 * * * *', tz: 'UTC' })
      .catch((error: Error) =>
        this.logger.warn(`reaper scheduler registration failed: ${error.message}`),
      );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }

  /**
   * One compensation pass. `now` / `staleMinutes` are injectable so tests can
   * trigger and observe a sweep deterministically without waiting 15 minutes.
   */
  async sweep(
    now: Date = new Date(),
    staleMinutes: number = GenerationReaperService.STALE_MINUTES,
  ): Promise<{ requeued: string[]; failed: string[] }> {
    const cutoff = new Date(now.getTime() - staleMinutes * 60_000);
    const stalled = await this.prisma.asSystem((tx) =>
      tx.batch.findMany({
        where: { status: { in: ['pending', 'generating'] }, updatedAt: { lt: cutoff } },
        select: { id: true, tenantId: true, generationAttempts: true },
        orderBy: { updatedAt: 'asc' },
        take: 50,
      }),
    );

    const requeued: string[] = [];
    const failed: string[] = [];
    for (const batch of stalled) {
      if (batch.generationAttempts >= GenerationReaperService.MAX_ATTEMPTS) {
        // guard on status so a batch that completed between the read and this
        // write is never clobbered
        const res = await this.prisma.withTenant(batch.tenantId, (tx) =>
          tx.batch.updateMany({
            where: { id: batch.id, status: { in: ['pending', 'generating'] } },
            data: { status: 'failed' },
          }),
        );
        if (res.count > 0) {
          failed.push(batch.id);
          this.logger.error(
            `batch ${batch.id}: still stalled after ${batch.generationAttempts} compensation requeues — marked failed (console offers retry)`,
          );
        }
        continue;
      }
      const res = await this.prisma.withTenant(batch.tenantId, (tx) =>
        tx.batch.updateMany({
          where: { id: batch.id, status: { in: ['pending', 'generating'] } },
          data: { generationAttempts: { increment: 1 } },
        }),
      );
      if (res.count === 0) {
        continue; // completed in the meantime
      }
      requeued.push(batch.id);
      this.logger.warn(
        `batch ${batch.id}: stalled in generation for >${staleMinutes}min — compensation requeue #${batch.generationAttempts + 1}`,
      );
      await this.generation.enqueue({ batchId: batch.id, tenantId: batch.tenantId });
    }
    return { requeued, failed };
  }
}
