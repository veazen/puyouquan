import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { normalizeInput } from '@veazen/crypto';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { GenerationWorker, exportKey } from './generation.worker';

@Injectable()
export class BatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generation: GenerationWorker,
    private readonly storage: StorageService,
  ) {}

  async create(
    tenantId: string,
    input: {
      productId: string;
      quantity: number;
      intendedMarket: string[];
      autoActivate?: boolean;
      kind: 'bulk' | 'on_demand';
    },
  ) {
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
        },
      });
    });
    await this.generation.enqueue({ batchId: batch.id, tenantId });
    return batch;
  }

  async getWithProgress(tenantId: string, batchId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const batch = await tx.batch.findFirst({ where: { id: batchId } });
      if (!batch) {
        return null;
      }
      const generatedCount = await tx.code.count({ where: { batchId } });
      return { ...batch, generatedCount, progress: generatedCount / batch.quantity };
    });
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
