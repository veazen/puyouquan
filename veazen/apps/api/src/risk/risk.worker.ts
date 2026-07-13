import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { PrismaService } from '../prisma/prisma.service';
import { BULLMQ_CONNECTION } from '../queues/queues.module';
import type { RiskEvalJob } from '../verify/verify.service';
import { AlertsService } from './alerts.service';
import { countryDistanceKm } from './geo-distance';

const GEO_VELOCITY_KM = 2000;
const GEO_VELOCITY_WINDOW_H = 24;
const OUT_OF_MARKET_WINDOW_D = 7;
const OUT_OF_MARKET_MIN_SAMPLES = 10;
const OUT_OF_MARKET_RATIO = 0.2;
const LITE_DUP_SCAN_WINDOW_H = 24;

/**
 * Risk rule engine (§5.4 + SME suite M2), consuming scan events off the
 * risk-eval queue:
 *  1. duplicate_scratch — second redemption attempt → critical
 *  2. geo_velocity — 2 countries > 2000 km apart within 24h → warning;
 *     an RMA `returned` trace event resets the comparison baseline (the next
 *     buyer may legitimately be far away — PD-002 risk linkage)
 *  3. out_of_market — >20% of a batch's 7-day scans (n≥10) outside
 *     intended_market → warning
 *  4. lite_duplicate_scan — a first-scan-locked scratch-less code rescanned
 *     from a *different* device fingerprint → warning, ≤1 alert per code per
 *     24h (same-device re-views are normal buyer behavior and stay silent)
 * Rule cross_tenant_signal is scaffolded in the schema; enabled Phase 4.
 */
@Injectable()
export class RiskWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RiskWorker.name);
  private worker: Worker<RiskEvalJob> | null = null;

  constructor(
    @Inject(BULLMQ_CONNECTION) private readonly connection: Redis,
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<RiskEvalJob>('risk-eval', async (job) => this.evaluate(job.data), {
      connection: this.connection,
      concurrency: 4,
    });
    this.worker.on('failed', (job, error) =>
      this.logger.warn(`risk job ${job?.id} errored: ${error.message}`),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }

  async evaluate(job: RiskEvalJob): Promise<void> {
    if (job.duplicateScratch) {
      await this.alerts.raise(job.tenantId, {
        rule: 'duplicate_scratch',
        severity: 'critical',
        codeId: job.codeId,
        batchId: job.batchId,
        payload: { country: job.country },
      });
    }
    if (job.kind === 'public_scan' && job.result === 'already_verified') {
      await this.checkLiteDuplicateScan(job);
    }
    if (job.kind === 'public_scan' && job.country) {
      await this.checkGeoVelocity(job);
      await this.checkOutOfMarket(job);
    }
  }

  /** SME suite M2: locked Lite code rescanned from another device. */
  private async checkLiteDuplicateScan(job: RiskEvalJob): Promise<void> {
    if (!job.deviceFp) {
      return;
    }
    const code = await this.prisma.asSystem((tx) =>
      tx.code.findUnique({
        where: { id: job.codeId },
        select: { scratchHash: true, serial: true },
      }),
    );
    // scratch codes have their own critical duplicate_scratch rule
    if (!code || code.scratchHash !== null) {
      return;
    }
    // the locking scan = latest ok public scan (a release starts a new lock);
    // same-fingerprint re-views are the buyer checking again — no alert
    const lockScan = await this.prisma.asSystem((tx) =>
      tx.scanEvent.findFirst({
        where: { codeId: job.codeId, kind: 'public_scan', result: 'ok' },
        orderBy: { createdAt: 'desc' },
        select: { deviceFp: true },
      }),
    );
    if (!lockScan?.deviceFp || lockScan.deviceFp === job.deviceFp) {
      return;
    }
    // noise control: at most one alert per code per 24h
    const since = new Date(Date.now() - LITE_DUP_SCAN_WINDOW_H * 3600 * 1000);
    const recent = await this.prisma.withTenant(job.tenantId, (tx) =>
      tx.alert.findFirst({
        where: { rule: 'lite_duplicate_scan', codeId: job.codeId, createdAt: { gte: since } },
      }),
    );
    if (recent) {
      return;
    }
    await this.alerts.raise(job.tenantId, {
      rule: 'lite_duplicate_scan',
      severity: 'warning',
      codeId: job.codeId,
      batchId: job.batchId,
      payload: { serial: code.serial, country: job.country },
    });
  }

  private async checkGeoVelocity(job: RiskEvalJob): Promise<void> {
    const since = new Date(Date.now() - GEO_VELOCITY_WINDOW_H * 3600 * 1000);
    // M2 RMA linkage: a `returned` trace event resets the geo baseline —
    // only scans after the latest registered return take part, so the next
    // buyer's distant first scan no longer trips a false positive
    const lastReturn = await this.prisma.asSystem((tx) =>
      tx.traceEvent.findFirst({
        where: { subject: 'code', subjectId: job.codeId, eventType: 'returned' },
        orderBy: { occurredAt: 'desc' },
        select: { occurredAt: true },
      }),
    );
    const floor = lastReturn && lastReturn.occurredAt > since ? lastReturn.occurredAt : since;
    const events = await this.prisma.asSystem((tx) =>
      tx.scanEvent.findMany({
        where: { codeId: job.codeId, kind: 'public_scan', createdAt: { gte: floor } },
        select: { geo: true },
      }),
    );
    const countries = new Set<string>();
    for (const event of events) {
      const country = (event.geo as { country?: string } | null)?.country;
      if (country) {
        countries.add(country);
      }
    }
    if (job.country) {
      countries.add(job.country);
    }
    for (const a of countries) {
      for (const b of countries) {
        const distance = a < b ? countryDistanceKm(a, b) : null;
        if (distance !== null && distance > GEO_VELOCITY_KM) {
          const open = await this.openAlertExists(job.tenantId, 'geo_velocity', job.codeId);
          if (!open) {
            await this.alerts.raise(job.tenantId, {
              rule: 'geo_velocity',
              severity: 'warning',
              codeId: job.codeId,
              batchId: job.batchId,
              payload: { countries: [a, b], distance_km: Math.round(distance) },
            });
          }
          return;
        }
      }
    }
  }

  private async checkOutOfMarket(job: RiskEvalJob): Promise<void> {
    const batch = await this.prisma.asSystem((tx) =>
      tx.batch.findUnique({ where: { id: job.batchId }, select: { intendedMarket: true } }),
    );
    if (!batch || batch.intendedMarket.length === 0) {
      return;
    }
    const since = new Date(Date.now() - OUT_OF_MARKET_WINDOW_D * 24 * 3600 * 1000);
    const events = await this.prisma.asSystem(async (tx) => {
      const codes = await tx.code.findMany({
        where: { batchId: job.batchId },
        select: { id: true },
      });
      return tx.scanEvent.findMany({
        where: {
          codeId: { in: codes.map((c) => c.id) },
          kind: 'public_scan',
          createdAt: { gte: since },
        },
        select: { geo: true },
      });
    });
    const withCountry = events
      .map((e) => (e.geo as { country?: string } | null)?.country)
      .filter((c): c is string => Boolean(c));
    if (withCountry.length < OUT_OF_MARKET_MIN_SAMPLES) {
      return;
    }
    const market = new Set(batch.intendedMarket.map((c) => c.toUpperCase()));
    const outside = withCountry.filter((c) => !market.has(c.toUpperCase())).length;
    const ratio = outside / withCountry.length;
    if (ratio > OUT_OF_MARKET_RATIO) {
      const open = await this.openAlertExists(job.tenantId, 'out_of_market', undefined, job.batchId);
      if (!open) {
        await this.alerts.raise(job.tenantId, {
          rule: 'out_of_market',
          severity: 'warning',
          batchId: job.batchId,
          payload: {
            samples: withCountry.length,
            outside,
            ratio: Number(ratio.toFixed(3)),
            intended_market: batch.intendedMarket,
          },
        });
      }
    }
  }

  private async openAlertExists(
    tenantId: string,
    rule: 'geo_velocity' | 'out_of_market',
    codeId?: string,
    batchId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.withTenant(tenantId, (tx) =>
      tx.alert.findFirst({
        where: {
          rule,
          acknowledgedAt: null,
          ...(codeId ? { codeId } : {}),
          ...(batchId ? { batchId } : {}),
        },
      }),
    );
    return existing !== null;
  }
}
