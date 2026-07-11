# @veazen/web

Next.js 14 (App Router) app for the two consumer/tenant-facing surfaces of Veazen
(PROJECT_PLAN §2.2, §6):

- **Consumer verify pages** — `/v/[serial]` (and later the GS1 Digital Link path).
  SSR, mobile-first, tenant-branded, < 100KB first-load JS.
- **Tenant dashboard** — `/dashboard` route group (Overview, Products, Batches,
  Alerts, Settings).

## Status: Phase 0 skeleton

Only a compiling skeleton exists right now:

- Branded landing placeholder at `/`.
- Placeholder verify route at `/v/[serial]` (renders the serial, no data fetching).
- `lib/serial-display.ts` — UI-local copy of the serial display-grouping helper
  (canonical implementation lives in `@veazen/crypto`; the copy is Phase 0 only).

The real verify page and dashboard are Phase 2 work.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run test` — vitest unit tests (`lib/**/*.test.ts`)
- `npm run lint` — `next lint` (extends `next/core-web-vitals`)
- `npm run typecheck` — `tsc --noEmit`

## Constraints

- No `next/font/google` or any remote asset — builds must work fully offline.
- Tailwind CSS 3.4 for styling; system font stack.
