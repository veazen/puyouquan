import { OWNER_DATABASE_URL } from './e2e-env';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { GenerationReaperService } from '../src/batches/generation-reaper.service';
import { GenerationWorker } from '../src/batches/generation.worker';
import { flushRateLimitBuckets } from './flush-rate-limits';

jest.setTimeout(180_000);

/**
 * A3 (Batch R) — generation idempotency + stalled-batch compensation.
 * BullMQ state lives in Redis; a Redis restart without persistence strands
 * batches in pending/generating with no job left to run them. This suite
 * locks the two defenses: (1) re-running a generation job never doubles the
 * code count (interrupted partials are discarded and regenerated — their
 * scratch plaintext is unrecoverable, so resuming would ship dead labels);
 * (2) the reaper sweep requeues stalled batches, marks them failed after
 * MAX_ATTEMPTS, and the console retry endpoint restarts a failed batch.
 */
describe('A3 — generation idempotency & stalled-batch compensation', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let owner: PrismaClient;
  let worker: GenerationWorker;
  let reaper: GenerationReaperService;

  const run = Date.now().toString(36);
  let token = '';
  let productId = '';
  let batchA = ''; // idempotency subject (qty 8)
  let batchB = ''; // stalled → requeued
  let batchC = ''; // stalled beyond MAX_ATTEMPTS → failed → retried

  const auth = () => ({ Authorization: `Bearer ${token}` });

  async function createBatch(quantity: number): Promise<string> {
    const res = await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity })
      .expect(201);
    return res.body.id as string;
  }

  async function waitBatchReady(batchId: string): Promise<void> {
    const deadline = Date.now() + 60_000;
    for (;;) {
      const res = await request(http).get(`/api/v1/batches/${batchId}`).set(auth()).expect(200);
      if (res.body.status === 'ready') {
        return;
      }
      if (Date.now() > deadline) {
        throw new Error(`batch ${batchId} generation timed out (status ${res.body.status})`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  /** Simulate a crashed run: batch back to `generating`, stale for 20 min. */
  async function strandBatch(batchId: string, attempts = 0): Promise<void> {
    await owner.$executeRaw`
      UPDATE batches
      SET status = 'generating',
          generation_attempts = ${attempts},
          updated_at = now() - interval '20 minutes'
      WHERE id = ${batchId}::uuid`;
  }

  beforeAll(async () => {
    await flushRateLimitBuckets();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.enableShutdownHooks();
    await app.init();
    http = app.getHttpServer();
    owner = new PrismaClient({ datasources: { db: { url: OWNER_DATABASE_URL } } });
    worker = app.get(GenerationWorker);
    reaper = app.get(GenerationReaperService);

    const slug = `a3rec${run}`;
    const reg = await request(http)
      .post('/api/v1/auth/register')
      .send({ tenantName: `A3 ${slug}`, slug, email: `${slug}@example.com`, password: 'a-strong-password' })
      .expect(201);
    token = reg.body.accessToken as string;
    const product = await request(http)
      .post('/api/v1/products')
      .set(auth())
      .send({ name: 'A3 recovery', sku: `A3-${run}` })
      .expect(201);
    productId = product.body.id as string;
    batchA = await createBatch(8);
    await waitBatchReady(batchA);
  });

  afterAll(async () => {
    await new Promise((r) => setTimeout(r, 300));
    await flushRateLimitBuckets();
    await app.close();
    await owner.$disconnect();
  });

  it('replaying the generation job of a completed batch does not double the code count', async () => {
    await worker.process({ batchId: batchA, tenantId: (await owner.batch.findUnique({ where: { id: batchA } }))!.tenantId });
    const count = await owner.code.count({ where: { batchId: batchA } });
    expect(count).toBe(8);
    const res = await request(http).get(`/api/v1/batches/${batchA}`).set(auth()).expect(200);
    expect(res.body.status).toBe('ready');
  });

  it('an interrupted run is discarded and regenerated to the exact quantity, scratch codes consistent', async () => {
    const before = await owner.code.findMany({ where: { batchId: batchA }, select: { serial: true } });
    const beforeSerials = new Set(before.map((c) => c.serial));
    const tenantId = (await owner.batch.findUnique({ where: { id: batchA } }))!.tenantId;

    // crash simulation: back to `generating` with only a partial insert left
    await strandBatch(batchA);
    await owner.code.deleteMany({
      where: { batchId: batchA, serial: { in: [...beforeSerials].slice(0, 3) } },
    });

    await worker.process({ batchId: batchA, tenantId });

    const after = await owner.code.findMany({ where: { batchId: batchA }, select: { serial: true } });
    expect(after).toHaveLength(8); // not 8+5 — the partial run was discarded
    // full regeneration: no serial of the interrupted run survives
    expect(after.some((c) => beforeSerials.has(c.serial))).toBe(false);

    // the regenerated CSV matches the database — a scratch code from the new
    // export redeems end-to-end (dead labels impossible)
    await request(http).post(`/api/v1/batches/${batchA}/activate`).set(auth()).send({ all: true }).expect(201);
    const exported = await request(http)
      .get(`/api/v1/batches/${batchA}/export?format=csv`)
      .set(auth())
      .expect(200);
    const csv = await request(http).get(`/api/v1${exported.body.downloadPath}`).expect(200);
    const rows = csv.text.trim().split('\n').slice(1);
    expect(rows).toHaveLength(8);
    const [serial, scratch] = rows[0]!.split(',');
    const redeem = await request(http)
      .post(`/api/v1/verify/${serial}/scratch`)
      .send({ scratch_code: scratch })
      .expect(201);
    expect(redeem.body.result).toBe('verified');
  });

  it('the reaper requeues a stalled generating batch and leaves fresh ones alone', async () => {
    batchB = await createBatch(5);
    batchC = await createBatch(5);
    await waitBatchReady(batchB);
    await waitBatchReady(batchC);

    await strandBatch(batchB); // stale 20 min → must be swept
    // batchC: generating but recently touched → must NOT be swept
    await owner.$executeRaw`
      UPDATE batches SET status = 'generating' WHERE id = ${batchC}::uuid`;

    const result = await reaper.sweep();
    expect(result.requeued).toContain(batchB);
    expect(result.requeued).not.toContain(batchC);
    expect(result.failed).not.toContain(batchC);

    await waitBatchReady(batchB); // the requeued job regenerated it
    const b = await owner.batch.findUnique({ where: { id: batchB } });
    expect(b?.generationAttempts).toBeGreaterThanOrEqual(1);
    expect(await owner.code.count({ where: { batchId: batchB } })).toBe(5);
  });

  it('a batch still stalled after MAX_ATTEMPTS requeues is marked failed — never a silent hang', async () => {
    await strandBatch(batchC, GenerationReaperService.MAX_ATTEMPTS);
    const result = await reaper.sweep();
    expect(result.failed).toContain(batchC);
    const res = await request(http).get(`/api/v1/batches/${batchC}`).set(auth()).expect(200);
    expect(res.body.status).toBe('failed');
  });

  it('POST /batches/:id/retry restarts a failed batch (and 409s on anything else)', async () => {
    const retried = await request(http).post(`/api/v1/batches/${batchC}/retry`).set(auth()).expect(201);
    expect(retried.body.status).toBe('pending');
    expect(retried.body.generationAttempts).toBe(0);

    await waitBatchReady(batchC);
    expect(await owner.code.count({ where: { batchId: batchC } })).toBe(5);

    // retry is audited (§4 audit_logs)
    const tenantId = (await owner.batch.findUnique({ where: { id: batchC } }))!.tenantId;
    const audits = await owner.auditLog.findMany({
      where: { tenantId, action: 'batch.retry_generation' },
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);

    // only failed batches are retryable
    await request(http).post(`/api/v1/batches/${batchC}/retry`).set(auth()).expect(409);
  });
});
