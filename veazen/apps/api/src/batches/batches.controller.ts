import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { ApiKeyGuard } from '../auth/api-key.guard';
import { TenantId } from '../auth/tenant.decorator';
import { Audit } from '../audit/audit.decorator';
import { BatchesService } from './batches.service';

class CreateBatchDto {
  @IsUUID()
  product_id!: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @IsISO31661Alpha2({ each: true })
  intended_market?: string[];

  @IsOptional()
  @IsBoolean()
  auto_activate?: boolean;

  @IsOptional()
  @IsIn(['bulk', 'on_demand'])
  kind?: 'bulk' | 'on_demand';
}

class ActivateBatchDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100000)
  serials?: string[];

  @IsOptional()
  @IsBoolean()
  all?: boolean;
}

@ApiTags('batches')
@ApiBearerAuth()
@Controller('batches')
@UseGuards(ApiKeyGuard)
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Post()
  @Audit('batch.create')
  create(@TenantId() tenantId: string, @Body() dto: CreateBatchDto) {
    return this.batches.create(tenantId, {
      productId: dto.product_id,
      quantity: dto.quantity,
      intendedMarket: dto.intended_market ?? [],
      autoActivate: dto.auto_activate,
      kind: dto.kind ?? 'bulk',
    });
  }

  @Get(':id')
  async get(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    const batch = await this.batches.getWithProgress(tenantId, id);
    if (!batch) {
      throw new NotFoundException('batch not found');
    }
    return batch;
  }

  @Post(':id/activate')
  @Audit('batch.activate')
  activate(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateBatchDto,
  ) {
    if (!dto.all && (!dto.serials || dto.serials.length === 0)) {
      throw new BadRequestException('provide { serials: [...] } or { all: true }');
    }
    return this.batches.activate(tenantId, id, dto.all ? 'all' : (dto.serials as string[]));
  }

  @Get(':id/export')
  @Audit('batch.export')
  export(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format = 'csv',
  ) {
    if (format !== 'csv') {
      // PDF export is a Phase 4 deliverable (§8)
      throw new BadRequestException('only format=csv is available in Phase 1');
    }
    return this.batches.exportCsv(tenantId, id);
  }
}
