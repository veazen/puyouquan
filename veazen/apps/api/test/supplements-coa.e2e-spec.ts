import { OWNER_DATABASE_URL } from './e2e-env';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { flushRateLimitBuckets } from './flush-rate-limits';

jest.setTimeout(180_000);

/** Minimal but real PDF bytes — the API checks the %PDF- magic. */
function pdfBytes(marker: string): Buffer {
  return Buffer.from(
    `%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n% ${marker}\n%%EOF\n`,
    'ascii',
  );
}

/**
 * B1 (S1 supplements pack, DIRECTIVE_BATCH_R) — batch regulatory identity
 * (lot / mfg / expiry) + the COA PDF module: upload, replace, signed
 * download, and the public verify response carrying batch_info + coa_url
 * for the code's own batch only.
 */
describe('B1 — supplements pack: batch fields + COA', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let owner: PrismaClient;

  const run = Date.now().toString(36);
  let token = '';
  let tenantId = '';
  let productId = '';
  let coaBatchId = '';
  let coaSerial = '';
  let plainBatchId = '';
  let plainSerial = '';

  const auth = () => ({ Authorization: `Bearer ${token}` });

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

  async function firstSerial(batchId: string): Promise<string> {
    const code = await owner.code.findFirst({ where: { batchId }, select: { serial: true } });
    if (!code) {
      throw new Error(`no codes generated for batch ${batchId}`);
    }
    return code.serial;
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

    const slug = `b1coa${run}`;
    const reg = await request(http)
      .post('/api/v1/auth/register')
      .send({ tenantName: `B1 ${slug}`, slug, email: `${slug}@example.com`, password: 'a-strong-password' })
      .expect(201);
    token = reg.body.accessToken as string;
    const me = await request(http).get('/api/v1/tenant/me').set(auth()).expect(200);
    tenantId = me.body.tenant.id as string;
    const product = await request(http)
      .post('/api/v1/products')
      .set(auth())
      .send({ name: 'Omega-3 Softgels', sku: `B1-${run}` })
      .expect(201);
    productId = product.body.id as string;
  });

  afterAll(async () => {
    // let the fire-and-forget @Audit writes land before Prisma disconnects
    await new Promise((r) => setTimeout(r, 300));
    await flushRateLimitBuckets();
    await app.close();
    await owner.$disconnect();
  });

  it('rejects an expiry date before the manufacture date (400)', async () => {
    await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({
        product_id: productId,
        quantity: 5,
        lot_code: 'LOT-BAD',
        mfg_date: '2026-07-01',
        expiry_date: '2026-06-30',
      })
      .expect(400);
    await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity: 5, mfg_date: '07/01/2026' })
      .expect(400); // date format is YYYY-MM-DD only
  });

  it('persists lot/mfg/expiry on creation; detail and list expose them', async () => {
    const created = await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({
        product_id: productId,
        quantity: 5,
        lot_code: 'LOT-2607-A',
        mfg_date: '2026-07-01',
        expiry_date: '2028-07-01',
      })
      .expect(201);
    coaBatchId = created.body.id as string;
    expect(created.body.lotCode).toBe('LOT-2607-A');
    await waitBatchReady(coaBatchId);

    const detail = await request(http).get(`/api/v1/batches/${coaBatchId}`).set(auth()).expect(200);
    expect(detail.body.lotCode).toBe('LOT-2607-A');
    expect(String(detail.body.mfgDate)).toContain('2026-07-01');
    expect(String(detail.body.expiryDate)).toContain('2028-07-01');
    expect(detail.body.coaUrl).toBeNull(); // no COA yet
    coaSerial = await firstSerial(coaBatchId);
  });

  it('rejects a non-PDF COA upload (400) and leaves the batch untouched', async () => {
    await request(http)
      .post(`/api/v1/batches/${coaBatchId}/coa`)
      .set(auth())
      .attach('file', Buffer.from('just,a,csv\n', 'utf8'), 'coa.pdf')
      .expect(400);
    await request(http)
      .post(`/api/v1/batches/${coaBatchId}/coa`)
      .set(auth())
      .expect(400); // no file at all
    const detail = await request(http).get(`/api/v1/batches/${coaBatchId}`).set(auth()).expect(200);
    expect(detail.body.coaUrl).toBeNull();
  });

  it('uploads the COA PDF, serves it via the signed URL and audits the upload', async () => {
    const uploaded = await request(http)
      .post(`/api/v1/batches/${coaBatchId}/coa`)
      .set(auth())
      .attach('file', pdfBytes('coa-v1'), 'coa.pdf')
      .expect(201);
    expect(uploaded.body.coa_url).toMatch(/^\/files\//);

    const download = await request(http)
      .get(`/api/v1${uploaded.body.coa_url}`)
      .expect(200)
      .expect('content-type', /application\/pdf/);
    expect(download.body.toString('ascii')).toContain('coa-v1');

    const detail = await request(http).get(`/api/v1/batches/${coaBatchId}`).set(auth()).expect(200);
    expect(detail.body.coaUrl).toMatch(/^\/files\//);

    const audits = await owner.auditLog.findMany({
      where: { tenantId, action: 'batch.coa_upload' },
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });

  it('re-upload replaces the COA in place (same key, new content)', async () => {
    const replaced = await request(http)
      .post(`/api/v1/batches/${coaBatchId}/coa`)
      .set(auth())
      .attach('file', pdfBytes('coa-v2'), 'coa-updated.pdf')
      .expect(201);
    const download = await request(http).get(`/api/v1${replaced.body.coa_url}`).expect(200);
    expect(download.body.toString('ascii')).toContain('coa-v2');
    expect(download.body.toString('ascii')).not.toContain('coa-v1');
  });

  it('public verify carries batch_info + a working coa_url for the code’s own batch', async () => {
    const verify = await request(http).get(`/api/v1/verify/${coaSerial}`).expect(200);
    expect(verify.body.batch_info).toEqual({
      lot_code: 'LOT-2607-A',
      mfg_date: '2026-07-01',
      expiry_date: '2028-07-01',
    });
    expect(verify.body.coa_url).toMatch(/^\/files\//);
    // the consumer can actually open the COA from the verify response
    await request(http)
      .get(`/api/v1${verify.body.coa_url}`)
      .expect(200)
      .expect('content-type', /application\/pdf/);
  });

  it('a batch without lot/expiry/COA verifies with batch_info null and coa_url null', async () => {
    const created = await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity: 3 })
      .expect(201);
    plainBatchId = created.body.id as string;
    await waitBatchReady(plainBatchId);
    plainSerial = await firstSerial(plainBatchId);

    const verify = await request(http).get(`/api/v1/verify/${plainSerial}`).expect(200);
    expect(verify.body.batch_info).toBeNull();
    expect(verify.body.coa_url).toBeNull();
  });
});
