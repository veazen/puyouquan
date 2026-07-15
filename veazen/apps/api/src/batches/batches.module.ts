import { Module } from '@nestjs/common';

import { CodeSigningService } from '../codes/code-signing.service';
import { StorageService } from '../storage/storage.service';
import { FilesController } from '../storage/files.controller';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';
import { GenerationReaperService } from './generation-reaper.service';
import { GenerationWorker } from './generation.worker';

@Module({
  controllers: [BatchesController, FilesController],
  providers: [
    BatchesService,
    GenerationWorker,
    GenerationReaperService,
    CodeSigningService,
    StorageService,
  ],
  exports: [BatchesService, GenerationWorker, GenerationReaperService, CodeSigningService, StorageService],
})
export class BatchesModule {}
