import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { tryQueueAdd } from '../queues/queue-add';
import { WEBHOOK_QUEUE } from '../queues/queues.module';

export interface WebhookJob {
  deliveryId: string;
  tenantId: string;
  endpointId: string;
}

/** §4 webhook_deliveries: exponential backoff 1m/5m/30m/2h/12h, 5 attempts. */
export const WEBHOOK_BACKOFF_MS = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];

/**
 * Fans an event out to every active endpoint subscribed to its type; each
 * delivery gets a row (30-day retention) and a BullMQ job. Failures are
 * handled by the worker (retry schedule, auto-disable at 20 consecutive).
 */
@Injectable()
export class WebhookDispatcher {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WEBHOOK_QUEUE) private readonly queue: Queue<WebhookJob>,
  ) {}

  async dispatch(tenantId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const endpoints = await this.prisma.withTenant(tenantId, (tx) =>
      tx.webhookEndpoint.findMany({
        where: { active: true, events: { has: eventType } },
        select: { id: true },
      }),
    );
    if (endpoints.length === 0) {
      return;
    }
    const body = { event: eventType, created_at: new Date().toISOString(), data: payload };
    for (const endpoint of endpoints) {
      const delivery = await this.prisma.withTenant(tenantId, (tx) =>
        tx.webhookDelivery.create({
          data: {
            tenantId,
            endpointId: endpoint.id,
            eventType,
            payload: body as unknown as Prisma.InputJsonValue,
          },
        }),
      );
      // best-effort: the delivery row is the durable record; if Redis is
      // down the offline-queued command still delivers on reconnect
      await tryQueueAdd(
        this.queue,
        'deliver',
        { deliveryId: delivery.id, tenantId, endpointId: endpoint.id },
        { removeOnComplete: 1000, removeOnFail: 1000 },
      );
    }
  }
}
