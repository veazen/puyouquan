import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { generateScratchCode, generateSerial, hashScratchCodeHmac } from '@veazen/crypto';

import { AppConfigService } from '../config/app-config.service';
import { PlanGateService } from '../billing/plan-gate.service';
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
  /** A3: per-batch serialization — a duplicate job (compensation requeue vs a
   *  stale original) must never generate concurrently with the first. The
   *  deployment is single-instance (worker concurrency 2 lives in this same
   *  process), so an in-process keyed mutex is sufficient. */
  private readonly inFlight = new Map<string, Promise<void>>();

  constructor(
    @Inject(BULLMQ_CONNECTION) private readonly connection: Redis,
    @Inject(GENERATION_QUEUE) private readonly queue: Queue<GenerationJob>,
    private readonly prisma: PrismaService,
    private readonly signing: CodeSigningService,
    private readonly storage: StorageService,
    private readonly config: AppConfigService,
    private readonly planGate: PlanGateService,
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
    const prior = this.inFlight.get(batchId) ?? Promise.resolve();
    // chain regardless of the prior run's outcome; propagate only our own
    const current = prior.catch(() => undefined).then(() => this.generate(batchId, tenantId));
    this.inFlight.set(batchId, current);
    try {
      await current;
    } finally {
      if (this.inFlight.get(batchId) === current) {
        this.inFlight.delete(batchId);
      }
    }
  }

  /**
   * A3 idempotent generation: safe to re-run after a lost/duplicated job.
   * - terminal states (ready / exported / failed) short-circuit, so a replayed
   *   job never doubles the code count;
   * - a partial previous run is discarded and regenerated from zero. Counting
   *   and resuming would be cheaper, but the export CSV (the only place
   *   scratch plaintext ever exists, §9.2) is written at the end of a run —
   *   codes inserted by a crashed run have unrecoverable scratch plaintext and
   *   would ship as dead labels. Discarding is safe by construction: export
   *   requires status=ready, so partially generated codes have never left the
   *   building.
   */
  private async generate(batchId: string, tenantId: string): Promise<void> {
    const batch = await this.prisma.asSystem((tx) =>
      tx.batch.findUnique({ where: { id: batchId }, include: { product: true } }),
    );
    if (!batch || batch.tenantId !== tenantId) {
      return;
    }
    if (batch.status !== 'pending' && batch.status !== 'generating') {
      return; // ready / exported / failed — nothing to (re)do
    }
    await this.prisma.withTenant(tenantId, async (tx) => {
      await tx.batch.update({ where: { id: batchId }, data: { status: 'generating' } });
      const discarded = await tx.code.deleteMany({ where: { batchId } });
      if (discarded.count > 0) {
        this.logger.warn(
          `batch ${batchId}: discarded ${discarded.count} codes from an interrupted run — regenerating from zero`,
        );
      }
    });

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
      // B2 code packs: deduct the quota overflow FIFO in the same transaction
      // that flips the batch to ready — failed batches never consume credits
      // (no-op unless BILLING_ENFORCEMENT=on)
      await this.planGate.settlePackConsumption(tx, tenantId, batch.quantity);
    });
  }
}

export function exportKey(tenantId: string, batchId: string): string {
  return `exports/${tenantId}/${batchId}.csv`;
}
