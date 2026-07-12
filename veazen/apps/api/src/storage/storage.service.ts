import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { EnvelopeService } from '../crypto/envelope.service';

/**
 * Object storage behind one interface (ADR-008), two drivers:
 * - S3-compatible (Cloudflare R2 / MinIO) when the §11 S3_* env vars are set
 *   — required in production, where container disks are ephemeral and export
 *   files (the only copy of scratch plaintext) must survive redeploys
 * - local directory otherwise (dev/test)
 * Downloads always flow through FilesController's HMAC-signed expiring
 * tokens, identical for both drivers.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly signingKey: Buffer;
  private readonly s3: S3Client | null;

  constructor(
    private readonly config: AppConfigService,
    envelope: EnvelopeService,
  ) {
    this.signingKey = envelope.deriveKey('download-url');
    if (config.s3Endpoint && config.s3Bucket && config.s3AccessKey && config.s3SecretKey) {
      this.s3 = new S3Client({
        endpoint: config.s3Endpoint,
        region: 'auto',
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.s3AccessKey,
          secretAccessKey: config.s3SecretKey,
        },
      });
      this.logger.log(`storage driver: s3 (${config.s3Bucket})`);
    } else {
      this.s3 = null;
      this.logger.log(`storage driver: local (${config.storageDir})`);
    }
  }

  private pathFor(key: string): string {
    const safe = normalize(key);
    if (safe.startsWith('..') || safe.includes(`..${sep}`) || safe.startsWith(sep)) {
      throw new Error(`Unsafe storage key: ${key}`);
    }
    return join(this.config.storageDir, safe);
  }

  async put(key: string, content: Buffer | string): Promise<void> {
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.config.s3Bucket as string,
          Key: key,
          Body: typeof content === 'string' ? Buffer.from(content, 'utf8') : content,
        }),
      );
      return;
    }
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }

  async get(key: string): Promise<Buffer> {
    if (this.s3) {
      try {
        const result = await this.s3.send(
          new GetObjectCommand({ Bucket: this.config.s3Bucket as string, Key: key }),
        );
        return Buffer.from(await (result.Body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray());
      } catch {
        throw new NotFoundException('file not found');
      }
    }
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
