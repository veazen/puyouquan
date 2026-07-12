import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import type { JwtPayload } from './auth.service';
import { AuthService } from './auth.service';

/**
 * Tenant API authentication accepting either credential type (§5.2 + §6):
 * - `Bearer vz_...`  — machine API key (plugin, integrations)
 * - `Bearer <jwt>`   — dashboard user access token
 * Both resolve to request.tenant; JWTs additionally set request.user so the
 * audit interceptor records the acting human.
 */
@Injectable()
export class TenantAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & {
        tenant?: { tenantId: string; apiKeyId: string | null };
        user?: { userId: string; tenantId: string; role: string };
      }
    >();
    const header = request.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();

    if (token.startsWith('vz_')) {
      const resolved = await this.auth.resolveApiKey(token);
      if (!resolved) {
        throw new UnauthorizedException('invalid API key');
      }
      request.tenant = resolved;
      return true;
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('invalid or expired token');
    }
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('not an access token');
    }
    request.user = { userId: payload.sub, tenantId: payload.ten, role: payload.role };
    request.tenant = { tenantId: payload.ten, apiKeyId: null };
    return true;
  }
}
