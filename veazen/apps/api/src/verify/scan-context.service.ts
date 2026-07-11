import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';

import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';

import { AppConfigService } from '../config/app-config.service';
import { EnvelopeService } from '../crypto/envelope.service';

export interface ScanContext {
  ip: string | null;
  geo: { country?: string; region?: string; city?: string } | null;
  deviceFp: string | null;
  userAgent: string | null;
  locale: string | null;
}

interface GeoReader {
  get(ip: string): {
    country?: { iso_code?: string };
    subdivisions?: Array<{ iso_code?: string }>;
    city?: { names?: { en?: string } };
  } | null;
}

/**
 * Builds the per-scan context (§4 scan_events):
 * - device_fp = sha256(salt + ua + accept_language + ip/24); the salt is
 *   derived from MASTER_KEY and never logged (§9.10)
 * - GeoIP via MaxMind GeoLite2 when GEOIP_DB_PATH is present
 * - ANONYMIZE_IP=true stores the /24-truncated address (§9.6)
 */
@Injectable()
export class ScanContextService {
  private readonly logger = new Logger(ScanContextService.name);
  private readonly fpSalt: Buffer;
  private geoReader: GeoReader | null = null;
  private geoLoadAttempted = false;

  constructor(
    private readonly config: AppConfigService,
    envelope: EnvelopeService,
  ) {
    this.fpSalt = envelope.deriveKey('device-fp-salt');
  }

  private async loadGeoReader(): Promise<GeoReader | null> {
    if (this.geoLoadAttempted) {
      return this.geoReader;
    }
    this.geoLoadAttempted = true;
    const path = this.config.geoipDbPath;
    if (!path || !existsSync(path)) {
      return null;
    }
    try {
      const maxmind = await import('maxmind');
      this.geoReader = (await maxmind.open(path)) as unknown as GeoReader;
    } catch (error) {
      this.logger.warn(`GeoIP database could not be opened: ${(error as Error).message}`);
    }
    return this.geoReader;
  }

  async fromRequest(req: Request): Promise<ScanContext> {
    const rawIp = req.ip ?? null;
    const userAgent = req.headers['user-agent'] ?? null;
    const acceptLanguage = req.headers['accept-language'] ?? null;
    const locale = acceptLanguage ? acceptLanguage.split(',')[0]?.trim() || null : null;

    const truncated = rawIp ? truncateIp(rawIp) : null;
    let geo: ScanContext['geo'] = null;
    if (rawIp) {
      const reader = await this.loadGeoReader();
      const record = reader?.get(rawIp) ?? null;
      if (record?.country?.iso_code) {
        geo = {
          country: record.country.iso_code,
          region: record.subdivisions?.[0]?.iso_code,
          city: record.city?.names?.en,
        };
      }
    }

    const deviceFp =
      userAgent || truncated
        ? createHash('sha256')
            .update(this.fpSalt)
            .update(userAgent ?? '')
            .update(acceptLanguage ?? '')
            .update(truncated ?? '')
            .digest('hex')
        : null;

    return {
      ip: this.config.anonymizeIp ? truncated : rawIp,
      geo,
      deviceFp,
      userAgent,
      locale,
    };
  }
}

/** /24 for IPv4; /48-ish (first 3 hextets) for IPv6. */
export function truncateIp(ip: string): string {
  if (ip.includes('.')) {
    const parts = ip.replace(/^::ffff:/, '').split('.');
    return `${parts.slice(0, 3).join('.')}.0`;
  }
  return `${ip.split(':').slice(0, 3).join(':')}::`;
}
