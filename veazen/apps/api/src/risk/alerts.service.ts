import { Injectable } from '@nestjs/common';
import type { AlertRule, AlertSeverity } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { WebhookDispatcher } from '../webhooks/webhook.dispatcher';

export interface RaiseAlertInput {
  rule: AlertRule;
  severity: AlertSeverity;
  codeId?: string;
  batchId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Alert fan-out (§5.4): alerts row + owner email (NotificationService) +
 * `alert.created` webhook event.
 */
@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly webhooks: WebhookDispatcher,
  ) {}

  async raise(tenantId: string, input: RaiseAlertInput) {
    const alert = await this.prisma.withTenant(tenantId, (tx) =>
      tx.alert.create({
        data: {
          tenantId,
          rule: input.rule,
          severity: input.severity,
          codeId: input.codeId ?? null,
          batchId: input.batchId ?? null,
          payload: (input.payload ?? {}) as object,
        },
      }),
    );

    const owner = await this.prisma.withTenant(tenantId, (tx) =>
      tx.user.findFirst({ where: { role: 'owner' }, select: { email: true } }),
    );
    if (owner) {
      // enrich the email with the human-readable serial when available
      const code = input.codeId
        ? await this.prisma.withTenant(tenantId, (tx) =>
            tx.code.findUnique({ where: { id: input.codeId }, select: { serial: true } }),
          )
        : null;
      await this.notifications.sendAlertEmail(owner.email, {
        rule: input.rule,
        severity: input.severity,
        payload: input.payload ?? {},
        serial: code?.serial ?? null,
      });
    }

    await this.webhooks.dispatch(tenantId, 'alert.created', {
      alert_id: alert.id,
      rule: alert.rule,
      severity: alert.severity,
      code_id: alert.codeId,
      batch_id: alert.batchId,
      payload: alert.payload,
    });

    return alert;
  }
}
