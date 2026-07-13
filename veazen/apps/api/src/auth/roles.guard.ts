import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { UserRole } from '@veazen/shared';

import { CONSOLE_WRITE } from './permissions';
import { ROLES_KEY } from './roles.decorator';

/**
 * E1 role enforcement (PD-004): runs after TenantAuthGuard / JwtAuthGuard and
 * checks the JWT role claim against the handler's `@Roles(...)` annotation
 * (see ./permissions for the matrix). Two deliberate rules:
 * - API-key requests carry no user → pass. Machine keys (WP plugin,
 *   integrations) keep their existing tenant-wide access unchanged.
 * - A missing annotation falls back to CONSOLE_WRITE (owner/admin), so a
 *   forgotten `@Roles` fails closed for viewer/warehouse instead of open.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { role: string } }>();
    if (!request.user) {
      return true; // API-key path (no human actor) — not role-gated
    }
    const allowed =
      this.reflector.getAllAndOverride<readonly UserRole[] | undefined>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? CONSOLE_WRITE;
    if (!allowed.includes(request.user.role as UserRole)) {
      throw new ForbiddenException(
        `your role (${request.user.role}) has no access to this operation`,
      );
    }
    return true;
  }
}
