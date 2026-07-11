import { createHmac } from 'node:crypto';

import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { EnvelopeService } from '../crypto/envelope.service';
import { PrismaService } from '../prisma/prisma.service';
import { BULLMQ_CONNECTION, WEBHOOK_QUEUE } from '../queues/queues.module';
import { AlertsService } from '../risk/alerts.service';
import { WEBHOOK_BACKOFF_MS, WebhookJob } from './webhook.dispatcher';

const MAX_ATTEMPTS = 5;
const AUTO_DISABLE_AFTER = 20;

/**
 * Webhook delivery worker (§4): POST with
 *   X-Veazen-Signature: HMAC-SHA256(secret, timestamp + body)
 *   X-Veazen-Timestamp: unix ms (anti-replay)
 * Retries on the 1m/5m/30m/2h/12h schedule (overridable for tests via
 * VEAZEN_WEBHOOK_BACKOFF_MS); 20 consecutive failures auto-disable the
 * endpoint and raise a webhook_failure alert.
 */
@Injectable()
export class WebhookWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(WebhookWorker.name);
  private worker: Worker<WebhookJob> | null = null;
  private readonly backoff: number[];

  constructor(
    @Inject(BULLMQ_CONNECTION) private readonly connection: Redis,
    @Inject(WEBHOOK_QUEUE) private readonly queue: Queue<WebhookJob>,
    private readonly prisma: PrismaService,
    private readonly envelope: EnvelopeService,
    private readonly alerts: AlertsService,
  ) {
    const override = process.env.VEAZEN_WEBHOOK_BACKOFF_MS;
    this.backoff = override ? override.split(',').map(Number) : WEBHOOK_BACKOFF_MS;
  }

  onModuleInit(): void {
    this.worker = new Worker<WebhookJob>('webhook-delivery', async (job) => this.deliver(job.data), {
      connection: this.connection,
      concurrency: 4,
    });
    this.worker.on('failed', (job, error) =>
      this.logger.warn(`webhook job ${job?.id} errored: ${error.message}`),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }

  async deliver(job: WebhookJob): Promise<void> {
    const { delivery, endpoint } = await this.prisma.withTenant(job.tenantId, async (tx) => ({
      delivery: await tx.webhookDelivery.findUnique({ where: { id: job.deliveryId } }),
      endpoint: await tx.webhookEndpoint.findUnique({ where: { id: job.endpointId } }),
    }));
    if (!delivery || !endpoint || delivery.deliveredAt || !endpoint.active) {
      return;
    }

    const body = JSON.stringify(delivery.payload);
    const timestamp = Date.now().toString();
    const secret = this.envelope.decrypt(endpoint.encryptedSecret);
    const signature = createHmac('sha256', secret).update(timestamp + body).digest('hex');

    let status: number | null = null;
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-veazen-signature': signature,
          'x-veazen-timestamp': timestamp,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      status = response.status;
    } catch {
      status = null;
    }

    const attempts = delivery.attempts + 1;
    const succeeded = status !== null && status >= 200 && status < 300;

    let disabled = false;
    await this.prisma.withTenant(job.tenantId, async (tx) => {
      await tx.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts,
          responseStatus: status,
          deliveredAt: succeeded ? new Date() : null,
        },
      });
      if (succeeded) {
        await tx.webhookEndpoint.update({ where: { id: endpoint.id }, data: { failureCount: 0 } });
        return;
      }
      const failureCount = endpoint.failureCount + 1;
      disabled = failureCount >= AUTO_DISABLE_AFTER;
      await tx.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: { failureCount, ...(disabled ? { active: false } : {}) },
      });
    });

    if (disabled) {
      await this.alerts.raise(job.tenantId, {
        rule: 'webhook_failure',
        severity: 'warning',
        payload: {
          endpoint_id: endpoint.id,
          url: endpoint.url,
          failure_count: endpoint.failureCount + 1,
        },
      });
    }

    if (!succeeded && attempts < MAX_ATTEMPTS) {
      const delay = this.backoff[attempts - 1] ?? this.backoff[this.backoff.length - 1] ?? 60_000;
      await this.queue.add('deliver', job, { delay, removeOnComplete: 1000, removeOnFail: 1000 });
    }
  }
}
