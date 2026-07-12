import {
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
import { WebhookDispatcher } from '../webhooks/webhook.dispatcher';

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

/** Merchant code operations (§5.2): flag / unflag / bind-order. */
@ApiTags('codes')
@ApiBearerAuth()
@Controller('codes')
@UseGuards(TenantAuthGuard)
export class CodesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhookDispatcher,
  ) {}

  /** Single-code lookup for the dashboard (§6 Batches page). */
  @Get(':serial')
  async lookup(@TenantId() tenantId: string, @Param('serial') serialRaw: string) {
    const serial = normalizeInput(serialRaw);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const code = await tx.code.findFirst({
        where: { serial },
        include: { product: { select: { name: true, sku: true } } },
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
