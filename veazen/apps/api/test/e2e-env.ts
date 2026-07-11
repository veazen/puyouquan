/**
 * Environment for the Phase 1 acceptance e2e suite. Assumes local postgres
 * (migrated) + redis, per infra/docker-compose.yml or native services.
 * The app connects as the RLS-restricted role (veazen_app, ADR-006).
 */
process.env.DATABASE_URL ??= 'postgres://veazen_app:veazen_app@localhost:5432/veazen';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.MASTER_KEY ??= 'a'.repeat(64);
process.env.JWT_SECRET ??= 'e2e-test-secret';
process.env.PUBLIC_VERIFY_BASE_URL ??= 'https://verify.veazen.app';
process.env.STORAGE_DIR ??= '.storage-test';
process.env.VEAZEN_WEBHOOK_BACKOFF_MS ??= '100,100,100,100,100';

/** Owner-role url for test cleanup (bypasses the append-only restrictions). */
export const OWNER_DATABASE_URL =
  process.env.OWNER_DATABASE_URL ?? 'postgres://veazen:veazen@localhost:5432/veazen';
