import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { RateLimitService } from '../redis/rate-limit.service';

class WaitlistDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  brand?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  website?: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  monthly_units?: string;
}

/**
 * Marketing-site waitlist intake (§8 Phase 2): public, rate-limited,
 * idempotent on email (repeat submissions update the profile fields).
 */
@ApiTags('waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  async join(@Body() dto: WaitlistDto, @Req() req: Request) {
    const ip = req.ip ?? 'unknown';
    const { allowed } = await this.rateLimit.hit(`waitlist:${ip}`, 5, 60);
    if (!allowed) {
      throw new HttpException('rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    const data = {
      brand: dto.brand ?? null,
      website: dto.website ?? null,
      category: dto.category ?? null,
      monthlyUnits: dto.monthly_units ?? null,
    };
    await this.prisma.waitlistEntry.upsert({
      where: { email: dto.email.toLowerCase() },
      create: { email: dto.email.toLowerCase(), ...data },
      update: data,
    });
    return { ok: true };
  }
}
