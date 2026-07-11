import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import type { JwtPayload } from './auth.service';

export interface UserContext {
  userId: string;
  tenantId: string;
  role: string;
}

/** Dashboard-user authentication: Bearer access JWT (§2.1). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: UserContext }>();
    const header = request.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing bearer token');
    }
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(header.slice('Bearer '.length).trim());
    } catch {
      throw new UnauthorizedException('invalid or expired token');
    }
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('not an access token');
    }
    request.user = { userId: payload.sub, tenantId: payload.ten, role: payload.role };
    return true;
  }
}
