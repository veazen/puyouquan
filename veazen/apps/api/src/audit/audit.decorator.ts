import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION = 'veazen:audit-action';

/** Marks a mutating handler for automatic audit logging (§4 audit_logs). */
export const Audit = (action: string) => SetMetadata(AUDIT_ACTION, action);
