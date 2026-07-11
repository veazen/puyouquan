/**
 * Phase 1 acceptance benchmark (§8): autocannon against GET /verify/:serial,
 * target ≥ 500 rps locally. Boots the compiled API with rate limiting
 * disabled (benchmark-only escape hatch), provisions a tenant + one active
 * code via HTTP, then hammers the public verify endpoint.
 *
 * Prereqs: `npm run build`, migrated postgres + redis running.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import autocannon from 'autocannon';

const PORT = 4100;
const BASE = `http://127.0.0.1:${PORT}/api/v1`;

const env = {
  ...process.env,
  PORT: String(PORT),
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://veazen_app:veazen_app@localhost:5432/veazen?connection_limit=30',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  MASTER_KEY: process.env.MASTER_KEY ?? 'a'.repeat(64),
  JWT_SECRET: process.env.JWT_SECRET ?? 'bench-secret',
  STORAGE_DIR: '.storage-bench',
  RATE_LIMIT_DISABLED: 'true',
};

async function waitForHealth() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error('API did not become healthy');
}

async function json(res) {
  if (!res.ok && res.status !== 201) {
    throw new Error(`${res.url} -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

const api = spawn('node', ['dist/main.js'], { env, stdio: ['ignore', 'inherit', 'inherit'] });
try {
  await waitForHealth();

  const slug = `bench${Date.now().toString(36)}`;
  const reg = await json(
    await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenantName: 'Bench',
        slug,
        email: `${slug}@example.com`,
        password: 'bench-password-1',
      }),
    }),
  );
  const key = await json(
    await fetch(`${BASE}/auth/api-keys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${reg.accessToken}` },
      body: JSON.stringify({ label: 'bench' }),
    }),
  );
  const authed = { 'content-type': 'application/json', authorization: `Bearer ${key.apiKey}` };
  const product = await json(
    await fetch(`${BASE}/products`, {
      method: 'POST',
      headers: authed,
      body: JSON.stringify({ name: 'Bench Product', sku: 'BENCH-001' }),
    }),
  );
  const batch = await json(
    await fetch(`${BASE}/batches`, {
      method: 'POST',
      headers: authed,
      body: JSON.stringify({ product_id: product.id, quantity: 100 }),
    }),
  );
  for (let i = 0; i < 120; i += 1) {
    const b = await json(await fetch(`${BASE}/batches/${batch.id}`, { headers: authed }));
    if (b.status === 'ready') break;
    await sleep(500);
  }
  await json(
    await fetch(`${BASE}/batches/${batch.id}/activate`, {
      method: 'POST',
      headers: authed,
      body: JSON.stringify({ all: true }),
    }),
  );
  const exported = await json(
    await fetch(`${BASE}/batches/${batch.id}/export?format=csv`, { headers: authed }),
  );
  const csv = await (await fetch(`${BASE}${exported.downloadPath}`)).text();
  const serial = csv.split('\n')[1].split(',')[0];
  console.log(`benching GET /verify/${serial}`);

  const result = await autocannon({
    url: `${BASE}/verify/${serial}`,
    connections: 50,
    pipelining: 1,
    duration: 15,
  });
  const rps = result.requests.average;
  const p99 = result.latency.p99;
  console.log(`\n==> avg ${Math.round(rps)} req/s, p99 ${p99} ms (target: ≥500 rps, p99 < 150ms)`);
  if (rps < 500) {
    console.error('FAIL: below 500 rps acceptance target');
    process.exitCode = 1;
  } else {
    console.log('PASS');
  }
} finally {
  api.kill('SIGTERM');
}
