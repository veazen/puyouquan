import { ExecutionContext, createParamDecorator } from '@nestjs/common';

/** Tenant id resolved by ApiKeyGuard (request.tenant) or JwtAuthGuard (request.user). */
export const TenantId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const request = context
    .switchToHttp()
    .getRequest<{ tenant?: { tenantId: string }; user?: { tenantId: string } }>();
  const tenantId = request.tenant?.tenantId ?? request.user?.tenantId;
  if (!tenantId) {
    throw new Error('TenantId decorator used on an unguarded route');
  }
  return tenantId;
});
