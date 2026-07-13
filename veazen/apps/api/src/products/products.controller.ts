import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, Length } from 'class-validator';

import { CONSOLE_READ, CONSOLE_WRITE } from '../auth/permissions';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { TenantId } from '../auth/tenant.decorator';
import { Audit } from '../audit/audit.decorator';
import { PrismaService } from '../prisma/prisma.service';

class UpsertProductDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsString()
  @Length(1, 120)
  sku!: string;

  @IsOptional()
  @IsString()
  gtin?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  externalRefs?: Record<string, unknown>;
}

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(TenantAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Upsert by (tenant, sku) — §5.2. */
  @Post()
  @Roles(...CONSOLE_WRITE)
  @Audit('product.upsert')
  upsert(@TenantId() tenantId: string, @Body() dto: UpsertProductDto) {
    const data = {
      name: dto.name,
      gtin: dto.gtin ?? null,
      description: dto.description ?? null,
      images: (dto.images ?? []) as object,
      attributes: (dto.attributes ?? {}) as object,
      externalRefs: (dto.externalRefs ?? {}) as object,
    };
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.product.upsert({
        where: { tenantId_sku: { tenantId, sku: dto.sku } },
        create: { tenantId, sku: dto.sku, ...data },
        update: data,
      }),
    );
  }

  @Get()
  @Roles(...CONSOLE_READ)
  list(@TenantId() tenantId: string, @Query('query') query?: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.product.findMany({
        where: query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { sku: { contains: query, mode: 'insensitive' } },
              ],
            }
          : undefined,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  }
}
