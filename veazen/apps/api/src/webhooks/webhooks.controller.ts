import { randomBytes } from 'node:crypto';

import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsOptional, IsUrl } from 'class-validator';

import { WEBHOOK_EVENT_TYPES } from '@veazen/shared';

import { ApiKeyGuard } from '../auth/api-key.guard';
import { TenantId } from '../auth/tenant.decorator';
import { Audit } from '../audit/audit.decorator';
import { EnvelopeService } from '../crypto/envelope.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookDispatcher } from './webhook.dispatcher';

class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(WEBHOOK_EVENT_TYPES as readonly string[], { each: true })
  events!: string[];
}

class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsArray()
  @IsIn(WEBHOOK_EVENT_TYPES as readonly string[], { each: true })
  events?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

const ENDPOINT_SELECT = {
  id: true,
  url: true,
  events: true,
  active: true,
  failureCount: true,
  createdAt: true,
} as const;

/** Webhook endpoint CRUD + test delivery (§5.2). */
@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
@UseGuards(ApiKeyGuard)
export class WebhooksController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly envelope: EnvelopeService,
    private readonly dispatcher: WebhookDispatcher,
  ) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.webhookEndpoint.findMany({ select: ENDPOINT_SELECT, orderBy: { createdAt: 'desc' } }),
    );
  }

  /** The signing secret is returned exactly once, on creation. */
  @Post()
  @Audit('webhook.create')
  async create(@TenantId() tenantId: string, @Body() dto: CreateWebhookDto) {
    const secret = `whsec_${randomBytes(24).toString('base64url')}`;
    const endpoint = await this.prisma.withTenant(tenantId, (tx) =>
      tx.webhookEndpoint.create({
        data: {
          tenantId,
          url: dto.url,
          events: dto.events,
          encryptedSecret: this.envelope.encrypt(Buffer.from(secret, 'utf8')),
        },
        select: ENDPOINT_SELECT,
      }),
    );
    return { ...endpoint, secret };
  }

  @Patch(':id')
  @Audit('webhook.update')
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.webhookEndpoint.findFirst({ where: { id } });
      if (!existing) {
        throw new NotFoundException('webhook endpoint not found');
      }
      return tx.webhookEndpoint.update({
        where: { id },
        data: {
          ...(dto.url !== undefined ? { url: dto.url } : {}),
          ...(dto.events !== undefined ? { events: dto.events } : {}),
          ...(dto.active !== undefined ? { active: dto.active, failureCount: 0 } : {}),
        },
        select: ENDPOINT_SELECT,
      });
    });
  }

  @Delete(':id')
  @Audit('webhook.delete')
  async remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.webhookEndpoint.findFirst({ where: { id } });
      if (!existing) {
        throw new NotFoundException('webhook endpoint not found');
      }
      await tx.webhookEndpoint.delete({ where: { id } });
      return { deleted: true };
    });
  }

  @Post(':id/test')
  @Audit('webhook.test')
  async test(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    const endpoint = await this.prisma.withTenant(tenantId, (tx) =>
      tx.webhookEndpoint.findFirst({ where: { id } }),
    );
    if (!endpoint) {
      throw new NotFoundException('webhook endpoint not found');
    }
    await this.dispatcher.dispatch(tenantId, endpoint.events[0] ?? 'alert.created', {
      test: true,
      endpoint_id: id,
    });
    return { enqueued: true };
  }
}
