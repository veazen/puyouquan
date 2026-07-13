import { createHash } from 'node:crypto';

import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { merkleLeafHash, merkleRootHex } from '@veazen/crypto';

import { PrismaService } from '../prisma/prisma.service';
import { BULLMQ_CONNECTION, DIGEST_QUEUE } from '../queues/queues.module';

/**
 * Evidence-grade daily digest (§1.10): at 00:10 UTC, Merkle-root the previous
 * day's scan_events and chain it to the prior digest. scan_events and
 * scan_digests are append-only for the app role (ADR-006), so the chain
 * proves the history was not rewritten.
 */
@Injectable()
export class DigestService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DigestService.name);
  private worker: Worker | null = null;

  constructor(
    @Inject(BULLMQ_CONNECTION) private readonly connection: Redis,
    @Inject(DIGEST_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      'scan-digest',
      async () => {
        const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
        await this.computeDaily(yesterday);
      },
      { connection: this.connection },
    );
    // §4 scan_digests: daily at 00:10 UTC. Deliberately NOT awaited — with
    // Redis unreachable this command sits in ioredis' offline queue and an
    // await would block Nest bootstrap before app.listen() (2026-07-13
    // incident). It completes as soon as the connection comes up.
    void this.queue
      .upsertJobScheduler('daily-digest', { pattern: '10 0 * * *', tz: 'UTC' })
      .catch((error: Error) =>
        this.logger.warn(`digest scheduler registration failed: ${error.message}`),
      );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }

  /** Compute (idempotently) the digest for the UTC day containing `date`. */
  async computeDaily(date: Date): Promise<{ merkleRoot: string; eventCount: number }> {
    const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

    const existing = await this.prisma.asSystem((tx) =>
      tx.scanDigest.findUnique({ where: { date: dayStart } }),
    );
    if (existing) {
      return { merkleRoot: existing.merkleRoot, eventCount: Number(existing.eventCount) };
    }

    const events = await this.prisma.asSystem((tx) =>
      tx.scanEvent.findMany({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          tenantId: true,
          codeId: true,
          kind: true,
          result: true,
          deviceFp: true,
          createdAt: true,
        },
      }),
    );
    const leaves = events.map((event) =>
      merkleLeafHash(
        JSON.stringify({
          id: event.id.toString(),
          tenant_id: event.tenantId,
          code_id: event.codeId,
          kind: event.kind,
          result: event.result,
          device_fp: event.deviceFp,
          created_at: event.createdAt.toISOString(),
        }),
      ),
    );
    const merkleRoot = merkleRootHex(leaves);

    const previous = await this.prisma.asSystem((tx) =>
      tx.scanDigest.findFirst({ where: { date: { lt: dayStart } }, orderBy: { date: 'desc' } }),
    );
    const prevDigestHash = previous
      ? createHash('sha256')
          .update(
            `${previous.date.toISOString()}|${previous.merkleRoot}|${previous.eventCount}|${previous.prevDigestHash ?? ''}`,
          )
          .digest('hex')
      : null;

    await this.prisma.asSystem((tx) =>
      tx.scanDigest.create({
        data: { date: dayStart, eventCount: BigInt(events.length), merkleRoot, prevDigestHash },
      }),
    );
    this.logger.log(`scan digest ${dayStart.toISOString().slice(0, 10)}: ${events.length} events`);
    return { merkleRoot, eventCount: events.length };
  }
}
