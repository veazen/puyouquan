import type { UserRole } from '@veazen/shared';

/**
 * E1 permission matrix (PD-004) — the single constant module the RolesGuard
 * consumes. Applies to *dashboard JWT users only*; machine API keys (the
 * WP plugin / integrations path) stay tenant-scoped and are not role-gated.
 *
 * | role      | scope                                                        |
 * |-----------|--------------------------------------------------------------|
 * | owner     | everything                                                   |
 * | admin     | everything except team management (invite / remove members) |
 * |           | and API key management (create / revoke)                     |
 * | viewer    | read-only: every GET, no mutations                           |
 * | warehouse | returns desk only: GET /codes/:serial, POST /codes/:serial/  |
 * |           | rma|release|relabel, GET /tenant/me — everything else 403    |
 *
 * Handlers pick one of the groups below via `@Roles(...GROUP)`. A handler
 * behind an auth guard *without* an annotation falls back to CONSOLE_WRITE
 * (owner/admin) — restricted roles fail closed.
 */

/** Read endpoints (GET) of the console — viewer's whole world. */
export const CONSOLE_READ = ['owner', 'admin', 'viewer'] as const satisfies readonly UserRole[];

/** Mutating console endpoints — and the fail-closed default. */
export const CONSOLE_WRITE = ['owner', 'admin'] as const satisfies readonly UserRole[];

/** Team management + API key management (E1: explicitly not for admins). */
export const OWNER_ONLY = ['owner'] as const satisfies readonly UserRole[];

/** Returns-desk lookups: code check page + /tenant/me bootstrap. */
export const RETURNS_READ = [
  'owner',
  'admin',
  'viewer',
  'warehouse',
] as const satisfies readonly UserRole[];

/** Returns-desk actions: rma / release / relabel. */
export const RETURNS_WRITE = ['owner', 'admin', 'warehouse'] as const satisfies readonly UserRole[];
