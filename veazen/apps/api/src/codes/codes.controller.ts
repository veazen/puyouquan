import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';

import { normalizeInput } from '@veazen/crypto';

import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { TenantId } from '../auth/tenant.decorator';
import { Audit } from '../audit/audit.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../risk/alerts.service';
import { WebhookDispatcher } from '../webhooks/webhook.dispatcher';

/** M3: the same code released this many times ⇒ release_abuse warning. */
const RELEASE_ABUSE_THRESHOLD = 3;

/** Statuses an RMA / relabel can start from — everything else is a 409. */
const RMA_ELIGIBLE_STATUSES = ['active', 'verified', 'refurbished'] as const;

class FlagDto {
  @IsIn(['stolen', 'recalled', 'manual'])
  reason!: 'stolen' | 'recalled' | 'manual';

  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}

class BindOrderDto {
  @IsObject()
  order_ref!: { site: string; order_id: number | string; line_item?: number };
}

class RmaDto {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}

class RelabelDto {
  @IsString()
  @Length(4, 64)
  new_serial!: string;
}

/**
 * Merchant code operations (§5.2): flag / unflag / bind-order, plus the SME
 * suite M2/M3 returns flow: rma (register the QC of a return), release
 * (unlock a scan-only code for resale) and relabel (bind a fresh code and
 * retire the old one). All state transitions are merchant-credential only
 * and audited (SME plan §六 security redlines).
 */
@ApiTags('codes')
@ApiBearerAuth()
@Controller('codes')
@UseGuards(TenantAuthGuard)
export class CodesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhookDispatcher,
    private readonly alerts: AlertsService,
  ) {}

  /** Single-code lookup for the dashboard (§6 Batches page). */
  @Get(':serial')
  async lookup(@TenantId() tenantId: string, @Param('serial') serialRaw: string) {
    const serial = normalizeInput(serialRaw);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const code = await tx.code.findFirst({
        where: { serial },
        include: {
          product: { select: { name: true, sku: true } },
          replacedBy: { select: { serial: true } },
        },
      });
      if (!code) {
        throw new NotFoundException('serial not found');
      }
      const events = await tx.scanEvent.findMany({
        where: { codeId: code.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { kind: true, result: true, geo: true, locale: true, createdAt: true },
      });
      return {
        serial: code.serial,
        status: code.status,
        flag_reason: code.flagReason,
        first_verified_at: code.firstVerifiedAt,
        scratch_redeemed_at: code.scratchRedeemedAt,
        // M3 warehouse check-page fields: resale counter + relabel successor
        release_count: code.releaseCount,
        replaced_by: code.replacedBy?.serial ?? null,
        order_ref: code.orderRef,
        product: code.product,
        batch_id: code.batchId,
        scan_events: events,
      };
    });
  }

  @Post(':serial/flag')
  @Audit('code.flag')
  async flag(@TenantId() tenantId: string, @Param('serial') serialRaw: string, @Body() dto: FlagDto) {
    const serial = normalizeInput(serialRaw);
    const updated = await this.prisma.withTenant(tenantId, async (tx) => {
      const code = await tx.code.findFirst({ where: { serial } });
      if (!code) {
        throw new NotFoundException('serial not found');
      }
      if (code.status !== 'active' && code.status !== 'verified') {
        // §5.3: flagged is reachable from active/verified only
        throw new ConflictException(`cannot flag a ${code.status} code (409, §5.3)`);
      }
      return tx.code.update({
        where: { id: code.id },
        data: { status: 'flagged', flagReason: dto.reason, prevStatus: code.status },
      });
    });
    await this.webhooks.dispatch(tenantId, 'code.flagged', {
      serial: updated.serial,
      reason: dto.reason,
      note: dto.note ?? null,
    });
    return { serial: updated.serial, status: updated.status, flag_reason: updated.flagReason };
  }

  @Post(':serial/unflag')
  @Audit('code.unflag')
  async unflag(@TenantId() tenantId: string, @Param('serial') serialRaw: string) {
    const serial = normalizeInput(serialRaw);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const code = await tx.code.findFirst({ where: { serial } });
      if (!code) {
        throw new NotFoundException('serial not found');
      }
      if (code.status !== 'flagged') {
        throw new ConflictException('code is not flagged (409, §5.3)');
      }
      const restored = await tx.code.update({
        where: { id: code.id },
        data: {
          // §5.3: unflag restores the recorded prev_status
          status: code.prevStatus ?? 'active',
          flagReason: null,
          prevStatus: null,
        },
      });
      return { serial: restored.serial, status: restored.status };
    });
  }

  /**
   * M2: register the QC of a returned item. Always writes a `returned` trace
   * event (which suppresses geo_velocity false positives for the next buyer);
   * a redeemed scratch code additionally becomes `refurbished` — the coating
   * is physically gone, so the page shows the brand endorsement instead of
   * the scary yellow warning (PD-002).
   */
  @Post(':serial/rma')
  @Audit('code.rma')
  async rma(@TenantId() tenantId: string, @Param('serial') serialRaw: string, @Body() dto: RmaDto) {
    const serial = normalizeInput(serialRaw);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const code = await tx.code.findFirst({ where: { serial } });
      if (!code) {
        throw new NotFoundException('serial not found');
      }
      if (!(RMA_ELIGIBLE_STATUSES as readonly string[]).includes(code.status)) {
        throw new ConflictException(`cannot register an RMA for a ${code.status} code (409)`);
      }
      // a redeemed scratch layer is irreversible → official refurbished state
      const toRefurbished =
        code.scratchHash !== null && code.scratchRedeemedAt !== null && code.status === 'verified';
      const updated = toRefurbished
        ? await tx.code.update({ where: { id: code.id }, data: { status: 'refurbished' } })
        : code;
      const now = new Date();
      await tx.traceEvent.create({
        data: {
          tenantId,
          subject: 'code',
          subjectId: code.id,
          eventType: 'returned',
          occurredAt: now,
          data: { note: dto.note ?? null, status_after: updated.status },
          source: 'api',
        },
      });
      return { serial: code.serial, status: updated.status, returned_at: now.toISOString() };
    });
  }

  /**
   * M3: release a first-scan-locked code for resale. Only codes *without* a
   * scratch layer qualify — the Lite lock is digital and merchant-reversible,
   * a redeemed coating is not (security redline: this is never a "reset to
   * never-verified"; the release is audited and counted). The tenant policy
   * `rma_display_policy` (settings key, default "fresh") decides whether the
   * code goes back to a fresh `active` or shows as `refurbished`.
   */
  @Post(':serial/release')
  @Audit('code.release')
  async release(@TenantId() tenantId: string, @Param('serial') serialRaw: string) {
    const serial = normalizeInput(serialRaw);
    const released = await this.prisma.withTenant(tenantId, async (tx) => {
      const code = await tx.code.findFirst({ where: { serial } });
      if (!code) {
        throw new NotFoundException('serial not found');
      }
      if (code.scratchHash !== null) {
        if (code.scratchRedeemedAt !== null) {
          throw new ConflictException(
            'a redeemed scratch code cannot be released — the coating is physically gone; register an RMA (official refurbished) or relabel instead (409)',
          );
        }
        throw new ConflictException(
          'release only applies to codes without a scratch layer (Lite / scan-only form) (409)',
        );
      }
      const locked =
        code.status === 'verified' || (code.status === 'active' && code.firstVerifiedAt !== null);
      if (!locked) {
        throw new ConflictException(
          `nothing to release: code is ${code.status} and not first-scan locked (409)`,
        );
      }
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });
      const policy =
        (tenant?.settings as { rma_display_policy?: string } | null)?.rma_display_policy ===
        'refurbished'
          ? 'refurbished'
          : 'fresh';
      const updated = await tx.code.update({
        where: { id: code.id },
        data: {
          status: policy === 'refurbished' ? 'refurbished' : 'active',
          // clear the lock: the next first scan runs the full Lite lock logic
          firstVerifiedAt: null,
          releaseCount: { increment: 1 },
        },
      });
      await tx.traceEvent.create({
        data: {
          tenantId,
          subject: 'code',
          subjectId: code.id,
          eventType: 'released',
          occurredAt: new Date(),
          data: { release_count: updated.releaseCount, display_policy: policy },
          source: 'api',
        },
      });
      return { updated, policy };
    });

    if (released.updated.releaseCount >= RELEASE_ABUSE_THRESHOLD) {
      // platform watchdog for repeated releases of the same code (PD-003);
      // one open alert per code — acknowledged ones may re-raise
      const open = await this.prisma.withTenant(tenantId, (tx) =>
        tx.alert.findFirst({
          where: { rule: 'release_abuse', codeId: released.updated.id, acknowledgedAt: null },
        }),
      );
      if (!open) {
        await this.alerts.raise(tenantId, {
          rule: 'release_abuse',
          severity: 'warning',
          codeId: released.updated.id,
          batchId: released.updated.batchId,
          payload: { serial: released.updated.serial, release_count: released.updated.releaseCount },
        });
      }
    }
    return {
      serial: released.updated.serial,
      status: released.updated.status,
      release_count: released.updated.releaseCount,
      display_policy: released.policy,
    };
  }

  /**
   * M2 relabel: bind a fresh code to a returned item and retire the old one.
   * The new code must belong to the same tenant (RLS-scoped lookup), be
   * `active` and unredeemed; the old code keeps the full history and points
   * at its successor via replaced_by (trace chain stays intact).
   */
  @Post(':serial/relabel')
  @Audit('code.relabel')
  async relabel(
    @TenantId() tenantId: string,
    @Param('serial') serialRaw: string,
    @Body() dto: RelabelDto,
  ) {
    const serial = normalizeInput(serialRaw);
    const newSerial = normalizeInput(dto.new_serial);
    if (newSerial === serial) {
      throw new BadRequestException('new_serial must differ from the code being replaced');
    }
    return this.prisma.withTenant(tenantId, async (tx) => {
      const code = await tx.code.findFirst({ where: { serial } });
      if (!code) {
        throw new NotFoundException('serial not found');
      }
      if (!(RMA_ELIGIBLE_STATUSES as readonly string[]).includes(code.status)) {
        throw new ConflictException(`cannot relabel a ${code.status} code (409)`);
      }
      // RLS scopes this lookup to the tenant — a foreign serial reads as absent
      const replacement = await tx.code.findFirst({ where: { serial: newSerial } });
      if (!replacement) {
        throw new NotFoundException('new serial not found');
      }
      if (replacement.status !== 'active' || replacement.scratchRedeemedAt !== null) {
        throw new ConflictException(
          `replacement code must be active and unredeemed; it is ${replacement.status} (409)`,
        );
      }
      const retired = await tx.code.update({
        where: { id: code.id },
        data: { status: 'retired', replacedById: replacement.id },
      });
      await tx.traceEvent.create({
        data: {
          tenantId,
          subject: 'code',
          subjectId: code.id,
          eventType: 'relabeled',
          occurredAt: new Date(),
          data: { new_serial: replacement.serial, new_code_id: replacement.id },
          source: 'api',
        },
      });
      return {
        serial: retired.serial,
        status: retired.status,
        replaced_by: replacement.serial,
      };
    });
  }

  @Post(':serial/bind-order')
  @Audit('code.bind_order')
  async bindOrder(
    @TenantId() tenantId: string,
    @Param('serial') serialRaw: string,
    @Body() dto: BindOrderDto,
  ) {
    const serial = normalizeInput(serialRaw);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const code = await tx.code.findFirst({ where: { serial } });
      if (!code) {
        throw new NotFoundException('serial not found');
      }
      const updated = await tx.code.update({
        where: { id: code.id },
        data: { orderRef: dto.order_ref as object },
      });
      return { serial: updated.serial, order_ref: updated.orderRef };
    });
  }
}
