import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Audit } from '../audit/audit.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitService } from '../redis/rate-limit.service';
import { AuthService } from './auth.service';
import { AcceptInviteDto, CreateApiKeyDto, LoginDto, RefreshDto, RegisterDto } from './dto';
import { JwtAuthGuard, UserContext } from './jwt-auth.guard';
import { CONSOLE_READ, OWNER_ONLY } from './permissions';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /**
   * E1 team invites: public token redemption — set a password, become the
   * invited user, get signed in. Rate-limited like the other public intake
   * endpoints (waitlist pattern) against token guessing.
   */
  @Post('accept-invite')
  async acceptInvite(@Body() dto: AcceptInviteDto, @Req() req: Request) {
    const ip = req.ip ?? 'unknown';
    // 10/min/IP: ample for humans; the 32-byte token entropy is the real
    // defense against guessing — the limiter just blunts scripted probing
    const { allowed } = await this.rateLimit.hit(`accept-invite:${ip}`, 10, 60);
    if (!allowed) {
      throw new HttpException('rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    return this.auth.acceptInvite(dto.token, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  // API key management is owner-only (E1 matrix: explicitly not for admins);
  // listing is read-only and follows the viewer-may-GET rule.
  @Post('api-keys')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ONLY)
  @Audit('api_key.create')
  createApiKey(@Req() req: Request & { user: UserContext }, @Body() dto: CreateApiKeyDto) {
    return this.auth.createApiKey(req.user.tenantId, dto.label);
  }

  @Get('api-keys')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONSOLE_READ)
  listApiKeys(@Req() req: Request & { user: UserContext }) {
    return this.prisma.withTenant(req.user.tenantId, (tx) =>
      tx.apiKey.findMany({
        select: {
          id: true,
          keyPrefix: true,
          label: true,
          scopes: true,
          lastUsedAt: true,
          revokedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  @Delete('api-keys/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ONLY)
  @Audit('api_key.revoke')
  revokeApiKey(@Req() req: Request & { user: UserContext }, @Param('id') id: string) {
    return this.prisma.withTenant(req.user.tenantId, (tx) =>
      tx.apiKey.update({ where: { id }, data: { revokedAt: new Date() } }),
    );
  }
}
