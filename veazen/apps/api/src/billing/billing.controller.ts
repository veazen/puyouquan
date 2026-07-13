import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CONSOLE_READ } from '../auth/permissions';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { TenantId } from '../auth/tenant.decorator';
import { AppConfigService } from '../config/app-config.service';
import { RateLimitService } from '../redis/rate-limit.service';
import { BillingService, type LemonEvent } from './billing.service';
import { verifyLemonSignature } from './lemon-signature';

/** P1 billing: console summary + the public Lemon Squeezy webhook. */
@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly config: AppConfigService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(TenantAuthGuard, RolesGuard)
  @Roles(...CONSOLE_READ)
  summary(@TenantId() tenantId: string) {
    return this.billing.summary(tenantId);
  }

  /**
   * Public LS webhook (no JWT): HMAC-SHA256 over the RAW body vs the
   * X-Signature header. Unconfigured secret → 404 (the endpoint "does not
   * exist" until billing is set up); bad signature → opaque 401.
   */
  @Post('webhooks/lemonsqueezy')
  @HttpCode(200)
  async lemonSqueezy(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature?: string,
  ) {
    const secret = this.config.lemonSqueezyWebhookSecret;
    if (!secret) {
      throw new NotFoundException();
    }
    // generous limiter (60/min/IP, fail-open like every public intake path):
    // LS delivery bursts stay far below this; scripted probing does not
    const ip = req.ip ?? 'unknown';
    const { allowed } = await this.rateLimit.hit(`ls-webhook:${ip}`, 60, 60);
    if (!allowed) {
      throw new HttpException('rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!verifyLemonSignature(req.rawBody, signature, secret)) {
      // deliberately detail-free: do not tell probes why they failed
      throw new UnauthorizedException();
    }
    return this.billing.handleLemonEvent((req.body ?? {}) as LemonEvent);
  }
}
