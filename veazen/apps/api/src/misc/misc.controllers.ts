import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

import { ApiKeyGuard } from '../auth/api-key.guard';
import { TenantId } from '../auth/tenant.decorator';
import { Audit } from '../audit/audit.decorator';
import { PrismaService } from '../prisma/prisma.service';

class TraceEventDto {
  @IsIn(['batch', 'code'])
  subject!: 'batch' | 'code';

  @IsUUID()
  subject_id!: string;

  @IsIn(['commissioned', 'quality_checked', 'shipped', 'received', 'activated', 'retail_activated', 'custom'])
  event_type!:
    | 'commissioned'
    | 'quality_checked'
    | 'shipped'
    | 'received'
    | 'activated'
    | 'retail_activated'
    | 'custom';

  @IsOptional()
  @IsString()
  biz_step?: string;

  @IsOptional()
  @IsObject()
  location?: { name?: string; geo?: unknown; country?: string };

  @IsISO8601()
  occurred_at!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

/** §5.2 POST /trace-events — single event or array, ≤500 per request. */
@ApiTags('trace-events')
@ApiBearerAuth()
@Controller('trace-events')
@UseGuards(ApiKeyGuard)
export class TraceEventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Audit('trace_event.create')
  async create(@TenantId() tenantId: string, @Body() body: TraceEventDto | TraceEventDto[]) {
    const items = Array.isArray(body) ? body : [body];
    if (items.length === 0 || items.length > 500) {
      throw new BadRequestException('between 1 and 500 events per request');
    }
    const created = await this.prisma.withTenant(tenantId, (tx) =>
      tx.traceEvent.createMany({
        data: items.map((item) => ({
          tenantId,
          subject: item.subject,
          subjectId: item.subject_id,
          eventType: item.event_type,
          bizStep: item.biz_step ?? null,
          location: (item.location ?? undefined) as object | undefined,
          occurredAt: new Date(item.occurred_at),
          data: (item.data ?? {}) as object,
          source: 'api',
        })),
      }),
    );
    return { created: created.count };
  }
}

/** §5.2 GET /alerts + acknowledgement. */
@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
@UseGuards(ApiKeyGuard)
export class AlertsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@TenantId() tenantId: string, @Query('status') status?: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.alert.findMany({
        where: status === 'open' ? { acknowledgedAt: null } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    );
  }

  @Post(':id/acknowledge')
  @HttpCode(200)
  @Audit('alert.acknowledge')
  async acknowledge(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const alert = await tx.alert.findFirst({ where: { id } });
      if (!alert) {
        throw new NotFoundException('alert not found');
      }
      return tx.alert.update({ where: { id }, data: { acknowledgedAt: new Date() } });
    });
  }
}

/** §5.2 GET /stats/overview — dashboard aggregates. */
@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
@UseGuards(ApiKeyGuard)
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  async overview(@TenantId() tenantId: string) {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const [scans, openAlerts, codes] = await Promise.all([
        tx.scanEvent.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true, geo: true, result: true },
        }),
        tx.alert.count({ where: { acknowledgedAt: null } }),
        tx.code.groupBy({ by: ['status'], _count: { _all: true } }),
      ]);
      const byDay: Record<string, number> = {};
      const byCountry: Record<string, number> = {};
      for (const scan of scans) {
        const day = scan.createdAt.toISOString().slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + 1;
        const country = (scan.geo as { country?: string } | null)?.country;
        if (country) {
          byCountry[country] = (byCountry[country] ?? 0) + 1;
        }
      }
      return {
        scan_count_30d: scans.length,
        scans_by_day: byDay,
        scans_by_country: byCountry,
        open_alerts: openAlerts,
        codes_by_status: Object.fromEntries(codes.map((c) => [c.status, c._count._all])),
      };
    });
  }
}

class HandshakeDto {
  @IsUrl({ require_tld: false })
  site_url!: string;

  @IsOptional()
  @IsString()
  plugin_version?: string;

  @IsOptional()
  @IsString()
  wc_version?: string;
}

/** §5.2 POST /wp/handshake — plugin first-connect: site registration + capabilities. */
@ApiTags('wp')
@ApiBearerAuth()
@Controller('wp')
@UseGuards(ApiKeyGuard)
export class WpController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('handshake')
  @Audit('wp.handshake')
  async handshake(@TenantId() tenantId: string, @Body() dto: HandshakeDto) {
    const siteHash = createHash('sha256').update(dto.site_url).digest('hex');
    const site = await this.prisma.withTenant(tenantId, (tx) =>
      tx.wpSite.upsert({
        where: { tenantId_siteHash: { tenantId, siteHash } },
        create: {
          tenantId,
          siteUrl: dto.site_url,
          siteHash,
          pluginVersion: dto.plugin_version ?? null,
          wcVersion: dto.wc_version ?? null,
        },
        update: {
          pluginVersion: dto.plugin_version ?? null,
          wcVersion: dto.wc_version ?? null,
          lastSeenAt: new Date(),
        },
      }),
    );
    const tenant = await this.prisma.withTenant(tenantId, (tx) =>
      tx.tenant.findUnique({ where: { id: tenantId }, select: { name: true, slug: true, plan: true, settings: true } }),
    );
    return {
      site_id: site.id,
      tenant: tenant,
      capabilities: {
        batches: true,
        shipping_label: true,
        scratch_codes: true,
        pdf_export: false, // Phase 4
      },
    };
  }
}

class CreateSerialProfileDto {
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsIn(['platform', 'custom_format', 'byo'])
  mode!: 'platform' | 'custom_format' | 'byo';

  @IsOptional()
  @IsString()
  @Length(0, 20)
  prefix?: string;

  @IsInt()
  @Min(8)
  @Max(64)
  length!: number;

  @IsOptional()
  @IsIn(['crockford32', 'upper_alnum', 'digits'])
  charset?: 'crockford32' | 'upper_alnum' | 'digits';

  @IsInt()
  random_bits!: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(8)
  display_group_size?: number;
}

/** §5.2 serial-profiles CRUD; §9.11: random_bits < 64 → 422. */
@ApiTags('serial-profiles')
@ApiBearerAuth()
@Controller('serial-profiles')
@UseGuards(ApiKeyGuard)
export class SerialProfilesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.serialProfile.findMany({ orderBy: { createdAt: 'desc' } }),
    );
  }

  @Post()
  @Audit('serial_profile.create')
  create(@TenantId() tenantId: string, @Body() dto: CreateSerialProfileDto) {
    if (dto.random_bits < 64) {
      throw new UnprocessableEntityException('random_bits must be ≥ 64 (§9.11)');
    }
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.serialProfile.create({
        data: {
          tenantId,
          name: dto.name,
          mode: dto.mode,
          prefix: dto.prefix ?? null,
          length: dto.length,
          charset: dto.charset ?? 'crockford32',
          randomBits: dto.random_bits,
          displayGroupSize: dto.display_group_size ?? 5,
        },
      }),
    );
  }

  @Patch(':id')
  @Audit('serial_profile.update')
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateSerialProfileDto> & { status?: 'active' | 'archived' },
  ) {
    if (dto.random_bits !== undefined && dto.random_bits < 64) {
      throw new UnprocessableEntityException('random_bits must be ≥ 64 (§9.11)');
    }
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.serialProfile.findFirst({ where: { id } });
      if (!existing) {
        throw new NotFoundException('serial profile not found');
      }
      return tx.serialProfile.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.display_group_size !== undefined
            ? { displayGroupSize: dto.display_group_size }
            : {}),
        },
      });
    });
  }
}
