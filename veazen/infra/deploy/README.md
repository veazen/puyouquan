# Deployment runbook (Phase 4)

Two supported paths. The operator-facing step-by-step (Chinese, novice
level) lives in [`docs/DEPLOY_GUIDE_zh.md`](../../docs/DEPLOY_GUIDE_zh.md).

## A. Managed: Railway (api + web) + Neon (Postgres) + Upstash (Redis) + R2 (storage)

**api service** — Railway, deploy from GitHub:
- Root Directory `veazen`, Dockerfile Path `apps/api/Dockerfile`
- The container boots via `scripts/deploy-boot.mjs`: runs
  `prisma migrate deploy` with `MIGRATE_DATABASE_URL` (Neon owner URL), then
  rotates the `veazen_app` role password (derived from `MASTER_KEY`, no extra
  secret) and starts the API under that RLS-bound role (ADR-006). The owner
  role needs CREATEROLE/ADMIN on `veazen_app` — Neon default owners qualify.
- Env vars (see the guide for values):
  `MIGRATE_DATABASE_URL` (Neon, with `sslmode=require`), `REDIS_URL`
  (Upstash `rediss://`), `MASTER_KEY` (64 hex — generate offline, back up;
  §12), `JWT_SECRET`, `PUBLIC_VERIFY_BASE_URL=https://verify.veazen.app`,
  `S3_ENDPOINT`/`S3_BUCKET`/`S3_ACCESS_KEY`/`S3_SECRET_KEY` (R2 —
  **required in production**: export CSVs are the only copy of scratch
  plaintext and container disks are ephemeral), optional `CORS_ORIGINS`,
  `ANONYMIZE_IP`, `GEOIP_DB_PATH`.
- Custom domain: `api.veazen.app` (Railway issues the CNAME target; add it
  in Cloudflare DNS, proxied).

**web service** — same repo, second Railway service:
- Root Directory `veazen`, Dockerfile Path `apps/web/Dockerfile`
- Build arg `NEXT_PUBLIC_API_URL` defaults to `https://api.veazen.app/api/v1`
- Env: `API_URL_INTERNAL=https://api.veazen.app/api/v1`
- Custom domain: `verify.veazen.app` (later also `{slug}.veazen.app`
  wildcard, Phase 4 white-label work).

**Cloudflare fronting**: both domains proxied (orange cloud); SSL mode Full
(Strict). The marketing site stays on the existing Workers/Pages deployment.

**Rotation & backup**:
- `MASTER_KEY` loss = loss of tenant private keys, webhook secrets and the
  derived app-role password. Store it offline (two copies). Rotation
  requires re-encrypting `tenants.encrypted_private_key` and
  `webhook_endpoints.encrypted_secret` (tooling: Phase 5 hardening).
- Database: Neon keeps PITR history per plan; additionally schedule a weekly
  `pg_dump` (owner URL) to R2. scan_events/audit_logs immutability relies on
  the app connecting as `veazen_app` — never point `DATABASE_URL`/the app at
  the owner role.

## B. Self-hosted: docker compose

```bash
MASTER_KEY=$(openssl rand -hex 32) JWT_SECRET=$(openssl rand -hex 24) \
  docker compose -f infra/deploy/compose.prod.yml up --build -d
curl http://localhost:4000/api/v1/health
curl http://localhost:3000/
```

Smoke test after boot: register a tenant, create an API key, POST a product,
request a 50-code batch, activate, GET /verify/:serial → `inactive` before
activation / `authentic` after (the Phase 1 e2e suite automates the same
path against any base URL).

## Notes

- Pen-test before GA (§9.8) — procurement is a Human TODO.
- `RATE_LIMIT_DISABLED` exists solely for load benches; never set in prod.
- OpenAPI of the deployed API: `GET /api/docs` (Swagger UI) / `docs/openapi.json` in-repo.
