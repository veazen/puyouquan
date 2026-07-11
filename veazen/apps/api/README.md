# @veazen/api

NestJS 10 cloud backend for the Veazen anti-counterfeit & traceability platform
(spec: `PROJECT_PLAN.md` §2.1, §5, §11). All code generation, signing,
verification and risk logic lives here — the WordPress plugin is only a client.

## Status: Phase 0 (skeleton)

Compiling, tested skeleton only: app bootstrap with global prefix `api/v1` and a
`GET /api/v1/health` endpoint. Prisma, Redis, BullMQ, auth and the domain
modules (§5) arrive in Phase 1.

## Run

```bash
npm install            # from the monorepo root
npm run start:dev -w @veazen/api   # serves http://localhost:4000/api/v1/health
```

`PORT` overrides the default `4000`. See `.env.example` for the full
environment variable list (not consumed yet in Phase 0).

## Checks

```bash
npm run test -w @veazen/api        # jest: unit + supertest e2e
npm run lint -w @veazen/api
npm run typecheck -w @veazen/api
npm run build -w @veazen/api       # emits dist/
```
