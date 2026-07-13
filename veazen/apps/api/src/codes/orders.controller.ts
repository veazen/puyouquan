import {
  Body,
  Controller,
  NotFoundException,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsIn, IsObject, IsOptional, IsUUID } from 'class-validator';

import { CONSOLE_WRITE } from '../auth/permissions';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { TenantId } from '../auth/tenant.decorator';
import { Audit } from '../audit/audit.decorator';
import { BatchesService } from '../batches/batches.service';
import { buildQrUrl } from '../batches/qr-url';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

class ShippingLabelDto {
  @IsObject()
  order_ref!: { site: string; order_id: number | string; line_item?: number };

  @IsUUID()
  product_id!: string;

  @IsOptional()
  @IsIn(['single', 'avery5160', 'averyL7160'])
  label_format?: string;
}

const POOL_LOW_WATER = 20;
const POOL_REFILL_QUANTITY = 100;

/**
 * Lite shipping-label flow (§7.5 mechanism 2): pull a code from the
 * product's on_demand pool → bind the order → return the label file URL.
 * Phase 1 returns a CSV label payload placeholder; the real PDF renderer is
 * a Phase 4 deliverable (§8).
 */
@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@Roles(...CONSOLE_WRITE)
@UseGuards(TenantAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batches: BatchesService,
    private readonly storage: StorageService,
    private readonly config: AppConfigService,
  ) {}

  @Post('shipping-label')
  @Audit('order.shipping_label')
  async shippingLabel(@TenantId() tenantId: string, @Body() dto: ShippingLabelDto) {
    const picked = await this.prisma.withTenant(tenantId, async (tx) => {
      const product = await tx.product.findFirst({ where: { id: dto.product_id } });
      if (!product) {
        throw new NotFoundException('product not found');
      }
      // pool = active, unbound codes from on_demand batches of this product
      const code = await tx.code.findFirst({
        where: {
          productId: dto.product_id,
          status: 'active',
          orderRef: { equals: Prisma.DbNull },
          batch: { kind: 'on_demand' },
        },
        orderBy: { createdAt: 'asc' },
        include: { product: { select: { gtin: true } } },
      });
      if (!code) {
        return { code: null, product };
      }
      const bound = await tx.code.update({
        where: { id: code.id },
        data: { orderRef: dto.order_ref as object },
      });
      const remaining = await tx.code.count({
        where: {
          productId: dto.product_id,
          status: 'active',
          orderRef: { equals: Prisma.DbNull },
          batch: { kind: 'on_demand' },
        },
      });
      return { code: { ...bound, gtin: code.product.gtin }, product, remaining };
    });

    // low-water refill (§7.5): keep the pool topped up asynchronously
    if (!picked.code || (picked.remaining ?? 0) < POOL_LOW_WATER) {
      await this.batches.create(tenantId, {
        productId: dto.product_id,
        quantity: POOL_REFILL_QUANTITY,
        intendedMarket: [],
        autoActivate: true,
        kind: 'on_demand',
      });
    }
    if (!picked.code) {
      throw new ServiceUnavailableException(
        'on-demand pool empty; refill started — retry in a few seconds',
      );
    }

    const qrUrl = buildQrUrl(
      this.config.publicVerifyBaseUrl,
      picked.code.serial,
      picked.code.sig,
      picked.code.gtin,
    );
    const labelKey = `labels/${tenantId}/${picked.code.serial}.csv`;
    await this.storage.put(
      labelKey,
      `serial,qr_url,order_site,order_id\n${picked.code.serial},${qrUrl},${dto.order_ref.site},${dto.order_ref.order_id}\n`,
    );
    return {
      serial: picked.code.serial,
      qr_url: qrUrl,
      // Phase 4 swaps this for the rendered PDF (§8)
      label_download_path: this.storage.signedDownloadPath(labelKey, 3600),
      label_format: dto.label_format ?? 'single',
    };
  }
}
