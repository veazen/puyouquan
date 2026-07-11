import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';

/**
 * Envelope encryption under MASTER_KEY (§9.1): AES-256-GCM, payload encoded
 * as base64(iv[12] | authTag[16] | ciphertext). Used for tenant Ed25519
 * private keys and webhook secrets.
 *
 * deriveKey() provides domain-separated sub-keys (HMAC-SHA256 of a label) so
 * the master key itself is never reused across purposes (device_fp salt,
 * scratch pepper, download-URL signing).
 */
@Injectable()
export class EnvelopeService {
  constructor(private readonly config: AppConfigService) {}

  encrypt(plaintext: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.config.masterKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
  }

  decrypt(encoded: string): Buffer {
    const raw = Buffer.from(encoded, 'base64');
    if (raw.length < 12 + 16 + 1) {
      throw new Error('Envelope payload too short');
    }
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.config.masterKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /** Domain-separated 32-byte sub-key of the master key. */
  deriveKey(label: string): Buffer {
    return createHmac('sha256', this.config.masterKey).update(`veazen.derive.v1:${label}`).digest();
  }
}
