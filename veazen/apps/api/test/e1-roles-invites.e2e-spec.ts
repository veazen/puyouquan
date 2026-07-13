import { OWNER_DATABASE_URL } from './e2e-env';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import request from 'supertest';

import { AppModule } from '../src/app.module';

jest.setTimeout(180_000);

/**
 * E1 acceptance (PD-004): role system + warehouse accounts + team invites.
 * Covers the full invite chain (owner invites → accept → correct JWT role),
 * a permission-matrix spot check for all four roles, invite token hygiene
 * (reuse / expiry / revocation) and the owner-removal invariants. The
 * machine API-key path must stay role-exempt (plugin compatibility).
 */
describe('E1 roles + invites', () => {
  let app: NestExpressApplication;
  let http: ReturnType<NestExpressApplication['getHttpServer']>;
  let owner: PrismaClient;

  const run = Date.now().toString(36);
  const slug = `e1role${run}`;

  let ownerToken = '';
  let adminToken = '';
  let viewerToken = '';
  let warehouseToken = '';
  let apiKey = '';
  let serials: string[] = [];

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** POST /tenant/invites as owner and pull the token out of accept_url. */
  async function invite(email: string, role: string): Promise<{ id: string; token: string }> {
    const res = await request(http)
      .post('/api/v1/tenant/invites')
      .set(auth(ownerToken))
      .send({ email, role })
      .expect(201);
    expect(res.body.accept_url).toContain('/dashboard/invite/');
    expect(res.body.role).toBe(role);
    const token = (res.body.accept_url as string).split('/dashboard/invite/')[1] as string;
    return { id: res.body.id as string, token };
  }

  async function accept(token: string, expectedRole: string): Promise<string> {
    const res = await request(http)
      .post('/api/v1/auth/accept-invite')
      .send({ token, password: 'a-strong-password' })
      .expect(201);
    expect(res.body.role).toBe(expectedRole);
    expect(res.body.accessToken).toBeDefined();
    // the JWT role claim is what the guard trusts
    const claims = JSON.parse(
      Buffer.from((res.body.accessToken as string).split('.')[1] as string, 'base64url').toString(),
    ) as { role: string };
    expect(claims.role).toBe(expectedRole);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    owner = new PrismaClient({ datasources: { db: { url: OWNER_DATABASE_URL } } });

    // this suite redeems ~8 invites from one IP — drop any leftover
    // accept-invite rate-limit window from a previous local run
    const redis = new Redis(process.env.REDIS_URL as string);
    const buckets = await redis.keys('rl:accept-invite:*');
    if (buckets.length > 0) {
      await redis.del(...buckets);
    }
    await redis.quit();

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

  it('sets up a Lite tenant with a scan-only pool', async () => {
    const reg = await request(http)
      .post('/api/v1/auth/register')
      .send({
        tenantName: 'E1 Roles Brand',
        slug,
        email: `${slug}-owner@example.com`,
        password: 'a-strong-password',
      })
      .expect(201);
    ownerToken = reg.body.accessToken;
    // Lite mode: scan-only codes with the first-scan lock — the shape the
    // warehouse release action exists for (PD-003)
    await request(http)
      .patch('/api/v1/tenant/settings')
      .set(auth(ownerToken))
      .send({ mode: 'lite' })
      .expect(200);

    const product = await request(http)
      .post('/api/v1/products')
      .set(auth(ownerToken))
      .send({ name: 'E1 Widget', sku: `E1-${run}` })
      .expect(201);
    const batch = await request(http)
      .post('/api/v1/batches')
      .set(auth(ownerToken))
      .send({ product_id: product.body.id, quantity: 10, kind: 'on_demand' })
      .expect(201);
    const deadline = Date.now() + 60_000;
    for (;;) {
      const res = await request(http)
        .get(`/api/v1/batches/${batch.body.id}`)
        .set(auth(ownerToken))
        .expect(200);
      if (res.body.status === 'ready') {
        break;
      }
      if (Date.now() > deadline) {
        throw new Error('batch generation timed out');
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    const exported = await request(http)
      .get(`/api/v1/batches/${batch.body.id}/export?format=csv`)
      .set(auth(ownerToken))
      .expect(200);
    const csv = await request(http).get(`/api/v1${exported.body.downloadPath}`).expect(200);
    serials = csv.text
      .trim()
      .split('\n')
      .slice(1)
      .map((row: string) => (row.split(',')[0] as string).trim());
    expect(serials).toHaveLength(10);
  });

  it('invite chain: owner invites an admin who signs in with the invited role', async () => {
    const { token } = await invite(`${slug}-admin@example.com`, 'admin');
    adminToken = await accept(token, 'admin');

    const me = await request(http).get('/api/v1/tenant/me').set(auth(adminToken)).expect(200);
    expect(me.body.user.role).toBe('admin');
    expect(me.body.user.email).toBe(`${slug}-admin@example.com`);

    // the acceptance is audited with the new user as the actor
    const audit = await owner.auditLog.findMany({
      where: { tenantId: me.body.tenant.id, action: 'user.accept_invite' },
    });
    expect(audit.length).toBeGreaterThanOrEqual(1);
  });

  it('admin: full console access except team management and API keys', async () => {
    // everything: writes work
    await request(http)
      .post('/api/v1/products')
      .set(auth(adminToken))
      .send({ name: 'Admin Widget', sku: `E1A-${run}` })
      .expect(201);
    await request(http)
      .patch('/api/v1/tenant/settings')
      .set(auth(adminToken))
      .send({ settings: { brandColor: '#123456' } })
      .expect(200);

    // except: invites, member removal, API keys — owner-only (E1 matrix)
    await request(http)
      .post('/api/v1/tenant/invites')
      .set(auth(adminToken))
      .send({ email: `${slug}-x@example.com`, role: 'viewer' })
      .expect(403);
    const users = await request(http).get('/api/v1/tenant/users').set(auth(adminToken)).expect(200);
    await request(http)
      .delete(`/api/v1/tenant/users/${users.body[0].id}`)
      .set(auth(adminToken))
      .expect(403);
    await request(http)
      .post('/api/v1/auth/api-keys')
      .set(auth(adminToken))
      .send({ label: 'nope' })
      .expect(403);
    // …but listing keys is a read and stays open to console roles
    await request(http).get('/api/v1/auth/api-keys').set(auth(adminToken)).expect(200);
  });

  it('warehouse: returns desk works, everything else is 403', async () => {
    const { token } = await invite(`${slug}-wh@example.com`, 'warehouse');
    warehouseToken = await accept(token, 'warehouse');

    // console bootstrap + the check page
    const me = await request(http).get('/api/v1/tenant/me').set(auth(warehouseToken)).expect(200);
    expect(me.body.user.role).toBe('warehouse');
    const lookup = await request(http)
      .get(`/api/v1/codes/${serials[0]}`)
      .set(auth(warehouseToken))
      .expect(200);
    expect(lookup.body.status).toBe('active');

    // returns actions: rma on an active code books the returned event …
    await request(http)
      .post(`/api/v1/codes/${serials[1]}/rma`)
      .set(auth(warehouseToken))
      .send({ note: 'warehouse QC' })
      .expect(201);
    // … release unlocks a first-scan-locked code …
    await request(http).get(`/api/v1/verify/${serials[0]}`).expect(200);
    const released = await request(http)
      .post(`/api/v1/codes/${serials[0]}/release`)
      .set(auth(warehouseToken))
      .expect(201);
    expect(released.body.release_count).toBe(1);
    // … and relabel retires the old code onto a fresh one
    const relabeled = await request(http)
      .post(`/api/v1/codes/${serials[2]}/relabel`)
      .set(auth(warehouseToken))
      .send({ new_serial: serials[3] })
      .expect(201);
    expect(relabeled.body.status).toBe('retired');

    // everything else: 403 (reads and writes alike)
    await request(http).get('/api/v1/products').set(auth(warehouseToken)).expect(403);
    await request(http)
      .post('/api/v1/products')
      .set(auth(warehouseToken))
      .send({ name: 'nope', sku: 'NOPE' })
      .expect(403);
    await request(http).get('/api/v1/stats/overview').set(auth(warehouseToken)).expect(403);
    await request(http).get('/api/v1/batches').set(auth(warehouseToken)).expect(403);
    await request(http).get('/api/v1/tenant/users').set(auth(warehouseToken)).expect(403);
    await request(http).get('/api/v1/alerts').set(auth(warehouseToken)).expect(403);
    await request(http)
      .post('/api/v1/auth/api-keys')
      .set(auth(warehouseToken))
      .send({ label: 'nope' })
      .expect(403);
    await request(http)
      .patch('/api/v1/tenant/settings')
      .set(auth(warehouseToken))
      .send({ settings: {} })
      .expect(403);
    // non-returns code mutations are also out of reach
    await request(http)
      .post(`/api/v1/codes/${serials[4]}/flag`)
      .set(auth(warehouseToken))
      .send({ reason: 'manual' })
      .expect(403);
  });

  it('viewer: every GET works, every mutation is 403', async () => {
    const { token } = await invite(`${slug}-view@example.com`, 'viewer');
    viewerToken = await accept(token, 'viewer');

    await request(http).get('/api/v1/products').set(auth(viewerToken)).expect(200);
    await request(http).get('/api/v1/batches').set(auth(viewerToken)).expect(200);
    await request(http).get('/api/v1/stats/overview').set(auth(viewerToken)).expect(200);
    await request(http).get('/api/v1/tenant/users').set(auth(viewerToken)).expect(200);
    await request(http).get('/api/v1/tenant/invites').set(auth(viewerToken)).expect(200);
    await request(http).get('/api/v1/auth/api-keys').set(auth(viewerToken)).expect(200);
    await request(http).get(`/api/v1/codes/${serials[4]}`).set(auth(viewerToken)).expect(200);

    await request(http)
      .post('/api/v1/products')
      .set(auth(viewerToken))
      .send({ name: 'nope', sku: 'NOPE' })
      .expect(403);
    await request(http)
      .patch('/api/v1/tenant/settings')
      .set(auth(viewerToken))
      .send({ settings: {} })
      .expect(403);
    await request(http)
      .post(`/api/v1/codes/${serials[4]}/release`)
      .set(auth(viewerToken))
      .expect(403);
    await request(http)
      .post(`/api/v1/codes/${serials[4]}/rma`)
      .set(auth(viewerToken))
      .send({})
      .expect(403);
    await request(http)
      .post('/api/v1/webhooks')
      .set(auth(viewerToken))
      .send({ url: 'https://example.com/hook', events: ['alert.created'] })
      .expect(403);
  });

  it('machine API keys stay role-exempt (plugin path unchanged)', async () => {
    const keyRes = await request(http)
      .post('/api/v1/auth/api-keys')
      .set(auth(ownerToken))
      .send({ label: 'e1-e2e' })
      .expect(201);
    apiKey = keyRes.body.apiKey;
    await request(http).get('/api/v1/products').set(auth(apiKey)).expect(200);
    await request(http)
      .post('/api/v1/products')
      .set(auth(apiKey))
      .send({ name: 'Key Widget', sku: `E1K-${run}` })
      .expect(201);
  });

  it('invite hygiene: duplicates, existing accounts, reuse, revocation, expiry', async () => {
    // pending duplicate → 409; existing account → 409
    const dup = await invite(`${slug}-dup@example.com`, 'viewer');
    await request(http)
      .post('/api/v1/tenant/invites')
      .set(auth(ownerToken))
      .send({ email: `${slug}-dup@example.com`, role: 'viewer' })
      .expect(409);
    await request(http)
      .post('/api/v1/tenant/invites')
      .set(auth(ownerToken))
      .send({ email: `${slug}-admin@example.com`, role: 'viewer' })
      .expect(409);
    // owner role is never invitable
    await request(http)
      .post('/api/v1/tenant/invites')
      .set(auth(ownerToken))
      .send({ email: `${slug}-o2@example.com`, role: 'owner' })
      .expect(400);

    // pending list shows it; revocation kills the token
    const pending = await request(http)
      .get('/api/v1/tenant/invites')
      .set(auth(ownerToken))
      .expect(200);
    expect(
      (pending.body as Array<{ email: string }>).some(
        (i) => i.email === `${slug}-dup@example.com`,
      ),
    ).toBe(true);
    await request(http)
      .delete(`/api/v1/tenant/invites/${dup.id}`)
      .set(auth(ownerToken))
      .expect(200);
    await request(http)
      .post('/api/v1/auth/accept-invite')
      .send({ token: dup.token, password: 'a-strong-password' })
      .expect(401);

    // a redeemed token cannot be replayed (the viewer invite from earlier)
    const reuse = await invite(`${slug}-reuse@example.com`, 'viewer');
    await accept(reuse.token, 'viewer');
    await request(http)
      .post('/api/v1/auth/accept-invite')
      .send({ token: reuse.token, password: 'another-strong-password' })
      .expect(401);

    // expiry: age the invite in the DB (owner role bypasses append-only rules)
    const expired = await invite(`${slug}-late@example.com`, 'warehouse');
    await owner.invite.updateMany({
      where: { email: `${slug}-late@example.com` },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await request(http)
      .post('/api/v1/auth/accept-invite')
      .send({ token: expired.token, password: 'a-strong-password' })
      .expect(401);

    // garbage token → same opaque 401
    await request(http)
      .post('/api/v1/auth/accept-invite')
      .send({ token: 'x'.repeat(43), password: 'a-strong-password' })
      .expect(401);
  });

  it('owner removal invariants: not yourself, not the last owner', async () => {
    const users = await request(http).get('/api/v1/tenant/users').set(auth(ownerToken)).expect(200);
    const rows = users.body as Array<{ id: string; email: string; role: string }>;
    const ownerRow = rows.find((u) => u.role === 'owner')!;
    const viewerRow = rows.find((u) => u.email === `${slug}-view@example.com`)!;

    // self-removal and last-owner removal are the same 409 here (sole owner)
    await request(http)
      .delete(`/api/v1/tenant/users/${ownerRow.id}`)
      .set(auth(ownerToken))
      .expect(409);

    // removing a member works and the member disappears from the roster
    await request(http)
      .delete(`/api/v1/tenant/users/${viewerRow.id}`)
      .set(auth(ownerToken))
      .expect(200);
    const after = await request(http).get('/api/v1/tenant/users').set(auth(ownerToken)).expect(200);
    expect(
      (after.body as Array<{ id: string }>).some((u) => u.id === viewerRow.id),
    ).toBe(false);
  });
});
