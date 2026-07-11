import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';
import { AUDIT_ACTION } from './audit.decorator';

type AuditableRequest = Request & {
  tenant?: { tenantId: string; apiKeyId: string };
  user?: { userId: string; tenantId: string };
};

/**
 * Global interceptor: any handler tagged with @Audit(action) gets an
 * audit_logs row on success (append-only table, ADR-006). Logging failures
 * never fail the request — they are logged and swallowed.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string | undefined>(AUDIT_ACTION, context.getHandler());
    if (!action) {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<AuditableRequest>();
    const tenantId = request.tenant?.tenantId ?? request.user?.tenantId;
    if (!tenantId) {
      return next.handle();
    }
    return next.handle().pipe(
      tap((result) => {
        const resultId =
          result && typeof result === 'object' && 'id' in result
            ? String((result as { id: unknown }).id)
            : undefined;
        void this.prisma
          .withTenant(tenantId, (tx) =>
            tx.auditLog.create({
              data: {
                tenantId,
                actorUserId: request.user?.userId ?? null,
                actorApiKeyId: request.tenant?.apiKeyId ?? null,
                action,
                target: {
                  path: request.path,
                  params: request.params as object,
                  ...(resultId ? { resultId } : {}),
                },
                ip: request.ip ?? null,
              },
            }),
          )
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error('audit log write failed', action, error);
          });
      }),
    );
  }
}
