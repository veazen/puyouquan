/**
 * Scratch codes — the hidden one-time redemption code (PROJECT_PLAN §2.4):
 * 12 characters from the de-confused Crockford alphabet (digits + letters,
 * no I/L/O/U). The database only ever stores a hash; plaintext appears
 * exactly once, in the generated export file. Production scratch hashes are
 * peppered HMAC-SHA256 (scratch-pepper.ts, ADR-007); the argon2id functions
 * below stay available as the slow-hash alternative (user passwords also use
 * argon2id, via the api's auth service directly).
 */

import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';

import { CROCKFORD_ALPHABET } from './base32';
import type { RandomSource } from './serial';

export const SCRATCH_LENGTH = 12;

// OWASP-recommended argon2id parameters (2024 cheat sheet)
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // KiB (19 MiB)
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Generate one scratch code. The alphabet has 32 characters, so `byte & 31`
 * maps uniformly — no modulo bias. `randomSource` exists only for tests.
 */
export function generateScratchCode(randomSource: RandomSource = randomBytes): string {
  const entropy = randomSource(SCRATCH_LENGTH);
  if (entropy.length !== SCRATCH_LENGTH) {
    throw new Error(`Random source returned ${entropy.length} bytes, expected ${SCRATCH_LENGTH}`);
  }
  let code = '';
  for (const byte of entropy) {
    code += CROCKFORD_ALPHABET[byte & 31];
  }
  return code;
}

/** argon2id hash of a canonical (already normalized) scratch code. */
export async function hashScratchCode(code: string): Promise<string> {
  return argon2.hash(code, ARGON2_OPTIONS);
}

/** Verify a canonical scratch code against a stored argon2id hash. */
export async function verifyScratchCode(code: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, code);
  } catch {
    // malformed hash strings must fail closed, not throw
    return false;
  }
}
