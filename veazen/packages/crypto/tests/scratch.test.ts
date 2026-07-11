import { describe, expect, it } from 'vitest';

import { CROCKFORD_ALPHABET } from '../src/base32';
import { isCanonicalCrockford } from '../src/format';
import {
  SCRATCH_LENGTH,
  generateScratchCode,
  hashScratchCode,
  verifyScratchCode,
} from '../src/scratch';
import vectors from '../test-vectors/vectors.json';

describe('generateScratchCode', () => {
  it('matches the committed deterministic test vectors', () => {
    for (const v of vectors.scratch.generation) {
      expect(generateScratchCode(() => Buffer.from(v.randomHex, 'hex'))).toBe(v.code);
    }
  });

  it('produces 12 canonical de-confused characters', () => {
    const code = generateScratchCode();
    expect(code).toHaveLength(SCRATCH_LENGTH);
    expect(isCanonicalCrockford(code)).toBe(true);
  });

  it('maps bytes uniformly onto the 32-char alphabet (byte & 31, no modulo bias)', () => {
    const allBytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
    for (let offset = 0; offset < 256; offset += SCRATCH_LENGTH) {
      const chunk = allBytes.subarray(offset, offset + SCRATCH_LENGTH);
      if (chunk.length < SCRATCH_LENGTH) break;
      const code = generateScratchCode(() => Buffer.from(chunk));
      for (let i = 0; i < chunk.length; i += 1) {
        expect(code[i]).toBe(CROCKFORD_ALPHABET[(chunk[i] as number) & 31]);
      }
    }
  });

  it('rejects a random source returning the wrong byte count', () => {
    expect(() => generateScratchCode(() => Buffer.alloc(4))).toThrow(/expected 12/);
  });
});

describe('hashScratchCode / verifyScratchCode', () => {
  it('verifies the committed argon2id vector hash', async () => {
    const v = vectors.scratch.argon2id;
    expect(v.hash).toContain('$argon2id$');
    await expect(verifyScratchCode(v.code, v.hash)).resolves.toBe(true);
    await expect(verifyScratchCode('000000000000', v.hash)).resolves.toBe(false);
  });

  it('hashes with argon2id and round-trips verification', async () => {
    const code = generateScratchCode();
    const hash = await hashScratchCode(code);
    expect(hash).toContain('$argon2id$');
    expect(hash).not.toContain(code);
    await expect(verifyScratchCode(code, hash)).resolves.toBe(true);
    await expect(verifyScratchCode(generateScratchCode(), hash)).resolves.toBe(false);
  });

  it('fails closed on malformed stored hashes', async () => {
    await expect(verifyScratchCode('A1B2CD3E4F6H', 'not-an-argon2-hash')).resolves.toBe(false);
  });
});
