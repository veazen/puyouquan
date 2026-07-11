/**
 * Peppered scratch-code hashing for bulk generation (ADR-007).
 *
 * §2.4 specifies argon2id for scratch hashes, but the Phase 1 generation
 * budget (100k codes < 60s) is physically incompatible with a memory-hard
 * hash per code. Scratch codes are 60-bit CSPRNG secrets — not low-entropy
 * passwords — so a *keyed* fast hash retains the property that a database
 * leak alone is useless: HMAC-SHA256 under a MASTER_KEY-derived pepper that
 * never touches the database. argon2id (scratch.ts) remains available and is
 * still used for user passwords.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const SCRATCH_HMAC_PREFIX = 'hmac256$';

/** Hash a canonical (normalized) scratch code under the server pepper. */
export function hashScratchCodeHmac(code: string, pepper: Buffer): string {
  if (pepper.length < 32) {
    throw new Error('Scratch pepper must be at least 32 bytes');
  }
  const digest = createHmac('sha256', pepper).update(`veazen.scratch.v1:${code}`).digest('hex');
  return `${SCRATCH_HMAC_PREFIX}${digest}`;
}

/** Constant-time verification against a stored hmac256$ hash. */
export function verifyScratchCodeHmac(code: string, stored: string, pepper: Buffer): boolean {
  if (!stored.startsWith(SCRATCH_HMAC_PREFIX)) {
    return false;
  }
  const expected = hashScratchCodeHmac(code, pepper);
  return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(stored, 'utf8'));
}
