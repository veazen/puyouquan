import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { CreateApiKeyDto, LoginDto, RefreshDto, RegisterDto } from './dto';
import { JwtAuthGuard, UserContext } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('api-keys')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createApiKey(@Req() req: Request & { user: UserContext }, @Body() dto: CreateApiKeyDto) {
    return this.auth.createApiKey(req.user.tenantId, dto.label);
  }

  @Get('api-keys')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  revokeApiKey(@Req() req: Request & { user: UserContext }, @Param('id') id: string) {
    return this.prisma.withTenant(req.user.tenantId, (tx) =>
      tx.apiKey.update({ where: { id }, data: { revokedAt: new Date() } }),
    );
  }
}
