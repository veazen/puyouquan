import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';

import { Injectable, NotFoundException } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { EnvelopeService } from '../crypto/envelope.service';

/**
 * Object storage behind an S3-compatible-shaped interface (ADR-008).
 * Dev/test driver: local directory + HMAC-signed expiring download tokens
 * served by FilesController. The S3/R2 driver replaces the internals in
 * Phase 4 without changing call sites.
 */
@Injectable()
export class StorageService {
  private readonly signingKey: Buffer;

  constructor(
    private readonly config: AppConfigService,
    envelope: EnvelopeService,
  ) {
    this.signingKey = envelope.deriveKey('download-url');
  }

  private pathFor(key: string): string {
    const safe = normalize(key);
    if (safe.startsWith('..') || safe.includes(`..${sep}`) || safe.startsWith(sep)) {
      throw new Error(`Unsafe storage key: ${key}`);
    }
    return join(this.config.storageDir, safe);
  }

  async put(key: string, content: Buffer | string): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }

  async get(key: string): Promise<Buffer> {
    try {
      return await readFile(this.pathFor(key));
    } catch {
      throw new NotFoundException('file not found');
    }
  }

  /** Signed, expiring download path (relative to the API prefix). */
  signedDownloadPath(key: string, ttlSeconds = 3600): string {
    const expires = Date.now() + ttlSeconds * 1000;
    const payload = `${key}\n${expires}`;
    const sig = createHmac('sha256', this.signingKey).update(payload).digest('base64url');
    const token = Buffer.from(JSON.stringify({ key, expires, sig }), 'utf8').toString('base64url');
    return `/files/${token}`;
  }

  /** Validate a download token; returns the storage key or throws. */
  resolveDownloadToken(token: string): string {
    let parsed: { key?: string; expires?: number; sig?: string };
    try {
      parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    } catch {
      throw new NotFoundException('invalid download token');
    }
    const { key, expires, sig } = parsed;
    if (!key || !expires || !sig || Date.now() > expires) {
      throw new NotFoundException('expired or malformed download token');
    }
    const expected = createHmac('sha256', this.signingKey)
      .update(`${key}\n${expires}`)
      .digest('base64url');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(sig, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new NotFoundException('invalid download token');
    }
    return key;
  }
}
