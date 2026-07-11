import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import type { Request } from 'express';

import { normalizeInput } from '@veazen/crypto';

import { AppConfigService } from '../config/app-config.service';
import { RateLimitService } from '../redis/rate-limit.service';
import { ScanContextService } from './scan-context.service';
import { VerifyService } from './verify.service';

class ScratchDto {
  @IsString()
  @Length(4, 64)
  scratch_code!: string;
}

/**
 * Public verification endpoints (§5.1) — no auth, Redis rate-limited:
 * GET 60 req/min/IP; POST scratch 10 req/min/IP + 5 attempts/serial → 1h lock.
 */
@ApiTags('verify')
@Controller('verify')
export class VerifyController {
  constructor(
    private readonly verify: VerifyService,
    private readonly scanContext: ScanContextService,
    private readonly rateLimit: RateLimitService,
    private readonly config: AppConfigService,
  ) {}

  @Get(':serial')
  async publicScan(
    @Param('serial') serial: string,
    @Query('sig') sig: string | undefined,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? 'unknown';
    if (!this.config.rateLimitDisabled) {
      const { allowed } = await this.rateLimit.hit(`verify:${ip}`, 60, 60);
      if (!allowed) {
        throw new HttpException('rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    const ctx = await this.scanContext.fromRequest(req);
    return this.verify.publicScan(serial, sig, ctx);
  }

  @Post(':serial/scratch')
  async scratch(@Param('serial') serial: string, @Body() dto: ScratchDto, @Req() req: Request) {
    const ip = req.ip ?? 'unknown';
    const { allowed } = await this.rateLimit.hit(`scratch:${ip}`, 10, 60);
    if (!allowed) {
      throw new HttpException('rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    const serialKey = normalizeInput(serial);
    if (await this.rateLimit.isLockedOut(`scratch-serial:${serialKey}`, 5)) {
      throw new HttpException('too many attempts for this serial', HttpStatus.TOO_MANY_REQUESTS);
    }
    const ctx = await this.scanContext.fromRequest(req);
    const outcome = await this.verify.redeemScratch(serial, dto.scratch_code, ctx);
    if (outcome.result === 'invalid') {
      await this.rateLimit.lockoutHit(`scratch-serial:${serialKey}`, 3600);
    }
    return outcome;
  }
}
