import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { isValidSerial, normalizeInput, verifyScratchCodeHmac } from '@veazen/crypto';
import type { VerifyResponse } from '@veazen/shared';

import { CodeSigningService } from '../codes/code-signing.service';
import { EnvelopeService } from '../crypto/envelope.service';
import { PrismaService } from '../prisma/prisma.service';
import { RISK_QUEUE } from '../queues/queues.module';
import { WebhookDispatcher } from '../webhooks/webhook.dispatcher';
import type { ScanContext } from './scan-context.service';

type ScanResultValue =
  | 'ok'
  | 'already_verified'
  | 'invalid'
  | 'inactive'
  | 'flagged'
  | 'retired'
  | 'refurbished';

export interface RiskEvalJob {
  tenantId: string;
  codeId: string;
  batchId: string;
  kind: 'public_scan' | 'scratch_verify';
  result: ScanResultValue;
  country: string | null;
  /** current scan's device fingerprint — lite_duplicate_scan compares it
   *  against the first-scan lock's fingerprint (M2 risk rule) */
  deviceFp: string | null;
  duplicateScratch?: boolean;
}

/**
 * Public verification core (§5.1). public_scan never changes code status
 * (§5.3) — the only consumer-driven transition is scratch redemption
 * (active → verified). Every request writes an append-only scan_event and
 * enqueues async risk evaluation.
 *
 * Hot path budget (§1.8: p99 < 150ms, ≥500 rps/instance): exactly two
 * database transactions per request — one read (code + prior-scan count +
 * trace timeline), one write (scan_event + optional first-scan lock).
 */
@Injectable()
export class VerifyService {
  private readonly scratchPepper: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly signing: CodeSigningService,
    private readonly webhooks: WebhookDispatcher,
    @Inject(RISK_QUEUE) private readonly riskQueue: Queue<RiskEvalJob>,
    envelope: EnvelopeService,
  ) {
    this.scratchPepper = envelope.deriveKey('scratch-pepper');
  }

  async publicScan(
    serialRaw: string,
    sig: string | undefined,
    ctx: ScanContext,
  ): Promise<VerifyResponse> {
    const serial = normalizeInput(serialRaw);
    if (!isValidSerial(serial)) {
      return invalidResponse();
    }

    // transaction 1: all reads
    const read = await this.prisma.asSystem(async (tx) => {
      const code = await tx.code.findUnique({
        where: { serial },
        include: {
          product: { select: { name: true, images: true, gtin: true } },
          tenant: { select: { name: true, slug: true, settings: true } },
        },
      });
      if (!code) {
        return null;
      }
      const [priorScan, trace, verifiedHistory] = await Promise.all([
        // EXISTS, not COUNT — the hint only needs "was there a prior ok scan"
        tx.scanEvent.findFirst({
          where: { codeId: code.id, kind: 'public_scan', result: 'ok' },
          select: { id: true },
        }),
        tx.traceEvent.findMany({
          where: {
            tenantId: code.tenantId,
            OR: [
              { subject: 'batch', subjectId: code.batchId },
              { subject: 'code', subjectId: code.id },
            ],
          },
          orderBy: { occurredAt: 'asc' },
          take: 50,
        }),
        // M2 refurbished endorsement: verification history before the QC
        // resale = scratch redemption + every "already verified" view.
        // Post-refurbish scans book result=refurbished, so the count is stable.
        code.status === 'refurbished'
          ? tx.scanEvent.count({
              where: {
                codeId: code.id,
                OR: [{ kind: 'scratch_verify', result: 'ok' }, { result: 'already_verified' }],
              },
            })
          : Promise.resolve(null),
      ]);
      return { code, scannedBefore: priorScan !== null, trace, verifiedHistory };
    });
    if (!read) {
      // unattributable probe: no tenant to book the event under; the
      // cross-tenant invalid_serial_probe_source signal (Phase 4) covers this
      return invalidResponse();
    }
    const { code, scannedBefore, trace, verifiedHistory } = read;

    const sigOk =
      sig === undefined ||
      (await this.signing.verifySerialSig(code.tenantId, code.batchId, serial, sig));

    const mode = (code.tenant.settings as { mode?: string } | null)?.mode ?? 'standard';
    let result: VerifyResponse['result'];
    let scanResult: ScanResultValue;
    let lockFirstScan = false;
    if (!sigOk) {
      result = 'invalid';
      scanResult = 'invalid';
    } else {
      switch (code.status) {
        case 'inactive':
          result = 'inactive';
          scanResult = 'inactive';
          break;
        case 'flagged':
          result = 'flagged';
          scanResult = 'flagged';
          break;
        case 'voided':
          result = 'invalid';
          scanResult = 'invalid';
          break;
        case 'retired':
          // M2 relabel: neutral "recalled by the brand", not a warning
          result = 'retired';
          scanResult = 'retired';
          break;
        case 'refurbished':
          // M2 official refurbished: brand endorsement + history count
          result = 'refurbished';
          scanResult = 'refurbished';
          break;
        case 'verified':
          result = 'already_verified';
          scanResult = 'already_verified';
          break;
        case 'active':
        default:
          if (mode === 'lite' && code.firstVerifiedAt) {
            // §7.5 first-scan lock: later scans are "already verified"
            result = 'already_verified';
            scanResult = 'already_verified';
          } else {
            result = 'authentic';
            scanResult = 'ok';
            lockFirstScan = mode === 'lite';
          }
          break;
      }
    }

    // transaction 2: all writes
    const now = new Date();
    await this.prisma.asSystem(async (tx) => {
      await tx.scanEvent.create({
        data: {
          tenantId: code.tenantId,
          codeId: code.id,
          kind: 'public_scan',
          result: scanResult,
          ip: ctx.ip,
          geo: ctx.geo ?? undefined,
          deviceFp: ctx.deviceFp,
          userAgent: ctx.userAgent,
          locale: ctx.locale,
        },
      });
      if (lockFirstScan) {
        await tx.code.update({ where: { id: code.id }, data: { firstVerifiedAt: now } });
      }
    });
    if (lockFirstScan) {
      code.firstVerifiedAt = now;
    }

    if (sigOk) {
      await this.riskQueue.add('scan', {
        tenantId: code.tenantId,
        codeId: code.id,
        batchId: code.batchId,
        kind: 'public_scan',
        result: scanResult,
        country: ctx.geo?.country ?? null,
        deviceFp: ctx.deviceFp,
      });
    }
    if (!sigOk) {
      return invalidResponse();
    }

    return {
      result,
      ...(code.status === 'flagged' && code.flagReason ? { flag_reason: code.flagReason } : {}),
      ...(result === 'refurbished' ? { verified_history_count: verifiedHistory ?? 0 } : {}),
      product: {
        name: code.product.name,
        images: (code.product.images as string[] | null) ?? [],
        brand: { name: code.tenant.name, slug: code.tenant.slug },
      },
      trace: trace.map((t) => ({
        step: t.eventType,
        location: formatLocation(t.location as { name?: string; country?: string } | null),
        date: t.occurredAt.toISOString(),
      })),
      first_verified_at: code.firstVerifiedAt?.toISOString() ?? null,
      scan_count_hint: scannedBefore ? 'scanned_before' : 'first_scan',
      verify_page_config: (code.tenant.settings as Record<string, unknown> | null) ?? {},
    };
  }

  /** Scratch redemption: the single consumer-driven state change (§5.3). */
  async redeemScratch(
    serialRaw: string,
    scratchRaw: string,
    ctx: ScanContext,
  ): Promise<{ result: string; first_verified_at?: string | null; first_country?: string | null }> {
    const serial = normalizeInput(serialRaw);
    const scratch = normalizeInput(scratchRaw);
    if (!isValidSerial(serial)) {
      return { result: 'invalid' };
    }
    const read = await this.prisma.asSystem(async (tx) => {
      const code = await tx.code.findUnique({ where: { serial } });
      if (!code) {
        return null;
      }
      const firstOkScan =
        code.status === 'verified'
          ? await tx.scanEvent.findFirst({
              where: { codeId: code.id, kind: 'scratch_verify', result: 'ok' },
              orderBy: { createdAt: 'asc' },
            })
          : null;
      return { code, firstOkScan };
    });
    if (!read) {
      return { result: 'invalid' };
    }
    const { code, firstOkScan } = read;

    // M2: a retired label reads "recalled", a refurbished one keeps its
    // endorsement — no scratch semantics on either (before the scratchHash
    // check so relabelled Lite codes answer consistently too)
    if (code.status === 'retired' || code.status === 'refurbished') {
      await this.recordScan(code, 'scratch_verify', code.status, ctx);
      return { result: code.status };
    }

    if (!code.scratchHash) {
      return { result: 'invalid' };
    }
    const scratchHash = code.scratchHash;

    if (code.status === 'verified') {
      // duplicate redemption attempt → §5.4 rule 1 (critical alert)
      await this.recordScan(code, 'scratch_verify', 'already_verified', ctx);
      await this.riskQueue.add('scan', {
        tenantId: code.tenantId,
        codeId: code.id,
        batchId: code.batchId,
        kind: 'scratch_verify',
        result: 'already_verified',
        country: ctx.geo?.country ?? null,
        deviceFp: ctx.deviceFp,
        duplicateScratch: true,
      });
      await this.webhooks.dispatch(code.tenantId, 'code.duplicate_attempt', {
        serial: code.serial,
        first_redeemed_at: code.scratchRedeemedAt?.toISOString() ?? null,
      });
      return {
        result: 'already_verified',
        first_verified_at: code.scratchRedeemedAt?.toISOString() ?? null,
        // country-level only (§5.1)
        first_country: (firstOkScan?.geo as { country?: string } | null)?.country ?? null,
      };
    }

    if (code.status !== 'active') {
      const mapped: ScanResultValue =
        code.status === 'inactive' ? 'inactive' : code.status === 'flagged' ? 'flagged' : 'invalid';
      await this.recordScan(code, 'scratch_verify', mapped, ctx);
      return { result: mapped };
    }

    if (!verifyScratchCodeHmac(scratch, scratchHash, this.scratchPepper)) {
      await this.recordScan(code, 'scratch_verify', 'invalid', ctx);
      return { result: 'invalid' };
    }

    const now = new Date();
    await this.prisma.asSystem(async (tx) => {
      await tx.code.update({
        where: { id: code.id },
        data: {
          status: 'verified',
          scratchRedeemedAt: now,
          firstVerifiedAt: code.firstVerifiedAt ?? now,
        },
      });
      await tx.scanEvent.create({
        data: {
          tenantId: code.tenantId,
          codeId: code.id,
          kind: 'scratch_verify',
          result: 'ok',
          ip: ctx.ip,
          geo: ctx.geo ?? undefined,
          deviceFp: ctx.deviceFp,
          userAgent: ctx.userAgent,
          locale: ctx.locale,
        },
      });
    });
    await this.webhooks.dispatch(code.tenantId, 'code.verified', {
      serial: code.serial,
      redeemed_at: now.toISOString(),
    });
    return { result: 'verified', first_verified_at: now.toISOString() };
  }

  private async recordScan(
    code: { id: string; tenantId: string },
    kind: 'public_scan' | 'scratch_verify',
    result: ScanResultValue,
    ctx: ScanContext,
  ): Promise<void> {
    await this.prisma.asSystem((tx) =>
      tx.scanEvent.create({
        data: {
          tenantId: code.tenantId,
          codeId: code.id,
          kind,
          result,
          ip: ctx.ip,
          geo: ctx.geo ?? undefined,
          deviceFp: ctx.deviceFp,
          userAgent: ctx.userAgent,
          locale: ctx.locale,
        },
      }),
    );
  }
}

function invalidResponse(): VerifyResponse {
  return {
    result: 'invalid',
    product: null,
    trace: [],
    first_verified_at: null,
    scan_count_hint: 'first_scan',
    verify_page_config: {},
  };
}

function formatLocation(location: { name?: string; country?: string } | null): string | null {
  if (!location) {
    return null;
  }
  return [location.name, location.country].filter(Boolean).join(', ') || null;
}
