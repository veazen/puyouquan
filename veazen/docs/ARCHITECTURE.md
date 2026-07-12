# Veazen — Architecture Notes & Decision Records

The authoritative product/architecture spec is [`PROJECT_PLAN.md`](../PROJECT_PLAN.md).
This file records implementation-level decisions (ADRs) where the spec leaves
room for interpretation, per §10: any deviation from the plan gets an ADR here
before it is implemented.

---

## ADR-001: Canonical Ed25519 signing message encoding

**Status**: accepted (Phase 0)

**Context**: §2.4 specifies `sig = base64url(Ed25519(serial || tenant_id || batch_id))[:16]`,
where `||` is the conventional concatenation operator. Raw concatenation of
variable-length fields is ambiguous (`"ab" + "c"` = `"a" + "bc"`), which is a
classic signature-confusion foot-gun.

**Decision**: the canonical message is the UTF-8 encoding of

```
veazen.code.v1:{serial}:{tenant_id}:{batch_id}
```

- `veazen.code.v1` is a domain-separation + version prefix, so signatures can
  never be confused with signatures over other message types, and the format
  can be evolved (`v2`) without breaking verification of existing codes.
- `:` is the field delimiter; `buildCodeMessage()` rejects any field that is
  empty or contains `:` (serials are Crockford base32 and IDs are UUIDs, so
  this never triggers in practice — it is defense in depth).

Implemented in `packages/crypto/src/signing.ts`; pinned by the test vectors in
`packages/crypto/test-vectors/vectors.json`. Changing this encoding after
codes ship would invalidate every printed QR code — treat it as frozen.

## ADR-002: Crockford base32 uses the bit-stream (RFC 4648-style) layout

**Status**: accepted (Phase 0)

**Context**: §2.4 specifies `serial = base32(crockford)(96-bit CSPRNG)`,
20 characters. Crockford's original spec encodes integers; byte-oriented
implementations conventionally use the RFC 4648 bit layout (MSB-first 5-bit
groups, zero-padded final group) with the Crockford alphabet.

**Decision**: bit-stream layout. 12 random bytes (96 bits) encode to exactly
20 characters; the 20th character carries a single data bit, so canonical
serials always end in `0` or `G` and decoding enforces zero padding bits.
This layout is directly cross-checkable against any RFC 4648 base32
implementation via alphabet translation (the test vectors were verified
against Python's `base64.b32encode`), which matters for print-vendor and
partner tooling written in other languages.

**Consequence**: `isValidSerial` rejects strings whose padding bits are
non-zero, which also catches a class of typo/enumeration probes for free.

## ADR-003: Monorepo location inside this repository

**Status**: accepted (Phase 0)

The host git repository contains unrelated prior experiments at its root. The
entire Veazen monorepo lives under `veazen/` (matching the directory tree in
PROJECT_PLAN §3, which names `veazen/` as the root). CI for the platform
triggers on `veazen/**` paths only. If the project is later extracted to its
own repository, `veazen/` becomes the repo root unchanged.

## ADR-004: Scratch-code hashing parameters

**Status**: accepted (Phase 0)

§2.4 mandates argon2id for scratch codes but no parameters. We use the OWASP
Password Storage Cheat Sheet recommendation: memory 19 MiB, iterations 2,
parallelism 1 (`packages/crypto/src/scratch.ts`). Rationale: scratch
verification sits on a rate-limited public endpoint (§5.1: 10 req/min/IP);
19 MiB per verification bounds memory pressure under burst while remaining
GPU-hostile. Parameters are encoded in the hash string, so they can be raised
later with transparent rehash-on-verify.

## ADR-005: Dependency security posture — Next 15, multer override, vitest 4

**Status**: accepted (Phase 0)

**Context**: §9.7 puts `npm audit --audit-level=high` in CI as a blocking
gate, but the §2 tech-stack pins (Next.js 14, NestJS 10) ship known
high-severity advisories with no fix inside those majors: fourteen `next@14`
advisories (XSS, SSRF, cache poisoning, DoS — all on the code path that will
serve the public verify page) are fixed only in `next@≥15.5.16`;
`@nestjs/platform-express@10` pins `multer@1.x` (five DoS advisories, fixed
in `multer@≥2.2.0`); `vitest@2` has a critical (fixed in `≥3.2.6`). The two
spec requirements are in direct conflict; permanently allowlisting XSS/SSRF
advisories on the consumer-facing surface was judged worse than a controlled
deviation from the version pins.

**Decision**:
1. `apps/web` runs **Next 15.5.16+ / React 19** (deviating from the §2.2
   "Next.js 14" pin). Done while the app is a three-file skeleton; the App
   Router surface used here is identical apart from async route `params`.
2. `apps/api` **stays on NestJS 10** (honoring the §2.1 pin) with a scoped
   root-level npm override forcing `multer@^2.2.0` under
   `@nestjs/platform-express`. Nothing uses file uploads yet; revisit the
   override when NestJS 11 is evaluated in a future ADR.
3. Test tooling (vitest, coverage) tracks current majors — it is not
   spec-pinned.
4. The CI audit gate stays exactly as §9.7 specifies, with no allowlist or
   `continue-on-error`. New high/critical advisories fail CI.

**Amendments (Phase 2)**: the same policy later forced `astro` 5→7 and
`nodemailer` 6→9 (highs fixed only across majors; both API-compatible for
our usage, verified by the acceptance suites) plus a root override
`lodash@^4.18.1` under `@nestjs/swagger@7`. Also noted: with Next 15/React
19 the framework's shared first-load baseline is ~102 kB gzipped, so the
verify page lands at 104 kB against the §2.2 "<100 kB" budget while
shipping <2 kB of app code; Lighthouse mobile performance is 97. Treat the
budget as "app JS ≈ 0" until the framework baseline shrinks.

## ADR-006: RLS enforcement model — app role + per-transaction tenant context

**Status**: accepted (Phase 1)

**Context**: §1.7/§4 mandate RLS on `tenant_id` as the second isolation
layer, and §1.10/§9.9 mandate DB-enforced append-only `scan_events` /
`audit_logs`. RLS does not bind to the table owner, and the public verify
path must resolve a serial across tenants.

**Decision** (`prisma/migrations/*_rls_and_roles`):
- The application connects as **`veazen_app`** — not the table owner, no DDL,
  and `REVOKE UPDATE, DELETE` on `scan_events`, `audit_logs`, `scan_digests`.
  Migrations/seeds run as the owner role.
- Every query runs inside a transaction that sets `app.tenant_id` via
  `set_config(..., true)`: a tenant uuid (`PrismaService.withTenant`) or the
  sentinel `'__system__'` (`PrismaService.asSystem` — verify lookups, queue
  workers, digests). A connection that sets nothing sees zero tenant rows,
  so forgetting the wrapper fails loud, not open.
- Policies: `tenant_id::text = current_setting('app.tenant_id', true) OR
  current_setting('app.tenant_id', true) = '__system__'`.
- Hot-path budget: the public verify endpoint uses exactly two transactions
  (read, write). Verified locally ≥500 rps / p99 <150 ms (§1.8) via
  `apps/api/scripts/bench-verify.mjs`.
- Additive enum value `alert_rule.webhook_failure` backs the §4 requirement
  that auto-disabling a webhook endpoint raises an alert (the §4 enum had no
  fitting rule).
- `scan_events` monthly partitioning and `codes` HASH partitioning stay
  reserved (schema comments); MVP uses single tables + indexes per §2.1.

## ADR-007: Scratch-code hashes are peppered HMAC-SHA256, not argon2id

**Status**: accepted (Phase 1)

**Context**: §2.4 says scratch hashes are argon2id, but §8 Phase 1 requires
generating 100k codes in <60s. Memory-hard hashing per code (≈20–50 ms each)
makes that physically impossible (~1 hour per 100k batch).

**Decision**: scratch codes are 60-bit CSPRNG secrets, not low-entropy
passwords, so `packages/crypto/scratch-pepper.ts` hashes them with
HMAC-SHA256 under a MASTER_KEY-derived pepper that never touches the
database. A database leak alone therefore yields nothing brute-forceable —
the same property argon2id was buying — while generation stays >10k codes/s.
argon2id remains in use for user passwords (and `scratch.ts` keeps the
argon2id implementation available should per-code cost ever be preferred
over batch speed).

## ADR-008: Storage behind an S3-shaped interface; local driver until Phase 4

**Status**: accepted (Phase 1)

`StorageService` exposes put/get + HMAC-signed expiring download paths
(`/api/v1/files/:token`). Dev/test/this environment use a local-directory
driver (`STORAGE_DIR`, default `.storage`); the S3/R2 driver replaces the
internals in Phase 4 deployment work without changing call sites. Export
CSVs (the only place scratch plaintext ever exists, §9.2) are written by the
generation worker straight to storage — never to the database.
