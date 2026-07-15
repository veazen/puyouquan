import './e2e-env';

import { createHmac } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { flushRateLimitBuckets } from './flush-rate-limits';

jest.setTimeout(180_000);

/**
 * A2 (Batch R) — ADR-012 invariant, locked by test: the consumer verification
 * path (`GET /verify/:serial`, `POST /verify/:serial/scratch`) must keep
 * working regardless of the tenant's billing state. Three tenants under
 * BILLING_ENFORCEMENT=on — free, subscription cancelled, subscription
 * expired — all verify and redeem normally, while the same tenants' 402s on
 * brand-side endpoints (the control group) prove the gates themselves bite.
 *
 * Test-effectiveness record (指令要求的红-绿验证, 2026-07-15): to prove this
 * suite actually guards the invariant, PlanGateService was TEMPORARILY wired
 * into the verify path (a `requireFeature(code.tenantId, 'webhooks')` call at
 * the top of VerifyService.publicScan and redeemScratch); with that sabotage
 * in place this suite failed (6 of 7 tests red, 402 on the consumer path);
 * after reverting it, all 7 passed. The shipped production code contains no
 * billing dependency anywhere under src/verify/.
 */

const LS_SECRET = 'e2e-ls-webhook-secret';
const STARTER_VARIANT = '111111';
const GROWTH_VARIANT = '222222';

const BILLING_ENV_KEYS = [
  'BILLING_ENFORCEMENT',
  'LEMONSQUEEZY_WEBHOOK_SECRET',
  'LEMONSQUEEZY_VARIANT_PLAN_MAP',
  'LEMONSQUEEZY_CHECKOUT_URLS',
] as const;

type Http = ReturnType<NestExpressApplication['getHttpServer']>;

async function makeApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.init();
  return app;
}

describe('A2 — consumer verification is billing-state independent (ADR-012)', () => {
  let app: NestExpressApplication;
  let http: Http;
  const run = Date.now().toString(36);
  const sign = (body: string) => createHmac('sha256', LS_SECRET).update(body, 'utf8').digest('hex');

  const postLemon = (payload: object) => {
    const body = JSON.stringify(payload);
    return request(http)
      .post('/api/v1/billing/webhooks/lemonsqueezy')
      .set('content-type', 'application/json')
      .set('x-signature', sign(body))
      .send(body);
  };

  const subscriptionEvent = (
    eventName: string,
    subscriptionId: string,
    overrides: { tenantId?: string; variantId?: string; renewsAt?: string | null; endsAt?: string | null } = {},
  ) => ({
    meta: {
      event_name: eventName,
      ...(overrides.tenantId ? { custom_data: { tenant_id: overrides.tenantId } } : {}),
    },
    data: {
      type: 'subscriptions',
      id: subscriptionId,
      attributes: {
        customer_id: 7702,
        variant_id: Number(overrides.variantId ?? STARTER_VARIANT),
        renews_at: overrides.renewsAt ?? null,
        ends_at: overrides.endsAt ?? null,
      },
    },
  });

  async function registerTenant(slug: string): Promise<{ token: string; tenantId: string }> {
    const reg = await request(http)
      .post('/api/v1/auth/register')
      .send({ tenantName: `Invariant ${slug}`, slug, email: `${slug}@example.com`, password: 'a-strong-password' })
      .expect(201);
    const token = reg.body.accessToken as string;
    const me = await request(http)
      .get('/api/v1/tenant/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return { token, tenantId: me.body.tenant.id as string };
  }

  async function createProduct(token: string, sku: string): Promise<string> {
    const product = await request(http)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Invariant ${sku}`, sku })
      .expect(201);
    return product.body.id as string;
  }

  async function waitBatchReady(token: string, batchId: string): Promise<void> {
    const deadline = Date.now() + 60_000;
    for (;;) {
      const res = await request(http)
        .get(`/api/v1/batches/${batchId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      if (res.body.status === 'ready') {
        return;
      }
      if (Date.now() > deadline) {
        throw new Error('batch generation timed out');
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  /** Bulk-batch CSV rows: [serial, scratch_code]. */
  async function exportRows(token: string, batchId: string): Promise<Array<[string, string]>> {
    const exported = await request(http)
      .get(`/api/v1/batches/${batchId}/export?format=csv`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const csv = await request(http).get(`/api/v1${exported.body.downloadPath}`).expect(200);
    return csv.text
      .trim()
      .split('\n')
      .slice(1)
      .map((row: string) => {
        const cols = row.split(',');
        return [cols[0]!.trim(), cols[1]!.trim()];
      });
  }

  /** Paid tenant with an activated, exported bulk (scratch-bearing) batch. */
  async function paidTenantWithScratchBatch(slug: string, subscriptionId: string) {
    const t = await registerTenant(slug);
    await postLemon(
      subscriptionEvent('subscription_created', subscriptionId, {
        tenantId: t.tenantId,
        renewsAt: '2026-08-15T00:00:00.000Z',
      }),
    ).expect(200);
    const productId = await createProduct(t.token, `INV-${slug}`);
    const batch = await request(http)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${t.token}`)
      .send({ product_id: productId, quantity: 4 })
      .expect(201);
    await waitBatchReady(t.token, batch.body.id);
    await request(http)
      .post(`/api/v1/batches/${batch.body.id}/activate`)
      .set('Authorization', `Bearer ${t.token}`)
      .send({ all: true })
      .expect(201);
    const rows = await exportRows(t.token, batch.body.id);
    return { ...t, productId, rows };
  }

  beforeAll(async () => {
    await flushRateLimitBuckets();
    process.env.BILLING_ENFORCEMENT = 'on';
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = LS_SECRET;
    process.env.LEMONSQUEEZY_VARIANT_PLAN_MAP = JSON.stringify({
      [STARTER_VARIANT]: 'starter',
      [GROWTH_VARIANT]: 'growth',
    });
    app = await makeApp();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    for (const key of BILLING_ENV_KEYS) {
      delete process.env[key];
    }
    // let the fire-and-forget @Audit writes land before Prisma disconnects
    await new Promise((r) => setTimeout(r, 300));
    await flushRateLimitBuckets();
    await app.close();
  });

  describe('free tenant (never subscribed)', () => {
    let token = '';
    let productId = '';
    let serial = '';

    it('its Lite codes verify with 200 + true status while POST /batches (bulk) is 402-gated', async () => {
      const t = await registerTenant(`invfree${run}`);
      token = t.token;
      productId = await createProduct(token, `INV-FREE-${run}`);
      const batch = await request(http)
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: productId, quantity: 3, kind: 'on_demand' })
        .expect(201);
      await waitBatchReady(token, batch.body.id);
      const exported = await request(http)
        .get(`/api/v1/batches/${batch.body.id}/export?format=csv`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const csv = await request(http).get(`/api/v1${exported.body.downloadPath}`).expect(200);
      serial = (csv.text.trim().split('\n')[1]!.split(',')[0] as string).trim();

      // the invariant: consumer verification answers with the true state
      const verify = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
      expect(verify.body.result).toBe('authentic');
      expect(verify.body.product.brand.name).toContain('Invariant');

      // control group: the brand-side gate on the very same tenant bites
      const gated = await request(http)
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: productId, quantity: 3 })
        .expect(402);
      expect(gated.body.code).toBe('plan_upgrade_required');
    });
  });

  describe('cancelled tenant (starter, subscription_cancelled)', () => {
    it('verify + scratch redemption work after cancellation; its starter-tier gates still bite (control)', async () => {
      const t = await paidTenantWithScratchBatch(`invcan${run}`, `sub-inv-can-${run}`);
      await postLemon(
        subscriptionEvent('subscription_cancelled', `sub-inv-can-${run}`, {
          endsAt: '2026-09-01T00:00:00.000Z',
        }),
      ).expect(200);

      const [serial, scratch] = t.rows[0]!;
      const verify = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
      expect(verify.body.result).toBe('authentic');

      const redeem = await request(http)
        .post(`/api/v1/verify/${serial}/scratch`)
        .send({ scratch_code: scratch })
        .expect(201);
      expect(redeem.body.result).toBe('verified');

      const again = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
      expect(again.body.result).toBe('already_verified');

      // control group: gates on the same tenant still enforce plan features
      // (starter has no webhooks; cancellation keeps the tier until ends_at)
      const gated = await request(http)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${t.token}`)
        .send({ url: 'https://example.com/hook', events: ['alert.created'] })
        .expect(402);
      expect(gated.body.feature).toBe('webhooks');
    });
  });

  describe('expired tenant (starter → subscription_expired → free)', () => {
    let t: Awaited<ReturnType<typeof paidTenantWithScratchBatch>>;

    beforeAll(async () => {
      t = await paidTenantWithScratchBatch(`invexp${run}`, `sub-inv-exp-${run}`);
      await postLemon(subscriptionEvent('subscription_expired', `sub-inv-exp-${run}`, {})).expect(200);
    });

    it('the drop back to free re-arms the batch gate (control group)', async () => {
      const summary = await request(http)
        .get('/api/v1/billing/summary')
        .set('Authorization', `Bearer ${t.token}`)
        .expect(200);
      expect(summary.body.plan).toBe('free');
      const gated = await request(http)
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${t.token}`)
        .send({ product_id: t.productId, quantity: 4 })
        .expect(402);
      expect(gated.body).toMatchObject({ code: 'plan_upgrade_required', feature: 'scratch' });
    });

    it('GET /verify still answers 200 with the true status and brand info', async () => {
      const [serial] = t.rows[1]!;
      const verify = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
      expect(verify.body.result).toBe('authentic');
      expect(verify.body.product.brand.name).toContain('Invariant');
      expect(verify.body.scan_count_hint).toBe('first_scan');
    });

    it('scratch codes printed while paid still redeem normally', async () => {
      const [serial, scratch] = t.rows[1]!;
      const redeem = await request(http)
        .post(`/api/v1/verify/${serial}/scratch`)
        .send({ scratch_code: scratch })
        .expect(201);
      expect(redeem.body.result).toBe('verified');
      expect(redeem.body.first_verified_at).toBeTruthy();
    });

    it('duplicate scratch redemption still answers already_verified (state machine intact)', async () => {
      const [serial, scratch] = t.rows[1]!;
      const dup = await request(http)
        .post(`/api/v1/verify/${serial}/scratch`)
        .send({ scratch_code: scratch })
        .expect(201);
      expect(dup.body.result).toBe('already_verified');
      expect(dup.body.first_verified_at).toBeTruthy();
    });

    it('a never-redeemed code of the expired tenant still verifies as authentic', async () => {
      const [serial] = t.rows[2]!;
      const verify = await request(http).get(`/api/v1/verify/${serial}`).expect(200);
      expect(verify.body.result).toBe('authentic');
    });
  });
});
