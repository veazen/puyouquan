import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { generateScratchCode, generateSerial, hashScratchCodeHmac } from '@veazen/crypto';

import { AppConfigService } from '../config/app-config.service';
import { CodeSigningService } from '../codes/code-signing.service';
import { EnvelopeService } from '../crypto/envelope.service';
import { PrismaService } from '../prisma/prisma.service';
import { tryQueueAdd } from '../queues/queue-add';
import { BULLMQ_CONNECTION, GENERATION_QUEUE } from '../queues/queues.module';
import { StorageService } from '../storage/storage.service';
import { buildQrUrl } from './qr-url';

export interface GenerationJob {
  batchId: string;
  tenantId: string;
}

const CHUNK_SIZE = 5000;

/**
 * Bulk code generation (§8 Phase 1: 100k codes < 60s, chunked inserts).
 * Per code: serial (96-bit CSPRNG → Crockford base32), truncated Ed25519 sig,
 * scratch code hashed under the MASTER_KEY-derived pepper (ADR-007).
 * The one-time export CSV (serial, scratch plaintext, qr_url) is written to
 * storage during generation — scratch plaintext never touches the database.
 * Lite on-demand pool codes carry no scratch (§7.5).
 */
@Injectable()
export class GenerationWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(GenerationWorker.name);
  private worker: Worker<GenerationJob> | null = null;
  private readonly scratchPepper: Buffer;

  constructor(
    @Inject(BULLMQ_CONNECTION) private readonly connection: Redis,
    @Inject(GENERATION_QUEUE) private readonly queue: Queue<GenerationJob>,
    private readonly prisma: PrismaService,
    private readonly signing: CodeSigningService,
    private readonly storage: StorageService,
    private readonly config: AppConfigService,
    envelope: EnvelopeService,
  ) {
    this.scratchPepper = envelope.deriveKey('scratch-pepper');
  }

  onModuleInit(): void {
    this.worker = new Worker<GenerationJob>(
      'code-generation',
      async (job) => this.process(job.data),
      { connection: this.connection, concurrency: 2 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(`generation job ${job?.id} failed: ${error.message}`);
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }

  async enqueue(job: GenerationJob): Promise<void> {
    const enqueued = await tryQueueAdd(this.queue, 'generate', job, {
      removeOnComplete: 100,
      removeOnFail: 100,
      attempts: 3,
    });
    if (!enqueued) {
      // batch creation must not hang on a Redis outage: the batch row stays
      // `pending` and generation starts when the connection recovers (offline
      // queue flush). Lost only if the process restarts first — hence ERROR.
      this.logger.error(
        `batch ${job.batchId}: generation job not durably queued (redis degraded) — stays pending until redis recovers`,
      );
    }
  }

  async process({ batchId, tenantId }: GenerationJob): Promise<void> {
    const batch = await this.prisma.asSystem((tx) =>
      tx.batch.findUnique({ where: { id: batchId }, include: { product: true } }),
    );
    if (!batch || batch.tenantId !== tenantId || batch.status === 'ready') {
      return;
    }
    await this.prisma.withTenant(tenantId, (tx) =>
      tx.batch.update({ where: { id: batchId }, data: { status: 'generating' } }),
    );

    const withScratch = batch.kind === 'bulk';
    const csvRows: string[] = [
      withScratch ? 'serial,scratch_code,qr_url' : 'serial,qr_url',
    ];

    let generated = 0;
    while (generated < batch.quantity) {
      const size = Math.min(CHUNK_SIZE, batch.quantity - generated);
      const rows: Array<{
        tenantId: string;
        batchId: string;
        productId: string;
        serial: string;
        sig: string;
        scratchHash: string | null;
        status: 'inactive' | 'active';
      }> = [];

      for (let i = 0; i < size; i += 1) {
        const serial = generateSerial();
        const sig = await this.signing.signSerial(tenantId, batchId, serial);
        let scratch: string | null = null;
        let scratchHash: string | null = null;
        if (withScratch) {
          scratch = generateScratchCode();
          scratchHash = hashScratchCodeHmac(scratch, this.scratchPepper);
        }
        rows.push({
          tenantId,
          batchId,
          productId: batch.productId,
          serial,
          sig,
          scratchHash,
          // §7.5 auto_activate: generation completion == activation
          status: batch.autoActivate ? 'active' : 'inactive',
        });
        const qrUrl = buildQrUrl(this.config.publicVerifyBaseUrl, serial, sig, batch.product.gtin);
        csvRows.push(withScratch ? `${serial},${scratch},${qrUrl}` : `${serial},${qrUrl}`);
      }

      // serial space is 2^96 — a unique-violation is astronomically unlikely,
      // but createMany + skipDuplicates keeps the invariant airtight anyway
      const result = await this.prisma.withTenant(tenantId, (tx) =>
        tx.code.createMany({ data: rows, skipDuplicates: true }),
      );
      generated += result.count;
      if (result.count < size) {
        this.logger.warn(`batch ${batchId}: ${size - result.count} serial collisions skipped`);
      }
    }

    await this.storage.put(exportKey(tenantId, batchId), `${csvRows.join('\n')}\n`);

    await this.prisma.withTenant(tenantId, async (tx) => {
      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: 'ready',
          activatedCount: batch.autoActivate ? batch.quantity : 0,
        },
      });
      const now = new Date();
      const traceBase = {
        tenantId,
        subject: 'batch' as const,
        subjectId: batchId,
        occurredAt: now,
        source: 'api' as const,
      };
      await tx.traceEvent.create({ data: { ...traceBase, eventType: 'commissioned' } });
      if (batch.autoActivate) {
        // Lite: system performs the activation step (§7.5 mechanism 1)
        await tx.traceEvent.create({ data: { ...traceBase, eventType: 'activated' } });
      }
    });
  }
}

export function exportKey(tenantId: string, batchId: string): string {
  return `exports/${tenantId}/${batchId}.csv`;
}
