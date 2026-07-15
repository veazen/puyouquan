import { OWNER_DATABASE_URL } from './e2e-env';

import { createHmac } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { flushRateLimitBuckets } from './flush-rate-limits';

jest.setTimeout(180_000);

const LS_SECRET = 'e2e-pack-webhook-secret';
/** pack variants (LEMONSQUEEZY_VARIANT_PACK_MAP): variant → codes */
const PACK_VARIANT_200 = '333333';
const PACK_VARIANT_150 = '444444';

const BILLING_ENV_KEYS = [
  'BILLING_ENFORCEMENT',
  'LEMONSQUEEZY_WEBHOOK_SECRET',
  'LEMONSQUEEZY_VARIANT_PLAN_MAP',
  'LEMONSQUEEZY_CHECKOUT_URLS',
  'LEMONSQUEEZY_VARIANT_PACK_MAP',
  'LEMONSQUEEZY_PACK_CHECKOUT_URLS',
] as const;

/**
 * B2 code packs (DIRECTIVE_BATCH_R) — one-time overflow credits on top of
 * the monthly subscription quota, enforcement on:
 *   quota exhausted → 402 with purchase_options (not a dead wall)
 *   order_created webhook → code_packs row (ls_order_id idempotent) + audit
 *   packs present → the gate admits the overflow, and the FIFO deduction
 *   happens when the batch turns ready (spanning packs when needed)
 *   consumer verify stays 200 throughout (ADR-012 invariant).
 */
describe('B2 — code packs: 402 guidance, purchase webhook, FIFO consumption', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let owner: PrismaClient;

  const run = Date.now().toString(36);
  const slug = `b2pack${run}`;
  let token = '';
  let tenantId = '';
  let productId = '';
  let pack200Id = '';
  let pack150Id = '';
  let overflowSerial = '';

  const auth = () => ({ Authorization: `Bearer ${token}` });

  const sign = (body: string) => createHmac('sha256', LS_SECRET).update(body, 'utf8').digest('hex');
  const postLemon = (payload: object) => {
    const body = JSON.stringify(payload);
    return request(http)
      .post('/api/v1/billing/webhooks/lemonsqueezy')
      .set('content-type', 'application/json')
      .set('x-signature', sign(body))
      .send(body);
  };

  const orderEvent = (orderId: string, variantId: string) => ({
    meta: { event_name: 'order_created', custom_data: { tenant_id: tenantId } },
    data: {
      type: 'orders',
      id: orderId,
      attributes: {
        customer_id: 9902,
        first_order_item: { variant_id: Number(variantId) },
      },
    },
  });

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

  const packBalance = async (): Promise<number> => {
    const summary = await request(http).get('/api/v1/billing/summary').set(auth()).expect(200);
    return summary.body.pack_balance as number;
  };

  beforeAll(async () => {
    await flushRateLimitBuckets();
    process.env.BILLING_ENFORCEMENT = 'on';
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = LS_SECRET;
    process.env.LEMONSQUEEZY_VARIANT_PACK_MAP = JSON.stringify({
      [PACK_VARIANT_200]: '200',
      [PACK_VARIANT_150]: '150',
    });
    process.env.LEMONSQUEEZY_PACK_CHECKOUT_URLS = JSON.stringify({
      pack_10k: 'https://veazen.lemonsqueezy.com/buy/pack-10k-x',
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.enableShutdownHooks();
    await app.init();
    http = app.getHttpServer();
    owner = new PrismaClient({ datasources: { db: { url: OWNER_DATABASE_URL } } });

    const reg = await request(http)
      .post('/api/v1/auth/register')
      .send({ tenantName: `B2 ${slug}`, slug, email: `${slug}@example.com`, password: 'a-strong-password' })
      .expect(201);
    token = reg.body.accessToken as string;
    const me = await request(http).get('/api/v1/tenant/me').set(auth()).expect(200);
    tenantId = me.body.tenant.id as string;
    const product = await request(http)
      .post('/api/v1/products')
      .set(auth())
      .send({ name: 'B2 pack product', sku: `B2-${run}` })
      .expect(201);
    productId = product.body.id as string;
  });

  afterAll(async () => {
    // never leak billing env into the other e2e suites in this process
    for (const key of BILLING_ENV_KEYS) {
      delete process.env[key];
    }
    // let the fire-and-forget @Audit writes land before Prisma disconnects
    await new Promise((r) => setTimeout(r, 300));
    await flushRateLimitBuckets();
    await app.close();
    await owner.$disconnect();
  });

  it('quota exceeded with no packs → 402 carrying purchase_options with a stamped checkout link', async () => {
    const res = await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity: 600, kind: 'on_demand' })
      .expect(402);
    expect(res.body).toMatchObject({ code: 'plan_upgrade_required', feature: 'codesPerMonth', plan: 'free' });
    const options = res.body.purchase_options as Array<{
      id: string;
      codes: number;
      price_usd: number;
      checkout_url: string | null;
    }>;
    expect(options.map((o) => o.id)).toEqual(['pack_10k', 'pack_100k']);
    const pack10k = options.find((o) => o.id === 'pack_10k')!;
    expect(pack10k.codes).toBe(10_000);
    expect(pack10k.price_usd).toBe(60);
    expect(pack10k.checkout_url).toContain('veazen.lemonsqueezy.com/buy/pack-10k-x');
    expect(pack10k.checkout_url).toContain(encodeURIComponent('checkout[custom][tenant_id]'));
    expect(pack10k.checkout_url).toContain(tenantId);
    // pack_100k has no configured checkout URL → guidance only
    expect(options.find((o) => o.id === 'pack_100k')!.checkout_url).toBeNull();

    const summary = await request(http).get('/api/v1/billing/summary').set(auth()).expect(200);
    expect(summary.body.pack_balance).toBe(0);
    expect(summary.body.purchase_options).toHaveLength(2);
  });

  it('order_created creates the pack once — replays are idempotent, purchase audited once', async () => {
    const first = await postLemon(orderEvent(`order-${run}-1`, PACK_VARIANT_200)).expect(200);
    expect(first.body.result).toBe('applied:pack:200');
    const replay = await postLemon(orderEvent(`order-${run}-1`, PACK_VARIANT_200)).expect(200);
    expect(replay.body.result).toBe('noop');

    const packs = await owner.codePack.findMany({ where: { tenantId } });
    expect(packs).toHaveLength(1);
    expect(packs[0]).toMatchObject({
      quantityPurchased: 200,
      quantityRemaining: 200,
      lsOrderId: `order-${run}-1`,
    });
    pack200Id = packs[0]!.id;

    const audits = await owner.auditLog.findMany({
      where: { tenantId, action: 'billing.pack_purchased' },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]?.target).toMatchObject({ order_id: `order-${run}-1`, codes: 200 });

    expect(await packBalance()).toBe(200);
  });

  it('an unmapped order variant is acknowledged and skipped', async () => {
    const res = await postLemon(orderEvent(`order-${run}-x`, '999999')).expect(200);
    expect(res.body.result).toBe('ignored:pack_variant_unmapped');
    expect(await owner.codePack.count({ where: { tenantId } })).toBe(1);
  });

  it('with pack cover the gate admits the overflow, and ready-time settlement deducts FIFO', async () => {
    // second, later pack — FIFO must consume the older 200-pack first
    await new Promise((r) => setTimeout(r, 100)); // distinct purchased_at
    const second = await postLemon(orderEvent(`order-${run}-2`, PACK_VARIANT_150)).expect(200);
    expect(second.body.result).toBe('applied:pack:150');
    pack150Id = (await owner.codePack.findFirst({
      where: { tenantId, lsOrderId: `order-${run}-2` },
    }))!.id;
    expect(await packBalance()).toBe(350);

    // free quota 500, request 600 → overflow 100 covered by the packs
    const batch = await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity: 600, kind: 'on_demand' })
      .expect(201);
    await waitBatchReady(batch.body.id);
    const code = await owner.code.findFirst({ where: { batchId: batch.body.id } });
    overflowSerial = code!.serial;

    // FIFO: the older 200-pack absorbs the 100 overflow, the newer is intact
    const p200 = await owner.codePack.findUnique({ where: { id: pack200Id } });
    const p150 = await owner.codePack.findUnique({ where: { id: pack150Id } });
    expect(p200?.quantityRemaining).toBe(100);
    expect(p150?.quantityRemaining).toBe(150);
    expect(await packBalance()).toBe(250);
  });

  it('a deduction spanning packs drains FIFO across both (200-pack to zero first)', async () => {
    // used 600 of 500 → the next 150 lie fully beyond the quota line
    const batch = await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity: 150, kind: 'on_demand' })
      .expect(201);
    await waitBatchReady(batch.body.id);

    const p200 = await owner.codePack.findUnique({ where: { id: pack200Id } });
    const p150 = await owner.codePack.findUnique({ where: { id: pack150Id } });
    expect(p200?.quantityRemaining).toBe(0); // drained first (older)
    expect(p150?.quantityRemaining).toBe(100); // absorbed the remaining 50
    expect(await packBalance()).toBe(100);
  });

  it('beyond the remaining balance → 402 again with purchase_options; failed gate consumed nothing', async () => {
    // used 750, quota 500, balance 100 → 200 more cannot be covered
    const res = await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity: 200, kind: 'on_demand' })
      .expect(402);
    expect(res.body.feature).toBe('codesPerMonth');
    expect(Array.isArray(res.body.purchase_options)).toBe(true);
    expect(await packBalance()).toBe(100); // a rejected request deducts nothing
  });

  it('consumer verify keeps working throughout — quota exhaustion never bricks issued codes', async () => {
    const verify = await request(http).get(`/api/v1/verify/${overflowSerial}`).expect(200);
    // on_demand pool codes auto-activate → a real state, not invalid
    expect(['authentic', 'already_verified']).toContain(verify.body.result);
    expect(verify.body.product).not.toBeNull();
  });
});
