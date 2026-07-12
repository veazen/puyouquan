import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';
import type { Request } from 'express';

import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { TenantId } from '../auth/tenant.decorator';
import { Audit } from '../audit/audit.decorator';
import { PrismaService } from '../prisma/prisma.service';

class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  /** merged into tenants.settings (brand color, logo, verify-page copy, …) */
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  /** §7.5 onboarding fork, switchable at any time */
  @IsOptional()
  @IsIn(['standard', 'lite'])
  mode?: 'standard' | 'lite';
}

/** Dashboard tenant context: /auth-ish info, settings, team, sites (§6). */
@ApiTags('tenant')
@ApiBearerAuth()
@Controller('tenant')
@UseGuards(TenantAuthGuard)
export class TenantController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  me(@TenantId() tenantId: string, @Req() req: Request & { user?: { userId: string } }) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, slug: true, plan: true, settings: true, createdAt: true },
      });
      const user = req.user
        ? await tx.user.findFirst({
            where: { id: req.user.userId },
            select: { id: true, email: true, role: true, locale: true },
          })
        : null;
      return { tenant, user };
    });
  }

  @Patch('settings')
  @Audit('settings.update')
  update(@TenantId() tenantId: string, @Body() dto: UpdateSettingsDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      const settings = {
        ...(tenant.settings as Record<string, unknown>),
        ...(dto.settings ?? {}),
        ...(dto.mode ? { mode: dto.mode } : {}),
      };
      return tx.tenant.update({
        where: { id: tenantId },
        data: { ...(dto.name ? { name: dto.name } : {}), settings },
        select: { id: true, name: true, slug: true, plan: true, settings: true },
      });
    });
  }

  @Get('users')
  users(@TenantId() tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.user.findMany({
        select: { id: true, email: true, role: true, locale: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  @Get('sites')
  sites(@TenantId() tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.wpSite.findMany({ orderBy: { lastSeenAt: 'desc' } }),
    );
  }
}
