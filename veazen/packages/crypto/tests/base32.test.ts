import { describe, expect, it } from 'vitest';

import { CROCKFORD_ALPHABET, decodeCrockford, encodeCrockford } from '../src/base32';
import vectors from '../test-vectors/vectors.json';

describe('encodeCrockford / decodeCrockford', () => {
  it('matches the committed test vectors', () => {
    for (const v of vectors.crockford) {
      const bytes = Buffer.from(v.hex, 'hex');
      expect(encodeCrockford(bytes)).toBe(v.encoded);
      expect(Buffer.from(decodeCrockford(v.encoded)).toString('hex')).toBe(v.hex);
    }
  });

  it('uses the de-confused alphabet (no I, L, O, U)', () => {
    expect(CROCKFORD_ALPHABET).toHaveLength(32);
    for (const forbidden of ['I', 'L', 'O', 'U']) {
      expect(CROCKFORD_ALPHABET).not.toContain(forbidden);
    }
  });

  it('round-trips arbitrary byte lengths', () => {
    for (const hex of ['', '00', 'ff', 'deadbeef', '0102030405060708090a0b0c']) {
      const bytes = Buffer.from(hex, 'hex');
      expect(Buffer.from(decodeCrockford(encodeCrockford(bytes))).toString('hex')).toBe(hex);
    }
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => decodeCrockford('AU')).toThrow(/Invalid Crockford base32 character/);
    expect(() => decodeCrockford('a0')).toThrow(/Invalid Crockford base32 character/);
    expect(() => decodeCrockford('0-')).toThrow(/Invalid Crockford base32 character/);
  });

  it('rejects non-zero padding bits', () => {
    // '0Z' decodes one byte and leaves 2 set padding bits
    expect(() => decodeCrockford('0Z')).toThrow(/non-zero padding/);
  });

  it('rejects impossible encoding lengths (injectivity)', () => {
    // lengths whose leftover exceeds 4 bits can never be produced by encode
    expect(() => decodeCrockford('Z')).toThrow(/impossible encoding length/);
    expect(() => decodeCrockford('000')).toThrow(/impossible encoding length/);
    expect(() => decodeCrockford('ZZZ')).toThrow(/impossible encoding length/);
  });

  it('handles empty input', () => {
    expect(encodeCrockford(Uint8Array.of())).toBe('');
    expect(decodeCrockford('')).toEqual(Uint8Array.of());
  });
});
