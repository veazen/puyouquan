import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { StorageService } from './storage.service';

/** Serves HMAC-signed expiring download URLs (local storage driver, ADR-008). */
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get(':token')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('cache-control', 'no-store')
  async download(@Param('token') token: string): Promise<string> {
    const key = this.storage.resolveDownloadToken(token);
    return (await this.storage.get(key)).toString('utf8');
  }
}
