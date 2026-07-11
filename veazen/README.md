# Veazen — Trust, set in stone.

Cloud anti-counterfeit ("one code per item") verification + supply-chain
traceability SaaS, with a WordPress/WooCommerce plugin as the first
integration channel. **Veazen™ is a product of VEAZEN LLC.**

The authoritative spec is [`PROJECT_PLAN.md`](./PROJECT_PLAN.md); implementation
decisions are recorded in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Status

**Phase 0 (scaffolding) — complete.** Monorepo, crypto core with test vectors,
local infra, CI. Phase 1 (cloud core: Prisma schema, auth, batches, verify
endpoint, risk rules) is next — see PROJECT_PLAN §8.

## Layout

| Path | What it is |
|---|---|
| `apps/api` | NestJS 10 cloud API (the "brain": code generation, signing, verification, risk) |
| `apps/web` | Next.js 15 consumer verify pages + tenant dashboard (Next 14→15: see ADR-005) |
| `apps/wp-plugin` | WordPress/WooCommerce plugin (the "shell", slug `veazen`) |
| `packages/crypto` | Pure crypto functions: serials, Ed25519 code signing, scratch codes — 100% coverage enforced, with committed test vectors |
| `packages/shared` | Shared domain types/constants (code state machine, verify contract) |
| `infra/` | `docker-compose.yml` for local dev (postgres 16, redis 7, minio, mailhog) |
| `docs/` | Architecture notes / ADRs; `openapi.json` is generated here from Phase 1 |

## Getting started

```bash
# Node 22+, npm 10+
npm install
npm run check          # turbo run test lint typecheck — Phase 0 acceptance

# local backing services
docker compose -f infra/docker-compose.yml up -d

# WordPress plugin coding standards
cd apps/wp-plugin && composer install && composer lint
```

Regenerate crypto test vectors (after an intentional, ADR-documented change):

```bash
cd packages/crypto && npm run build && node scripts/generate-vectors.mjs > test-vectors/vectors.json
```

## Engineering ground rules (PROJECT_PLAN §9–§10)

- All randomness via `crypto.randomBytes`; `Math.random` is lint-banned in `packages/crypto`.
- Scratch-code plaintext exists only in export files; the DB stores argon2id hashes only.
- `packages/crypto` keeps 100% test coverage; api core modules ≥ 85% (from Phase 1).
- Conventional Commits; architecture deviations need an ADR in `docs/ARCHITECTURE.md` first.

## Human TODO (PROJECT_PLAN §12 — cannot be done by code)

- [x] Domain `veazen.app` registered (Namecheap), NS on Cloudflare (Active), SSL Full (Strict), Email Routing (hello@/support@), temp site on Cloudflare Pages project `veazen`
- [ ] Sender domain SPF/DKIM/DMARC (when wiring Resend); 4–6 char short QR-redirect domain; defensive veazen.net/.io after trademark
- [ ] Account matrix via hello@veazen.app: WordPress.org (username `veazen`, highest priority), GitHub org `veazen`, Cloudflare R2 bucket `veazen-prod`, Railway/Neon/Upstash/Resend, Sentry + UptimeRobot, MaxMind GeoLite license (.mmdb download)
- [ ] Demo store: cheap WP host, WooCommerce demo at demo.veazen.app with this plugin installed
- [ ] Trademark filing (VEAZEN, classes 9 & 42) — see §12 for the attorney search notes
- [ ] Stripe: legal name VEAZEN LLC, public business name VEAZEN
- [ ] California foreign qualification + BOI filing check (if operating from CA)
- [ ] WordPress.org plugin account + submission review
- [ ] Production `MASTER_KEY` generation and offline backup
- [ ] GDPR privacy policy + DPA legal review (must cover device_fp & cross-tenant risk data)
- [ ] Third-party penetration test procurement
- [ ] SOC 2 Type II process kickoff
- [ ] GS1 membership (GTIN capability)
- [ ] Print-vendor partnership negotiations; NFC chip supply chain (Phase 5)
