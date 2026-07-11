import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Controller, Get } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  service: 'veazen-api';
  version: string;
}

/**
 * Resolves the package version once at module load.
 * `__dirname` is `src/health` under ts-jest/ts-node and `dist/health` after
 * `tsc -p tsconfig.build.json`; both are two levels below the package root.
 */
function readPackageVersion(): string {
  try {
    const raw = readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? '0.1.0';
  } catch {
    return '0.1.0';
  }
}

const VERSION = readPackageVersion();

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return { status: 'ok', service: 'veazen-api', version: VERSION };
  }
}
