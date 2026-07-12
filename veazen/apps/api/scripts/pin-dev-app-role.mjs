/**
 * Dev/CI helper: pin the veazen_app role password to the fixed dev value so
 * local tools and the e2e suite can connect as
 * postgres://veazen_app:veazen_app@localhost:5432/veazen.
 *
 * The rls_and_roles migration creates the role with a random throwaway
 * password (managed platforms like Neon reject weak ones at commit), so a
 * fresh dev/CI database runs this once after `prisma migrate deploy`,
 * connected as the owner role. Refuses to touch non-local databases —
 * production derives its password from MASTER_KEY in deploy-boot.mjs.
 */
import { PrismaClient } from '@prisma/client';

const url = new URL(process.env.DATABASE_URL ?? 'postgres://veazen:veazen@localhost:5432/veazen');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'db']);
if (!LOCAL_HOSTS.has(url.hostname)) {
  console.error(`[pin-dev-app-role] refusing to run against non-local host "${url.hostname}"`);
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
try {
  await prisma.$executeRawUnsafe(`ALTER ROLE veazen_app WITH LOGIN PASSWORD 'veazen_app'`);
  console.log('[pin-dev-app-role] veazen_app password pinned to the dev value');
} finally {
  await prisma.$disconnect();
}
