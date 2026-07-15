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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { CONSOLE_READ, CONSOLE_WRITE } from '../auth/permissions';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
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

  // B1 (S1 supplements pack): optional regulatory batch identity
  @IsOptional()
  @IsString()
  @Length(1, 120)
  lot_code?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'mfg_date must be YYYY-MM-DD' })
  mfg_date?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'expiry_date must be YYYY-MM-DD' })
  expiry_date?: string;
}

/** B1 COA upload (multipart, memory storage): PDF only, ≤ 10 MB. */
interface UploadedCoaFile {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
}

const COA_MAX_BYTES = 10 * 1024 * 1024;

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
@UseGuards(TenantAuthGuard, RolesGuard)
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Post()
  @Roles(...CONSOLE_WRITE)
  @Audit('batch.create')
  create(@TenantId() tenantId: string, @Body() dto: CreateBatchDto) {
    return this.batches.create(tenantId, {
      productId: dto.product_id,
      quantity: dto.quantity,
      intendedMarket: dto.intended_market ?? [],
      autoActivate: dto.auto_activate,
      kind: dto.kind ?? 'bulk',
      lotCode: dto.lot_code,
      mfgDate: dto.mfg_date,
      expiryDate: dto.expiry_date,
    });
  }

  @Get()
  @Roles(...CONSOLE_READ)
  list(@TenantId() tenantId: string) {
    return this.batches.list(tenantId);
  }

  @Get(':id')
  @Roles(...CONSOLE_READ)
  async get(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    const batch = await this.batches.getWithProgress(tenantId, id);
    if (!batch) {
      throw new NotFoundException('batch not found');
    }
    return batch;
  }

  /**
   * B1: upload / replace the batch COA (Certificate of Analysis).
   * Multipart field `file`, PDF only, ≤ 10 MB (multer rejects larger with
   * 413). Re-upload overwrites the same storage key — one COA per batch.
   */
  @Post(':id/coa')
  @Roles(...CONSOLE_WRITE)
  @Audit('batch.coa_upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: COA_MAX_BYTES } }))
  uploadCoa(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: UploadedCoaFile,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('attach the COA PDF as multipart field "file"');
    }
    // magic-byte check beats trusting the client mimetype
    if (!file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-', 'ascii'))) {
      throw new BadRequestException('COA must be a PDF file');
    }
    return this.batches.uploadCoa(tenantId, id, file.buffer);
  }

  /** A3: retry a failed generation (console 「重试」 button). */
  @Post(':id/retry')
  @Roles(...CONSOLE_WRITE)
  @Audit('batch.retry_generation')
  retry(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.batches.retryGeneration(tenantId, id);
  }

  @Post(':id/activate')
  @Roles(...CONSOLE_WRITE)
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
  @Roles(...CONSOLE_READ)
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
