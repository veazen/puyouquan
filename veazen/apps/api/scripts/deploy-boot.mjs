/**
 * Production boot sequence (ADR-006 in managed environments like Neon):
 *
 *   1. prisma migrate deploy      — with MIGRATE_DATABASE_URL (owner role)
 *   2. provision veazen_app       — password derived from MASTER_KEY, so the
 *                                   operator manages ONE secret, and the app
 *                                   still runs under the RLS-bound,
 *                                   append-only-enforced role
 *   3. start the API              — DATABASE_URL rewritten to veazen_app
 *
 * Behavior without MIGRATE_DATABASE_URL: assumes DATABASE_URL is already the
 * app role (local dev / CI) and just starts the server.
 */
import { createHmac } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { mkdir, readdir, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const migrateUrl = process.env.MIGRATE_DATABASE_URL;
const masterKey = process.env.MASTER_KEY ?? '';

function derivedAppPassword() {
  // mirrors EnvelopeService.deriveKey('db-app-password')
  return createHmac('sha256', Buffer.from(masterKey, 'hex'))
    .update('veazen.derive.v1:db-app-password')
    .digest('hex')
    .slice(0, 32);
}

function appUrlFrom(ownerUrl, password) {
  const url = new URL(ownerUrl);
  url.username = 'veazen_app';
  url.password = password;
  return url.toString();
}

/** Find the first *.mmdb file under dir (recursive). */
async function findMmdb(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findMmdb(path);
      if (nested) {
        return nested;
      }
    } else if (entry.name.endsWith('.mmdb')) {
      return path;
    }
  }
  return null;
}

/**
 * GeoLite2 provisioning for ephemeral containers: when MAXMIND_LICENSE_KEY
 * is set (and no GEOIP_DB_PATH given), download the City database at boot.
 * Any failure degrades gracefully — the API runs without geo resolution
 * (geo_velocity / out_of_market rules simply see no country data).
 */
async function ensureGeoIp() {
  if (process.env.GEOIP_DB_PATH || !process.env.MAXMIND_LICENSE_KEY) {
    return {};
  }
  try {
    console.log('[boot] downloading GeoLite2-City…');
    const url =
      'https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City' +
      `&license_key=${encodeURIComponent(process.env.MAXMIND_LICENSE_KEY)}&suffix=tar.gz`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`MaxMind download failed: HTTP ${response.status}`);
    }
    const archive = '/tmp/geolite2-city.tar.gz';
    const extractDir = '/tmp/geolite2-extract';
    await writeFile(archive, Buffer.from(await response.arrayBuffer()));
    await mkdir(extractDir, { recursive: true });
    const tar = spawnSync('tar', ['-xzf', archive, '-C', extractDir], { stdio: 'inherit' });
    if (tar.status !== 0) {
      throw new Error('tar extraction failed');
    }
    const mmdb = await findMmdb(extractDir);
    if (!mmdb) {
      throw new Error('no .mmdb file in archive');
    }
    const dest = '/tmp/GeoLite2-City.mmdb';
    await copyFile(mmdb, dest);
    console.log('[boot] GeoLite2-City ready');
    return { GEOIP_DB_PATH: dest };
  } catch (error) {
    console.warn(`[boot] GeoIP unavailable (${error.message}) — continuing without geo resolution`);
    return {};
  }
}

async function main() {
  let appDatabaseUrl = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;

  if (migrateUrl) {
    console.log('[boot] running prisma migrate deploy…');
    const migrate = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: migrateUrl },
    });
    if (migrate.status !== 0) {
      process.exit(migrate.status ?? 1);
    }

    if (!/^[0-9a-fA-F]{64}$/.test(masterKey)) {
      console.error('[boot] MASTER_KEY missing/invalid — cannot derive app role password');
      process.exit(1);
    }
    const password = derivedAppPassword();
    console.log('[boot] provisioning veazen_app role…');
    const { PrismaClient } = await import('@prisma/client');
    const owner = new PrismaClient({ datasources: { db: { url: migrateUrl } } });
    try {
      // role exists from the rls_and_roles migration; rotate to the derived password
      await owner.$executeRawUnsafe(`ALTER ROLE veazen_app WITH LOGIN PASSWORD '${password}'`);
    } catch (error) {
      console.error(
        '[boot] could not rotate the veazen_app password. The MIGRATE_DATABASE_URL role',
        'needs CREATEROLE + ADMIN on veazen_app (Neon default owners qualify; on plain',
        'Postgres run: ALTER ROLE <owner> CREATEROLE; GRANT veazen_app TO <owner> WITH ADMIN OPTION;)',
      );
      throw error;
    } finally {
      await owner.$disconnect();
    }

    if (!process.env.APP_DATABASE_URL) {
      appDatabaseUrl = appUrlFrom(migrateUrl, password);
    }
  }

  const geoEnv = await ensureGeoIp();

  console.log('[boot] starting API…');
  const api = spawn('node', ['dist/main.js'], {
    stdio: 'inherit',
    env: { ...process.env, ...geoEnv, DATABASE_URL: appDatabaseUrl },
  });
  api.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => api.kill(sig));
  }
}

main().catch((error) => {
  console.error('[boot] failed:', error);
  process.exit(1);
});
