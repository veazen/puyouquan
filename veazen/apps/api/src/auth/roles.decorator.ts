import { SetMetadata } from '@nestjs/common';

import type { UserRole } from '@veazen/shared';

export const ROLES_KEY = 'veazen:roles';

/**
 * Restricts a handler (or a whole controller) to the given console roles —
 * pass one of the groups from ./permissions, e.g. `@Roles(...CONSOLE_READ)`.
 * Enforced by RolesGuard against the JWT role claim; API-key requests are
 * exempt by design (machine keys are tenant-scoped, not role-scoped).
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
