import { OWNER_DATABASE_URL } from './e2e-env';

import { createHmac } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';

jest.setTimeout(180_000);

const LS_SECRET = 'e2e-ls-webhook-secret';
const STARTER_VARIANT = '111111';
const GROWTH_VARIANT = '222222';

const BILLING_ENV_KEYS = [
  'BILLING_ENFORCEMENT',
  'LEMONSQUEEZY_WEBHOOK_SECRET',
  'LEMONSQUEEZY_VARIANT_PLAN_MAP',
  'LEMONSQUEEZY_CHECKOUT_URLS',
] as const;

function clearBillingEnv(): void {
  for (const key of BILLING_ENV_KEYS) {
    delete process.env[key];
  }
}

async function makeApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  // rawBody: same option as main.ts — the LS webhook verifies the raw bytes
  const app = moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.init();
  return app;
}

type Http = ReturnType<NestExpressApplication['getHttpServer']>;

async function registerTenant(
  http: Http,
  slug: string,
): Promise<{ token: string; tenantId: string }> {
  const reg = await request(http)
    .post('/api/v1/auth/register')
    .send({
      tenantName: `Billing ${slug}`,
      slug,
      email: `${slug}@example.com`,
      password: 'a-strong-password',
    })
    .expect(201);
  const token = reg.body.accessToken as string;
  const me = await request(http)
    .get('/api/v1/tenant/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return { token, tenantId: me.body.tenant.id as string };
}

async function createProduct(http: Http, token: string, sku: string): Promise<string> {
  const product = await request(http)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Billing ${sku}`, sku })
    .expect(201);
  return product.body.id as string;
}

async function waitBatchReady(http: Http, token: string, batchId: string): Promise<void> {
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

async function exportSerials(http: Http, token: string, batchId: string): Promise<string[]> {
  const exported = await request(http)
    .get(`/api/v1/batches/${batchId}/export?format=csv`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  const csv = await request(http).get(`/api/v1${exported.body.downloadPath}`).expect(200);
  return csv.text
    .trim()
    .split('\n')
    .slice(1)
    .map((row: string) => (row.split(',')[0] as string).trim());
}

/**
 * P1 acceptance — plan gates + Lemon Squeezy lifecycle. Two sequential app
 * instances: the default one proves BILLING_ENFORCEMENT=off changes nothing
 * (existing production behavior), the second (=on + LS config) proves the
 * 402 gates and the webhook-driven plan transitions.
 */
describe('P1 billing — enforcement off (default): nothing is gated', () => {
  let app: NestExpressApplication;
  let http: Http;
  const run = Date.now().toString(36);
  const slug = `bloff${run}`;
  let token = '';

  beforeAll(async () => {
    clearBillingEnv(); // no BILLING_ENFORCEMENT, no LS secret
    app = await makeApp();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    // let the fire-and-forget @Audit writes land before Prisma disconnects
    await new Promise((r) => setTimeout(r, 300));
    await app.close();
  });

  it('a fresh registration lands on the free plan', async () => {
    const t = await registerTenant(http, slug);
    token = t.token;
    const summary = await request(http)
      .get('/api/v1/billing/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(summary.body.plan).toBe('free');
    expect(summary.body.enforcement).toBe(false);
    expect(summary.body.usage.codes_quota).toBe(500);
    expect(summary.body.checkout_urls).toEqual({});
  });

  it('free tenant: standard batch beyond the free quota, webhooks, serial profiles, invites and returns all pass', async () => {
    const productId = await createProduct(http, token, `OFF-${run}`);
    // standard (bulk, scratch-bearing) batch of 600 > free quota of 500 —
    // both gates must stay silent while enforcement is off
    const batch = await request(http)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId, quantity: 600 })
      .expect(201);
    await waitBatchReady(http, token, batch.body.id);
    await request(http)
      .post(`/api/v1/batches/${batch.body.id}/activate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ all: true })
      .expect(201);
    const serials = await exportSerials(http, token, batch.body.id);

    await request(http)
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/hook', events: ['alert.created'] })
      .expect(201);
    await request(http)
      .post('/api/v1/serial-profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'off-profile', mode: 'platform', length: 20, random_bits: 96 })
      .expect(201);
    await request(http)
      .post('/api/v1/tenant/invites')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: `${slug}-invitee@example.com`, role: 'viewer' })
      .expect(201);
    await request(http)
      .post(`/api/v1/codes/${serials[0]}/rma`)
      .set('Authorization', `Bearer ${token}`)
      .send({ note: 'off-mode rma' })
      .expect(201);
  });

  it('the LS webhook endpoint does not exist while the secret is unconfigured (404)', async () => {
    await request(http)
      .post('/api/v1/billing/webhooks/lemonsqueezy')
      .set('content-type', 'application/json')
      .set('x-signature', 'deadbeef')
      .send('{}')
      .expect(404);
  });
});

describe('P1 billing — enforcement on: gates + Lemon Squeezy lifecycle', () => {
  let app: NestExpressApplication;
  let http: Http;
  let owner: PrismaClient;

  const run = Date.now().toString(36);
  const slug = `blon${run}`;
  let token = '';
  let tenantId = '';
  let productId = '';
  let liteSerials: string[] = [];

  const auth = () => ({ Authorization: `Bearer ${token}` });

  const sign = (body: string) => createHmac('sha256', LS_SECRET).update(body, 'utf8').digest('hex');
  const postLemon = (payload: object, options: { signature?: string } = {}) => {
    const body = JSON.stringify(payload);
    return request(http)
      .post('/api/v1/billing/webhooks/lemonsqueezy')
      .set('content-type', 'application/json')
      .set('x-signature', options.signature ?? sign(body))
      .send(body);
  };

  const subscriptionEvent = (
    eventName: string,
    overrides: {
      tenantId?: string;
      subscriptionId?: string;
      variantId?: string;
      renewsAt?: string | null;
      endsAt?: string | null;
    } = {},
  ) => ({
    meta: {
      event_name: eventName,
      ...(overrides.tenantId !== undefined ? { custom_data: { tenant_id: overrides.tenantId } } : {}),
    },
    data: {
      type: 'subscriptions',
      // unique per run: the DB persists across local runs and stale
      // ls_subscription_id rows must never route events to old tenants
      id: overrides.subscriptionId ?? `sub-${run}-1`,
      attributes: {
        customer_id: 9901,
        variant_id: Number(overrides.variantId ?? STARTER_VARIANT),
        renews_at: overrides.renewsAt ?? null,
        ends_at: overrides.endsAt ?? null,
      },
    },
  });

  beforeAll(async () => {
    owner = new PrismaClient({ datasources: { db: { url: OWNER_DATABASE_URL } } });
    process.env.BILLING_ENFORCEMENT = 'on';
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = LS_SECRET;
    process.env.LEMONSQUEEZY_VARIANT_PLAN_MAP = JSON.stringify({
      [STARTER_VARIANT]: 'starter',
      [GROWTH_VARIANT]: 'growth',
    });
    process.env.LEMONSQUEEZY_CHECKOUT_URLS = JSON.stringify({
      starter: 'https://veazen.lemonsqueezy.com/buy/starter-x',
      growth: 'https://veazen.lemonsqueezy.com/buy/growth-x',
    });
    app = await makeApp();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    // never leak billing env into the other e2e suites in this process
    clearBillingEnv();
    // let the fire-and-forget @Audit writes land before Prisma disconnects
    await new Promise((r) => setTimeout(r, 300));
    await app.close();
    await owner.$disconnect();
  });

  it('registration lands on free; summary reports enforcement + stamped checkout urls', async () => {
    const t = await registerTenant(http, slug);
    token = t.token;
    tenantId = t.tenantId;
    productId = await createProduct(http, token, `ON-${run}`);

    const summary = await request(http).get('/api/v1/billing/summary').set(auth()).expect(200);
    expect(summary.body.plan).toBe('free');
    expect(summary.body.enforcement).toBe(true);
    expect(summary.body.usage).toEqual({ codes_this_month: 0, codes_quota: 500 });
    expect(summary.body.features.scratch).toBe(false);
    expect(summary.body.checkout_urls.starter).toContain('veazen.lemonsqueezy.com/buy/starter-x');
    expect(summary.body.checkout_urls.starter).toContain(encodeURIComponent('checkout[custom][tenant_id]'));
    expect(summary.body.checkout_urls.starter).toContain(tenantId);
  });

  it('free tier: standard (scratch) batch → 402 with the unified body', async () => {
    const res = await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity: 10 })
      .expect(402);
    expect(res.body).toMatchObject({
      statusCode: 402,
      code: 'plan_upgrade_required',
      feature: 'scratch',
      plan: 'free',
    });
    expect(res.body.message).toContain('Plan & Billing');
  });

  it('free tier: over-quota request → 402 codesPerMonth; a small Lite batch passes', async () => {
    const over = await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity: 501, kind: 'on_demand' })
      .expect(402);
    expect(over.body.feature).toBe('codesPerMonth');
    expect(over.body.code).toBe('plan_upgrade_required');

    const batch = await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity: 10, kind: 'on_demand' })
      .expect(201);
    await waitBatchReady(http, token, batch.body.id);
    liteSerials = await exportSerials(http, token, batch.body.id);
    expect(liteSerials).toHaveLength(10);

    const summary = await request(http).get('/api/v1/billing/summary').set(auth()).expect(200);
    expect(summary.body.usage.codes_this_month).toBe(10);
  });

  it('free tier: webhooks, serial profiles, invites and the returns suite → 402', async () => {
    const hook = await request(http)
      .post('/api/v1/webhooks')
      .set(auth())
      .send({ url: 'https://example.com/hook', events: ['alert.created'] })
      .expect(402);
    expect(hook.body.feature).toBe('webhooks');

    const profile = await request(http)
      .post('/api/v1/serial-profiles')
      .set(auth())
      .send({ name: 'on-profile', mode: 'platform', length: 20, random_bits: 96 })
      .expect(402);
    expect(profile.body.feature).toBe('serialProfiles');

    const invite = await request(http)
      .post('/api/v1/tenant/invites')
      .set(auth())
      .send({ email: `${slug}-invitee@example.com`, role: 'viewer' })
      .expect(402);
    expect(invite.body.feature).toBe('teamInvites');

    for (const action of ['rma', 'release', 'relabel'] as const) {
      const res = await request(http)
        .post(`/api/v1/codes/${liteSerials[0]}/${action}`)
        .set(auth())
        .send(action === 'relabel' ? { new_serial: liteSerials[1] } : {})
        .expect(402);
      expect(res.body.feature).toBe('returnsSuite');
    }
  });

  it('webhook: wrong signature → opaque 401; missing signature → 401', async () => {
    const payload = subscriptionEvent('subscription_created', { tenantId });
    await postLemon(payload, { signature: 'f'.repeat(64) }).expect(401);
    const body = JSON.stringify(payload);
    await request(http)
      .post('/api/v1/billing/webhooks/lemonsqueezy')
      .set('content-type', 'application/json')
      .send(body)
      .expect(401);
    // still free — nothing was applied
    const summary = await request(http).get('/api/v1/billing/summary').set(auth()).expect(200);
    expect(summary.body.plan).toBe('free');
  });

  it('signed subscription_created → starter; the gated paths open accordingly', async () => {
    const renewsAt = '2026-08-13T00:00:00.000Z';
    const res = await postLemon(
      subscriptionEvent('subscription_created', { tenantId, renewsAt }),
    ).expect(200);
    expect(res.body.result).toBe('applied:starter');

    const summary = await request(http).get('/api/v1/billing/summary').set(auth()).expect(200);
    expect(summary.body.plan).toBe('starter');
    expect(summary.body.usage.codes_quota).toBe(5_000);
    expect(new Date(summary.body.renews_at).toISOString()).toBe(renewsAt);

    // plan change is audited
    const audits = await owner.auditLog.findMany({
      where: { tenantId, action: 'billing.plan_changed' },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]?.target).toMatchObject({
      from_plan: 'free',
      to_plan: 'starter',
      event: 'subscription_created',
      subscription_id: `sub-${run}-1`,
    });

    // starter: standard batches + returns suite now pass …
    const batch = await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity: 10 })
      .expect(201);
    await waitBatchReady(http, token, batch.body.id);
    await request(http)
      .post(`/api/v1/codes/${liteSerials[2]}/rma`)
      .set(auth())
      .send({ note: 'starter rma' })
      .expect(201);
    // … while webhooks and invites stay behind the Growth gate
    await request(http)
      .post('/api/v1/webhooks')
      .set(auth())
      .send({ url: 'https://example.com/hook', events: ['alert.created'] })
      .expect(402);
    await request(http)
      .post('/api/v1/tenant/invites')
      .set(auth())
      .send({ email: `${slug}-invitee@example.com`, role: 'viewer' })
      .expect(402);
  });

  it('replaying the same event is idempotent (no state change, no duplicate audit rows)', async () => {
    const res = await postLemon(
      subscriptionEvent('subscription_created', { tenantId, renewsAt: '2026-08-13T00:00:00.000Z' }),
    ).expect(200);
    expect(res.body.result).toBe('noop');
    const audits = await owner.auditLog.findMany({
      where: { tenantId, action: 'billing.plan_changed' },
    });
    expect(audits).toHaveLength(1);
  });

  it('subscription_updated located by subscription id (no custom_data) upgrades to growth', async () => {
    const res = await postLemon(
      subscriptionEvent('subscription_updated', {
        variantId: GROWTH_VARIANT,
        renewsAt: '2026-08-13T00:00:00.000Z',
      }),
    ).expect(200);
    expect(res.body.result).toBe('applied:growth');

    const summary = await request(http).get('/api/v1/billing/summary').set(auth()).expect(200);
    expect(summary.body.plan).toBe('growth');

    // growth opens webhooks + team invites
    await request(http)
      .post('/api/v1/webhooks')
      .set(auth())
      .send({ url: 'https://example.com/hook', events: ['alert.created'] })
      .expect(201);
    await request(http)
      .post('/api/v1/tenant/invites')
      .set(auth())
      .send({ email: `${slug}-invitee@example.com`, role: 'viewer' })
      .expect(201);
  });

  it('subscription_cancelled keeps the tier and records the paid-until date', async () => {
    const endsAt = '2026-09-01T00:00:00.000Z';
    await postLemon(subscriptionEvent('subscription_cancelled', { endsAt })).expect(200);
    const summary = await request(http).get('/api/v1/billing/summary').set(auth()).expect(200);
    expect(summary.body.plan).toBe('growth'); // survives until ends_at
    expect(new Date(summary.body.renews_at).toISOString()).toBe(endsAt);
  });

  it('subscription_expired drops back to free and unlinks the subscription', async () => {
    await postLemon(subscriptionEvent('subscription_expired', {})).expect(200);
    const summary = await request(http).get('/api/v1/billing/summary').set(auth()).expect(200);
    expect(summary.body.plan).toBe('free');
    const tenant = await owner.tenant.findUnique({ where: { id: tenantId } });
    expect(tenant?.lsSubscriptionId).toBeNull();
    // the free gates bite again
    await request(http)
      .post('/api/v1/batches')
      .set(auth())
      .send({ product_id: productId, quantity: 10 })
      .expect(402);
  });

  it('unroutable / unmapped events are acknowledged and skipped (LS must not retry forever)', async () => {
    const unroutable = await postLemon(
      subscriptionEvent('subscription_created', {
        tenantId: '00000000-0000-4000-8000-000000000000',
        subscriptionId: 'sub-nobody',
      }),
    ).expect(200);
    expect(unroutable.body.result).toBe('ignored:tenant_not_found');

    const unmapped = await postLemon(
      subscriptionEvent('subscription_created', {
        tenantId,
        subscriptionId: 'sub-e2e-2',
        variantId: '999999',
      }),
    ).expect(200);
    expect(unmapped.body.result).toBe('ignored:variant_unmapped');

    // B2: order_created is consumed by the code-pack handler now — with no
    // pack variant map configured it is acknowledged and skipped
    const order = await postLemon({ meta: { event_name: 'order_created' } }).expect(200);
    expect(order.body.result).toBe('ignored:pack_variant_unmapped');

    const other = await postLemon({ meta: { event_name: 'order_refunded' } }).expect(200);
    expect(other.body.result).toBe('ignored:order_refunded');
  });
});
