import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';

export interface TenantContext {
  tenantId: string;
  apiKeyId: string;
}

/** Tenant API authentication: `Authorization: Bearer vz_...` (§5.2). */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { tenant?: TenantContext }>();
    const header = request.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing bearer token');
    }
    const resolved = await this.auth.resolveApiKey(header.slice('Bearer '.length).trim());
    if (!resolved) {
      throw new UnauthorizedException('invalid API key');
    }
    request.tenant = resolved;
    return true;
  }
}
