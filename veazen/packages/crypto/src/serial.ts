/**
 * Serial number generation (PROJECT_PLAN §2.4):
 * serial = crockford_base32(96-bit CSPRNG), 20 characters, canonical uppercase.
 */

import { randomBytes } from 'node:crypto';

import { encodeCrockford, decodeCrockford } from './base32';
import { isCanonicalCrockford } from './format';

export const SERIAL_RANDOM_BYTES = 12; // 96 bits of entropy
export const SERIAL_LENGTH = 20; // ceil(96 / 5) = 20 chars

export type RandomSource = (byteLength: number) => Buffer;

/**
 * Generate one serial. `randomSource` exists only for deterministic test
 * vectors — production callers must use the default (crypto.randomBytes).
 */
export function generateSerial(randomSource: RandomSource = randomBytes): string {
  const entropy = randomSource(SERIAL_RANDOM_BYTES);
  if (entropy.length !== SERIAL_RANDOM_BYTES) {
    throw new Error(
      `Random source returned ${entropy.length} bytes, expected ${SERIAL_RANDOM_BYTES}`,
    );
  }
  return encodeCrockford(entropy);
}

/** True when `serial` is a canonical (already normalized) 20-char serial. */
export function isValidSerial(serial: string): boolean {
  if (serial.length !== SERIAL_LENGTH || !isCanonicalCrockford(serial)) {
    return false;
  }
  try {
    decodeCrockford(serial); // also enforces zero padding bits in the tail
    return true;
  } catch {
    return false;
  }
}
