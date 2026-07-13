import { OWNER_DATABASE_URL } from './e2e-env';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';

jest.setTimeout(180_000);

/**
 * SME suite batch 1 acceptance (SME_SUITE_PLAN_zh.md §五): the four M2+M3
 * chains — ① Lite verify → release → fresh green first scan; ② relabel →
 * old code retired, new code verifiable; ③ redeemed scratch code → RMA →
 * refurbished endorsement + history count; ④ release threshold raises a
 * release_abuse alert — plus the lite_duplicate_scan rule (different device
 * fingerprint via a different User-Agent) and the §六 security redlines.
 */
describe('SME suite batch 1 (M2 RMA + M3 release)', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let owner: PrismaClient;

  const run = Date.now().toString(36);

  // Lite-shaped tenant (scan-only codes, first-scan lock)
  const liteSlug = `smelite${run}`;
  let liteToken = '';
  let liteKey = '';
  let liteSerials: string[] = [];

  // standard tenant (scratch codes)
  const stdSlug = `smestd${run}`;
  let stdKey = '';
  /** [serial, scratch] rows from the standard batch export */
  let stdCodes: Array<[string, string]> = [];

  const liteAuthed = () => ({ Authorization: `Bearer ${liteKey}` });
  const stdAuthed = () => ({ Authorization: `Bearer ${stdKey}` });

  async function makeBatch(
    headers: Record<string, string>,
    productSku: string,
    kind: 'bulk' | 'on_demand',
  ): Promise<string> {
    const product = await request(http)
      .post('/api/v1/products')
      .set(headers)
      .send({ name: `SME ${productSku}`, sku: productSku })
      .expect(201);
    const batch = await request(http)
      .post('/api/v1/batches')
      .set(headers)
      .send({ product_id: product.body.id, quantity: 10, kind })
      .expect(201);
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const res = await request(http)
        .get(`/api/v1/batches/${batch.body.id}`)
        .set(headers)
        .expect(200);
      if (res.body.status === 'ready') {
        return batch.body.id as string;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error('batch generation timed out');
  }

  async function exportRows(headers: Record<string, string>, batchId: string): Promise<string[]> {
    const exported = await request(http)
      .get(`/api/v1/batches/${batchId}/export?format=csv`)
      .set(headers)
      .expect(200);
    const csv = await request(http).get(`/api/v1${exported.body.downloadPath}`).expect(200);
    return csv.text.trim().split('\n').slice(1);
  }

  async function pollAlert(
    headers: Record<string, string>,
    rule: string,
  ): Promise<{ rule: string; severity: string; payload: Record<string, unknown> } | undefined> {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const alerts = await request(http).get('/api/v1/alerts?status=open').set(headers).expect(200);
      const found = (
        alerts.body as Array<{ rule: string; severity: string; payload: Record<string, unknown> }>
      ).find((a) => a.rule === rule);
      if (found) {
        return found;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return undefined;
  }

  beforeAll(async () => {
    owner = new PrismaClient({ datasources: { db: { url: OWNER_DATABASE_URL } } });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.enableShutdownHooks();
    await app.init();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
    await owner.$disconnect();
  });

  it('sets up a Lite tenant (scan-only pool) and a standard tenant (scratch batch)', async () => {
    // Lite tenant: mode=lite + an auto-activated on_demand pool (no scratch)
    const liteReg = await request(http)
      .post('/api/v1/auth/register')
      .send({
        tenantName: 'SME Lite Brand',
        slug: liteSlug,
        email: `${liteSlug}@example.com`,
        password: 'a-strong-password',
      })
      .expect(201);
    liteToken = liteReg.body.accessToken;
    await request(http)
      .patch('/api/v1/tenant/settings')
      .set('Authorization', `Bearer ${liteToken}`)
      .send({ mode: 'lite' })
      .expect(200);
    const liteKeyRes = await request(http)
      .post('/api/v1/auth/api-keys')
      .set('Authorization', `Bearer ${liteToken}`)
      .send({ label: 'sme-e2e' })
      .expect(201);
    liteKey = liteKeyRes.body.apiKey;

    const liteBatch = await makeBatch(liteAuthed(), `SME-LITE-${run}`, 'on_demand');
    const liteRows = await exportRows(liteAuthed(), liteBatch);
    liteSerials = liteRows.map((row) => (row.split(',')[0] as string).trim());
    expect(liteSerials).toHaveLength(10);

    // standard tenant: bulk batch with scratch codes, activated at factory exit
    const stdReg = await request(http)
      .post('/api/v1/auth/register')
      .send({
        tenantName: 'SME Std Brand',
        slug: stdSlug,
        email: `${stdSlug}@example.com`,
        password: 'a-strong-password',
      })
      .expect(201);
    const stdKeyRes = await request(http)
      .post('/api/v1/auth/api-keys')
      .set('Authorization', `Bearer ${stdReg.body.accessToken}`)
      .send({ label: 'sme-e2e' })
      .expect(201);
    stdKey = stdKeyRes.body.apiKey;

    const stdBatch = await makeBatch(stdAuthed(), `SME-STD-${run}`, 'bulk');
    await request(http)
      .post(`/api/v1/batches/${stdBatch}/activate`)
      .set(stdAuthed())
      .send({ all: true })
      .expect(201);
    const stdRows = await exportRows(stdAuthed(), stdBatch);
    stdCodes = stdRows.map((row) => {
      const [serial, scratch] = row.split(',');
      return [(serial as string).trim(), (scratch as string).trim()];
    });
    expect(stdCodes).toHaveLength(10);
  });

  it('① Lite code: first-scan lock → release → next scan is green again', async () => {
    const serial = liteSerials[0] as string;

    const first = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
    expect(first.body.result).toBe('authentic');
    const locked = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
    expect(locked.body.result).toBe('already_verified');

    const released = await request(http)
      .post(`/api/v1/codes/${serial}/release`)
      .set(liteAuthed())
      .expect(201);
    expect(released.body.status).toBe('active');
    expect(released.body.release_count).toBe(1);
    expect(released.body.display_policy).toBe('fresh');

    // the release cleared the digital lock: the next scan is a fresh first
    // scan and locks again (equal to a brand-new code)
    const again = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
    expect(again.body.result).toBe('authentic');
    const relocked = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
    expect(relocked.body.result).toBe('already_verified');

    const dbCode = await owner.code.findUnique({ where: { serial } });
    expect(dbCode?.releaseCount).toBe(1);
    expect(dbCode?.firstVerifiedAt).not.toBeNull();
  });

  it('② relabel: old code shows "retired", new code verifies as genuine', async () => {
    const [oldSerial, oldScratch] = stdCodes[0] as [string, string];
    const [newSerial] = stdCodes[1] as [string, string];

    // the old label was redeemed by the first buyer
    const redeem = await request(http)
      .post(`/api/v1/verify/${oldSerial}/scratch`)
      .send({ scratch_code: oldScratch })
      .expect(201);
    expect(redeem.body.result).toBe('verified');

    const relabel = await request(http)
      .post(`/api/v1/codes/${oldSerial}/relabel`)
      .set(stdAuthed())
      .send({ new_serial: newSerial })
      .expect(201);
    expect(relabel.body.status).toBe('retired');
    expect(relabel.body.replaced_by).toBe(newSerial);

    // old code: neutral recall on scan and on scratch submission
    const oldScan = await request(http).get(`/api/v1/verify/${oldSerial}`).expect(200);
    expect(oldScan.body.result).toBe('retired');
    const oldScratchAgain = await request(http)
      .post(`/api/v1/verify/${oldSerial}/scratch`)
      .send({ scratch_code: oldScratch })
      .expect(201);
    expect(oldScratchAgain.body.result).toBe('retired');

    // new code verifies normally; the chain is recorded on the old code
    const newScan = await request(http).get(`/api/v1/verify/${newSerial}`).expect(200);
    expect(newScan.body.result).toBe('authentic');
    const oldDb = await owner.code.findUnique({ where: { serial: oldSerial } });
    const newDb = await owner.code.findUnique({ where: { serial: newSerial } });
    expect(oldDb?.replacedById).toBe(newDb?.id);

    // merchant lookup exposes the successor for the warehouse check page
    const lookup = await request(http)
      .get(`/api/v1/codes/${oldSerial}`)
      .set(stdAuthed())
      .expect(200);
    expect(lookup.body.replaced_by).toBe(newSerial);
  });

  it('rejects relabel onto a redeemed or foreign code (404/409)', async () => {
    const [serialA] = stdCodes[2] as [string, string];
    const [redeemedSerial, redeemedScratch] = stdCodes[3] as [string, string];
    await request(http)
      .post(`/api/v1/verify/${redeemedSerial}/scratch`)
      .send({ scratch_code: redeemedScratch })
      .expect(201);

    // replacement must be unredeemed
    await request(http)
      .post(`/api/v1/codes/${serialA}/relabel`)
      .set(stdAuthed())
      .send({ new_serial: redeemedSerial })
      .expect(409);
    // a foreign tenant's serial reads as absent under RLS
    await request(http)
      .post(`/api/v1/codes/${serialA}/relabel`)
      .set(stdAuthed())
      .send({ new_serial: liteSerials[9] as string })
      .expect(404);
  });

  it('③ redeemed scratch code: release is refused (409) but RMA → refurbished endorsement', async () => {
    const [serial, scratch] = stdCodes[4] as [string, string];

    const redeem = await request(http)
      .post(`/api/v1/verify/${serial}/scratch`)
      .send({ scratch_code: scratch })
      .expect(201);
    expect(redeem.body.result).toBe('verified');
    // a second redemption attempt — part of the verification history
    const dup = await request(http)
      .post(`/api/v1/verify/${serial}/scratch`)
      .send({ scratch_code: scratch })
      .expect(201);
    expect(dup.body.result).toBe('already_verified');

    // §六 redline: the coating is physically gone — no release, ever
    const refused = await request(http)
      .post(`/api/v1/codes/${serial}/release`)
      .set(stdAuthed())
      .expect(409);
    expect(refused.body.message).toContain('RMA');

    const rma = await request(http)
      .post(`/api/v1/codes/${serial}/rma`)
      .set(stdAuthed())
      .send({ note: 'returned unopened, QC passed' })
      .expect(201);
    expect(rma.body.status).toBe('refurbished');

    // endorsement + history: scratch ok (1) + duplicate attempt (1) = 2
    const scan = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
    expect(scan.body.result).toBe('refurbished');
    expect(scan.body.verified_history_count).toBe(2);
    // refurbished views book their own scan result — the count stays stable
    const scanAgain = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
    expect(scanAgain.body.verified_history_count).toBe(2);
    // no scratch semantics on a refurbished code
    const scratchAgain = await request(http)
      .post(`/api/v1/verify/${serial}/scratch`)
      .send({ scratch_code: scratch })
      .expect(201);
    expect(scratchAgain.body.result).toBe('refurbished');

    // the returned trace event exists (geo_velocity suppression anchor)
    const dbCode = await owner.code.findUnique({ where: { serial } });
    const returned = await owner.traceEvent.findMany({
      where: { subject: 'code', subjectId: dbCode?.id, eventType: 'returned' },
    });
    expect(returned).toHaveLength(1);
  });

  it('④ releasing the same code 3 times raises a release_abuse warning', async () => {
    const serial = liteSerials[1] as string;

    for (let round = 1; round <= 3; round += 1) {
      const scan = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
      expect(scan.body.result).toBe('authentic'); // lock is fresh each round
      const released = await request(http)
        .post(`/api/v1/codes/${serial}/release`)
        .set(liteAuthed())
        .expect(201);
      expect(released.body.release_count).toBe(round);
    }

    const alert = await pollAlert(liteAuthed(), 'release_abuse');
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe('warning');
    expect(alert?.payload.release_count).toBe(3);
    expect(alert?.payload.serial).toBe(serial);
  });

  it('release of an unlocked or unknown code is a 409/404', async () => {
    // never scanned → nothing to release
    await request(http)
      .post(`/api/v1/codes/${liteSerials[2] as string}/release`)
      .set(liteAuthed())
      .expect(409);
    await request(http)
      .post('/api/v1/codes/UNKNOWNSERIAL0000000X/release')
      .set(liteAuthed())
      .expect(404);
  });

  it('⑤ a locked Lite code rescanned from a different device raises lite_duplicate_scan', async () => {
    const serial = liteSerials[3] as string;

    const first = await request(http)
      .get(`/api/v1/verify/${serial}`)
      .set('User-Agent', 'sme-e2e-device-one/1.0')
      .set('Accept-Language', 'en-US')
      .expect(200);
    expect(first.body.result).toBe('authentic');

    // the buyer re-checks from the same device — normal, no alert
    await request(http)
      .get(`/api/v1/verify/${serial}`)
      .set('User-Agent', 'sme-e2e-device-one/1.0')
      .set('Accept-Language', 'en-US')
      .expect(200);

    // someone else scans a copied label from another device fingerprint
    const other = await request(http)
      .get(`/api/v1/verify/${serial}`)
      .set('User-Agent', 'sme-e2e-device-two/7.0')
      .set('Accept-Language', 'de-DE')
      .expect(200);
    expect(other.body.result).toBe('already_verified');

    const alert = await pollAlert(liteAuthed(), 'lite_duplicate_scan');
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe('warning');
    expect(alert?.payload.serial).toBe(serial);
  });

  it('honors rma_display_policy=refurbished: release shows the endorsement instead of fresh', async () => {
    await request(http)
      .patch('/api/v1/tenant/settings')
      .set('Authorization', `Bearer ${liteToken}`)
      .send({ settings: { rma_display_policy: 'refurbished' } })
      .expect(200);

    const serial = liteSerials[4] as string;
    await request(http).get(`/api/v1/verify/${serial}`).expect(200); // lock
    const released = await request(http)
      .post(`/api/v1/codes/${serial}/release`)
      .set(liteAuthed())
      .expect(201);
    expect(released.body.status).toBe('refurbished');
    expect(released.body.display_policy).toBe('refurbished');

    const scan = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
    expect(scan.body.result).toBe('refurbished');
    // Lite history: the locking first scan was ok; no already_verified views yet
    expect(scan.body.verified_history_count).toBe(0);
  });
});
