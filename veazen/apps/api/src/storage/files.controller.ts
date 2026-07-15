import { Controller, Get, Header, Param, Res, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { StorageService } from './storage.service';

/** Serves HMAC-signed expiring download URLs (local storage driver, ADR-008). */
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get(':token')
  @Header('cache-control', 'no-store')
  async download(
    @Param('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | string> {
    const key = this.storage.resolveDownloadToken(token);
    const content = await this.storage.get(key);
    // content type by key extension: batch export CSVs and COA PDFs (B1);
    // binary goes out as a StreamableFile so Nest never JSON-serializes it
    if (key.endsWith('.pdf')) {
      res.setHeader('content-type', 'application/pdf');
      res.setHeader('content-disposition', 'inline; filename="coa.pdf"');
      return new StreamableFile(content);
    }
    res.setHeader('content-type', 'text/csv; charset=utf-8');
    return content.toString('utf8');
  }
}
