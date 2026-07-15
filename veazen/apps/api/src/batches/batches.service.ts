import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { normalizeInput } from '@veazen/crypto';

import { PlanGateService } from '../billing/plan-gate.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { GenerationWorker, exportKey } from './generation.worker';

@Injectable()
export class BatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generation: GenerationWorker,
    private readonly storage: StorageService,
    private readonly planGate: PlanGateService,
  ) {}

  async create(
    tenantId: string,
    input: {
      productId: string;
      quantity: number;
      intendedMarket: string[];
      autoActivate?: boolean;
      kind: 'bulk' | 'on_demand';
      // B1 (S1 supplements pack): optional regulatory batch identity,
      // date strings are validated YYYY-MM-DD at the DTO
      lotCode?: string;
      mfgDate?: string;
      expiryDate?: string;
    },
  ) {
    if (input.mfgDate && input.expiryDate && input.expiryDate < input.mfgDate) {
      // lexicographic compare is exact for YYYY-MM-DD
      throw new BadRequestException('expiry_date must be on or after mfg_date');
    }
    // P1 plan gates (no-op unless BILLING_ENFORCEMENT=on): scratch capability
    // for standard batches + the monthly generated-codes quota
    await this.planGate.checkBatchCreate(tenantId, {
      quantity: input.quantity,
      kind: input.kind,
    });
    const batch = await this.prisma.withTenant(tenantId, async (tx) => {
      const product = await tx.product.findFirst({ where: { id: input.productId } });
      if (!product) {
        throw new NotFoundException('product not found');
      }
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      const mode = (tenant?.settings as { mode?: string } | null)?.mode ?? 'standard';
      // §7.5 mechanism 1: Lite defaults to generate-and-activate
      const autoActivate = input.autoActivate ?? (mode === 'lite' || input.kind === 'on_demand');
      return tx.batch.create({
        data: {
          tenantId,
          productId: input.productId,
          quantity: input.quantity,
          intendedMarket: input.intendedMarket,
          autoActivate,
          kind: input.kind,
          lotCode: input.lotCode ?? null,
          mfgDate: input.mfgDate ? new Date(input.mfgDate) : null,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        },
      });
    });
    await this.generation.enqueue({ batchId: batch.id, tenantId });
    return batch;
  }

  list(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.batch.findMany({
        include: { product: { select: { name: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  }

  async getWithProgress(tenantId: string, batchId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const batch = await tx.batch.findFirst({ where: { id: batchId } });
      if (!batch) {
        return null;
      }
      const generatedCount = await tx.code.count({ where: { batchId } });
      return {
        ...batch,
        generatedCount,
        progress: generatedCount / batch.quantity,
        // B1: signed short-lived download path for the uploaded COA PDF
        coaUrl: batch.coaKey ? this.storage.signedDownloadPath(batch.coaKey, 3600) : null,
      };
    });
  }

  /**
   * B1: store / replace the batch COA PDF. The storage key is deterministic
   * (one COA per batch), so a re-upload overwrites the previous file and
   * every already-issued signed URL keeps pointing at the current document.
   */
  async uploadCoa(tenantId: string, batchId: string, pdf: Buffer) {
    const batch = await this.prisma.withTenant(tenantId, (tx) =>
      tx.batch.findFirst({ where: { id: batchId } }),
    );
    if (!batch) {
      throw new NotFoundException('batch not found');
    }
    const key = coaKey(tenantId, batchId);
    await this.storage.put(key, pdf);
    await this.prisma.withTenant(tenantId, (tx) =>
      tx.batch.update({ where: { id: batchId }, data: { coaKey: key } }),
    );
    return {
      batch_id: batchId,
      coa_url: this.storage.signedDownloadPath(key, 3600),
      size_bytes: pdf.length,
    };
  }

  /**
   * A3: operator retry for a batch the compensation sweep marked `failed` —
   * resets the attempt counter, returns the batch to `pending` and re-enqueues
   * generation (idempotent, see GenerationWorker.generate). Only failed
   * batches are retryable; anything else → 409.
   */
  async retryGeneration(tenantId: string, batchId: string) {
    const batch = await this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.batch.findFirst({ where: { id: batchId } });
      if (!existing) {
        throw new NotFoundException('batch not found');
      }
      if (existing.status !== 'failed') {
        throw new ConflictException(`batch is ${existing.status}; only failed batches can be retried`);
      }
      return tx.batch.update({
        where: { id: batchId },
        data: { status: 'pending', generationAttempts: 0 },
      });
    });
    await this.generation.enqueue({ batchId, tenantId });
    return batch;
  }

  /** Factory-exit activation (§5.3 inactive → active); illegal states → 409. */
  async activate(tenantId: string, batchId: string, serials: 'all' | string[]) {
    const normalized = serials === 'all' ? 'all' : serials.map((s) => normalizeInput(s));
    return this.prisma.withTenant(tenantId, async (tx) => {
      const batch = await tx.batch.findFirst({ where: { id: batchId } });
      if (!batch) {
        throw new NotFoundException('batch not found');
      }
      if (batch.status !== 'ready' && batch.status !== 'exported') {
        throw new ConflictException(`batch is ${batch.status}, not ready for activation`);
      }
      if (normalized !== 'all') {
        const rows = await tx.code.findMany({
          where: { batchId, serial: { in: normalized } },
          select: { serial: true, status: true },
        });
        if (rows.length !== normalized.length) {
          throw new NotFoundException('one or more serials not found in this batch');
        }
        const bad = rows.find((r) => r.status !== 'inactive');
        if (bad) {
          throw new ConflictException(
            `serial ${bad.serial} is ${bad.status}; only inactive codes can be activated (§5.3)`,
          );
        }
      }
      const result = await tx.code.updateMany({
        where: {
          batchId,
          status: 'inactive',
          ...(normalized === 'all' ? {} : { serial: { in: normalized } }),
        },
        data: { status: 'active' },
      });
      await tx.batch.update({
        where: { id: batchId },
        data: { activatedCount: { increment: result.count } },
      });
      await tx.traceEvent.create({
        data: {
          tenantId,
          subject: 'batch',
          subjectId: batchId,
          eventType: 'activated',
          occurredAt: new Date(),
          data: { activated: result.count },
          source: 'api',
        },
      });
      return { activated: result.count };
    });
  }

  /** Signed temporary download URL for the one-time CSV (§5.2). */
  async exportCsv(tenantId: string, batchId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const batch = await tx.batch.findFirst({ where: { id: batchId } });
      if (!batch) {
        throw new NotFoundException('batch not found');
      }
      if (batch.status !== 'ready' && batch.status !== 'exported') {
        throw new BadRequestException(`batch is ${batch.status}; export requires ready`);
      }
      await tx.batch.update({ where: { id: batchId }, data: { status: 'exported' } });
      return {
        downloadPath: this.storage.signedDownloadPath(exportKey(tenantId, batchId), 3600),
        expiresInSeconds: 3600,
      };
    });
  }
}

/** Storage key of a batch's COA PDF (B1) — deterministic, one per batch. */
export function coaKey(tenantId: string, batchId: string): string {
  return `coa/${tenantId}/${batchId}.pdf`;
}
